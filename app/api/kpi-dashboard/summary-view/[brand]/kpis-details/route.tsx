/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script handles the API endpoint for fetching detailed KPI results based on the given brand and result status (e.g., 'FAILED' or 'PASSED').
    - The route receives a brand name and result status as query parameters and fetches KPI details from the database.
    - The response includes KPI name, data vendor, data source, result values, alert thresholds, and brief descriptions.
    - Success and error logs are recorded for auditing and monitoring purposes.
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
  KPI_QUALITY_CONFIG_TABLE, // Table name for storing KPI quality configuration details
  KPI_QUALITY_EXECUTION_RESULTS_TABLE, // Table name for storing KPI quality execution results
  KPI_L1_TAG_NAME, // L1 business tag used for KPI Splunk logging, monitoring, and reporting
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeAndClause,
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * Generates the SQL query to fetch KPI details for a specific brand and result status ('FAILED' or 'PASSED').
 * The query includes details like the latest and previous values, result value, alert threshold, and brief description.
 *
 * @param brand - The brand for which KPI details need to be fetched.
 * @param resultStatus - The result status filter ('FAILED' or 'PASSED') to filter the KPI results.
 * @returns A string containing the SQL query to fetch KPI details from the database.
 */
const generateKpiDetailsQuery = (
  // Helper function to dynamically build SQL query text
  brand: string, // Brand filter value (example: "Teva")
  resultStatus: string, // Status filter (example: "FAILED" or "PASSED")
  request: NextRequest // Current request carrying RBAC scope headers from authorization
): string => {
  // Build the RBAC filter for KPI config rows joined as alias "c".
  // Example: brand=Teva only allows Teva KPI executions into the details table.
  const rbacScopeClauseForConfigAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // Build the RBAC filter for the later config join alias "cfg".
  // Example: dataset=sales_fact keeps the run-frequency join inside the same dataset scope.
  const rbacScopeClauseForCfgAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("cfg")
  );

  return ` 
  -- Start of SQL query string that will be executed in Databricks

  WITH latest_results AS ( 
    -- First temporary table: determine the latest KPI execution entry per KPI unique identifier

    SELECT
      k.CONFIG_ID,
      -- KPI configuration ID (used to join with config table)
      k.BRAND,
      -- Brand name
      k.DATA_VENDOR,
      -- Vendor name (example: IQVIA)
      k.KPI_NAME,
      -- KPI name (example: "Completeness KPI")
      k.DATA_SOURCE,
      -- Source system of the dataset
      k.ALERT_THRESHOLD,
      -- Threshold value used to decide PASS/FAIL
      k.RESULT_DEVIATION_PCT AS RESULT_VALUE,
      -- Rename deviation percent value as RESULT_VALUE for easy display
      k.RESULT_STATUS,
      -- Whether KPI run resulted in FAILED or PASSED
      k.DETAILS:alert_type AS ALERT_TYPE,
      -- Extract alert type from JSON details field
      k.DETAILS:latest_value AS LATEST_VALUE,
      -- Extract latest KPI reading/value from details JSON
      k.DETAILS:latest_month AS LATEST_MONTH,
      -- Extract latest month label from details JSON (for monthly KPIs)
      k.DETAILS:latest_week AS LATEST_WEEK,
      -- Extract latest week label from details JSON (for weekly KPIs)
      k.DETAILS:previous_value AS PREVIOUS_VALUE,
      -- Extract previous KPI value from JSON
      k.DETAILS:previous_month AS PREVIOUS_MONTH,
      -- Extract previous month label from JSON
      k.DETAILS:previous_week AS PREVIOUS_WEEK,
      -- Extract previous week label from JSON
      k.DETAILS:brief_description AS BRIEF_DESCRIPTION,
      -- Extract a user-friendly description from JSON (helps explain KPI meaning)
      ROW_NUMBER() OVER (
        -- Ranking used to pick the latest execution record
        PARTITION BY k.CONFIG_ID, k.KPI_UNIQUE_IDENTIFIER, k.KPI_UNIQUE_IDENTIFIER_VALUE
        -- Group by k.KPI config + unique identifier so each KPI gets its own latest record
        ORDER BY k.RUN_ID DESC
        -- Latest RUN_ID is treated as most recent (rank 1)
      ) AS rn
      -- rn=1 means latest record
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k
      -- Read KPI execution results from results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results table with the KPI configuration table to link each execution result with its corresponding configuration details using CONFIG_ID
    WHERE c.ENABLED = TRUE -- Only include enabled config rules
      ${rbacScopeClauseForConfigAlias}
      -- RBAC data-scope filter: only include latest KPI rows allowed by the user's groups
  ),

  kpi_status AS (
    -- Second temporary table: format latest/previous values and determine if KPI has any failure

    SELECT
      subq.BRAND,
      -- Brand name
      subq.DATA_VENDOR,
      -- Vendor name
      subq.KPI_NAME,
      -- KPI name
      subq.DATA_SOURCE,
      -- Source system
      CASE
        -- Display latest KPI value differently depending on weekly or monthly run frequency
        WHEN ANY_VALUE(cfg.RUN_FREQUENCY) = 'Weekly'
        THEN CONCAT(ANY_VALUE(subq.LATEST_VALUE), ' (', ANY_VALUE(subq.LATEST_WEEK), ')')
        -- Weekly KPI format example: "90 (Week 2)"
        ELSE CONCAT(ANY_VALUE(subq.LATEST_VALUE), ' (', ANY_VALUE(subq.LATEST_MONTH), ')')
        -- Monthly KPI format example: "90 (Jan)"
      END AS LATEST_VALUE,
      -- Final field shown in dashboard UI: latest KPI value + date label

      CASE
        -- Display previous KPI value differently depending on weekly/monthly frequency
        WHEN ANY_VALUE(cfg.RUN_FREQUENCY) = 'Weekly'
        THEN CONCAT(ANY_VALUE(subq.PREVIOUS_VALUE), ' (', ANY_VALUE(subq.PREVIOUS_WEEK), ')')
        -- Weekly previous KPI value with week label
        ELSE CONCAT(ANY_VALUE(subq.PREVIOUS_VALUE), ' (', ANY_VALUE(subq.PREVIOUS_MONTH), ')')
        -- Monthly previous KPI value with month label
      END AS PREVIOUS_VALUE,
      -- Final field shown in dashboard UI: previous KPI value + date label

      ANY_VALUE(subq.RESULT_VALUE) AS RESULT_VALUE,
      -- Deviation/result value (same for the latest record)
      ANY_VALUE(subq.ALERT_THRESHOLD) AS ALERT_THRESHOLD,
      -- Threshold for alerting
      ANY_VALUE(subq.BRIEF_DESCRIPTION) AS BRIEF_DESCRIPTION,
      -- KPI explanation text that can be displayed in UI
      MAX(
        CASE
          -- Convert FAILED status into a numeric flag (FAILED=1, otherwise 0)
          WHEN subq.RESULT_STATUS = 'FAILED' THEN 1
          ELSE 0
        END
      ) AS has_failed
      -- If any record failed → has_failed becomes 1

    FROM
      latest_results subq
      -- Use latest_results as the source (only latest row per KPI identifier)
    LEFT JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} cfg
      -- Join configuration table to get RUN_FREQUENCY and KPI setup info
      ON subq.CONFIG_ID = cfg.CONFIG_ID
      -- Match using configuration ID
    WHERE
      rn = 1
      -- Only include latest row per KPI identifier (avoid old runs)
      AND cfg.ENABLED = TRUE
      -- Only keep details tied to enabled KPI configuration rows
      ${rbacScopeClauseForCfgAlias}
      -- RBAC data-scope filter: keep configuration details inside the user's allowed scope
    GROUP BY
      subq.BRAND,
      -- Group by brand
      subq.KPI_NAME,
      -- Group by KPI name
      subq.DATA_VENDOR,
      -- Group by vendor
      subq.DATA_SOURCE
      -- Group by data source so output is unique per KPI/vendor/source
  )

  SELECT
    KPI_NAME,
    -- KPI name output column
    DATA_VENDOR,
    -- Vendor output column
    DATA_SOURCE,
    -- Data source output column
    LATEST_VALUE,
    -- Latest KPI value output
    PREVIOUS_VALUE,
    -- Previous KPI value output
    RESULT_VALUE,
    -- KPI result deviation output
    ALERT_THRESHOLD,
    -- Threshold output
    BRIEF_DESCRIPTION
    -- Brief description output (helps user understand KPI)
  FROM
    kpi_status
    -- Use the processed dataset (kpi_status)
  WHERE
    BRAND = '${brand}'
    -- Filter results for only the requested brand
    AND has_failed = ${resultStatus === "FAILED" ? 1 : 0}
    -- If user asked FAILED → fetch only failed KPIs; if PASSED → fetch only non-failed KPIs
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch detailed KPI results for a specific brand and result status.
 * It validates the query parameters and executes the corresponding SQL query to retrieve the data.
 * Success and failure logs are recorded for audit purposes.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param params - The route parameters containing the brand name.
 * @returns A JSON response containing the KPI details or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // HTTP request received from frontend/dashboard UI
  { params }: { params: Promise<{ brand: string }> } // Route parameter object (contains brand name from URL)
): Promise<NextResponse> {
  // Brand comes from URL route path
  // Track the start time for logging and performance tracking
  const requestStartTime = new Date();
  // Store when request started (like starting stopwatch)

  const programName = "KPIDashboardAPI"; // Program name for logging purposes
  // API name used for traceability in monitoring tools

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Get user ID from headers or use "Anonymous" if not provided
  // Identify user triggering API call (important for audit logs)

  const { brand } = await params; // Extract brand name from the route parameters
  // Example: /api/kpi/Teva → brand="Teva"

  const { searchParams } = new URL(request.url); // Extract query parameters from the URL
  // Example: ?resultStatus=FAILED

  const resultStatus = searchParams.get("resultStatus"); // Extract the "resultStatus" query parameter (e.g., 'FAILED' or 'PASSED')
  // Used like a filter button: show FAILED KPIs or PASSED KPIs

  // Validate that the "resultStatus" query parameter is provided
  if (!resultStatus) {
    // If missing, we cannot decide whether to fetch FAILED or PASSED KPIs

    const errorMessage = "Missing required query parameter: resultStatus";
    // Create clear message for frontend

    console.error(`[${requestStartTime.toISOString()}] ${errorMessage}`);
    // Log timestamped error for troubleshooting

    // Return a 400 Bad Request response
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 means client request is invalid due to missing input
  }

  try {
    console.info(
      `[${requestStartTime.toISOString()}] Fetching KPI details for Brand: ${brand}, Result Status: ${resultStatus}`
    );
    // Log which brand and which filter is being requested

    // Establish a Databricks session to execute the SQL query
    const session = await getDatabricksSession();
    // Open secure Databricks connection session

    // Execute the SQL query to fetch KPI details for the given brand and result status
    const rows = await executeQuery(
      session,
      generateKpiDetailsQuery(brand, resultStatus, request)
    );
    // Run SQL query and store results (rows are KPI detail records)

    // Log the success of the query execution
    await logToEventHub({
      type: "INFO",
      // INFO indicates request succeeded normally
      detailMessage: `Successfully retrieved KPI details for Brand='${brand}' with Result Status='${resultStatus}'`,
      // Success message stored in logs
      programName,
      // Identify API name
      startDatetime: requestStartTime,
      // Used for measuring duration
      status: "SUCCESS",
      // Mark operation successful
      actionType: "Spark_SQL_Query",
      // Categorize as Databricks SQL query
      actionDescription: `Fetch KPI details for Brand: ${brand}, Result Status: ${resultStatus} from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe tables used for transparency and audit logs
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag
      user,
      // Record which user requested KPI details
    });

    // Return the KPI details as a JSON response
    return NextResponse.json(rows);
    // Return results to frontend so UI can display KPI detail table
  } catch (error: unknown) {
    // Handle errors and log the failure to Event Hub
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Extract readable error message

    console.error(
      `[${requestStartTime.toISOString()}] Error retrieving KPI details for Brand: ${brand}, Result Status: ${resultStatus}. Error: ${errorMessage}`,
      error
    );
    // Print timestamped error with full details

    // Log the error to Event Hub
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: `Failed to retrieve KPI details for Brand='${brand}', Result Status='${resultStatus}'. Error: ${errorMessage}`,
      // Store failure details
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used for time-to-failure tracking
      status: "FAILED",
      // Mark failed for alerting
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch KPI details for Brand: ${brand}, Result Status: ${resultStatus} from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Provide context of which action failed and which tables were involved
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag used in monitoring
      user,
      // Identify affected user
    });

    // Return a 500 Internal Server Error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means server/system error
  }
});
