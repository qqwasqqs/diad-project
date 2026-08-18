/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 28 January 2026 
  Purpose of the script: 
    This API route handler is responsible for fetching KPI Configurations data from the Databricks system.
    - It retrieves KPI config related details like the dataset name, brand, vendor, KPI name, target column, KPI unique identifier, KPI unique identifier value, etc.
    - The script allows users to filter results based on brand, KPI, vendor, run frequency, KPI unique identifier and KPI unique identifier value.
    - It connects to Databricks SQL, executes an SQL query, logs both success and failure to Event Hub, and returns the result.
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
  buildRbacDataScopeAndClause,
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * SQL query to retrieve KPI Config management data for a specific brand, KPI, vendor, run frequency, KPI unique identifier and KPI unique identifier value.
 * Filters data based on brand, KPI, vendor, run frequency, KPI unique identifier and KPI unique identifier value.
 *
 * @param brand - The brand to filter the data by (e.g., "BrandA")
 * @param kpi - The KPI to filter the data by (e.g., "Sales")
 * @param vendor - The vendor to filter the data by (e.g., "VendorX")
 * @param frequency - The run frequency to filter the data by (e.g., "Daily")
 * @param kpiUniqueIdentifier - The KPI unique identifier to filter the data by (e.g., "Region")
 * @param kpiUniqueIdentifierValue - The value of the KPI unique identifier to filter the data by (e.g., "North America")
 * @returns {string} The SQL query string to be executed against the Databricks SQL endpoint.
 */
const buildKpiDashboardQuery = (
  // Helper function that generates SQL query text dynamically using input filters
  brand: string, // Input filter: brand name (example: "Teva")
  kpi: string, // Input filter: KPI name (example: "Sales")
  vendor: string, // Input filter: vendor name (example: "IQVIA")
  frequency: string, // Input filter: run frequency (example: "Daily")
  kpiUniqueIdentifier: string, // Input filter: KPI unique identifier (example: "Region")
  kpiUniqueIdentifierValue: string, // Input filter: value of the KPI unique identifier (example: "North America")
  request: NextRequest, // Current request carrying RBAC scope headers from authorization
): string => {
  // Start of SQL query string (instructions sent to Databricks)
  // The query retrieves all columns from the KPI quality configuration table, applying filters based on the provided parameters.

  // Build the RBAC row filter from the user's KPI configuration scopes.
  // Example: brand=Teva only returns Teva KPI configuration rows.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns()
  );

  return `
    -- Start of the main query to retrieve KPI results and related information
    SELECT *
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE}
    -- Query retrieves all columns from the KPI quality config table (example: teva_catalog.kpi_schema.kpi_quality_config)
    WHERE 
      1 = 1
      -- Base condition that is always true; allows clean appending of AND conditions below
      ${rbacScopeClause}
      -- RBAC data-scope filter: only return KPI configurations inside the user's assigned scope
      ${brand !== "All" ? `AND BRAND = '${brand}'` : ""}
      -- Filter by brand if provided (example: AND BRAND = 'Teva' when brand = "Teva"; no filter when brand = "All")
      ${kpi !== "All" ? `AND KPI_NAME = '${kpi}'` : ""}
      -- Filter by KPI name if provided (example: AND KPI_NAME = 'Sales' when kpi = "Sales"; skipped when kpi = "All")
      ${vendor !== "All" ? `AND DATA_VENDOR = '${vendor}'` : ""}
      -- Filter by data vendor if provided (example: AND DATA_VENDOR = 'IQVIA' when vendor = "IQVIA"; no filter when vendor = "All")
      ${frequency !== "All" ? `AND RUN_FREQUENCY = '${frequency}'` : ""}
      -- Filter by run frequency if provided (example: AND RUN_FREQUENCY = 'Daily' when frequency = "Daily"; skipped when frequency = "All")
      ${kpiUniqueIdentifier !== "All" ? `AND KPI_UNIQUE_IDENTIFIER = '${kpiUniqueIdentifier}'` : ""}
      -- Filter by KPI unique identifier if provided (example: AND KPI_UNIQUE_IDENTIFIER = 'Region' when kpiUniqueIdentifier = "Region"; no filter when "All")
      ${kpiUniqueIdentifierValue !== "All" ? `AND KPI_UNIQUE_IDENTIFIER_VALUE = '${kpiUniqueIdentifierValue}'` : ""}
      -- Filter by KPI unique identifier value if provided (example: AND KPI_UNIQUE_IDENTIFIER_VALUE = 'North America' when value = "North America"; skipped when "All")
      -- End of the main query
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for retrieving KPI quality configuration data.
 * This function is triggered when the frontend dashboard calls this API endpoint to fetch KPI configuration details
 * based on the specified filters (brand, KPI, vendor, frequency, KPI unique identifier and its value).
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters, headers and filters.
 * @returns {NextResponse} A JSON response containing the KPI quality configuration data or an error message if failure occurs.
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
  const programName = "GreatExpectationsKPIConfigurationsAPI"; // Name of the program performing the action
  // Label used in logs so we know which API created this log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve the user ID from the headers (defaults to 'Anonymous')
  // Identify user for audit/compliance; fallback to Anonymous if user header missing

  // Extract query parameters from the URL
  const { searchParams } = new URL(request.url);
  // Parse the request URL to read query values (example: ?brand=Teva&kpi=Sales&vendor=IQVIA&frequency=Daily&kpiUniqueIdentifier=Region&kpiUniqueIdentifierValue=North%20America)

  const brand = searchParams.get("brand");
  // Get brand filter from URL query string

  const kpi = searchParams.get("kpi");
  // Get KPI filter from URL query string

  const vendor = searchParams.get("vendor");
  // Get vendor filter from URL query string

  const frequency = searchParams.get("frequency");
  // Get frequency filter from URL query string

  const kpiUniqueIdentifier = searchParams.get("kpiUniqueIdentifier");
  // Get kpiUniqueIdentifier filter from URL query string

  const kpiUniqueIdentifierValue = searchParams.get("kpiUniqueIdentifierValue");
  // Get kpiUniqueIdentifierValue filter from URL query string

  // Validate the required parameters
  if (
    !brand ||
    !kpi ||
    !vendor ||
    !frequency ||
    !kpiUniqueIdentifier ||
    !kpiUniqueIdentifierValue
  ) {
    // If any required filter is missing, the API cannot generate correct report

    return NextResponse.json(
      {
        error:
          "Missing required query parameters: brand, kpi, vendor, frequency, kpiUniqueIdentifier, kpiUniqueIdentifierValue",
      },
      // Return clear error message so frontend can show proper message to user

      { status: 400 },
      // HTTP 400 means "Bad Request" (client did not send required inputs)
    );
  }

  try {
    // Try block: normal successful flow runs here; if error occurs it goes to catch

    // Log the start of the request for traceability
    console.info(
      `[${requestStartTime.toISOString()}] Request started for retrieving KPI Config Management data.`,
    );
    // Log timestamped message to track when request was initiated

    // Establish a Databricks session to execute the query
    const session = await getDatabricksSession();
    // Create/reuse Databricks connection session (like logging into database)

    // Build the SQL query to fetch the KPI Config Management data
    const kpiDashboardQuery = buildKpiDashboardQuery(
      brand,
      kpi,
      vendor,
      frequency,
      kpiUniqueIdentifier,
      kpiUniqueIdentifierValue,
      request,
    );
    // Generate SQL query text using the input filters (brand, kpi, vendor, frequency, kpiUniqueIdentifier, kpiUniqueIdentifierValue)

    // Execute the query and get results from Databricks
    const rows = await executeQuery(session, kpiDashboardQuery);
    // Run the query in Databricks and collect result rows (like receiving report output)

    // Log the successful execution to Event Hub
    await logToEventHub({
      // Send a structured success event to Azure Event Hub (for Splunk / monitoring dashboards)
      type: "INFO",
      // Mark event type as INFO (successful operation)
      detailMessage: `Successfully retrieved KPI Config Management data for Brand: ${brand}, KPI: ${kpi}, Vendor: ${vendor}, Frequency: ${frequency}, KPI Unique Identifier: ${kpiUniqueIdentifier}, KPI Unique Identifier Value: ${kpiUniqueIdentifierValue}.`,
      // Store success message with filters used (helps support and debugging)
      programName,
      // API name for traceability
      startDatetime: requestStartTime,
      // Request start time used to compute total time taken
      status: "SUCCESS",
      // Mark status as success
      actionType: "Spark_SQL_Query",
      // Categorize action as database query operation
      actionDescription: `Fetch KPI Config Management data based on brand, kpi, frequency, kpiUniqueIdentifier and kpiUniqueIdentifierValue filters from table: ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe business activity and which tables were queried
      l1Tag: KPI_L1_TAG_NAME,
      // L1 business tag used for filtering reports in Splunk/monitoring
      user,
      // User who triggered the API
    });

    // Return the fetched data as a JSON response
    return NextResponse.json(rows);
    // Send query results back to frontend dashboard so user can view failed KPI details
  } catch (error: unknown) {
    // Catch block: runs if any error occurs (connection issues, invalid SQL, server errors)

    // Log the error if something goes wrong
    const errorMessage = `Error retrieving KPI Config Management data for Brand: ${brand}, KPI: ${kpi}, Vendor: ${vendor}, Frequency: ${frequency}, KPI Unique Identifier: ${kpiUniqueIdentifier}, KPI Unique Identifier Value: ${kpiUniqueIdentifierValue}: ${
      error instanceof Error ? error.message : "Unknown error occurred"
    }`;
    // Extract error message for display/logging; fallback if unknown error

    console.error(
      `[${new Date().toISOString()}] Error: ${errorMessage}`,
      error,
    );
    // Print error details including timestamp and full error object

    await logToEventHub({
      // Send structured failure log to Event Hub for alerting and monitoring
      type: "ERROR",
      // Mark log type as ERROR
      detailMessage: errorMessage,
      // Store error details message
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Used to calculate how long request ran before failing
      status: "FAILED",
      // Mark status as failed
      actionType: "Spark_SQL_Query",
      // Indicates failure happened during SQL query execution
      actionDescription: `Failed to fetch KPI Config Management data based on brand, kpi, frequency, kpiUniqueIdentifier and kpiUniqueIdentifierValue filters from table: ${KPI_QUALITY_CONFIG_TABLE}`,
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
