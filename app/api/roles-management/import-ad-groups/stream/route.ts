/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Development Team: DIF Turnkey Team
  Script Author: Radhe Raman Tiwari
  Date: 25 June 2026

  Purpose of the script:
  This API streams live Azure AD group import job status updates to the browser using
  Server-Sent Events (SSE).

  FUNCTIONAL OVERVIEW:
  - Receives a jobId from the frontend query string.
  - Reads the latest in-memory Azure AD import job status for that jobId.
  - Sends repeated "status" events while the job is running.
  - Sends one final "done" event when the job succeeds or fails.
  - Sends an "error" event when the job cannot be found, usually because the App Service
    process restarted or the request reached a different instance.
  - Added as the companion SSE endpoint for the async Azure AD group import flow.
  - Allows the UI to show progress after the POST API has already returned immediately.
  - Protected with the same Azure AD group import permission used by the import trigger.
*/

/*
  next/server
  - What it is:
      Next.js server-side helpers for API route handlers.
  - Why used here:
      NextRequest lets us read the incoming URL query string, such as ?jobId=abc.
  - Simple example:
      /api/roles-management/import-ad-groups/stream?jobId=abc
      means "stream progress for job abc".
*/
import { NextRequest } from "next/server";

/*
  @/lib/rbac/authorize
  - What it is:
      The app's reusable authorization wrapper.
  - Why used here:
      The status stream should only be visible to users who are allowed to run or monitor
      Azure AD group imports.
  - Simple example:
      A user without roles-management-import-ad-groups:write cannot open this stream.
*/
import { withAuthorization } from "@/lib/rbac/authorize";

/*
  @/lib/jobs/azureAdGroupImportJobs
  - What it is:
      The in-memory status store for Azure AD import jobs.
  - Why used here:
      The SSE stream reads the latest job state from this store and sends it to the browser.
  - Simple example:
      If the job says "Merged 1000 of 68000", this route streams that message to the UI.
*/
import {
  getAzureAdGroupImportJob, // Reads the latest status for one import job.
  isAzureAdGroupImportJobTerminal, // Tells the stream when it can stop sending updates.
} from "@/lib/azureAdGroupImportJobs";

export const runtime = "nodejs"; // Uses the Node.js runtime because the job store lives in the Node.js process.
export const dynamic = "force-dynamic"; // Prevents Next.js from trying to cache this live status stream.

const STREAM_INTERVAL_MS = 2000; // Sends a status update every 2 seconds while the job is active.

// GET /api/roles-management/import-ad-groups/stream?jobId=<id>
// Opens a Server-Sent Events connection so the browser receives live import progress.
export const GET = withAuthorization(
  // Main route handler that creates and returns the SSE stream.
  async function GET(request: NextRequest): Promise<Response> {
    const { searchParams } = new URL(request.url); // Parse query parameters from the request URL.
    const jobId = searchParams.get("jobId"); // Read the job ID returned by the POST import API.

    // A stream without a job ID cannot know which import job to watch.
    if (!jobId) {
      return new Response("jobId is required", { status: 400 }); // Return a clear bad-request response.
    }

    const encoder = new TextEncoder(); // Converts text into bytes that can be sent over the HTTP stream.

    // ReadableStream lets the server keep the HTTP response open and push messages over time.
    const stream = new ReadableStream({
      // start() runs when the browser opens the EventSource connection.
      async start(controller) {
        // Helper that formats one message using the SSE protocol:
        // event: status
        // data: {"message":"..."}
        //
        const send = (type: string, data: unknown) => {
          controller.enqueue( // Adds the formatted event to the response stream.
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`) // SSE event name + JSON payload.
          ); // Finishes sending this one event.
        };

        // Protect the stream so a server-side error is sent to the browser cleanly.
        try {
          // Keep streaming until the job succeeds, fails, disappears, or the stream errors.
          while (true) {
            const job = getAzureAdGroupImportJob(jobId); // Read the newest job status from memory.

            // If the job is missing, the app may have restarted or another instance may be serving this request.
            if (!job) {
              send("error", { // Tell the UI why live status cannot continue.
                jobId, // Echo the requested job ID so logs and browser state can match.
                status: "not_found", // Machine-readable status for this missing-job condition.
                message:
                  "Azure AD import job was not found. The app process may have restarted or the request reached a different instance.", // Human-readable explanation.
              }); // Finish the error event payload.
              controller.close(); // Close the stream because there is no job to watch.
              return; // Stop the loop immediately.
            }

            send("status", job); // Send the current job state to the browser.

            // Once the job is finished, send one final event and close the connection.
            if (isAzureAdGroupImportJobTerminal(job)) {
              send("done", job); // Final event tells the UI to stop loading and refresh data if successful.
              controller.close(); // Close the SSE response gracefully.
              return; // End the route handler.
            }

            await new Promise((resolve) => setTimeout(resolve, STREAM_INTERVAL_MS)); // Wait before sending the next update.
          }
        } catch (error: unknown) {
          send("error", { // Send stream failure details to the browser.
            jobId, // Include the job ID for troubleshooting.
            status: "stream_error", // Machine-readable stream error status.
            message:
              error instanceof Error
                ? error.message // Use the real error message when available.
                : "Unable to stream Azure AD import job status.", // Fallback message for unknown errors.
          }); // Finish the error event payload.
          controller.close(); // Close the stream after an error.
        }
      },
    });

    // Return the live SSE response to the browser.
    return new Response(stream, {
      // These headers tell browsers and proxies this is a live event stream, not a normal cached response.
      headers: {
        "Content-Type": "text/event-stream", // Required content type for EventSource.
        "Cache-Control": "no-cache, no-transform", // Prevents caching or proxy transformation of live updates.
        Connection: "keep-alive", // Keeps the HTTP connection open for streaming.
        "X-Accel-Buffering": "no", // Asks supported reverse proxies not to buffer events.
      },
    });
  },
);
