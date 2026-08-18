/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script handles the API endpoint for retrieving KPI details of a specific brand filtered by a data vendor.
    - It queries the database to fetch KPI details, including the latest and previous values, result statuses, alert thresholds, etc.
    - The route validates query parameters (e.g., `vendor`) and handles success and error logging to Event Hub.
    - The response contains the KPI details for a given brand and vendor or error details if the request fails.
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
 * SQL query to fetch detailed KPI information for a specific brand and vendor.
 * This query retrieves various KPI attributes including the latest and previous values, result statuses, and alert thresholds.
 *
 * @param brand - The brand for which the KPI details need to be fetched.
 * @param vendor - The data vendor filter (if provided) for filtering the results.
 * @returns A SQL query string that will fetch the desired KPI details for the given brand and vendor.
 */
const getKpiDetailsQuery = (
  brand: string,
  vendor: string,
  request: NextRequest
): string => {
  // Build the RBAC filter for the KPI config rows joined in the latest-results subquery.
  // Example: brand=Teva only lets Teva KPI execution rows enter the result set.
  const rbacScopeClauseForConfigAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // Build the RBAC filter for the outer config alias used to read run frequency.
  // Example: dataset=sales_fact keeps returned KPI rows inside that dataset's scope.
  const rbacScopeClauseForCfgAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("cfg")
  );

  return `
  SELECT
    subq.KPI_NAME, 
    -- KPI name (example: "Data Completeness KPI")
    subq.DATA_VENDOR, 
    -- Vendor name (example: "IQVIA")
    subq.DATA_SOURCE, 
    -- The system/source from where KPI data is coming (example: CRM, EHR, etc.)
    CASE
      -- Decide how to display latest value depending on whether KPI is weekly or monthly
      WHEN cfg.RUN_FREQUENCY = 'Weekly' THEN CONCAT(subq.LATEST_VALUE, ' (', subq.LATEST_WEEK, ')')
      -- If weekly KPI: display latest value with week label (example: "96% (Week 02)")
      ELSE CONCAT(subq.LATEST_VALUE, ' (', subq.LATEST_MONTH, ')')
      -- If monthly KPI: display latest value with month label (example: "96% (Jan)")
    END AS LATEST_VALUE,
    -- Final display-friendly column that shows latest KPI value + time indicator (week/month)

    CASE
      -- Decide how to display previous value depending on whether KPI is weekly or monthly
      WHEN cfg.RUN_FREQUENCY = 'Weekly' THEN CONCAT(subq.PREVIOUS_VALUE, ' (', subq.PREVIOUS_WEEK, ')')
      -- Weekly case: show previous KPI value + week info
      ELSE CONCAT(subq.PREVIOUS_VALUE, ' (', subq.PREVIOUS_MONTH, ')')
      -- Monthly case: show previous KPI value + month info
    END AS PREVIOUS_VALUE,
    -- Final display-friendly column that shows previous KPI value + time indicator

    subq.RESULT_VALUE,
    -- Deviation percentage / KPI result value used to evaluate failure

    subq.ALERT_THRESHOLD,
    -- Threshold value beyond which KPI becomes FAILED

    subq.KPI_UNIQUE_IDENTIFIER,
    -- Identifier column name used to uniquely identify KPI record (example: "Patient_ID")

    subq.KPI_UNIQUE_IDENTIFIER_VALUE,
    -- Identifier actual value (example: "P10023")

    subq.RESULT_STATUS,
    -- Result status of KPI check (PASSED or FAILED)

    cfg.RUN_FREQUENCY
    -- How often KPI runs (Weekly/Monthly)

  FROM (
    -- Subquery: selects the latest KPI execution results per unique identifier
    SELECT DISTINCT
      k.CONFIG_ID,
      -- Unique config ID for KPI definition
      k.BRAND,
      -- Brand name
      k.DATA_VENDOR,
      -- Vendor name
      k.KPI_NAME,
      -- KPI name
      k.DATA_SOURCE,
      -- Source system name
      k.TARGET_COLUMN,
      -- Column that KPI is evaluating
      k.ALERT_THRESHOLD,
      -- Alert threshold value
      k.RESULT_DEVIATION_PCT AS RESULT_VALUE,
      -- Rename deviation percent as RESULT_VALUE for frontend reporting
      k.RESULT_STATUS,
      -- KPI pass/fail status
      k.DETAILS:alert_type AS ALERT_TYPE,
      -- Extract alert type from details JSON field
      k.DETAILS:latest_value AS LATEST_VALUE,
      -- Extract latest KPI value from JSON details
      k.DETAILS:latest_month AS LATEST_MONTH,
      -- Extract month label for latest KPI value
      k.DETAILS:latest_week AS LATEST_WEEK,
      -- Extract week label for latest KPI value
      k.DETAILS:previous_value AS PREVIOUS_VALUE,
      -- Extract previous KPI value from JSON details
      k.DETAILS:previous_month AS PREVIOUS_MONTH,
      -- Extract month label for previous KPI value
      k.DETAILS:previous_week AS PREVIOUS_WEEK,
      -- Extract week label for previous KPI value
      k.KPI_UNIQUE_IDENTIFIER,
      -- Unique identifier column name
      k.KPI_UNIQUE_IDENTIFIER_VALUE,
      -- Unique identifier value
      ROW_NUMBER() OVER (
        -- Row number used to rank executions and pick latest record
        PARTITION BY k.CONFIG_ID, k.KPI_UNIQUE_IDENTIFIER, k.KPI_UNIQUE_IDENTIFIER_VALUE
        -- Group records so each unique KPI entity gets its own ranking group
        ORDER BY CAST(k.RUN_ID AS INT) DESC
        -- Sort by k.RUN_ID (latest run first)
      ) AS rnk
      -- rnk=1 means the most recent execution record
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k
    -- Read KPI execution results from the results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results table with the KPI configuration table to link each execution result with its corresponding configuration details using CONFIG_ID
    WHERE c.ENABLED = TRUE -- Only include enabled config rules
      ${rbacScopeClauseForConfigAlias}
      -- RBAC data-scope filter: only include KPI rows allowed by the user's groups
  ) subq
  -- Name the subquery output as "subq" (used in outer query)
  LEFT JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} cfg
    -- Join configuration table to get RUN_FREQUENCY and other config attributes
    ON subq.CONFIG_ID = cfg.CONFIG_ID
    -- Join based on CONFIG_ID which links results → config
  WHERE subq.rnk = 1
  -- Only use the latest record per KPI identifier (latest run)
  AND cfg.ENABLED = TRUE
  -- Only keep details tied to enabled KPI configuration rows
  ${rbacScopeClauseForCfgAlias}
  -- RBAC data-scope filter: keep returned KPI details inside the user's assigned scope
  AND subq.BRAND = '${brand}'
  -- Filter results to only selected brand
  ${vendor !== "All" ? `AND subq.DATA_VENDOR = '${vendor}'` : ""}
  -- If vendor filter is not "All", apply vendor filter; else return all vendors for that brand
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch KPI details for a specific brand filtered by a vendor.
 * The function executes an SQL query to fetch the KPI details and logs the success or failure of the request to Event Hub.
 * It also validates the required query parameters and returns appropriate error messages if missing.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param params - The route parameters, including the brand.
 * @returns A JSON response containing KPI details for the given brand and vendor, or an error message.
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
  // Route parameters contain brand value from URL path (example: /api/kpi/Teva)
  // Track the start time for logging purposes
  const requestStartTime = new Date();
  // Save when request started (like starting a stopwatch)

  const programName = "KPIDashboardAPI"; // Program name for logging
  // Name of this API used in logging for tracking and audit

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID from request headers (fallback to "Anonymous" if not present)
  // Identify who requested the KPI details; required for audit/compliance

  const { brand } = await params; // Extract the brand from the route parameters
  // Example: URL path contains brand name → extracted here

  const { searchParams } = new URL(request.url); // Extract query parameters from the request URL
  // Query parameters are values like ?vendor=IQVIA

  const vendor = searchParams.get("vendor"); // Extract the "vendor" query parameter
  // Vendor filter is usually selected by user from dropdown

  // Validate that the "vendor" query parameter is provided
  if (!vendor) {
    // If vendor parameter is missing, the request is incomplete

    const errorMessage = "Missing required query parameters: vendor";
    // Create a clear message explaining what is missing

    console.error(`[${requestStartTime.toISOString()}] ${errorMessage}`);
    // Log error with timestamp for debugging

    // Return a 400 Bad Request response with an error message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 means frontend sent incorrect request (missing required input)
  }

  try {
    console.info(
      `[${requestStartTime.toISOString()}] Fetching KPI details for Brand: ${brand}, Vendor: ${vendor}`
    );
    // Log which brand+vendor details are being retrieved

    // Establish a Databricks session for executing the SQL query
    const session = await getDatabricksSession();
    // Open secure Databricks connection session (like opening the database connection)

    // Execute the SQL query to fetch KPI details for the given brand and vendor
    const rows = await executeQuery(session, getKpiDetailsQuery(brand, vendor, request));
    // Run KPI details query in Databricks and store output rows

    // Log the success of the query execution
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful retrieval
      detailMessage: `Successfully retrieved KPI details for Brand: '${brand}' and Vendor: '${vendor}'`,
      // Success message with context
      programName,
      // Identify this API in logs
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated
      status: "SUCCESS",
      // Mark status successful
      actionType: "Spark_SQL_Query",
      // Action type indicates SQL query execution
      actionDescription: `Fetch KPI details for Brand: ${brand}, Vendor: ${vendor} from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe what data was fetched and from which tables
      l1Tag: KPI_L1_TAG_NAME,
      // Business unit tag for Splunk/reporting filters
      user,
      // Record which user requested this data
    });

    // Return the KPI details as a JSON response
    return NextResponse.json(rows);
    // Send results back to frontend dashboard so user can view KPI detail table
  } catch (error: unknown) {
    // Catch block runs if SQL query fails or session fails

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Extract readable error message; fallback default if missing

    console.error(
      `[${requestStartTime.toISOString()}] Error retrieving KPI details for Brand: ${brand}, Vendor: ${vendor}. Error: ${errorMessage}`,
      error
    );
    // Print detailed error message + full error object for debugging

    // Log the error to Event Hub
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failed request
      detailMessage: `Failed to retrieve KPI details for Brand: '${brand}', Vendor: '${vendor}'. Error: ${errorMessage}`,
      // Store failure details for investigation
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Start time helps measure time to failure
      status: "FAILED",
      // Mark status failed
      actionType: "Spark_SQL_Query",
      // Identify action failed during SQL query execution
      actionDescription: `Failed to fetch KPI details for Brand: ${brand}, Vendor: ${vendor} from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Explain which report/data fetch failed
      l1Tag: KPI_L1_TAG_NAME,
      // Business unit tag for error filtering in Splunk
      user,
      // Record which user request failed
    });

    // Return a 500 Internal Server Error response with the error message
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means server/system error (not a user input mistake)
  }
});
