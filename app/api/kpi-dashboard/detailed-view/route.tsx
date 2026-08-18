/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script provides an API route to fetch detailed KPI dashboard data from the Databricks system.
    - It retrieves KPI-related details like the dataset name, brand, vendor, KPI name, target column, result value, etc.
    - The script allows users to filter results based on brand, KPI, and vendor.
    - It connects to Databricks, executes an SQL query, logs both success and failure to Event Hub, and returns the result.
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
import { NextRequest, NextResponse } from "next/server"; // Next.js types/utilities for server route handlin

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

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * SQL query to retrieve detailed KPI dashboard data for a specific brand, KPI, and vendor.
 * Filters data based on brand, KPI, and vendor, and only includes failed results.
 *
 * @param brand - The brand to filter the data by (e.g., "BrandA")
 * @param kpi - The KPI to filter the data by (e.g., "Sales")
 * @param vendor - The vendor to filter the data by (e.g., "VendorX")
 * @returns {string} The SQL query string to fetch the KPI data.
 */
const buildKpiDashboardQuery = (
  // Helper function that generates SQL query text dynamically using input filters
  brand: string, // Input filter: brand name (example: "Teva")
  kpi: string, // Input filter: KPI name (example: "Sales")
  vendor: string, // Input filter: vendor name (example: "IQVIA")
  request: NextRequest // Current request carrying RBAC scope headers from the authorization wrapper
): string => {
  // Start of SQL query string (instructions sent to Databricks)

  // Build the RBAC row filter from the user's KPI scopes using the config-table alias.
  // Example: brand=US or dataset=sales_fact is translated into extra SQL conditions on cfg.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("cfg")
  );

  return `
    -- Start of the main query to retrieve KPI results and related information
    SELECT
      subq.CATALOG_NAME,  -- Selects the catalog name of the dataset
      subq.SCHEMA_NAME,   -- Selects the schema name within the catalog
      subq.DATASET_NAME,  -- Selects the dataset name
      subq.BRAND,         -- Selects the brand name (e.g., "Teva")
      subq.DATA_VENDOR,   -- Selects the name of the data vendor (e.g., "IQVIA")
      subq.DATA_SOURCE,   -- Selects the source of the data (e.g., "Internal")
      subq.KPI_NAME,      -- Selects the KPI name (e.g., "Sales")
      subq.TARGET_COLUMN, -- Selects the target column associated with the KPI (e.g., "Revenue")
      subq.RESULT_VALUE,  -- Selects the actual result value for the KPI
      subq.RESULT_STATUS, -- Selects the status of the KPI result (e.g., "FAILED", "SUCCESS")
      subq.KPI_UNIQUE_IDENTIFIER, -- Selects the unique identifier for the KPI
      subq.KPI_UNIQUE_IDENTIFIER_VALUE, -- Selects the value corresponding to the unique identifier
      cfg.RUN_FREQUENCY, -- Selects the frequency at which the KPI is expected to run from the configuration table
      subq.ALERT_THRESHOLD, -- Selects the threshold value for when an alert should be triggered for the KPI
      REGEXP_REPLACE(subq.DETAILS, '_', ' ') AS KPI_DETAILS -- Replaces underscores with spaces in the KPI details for better readability
    FROM (
      -- Subquery to gather distinct records for each KPI execution
      SELECT DISTINCT
        CONFIG_ID,  -- Selects the configuration ID for the KPI execution
        CATALOG_NAME,  -- Selects the catalog name
        SCHEMA_NAME,  -- Selects the schema name
        DATASET_NAME,  -- Selects the dataset name
        BRAND,  -- Selects the brand name
        DATA_VENDOR,  -- Selects the data vendor name
        DATA_SOURCE,  -- Selects the data source
        KPI_NAME,  -- Selects the KPI name
        CREATED_AT,  -- Selects the timestamp when the KPI result was created
        TARGET_COLUMN,  -- Selects the target column associated with the KPI
        ALERT_THRESHOLD,  -- Selects the alert threshold for the KPI
        RESULT_DEVIATION_PCT AS RESULT_VALUE,  -- Selects the percentage deviation of the result as the KPI value
        RESULT_STATUS,  -- Selects the result status (e.g., "FAILED" or "SUCCESS")
        KPI_UNIQUE_IDENTIFIER,  -- Selects the unique identifier for the KPI record
        KPI_UNIQUE_IDENTIFIER_VALUE,  -- Selects the value corresponding to the unique identifier
        DETAILS:brief_description AS DETAILS,  -- Selects the brief description from the details object (the KPI description)
        DETAILS:alert_type AS ALERT_TYPE,  -- Selects the type of alert from the details object (e.g., "Critical", "Warning")
        ROW_NUMBER() OVER (  -- Creates a row number to rank each KPI record for deduplication
          PARTITION BY CONFIG_ID, KPI_UNIQUE_IDENTIFIER, KPI_UNIQUE_IDENTIFIER_VALUE  -- Groups by the configuration, KPI, and identifier
          ORDER BY CAST(RUN_ID AS INT) DESC  -- Orders the results by run ID, ensuring the latest record gets the highest rank
        ) AS rnk  -- Assigns a row number to each record (the most recent gets rank 1)
      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE}  -- From the table containing execution results for KPIs
    ) subq  -- Aliases the result of the subquery as "subq"
    LEFT JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} cfg  -- Joins the subquery result with the KPI configuration table to get additional details
    ON subq.CONFIG_ID = cfg.CONFIG_ID  -- Joins on the CONFIG_ID to align the execution data with its configuration
    WHERE subq.RESULT_STATUS = 'FAILED'  -- Filters to only include records where the result status is 'FAILED' (i.e., an issue occurred)
      AND subq.rnk = 1  -- Filters to only include the latest (most recent) result for each unique KPI (based on the row number)
      -- Conditionally Filters to only include results for the specified brand (e.g., "Teva")
      ${brand !== "All" ? `AND subq.BRAND = '${brand}'` : ""}
      -- Conditionally Filters to only include results for the specified KPI name (e.g., "Sales")
      ${kpi !== "All" ? `AND subq.BRAND = '${kpi}'` : ""}
      -- Conditionally Filters to only include results for the specified data vendor (e.g., "IQVIA") 
      ${vendor !== "All" ? `AND subq.BRAND = '${vendor}'` : ""}
      ${rbacScopeClause}
      -- RBAC data-scope filter: prevents a user from seeing KPI rows outside their assigned group scope
      -- End of the main query
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for retrieving detailed KPI dashboard data.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {NextResponse} A JSON response containing the KPI dashboard data or an error message if failure occurs.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function is automatically executed when frontend calls the API via HTTP GET

  // Record the start time for logging purposes
  const requestStartTime = new Date();
  // Save current time so duration can be calculated (like starting a stopwatch)

  // Program and user information for logging purposes
  const programName = "KPIDashboardDetailedViewAPI"; // Name of the program performing the action
  // Label used in logs so we know which API created this log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve the user ID from the headers (defaults to 'Anonymous')
  // Identify user for audit/compliance; fallback to Anonymous if user header missing

  // Extract query parameters from the URL
  const { searchParams } = new URL(request.url);
  // Parse the request URL to read query values (example: ?brand=X&kpi=Y&vendor=Z)

  const brand = searchParams.get("brand");
  // Get brand filter from URL query string

  const kpi = searchParams.get("kpi");
  // Get KPI filter from URL query string

  const vendor = searchParams.get("vendor");
  // Get vendor filter from URL query string

  // Validate the required parameters
  if (!brand || !kpi || !vendor) {
    // If any required filter is missing, the API cannot generate correct report

    return NextResponse.json(
      { error: "Missing required query parameters: brand, kpi, vendor" },
      // Return clear error message so frontend can show proper message to user

      { status: 400 }
      // HTTP 400 means "Bad Request" (client did not send required inputs)
    );
  }

  try {
    // Try block: normal successful flow runs here; if error occurs it goes to catch

    // Log the start of the request for traceability
    console.info(
      `[${requestStartTime.toISOString()}] Request started for retrieving KPI dashboard data.`
    );
    // Log timestamped message to track when request was initiated

    // Establish a Databricks session to execute the query
    const session = await getDatabricksSession();
    // Create/reuse Databricks connection session (like logging into database)

    // Build the SQL query to fetch the KPI dashboard data
    const kpiDashboardQuery = buildKpiDashboardQuery(brand, kpi, vendor, request);
    // Generate SQL query text using brand/kpi/vendor filters

    // Execute the SQL query
    const rows = await executeQuery(session, kpiDashboardQuery);
    // Run the query in Databricks and collect result rows (like receiving report output)

    // Log the successful execution to Event Hub
    await logToEventHub({
      // Send a structured success event to Azure Event Hub (for Splunk / monitoring dashboards)
      type: "INFO",
      // Mark event type as INFO (successful operation)
      detailMessage: `Successfully retrieved KPI dashboard detailed view data for Brand: ${brand}, KPI: ${kpi}, Vendor: ${vendor}`,
      // Store success message with filters used (helps support and debugging)
      programName,
      // API name for traceability
      startDatetime: requestStartTime,
      // Request start time used to compute total time taken
      status: "SUCCESS",
      // Mark status as success
      actionType: "Spark_SQL_Query",
      // Categorize action as database query operation
      actionDescription: `Fetch KPI dashboard data based on brand, kpi, and vendor filters from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe business activity and which tables were queried
      l1Tag: KPI_L1_TAG_NAME,
      // L1 business tag used for filtering reports in Splunk/monitoring
      user,
      // User who triggered the API
    });

    // Return the fetched data as a JSON response
    return NextResponse.json(rows);
    // Send query results back to frontend dashboard so user can view failed KPI details
  } catch (error: any) {
    // Catch block: runs if any error occurs (connection issues, invalid SQL, server errors)

    // Log the error if something goes wrong
    const errorMessage =
      error?.message ??
      "An unexpected error occurred while retrieving the KPI data.";
    // Extract error message for display/logging; fallback if unknown error

    console.error(`[${new Date().toISOString()}] Error: ${errorMessage}`, error);
    // Print error details including timestamp and full error object

    await logToEventHub({
      // Send structured failure log to Event Hub for alerting and monitoring
      type: "ERROR",
      // Mark log type as ERROR
      detailMessage: `Error retrieving KPI dashboard data: ${errorMessage}`,
      // Store error details message
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used to calculate how long request ran before failing
      status: "FAILED",
      // Mark status as failed
      actionType: "Spark_SQL_Query",
      // Indicates failure happened during SQL query execution
      actionDescription: `Failed to fetch KPI dashboard data based on brand, kpi, and vendor filters from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Explain what operation failed and which tables were involved
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for monitoring/alert routing
      user,
      // Track which user triggered the failure
    });

    // Return an error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 indicates server-side failure (system issue)
  }
});
