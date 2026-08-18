/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script is for the Pipeline Dashboard API that fetches status-wise pipeline run logs from splunk.
    - The script uses prebuilt app service to run splunk queries, mainly fetching status-wise latest pipeline runs.
    - It logs the success or failure of these api calls to Event Hub.
    - Returns an array of latest all/succeeded/failed pipeline logs.
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
import { NextRequest, NextResponse } from "next/server"; // Imports Next.js request/response helpers for this API route. [web:33][web:22]

/*
  @/lib/services/splunkReportService
    - What it is:
        A local service module that calls a custom built Splunk Api service and fetches report data (based on a saved report name / query key).

    - Why used:
        To keep Splunk-fetching logic in one place, so this API file stays focused on API behavior (request → response).
*/
import { fetchSplunkReport } from "@/lib/services/splunkReportService"; // Service helper that fetches reports/results from Splunk.

/*
  @/lib/azure/eventHubLogger
    - What it is:
        A local logging module that publishes structured operational logs to Azure Event Hub.

    - Why used:
        To capture API execution telemetry (success/failure, duration, errors, metadata) and stream
        it to Event Hub for downstream ingestion into monitoring systems such as Splunk for analytics,
        alerting, and audit/compliance tracking.
*/
import { logToEventHub } from "@/lib/azure/eventHubLogger"; // Helper that sends success/failure logs to Azure Event Hub.

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



/**
 * @function latestRunsQuery
 * @description
 * Generates a Splunk query to fetch the latest pipeline runs with enriched metadata.
 *
 * Features:
 *  - Extracts trigger details and business unit (L2_BU)
 *  - Computes execution duration
 *  - Captures error messages for failed runs
 *  - Categorizes failures into predefined buckets
 *  - Identifies the most frequent failure type & reason per pipeline
 *
 * @param {string} status
 *  - "All"        → returns both succeeded & failed pipelines
 *  - "Succeeded"  → returns only successful pipelines
 *  - "Failed"     → returns only failed pipelines
 *
 * @returns {string}
 *  A Splunk query string returning enriched latest pipeline run details
 *
 * @sample_output
 * PIPELINE_NAME | TRIGGER_ID | START_TIME           | END_TIME             | DURATION_IN_MINUTES | STATUS    | L2_BU | MOST_FREQUENT_FAILURE_TYPE | MOST_FREQUENT_FAILURE_REASON
 * --------------|------------|----------------------|----------------------|---------------------|-----------|-------|-----------------------------|-------------------------------------------
 * Pipeline_A    | Trigger_1  | 2026-03-25T10:00:00Z | 2026-03-25T10:30:00Z | 30.00               | Failed    | Sales | SqlOperationFailed          | A SQL operation failed due to query issues
 * Pipeline_B    | Trigger_2  | 2026-03-25T11:00:00Z | 2026-03-25T11:05:00Z | 5.00                | Succeeded | HR    | null                        | null
 */
const latestRunsQuery = (status:string) =>
`
search index=${SPLUNK_EVENT_HUB_INFRA_DEV_INDEX} category="PipelineRuns" status IN ("Succeeded","Failed")
| fields pipelineName status start end runId properties.Message properties.Parameters.l2_bu
| spath path=properties.Message output=ERROR_MESSAGE
| spath path=properties.Parameters.l2_bu output=L2_BU
| spath path=properties.SystemParameters.TriggerId output=triggerId
| spath path=properties.Predecessors{}.Name output=triggerName
| eval triggerId = coalesce(triggerName, triggerId)
| eval start_epoch=strptime(start,"%Y-%m-%dT%H:%M:%S.%QZ"), end_epoch=strptime(end,"%Y-%m-%dT%H:%M:%S.%QZ")
| eval ERROR_STREAK=if(status="Failed", ERROR_MESSAGE, null())
| stats
    latest(start) as START_TIME
    latest(end) as END_TIME
    latest(status) as STATUS
    latest(L2_BU) as L2_BU
    latest(start_epoch) as start_epoch
    latest(end_epoch) as end_epoch
    values(ERROR_STREAK) as ERROR_MESSAGES
    by pipelineName triggerId
${status === "All" ? `` : `| where STATUS="${status}"`}
| eval DURATION_IN_MINUTES=round((end_epoch-start_epoch)/60,2)

| mvexpand ERROR_MESSAGES
| eval failure_category = case(
    match(ERROR_MESSAGES, "(?i)OracleReadErrorWithSemicolon"), "OracleReadErrorWithSemicolon",
    match(ERROR_MESSAGES, "(?i)SqlOperationFailed"), "SqlOperationFailed",
    match(ERROR_MESSAGES, "(?i)SapRfcClientOperationFailed"), "SapRfcClientOperationFailed",
    match(ERROR_MESSAGES, "(?i)SystemErrorOutOfMemory"), "SystemErrorOutOfMemory",
    match(ERROR_MESSAGES, "(?i)AdlsGen2OperationFailed"), "AdlsGen2OperationFailed",
    match(ERROR_MESSAGES, "(?i)AzureStorageOperationFailedConcurrentWrite"), "AzureStorageOperationFailedConcurrentWrite",
    match(ERROR_MESSAGES, "(?i)AzureDatabricksCommandError"), "AzureDatabricksCommandError",
    match(ERROR_MESSAGES, "(?i)UserErrorReadHttpFileTimeout"), "UserErrorReadHttpFileTimeout",
    match(ERROR_MESSAGES, "(?i)HttpFileFailedToRead"), "HttpFileFailedToRead",
    match(ERROR_MESSAGES, "(?i)HttpRequestTimedOut"), "HttpRequestTimedOut",
    match(ERROR_MESSAGES, "(?i)UserErrorFileNotFound"), "UserErrorFileNotFound",
    match(ERROR_MESSAGES, "(?i)RestCallFailedWithServerError"), "RestCallFailedWithServerError",
    match(ERROR_MESSAGES, "(?i)ExcelInvalidColumnName"), "ExcelInvalidColumnName",
    match(ERROR_MESSAGES, "(?i)DelimitedTextMoreColumnsThanDefined"), "DelimitedTextMoreColumnsThanDefined",
    match(ERROR_MESSAGES, "(?i)AzureDatabricksRequestError"), "AzureDatabricksRequestError",
    match(ERROR_MESSAGES, "(?i)UserErrorSapTableConnectionFailed"), "UserErrorSapTableConnectionFailed",
    match(ERROR_MESSAGES, "(?i)FailedToReadFromAzureDatabricksDeltaLake"), "FailedToReadFromAzureDatabricksDeltaLake",
    match(ERROR_MESSAGES, "(?i)UserErrorFailedToConnectOdbcSource"), "UserErrorFailedToConnectOdbcSource",
    match(ERROR_MESSAGES, "(?i)OracleConnectionOpenError"), "OracleConnectionOpenError",
    match(ERROR_MESSAGES, "(?i)UserErrorSourceBlobNotExist"), "UserErrorSourceBlobNotExist",
    match(ERROR_MESSAGES, "(?i)UserErrorWriteFailedFileOperation"), "UserErrorWriteFailedFileOperation",
    match(ERROR_MESSAGES, "(?i)OracleReadError"), "OracleReadError",
    match(ERROR_MESSAGES, "(?i)SftpOperationFail"), "SftpOperationFail",
    match(ERROR_MESSAGES, "(?i)JsonInvalidDataFormat"), "JsonInvalidDataFormat",
    match(ERROR_MESSAGES, "(?i)HttpRequestFailedWithServerError"), "HttpRequestFailedWithServerError",
    match(ERROR_MESSAGES, "(?i)ExcelUnsupportedFormat"), "ExcelUnsupportedFormat",
    match(ERROR_MESSAGES, "(?i)ExcelInvalidHeader"), "ExcelInvalidHeader",
    match(ERROR_MESSAGES, "(?i)AdlsGen2OperationFailedConcurrentWrite"), "AdlsGen2OperationFailedConcurrentWrite",
    match(ERROR_MESSAGES, "(?i)AdlsGen2InvalidFolderPath"), "AdlsGen2InvalidFolderPath",
    match(ERROR_MESSAGES, "(?i)AdlsGen2PathConflicts"), "AdlsGen2PathConflicts",
    match(ERROR_MESSAGES, "(?i)UserErrorDuplicateColumnName"), "UserErrorDuplicateColumnName",
    match(ERROR_MESSAGES, "(?i)MappingColumnNameNotFoundInSourceFile"), "MappingColumnNameNotFoundInSourceFile",
    match(ERROR_MESSAGES, "(?i)SftpFailedToConnectToSftpServer"), "SftpFailedToConnectToSftpServer",
    match(ERROR_MESSAGES, "(?i)UserErrorComputePluginFailure"), "UserErrorComputePluginFailure",
    match(ERROR_MESSAGES, "(?i)TypeConversionFailure"), "TypeConversionFailure",
    match(ERROR_MESSAGES, "(?i)SqlBulkCopyInvalidColumnLength"), "SqlBulkCopyInvalidColumnLength",
    match(ERROR_MESSAGES, "(?i)ODataRequestNotSucceeded"), "ODataRequestNotSucceeded",
    match(ERROR_MESSAGES, "(?i)SqlInvalidColumnName"), "SqlInvalidColumnName",
    match(ERROR_MESSAGES, "(?i)AzureDatabricksMissingTableOrQuery"), "AzureDatabricksMissingTableOrQuery",
    match(ERROR_MESSAGES, "(?i)FileUnexcepetedIOError"), "FileUnexcepetedIOError",
    match(ERROR_MESSAGES, "(?i)InvalidTemplate"), "InvalidTemplate",
    match(ERROR_MESSAGES, "(?i)UserErrorOdbcOperationFailed"), "UserErrorOdbcOperationFailed",
    match(ERROR_MESSAGES, "(?i)OracleWriteError"), "OracleWriteError",
    match(ERROR_MESSAGES, "(?i)UserErrorFailedToGetAccessTokenByServicePrincipal"), "UserErrorFailedToGetAccessTokenByServicePrincipal",
    match(ERROR_MESSAGES, "(?i)DelimitedTextColumnNameNotAllowNull"), "DelimitedTextColumnNameNotAllowNull",
    match(ERROR_MESSAGES, "(?i)FailedToCreateAzureDatabricksContext"), "FailedToCreateAzureDatabricksContext",
    match(ERROR_MESSAGES, "(?i)SftpPermissionDenied"), "SftpPermissionDenied",
    match(ERROR_MESSAGES, "(?i)ODataFailedClientCreation"), "ODataFailedClientCreation",
    match(ERROR_MESSAGES, "(?i)SftpPathNotFound"), "SftpPathNotFound",
    match(ERROR_MESSAGES, "(?i)UserErrorFailedToReadStream"), "UserErrorFailedToReadStream",

    match(ERROR_MESSAGES,"(?i)Connection refused|Failed to connect|partner not reached|Client not connected|ORA-01033|SshConnectionException|Failed to establish a backside connection"),"Connection Failure",
    match(ERROR_MESSAGES,"(?i)timed out|HttpRequestTimeout|UserErrorReadHttpFileTimeout|Activity timed out"),"Timeout Error",
    match(ERROR_MESSAGES,"(?i)Not Found|file not found|path does not exist|BlobNotExist|Notebook not found|No files in Fileshare|TABLE_OR_VIEW_NOT_FOUND"),"File or Resource Not Found",
    match(ERROR_MESSAGES,"(?i)Access is denied|Insufficient privileges|INSUFFICIENT_PERMISSIONS|lacks the required permissions|you do not have permissions"),"Access Denied or Permissions Issue",
    match(ERROR_MESSAGES,"(?i)Databricks execution failed|Workload failed|ClusterNotReadyException|Terminated|SUBNET_EXHAUSTED_FAILURE"),"Databricks Workload Failure",
    match(ERROR_MESSAGES,"(?i)InternalServerError|server returned an error: \(500\)|RestCallFailedWithServerError"),"Server Error",
    match(ERROR_MESSAGES,"(?i)OutOfMemoryException"),"Out of Memory",
    match(ERROR_MESSAGES,"(?i)UNRESOLVED_ROUTINE|Cannot resolve routine"),"Unresolved Routine or Syntax Error",
    true(),"Unknown Error"
)
| stats count(failure_category) as failure_count, values(failure_category) as failure_types, 
        first(START_TIME) as START_TIME, first(END_TIME) as END_TIME, 
        first(DURATION_IN_MINUTES) as DURATION_IN_MINUTES, first(STATUS) as STATUS, first(L2_BU) as L2_BU
    by pipelineName triggerId
| sort 0 -failure_count
| eval MOST_FREQUENT_FAILURE_TYPE = mvindex(failure_types, 0)  

| eval MOST_FREQUENT_FAILURE_REASON = case(
    MOST_FREQUENT_FAILURE_TYPE == "OracleReadErrorWithSemicolon", "Oracle read failed due to SQL syntax issues such as stray or invalid semicolons.",
    MOST_FREQUENT_FAILURE_TYPE == "SqlOperationFailed", "A SQL operation failed because of query errors server issues or connection problems.",
    MOST_FREQUENT_FAILURE_TYPE == "SapRfcClientOperationFailed", "SAP RFC client call failed due to connectivity or RFC configuration issues.",
    MOST_FREQUENT_FAILURE_TYPE == "SystemErrorOutOfMemory", "The system ran out of memory during activity execution.",
    MOST_FREQUENT_FAILURE_TYPE == "AdlsGen2OperationFailed", "A generic ADLS Gen2 operation failed during read write or metadata access.",
    MOST_FREQUENT_FAILURE_TYPE == "AzureStorageOperationFailedConcurrentWrite", "Concurrent writes to Azure Storage caused a conflict.",
    MOST_FREQUENT_FAILURE_TYPE == "AzureDatabricksCommandError", "A Databricks command failed inside a notebook or job.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorReadHttpFileTimeout", "Reading an HTTP file exceeded the allowed timeout.",
    MOST_FREQUENT_FAILURE_TYPE == "HttpFileFailedToRead", "ADF could not read a file served over HTTP.",
    MOST_FREQUENT_FAILURE_TYPE == "HttpRequestTimedOut", "An HTTP request timed out before completion.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorFileNotFound", "The specified file does not exist at the given path.",
    MOST_FREQUENT_FAILURE_TYPE == "RestCallFailedWithServerError", "A REST API call returned a server-side error (5xx).",
    MOST_FREQUENT_FAILURE_TYPE == "ExcelInvalidColumnName", "Excel file contains invalid or unsupported column names.",
    MOST_FREQUENT_FAILURE_TYPE == "DelimitedTextMoreColumnsThanDefined", "Delimited file has more columns than the defined schema.",
    MOST_FREQUENT_FAILURE_TYPE == "AzureDatabricksRequestError", "A request to Databricks failed due to API or cluster issues.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorSapTableConnectionFailed", "ADF could not connect to the SAP table source.",
    MOST_FREQUENT_FAILURE_TYPE == "FailedToReadFromAzureDatabricksDeltaLake", "ADF failed to read from a Databricks Delta Lake table.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorFailedToConnectOdbcSource", "ODBC connection could not be established.",
    MOST_FREQUENT_FAILURE_TYPE == "OracleConnectionOpenError", "ADF failed to open a connection to Oracle.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorSourceBlobNotExist", "The referenced blob does not exist in the storage account.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorWriteFailedFileOperation", "ADF failed to write to a file due to permissions conflicts or storage issues.",
    MOST_FREQUENT_FAILURE_TYPE == "OracleReadError", "A generic Oracle read failure occurred.",
    MOST_FREQUENT_FAILURE_TYPE == "SftpOperationFail", "An SFTP operation failed during read write or list.",
    MOST_FREQUENT_FAILURE_TYPE == "JsonInvalidDataFormat", "JSON file contains invalid malformed or unexpected data.",
    MOST_FREQUENT_FAILURE_TYPE == "HttpRequestFailedWithServerError", "HTTP request returned a server error (5xx).",
    MOST_FREQUENT_FAILURE_TYPE == "ExcelUnsupportedFormat", "Excel file format is not supported by ADF.",
    MOST_FREQUENT_FAILURE_TYPE == "ExcelInvalidHeader", "Excel header row is invalid missing or unreadable.",
    MOST_FREQUENT_FAILURE_TYPE == "AdlsGen2OperationFailedConcurrentWrite", "ADLS Gen2 write failed due to concurrent operations.",
    MOST_FREQUENT_FAILURE_TYPE == "AdlsGen2InvalidFolderPath", "The ADLS Gen2 folder path is invalid or incorrectly formatted.",
    MOST_FREQUENT_FAILURE_TYPE == "AdlsGen2PathConflicts", "The specified ADLS Gen2 path conflicts with an existing file or folder.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorDuplicateColumnName", "Duplicate column names detected in the source dataset.",
    MOST_FREQUENT_FAILURE_TYPE == "MappingColumnNameNotFoundInSourceFile", "Mapping references a column that does not exist in the source file.",
    MOST_FREQUENT_FAILURE_TYPE == "SftpFailedToConnectToSftpServer", "ADF could not connect to the SFTP server.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorComputePluginFailure", "Compute engine plugin failed during execution.",
    MOST_FREQUENT_FAILURE_TYPE == "TypeConversionFailure", "Data type conversion failed (e.g. string to integer).",
    MOST_FREQUENT_FAILURE_TYPE == "SqlBulkCopyInvalidColumnLength", "Column length mismatch occurred during SQL bulk copy.",
    MOST_FREQUENT_FAILURE_TYPE == "ODataRequestNotSucceeded", "An OData request failed due to service or API issues.",
    MOST_FREQUENT_FAILURE_TYPE == "SqlInvalidColumnName", "SQL query references a column that does not exist.",
    MOST_FREQUENT_FAILURE_TYPE == "AzureDatabricksMissingTableOrQuery", "Databricks table or query result was not found.",
    MOST_FREQUENT_FAILURE_TYPE == "FileUnexcepetedIOError", "An unexpected I/O error occurred while accessing a file.",
    MOST_FREQUENT_FAILURE_TYPE == "InvalidTemplate", "Pipeline or activity template is invalid or malformed.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorOdbcOperationFailed", "An ODBC operation failed during execution.",
    MOST_FREQUENT_FAILURE_TYPE == "OracleWriteError", "Oracle write operation failed.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorFailedToGetAccessTokenByServicePrincipal", "Service principal authentication failed when requesting an access token.",
    MOST_FREQUENT_FAILURE_TYPE == "DelimitedTextColumnNameNotAllowNull", "Delimited text file contains null or missing column names.",
    MOST_FREQUENT_FAILURE_TYPE == "FailedToCreateAzureDatabricksContext", "ADF could not create a Databricks execution context.",
    MOST_FREQUENT_FAILURE_TYPE == "SftpPermissionDenied", "SFTP server denied permission for the requested operation.",
    MOST_FREQUENT_FAILURE_TYPE == "ODataFailedClientCreation", "ADF could not create an OData client.",
    MOST_FREQUENT_FAILURE_TYPE == "SftpPathNotFound", "The specified SFTP path does not exist.",
    MOST_FREQUENT_FAILURE_TYPE == "UserErrorFailedToReadStream", "ADF failed to read the input data stream.",
    MOST_FREQUENT_FAILURE_TYPE =="Connection Failure","The system couldn't connect to a required service or database, like a server refusing the connection or not being reachable.",
    MOST_FREQUENT_FAILURE_TYPE =="Timeout Error","The operation took too long and timed out, possibly due to slow network or overloaded servers.",
    MOST_FREQUENT_FAILURE_TYPE =="File or Resource Not Found","A required file, path, or resource couldn't be found, like a missing blob or directory.",
    MOST_FREQUENT_FAILURE_TYPE =="Access Denied or Permissions Issue","The system doesn't have permission to access a file, database, or resource.",
    MOST_FREQUENT_FAILURE_TYPE =="Databricks Workload Failure","A task running on Databricks (a data processing tool) failed or was terminated unexpectedly.",
    MOST_FREQUENT_FAILURE_TYPE =="Server Error","The server encountered an internal error, like a 500 Internal Server Error.",
    MOST_FREQUENT_FAILURE_TYPE =="Out of Memory","The system ran out of memory while processing data.",
    MOST_FREQUENT_FAILURE_TYPE =="Unresolved Routine or Syntax Error","There was a problem with the code or query, like a function not found or invalid syntax.",
    true(),"Errors that don't fit into common categories and may need further review."
)
| eval MOST_FREQUENT_FAILURE_TYPE=if(STATUS="Failed", MOST_FREQUENT_FAILURE_TYPE, null())
| eval MOST_FREQUENT_FAILURE_REASON=if(STATUS="Failed", MOST_FREQUENT_FAILURE_REASON, null())
| rename pipelineName as PIPELINE_NAME triggerId as TRIGGER_ID
| table PIPELINE_NAME TRIGGER_ID START_TIME END_TIME DURATION_IN_MINUTES STATUS L2_BU MOST_FREQUENT_FAILURE_TYPE MOST_FREQUENT_FAILURE_REASON
| sort 0 -START_TIME
`;

/**
 * GET Route Handler (API endpoint)
 * - Reads a "status" value from the URL query string (example: ?status=Failed).
 * - Based on that status, fetches the right Splunk report and returns it to the UI.
 *
 * @param request - The incoming HTTP request (contains URL, headers, query params).
 * @returns A JSON response with { pipelineData } or an error payload.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest // The request object coming from the frontend/dashboard.
): Promise<NextResponse> {

  const { searchParams } = new URL(request.url); // Extracts the query parameters from the request URL.

  const status = searchParams.get("status"); // Reads the "status" query parameter value (example: "Failed").

  const startDate = searchParams.get("startDate"); // Reads the start date timestamp parameter value (example: "2026-03-04T23:59:59.000T")

  const endDate = searchParams.get("endDate"); // Reads the end date timestamp parameter value (example: "2026-03-05T23:59:59.000T")

  const requestStartTime = new Date(); // Captures the start time of the request for timing/monitoring.

  const programName = "PipelineDashboardAPI"; // A fixed name used to identify this API in logs.

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  // Log the user name, program and start time of the api call to help debug if needed.
  console.info(
    `Received request from user: ${user}, program: ${programName}, start time: ${requestStartTime.toISOString()}`
  );

  // validate whether the status is received or not 
  if (!status) {
    return NextResponse.json({
      error: "Pipeline Status is Null", // Human-readable error message.
      status: 400, // Error status information included in the JSON body.
    });
  };

  // validate if start date and end date is received or not 
  if(!startDate || !endDate){
    return NextResponse.json({
      error: "Date range is null.", // Human-readable error message.
      status: 400, // Error status information included in the JSON body.
    });
  }

  try {
    // Splunk report key for latest pipeline runs according to status.
  
    console.info(`Fetching ${status} Pipeline run logs...`); // Marks when Splunk is called and API logic is initialized.

    // get the data from the splunk and store it in results variable.
    // Here, postSplunkQuery function is used to run the splunk queries and get the data within the requested time range.
    const results = await fetchSplunkReport.postSplunkQuery(latestRunsQuery(status), startDate, endDate)

    // log the success state of the event
    await logToEventHub({
      type: "INFO", // Log level: informational.
      detailMessage: `Fetched ${status} pipeline report from splunk`, // Message stored in Event Hub.
      programName, // Identifies which API produced this log.
      startDatetime: requestStartTime, // Start time used by monitoring to compute duration.
      status: "SUCCESS", // Status logged as success (kept as-is).
      actionType: "Splunk_SPL_Query", // Category: Splunk query.
      actionDescription: "Fetch summary of pipeline runs", // What the API is doing in business terms.
      user, // Captures user context (if provided).
    });

    // Log the success run to notify the completion of api call and also help during debug.
    console.info("Returning fetched splunk data as pipelineData response."); // Info: indicates response is about to be returned.
    
    return NextResponse.json({ pipelineData: results  }); // Returns JSON response to the UI. [web:22]
  
  } catch (error: any) {
    
    console.error(
      "Failed during Splunk operation:",
      error?.message
    ); // Error: prints what went wrong for debugging.

    await logToEventHub({
      type: "INFO", // Kept as-is from your code (even though it's a failure case).
      detailMessage: error?.message ?? "Unknown error", // Error details (or a fallback message).
      programName, // Identifies which API produced this log.
      startDatetime: requestStartTime, // Start time used to estimate duration.
      status: "FAILED", // Marks the operation as failed.
      actionType: "Splunk_SPL_Query", // Category: Splunk query.
      user, // Captures user context (if provided).
    });

    return NextResponse.json(
      { error: error?.message || "Internal Server Error" }, // JSON error payload returned to UI.
      { status: 500 } // HTTP status code for server error. [web:22]
    );
  }
});
