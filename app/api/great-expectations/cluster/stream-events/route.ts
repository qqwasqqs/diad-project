/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    This API endpoint provides a real-time stream of events from a Databricks cluster using Server-Sent Events (SSE).
      - SSE allows the frontend to receive live updates about the cluster status without needing to refresh the page or make repeated requests.
      - When the frontend calls this API, it will continuously poll Databricks for cluster events and 
        push updates to the browser until the cluster reaches a RUNNING state or an error occurs.
      - The API also logs important telemetry to Azure Event Hub for monitoring and troubleshooting purposes.

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
// Helps us understand the incoming web request (like reading details on an envelope)

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
// Used to send activity logs to Azure Event Hub (like writing entries in a security logbook)

/*
  @/lib/services/databricksNotebookService
    - What it is:
        A local service module that provides functions to interact with Databricks notebooks and clusters.
    - Why used: 
        To abstract away the details of making API calls to Databricks, such as fetching cluster events,
        so that the route handler can focus on streaming logic and error handling without worrying about
        the specifics of Databricks API interactions.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";
// Service that talks to Databricks and asks: "What is the cluster doing right now?"

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
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gets a secure access token so we are authorized to talk to Databricks
// (like showing an employee badge before entering a restricted office)

/* ------------------------------- API ROUTE HANDLER ------------------------------- */
/**
 * GET handler for Databricks cluster status streaming via Server-Sent Events (SSE).
 *
 * @description
 * This API endpoint provides a real-time stream of events from a Databricks cluster using
 * Server-Sent Events (SSE). SSE is a standard HTTP-based protocol that allows a server to
 * push updates to connected clients over a single, long-lived HTTP connection without the
 * client having to repeatedly poll for new data.
 *
 * **What is SSE?**
 * Server-Sent Events (SSE) is a browser API and protocol that enables efficient one-way
 * communication from server to client. Unlike WebSockets (which allow bidirectional communication),
 * SSE uses standard HTTP to establish a persistent connection where the server can push
 * text-based events to the browser in real-time. The connection remains open until the server
 * explicitly closes it or an error occurs.
 *
 * **Key characteristics of SSE:**
 * - Uses standard HTTP/HTTPS (no special protocols required)
 * - Automatic reconnection if connection drops
 * - Simple text-based event format (event: type, data: payload)
 * - Lower overhead than polling or WebSockets for server-to-client communication
 * - Better browser support and simpler implementation compared to WebSockets
 *
 * **How it works in this endpoint:**
 * The stream continuously polls Databricks for cluster events and pushes updates to the browser
 * until the cluster reaches a RUNNING state or an error occurs. The frontend can listen to events
 * like "log" (activity updates), "success" (cluster ready), and "error" (operation failed) without
 * needing page refreshes or repeated polling requests.
 *
 * @param {NextRequest} request - Incoming HTTP request containing x-user-id header
 * @returns {Response} SSE stream with Content-Type text/event-stream and keep-alive headers
 */
export const GET = withAuthorization(async function GET(request: NextRequest) {
  // Record when the request started (like starting a stopwatch)
  const requestStartTime = new Date();

  // Name of this API process for logging and monitoring purposes
  const programName = "GreatExpectationsClusterStreamEventsSSE";

  // Identify which user triggered the request (from request headers)
  // If no user is provided, we label them as "Anonymous"
  const user = request.headers.get("x-user-id") ?? "Anonymous";

  console.info(`Cluster status stream started by user: ${user}`);
  // Log in server console — useful for developers watching live logs

  // ---------------------------------------------------------------------
  // AUTHENTICATION – Get permission to talk to Databricks
  // ---------------------------------------------------------------------
  const accessToken = await getDatabricksAADToken();
  // This is like getting a temporary security pass to access Databricks

  // ---------------------------------------------------------------------
  // STREAM SETUP – Preparing to send live updates to the browser
  // ---------------------------------------------------------------------

  const encoder = new TextEncoder();
  // Converts text into a format that can be sent over the internet

  let startTime = Date.now() - 5000;
  // We start looking at events from 5 seconds ago to avoid missing anything

  let pageToken = "";
  // Used for pagination — like saying “give me the next page of results”

  const stream = new ReadableStream({
    async start(controller) {
      // Helper function to send messages to the browser
      const send = (type: string, data: any) => {
        // Format messages as Server-Sent Events (SSE)
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
        );
        // Send a message to the browser in SSE format (event type + data payload)
      };
      // This formats messages as Server-Sent Events (SSE)
      // Similar to live sports score updates appearing without refreshing

      try {
        // Keep checking Databricks repeatedly until we get a final state
        while (true) {
          // Ask Databricks: “What has the cluster been doing since this time?”
          const response =
            await databricksNotebookService.getDatabricksClusterEvents(
              accessToken, // Use our security pass to talk to Databricks
              startTime, // Look for events that happened after this time (initially 5 seconds ago)
              pageToken, // If there are more events than one page, this token helps us get the next batch
            );
          // Ask Databricks: “What happened after this time?”

          const events = response.events || []; // Get the list of events, or an empty list if there are none
          pageToken = response.next_page_token || ""; // Update our page token for the next request (if there are more events to fetch)

          // Loop through each event returned
          for (const event of events) {
            send("log", event);
            // Send raw event data to browser (like a live activity feed)

            startTime = Math.max(startTime, event.timestamp + 1);
            // Move forward in time so we don’t read the same event again

            // If cluster becomes RUNNING, we stop streaming
            if (event.type === "RUNNING") {
              send("success", "Cluster is now running");
              // Notify browser that everything is ready

              controller.close();
              // Stop the stream — job is done

              // Log success in Event Hub (like marking task as completed in audit register)
              await logToEventHub({
                // Log an informational message indicating the cluster reached the RUNNING state
                type: "INFO",
                // This message will be captured in Event Hub and can be used for monitoring, analytics, and auditing
                detailMessage: `Databricks cluster reached RUNNING state.`,
                // Include relevant metadata for monitoring and analytics
                programName,
                // Log when the request started for duration tracking in monitoring systems
                startDatetime: requestStartTime,
                // Mark the operation as successful
                status: "SUCCESS",
                // Describe the type of action for categorization in logs
                actionType: "Databricks_Cluster_Status_Stream",
                // Describe the action in more detail for clarity in monitoring dashboards
                actionDescription: "Cluster status monitoring",
                // Include the user who initiated the request for audit purposes
                user,
              });
              return; // Exit loop and finish request
            }
          }

          // Enqueues the encoded string `": ping\n\n"` to the controller's internal queue for further processing.
          // The string represents a ping command, commonly used to check connectivity or server status.
          // `encoder.encode()` converts the string into a binary format (Uint8Array) suitable for transmission or storage.
          // `controller.enqueue()` adds this encoded data to the queue for later use, likely in a stream processing context.
          controller.enqueue(
            encoder.encode(`: ping\n\n`),
          );
          
          // If there are no more pages, wait before asking again
          if (!pageToken) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            // Wait 3 seconds before polling again (like refreshing every few seconds)
          }
        }
      } catch (error: any) {
        // If anything goes wrong, we log and inform the user
        const errorMessage = `Failed to retrieve Databricks cluster status: ${error?.message ?? "Unknown error"
          }`;

        // Log the error in server console for developers to see (including stack trace for debugging)
        console.error(errorMessage, error.stack);

        send("error", errorMessage);
        // Send error to browser

        controller.close();
        // Stop the stream

        // Log failure in Event Hub for monitoring and alerts
        await logToEventHub({
          // Log an error message indicating that retrieving cluster status failed
          type: "ERROR",
          // This message will be captured in Event Hub and can trigger alerts or be used for troubleshooting
          detailMessage: errorMessage,
          // Include relevant metadata for monitoring and analytics to understand the context of the failure
          programName,
          // Log when the request started for duration tracking in monitoring systems
          startDatetime: requestStartTime,
          // Mark the operation as failed for monitoring and alerting purposes
          status: "FAILED",
          // Describe the type of action for categorization in logs
          actionType: "Databricks_Cluster_Status_Stream",
          // Describe the action in more detail for clarity in monitoring dashboards
          actionDescription: "Cluster status monitoring failed",
          // Include the user who initiated the request for audit purposes, even in failure cases
          user,
        });
      }
    },
  });

  // ---------------------------------------------------------------------
  // SEND STREAM RESPONSE BACK TO BROWSER
  // ---------------------------------------------------------------------
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream", // Required for live streaming
      "Cache-Control": "no-cache, no-transform", // Prevent browser from caching
      Connection: "keep-alive", // Keep connection open
      "X-Accel-Buffering": "no", // Critical for proxies
    },
  });
});
