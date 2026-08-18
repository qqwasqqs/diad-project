/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script is responsible for retrieving dataset time series statistics for a specific business unit over a given date range.
    It fetches the dataset health data, such as the number of successful and failed runs within the specified period, and logs the success or failure of the operation.

    Key Functionalities:
    - It validates the input query parameters (`startDate` and `endDate`).
    - It constructs and executes an SQL query to get the dataset health statistics.
    - It logs both the successful and failed executions to EventHub for traceability.
    - It returns the dataset statistics as a JSON response.
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

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeAndClause,
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

// ----------------------------- SQL QUERY BUILDER -----------------------------

/**
 * Constructs the SQL query to fetch dataset health statistics over a specified date range for a given business unit.
 *
 * This query calculates the number of successful runs, failed runs, and overall run status for datasets within the business unit
 * during the specified time period. It calculates percentages for passed runs and summarizes dataset health data.
 *
 * @param {string} businessUnit - The business unit for which to fetch dataset health data.
 * @param {string} startDate - The start date of the time period to retrieve data for.
 * @param {string} endDate - The end date of the time period to retrieve data for.
 *
 * @returns {string} - The SQL query string.
 *
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - startDate: "2025-11-01"
 *    - endDate: "2025-11-30"
 *  Output:
 *    - A SQL query that retrieves dataset health statistics for the "Retail" business unit from November 1 to November 30, 2025.
 */
const buildBusinessUnitTimeseriesQuery = (
  businessUnit: string,
  startDate: string,
  endDate: string,
  request: NextRequest
): string => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: catalog=dset_dev adds an extra catalog check before rows are enriched.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns()
  );

  return `
    -- Filtered execution results within the given date range
    WITH filtered_execution_results AS (
        SELECT
            CATALOG_NAME,  -- The catalog where the dataset is located
            SCHEMA_NAME,  -- The schema where the dataset is stored
            DATASET_NAME,  -- The dataset name being analyzed
            RESULT_STATUS,  -- The result status (e.g., PASSED, FAILED)
            DATE(CREATED_AT) AS EXEC_DATE,  -- The execution date (just the date part)
            CREATED_AT  -- Full timestamp when the execution happened
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}  -- From the data integrity execution results table
        WHERE CREATED_AT >= '${startDate}' AND CREATED_AT <= '${endDate}'  -- Filter by date range
          ${rbacScopeClause}
          -- RBAC data-scope filter: only include execution rows allowed by the user's groups
    ),
    
    -- Enrich the results with L1_BUSINESS_UNIT information from schema tags
    enriched_results AS (
        SELECT
            fer.CATALOG_NAME,  -- Catalog name
            fer.SCHEMA_NAME,  -- Schema name
            fer.DATASET_NAME,  -- Dataset name
            dlo.tag_value AS L1_NAME,  -- Business unit (L1) based on schema tags
            fer.RESULT_STATUS,  -- Result status for the dataset
            fer.EXEC_DATE,  -- Execution date of the dataset
            fer.CREATED_AT  -- Timestamp of the execution
        FROM filtered_execution_results fer
        INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} dlo  -- Join with schema tags to get business unit
            ON fer.CATALOG_NAME = SPLIT(dlo.table_full_name, '\\\\.')[0]
            AND fer.SCHEMA_NAME = SPLIT(dlo.table_full_name, '\\\\.')[1]
            AND fer.DATASET_NAME = SPLIT(dlo.table_full_name, '\\\\.')[2]
        WHERE dlo.tag_value = '${businessUnit}'  -- Filter by the specified business unit
    ),
    
    -- Calculate daily dataset status (whether the dataset passed or failed each day)
    daily_dataset_status AS (
        SELECT
            CATALOG_NAME,  -- Catalog name
            SCHEMA_NAME,  -- Schema name
            DATASET_NAME,  -- Dataset name
            L1_NAME,  -- Business unit (L1)
            EXEC_DATE,  -- Execution date
            CASE
                WHEN MIN(CASE WHEN RESULT_STATUS = 'PASSED' THEN 1 ELSE 0 END) = 1 THEN TRUE  -- If at least one execution passed, mark the day as passed
                ELSE FALSE  -- Otherwise, mark the day as failed
            END AS day_passed  -- Boolean value indicating if the dataset passed on that day
        FROM enriched_results
        GROUP BY
            CATALOG_NAME,  -- Group by catalog name
            SCHEMA_NAME,  -- Group by schema name
            DATASET_NAME,  -- Group by dataset name
            L1_NAME,  -- Group by business unit (L1)
            EXEC_DATE  -- Group by execution date
    ),
    
    -- Get the latest execution status for each dataset
    latest_execution_status AS (
        SELECT
            CATALOG_NAME,  -- Catalog name
            SCHEMA_NAME,  -- Schema name
            DATASET_NAME,  -- Dataset name
            L1_NAME,  -- Business unit (L1)
            MAX(EXEC_DATE) AS LATEST_EXEC_DATE,  -- Latest execution date for the dataset
            MAX(
                CASE
                    WHEN EXEC_DATE = (
                        SELECT MAX(EXEC_DATE)  -- Find the latest execution date
                        FROM daily_dataset_status dds2
                        WHERE dds2.CATALOG_NAME = dds.CATALOG_NAME
                          AND dds2.SCHEMA_NAME = dds.SCHEMA_NAME
                          AND dds2.DATASET_NAME = dds.DATASET_NAME
                          AND dds2.L1_NAME = dds.L1_NAME
                    )
                    THEN CASE WHEN day_passed = TRUE THEN 'Succeeded' ELSE 'Failed' END  -- If the latest execution passed, return 'Succeeded', else 'Failed'
                END
            ) AS LAST_RUN_STATUS  -- The status of the last run (either 'Succeeded' or 'Failed')
        FROM daily_dataset_status dds
        GROUP BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, L1_NAME  -- Group by dataset and business unit
    ),
    
    -- Calculate the total number of days in the date range
    date_range_info AS (
        SELECT
            DATEDIFF(DATE('${endDate}'), DATE('${startDate}')) + 1 AS TOTAL_DAYS  -- Calculate total days between start and end dates
    ),
    
    -- Summarize the dataset's performance over the given date range
    dataset_summary AS (
        SELECT
            dds.CATALOG_NAME,  -- Catalog name
            dds.SCHEMA_NAME,  -- Schema name
            dds.DATASET_NAME,  -- Dataset name
            dds.L1_NAME,  -- Business unit (L1)
            SUM(CASE WHEN dds.day_passed = TRUE THEN 1 ELSE 0 END) AS successful_runs,  -- Count of successful runs
            (SELECT TOTAL_DAYS FROM date_range_info) AS TOTAL_RUNS,  -- Total number of days in the range
            MAX(les.LAST_RUN_STATUS) AS LAST_RUN_STATUS,  -- Last status of the dataset
            CONCAT(
                CAST(
                    ROUND(
                        (SUM(CASE WHEN dds.day_passed = TRUE THEN 1 ELSE 0 END) * 100.0)  -- Calculate percentage of successful runs
                        / (SELECT TOTAL_DAYS FROM date_range_info),
                    0
                ) AS INT),
                '%'
            ) AS PERCENT_PASSED_RUNS  -- Percentage of successful runs formatted as a percentage
        FROM daily_dataset_status dds
        JOIN latest_execution_status les  -- Join with latest execution status
            ON dds.CATALOG_NAME = les.CATALOG_NAME
            AND dds.SCHEMA_NAME = les.SCHEMA_NAME
            AND dds.DATASET_NAME = les.DATASET_NAME
            AND dds.L1_NAME = les.L1_NAME
        GROUP BY
            dds.CATALOG_NAME,  -- Group by catalog name
            dds.SCHEMA_NAME,  -- Group by schema name
            dds.DATASET_NAME,  -- Group by dataset name
            dds.L1_NAME  -- Group by business unit (L1)
    )
    
    -- Final selection of dataset summary
    SELECT
        ds.CATALOG_NAME,  -- Catalog name
        ds.SCHEMA_NAME,  -- Schema name
        ds.DATASET_NAME,  -- Dataset name
        ds.L1_NAME,  -- Business unit (L1)
        ds.PERCENT_PASSED_RUNS,  -- Percentage of successful runs
        ds.TOTAL_RUNS,  -- Total number of days (total runs)
        ds.successful_runs,  -- Count of successful runs
        (ds.TOTAL_RUNS - ds.successful_runs) AS failed_runs,  -- Count of failed runs (total - successful)
        ds.LAST_RUN_STATUS  -- Status of the last execution (either 'Succeeded' or 'Failed')
    FROM dataset_summary ds  -- Select from the dataset summary
    ORDER BY
        ds.CATALOG_NAME,  -- Order by catalog name
        ds.SCHEMA_NAME,  -- Order by schema name
        ds.DATASET_NAME;  -- Order by dataset name
  `;
};

// ------------------------------- API ROUTE HANDLER -------------------------------

/**
 * Handles the GET request to retrieve dataset health statistics for a specified business unit over a given date range.
 *
 * This function:
 * - Validates the required query parameters (`startDate` and `endDate`).
 * - Constructs and executes the SQL query to fetch dataset health data.
 * - Logs the result to EventHub for traceability.
 * - Returns the dataset health statistics as a JSON response.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param {object} context - Contains the route parameters.
 * @param {string} context.businessUnit - The business unit to fetch dataset health statistics for.
 *
 * @returns {NextResponse} A JSON response containing the dataset health statistics or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 * 
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - startDate: "2025-11-01"
 *    - endDate: "2025-11-30"
 *  Output:
 *    - 200 OK response with dataset health statistics.
 *    - 400 Bad Request if the query parameters are missing or invalid.
 *    - 500 Internal Server Error if an exception occurs.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,  // The request object contains the details of the incoming API request, such as headers, body, and URL.
  { params }: { params: Promise<{ businessUnit: string }> } // The route parameter containing the business unit name from the URL.
): Promise<NextResponse> {  // The function returns a response that will be sent back to the frontend UI, either data or an error.

  // Track the time when the request is received, this helps to measure how long the request takes to process.
  const requestStartTime = new Date(); // Example: new Date() could be '2026-01-20T14:33:00.000Z'

  // Define the program name for logging purposes, used to identify the API in logs.
  const programName = "DQDSummaryViewDataHealthAPI"; // Example: "DQDSummaryViewDataHealthAPI"

  // Get the user ID from the request headers, if it exists. If no user is identified, mark it as "Anonymous".
  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Example: "user123" or "Anonymous"

  // Extract the business unit from the route parameters (provided in the URL). This identifies the organization or department.
  const { businessUnit } = await params; // Example: "Sales" or "Finance"

  // Parse the query parameters (startDate and endDate) from the URL. These parameters define the time range for the data.
  const { searchParams } = new URL(request.url); // Example: 'http://example.com/api/data?startDate=2026-01-13T00:00:00.000Z&endDate='

  // Retrieve the start date from the query parameters.
  const startDate = searchParams.get("startDate"); // Example: "2026-01-13T00:00:00.000Z"

  // Retrieve the end date from the query parameters.
  const endDate = searchParams.get("endDate"); // Example: "2026-01-20T00:00:00.000Z"

  // Check if the start date and end date are both provided in the query parameters. If not, return a 400 error with a message.
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required query parameters: startDate, endDate" }, // Error message if parameters are missing
      { status: 400 } // 400 status code means "Bad Request"
    );
  }

  try {
    // Attempt to establish a session with Databricks, which is a platform for data storage and processing.
    const session = await getDatabricksSession(); // Example: This function connects to the Databricks service

    // Execute a query to fetch the dataset health statistics based on the business unit and the date range.
    const datasetHealthStats = await executeQuery(
      session, // The Databricks session created earlier
      buildBusinessUnitTimeseriesQuery(businessUnit, startDate, endDate, request) // Constructing a SQL query with the provided business unit, dates, and RBAC scope
    );

    // Log the successful retrieval of data to EventHub. EventHub is used for tracking activities.
    await logToEventHub({
      type: "INFO", // The log type. "INFO" is used for successful operations.
      detailMessage: `Successfully retrieved dataset timeseries stats for business unit='${businessUnit}' from ${startDate} to ${endDate}.`,
      // Detailed message describing the operation
      programName, // The program name to identify the source of the log
      startDatetime: requestStartTime, // The timestamp of when the request started
      status: "SUCCESS", // The operation was successful
      actionType: "Spark_SQL_Query", // The action type is a Spark SQL query in this case
      actionDescription: `Fetch Dataset Health Timeseries for business unit: ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // A description of what was done, in this case fetching data from a specific table
      l1Tag: businessUnit, // Tag to categorize the log by business unit
      user, // The user who made the request (could be "Anonymous" if no user is identified)
    });

    // Return the dataset health statistics as a JSON response to the frontend.
    return NextResponse.json(datasetHealthStats); // Sends the data back to the frontend UI in JSON format

  } catch (error: any) {
    // If an error occurs at any point during the process (e.g., Databricks session fails or query execution fails), this block is executed.

    // Create a readable error message that includes the business unit, start date, and end date, as well as the error details.
    const errorMessage = `Failed to retrieve dataset timeseries stats for BU='${businessUnit}' from ${startDate} to ${endDate}. Error: ${error?.message ?? "Unknown error"}`;
    // Example error message: "Failed to retrieve dataset timeseries stats for BU='Sales' from 2026-01-13T00:00:00.000Z to 2026-01-20T00:00:00.000Z. Error: Connection timeout"

    console.error(errorMessage);
    // Print error in server logs for debugging
    
    // Log the error to EventHub for tracking purposes.
    await logToEventHub({
      type: "ERROR", // The log type. "ERROR" is used when something goes wrong.
      detailMessage: errorMessage, // The error message that explains what happened
      programName, // The program name for tracking
      startDatetime: requestStartTime, // The timestamp of when the request started
      status: "FAILED", // The operation failed
      actionType: "Spark_SQL_Query", // The action that failed was a SQL query
      actionDescription: `Failed to fetch Dataset Health Timeseries for business unit: ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // A description of the failed action
      l1Tag: businessUnit, // Tag for categorizing the error by business unit
      user, // The user who made the request
    });

    // Return a 500 status code, indicating a server-side error, along with the error message in the response.
    return NextResponse.json(
      { error: errorMessage }, // Send the error message as part of the response
      { status: 500 } // 500 status code means "Internal Server Error"
    );
  }
});


