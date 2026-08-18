/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script is for the Pipeline Dashboard API that fetches highlights, longest running, and shortest running pipeline runs within the selected time range.
    - The script uses prebuilt app service to run the splunk query.
    - It logs the success or failure of these api calls to Event Hub.
    - Returns a summary of pipeline runs showing total, succeeded and failed runs, arrays of pipeline logs with shortest running runs and longest running runs.
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
import { NextRequest, NextResponse } from "next/server"; // Correct Next.js import path for Route Handlers. [web:33][web:22]

/*
  @/lib/azure/eventHubLogger
    - What it is:
        A local logging module that publishes structured operational logs to Azure Event Hub.

    - Why used:
        To capture API execution telemetry (success/failure, duration, errors, metadata) and stream
        it to Event Hub for downstream ingestion into monitoring systems such as Splunk for analytics,
        alerting, and audit/compliance tracking.
*/
import { logToEventHub } from "@/lib/azure/eventHubLogger"; // Publishes success/failure telemetry to Event Hub.

/*
  @/lib/services/splunkReportService
    - What it is:
        A local service module that calls Splunk and fetches report data (based on a saved report name / query key).

    - Why used:
        To keep Splunk-fetching logic in one place, so this API file stays focused on API behavior (request → response).
*/
import { fetchSplunkReport } from "@/lib/services/splunkReportService"; // Fetches pipeline highlight counts from Splunk.

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
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



/**
 * @function highlightsQuery
 * @description
 * Generates a Splunk query to compute high-level pipeline run statistics.
 * It calculates:
 *  - Total number of pipeline runs
 *  - Number of succeeded runs
 *  - Number of failed runs
 *  - Percentage distribution of each
 *
 * @params
 * None
 *
 * @returns {string}
 * A Splunk query string that returns aggregated pipeline run metrics.
 *
 * @sample_output
 * total_pipeline_runs | succeeded_pipeline_runs | failed_pipeline_runs | total_pipeline_runs_percentage | succeeded_pipeline_runs_percentage | failed_pipeline_runs_percentage
 * --------------------|-------------------------|-----------------------|----------------------------------|------------------------------------|----------------------------------
 * 100                 | 85                      | 15                    | 100.00                           | 85.00                              | 15.00
 */
const highlightsQuery = () =>
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
    total_pipeline_runs_percentage = "100.00",
    succeeded_pipeline_runs_percentage = if(total_pipeline_runs > 0, tostring(round((succeeded_pipeline_runs / total_pipeline_runs) * 100, 2)), "0.00"),
    failed_pipeline_runs_percentage = if(total_pipeline_runs > 0, tostring(round((failed_pipeline_runs / total_pipeline_runs) * 100, 2)), "0.00")`;

/**
 * @function longestRunningPipelines
 * @description
 * Generates a Splunk query to find the top 5 longest-running pipelines.
 * For each pipeline:
 *  - Computes execution duration
 *  - Finds the maximum duration per pipeline
 *  - Returns only the longest run for each pipeline
 *
 * @params
 * None
 *
 * @returns {string}
 * A Splunk query string returning top 5 longest-running pipelines.
 *
 * @sample_output
 * pipelineName | triggerId | start                | end                  | durationInMinutes | status
 * -------------|-----------|----------------------|----------------------|-------------------|--------
 * Pipeline_A   | Trigger_1 | 2026-03-25T10:00:00Z | 2026-03-25T11:30:00Z | 90.00             | Succeeded
 * Pipeline_B   | Trigger_2 | 2026-03-25T09:00:00Z | 2026-03-25T10:10:00Z | 70.00             | Failed
 */
const longestRunningPipelines = () => 
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" status IN ("Succeeded", "Failed")
| spath path=properties.SystemParameters.TriggerId output=triggerId
| spath path=properties.Predecessors{}.Name output=triggerName
| eval triggerId = coalesce(triggerName, triggerId)
| eval
    start_epoch = strptime(start, "%Y-%m-%dT%H:%M:%S.%QZ"),
    end_epoch   = strptime(end,   "%Y-%m-%dT%H:%M:%S.%QZ"),
    triggerId  = mvindex(triggerId, 0),
    durationInMinutes = round((end_epoch - start_epoch) / 60, 2)
| eventstats
    max(durationInMinutes) as MAX_DURATION
    by pipelineName
| where durationInMinutes = MAX_DURATION
| sort 0 -start
| dedup pipelineName 
| table pipelineName triggerId start end durationInMinutes status
| sort 0 -durationInMinutes
|head 5`;

/**
 * @function shortestRunningPipelines
 * @description
 * Generates a Splunk query to find the top 5 shortest-running successful pipelines.
 * For each pipeline:
 *  - Computes execution duration
 *  - Finds the minimum duration per pipeline
 *  - Returns only the shortest run for each pipeline
 *
 * @params
 * None
 *
 * @returns {string}
 * A Splunk query string returning top 5 shortest-running pipelines.
 *
 * @sample_output
 * pipelineName | triggerId | start                | end                  | durationInMinutes
 * -------------|-----------|----------------------|----------------------|-------------------
 * Pipeline_X   | Trigger_3 | 2026-03-25T12:00:00Z | 2026-03-25T12:02:00Z | 2.00
 * Pipeline_Y   | Trigger_4 | 2026-03-25T13:00:00Z | 2026-03-25T13:03:00Z | 3.00
 */
const shortestRunningPipelines = () =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" status IN ("Succeeded")
| spath path=properties.SystemParameters.TriggerId output=triggerId
| spath path=properties.Predecessors{}.Name output=triggerName
| eval triggerId = coalesce(triggerName, triggerId)
| eval
    start_epoch = strptime(start, "%Y-%m-%dT%H:%M:%S.%QZ"),
    end_epoch   = strptime(end,   "%Y-%m-%dT%H:%M:%S.%QZ"),
    triggerId  = mvindex(triggerId, 0),
    durationInMinutes = round((end_epoch - start_epoch) / 60, 2)
| eventstats
    min(durationInMinutes) as MIN_DURATION
    by pipelineName
| where durationInMinutes = MIN_DURATION
| sort 0 -start
| dedup pipelineName
| table pipelineName triggerId start end durationInMinutes
| sort 0 +durationInMinutes
| head 5`

/**
 * API Route Handler (HTTP GET)
 * - Returns pipeline run highlights for the Executive Dashboard.
 *
 * @param request - The incoming HTTP request (includes headers like "x-user-id").
 * @returns A JSON response with pipelineHighlights, or an error JSON with HTTP 500.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest // The request object provided by Next.js for this API call. [web:33]
): Promise<NextResponse> {

  const requestStartTime = new Date(); // Captures when the API started (useful for measuring total time taken).

  const programName = "PipelineDashboardAPI"; // A fixed name used in Event Hub logs to identify this API.

  const { searchParams } = new URL(request.url); // Extracts the query parameters from the request URL.

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
  // get start date parameter
  const startDate = searchParams.get("startDate");

  // get end date parameter
  const endDate = searchParams.get("endDate");

  // Log the user name, program and start time of the api call to help debug if needed.
  console.info(
    `Received request from user: ${user}, program: ${programName}, start time: ${requestStartTime.toISOString()}`
  );

  // validate whether the parameters are present or not
  if(!startDate || !endDate){
    return NextResponse.json({
      error: "Date range is null.", // Human-readable error message.
      status: 400, // Error status information included in the JSON body.
    });
  }

  try {
    // mark the beginning of the backend process for fetching highlights.
    console.info(`Fetching pipeline highlights from splunk for date range from ${startDate} to ${endDate}.`); // Marks when Splunk is called.

    // group the queries and wait until all the queries have been completed running to get the response 
    // Here, postSplunkQuery function is used to run the splunk queries and get the data within the requested time range.
    // the responses of each queries are stored as the given variables.
    const [counts, longestRunningResults, shortestRunningResults] = await Promise.all([
      fetchSplunkReport.postSplunkQuery(highlightsQuery(), startDate, endDate),
      fetchSplunkReport.postSplunkQuery(longestRunningPipelines(), startDate, endDate),
      fetchSplunkReport.postSplunkQuery(shortestRunningPipelines(), startDate, endDate)
    ])

    // Assuming counts is an array with one object, or directly the object – adjust if needed
    // example of rawCounts:
    /*
    * {
    *    "results": [
    *     {
    *       total_pipeline_runs: "333",
    *       succeeded_pipeline_runs: "314",
    *       failed_pipeline_runs: "19",
    *       total_pipeline_runs_percentage: "100.00",
    *       succeeded_pipeline_runs_percentage: "94.26",
    *       failed_pipeline_runs_percentage: "5.74"
    *     }
    *    ]
    * }
    */
    const rawCounts = Array.isArray(counts) ? counts[0] : counts; // If an array is returned, pick the first record; else use the object.

    /* 
    * Sample example:
    * pipelineHighlights = {
    *  total_pipelines: 320,
    *  total_pipelines_percentage: "100.00",
    *  succeeded_pipelines: 240,
    *  succeeded_pipelines_percentage: "75.00",
    *  failed_pipelines: 80,
    *  failed_pipelines_percentage: "25.00"
    * };
    */
    const pipelineHighlights = {
      total_pipelines: parseInt(rawCounts?.total_pipeline_runs, 10),                  // The total number of pipelines in the last 24 hours.
      total_pipelines_percentage: rawCounts?.total_pipeline_runs_percentage,          // Always "100.00", computed by Splunk.
      succeeded_pipelines: parseInt(rawCounts?.succeeded_pipeline_runs, 10),          // The number of successful pipelines in the last 24 hours.
      succeeded_pipelines_percentage: rawCounts?.succeeded_pipeline_runs_percentage,  // Success percentage, computed by Splunk.
      failed_pipelines: parseInt(rawCounts?.failed_pipeline_runs, 10),                // The number of failed pipelines in the last 24 hours.
      failed_pipelines_percentage: rawCounts?.failed_pipeline_runs_percentage,        // Failure percentage, computed by Splunk.
    }; // Final object that the dashboard will display.
    
    await logToEventHub({
      type: "INFO", // Log severity: informational message.
      detailMessage: "Pipeline runs summary fetched successfully", // Plain-language log message stored in Event Hub.
      programName, // Identifies which API wrote the log.
      startDatetime: requestStartTime, // Start time used by monitoring to calculate duration.
      status: "SUCCESS", // Marks the operation as successful (kept as-is from your code).
      actionType: "Splunk_SPL_Query", // Category label to indicate this was a Splunk query.
      actionDescription: "Fetch summary of pipeline runs from splunk", // Human explanation of the work being done.
      user, // User context for auditing and troubleshooting.
    });

    // Log the success run to notify the completion of api call and also help during debug.
    console.info("Successfully fetched pipeline highlights for pipelines dashboard.");

    return NextResponse.json({pipelineHighlights, longestRunningResults, shortestRunningResults}); // Returns JSON response to frontend/dashboard. [web:22]
  
  } catch (error: any) {
  
    console.error("Fetching pipeline highlights failed:", error?.message); // Logs the error details for debugging.

    await logToEventHub({
      type: "ERROR", // Log severity: error.
      detailMessage: error?.message ?? "Unknown error", // Captures the error message safely.
      programName, // Identifies which API wrote the log.
      startDatetime: requestStartTime, // Start time used by monitoring tools.
      status: "FAILED", // Marks the operation as failed.
      actionType: "Splunk_SPL_Query", // Category label for the failed action.
      user, // User context (if available).
    }); // Sends failure telemetry to Event Hub.

    return NextResponse.json(
      { error: error?.message || "Internal Server Error" }, // JSON error payload shown/handled by frontend.
      { status: 500 } // HTTP 500 indicates server-side error. [web:22]
    );
  }
});