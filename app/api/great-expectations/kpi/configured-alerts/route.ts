/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025 
  Purpose of the script:
    This script provides an API route to retrieve distinct alert configurations from the KPI integrity alerts configuration table.
    - The API allows querying for unique alert configurations, specifically retrieving distinct `RECEIVER_ALERT_ID` and `DISTRIBUTION_LIST` from the configuration table.
    - Logs are sent to Event Hub for both success and failure cases to ensure traceability and monitoring of system performance.
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
  KPI_INTEGRITY_ALERTS_CONFIG_TABLE, // The table name in Databricks that holds the KPI integrity alerts configuration data
  KPI_L1_TAG_NAME, // L1 business tag used for KPI Splunk logging, monitoring, and reporting
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Generates the SQL query to retrieve distinct alert configurations from the KPI integrity alerts configuration table.
 *
 * This function constructs a SQL query to fetch unique alert configuration details from the `data_integrity_alerts_config_table`.
 * The query selects distinct `RECEIVER_ALERT_ID` and `DISTRIBUTION_LIST` columns to identify alert configurations.
 *
 * @returns {string} A SQL query string to fetch distinct alert configurations from the table.
 */
const generateAlertsConfigQuery = (): string => {
  // This helper function creates the SQL query text (like preparing a "report request" for the database)
  return ` 
    -- Generate SQL query to fetch distinct alert configurations from the KPI integrity alerts configuration table
    SELECT DISTINCT
      RECEIVER_ALERT_ID,     
      -- Unique identifier for the alert configuration (e.g., alert type or ID)
      DISTRIBUTION_LIST      
      -- List of recipients (could be an email distribution list or group) for the alert
    FROM 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_INTEGRITY_ALERTS_CONFIG_TABLE} 
      -- The KPI integrity alerts configuration table
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve distinct alert configurations.
 *
 * This API endpoint queries the KPI integrity alerts configuration table to retrieve distinct alert configuration records,
 * specifically the `RECEIVER_ALERT_ID` and `DISTRIBUTION_LIST`. The results are returned as a JSON response.
 *
 * It also logs both success and failure events to ensure traceability and monitoring of system behavior.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {Promise<NextResponse>} The API response containing the result or an error message if something goes wrong.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function executes when the frontend/browser calls this API using HTTP GET

  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date();
  // Save the exact start time (like starting a stopwatch to measure performance)

  const programName = "GreatExpectationsKPIConfiguredAlertsAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(
    `Fetching distinct alerts configuration initiated by user ${user}`,
  );
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Fetch the Databricks session to execute the SQL query.
    const session = await getDatabricksSession();
    // Create or reuse a secure session connection to Databricks (like opening a secure database session)

    // Generate the SQL query to retrieve distinct alerts configuration.
    const query = generateAlertsConfigQuery();
    // Build the SQL query text (database instructions)

    // Execute the query and fetch the result.
    const alertsConfiguration = await executeQuery(session, query);
    // Run the SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully retrieved distinct KPI integrity alerts configuration.`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_SQL_Query",
      // Categorize the action: SQL query execution
      actionDescription: `Fetch Distinct KPI Integrity Alerts Configuration from table: ${KPI_INTEGRITY_ALERTS_CONFIG_TABLE}`,
      // Describe the business operation performed for audit context
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for monitoring/alert routing
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the alerts configuration as a JSON response.
    return NextResponse.json(alertsConfiguration);
    // Send the results back to the frontend as JSON so UI can show dropdown of alerts configuration
  } catch (error: unknown) {
    // Catch block: runs if Databricks connection or query execution fails

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error retrieving KPI integrity alerts configuration: ${
      error instanceof Error
        ? error.message
        : "Unknown error occurred while retrieving KPI integrity alerts configuration."
    }`;
    // Extract error message; if unavailable, use fallback

    console.error(errorMessage, error instanceof Error ? error.stack : error);
    // Print error with stack trace so developers can identify where it failed

    await logToEventHub({
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR",
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage,
      // Detailed error message stored in logs
      programName,
      // Identify the API/service that failed
      startDatetime: requestStartTime,
      // Include start time so we know how long it ran before failing
      status: "FAILED",
      // Mark operation status as failed
      actionType: "Spark_SQL_Query",
      // Indicate it failed during SQL query execution
      actionDescription: `Failed to Fetch Distinct KPI Integrity Alerts Configuration from table: ${KPI_INTEGRITY_ALERTS_CONFIG_TABLE}`,
      // Describe what it tried to do for better investigation
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for monitoring/alert routing
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
