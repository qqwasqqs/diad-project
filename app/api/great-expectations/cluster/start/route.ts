/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 30 January 2025
  Purpose of the script:
    This API route handler is responsible for starting a Databricks cluster when invoked. It serves as an endpoint for the frontend to trigger the cluster startup process. 
    The handler also logs the execution details, including success and failure events, to Azure Event Hub for monitoring and auditing purposes.
      - The API listens for POST requests, initiates the cluster startup via the databricksNotebookService, and returns the response to the caller.
      - In case of any errors during the cluster startup process, it captures the error details, logs them to Event Hub, and returns an appropriate error response to the frontend.
      - This implementation ensures that the cluster startup process is monitored effectively, providing insights into the performance and reliability of the operation through structured logging.
      - Overall, this API route handler plays a crucial role in managing the lifecycle of Databricks clusters while maintaining robust observability for operational excellence.
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
        A local service module that provides functions to interact with Databricks notebooks and clusters.
    - Why used:
        To abstract the logic for starting a Databricks cluster, allowing the API route handler to simply call 
        a function without needing to manage the underlying API calls or authentication details related to Databricks.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * POST /api/great-expectations/cluster/start
 *
 * Purpose: This API endpoint is designed to start a Databricks cluster when invoked. It serves as a backend service that the frontend can call
 * to trigger the cluster startup process. The handler also logs the execution details, including success and failure events, to Azure Event Hub for monitoring and auditing purposes.
 *
 * Functionality:
 *  - Listens for POST requests to initiate the cluster startup.
 *  - Calls the databricksNotebookService to start the cluster and waits for the response.
 *  - Logs the success event to Event Hub with relevant metadata for observability.
 *  - In case of any errors during the cluster startup process, it captures the error details, logs them to Event Hub, and returns an appropriate error response to the frontend.
 *  - Returns the response from the Databricks service back to the caller in JSON format.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the necessary headers for user and other context.
 * @returns {Promise<NextResponse>} A JSON response containing the result of the cluster start operation, or an error message if something goes wrong.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  // This function executes when the frontend/browser calls this API using HTTP GET

  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date();
  // Save the exact start time (like starting a stopwatch to measure performance)

  const programName = "GreatExpectationsClusterStartAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.log(`Received request to start Databricks cluster from user: ${user} at ${requestStartTime.toISOString()}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Call the service function to start the Databricks cluster and wait for the response.
    const response = await databricksNotebookService.startDatabricksCluster();

    // Log the response from Databricks for debugging and verification.
    console.log(`Databricks cluster start response: ${JSON.stringify(response)}`);

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully triggered Databricks cluster start job.`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_Notebook_Job_Trigger",
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Triggered Databricks cluster start job via API call.`,
      // Describe the business operation performed for audit context
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the response from the Databricks service back to the caller in JSON format.
    return NextResponse.json(response);
    // Send the results back to the frontend as JSON so UI can show dropdown/list of emails
  } catch (error: any) {
    // Catch block: runs if there was an error during the cluster startup process

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error starting Databricks cluster: ${
      error?.message ?? "Unknown error occurred while starting Databricks cluster."
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
      // Indicate it failed during SQL query execution
      actionDescription: `Failed to start Databricks cluster job via API call.`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
