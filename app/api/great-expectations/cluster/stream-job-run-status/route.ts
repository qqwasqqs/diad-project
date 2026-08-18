/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    This API endpoint provides a live stream of status updates for a specific Databricks job run. When the frontend
      -
      - calls this API with a Databricks job run ID, it continuously checks the job's status every few seconds and sends
      - real-time updates back to the browser using Server-Sent Events (SSE). This allows users to monitor the progress
      - of their Databricks jobs in real time without needing to refresh the page. The API also logs important events and errors
      - to Azure Event Hub for monitoring and troubleshooting purposes.
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
import { NextRequest } from "next/server"; // Next.js types/utilities for server route handling
// Helps us read details about the incoming web request (like reading a shipping label)

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
// Sends structured activity logs to Azure Event Hub (like writing into a company audit logbook)

/*
  @/lib/services/databricksNotebookService
    - What it is:
        A local service module that encapsulates interactions with Databricks REST APIs related to notebook jobs.
    - Why used:
        To abstract away the details of making authenticated API calls to Databricks to check job status,
        allowing our route handler to simply ask: “What is the job status right now?” without worrying about
        authentication, request formatting, or response parsing.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";
// Service responsible for asking Databricks: “What is the job status right now?”

/*
   @/lib/azure/ADToken
    - What it is:
        A local module that implements the authentication logic to retrieve a Databricks
        access token depending on runtime environment (local vs Azure).

    - Why used:
        To securely authenticate Databricks SQL connections by acquiring:
          - AAD access token via Service Principal (local development)
          - Databricks token / PAT via Managed Identity (Azure production runtime)
*/
import { getDatabricksAADToken } from "@/lib/azure/ADToken";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Retrieves a secure access token so our system is authorized to talk to Databricks
// Think of this like showing an ID badge to enter a restricted building

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * GET /api/great-expectations/cluster/stream-job-run-status
 *
 * Streams real-time status updates for a Databricks job run to the client using Server-Sent Events (SSE).
 *
 * Server-Sent Events (SSE) is a web standard that allows a server to push updates to a browser over a single,
 * long-lived HTTP connection. Unlike traditional request-response patterns where the client must continuously
 * poll the server for updates, SSE enables the server to automatically send data to the client whenever a change
 * occurs. The browser receives these updates in real-time and can trigger event listeners (e.g., "status", "done", "error")
 * without page refreshes. SSE is ideal for scenarios like job monitoring, live notifications, and live dashboards.
 *
 * @param {NextRequest} request - The incoming HTTP request containing:
 *   - `runId` (query parameter): The Databricks job run ID to monitor (required)
 *   - `x-user-id` (header): Optional user identifier for audit logging
 *
 * @returns {Response} A streaming HTTP response with Content-Type "text/event-stream" that continuously sends:
 *   - `status` events: Current job lifecycle state (RUNNING, PENDING, etc.) and result state
 *   - `done` event: Final job state when the job reaches a terminal state (TERMINATED, SKIPPED, INTERNAL_ERROR, FAILED)
 *   - `error` event: Error message if job status retrieval fails
 *
 * @throws {Response} Returns HTTP 400 if `runId` query parameter is missing
 *
 * @remarks
 * - Polls Databricks API every 3 seconds for job status updates
 * - Requires valid Databricks authentication token (AAD or Managed Identity)
 * - Logs all operations (success/failure) to Azure Event Hub for monitoring and audit purposes
 * - Automatically closes the stream when the job reaches a terminal state or an error occurs
 */
export const GET = withAuthorization(async function GET(request: NextRequest) {
  // This function runs when the frontend calls this API endpoint

  const requestStartTime = new Date();
  // Capture the exact time the request started (like starting a stopwatch)

  const programName = "GreatExpectationsClusterStreamJobRunStatusSSE";
  // Name of this API process for tracking in monitoring systems

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Identify who triggered the request (for audit tracking)
  // If no user ID is sent, we label them as "Anonymous"

  console.info(`Job status streaming started by user: ${user}`);
  // Developer log — useful for real-time debugging

  // ------------------------------------------------------------------
  // READ REQUIRED INPUT (runId)
  // ------------------------------------------------------------------
  const { searchParams } = new URL(request.url);
  // Extract query parameters from the request URL

  const runId = searchParams.get("runId");
  // Get the Databricks Job Run ID from the request
  // This is like a tracking number for a delivery order

  if (!runId) {
    // If no tracking number is provided, we cannot check the job
    return new Response("runId is required", { status: 400 });
  }

  // ------------------------------------------------------------------
  // AUTHENTICATION – Get permission to talk to Databricks
  // ------------------------------------------------------------------
  const accessToken = await getDatabricksAADToken();
  // Secure token proving we are allowed to request job details

  // ------------------------------------------------------------------
  // SET UP LIVE STREAM TO BROWSER (Server-Sent Events)
  // ------------------------------------------------------------------
  const encoder = new TextEncoder();
  // Converts text into a format that can travel across the internet

  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send updates to the browser
      const send = (type: string, data: any) =>
        // Send a message to the browser in the format it expects for SSE
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      // Formats messages so the browser can receive live updates
      // Similar to a live sports scoreboard updating automatically

      try {
        // Keep checking job status until it finishes or fails
        while (true) {
          // Ask Databricks: “What is the current state of this job run?”
          const response =
            await databricksNotebookService.getDatabricksJobStatus(
              accessToken, // Use our secure token to authenticate the request
              runId, // Specify which job run we want to check on
            );
          // Ask Databricks: “What is the current state of this job run?”

          const state =
            response.state?.life_cycle_state ?? // response.status?.life_cycle_state;
            response.status?.life_cycle_state; // Extract job’s current lifecycle stage (e.g., RUNNING, PENDING, etc.)
          // Extract job’s current lifecycle stage (e.g., RUNNING, TERMINATED)

          const resultState =
            response.state?.result_state ?? response.status?.result_state;
          // Extract final result (SUCCESS, FAILED, etc.) if available

          // Send status update to the browser so it can update the UI in real time
          send("status", {
            life_cycle_state: state, // Current stage of the job (e.g., RUNNING, PENDING)
            result_state: resultState, // Final result if job has finished (e.g., SUCCESS, FAILED)
          });

          // If job reached a terminal state, stop streaming
          if (
            ["TERMINATED", "SKIPPED", "INTERNAL_ERROR", "FAILED"].includes(
              state,
            )
          ) {
            send("done", {
              life_cycle_state: state, // Final stage of the job (e.g., TERMINATED)
              result_state: resultState, // Final result of the job (e.g., SUCCESS, FAILED)
            });
            // Send a final message to the browser indicating the job is done with its final status

            controller.close();
            // Close the stream connection since we are done sending updates

            // Log the successful completion of the job run with relevant details for monitoring and audit purposes
            await logToEventHub({
              // Event type: INFO indicates a successful informational event
              type: "INFO",
              // Detailed message describing what happened with the job run completion
              detailMessage: `Databricks job run ${runId} finished with state ${state} and result ${resultState}.`,
              // Name of the program/process for tracking in monitoring systems
              programName,
              // Timestamp when the API request started
              startDatetime: requestStartTime,
              // Overall status of the operation: SUCCESS indicates successful completion
              status: "SUCCESS",
              // Category of action being performed: Databricks job streaming
              actionType: "Databricks_Job_Status_Stream",
              // Human-readable description of what the action does
              actionDescription: "Live monitoring of Databricks job run",
              // User ID who triggered this API request
              user,
            });

            return;
          }

          // Wait 3 seconds before checking again (prevents overloading system)
          await new Promise((r) => setTimeout(r, 3000));
          // Like refreshing a tracking page every few seconds
        }
      } catch (error: any) {
        // If something breaks while checking status

        // Create a clear error message for developers and monitoring systems
        const errorMessage = `Failed to retrieve Databricks job status: ${
          error?.message ?? "Unknown error"
        }`;

        // Log the error details for developers to investigate
        console.error(errorMessage, error.stack);
        // Developer-facing log with error details

        send("error", errorMessage);
        // Send an error message to the browser so it can inform the user

        controller.close();
        // Close the stream connection since we can’t continue

        // Log failure in Event Hub for monitoring and alerts
        await logToEventHub({
          // Event type: ERROR indicates a failure event that needs attention
          type: "ERROR",
          // Detailed message describing the error that occurred while trying to retrieve job status
          detailMessage: errorMessage,
          // Name of the program/process for tracking in monitoring systems
          programName,
          // Timestamp when the API request started
          startDatetime: requestStartTime,
          // Overall status of the operation: FAILED indicates the operation did not complete successfully
          status: "FAILED",
          // Category of action being performed: Databricks job streaming
          actionType: "Databricks_Job_Status_Stream",
          // Human-readable description of what the action does, indicating that it failed
          actionDescription: "Live monitoring of Databricks job run failed",
          // User ID who triggered this API request
          user,
        });
      }
    },
  });

  // ------------------------------------------------------------------
  // RETURN STREAM RESPONSE TO BROWSER
  // ------------------------------------------------------------------
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream", // Required for live updates
      "Cache-Control": "no-cache, no-transform", // Prevents browser from storing old data
      Connection: "keep-alive", // Keeps connection open for streaming
      "X-Accel-Buffering": "no", // Critical for proxies
    },
  });
});
