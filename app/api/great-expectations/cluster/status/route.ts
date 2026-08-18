/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 30 January 2025
  Purpose of the script:
    This API route handler serves as the backend endpoint for fetching the status of Databricks clusters specifically for the Great Expectations data validation framework. 
    - It is designed to be called from the frontend to check if the necessary Databricks cluster is up and running before executing data quality configuration notebooks.
    - It connects to Databricks, executes a notebook that checks cluster status, and returns the results to the frontend.
    - It also implements structured logging to Azure Event Hub for monitoring and troubleshooting purposes, capturing both success and error scenarios with relevant metadata.
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
  @/lib/services/databricksNotebookService
    - What it is:
        A local service module that abstracts interactions with Databricks, including executing notebooks.
    - Why used:
        To encapsulate the logic for connecting to Databricks, running specific notebooks (like checking cluster status),
        and returning results in a reusable way across different API routes or services that need to interact with Databricks.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";


/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * GET handler for fetching Databricks cluster status for Great Expectations.
 *
 * This function is triggered when the frontend makes an HTTP GET request to this API endpoint. It performs the following steps:
 * 1. Logs the start of the request along with the user who initiated it.
 * 2. Calls the Databricks Notebook Service to execute a notebook that checks the status of the cluster.
 * 3. Logs the successful retrieval of cluster status and sends a structured log to Event Hub.
 * 4. Returns the cluster status as a JSON response to the frontend.
 * If any error occurs during the process (e.g., connection issues with Databricks), it:
 * 1. Logs the error details to the server console for debugging.
 * 2. Sends a structured error log to Event Hub for monitoring and alerting.
 * 3. Returns a 500 Internal Server Error response with the error message to the frontend.
 * 
 * @param {NextRequest} request - The incoming HTTP request(NextRequest object) containing details about the request and headers.
 * @returns {Promise<NextResponse>} - A promise that resolves to an HTTP response object containing the cluster status or error information.
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

  const programName = "GreatExpectationsClusterStatusAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(
    `Received request to ${programName} from user: ${user} at ${requestStartTime.toISOString()}`,
  );
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Call the Databricks Notebook Service to execute the notebook that checks cluster status and returns results.
    const response =
      await databricksNotebookService.getDatabricksClusterStatus();

    // Log the successful retrieval of cluster status.
    console.log(
      `Successfully retrieved Databricks cluster status: ${response?.state ?? "KNOWN"}`,
    );

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully retrieved Databricks cluster status.`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_Notebook_Job_Trigger",
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Fetch Databricks cluster status`,
      // Describe the business operation performed for audit context
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the Databricks cluster status as a JSON response.
    return NextResponse.json(response);
    // Send the results back to the frontend as JSON so UI can show cluster status
  } catch (error: any) {
    // Catch block: runs if Databricks connection or query execution fails

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error retrieving Databricks cluster status: ${
      error?.message ??
      "Unknown error occurred while retrieving Databricks cluster status."
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
      actionType: "Spark_Notebook_Job_Trigger",
      // Indicate it failed during Spark notebook job trigger
      actionDescription: `Failed to trigger Databricks notebook job for cluster status check`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
