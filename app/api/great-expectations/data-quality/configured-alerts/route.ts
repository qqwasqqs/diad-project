/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025 
  Purpose of the script:
    This script provides an API route to retrieve distinct alert configurations from the data integrity alerts configuration table.
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
  DATA_INTEGRITY_ALERTS_CONFIG_TABLE, // Table name for data integrity alerts configurations
} from "@/constants/config";
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Generates the SQL query to retrieve distinct alert configurations from the data integrity alerts configuration table.
 *
 * This function constructs a SQL query to fetch unique alert configuration details from the `data_integrity_alerts_config_table`.
 * The query selects distinct `RECEIVER_ALERT_ID` and `DISTRIBUTION_LIST` columns to identify alert configurations.
 *
 * @returns {string} A SQL query string to fetch distinct alert configurations from the table.
 */
const generateAlertsConfigQuery = (): string => {
  // This function prepares the exact "question" we want to ask the database.
  // Like filling out a form requesting a list of all alert configurations.

  return ` 
    SELECT DISTINCT
      RECEIVER_ALERT_ID,     
      -- This column identifies the alert type or alert rule (like a unique alarm ID)
      DISTRIBUTION_LIST      
      -- This column contains the list of people or groups who should receive that alert
    FROM 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_ALERTS_CONFIG_TABLE} 
      -- This tells the database exactly where to find the alert configuration records
  `;
  // The function returns this SQL text so it can be sent to Databricks later.
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve distinct alert configurations.
 *
 * This API endpoint queries the `data_integrity_alerts_config_table` to retrieve distinct alert configuration records,
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
  // This function runs automatically when someone calls this API using a web browser or frontend app.
  // It's like a service desk that responds when someone requests alert configuration data.

  const requestStartTime = new Date();
  // Capture the current date and time right when the request begins.
  // Like pressing "start" on a stopwatch to measure how long the task takes.

  const programName = "GreatExpectationsDataQualityConfiguredAlertsAPI";
  // Store the name of this API so logs clearly show which system performed the action.

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Try to read the user ID from the request headers (like reading the sender’s name on a letter).
  // If no name is provided, we label them as "Anonymous".

  console.info(
    `Fetching distinct alerts configuration initiated by user ${user}`,
  );
  // Write a message to the server log saying who started the request.
  // This helps technical teams track activity later.

  try {
    // Begin the main work inside a "try" block.
    // If anything fails, the system jumps to the "catch" block below.

    const session = await getDatabricksSession();
    // Open a secure session (connection) to Databricks.
    // Similar to logging into a secure company database with credentials.

    const query = generateAlertsConfigQuery();
    // Build the SQL query text that asks for the distinct alert configurations.
    // Like preparing the exact report request before submitting it.

    const alertsConfiguration = await executeQuery(session, query);
    // Send the SQL query to Databricks and wait for the results.
    // Similar to asking the database, "Please give me this report," and waiting for the response.

    await logToEventHub({
      type: "INFO",
      // Mark this as a normal informational log (not an error).
      detailMessage: `Successfully retrieved distinct alerts configuration.`,
      // A human-readable success message explaining what happened.
      programName,
      // Include the API name so logs show which system created this record.
      startDatetime: requestStartTime,
      // Include when the request started, so monitoring systems can calculate duration.
      status: "SUCCESS",
      // Mark the operation as successful.
      actionType: "Spark_SQL_Query",
      // Describe the technical type of action performed (a SQL query in Databricks/Spark).
      actionDescription: `Fetch Distinct Alerts Configuration from table: ${DATA_INTEGRITY_ALERTS_CONFIG_TABLE}`,
      // Describe the business operation performed for audit context
      user,
      // Record which user triggered the action for auditing and traceability.
    });
    // Send this success record to Event Hub for monitoring and compliance tracking.

    return NextResponse.json(alertsConfiguration);
    // Send the retrieved data back to the caller in JSON format.
    // This is like emailing back the requested report in a structured format the frontend understands.
  } catch (error: unknown) {
    // If any error occurs above (connection issue, query failure, etc.), execution jumps here.

    const errorMessage = `Error retrieving alerts configuration: ${
      error instanceof Error
        ? error.message
        : "Unknown error occurred while retrieving alerts configuration."
    }`;
    // Create a readable error message. If the system provided a specific error, use it.
    // Otherwise, use a default message.

    console.error(errorMessage, error instanceof Error ? error.stack : error);
    // Print the error details and technical stack trace in server logs.
    // This helps developers diagnose the root cause.

    await logToEventHub({
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR",
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage,
      // Detailed error message stored in logs
      programName,
      // Identify which API encountered the problem.

      startDatetime: requestStartTime,
      // Include start time so we know how long it ran before failing
      status: "FAILED",
      // Mark operation status as failed
      actionType: "Spark_SQL_Query",
      // Indicate the failure happened during a SQL query.

      actionDescription: `Failed to Fetch Distinct Alerts Configuration from table: ${DATA_INTEGRITY_ALERTS_CONFIG_TABLE}`,
      // Describe what the system was trying to do when it failed.

      user,
      // Record which user triggered the failing request.
    });
    // Send the failure log to Event Hub so monitoring systems can raise alerts if needed.

    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Send an HTTP 500 response back to the caller.
    // This tells the frontend: "The server had a problem, not your request."
  }
});
