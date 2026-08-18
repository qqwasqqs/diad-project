/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script provides an API route to retrieve distinct login emails from system access logs.
    - The API allows querying for unique user email addresses based on specific login-related actions in the system logs.
    - Logs are sent to Event Hub for both success and failure cases to ensure traceability.
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
import { logToEventHub } from "@/lib/azure/eventHubLogger";
// Centralized Event Hub logger for API observability

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- SQL QUERY FOR LOGIN EMAILS ----------------------------- */

/**
 * Generates the SQL query to fetch distinct login-related emails from the system access audit logs.
 *
 * @returns A SQL query string to retrieve distinct login emails.
 */
const generateLoginEmailsQuery = (): string => {
  // This helper function creates the SQL query text (like preparing a "report request" for the database)

  return ` 
    SELECT DISTINCT 
        user_identity.email AS EMAIL 
        -- Fetch unique email addresses (DISTINCT avoids duplicate rows) and rename the column as EMAIL for readability
    FROM
        system.access.audit 
        -- Read from the system audit log table (think of it like a security logbook for login activities)
    WHERE
        action_name IN ( 
            -- Only include specific actions that are related to login or token authentication
            "workspaceInHouseOAuthClientAuthentication", 
            -- Authentication event when accessing workspace via OAuth client
            "mintOAuthToken", 
            -- Token generation event (like issuing a session pass)
            "mintOAuthAuthorizationCode", 
            -- Authorization code generation event
            "login" 
            -- Standard user login event
        )
        AND user_identity.email IS NOT NULL 
        -- Ignore records where email is missing (NULL means "no value")
        AND user_identity.email <> '' 
        -- Ignore records where email is empty ('' means blank text)
    ORDER BY
        EMAIL; 
        -- Sort the output alphabetically, so it’s easier to read on the UI
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve distinct login emails.
 *
 * This API endpoint queries the system access audit logs for distinct email addresses associated with specific login actions.
 * It also logs both success and failure events for monitoring purposes.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers for user and other context.
 * @returns A JSON response containing the list of distinct login emails or an error message if something goes wrong.
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

  const programName = "GovernanceLoginEmailsAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(`Fetching distinct login emails initiated by user ${user}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Fetch the Databricks session to execute the SQL query.
    const session = await getDatabricksSession();
    // Create or reuse a secure session connection to Databricks (like opening a secure database session)

    // Generate the SQL query to retrieve distinct login emails.
    const query = generateLoginEmailsQuery();
    // Build the SQL query text (database instructions)

    // Execute the query and fetch the result.
    const loginEmails = await executeQuery(session, query);
    // Run the SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully retrieved distinct login emails.`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_SQL_Query",
      // Categorize the action: SQL query execution
      actionDescription: `Fetch Distinct Login Emails from table: system.access.audit`,
      // Describe the business operation performed for audit context
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the login emails as a JSON response.
    return NextResponse.json(loginEmails);
    // Send the results back to the frontend as JSON so UI can show dropdown/list of emails
  } catch (error: any) {
    // Catch block: runs if Databricks connection or query execution fails

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error retrieving login emails: ${
      error?.message ?? "Unknown error occurred while retrieving login emails."
    }`;
    // Extract error message; if unavailable, use fallback

    console.error(errorMessage, error.stack);
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
      actionDescription: `Failed to Fetch Distinct Login Emails from table: system.access.audit`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
