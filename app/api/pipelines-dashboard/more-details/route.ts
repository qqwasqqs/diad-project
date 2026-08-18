/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script is for the Pipelines Dashboard API that fetches data from splunk to get the data for trends and more details in the frontend.
    - The script uses prebuilt app service to run splunk queries built to get specific data within requested time range for various components.
    - It logs the success or failure of these api calls to Event Hub.
    - Returns data for displaying visuals in UI, such as donut chart and trend chart, failed run details.
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

/*
  @/lib/services/splunkReportService
    - What it is:
        A local service module that calls Splunk and fetches report data (based on a saved report name / query key).

    - Why used:
        To keep Splunk-fetching logic in one place, so this API file stays focused on API behavior (request → response).
*/
import { fetchSplunkReport } from "@/lib/services/splunkReportService";

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
// QUERIES
// ---------------------------------------------------------------------

/**
 * Builds the SPL query for trend_data.
 * Returns the last 10 runs for the given pipeline within the date range,
 * sorted oldest → newest (so the trend chart renders left-to-right in time order).
 *
 * Fields returned per row:
 *   start    - run start time as Unix epoch milliseconds (number, ready for charting).
 *   duration - run duration in minutes (string, as stored in Splunk).
 *   status   - "Succeeded" or "Failed".
 *
 * @param pipelineName - The pipeline to filter by.
 */
const trendDataQuery = (pipelineName: string) =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" pipelineName = "${pipelineName}"
| where status IN ("Succeeded", "Failed")
| eval
    PIPELINE_NAME = mvindex(pipelineName, 0),
    STATUS        = mvindex(status, 0),
    START_TIME    = mvindex(start, 0),
    END_TIME      = mvindex(end, 0),
    start_epoch = strptime(START_TIME, "%Y-%m-%dT%H:%M:%S.%QZ"),
    end_epoch = strptime(END_TIME, "%Y-%m-%dT%H:%M:%S.%QZ"),
    DURATION_IN_MINUTES = round((end_epoch - start_epoch) / 60, 2)
| sort 0 -start_epoch
| head 10
| eval start_ms = start_epoch * 1000
| sort 0 +start_epoch
| table start_ms, DURATION_IN_MINUTES, STATUS
| rename start_ms AS start, DURATION_IN_MINUTES AS duration, STATUS AS status`;

/**
 * Builds the SPL query for donut_data.
 * Counts Succeeded and Failed runs for the given pipeline within the date range,
 * then computes percentages directly in SPL (same pattern as the highlights query).
 *
 * Fields returned (single row):
 *   total_pipelines                - total run count (string from Splunk, cast to number in handler).
 *   total_pipelines_percentage     - always "100.00".
 *   succeeded_pipelines            - count of Succeeded runs.
 *   failed_pipelines               - count of Failed runs.
 *   succeeded_pipelines_percentage - success % with 2 decimal places.
 *   failed_pipelines_percentage    - failure % with 2 decimal places.
 *
 * @param pipelineName - The pipeline to filter by.
 */
const donutDataQuery = (pipelineName: string) =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" pipelineName = "${pipelineName}"
| where status IN ("Succeeded", "Failed")
| stats
    count                           AS total_pipelines,
    count(eval(status="Succeeded")) AS succeeded_pipelines,
    count(eval(status="Failed"))    AS failed_pipelines
| eval
    total_pipelines_percentage      = "100.00",
    succeeded_pipelines_percentage  = if(total_pipelines > 0, tostring(round((succeeded_pipelines / total_pipelines) * 100, 2)), "0.00"),
    failed_pipelines_percentage     = if(total_pipelines > 0, tostring(round((failed_pipelines    / total_pipelines) * 100, 2)), "0.00")`;

/**
 * Builds the SPL query for failed_pipelines_data.
 * Returns all Failed runs for the given pipeline within the date range,
 * sorted newest first so the UI shows the most recent failures at the top.
 *
 * Fields returned per row:
 *   PIPELINE_NAME       - name of the pipeline.
 *   RUN_ID              - unique identifier for this run.
 *   START_TIME          - ISO timestamp of when the run started.
 *   END_TIME            - ISO timestamp of when the run ended.
 *   DURATION_IN_MINUTES - how long the run took (in minutes).
 *   ERROR_MESSAGE       - the full ADF error message.
 *   FAILURE_TYPE        - raw failureType field from Splunk (e.g. "UserError", "SystemError").
 *
 * @param pipelineName - The pipeline to filter by.
 */
const failedPipelinesDataQuery = (pipelineName: string, triggerId: string|null) =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" pipelineName = "${pipelineName}"
| where status = "Failed"
| spath path=properties.Message output=Message
| spath path=properties.SystemParameters.TriggerId output=triggerId
| spath path=properties.Predecessors{}.Name output=triggerName
| eval triggerId = coalesce(triggerName, triggerId)
| eval
    PIPELINE_NAME       = mvindex(pipelineName, 0),
    RUN_ID              = mvindex(runId, 0),
    TRIGGER_ID          = mvindex(triggerId, 0),
    START_TIME          = mvindex(start, 0),
    END_TIME            = mvindex(end, 0),
    ERROR_MESSAGE       = mvindex(Message, 0),
    FAILURE_TYPE        = mvindex(failureType, 0),
    start_epoch = strptime(START_TIME, "%Y-%m-%dT%H:%M:%S.%QZ"),
    end_epoch   = strptime(END_TIME, "%Y-%m-%dT%H:%M:%S.%QZ"),
    DURATION_IN_MINUTES = round((end_epoch - start_epoch) / 60, 2)
| sort 0 -start_epoch
| table RUN_ID, TRIGGER_ID, START_TIME, DURATION_IN_MINUTES, ERROR_MESSAGE, FAILURE_TYPE
${triggerId!==null ? `| where TRIGGER_ID="${triggerId}"`: ``}`;

// ---------------------------------------------------------------------
// ROUTE HANDLER
// ---------------------------------------------------------------------

/**
 * GET API endpoint
 * - Reads pipelineName, startDate and endDate from the URL query parameters.
 * - Runs three Splunk SPL queries in parallel (trend, donut, failed runs).
 * - Returns { trend_data, donut_data, failed_pipelines_data } as JSON.
 *
 * @param request - Incoming HTTP request (contains URL, query parameters, headers).
 * @returns JSON containing { trend_data, donut_data, failed_pipelines_data } or an error response.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing
 * the eventual completion or failure of an asynchronous operation. In this case, the Promise resolves
 * with a NextResponse once all three Splunk queries complete successfully.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest
): Promise<NextResponse> {

  const { searchParams } = new URL(request.url); // Extracts query parameters from the request URL.

  const pipelineName = searchParams.get("pipelineName"); // The specific pipeline the UI is requesting details for.
  const startDate    = searchParams.get("startDate");    // Start of the selected date range.
  const endDate      = searchParams.get("endDate");      // End of the selected date range.
  const triggerId    = searchParams.get("triggerId")    // triggerId of the pipeline run

  const requestStartTime = new Date();           // Stores the time this API call started (used for Event Hub logging).
  const programName      = "PipelineDashboardAPI"; // Name of this API used in Event Hub logs.
  const user             = request.headers.get("x-user-id") ?? "Anonymous"; // Reads user id from request headers if present.

  // Log the user name, program and start time of the api call to help debug if needed.
  console.info(
    `Received request from user: ${user}, program: ${programName}, start time: ${requestStartTime.toISOString()}`
  );

  // Validate required query parameters before hitting Splunk.
  if (!pipelineName) {
    return NextResponse.json(
      { error: "pipelineName query parameter is required." },
      { status: 400 } // HTTP 400 — the caller omitted a required input.
    );
  }

  // validate if start date and end date are reeived or not
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate query parameters are required." },
      { status: 400 } // HTTP 400 — date range is incomplete.
    );
  }

  // This endpoint is used in multiple pages in UI. So, for one page one failed pipelines data is required.
  // Conditionally, we are running this. If triggerId is present only run failedPipelinesDataQuery, else run all three queries.
  if(triggerId) {
    try{
      // try-catch block to handle exceptions and identify errors.

      // log the beginning of backend process of the request.
      console.info(`Fetching pipeline run events from splunk for ${pipelineName} with trigger ID ${triggerId}`)

      // Here, postSplunkQuery function is used to run the splunk queries and get the data within the requested time range.
      // Response is stored in this variable.
      const results = await fetchSplunkReport.postSplunkQuery(failedPipelinesDataQuery(pipelineName, triggerId), startDate, endDate)

      // log in the event hub
      await logToEventHub({
        type:              "INFO", // type of event
        detailMessage:     "Pipeline failed runs data fetched successfully", // detail message of the event
        programName, // program name from which the event came from
        startDatetime:     requestStartTime, // time of the event
        status:            "SUCCESS", // status whether it succeeded, failed, or in-process
        actionType:        "Splunk_SPL_Query", // type of event
        actionDescription: "Fetch failed pipeline data from Splunk", // description of event
        user, // event performed by the user
      });
  
      // log the success status of the process.
      console.info("Successfully fetched failed pipeline data.");
  
      // return requested the data.
      return NextResponse.json(results); 

    } catch(error: any) {
      // log the error if occured
        console.error("Failed during Splunk operation:", error?.message);

        // log error in event hub
        await logToEventHub({
          type:          "ERROR", // type of event
          detailMessage: error?.message ?? "Unknown error", // message of the error
          programName, // name of program event
          startDatetime: requestStartTime, // start time of event
          status:        "FAILED", // status of event
          actionType:    "Splunk_SPL_Query", // type of event
          user, // event called by the user
        });

        return NextResponse.json(
          { error: error?.message || "Internal Server Error" },
          { status: 500 } // HTTP 500 indicates a server-side failure.
        );
    }
  } 

  // else if trigger id is not provided then perform the below process 
  try {
    // log the beginning of backend process and the parameters for debugging
    console.info(
      `Fetching trend, donut and failed pipeline data from Splunk ` +
      `for pipeline "${pipelineName}" between ${startDate} and ${endDate}.`
    );

    // Run all three Splunk queries in parallel so the total wait time equals the
    // slowest single query rather than the sum of all three.
    // Here, postSplunkQuery function is used to run the splunk queries and get the data within the requested time range.
    const [trendRaw, donutRaw, failedRaw] = await Promise.all([
      fetchSplunkReport.postSplunkQuery(trendDataQuery(pipelineName), startDate, endDate),
      fetchSplunkReport.postSplunkQuery(donutDataQuery(pipelineName), startDate, endDate),
      fetchSplunkReport.postSplunkQuery(failedPipelinesDataQuery(pipelineName, triggerId), startDate, endDate),
    ]); // Fires all three requests simultaneously and waits until all have resolved.

    /*
     * trend_data
     * Splunk returns one row per run already in the correct shape.
     * Cast `start` from string → number because Splunk returns all values as strings.
     *
     * Example output:
     * [
     *   { start: 1772722450000, duration: "130.55", status: "Failed"    },
     *   { start: 1772732185000, duration: "148.15", status: "Failed"    },
     *   { start: 1772762423000, duration: "22.53",  status: "Succeeded" },
     * ]
     */
    const trend_data = (Array.isArray(trendRaw) ? trendRaw : []).map((row: any) => ({
      start:    parseInt(row.start, 10), // Convert epoch-ms string to number for charting.
      duration: row.duration,            // Keep as string — consistent with previous shape.
      status:   row.status,
    }));

    /*
     * donut_data
     * Splunk returns a single-row result; pick [0] if wrapped in an array.
     * Convert count fields from string → number; keep percentage fields as strings.
     *
     * Example output:
     * {
     *   total_pipelines: 4,
     *   total_pipelines_percentage: "100.00",
     *   succeeded_pipelines: 1,
     *   failed_pipelines: 3,
     *   succeeded_pipelines_percentage: "25.00",
     *   failed_pipelines_percentage: "75.00"
     * }
     */
    const donutRawRow = Array.isArray(donutRaw) ? donutRaw[0] : donutRaw;
    const donut_data = {
      total_pipelines:               parseInt(donutRawRow?.total_pipelines,    10),
      total_pipelines_percentage:    donutRawRow?.total_pipelines_percentage,       // Always "100.00".
      succeeded_pipelines:           parseInt(donutRawRow?.succeeded_pipelines, 10),
      failed_pipelines:              parseInt(donutRawRow?.failed_pipelines,    10),
      succeeded_pipelines_percentage: donutRawRow?.succeeded_pipelines_percentage,
      failed_pipelines_percentage:    donutRawRow?.failed_pipelines_percentage,
    };

    /*
     * failed_pipelines_data
     * One row per failed run, already shaped correctly by the SPL table command.
     *
     * Example output:
     * [
     *   {
     *     PIPELINE_NAME:       "PL_RA_VEEVA_API_v1",
     *     RUN_ID:              "b93fc4b1-...",
     *     START_TIME:          "2026-03-06T05:59:55.0000000Z",
     *     END_TIME:            "2026-03-06T09:30:21.0000000Z",
     *     DURATION_IN_MINUTES: "210.43",
     *     ERROR_MESSAGE:       "Operation on target ForEach1 failed: ...",
     *     FAILURE_TYPE:        "UserError"
     *   },
     *   ...
     * ]
     */
    const failed_pipelines_data = Array.isArray(failedRaw) ? failedRaw : [];

    // log into the event hub
    await logToEventHub({
      type:              "INFO", // type of event log
      detailMessage:     "Pipeline trend, donut and failed runs data fetched successfully", // message of event log
      programName, // name of the program
      startDatetime:     requestStartTime, // start time of the event
      status:            "SUCCESS", // status of the event
      actionType:        "Splunk_SPL_Query", // type of event
      actionDescription: "Fetch trend, donut and failed pipeline data from Splunk", // description of the event
      user, // details of the event invoker
    });

    // log the success status of event
    console.info("Successfully fetched trend, donut and failed pipeline data.");

    // return the requested data.
    return NextResponse.json({ trend_data, donut_data, failed_pipelines_data });

  } catch (error: any) {
    // log the error for debugging
    console.error("Failed during Splunk operation:", error?.message);

    // log error into event hub
    await logToEventHub({
      type:          "ERROR", // type of event log
      detailMessage: error?.message ?? "Unknown error", // message of event log
      programName, // name of the event program
      startDatetime: requestStartTime, // start time of event
      status:        "FAILED", // status of event 
      actionType:    "Splunk_SPL_Query", // type of action performed in the event
      user, // details of user who invoked the event
    });

    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 } // HTTP 500 indicates a server-side failure.
    );
  }
});