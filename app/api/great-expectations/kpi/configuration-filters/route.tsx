/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 28 January 2026
  Purpose of the script: 
    This API route handler is responsible for fetching distinct filter options for the KPI Config Management in the Great Expectations module.
    - It connects to Databricks SQL, executes a query to retrieve unique values for BRAND, DATA_VENDOR, KPI_NAME, RUN_FREQUENCY, KPI_UNIQUE_IDENTIFIER, and KPI_UNIQUE_IDENTIFIER_VALUE from the kpi_quality_config_mng table.
    - The retrieved filter options are returned as a JSON response to the frontend, which uses them to populate dropdown filters on the KPI Config Management.
    - The API also logs both successful retrievals and any errors encountered during the process to Azure Event Hub for monitoring and troubleshooting purposes.
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
  KPI_QUALITY_CONFIG_TABLE, // Table name stored KPI quality configuration details
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
 * SQL query to fetch distinct filter options for the KPI KPI Config Management, including BRAND, DATA_VENDOR,
 * KPI_NAME, DATA_SOURCE, CATALOG_NAME, KPI_FORMAT, RUN_FREQUENCY, KPI_UNIQUE_IDENTIFIER, and KPI_UNIQUE_IDENTIFIER_VALUE.
 * This query will return a list of unique values for each of these filter columns.
 *
 * @returns {string} The SQL query string to be executed against the Databricks SQL endpoint to retrieve filter options.
 *
 * The query uses the `collect_list(DISTINCT column_name)` function to aggregate unique values of each filter column into a list.
 * This allows the frontend to receive all distinct options for each filter in a single query result, which can then be used to
 * populate dropdowns or selection components in the KPI Config Management UI.
 */
const buildKpiConfigFiltersQuery = (request: NextRequest): string => {
  // Construct and return the SQL query string to fetch distinct filter options for the KPI Config Management

  // Build a WHERE clause from the logged-in user's KPI configuration scopes.
  // Example: catalog=dset_dev limits the config filter options to that catalog.
  const rbacScopeWhereClause = buildRbacDataScopeWhereClause(
    request,
    kpiConfigScopeColumns()
  );

  return ` 
    SELECT 
      collect_list(DISTINCT BRAND) AS BRANDS,
      -- Get unique BRAND values (for example: "Teva", "Actavis") to show in filter dropdown
      collect_list(DISTINCT KPI_NAME) AS KPI_NAMES,
      -- Get unique KPI_NAME values (for example: "Sales KPI", "Volume KPI") to show in dropdown
      collect_list(DISTINCT CATALOG_NAME) AS CATALOG_NAMES,
      -- Get unique CATALOG_NAME values (for example: "dset_dev", "dset_prod") to show in dropdown
      collect_list(DISTINCT DATA_SOURCE) AS DATA_SOURCES,
      -- Get unique DATA_SOURCE values (for example: "Valuetrak_852", "ConcertAI") to show in dropdown
      collect_list(DISTINCT DATA_VENDOR) AS DATA_VENDORS,
      -- Get unique DATA_VENDOR values (for example: "IQVIA", "Veeva") to show in dropdown
      collect_list(DISTINCT RUN_FREQUENCY) AS RUN_FREQUENCIES,
      -- Get unique RUN_FREQUENCY values (for example: "Daily", "Weekly") to show in dropdown
      collect_list(DISTINCT KPI_UNIQUE_IDENTIFIER) AS KPI_UNIQUE_IDENTIFIERS,
      -- Get unique KPI_UNIQUE_IDENTIFIER values (for example: "kpi_id", "kpi_code") to show in dropdown
      collect_list(DISTINCT KPI_UNIQUE_IDENTIFIER_VALUE) AS KPI_UNIQUE_IDENTIFIER_VALUES,
      -- Get unique KPI_UNIQUE_IDENTIFIER_VALUE values (for example: "12345", "abcde") to show in dropdown
      collect_list(DISTINCT KPI_FORMAT) AS KPI_FORMATS
      -- Get unique KPI_FORMAT values (for example: "Decimal", "Actual") to show in dropdown
    FROM 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE}
      -- Query the KPI quality configuration table to retrieve distinct filter values for the dashboard
    ${rbacScopeWhereClause}
    -- RBAC data-scope filter: only return configuration options the user's groups allow
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch filter options for the KPI Config Management.
 * - Connects to Databricks SQL, executes the query to retrieve distinct filter values, and returns them as a JSON response.
 * - Implements error handling to catch and log any issues that occur during the process.
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
  const programName = "GreatExpectationsKPIConfigurationFiltersAPI";
  // A name used in logs so we know which API created the log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve user ID from headers
  // Identify who triggered the request; if missing, treat as Anonymous

  try {
    // Try block: normal successful logic runs here; if anything fails it goes to catch block

    // Log the start of the request for traceability
    console.info(
      `[${requestStartTime.toISOString()}] Starting request to retrieve KPI Config Management filters.`,
    );
    // Print a timestamped message for debugging and tracking (helps support teams)

    // Establish a Databricks session to execute the query
    const session = await getDatabricksSession();
    // Open or reuse a secure Databricks database connection session (like logging into the data system)

    // Build the SQL query to fetch distinct filter options for the KPI Config Management
    const query = buildKpiConfigFiltersQuery(request);
    // Generate the SQL query text that will fetch filter values

    // Execute the SQL query to fetch the filter data
    const filterOptions = await executeQuery(session, query);
    // Run the query and store results (like fetching dropdown values from the database)

    // Log the success of the operation
    await logToEventHub({
      // Send a structured success message to Event Hub (which forwards to Splunk/monitoring tools)
      type: "INFO",
      // INFO means this operation succeeded normally
      detailMessage: `Successfully retrieved KPI Config Management filter options.`,
      // A simple message confirming filter data was retrieved
      programName,
      // Identifies which API generated the log
      startDatetime: requestStartTime,
      // Start time used for calculating request duration
      status: "SUCCESS",
      // Mark operation status as success for dashboards/monitoring
      actionType: "Spark_SQL_Query",
      // Indicates this action was a SQL query executed on Databricks
      actionDescription: `Fetch KPI Config Management filters from table: ${KPI_QUALITY_CONFIG_TABLE}`,
      // A business-friendly description of what data was fetched and from where
      l1Tag: KPI_L1_TAG_NAME,
      // Business unit tag used for filtering/organizing logs in Splunk
      user,
      // Store the identity of who requested these filter values
    });

    // Return the filter data as a JSON response
    return NextResponse.json(
      filterOptions && filterOptions.length > 0 ? filterOptions[0] : {},
    );
    // Send the filter options back to the frontend so it can populate dropdown filters
  } catch (error: unknown) {
    // Catch block: runs if Databricks query fails, connection fails, or any other error happens

    // Log the error if an exception occurs
    const errorMessage = `Error retrieving KPI Config Management filter options: ${
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while retrieving KPI Config Management filters."
    }`;
    // Prepare a readable error message for logging and frontend display

    console.error(
      `[${new Date().toISOString()}] Error: ${errorMessage}`,
      error,
    );
    // Print a timestamped error message with full error details (helps debugging)

    // Log the failure event to Event Hub
    await logToEventHub({
      // Send structured failure log event to Event Hub for alerting and monitoring
      type: "ERROR",
      // ERROR indicates failure that needs attention
      detailMessage: errorMessage,
      // Store the failure reason in logs
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used to calculate duration before failure
      status: "FAILED",
      // Mark status as failed for monitoring dashboards
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch KPI Config Management filters from table: ${KPI_QUALITY_CONFIG_TABLE}`,
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
