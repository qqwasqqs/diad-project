/*
 * Project Name: Teva Data Integrity
 * Business Owner: Keerthi Pusuloori
 * Development Team: DIF Turnkey Team
 * Script Author: Radhe Raman Tiwari
 * Date: 25 June 2026
 *
 * Purpose of the script:
 * This API integrates with Microsoft Azure Active Directory (Azure AD)
 * via Microsoft Graph API to fetch and synchronize Azure AD groups
 * into the Databricks-backed Dashboard RBAC table.
 *
 * FUNCTIONAL OVERVIEW:
 * - Uses Next.js after() so Azure AD fetching and Databricks merging continue after the response is sent.
 * - Fetch ALL Azure AD groups using Graph API with pagination
 * - Transform group data into SQL MERGE statements
 * - Perform UPSERT (MERGE) into Databricks table:
 *    • Update existing groups
 *    • Insert new groups
 * - Process large datasets using chunking for scalability
 * - Execute queries with controlled parallelism and retry logic
 * - Ensure idempotent behavior (no duplicate records)
 * - Creates a jobId for every import request so the frontend can track progress through SSE.
 * - Updates in-memory job status during running, fetching, merging, success, and failed states.
 *
 * DATA PROCESSING FEATURES:
 * - Pagination handling via @odata.nextLink
 * - Batch processing using configurable CHUNK_SIZE
 * - Concurrency control using MAX_CONCURRENCY
 * - Retry mechanism with exponential backoff for resilience
 *
 * AUDIT & OBSERVABILITY:
 * - Logs execution details to Azure Event Hub
 * - Tracks:
 *    • Total groups fetched
 *    • Total groups merged
 *    • Execution status (SUCCESS / FAILED)
 *    • Triggering user
 *    • Execution timestamps
 *
 * ERROR HANDLING:
 * - Centralized try/catch handling
 * - Structured error logging with stack trace
 * - Failure events published to Event Hub
 *
 * OUTPUT:
 * - Returns API response with:
 *    • success flag
 *    • total records processed
 *    • total records merged
 *
 * NOTES:
 * - Uses Databricks SQL MERGE for atomic UPSERT operations
 * - Designed for enterprise-scale Azure AD synchronization
 * ---------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  next/server
    - What it is:
        Next.js server-side module that provides request/response utilities for Route Handlers
        (API endpoints) in the App Router.

    - Why used:
        To handle incoming HTTP requests and generate structured HTTP responses in Next.js APIs,
        including reading request payloads, returning JSON responses, and managing status codes.
*/
import { after, NextRequest, NextResponse } from "next/server"; // after() continues work after response; NextRequest/NextResponse handle API input/output.

/*
  @/lib/azure/databricksClient
    - What it is:
        A local utility module responsible for connecting to Databricks SQL, managing sessions,
        and executing queries using the Databricks SQL Connector.

    - Why used:
        To abstract Databricks connectivity and query execution into reusable functions, ensuring
        consistent authentication, session management, error handling, and resource cleanup across APIs.
*/
import {
    executeQuery,
    getDatabricksSession,
} from "@/lib/azure/databricksClient"; // Session + query execution helpers for Databricks SQL

/*
  @/lib/azure/eventHubLogger
    - What it is:
        A local logging module that publishes structured operational logs to Azure Event Hub.

    - Why used:
        To capture API execution telemetry (success/failure, duration, errors, metadata) and stream
        it to Event Hub for downstream ingestion into monitoring systems such as Splunk for analytics,
        alerting, and audit/compliance tracking.
*/
import { logToEventHub } from "@/lib/azure/eventHubLogger"; // Centralized Event Hub logger for API observability

/*
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import {
    CATALOG_NAME, // Databricks catalog name used as the logical database container
    SCHEMA_NAME, // Databricks schema name used to organize tables within the catalog
    DASHBOARD_GROUPS_TABLE, // Databricks RBAC table used to store group information
} from "@/constants/config";
// Project-level configuration constants

import { getGraphClient } from "@/lib/azure/graphClient";

// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:read cannot call GET successfully.
import { withAuthorization } from "@/lib/rbac/authorize";

/*
  @/lib/rbac/sql

    - What it is:
        SQL utility module for safely formatting values before
        they are included in dynamic SQL statements.

    - Why used:
        Prevents malformed SQL and ensures identifiers and values
        are properly escaped before query execution.
*/
import { sqlNullableString } from "@/lib/rbac/sql";

/*
  @/lib/azureAdGroupImportJobs
    - What it is:
        A small in-memory job status tracker for this Azure AD group import.

    - Why used:
        The POST API now responds immediately to avoid App Service timeout, so the long-running
        sync must report progress somewhere else while it continues in the background.

    - Simple example:
        POST returns jobId="abc"; the background job updates "abc" to fetching, merging,
        then success/failed; the SSE route streams those changes to the UI.
*/
import {
    createAzureAdGroupImportJob, // Creates the first "queued" job status before the response is sent.
    updateAzureAdGroupImportJob, // Updates the same job as fetching/merging/success/failed.
} from "@/lib/azureAdGroupImportJobs";

// Represents only the Azure AD group fields this sync needs from Microsoft Graph.
// Example Graph group: { id: "abc", displayName: "Finance Readers", securityEnabled: true }.
type AzureAdGroup = {
    id?: string; // Azure AD object ID, used as the stable Databricks ad_group_id.
    displayName?: string; // Human-readable group name shown in the app.
    description?: string; // Optional group description from Azure AD.
    createdDateTime?: string; // Original Azure AD group creation timestamp.
    mail?: string; // Optional group email address.
    securityEnabled?: boolean; // True when the Azure AD group is security-enabled.
};

// Represents one paged response from Microsoft Graph /groups.
// Example: value contains up to 999 groups and @odata.nextLink points to the next page.
type AzureAdGroupsResponse = {
    value?: AzureAdGroup[]; // Current page of Azure AD groups.
    "@odata.nextLink"?: string; // URL for the next page; missing when there are no more pages.
};

/* --------------------------------------------------------------------- */
/* CONFIG                                                                */
/* --------------------------------------------------------------------- */

/**
 * Number of records per batch when building MERGE statements.
 * Example: if 2000 groups exist and CHUNK_SIZE = 500,
 * then 4 MERGE queries will be generated.
 */
const CHUNK_SIZE = 500;

/**
 * Controls how many SQL queries run in parallel.
 * Reduced to 2 to avoid conflicts in Delta Lake MERGE operations.
 * Example: prevents multiple concurrent writes to same table partitions.
 */
const MAX_CONCURRENCY = 2;

/**
 * Number of retry attempts for failed SQL queries.
 * Example: transient Databricks failure → retry 3 times before failing.
 */
const MAX_RETRIES = 3;

/* --------------------------------------------------------------------- */
/* RETRY WRAPPER                                                        */
/* --------------------------------------------------------------------- */

/**
 * Executes a SQL query with retry logic using exponential backoff.
 *
 * This function attempts to run a SQL query multiple times if it fails.
 * Between each retry, it waits for an increasing delay to reduce system load.
 *
 * @template T - The expected type of the query result rows
 * @param {any} session - Active Databricks session/connection object
 * @param {string} sql - SQL query string to execute
 * @param {number} [retries=MAX_RETRIES] - Number of retry attempts
 * @returns {Promise<T[]>} Resolves with query result rows
 * @throws Will throw the last encountered error after all retries fail
 */
async function executeQueryWithRetry<T = any>(
    session: any,             // Databricks session object used to execute queries
    sql: string,              // SQL query string
    retries = MAX_RETRIES     // Maximum number of retry attempts (default value)
): Promise<T[]> {

    let lastError: any;       // Variable to store the last encountered error

    // Loop to attempt query execution up to `retries` times
    for (let attempt = 1; attempt <= retries; attempt++) {

        try {
            // Execute SQL using provided session and return result if successful
            return await executeQuery(session, sql);

        } catch (err) {

            // Store the error from the failed attempt
            lastError = err;

            // Log warning message indicating failure and current retry attempt
            console.warn(`SQL failed attempt ${attempt}/${retries}`);

            /**
             * Wait before retrying using exponential backoff:
             * attempt 1 → 1.5s
             * attempt 2 → 3s
             * attempt 3 → 4.5s
             */
            if (attempt < retries) {
                // Delay execution before next retry
                await new Promise(res =>
                    setTimeout(res, attempt * 1500) // Delay increases with each attempt
                );
            }
        }
    }

    // After all retries fail, throw the last captured error
    throw lastError;
}

/* --------------------------------------------------------------------- */
/* CHUNK HELPER                                                         */
/* --------------------------------------------------------------------- */

/**
 * Splits an array into smaller chunks of a specified size.
 *
 * Example:
 * chunkArray([1,2,3,4,5], 2)
 * → [[1,2], [3,4], [5]]
 *
 * @template T - The type of elements in the input array
 * @param {T[]} arr - The input array to be split into chunks
 * @param {number} size - The maximum size of each chunk
 * @returns {T[][]} A new array containing chunked subarrays
 */
function chunkArray<T>(arr: T[], size: number): T[][] {

    const result: T[][] = []; // Initialize an empty array to store chunks

    // Loop through the array, incrementing index by chunk size each time
    for (let i = 0; i < arr.length; i += size) {

        // Slice a portion of the array from index `i` to `i + size`
        // and push it into the result array
        result.push(arr.slice(i, i + size));
    }

    // Return the array of chunks
    return result;
}

/* --------------------------------------------------------------------- */
/* AZURE GRAPH FETCH                                                    */
/* --------------------------------------------------------------------- */

/**
 * Fetches ALL Azure AD groups using Microsoft Graph API.
 *
 * This function:
 * - Uses pagination via @odata.nextLink
 * - Requests only required fields using $select
 * - Accumulates all results into a single array
 *
 * @returns {Promise<any[]>} Resolves with a list of all Azure AD groups
 */
async function fetchAllAzureGroups(): Promise<AzureAdGroup[]> {

    const graphClient = getGraphClient(); // Initialize Microsoft Graph client

    const groups: AzureAdGroup[] = [];    // Array to accumulate all group records

    /**
     * Initial Graph API endpoint:
     * - /groups → fetch Azure AD groups
     * - $top=999 → maximum allowed page size (reduces number of API calls)
     * - $select → fetch only required fields to improve performance
     */
    let nextLink: string | undefined =
        "/groups?$top=999&$select=id,displayName,description,createdDateTime,mail,securityEnabled";

    // Continue fetching while a next page link exists
    while (nextLink) {

        // Execute API request using the current nextLink
        const response = await graphClient
            .api(nextLink)                          // Set API endpoint or next page URL
            .header("ConsistencyLevel", "eventual") // Required for some advanced queries in Graph
            .get() as AzureAdGroupsResponse;        // Perform GET request

        /**
         * Example response.value:
         * [
         *   {
         *     id: "abc",
         *     displayName: "HR Team",
         *     securityEnabled: true
         *   }
         * ]
         */

        // Append fetched group records to the accumulated array
        groups.push(...(response.value ?? []));

        // Update nextLink to fetch the next page (if available)
        nextLink = response["@odata.nextLink"];

        // Debug log showing how many records were fetched in this page
        console.debug("Fetched Azure groups page", {
            count: response.value?.length ?? 0
        });
    }

    // Return the complete list of all groups across all pages
    return groups;
}

/* --------------------------------------------------------------------- */
/* MERGE BATCH BUILDER                                                  */
/* --------------------------------------------------------------------- */

/**
 * Builds a Databricks MERGE SQL statement for a batch of Azure AD groups.
 *
 * This function:
 * - Converts input group objects into inline SQL SELECT statements
 * - Combines them using UNION ALL to create a source dataset
 * - Performs a MERGE (UPSERT) into the target table
 *
 * Behavior:
 * - Updates existing records when ad_group_id matches
 * - Inserts new records when no match is found
 *
 * @param {any[]} groups - Array of Azure AD group objects
 * @returns {string} Fully constructed Databricks MERGE SQL query
 */
const buildMergeBatch = (groups: AzureAdGroup[]): string => {

    const now = new Date().toISOString();
    // Capture current timestamp in ISO format for audit columns

    /**
     * Convert each group into a SQL SELECT row
     * Each row represents one record in the MERGE "source" dataset
     */
    const source = groups.map(group => `

        -- Convert a single group object into SELECT row
        SELECT
            ${sqlNullableString(`g_${crypto.randomUUID()}`)} AS group_id,  -- Generate unique internal ID
            ${sqlNullableString(group.id)} AS ad_group_id,                 -- Unique Azure AD group ID
            ${sqlNullableString(group.displayName)} AS group_name,         -- Display name of the group
            ${sqlNullableString(group.description)} AS description,        -- Group description
            ${sqlNullableString(group.mail)} AS mail,                      -- Email associated with group
            ${group.securityEnabled ?? false} AS security_enabled,         -- Boolean flag (default = false)
            ${sqlNullableString(group.createdDateTime)} AS ad_group_created_at -- Original creation timestamp

    `).join(' UNION ALL ');
    // Combine all rows into a single dataset using UNION ALL

    // Return fully constructed MERGE SQL
    return `
        MERGE INTO
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} target
        -- Target table where data will be inserted/updated

        USING (
            ${source}
        ) source
        -- Inline dataset created above

        -- Match condition to determine UPDATE vs INSERT
        ON target.ad_group_id = source.ad_group_id

        /* --------------------------------------------------------- */
        /* UPDATE existing records                                   */
        /* --------------------------------------------------------- */
        WHEN MATCHED THEN UPDATE SET
            target.group_name = source.group_name,                       -- Update group name
            target.description = source.description,                     -- Update description
            target.mail = source.mail,                                   -- Update email
            target.security_enabled = source.security_enabled,           -- Update security flag
            target.ad_group_created_at = source.ad_group_created_at,     -- Update original created date
            target.synced_at = '${now}',                                 -- Update sync timestamp
            target.updated_at = '${now}'                                 -- Update last modified timestamp

        /* --------------------------------------------------------- */
        /* INSERT new Azure AD groups                               */
        /* --------------------------------------------------------- */
        WHEN NOT MATCHED THEN INSERT (
            group_id,                  -- Internal generated ID
            group_name,                -- Group name
            description,               -- Description
            is_active,                 -- Active flag
            created_at,                -- Record creation timestamp
            created_by,                -- Source system/user
            updated_at,                -- Last updated timestamp
            ad_group_id,               -- Azure AD ID
            group_type,                -- Type classification
            ad_group_created_at,       -- Azure creation time
            synced_at,                 -- Sync time
            source,                    -- Data source label
            mail,                      -- Email
            security_enabled           -- Security flag
        )
        VALUES (
            source.group_id,
            source.group_name,
            source.description,
            true,                                             -- Default active
            '${now}',                                          -- Insert timestamp
            ${sqlNullableString("AzureADSync")},               -- Created by system
            '${now}',                                          -- Updated timestamp
            source.ad_group_id,
            'AZURE_AD',                                        -- Static type
            source.ad_group_created_at,
            '${now}',                                          -- Synced timestamp
            'AZURE_AD',                                        -- Source label
            source.mail,
            source.security_enabled
        )
    `;
};

/* --------------------------------------------------------------------- */
/* EXECUTION ENGINE                                                     */
/* --------------------------------------------------------------------- */

/**
 * Executes SQL queries in controlled parallel batches.
 *
 * This function:
 * - Splits queries into chunks based on MAX_CONCURRENCY
 * - Runs each chunk in parallel using Promise.all
 * - Ensures controlled concurrency to avoid overload
 *
 * Example:
 * MAX_CONCURRENCY = 2
 * queries = [q1, q2, q3, q4]
 *
 * Execution:
 * → Runs (q1, q2) in parallel
 * → Then runs (q3, q4)
 *
 * @param {any} session - Databricks session/connection object
 * @param {string[]} queries - List of SQL queries to execute
 * @returns {Promise<void>} Resolves when all queries are executed
 */
async function executeChunks(
    session: any,        // Databricks session used for executing queries
    queries: string[],   // Array of SQL queries to execute
    onProgress?: (processedChunks: number) => void // Optional callback used to update the SSE job status after each batch.
): Promise<void> {
    let processedChunks = 0; // Counts how many merge chunks have finished so far.

    // Iterate through queries in steps of MAX_CONCURRENCY
    for (let i = 0; i < queries.length; i += MAX_CONCURRENCY) {

        const batch = queries.slice(i, i + MAX_CONCURRENCY);
        // Create a batch of queries of size MAX_CONCURRENCY

        // Execute all queries in current batch in parallel
        await Promise.all(
            batch.map(q =>
                executeQueryWithRetry(session, q) // Execute each query with retry logic
            )
        );

        processedChunks += batch.length; // Add the just-finished batch size to the progress count.
        onProgress?.(processedChunks); // Notify the job tracker so the browser can show fresh progress.

        // Waits here until all queries in the batch complete before continuing
    }
}

/* --------------------------------------------------------------------- */
/* MAIN API                                                             */
/* --------------------------------------------------------------------- */

// Runs the actual long Azure AD group sync after the API response has already been sent.
async function runAzureAdSync(jobId: string, user: string): Promise<void> {
    const requestStartTime = new Date(); // Timestamp used for Event Hub duration/audit logging.
    const programName = "AzureADGroupImportAPI"; // Program name used in Event Hub logs.

    // Mark the job as actively running so the SSE stream can update the UI.
    updateAzureAdGroupImportJob(jobId, {
        status: "running", // Job has moved out of the queue and background work has begun.
        startedAt: requestStartTime.toISOString(), // Records when the background job started.
        message: "Starting Azure AD group import.", // Friendly message displayed near the import button.
    });

    console.info("Starting optimized Azure AD sync", { jobId, user }); // Server log for troubleshooting.

    // Keep the full background sync protected so failures update job status instead of disappearing silently.
    try {
        const session = await getDatabricksSession(); // Create/reuse Databricks SQL session for MERGE statements.

        // Tell the UI that the job is now reading groups from Microsoft Graph.
        updateAzureAdGroupImportJob(jobId, {
            status: "fetching", // Current stage: calling Microsoft Graph.
            message: "Fetching Azure AD groups from Microsoft Graph.", // User-friendly progress message.
        });

        const groups = await fetchAllAzureGroups(); // Fetch all Azure AD groups across Graph pages.

        // Log how many groups were fetched before Databricks merging begins.
        console.info("Azure groups fetched", {
            jobId, // Include job ID so logs match UI status.
            total: groups.length // Total groups fetched from Azure AD.
        });

        const mergeChunks = chunkArray(groups, CHUNK_SIZE); // Split groups into manageable Databricks MERGE batches.

        // Build one SQL MERGE statement per chunk.
        const mergeQueries = mergeChunks.map(chunk =>
            buildMergeBatch(chunk) // Converts a group chunk into a Databricks UPSERT query.
        );

        // Tell the UI that Databricks writes are starting and provide totals for progress display.
        updateAzureAdGroupImportJob(jobId, {
            status: "merging", // Current stage: writing to Databricks.
            totalGroups: groups.length, // Total group count for progress text.
            totalChunks: mergeChunks.length, // Total merge batch count.
            processedChunks: 0, // No merge batches completed yet at this moment.
            processedGroups: 0, // No groups merged yet at this moment.
            message: `Importig/Syncing ${groups.length} Azure AD groups into Databricks.`, // User-friendly progress message.
        });

        // Execute the Databricks MERGE statements and update job progress after each completed batch.
        await executeChunks(session, mergeQueries, (processedChunks) => {
            const processedGroups = Math.min(processedChunks * CHUNK_SIZE, groups.length); // Convert completed chunks into group count.

            // Save progress so the SSE stream can push it to the browser.
            updateAzureAdGroupImportJob(jobId, {
                status: "merging", // Job is still in the Databricks merge stage.
                processedChunks, // Number of completed Databricks merge chunks.
                processedGroups, // Approximate number of groups merged so far.
                message: `Imported/Synced ${processedGroups} of ${groups.length} Azure AD groups.`, // Progress text for the UI.
            });
        });

        // Server-side success log after all chunks finish.
        console.info("Azure AD sync/import completed successfully", {
            jobId, // Tracking ID for this import.
            total: groups.length // Final number of groups processed.
        });

        // Mark the job as successful so SSE can send the final "done" event.
        updateAzureAdGroupImportJob(jobId, {
            status: "success", // Final successful state.
            processedGroups: groups.length, // All fetched groups have been processed.
            processedChunks: mergeChunks.length, // All merge chunks have completed.
            completedAt: new Date().toISOString(), // Records when the job finished.
            message: `Azure AD group sync/import completed. Imported/Synced ${groups.length} groups.`, // Final success message for the UI.
        });

        // Send success telemetry to Event Hub for monitoring and audit.
        await logToEventHub({
            type: "INFO", // Informational event.
            detailMessage: "Azure AD sync/import completed successfully", // Human-readable event message.
            programName, // Program name for log filtering.
            startDatetime: requestStartTime, // When the job began.
            status: "SUCCESS", // Overall result.
            actionType: "AZURE_AD_GROUPS_IMPORT", // Business operation identifier.
            actionDescription: `JobId=${jobId}; Imported/Synced=${groups.length}`, // Summary details for audit.
            user // User who triggered the import.
        });
    } catch (error: unknown) {
        // Convert any thrown value into a readable failure message.
        const errorMessage =
            `Azure AD sync failed: ${(error as Error)?.message ?? "Unknown error"}`; // Fallback if the error has no message.

        console.error(errorMessage, (error as Error)?.stack); // Server-side error log with stack when available.

        // Mark the job as failed so SSE can tell the browser and stop loading.
        updateAzureAdGroupImportJob(jobId, {
            status: "failed", // Final failed state.
            error: errorMessage, // Technical error message for the UI/toast.
            completedAt: new Date().toISOString(), // Records when the job failed.
            message: errorMessage, // User-facing failure message.
        });

        // Send failure telemetry to Event Hub for monitoring and audit.
        await logToEventHub({
            type: "ERROR", // Error event.
            detailMessage: errorMessage, // Human-readable failure message.
            programName, // Program name for log filtering.
            startDatetime: requestStartTime, // When the job began.
            status: "FAILED", // Overall result.
            actionType: "AZURE_AD_GROUPS_IMPORT", // Business operation identifier.
            actionDescription: `JobId=${jobId}; ${errorMessage}`, // Include job ID and error in audit detail.
            user // User who triggered the import.
        });
    }
}

// POST /api/roles-management/import-ad-groups
// Queues the import and returns immediately, avoiding App Service request timeout.
export const POST = withAuthorization(async function POST(
    request: NextRequest // Incoming request, already authorized by withAuthorization.
): Promise<NextResponse> {
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID added by RBAC; fallback protects logs.
    const jobId = crypto.randomUUID(); // Unique ID the browser uses to subscribe to SSE progress.

    createAzureAdGroupImportJob(jobId, user); // Save initial queued status before returning to the browser.

    // after() runs after the response is sent, so the browser is not stuck waiting 10-15 minutes.
    after(async () => {
        await runAzureAdSync(jobId, user); // Continue the long-running Azure AD -> Databricks sync in-process.
    });

    // Return immediately with the job ID and stream URL the UI can use for live status.
    return NextResponse.json({
        success: true, // Confirms the job was accepted, not that the import has finished.
        jobId, // Tracking ID for this import job.
        status: "queued", // Initial state of the background job.
        streamUrl: `/api/roles-management/import-ad-groups/stream?jobId=${jobId}`, // SSE URL for live progress.
    });
});
