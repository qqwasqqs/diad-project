/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 28 February 2026

  Purpose of the script:
    This API module provides executive-level pipeline insights for the
    Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Fetches pipeline execution highlights from Splunk.
    - Retrieves detailed pipeline execution logs.
    - Calculates the most frequently failed pipeline.
    - Logs execution success/failure to Azure Event Hub for observability.
    - Returns a summarized response with counts, percentages, and KPI-style metrics.
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
import { NextRequest, NextResponse } from "next/server";
// Imports Next.js server utilities:
// - NextRequest: encapsulates the incoming HTTP request (headers, body, method, etc.)
// - NextResponse: helper class to build and return HTTP responses in API route handlers

/*
  @/lib/services/splunkReportService
    - What it is:
        A local service module that calls Splunk and fetches report data (based on a saved report name / query key).

    - Why used:
        To keep Splunk-fetching logic in one place, so this API file stays focused on API behavior (request → response).
*/
import { fetchSplunkReport } from "@/lib/services/splunkReportService";
// Imports the service responsible for interacting with the Splunk backend
// Provides high-level methods like getHighlights() and getReport() instead of raw HTTP calls

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
// Imports the Event Hub logging utility used for centralized monitoring and audit tracking

/*
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Splunk index names, Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (index names) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import { SPLUNK_EVENT_HUB_INFRA_DEV_INDEX } from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------

/**
 * getPipelineExecutiveHighlightsQuery
 *
 * This splunk query fetches the highlights of the pipelines runs
 * which provides summary of pipeline logs.
 *
 *
 * @returns {object | null} - summary of the pipeline runs
 * 
 * Sample output example: 
 *  output = [
 *            {
 *              total_pipeline_runs: 10000,
 *              succeeded_pipeline_runs: 8000,
 *              failed_pipeline_runs: 2000,
 *              succeeded_pipeline_runs_percentage: 80.00
 *            }
 *           ]
 */

const getPipelineExecutiveHighlightsQuery = () =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" status IN ("Succeeded","Failed")
| spath path=properties.SystemParameters.TriggerId output=triggerId
| spath path=properties.Predecessors{}.Name output=triggerName
| eval triggerId = coalesce(triggerName, triggerId)
| stats latest(start) as START latest(status) as STATUS by pipelineName triggerId
| stats 
    count AS total_pipeline_runs,
    count(eval(STATUS="Succeeded")) AS succeeded_pipeline_runs,
    count(eval(STATUS="Failed")) AS failed_pipeline_runs
| eval 
    succeeded_pipeline_runs_percentage = if(total_pipeline_runs > 0, tostring(round((succeeded_pipeline_runs / total_pipeline_runs) * 100, 2)), "0.00")
`;


// ---------------------------------------------------------------------
// API HANDLER
// ---------------------------------------------------------------------

/**
 * GET
 *
 * API route handler that returns executive-level pipeline summary data.
 *
 * Responsibilities:
 * - Logs API invocation and result to Azure Event Hub.
 * - Fetches pipeline highlights (aggregate counts) from Splunk.
 * - Fetches detailed pipeline execution logs from Splunk.
 * - Computes derived metrics such as success percentage and most-failed pipeline.
 * - Returns a structured JSON response for dashboard consumption.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {NextResponse} - JSON response containing the pipeline summary or an error object.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest) {

  // Capture the timestamp at which the request started
  // Used for logging, monitoring, and performance analysis.
  const requestStartTime = new Date();
  // Also used in splunk query to get data within the time range
  const today = new Date();

  // set it to the end of the day
  today.setHours(23, 59, 59, 999);

  // set start date as today
  const startDate = new Date(today);
  // change the date from today to yesterday
  startDate.setDate(today.getDate() - 1);
  // set time to beginning of the day
  startDate.setHours(0, 0, 0, 0);

  // Logical identifier for this API endpoint
  // Used in Event Hub logs for categorization and traceability
  const programName = "ExecutiveDashboardAPI";

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  try {
    // Log the initial start of the api call for help during debug.
    console.info(`Fetching pipeline summary for executive dashboard from ${startDate} to ${today}...`)

    // call the function which runs the splunk query with the required parameters
    const results = await fetchSplunkReport.postSplunkQuery(getPipelineExecutiveHighlightsQuery(), startDate.toISOString(), today.toISOString());

    // handle the result structure
    const rawCounts = Array.isArray(results) ? results[0] : results;

    // Build the final API response payload for the executive dashboard
    /*
    * example of counts:
    * counts = {
    *   overall_pipeline_score: "75.00"
    *   total_pipeline_count: 120,
    *   passed_pipeline_count: 80,
    *   failed_pipeline_count: 40,
    * }
    */
    const pipelineSummary = {
      overall_pipeline_score: parseInt(rawCounts.succeeded_pipeline_runs_percentage, 10), // Overall success percentage
      total_pipeline_count: parseInt(rawCounts.total_pipeline_runs, 10),                  // Total pipeline count
      passed_pipeline_count: parseInt(rawCounts.succeeded_pipeline_runs, 10),             // Number of passed pipelines
      failed_pipeline_count: parseInt(rawCounts.failed_pipeline_runs, 10),                // Number of failed pipelines
    };

    // Log an informational event indicating the API call has started successfully
    await logToEventHub({
      type: "INFO",                                        // Log type (informational)
      detailMessage: "Successfully fetched splunk report for executive dashboard",       // Human-readable log message
      programName,                                        // Program identifier
      startDatetime: requestStartTime,                               // Timestamp when execution began
      status: "SUCCESS",                                  // Current execution status
      actionType: "Splunk_SPL_Query",                     // Action category
      actionDescription: "Fetch summary and logs of pipeline runs from splunk", // Business context
      user,                                               // User identifier (if available)
    });

    // Log the success run to notify the completion of api call and also help during debug.
    console.info("Successfully fetched pipeline runs summary for executive dashboard.")

    // Return the response as JSON with HTTP 200 status
    return NextResponse.json(pipelineSummary);

  } catch (error: unknown) {

    const errorMessage =
      error instanceof Error ? error.message : "Error details not available.";
    // Convert unknown failures into a safe, readable message for logs and the response.

    // Log the run to help during debug.
    console.error("Error fetching pipeline summary for executive dashboard: ", errorMessage)

    // Log the error details to Event Hub for auditing and diagnostics
    await logToEventHub({
      type: "ERROR",                                // Log level ERROR
      detailMessage: errorMessage, // Error message
      programName,                                // Program identifier
      startDatetime: requestStartTime,                       // Timestamp of request today
      status: "FAILED",                           // Execution status
      actionType: "Splunk_SPL_Query",             // Action category
      user,                                       // User identifier (if available)
    });

    // Return a standardized error response to the client with HTTP 500 status
    return NextResponse.json(
      { error: errorMessage || "Internal Server Error" }, // Minimal error payload for the UI.
      { status: 500 } // HTTP 500 indicates a server-side failure.
    );
  }
});
