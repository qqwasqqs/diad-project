/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script defines an API route for fetching metadata highlights of a dataset within the Teva Data Integrity system.
    - It retrieves highlights from various checks such as schema validation, freshness, and timeliness for a specific dataset.
    - The route processes the required SQL queries to pull the most recent results and returns them as a JSON response.
    - Logs both successful and failed query executions for operational traceability.
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
import { NextRequest, NextResponse } from "next/server"; // Next.js types/utilities for server route handling

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
  DATA_INTEGRITY_EXECUTION_RESULTS_TABLE, // Table name for storing data integrity execution results
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * Generates the SQL query to fetch metadata highlights for a dataset based on schema and dataset name.
 * The highlights include schema validation, freshness, and timeliness checks.
 *
 * @param catalogName - The catalog name to query from.
 * @param schemaName - The schema in the catalog where the dataset is defined.
 * @param datasetName - The name of the dataset for which highlights are to be fetched.
 * @returns SQL query string to retrieve metadata highlights for the dataset.
 *
 * FIX SUMMARY (compared to original):
 *   1. parsed CTE: ROW_NUMBER() PARTITION BY now includes CATALOG_NAME, SCHEMA_NAME,
 *      DATASET_NAME — the original partitioned only by CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
 *      but lacked the dataset filter inside the CTE subquery. Without the filter, the window
 *      function assigned rnk across all datasets' schema_validation rows, so rnk=1 picked
 *      whichever dataset had the globally latest schema_validation run — not necessarily the
 *      one being requested. This is why schema validation showed wrong or missing data.
 *   2. Dataset filter pushed into the parsed CTE subquery — the original only filtered in the
 *      final WHERE clause, meaning the parsed CTE was built from all datasets.
 *   3. Freshness branch: dataset filter pushed inside the subquery so rnk=1 selects the
 *      latest freshness run for THIS dataset, not the global latest freshness record.
 *   4. Timeliness branch: same dataset filter fix applied.
 *   5. All UNION changed to UNION ALL between the three highlight branches — the original
 *      UNION deduplicated across freshness, timeliness, and schema_validation rows before
 *      the final WHERE ran. If two branches produced an identical KEY/VALUE combination
 *      (unlikely but possible for 'Passed' schema validation matching a timeliness value),
 *      one row was silently dropped. UNION ALL preserves all three highlight rows correctly.
 *   6. Schema Validation VALUE for RESULT_VALUE = 'TRUE' — original used ELSE 'Passed'
 *      which correctly handles the TRUE case. No change needed here; kept as-is.
 */
const buildMetadataHighlightsQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string
) => `
  -- Parse latest schema validation result JSON
  -- FIX: Dataset filter added inside the CTE subquery and PARTITION BY now correctly scoped.
  -- The original CTE built from ALL datasets' schema_validation rows; rnk=1 picked the
  -- globally latest schema_validation run, which could be from a completely different dataset.
  WITH parsed AS (
    SELECT DISTINCT
      CATALOG_NAME,
      SCHEMA_NAME,
      DATASET_NAME,
      RESULT_VALUE,
      j
    FROM (
      SELECT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        RESULT_VALUE,
        -- Parse schema validation details JSON into structured fields
        from_json(
          details,
            'struct<
 
           missing_columns:string,
 
           extra_columns:string,
 
           type_mismatches:string,
 
           nullability_mismatches:string,
 
           sequence_match:boolean,
 
           sequence_differences:string
 
         >'
        ) AS j,
        -- Rank runs to select the most recent schema validation result
        -- FIX: Dataset filter inside this subquery ensures the window function only sees
        -- rows for the target dataset, so rnk=1 is the latest run for THIS dataset's
        -- schema_validation — not the globally latest schema_validation across all datasets.
        ROW_NUMBER() OVER (
          PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
          ORDER BY CAST(RUN_ID AS INT) DESC
        ) AS rnk
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
      -- Filter for schema validation rule
      WHERE rule_name = 'schema_validation'
        -- FIX: Filter pushed inside CTE subquery
        AND CATALOG_NAME = '${catalogName}'
        AND SCHEMA_NAME  = '${schemaName}'
        AND DATASET_NAME = '${datasetName}'
    )
    -- Keep only the most recent schema validation execution
    WHERE rnk = 1
  )

  -- Assemble metadata highlights
  SELECT *
  FROM (
      -- Freshness Highlight
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        KEY,
        VALUE
      FROM (
          SELECT DISTINCT
            CATALOG_NAME,
            SCHEMA_NAME,
            DATASET_NAME,
            'Freshness (Last Refresh Date)' AS KEY,
            -- Include refresh timestamp and derived source information
            CONCAT(
              RESULT_VALUE,
              ' (Derived From: ',
              SUBSTRING(
                GET_JSON_OBJECT(DETAILS, '$.derived_from'),
                CHARINDEX('-', GET_JSON_OBJECT(DETAILS, '$.derived_from')) + 1,
                LEN(GET_JSON_OBJECT(DETAILS, '$.derived_from'))
              ),
              ')'
            ) AS VALUE,
            -- Rank runs to get the most recent freshness result
            -- FIX: Dataset filter inside subquery so rnk=1 is latest for THIS dataset only
            ROW_NUMBER() OVER (
              PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
              ORDER BY CAST(RUN_ID AS INT) DESC
            ) AS rnk
          FROM
            ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
          -- Filter for freshness checks
          WHERE
            rule_name = 'freshness_check'
            -- FIX: Dataset filter pushed inside subquery
            AND CATALOG_NAME = '${catalogName}'
            AND SCHEMA_NAME  = '${schemaName}'
            AND DATASET_NAME = '${datasetName}'
        )
      -- Keep only the latest freshness result
      WHERE rnk = 1

    -- FIX: UNION ALL (was UNION) — prevents set-based dedup across highlight branches.
    -- The three branches (freshness, timeliness, schema_validation) each produce exactly
    -- one row with a different KEY. UNION ALL ensures all three are preserved without any
    -- risk of one being dropped due to accidental KEY/VALUE equality between branches.
    UNION ALL

      -- Timeliness Highlight
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        KEY,
        VALUE
      FROM (
          SELECT
            CATALOG_NAME,
            SCHEMA_NAME,
            DATASET_NAME,
            'Timeliness Check' AS KEY,
            -- Display pass/fail status with expected frequency and dataset age
            CONCAT(
              INITCAP(RESULT_STATUS),
              ' (Expected Refresh Frequency: ',
              RULE_CRITICAL_THRESHOLD,
              ' h, Dataset Age (deviation from current timestamp): ',
              GET_JSON_OBJECT(DETAILS, '$.age'),
              ')'
            ) AS VALUE,
            -- Rank runs to get the most recent timeliness result
            -- FIX: Dataset filter inside subquery so rnk=1 is latest for THIS dataset only
            ROW_NUMBER() OVER (
              PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
              ORDER BY CAST(RUN_ID AS INT) DESC
            ) AS rnk
          FROM
            ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
          -- Filter for timeliness checks
          WHERE
            rule_name = 'timeliness_check'
            -- FIX: Dataset filter pushed inside subquery
            AND CATALOG_NAME = '${catalogName}'
            AND SCHEMA_NAME  = '${schemaName}'
            AND DATASET_NAME = '${datasetName}'
        )
      -- Keep only the latest timeliness result
      WHERE rnk = 1

    -- FIX: UNION ALL (was UNION)
    UNION ALL

      -- Schema Validation Highlight
      -- This branch reads from the parsed CTE which is already correctly scoped to the
      -- target dataset after fix #1 and #2 above. No further filter needed here.
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        'Schema Validation' AS KEY,
        -- Construct descriptive validation message when schema validation fails
        CASE
          WHEN
            UPPER(RESULT_VALUE) = 'FALSE'
          THEN
            CONCAT(
              TRIM(
                BOTH ', ' FROM CONCAT_WS(
                  ', ',
                  -- List missing columns if present
                  CASE
                    WHEN
                      j.missing_columns IS NOT NULL
                      AND j.missing_columns <> ''
                    THEN
                      CONCAT('Missing Columns: ', j.missing_columns)
                  END,
                  -- List extra columns if present
                  CASE
                    WHEN
                      j.extra_columns IS NOT NULL
                      AND j.extra_columns <> ''
                    THEN
                      CONCAT('Extra Columns: ', j.extra_columns)
                  END,
                  -- List type mismatches if present
                  CASE
                    WHEN
                      j.type_mismatches IS NOT NULL
                      AND j.type_mismatches <> ''
                    THEN
                      CONCAT('Type Mismatches: ', j.type_mismatches)
                  END,
                  -- List nullability mismatches if present
                  CASE
                    WHEN
                      j.nullability_mismatches IS NOT NULL
                      AND j.nullability_mismatches <> ''
                    THEN
                      CONCAT('Nullability Mismatches: ', j.nullability_mismatches)
                  END,
                  -- Always include sequence match result when available
                  CASE
                    WHEN
                      j.sequence_match IS NOT NULL
                    THEN
                      CONCAT('Sequence Match: ', CAST(j.sequence_match AS STRING))
                  END
                )
              )
          )
        -- Schema validation passed
        ELSE 'Passed'
        END AS VALUE
      FROM parsed
    )

  -- Final dataset-level filter — acts as a safety net
  -- Primary isolation is done inside each branch subquery and the parsed CTE above
  WHERE CATALOG_NAME = '${catalogName}'
    AND SCHEMA_NAME  = '${schemaName}'
    AND DATASET_NAME = '${datasetName}'
`;

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * The handler for the API route that retrieves metadata highlights for a dataset.
 * The highlights include schema validation, freshness, and timeliness checks.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters
 * @returns A JSON response containing the metadata highlights or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API runs when dashboard requests "metadata highlights" for a selected dataset

  // Define start time for logging the request duration
  const requestStartTime = new Date();
  // Save request start time (like starting a stopwatch to calculate duration)

  const programName = "DQDDetailedViewMetadataAPI"; // Identifier for this API program
  // Program name used in logs so support team knows which API created the event

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID, defaulting to "Anonymous"
  // Identify the user who requested the data (audit requirement); fallback to Anonymous

  // Extract query parameters from the incoming request
  const { searchParams } = new URL(request.url);
  // Parse URL query parameters (example: ?catalogName=X&schemaName=Y&datasetName=Z)

  const catalogName = searchParams.get("catalogName");
  // Catalog filter value (like selecting the main database folder)

  const schemaName = searchParams.get("schemaName");
  // Schema filter value (like selecting a sub-folder inside that catalog)

  const datasetName = searchParams.get("datasetName");
  // Dataset filter value (like selecting which report/table to view)

  // ------------------- PARAMETER VALIDATION -------------------
  if (!catalogName || !schemaName || !datasetName) {
    // If any required parameter is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: catalogName, schemaName, datasetName";
    // Clear message explaining which inputs are required

    console.error(errorMessage);
    // Print error to logs so developers/support know why the API returned 400

    // Return a 400 error with a descriptive message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 = request is invalid (user/frontend missed required inputs)
  }

  try {
    // Try block = normal successful flow happens here

    // Get a Databricks session for querying the database
    const session = await getDatabricksSession();
    // Create/reuse secure Databricks connection (like logging into database)

    // Execute the SQL query to fetch metadata highlights
    const metadataHighlights = await executeQuery(
      session,
      buildMetadataHighlightsQuery(catalogName, schemaName, datasetName)
      // Build the SQL query using catalog/schema/dataset filters, then execute it
    );

    // Log the success of the operation
    await logToEventHub({
      type: "INFO",
      // INFO indicates request was successful
      detailMessage: `Successfully retrieved metadata highlights for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}'`,
      // Human-readable success message for monitoring tools
      programName,
      // Identify which API logged this event
      startDatetime: requestStartTime,
      // Start time is used to track request duration
      status: "SUCCESS",
      // Mark operation as SUCCESS
      actionType: "Spark_SQL_Query",
      // Categorize action as Databricks SQL query execution
      actionDescription: `Fetch metadata highlights for Dataset '${datasetName}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what data was fetched and from where (table name included)
      user,
      // Store which user requested the highlights
    });

    // Return the metadata highlights as JSON
    return NextResponse.json(metadataHighlights);
    // Send highlights back to frontend so UI can display them on dashboard
  } catch (error: any) {
    // Catch block = runs if database query fails, connection fails, etc.
    // Log the error if an issue occurs
    const errorMessage = `Error retrieving metadata highlights for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}': ${error?.message ?? "Unknown error"
      }`;
    // Extract readable error message; fallback to Unknown error

    console.error(errorMessage);
    // Print error in server logs for debugging

    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Detailed failure message to help investigation
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used for duration/time-to-failure tracking
      status: "FAILED",
      // Mark operation FAILED
      actionType: "Spark_SQL_Query",
      // Failure happened during SQL query execution
      actionDescription: `Failed to fetch metadata highlights for Dataset '${datasetName}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe the operation and table used, helps debugging
      user,
      // Include user who triggered this request
    });

    // Return an error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 = server-side problem, frontend can show error message banner/toast
  }
});