/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script retrieves dataset rule types for a specific business unit, filtering by result status and optional rule category.
    It performs the following tasks:
    - Executes an SQL query to fetch the dataset rule types.
    - Logs the success or failure of the operation to EventHub.
    - Returns the results as a JSON response.
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
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table name for storing information about allowed tables and their associated tags
} from "@/constants/config";

/*
  @/lib/rbac/authorize
    - What it is:
        A centralized RBAC (Role-Based Access Control) authorization module that provides
        middleware-style functionality for protecting Next.js API routes.

    - Why used:
        To enforce authentication and authorization policies before API execution, validate
        user permissions and scopes, attach RBAC context to requests, and generate audit
        logs for access decisions. It ensures that only authorized users can access or
        modify protected resources within the application.
*/
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeAndClause,
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

// ----------------------------- SQL QUERY BUILDER -----------------------------

/**
 * Constructs the SQL query to retrieve dataset rule types for the given business unit.
 *
 * This function builds a query to fetch dataset rule types, applying filters based on:
 * - The business unit.
 * - The result status (e.g., 'FAILED', 'PASSED').
 * - An optional rule category filter.
 *
 * @param {string} businessUnit - The business unit for which to retrieve dataset rule types.
 * @param {string} resultStatus - The status of the rule results (e.g., 'FAILED' or 'PASSED').
 * @param {string | null} ruleCategory - An optional rule category filter.
 *
 * @returns {string} The constructed SQL query string.
 *
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - resultStatus: "FAILED"
 *    - ruleCategory: "Integrity"
 *  Output:
 *    A SQL query string that retrieves the dataset rule types based on the input criteria.
 */
const buildDatasetRuleTypesQuery = (
  businessUnit: string, // Business unit filter from user selection (example: "Retail")
  resultStatus: string, // Status filter chosen in UI (example: "FAILED" or "PASSED")
  ruleCategory: string | null, // Optional category filter (example: "metadata"), can be null/empty
  request: NextRequest // Current request carrying RBAC scope headers from withAuthorization
): string => {
  // This helper function returns a SQL query as plain text based on selected filters

  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: dataset=orders adds an extra dataset condition in the ranked_results CTE.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  return `
    -- Start SQL query: Fetch rule types grouped by dataset for the selected business unit

    WITH ranked_results AS (
      -- Step 1: Prepare latest rule execution records per CONFIG_ID (like picking latest entry per rule)

      SELECT
        CONCAT(di.CATALOG_NAME, '.', di.SCHEMA_NAME, '.', di.DATASET_NAME) AS table_name,
        -- Build full dataset name (catalog.schema.dataset) like a full file path

        di.RESULT_STATUS,
        -- Whether the rule run passed or failed

        di.RULE_TYPE,
        -- Rule type (example: Completeness, Integrity, Freshness)

        di.RULE_CATEGORY,
        -- Category of the rule (example: metadata, data_drift, profiling)

        ROW_NUMBER() OVER (
          -- Generate ranking so we can keep only most recent execution row per rule config

          PARTITION BY CONFIG_ID
          -- Group records by configuration ID (each rule setup)

          ORDER BY RUN_ID DESC
          -- Sort newest run first (latest execution gets rank = 1)
        ) AS rn
        -- rn=1 indicates latest run record for that CONFIG_ID

      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
      -- Read from execution results table where rule results are stored

      INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
        -- Join with allowed_tables_with_tags table to map schema to business unit

        ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

        AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
        -- Match schema name from results with schema name in tag mapping
  
        AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]
        
        AND di.L1_BUSINESS_UNIT = st.tag_value
        -- Ensure business unit matches schema tag value

      WHERE
        di.L1_BUSINESS_UNIT = '${businessUnit}'
        -- Filter results only for selected business unit (like showing only Retail BU datasets)
        ${rbacScopeClause}
        -- RBAC data-scope filter: only include dataset rows this user may view
    ),

    latest_rules AS (
        -- Step 2: Get only latest run rows and compute whether dataset has any failure

        SELECT
            table_name,
            -- Full dataset identifier

            RULE_TYPE,
            -- Rule type per dataset

            RULE_CATEGORY,
            -- Rule category per dataset

            RESULT_STATUS,
            -- Result status of that rule execution

            MAX(
                CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END
            ) OVER (PARTITION BY table_name) AS has_failed
            -- Mark dataset as "has_failed = 1" if any rule failed for that dataset
            -- Real-world example: If any check fails, dataset is treated as failed in dashboard
        FROM ranked_results
        -- Use ranked results from previous step

        WHERE rn = 1
        -- Keep only latest run record for each rule config
    )

    SELECT
        table_name AS dataset_name,
        -- Rename table_name as dataset_name for UI output

        LISTAGG(DISTINCT RULE_TYPE, ',') AS RULE_TYPE
        -- Combine all unique rule types into a comma-separated string
        -- Example output: "Freshness,SchemaValidation,Timeliness"
    FROM latest_rules
    -- Use latest rules dataset

    WHERE
        -- Dataset-level filter
        (
            ('${resultStatus}' = 'FAILED' AND has_failed = 1)
            -- If user asks FAILED, include datasets where at least one rule failed
            OR
            ('${resultStatus}' = 'PASSED' AND has_failed = 0)
            -- If user asks PASSED, include only datasets with no failures
        )

        -- Rule-level filter (only for FAILED case)
        AND (
            '${resultStatus}' <> 'FAILED'
            -- If not FAILED request, no need to filter failed rules
            OR RESULT_STATUS = 'FAILED'
            -- If FAILED request, only show failed rule rows
        )

        -- Optional rule category filter
        ${ruleCategory ? `AND RULE_CATEGORY = '${ruleCategory}'` : ""}
        -- If ruleCategory is provided, apply it as extra filter, otherwise skip
        -- Example: only show metadata rule failures
    GROUP BY table_name;
    -- Group results so each dataset appears once in output
  `;
};

// ------------------------------- API ROUTE HANDLER -------------------------------

/**
 * The handler for the GET request to fetch dataset rule types for a specific business unit.
 *
 * This function:
 * - Retrieves and validates the query parameters.
 * - Executes the SQL query to fetch dataset rule types.
 * - Logs the success or failure of the operation to EventHub.
 * - Returns the result as a JSON response.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param {object} context - Contains the route parameters.
 * @param {string} context.businessUnit - The business unit to fetch dataset rule types for.
 *
 * @returns {NextResponse} A JSON response containing the dataset rule types or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 * 
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - resultStatus: "FAILED"
 *    - ruleCategory: "Integrity"
 *  Output:
 *    - 200 OK response with the dataset rule types for the business unit.
 *    - 400 Bad Request if the resultStatus parameter is missing.
 *    - 500 Internal Server Error if an error occurs while fetching the data.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // Incoming API request from frontend UI
  // Route parameter object (contains businessUnit name from URL)
  { params }: { params: Promise<{ businessUnit: string }> }
): // Route params includes businessUnit from URL like /api/.../Retail
Promise<NextResponse> {
  const requestStartTime = new Date(); // Record the start time of the request
  // Save request start time for calculating duration

  const programName = "DQDSummaryViewDatasetRuleTypesAPI"; // Name of the program making the request
  // Used for logging identification in monitoring tools

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from request headers
  // Identify which user triggered this request (audit tracking)

  const { businessUnit } = await params; // Extract the business unit from the route parameters
  // Read business unit from URL route path

  const { searchParams } = new URL(request.url);
  // Parse query parameters from URL (?resultStatus=FAILED&ruleCategory=metadata)

  // Retrieve search parameters for the dataset rule types query
  const resultStatus = searchParams.get("resultStatus");
  // Result status filter (FAILED/PASSED)

  const ruleCategory = searchParams.get("ruleCategory");
  // Optional rule category filter for narrowing results

  // Log the start of the request processing
  console.debug(
    `[${programName}] Starting to process GET request for Business Unit: ${businessUnit}`
  );
  // Debug log for tracing this request lifecycle

  // Validate required query parameters
  if (!resultStatus) {
    // resultStatus is mandatory because output depends on FAILED vs PASSED dataset selection

    console.error(
      `[${programName}] Missing required query parameter: resultStatus`
    );
    // Log missing parameter problem

    return NextResponse.json(
      { error: "Missing required query parameters: resultStatus" },
      // Send error message back to frontend

      { status: 400 }
      // HTTP 400 = frontend/client request missing required input
    );
  }

  try {
    // Try block: normal execution path

    // Establish a Databricks session
    const session = await getDatabricksSession();
    // Connect to Databricks to allow SQL execution

    // Log the query execution start
    console.debug(
      `[${programName}] Executing query for Business Unit: ${businessUnit}`
    );
    // Debug log before executing SQL query

    // Execute the SQL query to fetch dataset rule types
    const datasetRuleTypes = await executeQuery(
      session,
      buildDatasetRuleTypesQuery(businessUnit, resultStatus, ruleCategory, request)
    );
    // Build query using filters and execute it, returning dataset rule types

    // Log success to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO indicates request succeeded
      detailMessage: `Successfully retrieved dataset rule types for Business Unit '${businessUnit}'.`,
      // Success message stored in EventHub/Splunk
      programName,
      // Program name for log filtering
      startDatetime: requestStartTime,
      // Used to compute API duration
      status: "SUCCESS",
      // Mark operation successful
      actionType: "Spark_SQL_Query",
      // The operation is a Databricks SQL query
      actionDescription: `Fetch dataset rule types for Business Unit: '${businessUnit}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Description of which query action happened and which table was used
      l1Tag: businessUnit,
      // Tag logs with BU name so dashboard errors can be BU-specific
      user,
      // Record user context for audit
    });

    // Return the result as a JSON response
    console.debug(
      `[${programName}] Successfully retrieved dataset rule types for ${businessUnit}`
    );
    // Debug log for successful completion

    return NextResponse.json(datasetRuleTypes);
    // Send dataset rule types back to frontend for display (tables/charts)
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Error retrieving dataset rule types for Business Unit '${businessUnit}': ${
      error?.message ?? "Unknown error"
    }`;
    // Extract readable message; fallback default

    // Log error to EventHub if an exception occurs
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failure
      detailMessage: errorMessage,
      // Store detailed error message
      programName,
      // Identify API name
      startDatetime: requestStartTime,
      // Helps calculate time-to-failure
      status: "FAILED",
      // Mark operation failed
      actionType: "Spark_SQL_Query",
      // Failure category: SQL execution
      actionDescription: `Failed to fetch dataset rule types for Business Unit: '${businessUnit}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe failed action and table involved
      l1Tag: businessUnit,
      // Tag error logs with business unit for filtering
      user,
      // Include user identity in logs
    });

    // Log the error to the console
    console.error(
      `[${programName}] Error occurred for Business Unit: ${businessUnit}`,
      errorMessage
    );
    // Print full error stack trace in backend console logs

    // Return error response
    return NextResponse.json(
      { error: errorMessage },
      // Send readable message to frontend
      { status: 500 }
      // HTTP 500 indicates backend/server failure
    );
  }
});
