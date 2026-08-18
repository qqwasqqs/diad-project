/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 28 February 2026
  Purpose of the script:
    This API route handler is responsible for running the helper functions notebook job to refresh the respective data in the page. It serves as an endpoint for the frontend to trigger the job in databricks. 
    The handler also logs the execution details, including success and failure events, to Azure Event Hub for monitoring and auditing purposes.
      - The API listens for POST requests, initiates the job via the databricksNotebookService, and returns the response to the caller.
      - In case of any errors during the cluster startup process, it captures the error details, logs them to Event Hub, and returns an appropriate error response to the frontend.
      - This implementation ensures that the helper functions runs correctly with correct payload, providing insights into the performance and reliability of the operation through structured logging.
      - Overall, this API route handler plays a crucial role in refreshing the data of tables in databricks which are used to display the data in dashboard.
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
  @/lib/azure/databricksClient
    - What it is:
        A local utility module responsible for connecting to Databricks SQL, managing sessions,
        and executing queries using the Databricks SQL Connector.

    - Why used:
        To abstract Databricks connectivity and query execution into reusable functions, ensuring
        consistent authentication, session management, error handling, and resource cleanup across APIs.
*/
import {
  executeQuery,
  getDatabricksSession,
} from "@/lib/azure/databricksClient"; // Session + query execution helpers for Databricks SQL

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
        A local service module that provides functions to interact with Databricks notebooks and jobs.  
    - Why used:
        To trigger Databricks jobs/notebooks from the API with specific payloads, allowing us to execute
        data quality checks or other operations in Databricks as part of our API workflows.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the POST request to run the helper functions job with the payload received from frontend and
 * handles the cases of payload required by different functions. It uses spark query to get the dataset_type when required.
 * A date range of 1 month is used by default in one of the functions which requires a time range.
 * 
 * This API endpoint receives helper function details from the frontend, check for the function requirements, and triggers a Databricks job
 * to run the helper functions runbook with resepective parameters.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing function name and parameters in the body and user ID in headers.
 * @returns {Promise<NextResponse>} A JSON response containing the Databricks job run ID or an error message if anything fails.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  // This function executes when the frontend/browser calls this API using HTTP GET

  // Parse the JSON body of the request to extract function details sent from the frontend.
  const body = await request.json();

  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date();
  // Save the exact start time (like starting a stopwatch to measure performance)

  const programName = "GreatExpectationsRunHelperFunctionsJob";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.log(`Received request to run helper functions job from user: ${user} at ${requestStartTime.toISOString()}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block
    // Log the received request body for debugging purposes to verify what data we got from the frontend
    console.debug("Received request body to run helper function:", JSON.stringify(body));

    // Initialize required payload variables to conditionally process them according to requirements.
    let FROM_DATE = undefined;
    let TO_DATE = undefined;
    let DATASET_TYPE = undefined;

    // check if function required to run is 'load_executed_databricks_query_history' before proceeding with validation logic.
    if (body.FUNCTION === "load_executed_databricks_query_history") {
      // Record the to date as today and from date as exactly one month ago from today as they are required by this function.
      /**
       * Example:
       * TO_DATE = "2026-03-26T23:59:59.999Z"
       * FROM_DATE = TO_DATE - 1 month = "2026-02-26T23:59:59.999Z"
       */
      TO_DATE = new Date();
      FROM_DATE = new Date(TO_DATE); // set from date same as to_date
      FROM_DATE.setMonth(TO_DATE.getMonth() - 1); // subtract 1 month from from_date to make it one month ago
    }

    // check if function required to run is 'get_dataset_impact_analysis' before proceeding since it strictly requires some parameters.
    if (body.FUNCTION === "get_dataset_impact_analysis") {

      // Retrieve the Databricks session (establish a connection to Databricks)
      const session = await getDatabricksSession();
      // This function is assumed to handle authentication and connection management, 
      // ensuring that subsequent queries are executed within the context of a valid session.

      // check if the required parameters have been received from the frontend or not.
      if (!body.CATALOG_NAME || !body.SCHEMA_NAME || !body.DATASET_NAME) {
        // If any required parameter is missing, we cannot run the query correctly

        const errorMessage =
          "Missing required query parameters: catalogName, schemaName, datasetName";
        // Clear message explaining which inputs are required

        console.error(errorMessage);
        // Print error to logs so developers/support know why the API returned 400

        // Return a 400 error with a descriptive message
        return NextResponse.json({ error: errorMessage }, { status: 400 });
        // HTTP 400 = request is invalid (user/frontend missed required inputs)
      }

      // Prepare the SQL query to get the dataset_type of the table which is required in this function      
      const query = `
                SELECT 
                  CASE
                    WHEN table_type = 'VIEW' THEN 'VIEW'
                    WHEN table_type IN ('EXTERNAL', 'MANAGED')
                         AND data_source_format IN ('CSV', 'PARQUET', 'DELTASHARING') THEN 'FILE'
                    WHEN table_type IN ('EXTERNAL', 'MANAGED') THEN 'TABLE'
                    ELSE 'TABLE'
                  END AS dataset_type
                FROM system.information_schema.tables
                -- Get metadata of the dataset/table name
                WHERE table_catalog = '${body.CATALOG_NAME}' -- catalog name
                AND table_schema = '${body.SCHEMA_NAME}' -- schema name
                AND table_name = '${body.DATASET_NAME}' -- dataset/table name
            `;
      // The SQL query asks Databricks to return the table dataset_type from the information schema if it matches
      // the specified catalog, schema, and dataset. If the dataset exists, we expect at least one result.

      // Execute the SQL query using the established session connection
      const result = await executeQuery(session, query);
      // 'executeQuery' runs the query against the Databricks SQL warehouse and returns the result,
      // typically in the form of an array of rows matching the criteria (table_name).

      // check if there is an output or not
      if (result.length === 0) {
        // If the result array is empty, it means the dataset_type was not found in the catalog/schema.

        // Define a more descriptive error message to explain the issue
        const errorMessage =
          "The dataset_type could not be found. Please ensure the provided catalog, schema, and dataset names are correct.";
        // This error message provides more context and guidance. It helps the user understand that the issue is likely related to invalid or non-existent input values.

        console.error(errorMessage);
        // Log the error message for developers or support to easily track why the validation failed.
        // This helps in debugging issues and understanding why certain requests do not pass validation.

        // Return a 400 HTTP response with the error message
        return NextResponse.json({ error: errorMessage }, { status: 400 });
        // A 400 status code indicates that the request was malformed or invalid.
        // By returning this error with the appropriate message, the client/frontend can handle it appropriately (e.g., showing a user-friendly message).
      }

      // if dataset_type is found, assign the output of the query to the DATASET_TYPE variable
      DATASET_TYPE = result[0]?.dataset_type;
    }

    // Construct the payload to send to the Databricks notebook based on the request body and required parameters.
    // Construct a comprehensive payload object with all required parameters for the Databricks notebook job.
    // this payload contains the function name which is required to run and their parameters required to run respectively.
    const payload = {
      // catalog_name of table required by all the functions
      CATALOG_NAME: body.CATALOG_NAME,
      // dataset_name of table required to perform dataset impact analysis
      DATASET_NAME: body.DATASET_NAME,
      // dataset_type of table required to perform dataset impact analysis
      DATASET_TYPE: DATASET_TYPE,
      // required to load all the executed query history ran on and after this date
      FROM_DATE: FROM_DATE,
      FUNCTION: body.FUNCTION,
      // schema_name of table required to perform dataset impact analysis
      SCHEMA_NAME: body.SCHEMA_NAME,
      // required to load all the executed query history ran on and before this date
      TO_DATE: TO_DATE,
      // required in the downstream functions in backend to identify which job to call
      RULE_CATEGORY: "helper_function",
    }

    // Invoke the Databricks notebook service to trigger the job that executes helper functions.
    // This sends the payload to Databricks, which executes the runbook helper functions notebook
    // and returns a response object containing the job run ID and execution details.
    const response = await databricksNotebookService.triggerDatabricksJob(payload);

    // Log the run_id and response from the Databricks configuration notebook to the server console for debugging.
    // This helps developers verify that the notebook executed successfully and see the returned job details.
    console.info(
      `Databricks helper functions job triggered successfully for function: ${payload.FUNCTION}. Run ID: ${response?.run_id || "N/A"}, response: ${response}`
    );

    // Log the success event to Event Hub.
    await logToEventHub({
      type: "INFO", // Log severity level
      detailMessage: `Successfully triggered job to run Helper Function ${payload.FUNCTION}.`, // Detailed success message
      programName, // API identifier for log aggregation
      startDatetime: requestStartTime, // Request initiation timestamp for duration calculation
      status: "SUCCESS", // Operation completion status
      actionType: "Spark_Notebook_Job_Trigger", // Category for log filtering and analytics
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Triggered ${payload.FUNCTION} function job via API call with payload: ${JSON.stringify(payload)}`, // Detailed operation description
      user, // Audit trail: who initiated the operation
    });

    // Return the Databricks job execution response (including run ID and status) to the client
    return NextResponse.json(response);
    // Send back the JSON response to the frontend
  } catch (error: any) {
    // Catch block: runs if there was an error during the cluster startup process

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error running databricks helper functions job: ${error?.message ?? "Unknown error occurred while running helper functions job."
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
      actionDescription: `Failed to trigger helper functions job.`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});