/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script provides an API route for retrieving the distinct email addresses of users who have performed update operations
    on the data quality configuration within the Teva Data Integrity platform. It fetches these emails from the system's audit logs.
    - The script connects to Databricks, executes a SQL query to fetch emails, logs the execution status, and returns the results in JSON format.
*/

/* ----------------------------- IMPORTS -------------------------------- */

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
  DATA_QUALITY_CONFIG_AUDIT_TABLE, // Table name for storing data quality configuration aduit logs
} from "@/constants/config";
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY ----------------------------- */ // Section header: SQL query building logic starts here

/**
 * SQL query to retrieve distinct email addresses of users who have performed update operations on the data quality configuration.
 *
 * @returns {string} A SQL query string that fetches the email addresses of users from the data quality audit table.
 */
const getDistinctUpdateEmailsQuery = (): string => {
  // Function that prepares and returns the SQL query as a plain text string
  // This query returns a list of unique users (emails) who updated the configuration

  return `
    -- Select distinct email addresses (UPDATED_BY) from the data quality audit table
    SELECT DISTINCT
      UPDATED_BY AS EMAIL  -- The 'UPDATED_BY' field represents the email of the person who made the update
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_AUDIT_TABLE}  -- From the data quality audit table in the specified catalog and schema
    ORDER BY EMAIL;  -- Order the results by email in ascending order (alphabetically)
    -- This query fetches unique email addresses that have made updates to the data quality configuration, sorted alphabetically.
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve distinct email addresses of users who have performed update operations.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {NextResponse} A JSON response containing the list of distinct emails or an error message if an exception occurs.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // Defines an API endpoint that runs when user calls this route via HTTP GET
  // Record the start time of the request for logging purposes
  const requestStartTime = new Date(); // Save the request start time (like starting a stopwatch to measure performance)

  // Program and user information for logging purposes
  const programName = "GovernanceConfigurationUpdateEmailsAPI"; // Name of this API (helps identify it in logs and monitoring tools)
  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Read user ID from request header; if missing, treat the user as Anonymous

  try {
    // Try block: run normal flow; if anything fails, control goes to catch block
    // Log the start of the request for traceability
    console.info(
      `[${requestStartTime.toISOString()}] Request started for retrieving update emails.`
    );
    // Print a timestamped log message so support teams can track when this API call happened

    // Establish a Databricks session to run the SQL query
    const session = await getDatabricksSession();
    // Create or reuse a connection to Databricks (like opening a secure tunnel to the database)

    // Build the SQL query for fetching distinct emails
    const query = getDistinctUpdateEmailsQuery();
    // Generate the actual SQL query string using the helper function above

    // Execute the SQL query to retrieve distinct emails
    const emailRows = await executeQuery(session, query);
    // Run the SQL query on Databricks and store the rows returned (like retrieving a report from the database)

    // Log the successful execution to Event Hub
    await logToEventHub({
      // Send a structured success log message to Event Hub (which can later go to Splunk for monitoring)
      type: "INFO", // INFO log type indicates a normal successful operation
      detailMessage: `Successfully retrieved distinct update emails.`, // Human-friendly success message
      programName, // Include which API created this log record
      startDatetime: requestStartTime, // Include start time so duration can be calculated
      status: "SUCCESS", // Mark request as successful for audit purposes
      actionType: "Spark_SQL_Query", // Indicates this action involved executing a SQL query
      actionDescription: `Fetch distinct update emails from table: ${DATA_QUALITY_CONFIG_AUDIT_TABLE}`,
      // Describes what query was executed and which table it referenced
      user, // Include the user identity for audit trails ("who triggered this")
    }); // End Event Hub logging call

    // Return the result rows as a JSON response
    return NextResponse.json(emailRows);
    // Send the list of emails back to frontend as JSON (like returning a list of names to display on the UI)
  } catch (error: any) {
    // Catch block: runs when any error happens in try block
    // Log the error to Event Hub
    const errorMessage = `Error retrieving distinct update emails: ${
      error?.message ?? "Unknown error occurred while retrieving update emails."
    }`;
    // Extract readable error message; if missing, provide a default explanation

    console.error(`[${new Date().toISOString()}] Error: ${errorMessage}`, error);
    // Print error with timestamp and full error object (includes stack trace helpful for debugging)

    await logToEventHub({
      // Send a structured error log to Event Hub for monitoring and troubleshooting
      type: "ERROR", // ERROR indicates request failed and needs attention
      detailMessage: errorMessage,
      // Store detailed reason why this operation failed
      programName, // Identify which API caused the error log
      startDatetime: requestStartTime, // Include start time to measure how long it ran before failing
      status: "FAILED", // Mark status as failed for dashboards/alerts
      actionType: "Spark_SQL_Query", // Still classified as SQL query since failure occurred during DB operation
      actionDescription: `Failed to fetch distinct update emails from table: ${DATA_QUALITY_CONFIG_AUDIT_TABLE}`,
      // Explain which business action failed for audit purposes
      user, // Identify which user experienced/triggered the failure
    }); // End Event Hub error logging call

    // Return a 500 error response with the error message
    return NextResponse.json(
      // Send response back to frontend even though operation failed
      { error: errorMessage }, // JSON body containing error message for frontend display
      { status: 500 } // HTTP 500 means server-side error (like "system failed", not user mistake)
    ); // End error response
  } // End catch block
}); // End GET API route handler
