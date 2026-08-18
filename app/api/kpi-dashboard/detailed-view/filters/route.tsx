/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script is responsible for handling API requests to fetch filter options for the KPI dashboard.
    - The route fetches distinct values for the BRAND, DATA_VENDOR, and KPI_NAME columns from the `kpi_quality_execution_results_mng` table.
    - It is part of the detailed view for the KPI dashboard, which helps in filtering data by brand, vendor, and KPI name.
    - The script connects to Databricks, executes the SQL query, and returns the data as a JSON response.
    - Additionally, the script logs both success and failure events to Event Hub for traceability.
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
  KPI_QUALITY_EXECUTION_RESULTS_TABLE, // Table name for storing KPI quality execution results
  KPI_QUALITY_CONFIG_TABLE, // Table name for storing KPI configuration rows used for scope filtering
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
  buildRbacDataScopeWhereClause,
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY ----------------------------- */

/**
 * SQL query to fetch distinct filter options for the KPI dashboard, including BRAND, DATA_VENDOR, and KPI_NAME.
 * This query will return unique combinations of these columns from the kpi_quality_execution_results_mng table.
 *
 * @returns {string} The SQL query string for fetching the filter options.
 */
const getKpiDashboardFiltersQuery = (request: NextRequest): string => {
  // This helper function creates the SQL query text (like preparing the instructions to fetch dropdown values)

  // Build a WHERE clause from the user's KPI scopes.
  // Example: brand=US limits filter dropdown values to US-brand KPI rows.
  const rbacScopeWhereClause = buildRbacDataScopeWhereClause(
    request,
    kpiConfigScopeColumns("c")
  );

  return ` 
    SELECT 
      DISTINCT k.BRAND, 
      -- Get unique BRAND values (for example: "Teva", "Actavis") to show in filter dropdown
      k.DATA_VENDOR, 
      -- Get unique DATA_VENDOR values (for example: "IQVIA", "Veeva") to show in dropdown
      k.KPI_NAME
      -- Get unique KPI_NAME values (for example: "Sales KPI", "Volume KPI") to show in dropdown
    FROM 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k
      -- Read the data from the KPI execution results table (like reading from the main report table)
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c
      ON c.CONFIG_ID = k.CONFIG_ID
      -- Join configuration rows so catalog/schema/dataset scopes can also control KPI filter options
    ${rbacScopeWhereClause}
    -- RBAC data-scope filter: only expose KPI filter values from rows this user may view
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch filter options for the KPI dashboard.
 * - Executes the SQL query to fetch distinct values of BRAND, DATA_VENDOR, and KPI_NAME.
 * - Logs success or failure to Event Hub.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {NextResponse} A JSON response containing the filter data or an error message if failure occurs.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs when the frontend calls this API endpoint using HTTP GET

  // Record the start time for logging purposes
  const requestStartTime = new Date();
  // Save the time the request started (like starting a stopwatch)

  // Program and user information for logging purposes
  const programName = "KPIDashboardDetailedViewFiltersAPI";
  // A name used in logs so we know which API created the log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve user ID from headers
  // Identify who triggered the request; if missing, treat as Anonymous

  try {
    // Try block: normal successful logic runs here; if anything fails it goes to catch block

    // Log the start of the request for traceability
    console.info(
      `[${requestStartTime.toISOString()}] Starting request to retrieve KPI dashboard filters.`
    );
    // Print a timestamped message for debugging and tracking (helps support teams)

    // Establish a Databricks session to execute the query
    const session = await getDatabricksSession();
    // Open or reuse a secure Databricks database connection session (like logging into the data system)

    // Get the SQL query to retrieve filter options
    const query = getKpiDashboardFiltersQuery(request);
    // Generate the SQL query text that will fetch filter values

    // Execute the SQL query to fetch the filter data
    const filterOptions = await executeQuery(session, query);
    // Run the query and store results (like fetching dropdown values from the database)

    // Log the success of the operation
    await logToEventHub({
      // Send a structured success message to Event Hub (which forwards to Splunk/monitoring tools)
      type: "INFO",
      // INFO means this operation succeeded normally
      detailMessage: `Successfully retrieved KPI dashboard filter options.`,
      // A simple message confirming filter data was retrieved
      programName,
      // Identifies which API generated the log
      startDatetime: requestStartTime,
      // Start time used for calculating request duration
      status: "SUCCESS",
      // Mark operation status as success for dashboards/monitoring
      actionType: "Spark_SQL_Query",
      // Indicates this action was a SQL query executed on Databricks
      actionDescription: `Fetch KPI dashboard filters from table ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}`,
      // A business-friendly description of what data was fetched and from where
      l1Tag: KPI_L1_TAG_NAME,
      // Business unit tag used for filtering/organizing logs in Splunk
      user,
      // Store the identity of who requested these filter values
    });

    // Return the filter data as a JSON response
    return NextResponse.json(filterOptions);
    // Send the filter options back to the frontend so it can populate dropdown filters
  } catch (error: any) {
    // Catch block: runs if Databricks query fails, connection fails, or any other error happens

    // Log the error if an exception occurs
    const errorMessage =
      error?.message ??
      "An unexpected error occurred while retrieving KPI filters.";
    // Prepare a readable error message for logging and frontend display

    console.error(`[${new Date().toISOString()}] Error: ${errorMessage}`, error);
    // Print a timestamped error message with full error details (helps debugging)

    // Log the failure event to Event Hub
    await logToEventHub({
      // Send structured failure log event to Event Hub for alerting and monitoring
      type: "ERROR",
      // ERROR indicates failure that needs attention
      detailMessage: `Error retrieving KPI dashboard filter options: ${errorMessage}`,
      // Store the failure reason in logs
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used to calculate duration before failure
      status: "FAILED",
      // Mark status as failed for monitoring dashboards
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch KPI dashboard filters from table ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what action failed and which table it involved
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag to help routing/analysis in monitoring tools
      user,
      // Track which user’s request triggered the failure
    });

    // Return an error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means server-side failure (problem in system, not user input)
  }
});
