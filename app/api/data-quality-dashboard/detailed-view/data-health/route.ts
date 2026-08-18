/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script handles the API route for retrieving dataset timeseries statistics for a specified catalog, schema, and dataset.
    - It calculates the number of successful and failed runs of a dataset over a specific time period.
    - The data is fetched from a Databricks query and returned in the response.
    - Logs success and failure events to EventHub for monitoring and traceability.
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
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import {
  CATALOG_NAME, // Databricks catalog name used as the logical database container
  SCHEMA_NAME, // Databricks schema name used to organize tables within the catalog
  DATA_INTEGRITY_EXECUTION_RESULTS_TABLE, // Table name for storing data integrity execution results
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table name for storing information about allowed tables and their associated tags
} from "@/constants/config";

/*
  @/lib/rbac/authorize
    - What it is:
        A centralized RBAC (Role-Based Access Control) authorization module that provides
        middleware-style functionality for protecting Next.js API routes.

    - Why used:
        To enforce authentication and authorization policies before API execution, validate
        user permissions and scopes, attach RBAC context to requests, and generate audit
        logs for access decisions. It ensures that only authorized users can access or
        modify protected resources within the application.
*/
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Builds a SQL query to fetch timeseries dataset health statistics for a specific dataset,
 * including the number of successful and failed runs, along with the percentage of passed runs
 * within a defined date range.
 *
 * @param catalogName - The name of the catalog (data source).
 * @param schemaName - The schema within the catalog.
 * @param datasetName - The dataset name within the schema.
 * @param startDate - The start date of the period to query.
 * @param endDate - The end date of the period to query.
 * @returns A SQL query string.
 */
const buildBusinessUnitTimeseriesQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string,
  startDate: string,
  endDate: string
): string => {
  return `
     WITH filtered_execution_results AS (
         SELECT
             CATALOG_NAME,
             SCHEMA_NAME,
             DATASET_NAME,
             RESULT_STATUS,
             DATE(CREATED_AT) AS EXEC_DATE,  -- Extract just the date from CREATED_AT for easier comparison
             CREATED_AT
         FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
         WHERE DATE(CREATED_AT) >= DATE('${startDate}')
           AND DATE(CREATED_AT) <= DATE('${endDate}')
           AND CATALOG_NAME = '${catalogName}'
           AND SCHEMA_NAME  = '${schemaName}'
           AND DATASET_NAME = '${datasetName}'
     ),

     enriched_results AS (
         SELECT
             fer.CATALOG_NAME,
             fer.SCHEMA_NAME,
             fer.DATASET_NAME,
             COALESCE(dlo.tag_value, 'Unknown') AS L1_NAME,  -- 'L1_NAME' represents the business unit (L1) name
             fer.RESULT_STATUS,
             fer.EXEC_DATE,
             fer.CREATED_AT
         FROM filtered_execution_results fer
         LEFT JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} dlo
             ON fer.CATALOG_NAME = SPLIT(dlo.table_full_name, '\\\\.')[0]
             AND fer.SCHEMA_NAME = SPLIT(dlo.table_full_name, '\\\\.')[1]
             AND fer.DATASET_NAME = SPLIT(dlo.table_full_name, '\\\\.')[2]
             -- This JOIN associates the dataset with its respective business unit (L1)
     ),

     daily_dataset_status AS (
         SELECT
             CATALOG_NAME,
             SCHEMA_NAME,
             DATASET_NAME,
             L1_NAME,
             EXEC_DATE,
             CASE
                 -- If ALL results for a given day PASSED, mark the day as passed
                 WHEN MIN(CASE WHEN RESULT_STATUS = 'PASSED' THEN 1 ELSE 0 END) = 1
                 THEN TRUE
                 ELSE FALSE
             END AS day_passed
         FROM enriched_results
         GROUP BY
             CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, L1_NAME, EXEC_DATE  -- Group by business unit and execution date
     ),

     latest_run_per_dataset AS (
         SELECT
             CATALOG_NAME,
             SCHEMA_NAME,
             DATASET_NAME,
             L1_NAME,
             EXEC_DATE,
             CREATED_AT,
             RESULT_STATUS,
             ROW_NUMBER() OVER (
                 -- Partition per dataset and business-unit combination, latest execution first
                 PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, L1_NAME
                 ORDER BY CREATED_AT DESC  -- Most recent individual execution record first
             ) AS rnk
         FROM enriched_results
         -- No GROUP BY here — enriched_results is row-level so CREATED_AT is available
     ),

     latest_execution_status AS (
         SELECT
             CATALOG_NAME,
             SCHEMA_NAME,
             DATASET_NAME,
             L1_NAME,
             EXEC_DATE AS LATEST_EXEC_DATE,  -- Get the most recent execution date
             CASE
                 -- Check the execution status of the most recent run (Succeeded or Failed)
                 WHEN RESULT_STATUS = 'PASSED' THEN 'Succeeded'
                 ELSE 'Failed'
             END AS LAST_RUN_STATUS
         FROM latest_run_per_dataset
         WHERE rnk = 1  -- Keep only the single most recent execution record per dataset+L1
     ),

     date_range_info AS (
         SELECT datediff(DATE('${endDate}'), DATE('${startDate}')) + 1 AS TOTAL_DAYS  -- Including the start and end dates
     ),

     dataset_summary AS (
         SELECT
             dds.CATALOG_NAME,
             dds.SCHEMA_NAME,
             dds.DATASET_NAME,
             dds.L1_NAME,
             SUM(CASE WHEN dds.day_passed = TRUE THEN 1 ELSE 0 END) AS successful_runs,  -- Count how many days passed
             (SELECT TOTAL_DAYS FROM date_range_info) AS TOTAL_RUNS,  -- Total number of days in the date range
             MAX(les.LAST_RUN_STATUS) AS LAST_RUN_STATUS,  -- Most recent status of the dataset
             CONCAT(
                 CAST(
                     ROUND(
                         (SUM(CASE WHEN dds.day_passed = TRUE THEN 1 ELSE 0 END) * 100.0)  -- Percentage of successful runs
                         / (SELECT TOTAL_DAYS FROM date_range_info), 0
                     ) AS INT
                 ), '%'
             ) AS PERCENT_PASSED_RUNS  -- Percentage of passed runs
         FROM daily_dataset_status dds
         LEFT JOIN latest_execution_status les
             ON dds.CATALOG_NAME = les.CATALOG_NAME
             AND dds.SCHEMA_NAME = les.SCHEMA_NAME
             AND dds.DATASET_NAME = les.DATASET_NAME
             AND dds.L1_NAME = les.L1_NAME
         GROUP BY
             dds.CATALOG_NAME, dds.SCHEMA_NAME, dds.DATASET_NAME, dds.L1_NAME  -- Group by business unit and dataset
     )

     -- Final Output: Select the summarized dataset execution results
     SELECT
         ds.CATALOG_NAME,
         ds.SCHEMA_NAME,
         ds.DATASET_NAME,
         ds.L1_NAME,
         ds.PERCENT_PASSED_RUNS,
         ds.TOTAL_RUNS,
         ds.successful_runs,
         (ds.TOTAL_RUNS - ds.successful_runs) AS failed_runs,  -- Calculate the number of failed runs
         ds.LAST_RUN_STATUS
     FROM dataset_summary ds;
   `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for retrieving timeseries dataset health statistics over a date range.
 * It validates the input parameters, executes the SQL query to retrieve dataset health information,
 * and returns the results in the response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters for catalog, schema, dataset, start date, and end date.
 * @returns A NextResponse with the timeseries data or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API runs when the dashboard needs "health trend over time" (timeseries chart) for a dataset

  // Track start time for logging
  const startTime = new Date();
  // Save request start time (like starting a stopwatch to measure API speed)

  const programName = "DQDDetailedViewDataHealthsAPI"; // The name of the program
  // Used in logging tools (EventHub/Splunk) to identify which API produced logs

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve user ID from request headers or default to "Anonymous"
  // Identify who made the request (audit tracking). If missing, treat as Anonymous

  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url);
  // Parse URL and extract values like ?catalogName=...&startDate=...&endDate=...

  const catalogName = searchParams.get("catalogName");
  // Extract catalogName (like selecting which main database container/folder to search in)

  const schemaName = searchParams.get("schemaName");
  // Extract schemaName (like selecting a sub-folder within the catalog)

  const datasetName = searchParams.get("datasetName");
  // Extract datasetName (like selecting which dataset/table you want to see health trend for)

  const startDate = searchParams.get("startDate");
  // Extract startDate from URL (the beginning date for trend chart)

  const endDate = searchParams.get("endDate");
  // Extract endDate from URL (the ending date for trend chart)

  // ------------------- PARAMETER VALIDATION -------------------
  // Ensure required query parameters are provided
  if (!catalogName || !schemaName || !datasetName) {
    // If any dataset location info is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: catalogName, schemaName, datasetName";
    // Prepare clear message that tells exactly what is missing

    console.error(errorMessage);
    // Print error to server logs for debugging

    // Return a 400 Bad Request response
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 means "frontend sent incomplete/invalid request"
  }

  if (!startDate || !endDate) {
    // Timeseries requires date range; without it dashboard cannot show trend line

    const errorMessage =
      "Missing required query parameters: startDate, endDate";
    // Prepare message telling start/end dates are mandatory

    console.error(errorMessage);
    // Log error to backend console for troubleshooting

    // Return a 400 Bad Request response
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 means invalid request because date filters are missing
  }

  try {
    // Try block: normal successful code runs here

    // ------------------- QUERY EXECUTION -------------------
    const session = await getDatabricksSession(); // Get Databricks session for executing queries
    // Open or reuse secure Databricks database session (like logging into the database)

    console.info(
      `Executing timeseries query for Catalog: ${catalogName}, Dataset: ${datasetName} from ${startDate} to ${endDate}`
    );
    // Log key inputs (catalog/dataset/date range) so support team knows what was requested

    // Execute the query to get the dataset health timeseries data
    const result = await executeQuery(
      session,
      buildBusinessUnitTimeseriesQuery(
        catalogName,
        schemaName,
        datasetName,
        startDate,
        endDate
      )
    );
    // Build SQL query using dataset + date filters, run it, and store the results

    // ------------------- SUCCESS LOG -------------------
    await logToEventHub({
      type: "INFO",
      // INFO log means API request completed successfully
      detailMessage: `Successfully retrieved dataset timeseries stats for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}' from ${startDate} to ${endDate}.`,
      // Success message stored for monitoring and audit tracking
      programName,
      // Identify which API produced this log event
      startDatetime: startTime,
      // Used to compute how long the API took
      status: "SUCCESS",
      // Mark status as successful
      actionType: "Spark_SQL_Query",
      // Indicates this API performed a Databricks SQL query
      actionDescription: `Fetch Dataset Timeseries Health from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Description of which table/data was accessed (useful for audits)
      user,
      // Store which user requested the data
    });

    // Return the results as JSON
    return NextResponse.json(result);
    // Send timeseries data back to frontend so UI can draw charts/graphs
  } catch (error: any) {
    // Catch block runs if anything fails (SQL error, network error, databricks session error)

    // ------------------- ERROR HANDLING -------------------
    const errorMessage = `Failed to retrieve dataset timeseries stats for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}' from ${startDate} to ${endDate} due to error: ${
      error?.message ?? "Unknown error"
    }`;
    // Build detailed failure message including dataset + date range for faster debugging

    console.error(errorMessage);
    // Print error message in backend logs for investigation

    // Log the error to EventHub
    await logToEventHub({
      type: "ERROR",
      // ERROR log indicates request failed
      detailMessage: errorMessage,
      // Store error detail message in Splunk/EventHub
      programName,
      // Identify which API failed
      startDatetime: startTime,
      // Helps measure time-to-failure / performance
      status: "FAILED",
      // Mark request as failed
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL execution
      actionDescription: `Failed to fetch Dataset Timeseries Health from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe which action/table was involved
      user,
      // Capture user ID associated with the failed request
    });

    // Return a 500 Internal Server Error response
    return NextResponse.json(
      { error: errorMessage },
      // Return readable error response body so frontend can show error popup/banner
      { status: 500 }
      // HTTP 500 indicates server/system issue
    );
  }
});