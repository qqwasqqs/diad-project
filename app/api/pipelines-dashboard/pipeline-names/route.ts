/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script is for the Pipeline Dashboard API that fetches pipeline names from splunk within the requested time range.
    - The script uses prebuilt app service to run the splunk query.
    - It logs the success or failure of these api calls to Event Hub.
    - Returns an array of pipeline names that ran within a certain time range.
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
 * @function getPipelineNames
 * @description
 * Generates a Splunk query to get distinct pipeline names from the logs.
 * It calculates:
 *  distinct pipeline names in the logs
 *
 * @params
 * None
 *
 * @returns {string}
 * A Splunk query string that returns all unique pipeline names.
 * 
 * Sample Output:
 *      response = [{pipelineName: "pipeline_no_1"}, {pipelineName: "pipeline_no_2"}, {pipelineName: "pipeline_no_3"}]
 * 
 */
const getPipelineNames = () =>
`search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" status IN ("Succeeded","Failed")
| stats values(pipelineName) as pipelineName`;

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

  const programName = "PipelineNamesAPI"; // A fixed name used in Event Hub logs to identify this API.

  const { searchParams } = new URL(request.url); // Extracts the query parameters from the request URL.

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
  // get start date parameter from request url
  const startDate = searchParams.get("startDate");

  // get end date parameter from request url
  const endDate = searchParams.get("endDate");

  // Log the user name, program and start time of the api call to help debug if needed.
  console.info(
    `Received request from user: ${user}, program: ${programName}, start time: ${requestStartTime.toISOString()}`
  );

  // validate whether start date and end date are present or not
  if(!startDate || !endDate){
    return NextResponse.json({
      error: "Date range is null.", // Human-readable error message.
      status: 400, // Error status information included in the JSON body.
    });
  }

  try {
    // log the beginning of the backend process for debugging
    console.info(`Fetching pipeline highlights from splunk for date range from ${startDate} to ${endDate}.`); // Marks when Splunk is called.

    // get the data from the splunk and store it in pipelineNames variable.
    // Here, postSplunkQuery function is used to run the splunk queries and get the data within the requested time range.
    const pipelineNames = await fetchSplunkReport.postSplunkQuery(getPipelineNames(), startDate, endDate)
    
    // log the success event.
    await logToEventHub({
      type: "INFO", // Log severity: informational message.
      detailMessage: "Pipeline names fetched successfully", // Plain-language log message stored in Event Hub.
      programName, // Identifies which API wrote the log.
      startDatetime: requestStartTime, // Start time used by monitoring to calculate duration.
      status: "SUCCESS", // Marks the operation as successful (kept as-is from your code).
      actionType: "Splunk_SPL_Query", // Category label to indicate this was a Splunk query.
      actionDescription: "Fetch names of pipelines from splunk", // Human explanation of the work being done.
      user, // User context for auditing and troubleshooting.
    });

    // Log the success run to notify the completion of api call and also help during debug.
    console.info("Successfully fetched pipeline names from splunk.");

    return NextResponse.json(pipelineNames[0]); // Returns JSON response to frontend/dashboard. [web:22]
  
  } catch (error: any) {
  
    console.error("Fetching pipeline names failed:", error?.message); // Logs the error details for debugging.

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
});6