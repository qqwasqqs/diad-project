/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script is part of the Teva Data Integrity Automation Dashboard's API layer. 
    It fetches the update history for the data quality configuration based on the provided filter criteria, 
    including the operation type, user email, and date range.
    - It processes the input parameters (`email`, `operation`, `startDate`, `endDate`) to retrieve relevant audit logs from the database.
    - Logs both success and failure to Event Hub for traceability and monitoring purposes.
*/

/* ----------------------------- IMPORTS -------------------------------- */

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
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */ 

// Replace '_mng' with '_audit_mng'
const auditTable = (table: string) => table.replace('_mng', '_audit_mng');

/**
 * SQL query to retrieve distinct users who have performed update operations on the data quality configuration.
 * @param table - The table where updates are made.
 * @returns {string} A SQL query string that fetches the users from the data quality audit table.
 */
const buildListDistinctUsersQuery = (table: string): string => {
  // Function that prepares and returns the SQL query as a plain text string
  // This query returns a list of unique users who updated the configuration

  return `
    -- Select distinct UPDATED_BY from the data quality config audit table
    SELECT DISTINCT
      dqcam.UPDATED_BY  -- The 'UPDATED_BY' field represents the email of the person who made the update
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${auditTable(table)} dqcam  -- From the data quality audit table in the specified catalog and schema
    JOIN 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${table} dqcm 
      ON dqcm.CONFIG_ID = dqcam.CONFIG_ID
    WHERE dqcm.CONFIG_ID IS NOT NULL
    ORDER BY dqcam.UPDATED_BY;  -- Order the results by UPDATED_BY in ascending order (alphabetically)
    -- This query fetches unique users that have made updates to the data quality configuration, sorted alphabetically.
  `;
};

/**
 * Generates the SQL query for retrieving the update history of data quality configurations.
 *
 * @param table - The table where updates are made.
 * @param email - The email of the user who performed the operation (use 'All' for no filter).
 * @param operation - The type of operation to filter by (use 'All' for no filter).
 * @param startDate - The start date for the date range filter.
 * @param endDate - The end date for the date range filter.
 * @returns A string containing the SQL query to retrieve the update history.
 */
const buildUpdateHistoryQuery = (
  // Define a helper function that builds SQL based on filter values
  table: string, // Table filter input (ex: "data_quality_config")
  email: string, // Email filter input (ex: "john.doe@teva.com" or "All")
  operation: string, // Operation filter input (ex: "UPDATE" or "INSERT" or "All")
  startDate: string, // Start date filter input (ex: "2026-01-01")
  endDate: string // End date filter input (ex: "2026-01-31")
): string => {
  // This function builds a SQL query string based on filter inputs

  // Conditional column selection based on the table name
  const ruleColumn = table === "kpi_quality_config_mng" ? "KPI_NAME" : "RULE_NAME";

  return `
    -- Select various fields related to data quality audit information from the audit table
    SELECT
      dqcm.CONFIG_ID,
      dqcm.${ruleColumn} AS RULE_NAME, -- Dynamically select KPI_NAME or RULE_NAME based on table name
      CONCAT(dqcm.CATALOG_NAME, '.', dqcm.SCHEMA_NAME, '.', dqcm.DATASET_NAME) AS DATASET_NAME,
      dqcam.COLUMN_NAME, -- The name of the column being updated
      dqcam.COLUMN_VALUE, -- The new value of the column after the update
      dqcam.UPDATED_AT,  -- The timestamp of when the update was made
      dqcam.UPDATED_BY,  -- The email of the person who performed the update
      dqcam.VALID_FROM, -- The date from which the data is valid
      dqcam.OPERATION -- The type of operation performed (e.g., INSERT, UPDATE, DELETE)
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${auditTable(table)} dqcam  -- From the data quality audit table in the specified catalog and schema
    JOIN 
      ${CATALOG_NAME}.${SCHEMA_NAME}.${table} dqcm 
      ON dqcm.CONFIG_ID = dqcam.CONFIG_ID
    WHERE (dqcam.IS_ACTIVE = TRUE OR dqcam.OPERATION = 'DELETE')
      AND dqcam.UPDATED_AT >= '${startDate}'  -- Filter for updates made after the specified start date
      AND dqcam.UPDATED_AT <= '${endDate}'  -- Filter for updates made before the specified end date
      ${operation !== "All" ? `AND dqcam.OPERATION = '${operation}'` : ""}  -- If an operation filter is provided, apply it (e.g., only 'UPDATE' or 'INSERT')
      ${email !== "All" ? `AND dqcam.UPDATED_BY = '${email}'` : ""}  -- If an email filter is provided, apply it to show updates made by a specific user
    ORDER BY dqcam.UPDATED_AT DESC, dqcam.OPERATION DESC;  -- Order the results first by operation in descending order, then by column name in ascending order
    -- This query fetches details about data quality configuration updates within the specified date range,
    -- with optional filters for operation type and the person who made the update, and orders the results accordingly.
  `;
};

/**
 * SQL query to retrieve distinct users who have performed update operations on the data quality configuration.
 * @param table - The table where updates are made.
 * @param configId - The configId where updates are made.
 * @param columnName - The columnName where updates are made.
 * @returns {string} A SQL query string that fetches the users from the data quality audit table.
 */
const buildUpdateHistoryDetailsQuery = (table: string, configId: string, columnName: string): string => {
  // Function that prepares and returns the SQL query as a plain text string
  // This query returns a list of unique users who updated the configuration

  return `
    -- Select distinct UPDATED_BY from the data quality config audit table
    SELECT 
      COLUMN_VALUE,  -- The new value of the column after the update
      OPERATION,  -- The type of operation performed (e.g., INSERT, UPDATE, DELETE)
      UPDATED_AT,  -- The timestamp of when the update was made
      UPDATED_BY,  -- The email of the person who performed the update
      IS_ACTIVE,  -- Whether the entry is currently active (1 for active, 0 for inactive)
      VALID_FROM,  -- The date from which the data is valid
      VALID_TO,  -- The date until which the data is valid
      COMMIT_VERSION -- The operation performed commit version
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${auditTable(table)}  -- From the data quality audit table in the specified catalog and schema
    WHERE CONFIG_ID = '${configId}'
      AND COLUMN_NAME = '${columnName}'
    ORDER BY UPDATED_AT DESC;  -- Order the results by UPDATED_BY in ascending order (alphabetically)
    -- This query fetches unique users that have made updates to the data quality configuration, sorted alphabetically.
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve the update history of data quality configuration based on filter criteria.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the request parameters like email, operation, startDate, and endDate.
 * @returns A JSON response containing the update history records or an error message if something goes wrong.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs when frontend calls the API using GET
  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date(); // Save the start time (like starting a stopwatch to measure API execution time)
  const programName = "GovernanceConfigurationUpdatesHistoryAPI"; // Name of the API used in logs for identification
  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Read user from request header; fallback to Anonymous if not provided

  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url); // Parse request URL so we can read query parameters (?startDate=...&endDate=...)

  const type = searchParams.get("type");
  // Extract the primary type parameter to decide which query to execute

  const table = searchParams.get("table");
  // Get table filter value from query string

  // Validate required query parameters.
  if (!type || !table) {
    // If any required parameter is missing, we cannot run the report/query correctly

    const errorMessage = "Missing required query parameters: type, table";
    // Prepare a readable error message explaining what is missing

    console.error(errorMessage); // Log the error for debugging purposes.
    // Print error to server logs so developers/support can quickly diagnose the problem

    // Return a 400 Bad Request response if any required parameter is missing.
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // Return a friendly JSON error message; HTTP status 400 means "request was invalid"
  }

  try {
    // Try block: normal successful workflow runs here

    // Log the start of the process to Event Hub.
    console.info(`Starting to fetch configuration updates history for type: ${type}`);
    // Print a message showing what report is being generated (which user + what date range)

    // Get a Databricks session for query execution
    const session = await getDatabricksSession(); // Open or reuse connection session to Databricks

    let query: string;

    // Use switch statement to decide the query based on 'type'
    switch (type) {
      // Start of switch statement that routes to different query builders based on the 'type' parameter

      case "listDistinctUsers": {
         // Build the SQL query using the provided parameters
         query = buildListDistinctUsersQuery(table); // Create SQL query text using filters (like generating a report request)
         break;
         // Exit switch case to prevent execution of other cases
      }

      case "updateHistory": {
        // Get startDate value from query string
        const startDate = searchParams.get("startDate");
        // Get endDate value from query string
        const endDate = searchParams.get("endDate");
        // Get operation filter value from query string
        const operation = searchParams.get("operation");
        // Get email filter value from query string
        const email = searchParams.get("email");

        // Validate query parameters and return a 400 error if any are missing
        if (!startDate || !endDate || !operation || !email) {
          // Check if required filters are missing
          return NextResponse.json(
            // Return response immediately without hitting database
            {
              error:
                "Missing required query parameters: email, operation, startDate, endDate, table",
            }, // Tell frontend what is missing
            { status: 400 } // HTTP 400 means “bad request” (client forgot to send required inputs)
          ); // End response
        }
        // Build the SQL query using the provided parameters
        query = buildUpdateHistoryQuery(table, email, operation, startDate, endDate); // Create SQL query text using filters (like generating a report request)
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "updateHistoryDetails": {
        // Get operation filter value from query string
        const configId = searchParams.get("configId");
        // Get email filter value from query string
        const columnName = searchParams.get("columnName");

        // Validate query parameters and return a 400 error if any are missing
        if (!configId || !columnName) {
          // Check if required filters are missing
          return NextResponse.json(
            // Return response immediately without hitting database
            {
              error:
                "Missing required query parameters: configId, columnName",
            }, // Tell frontend what is missing
            { status: 400 } // HTTP 400 means “bad request” (client forgot to send required inputs)
          ); // End response
        }
        // Build the SQL query using the provided parameters
        query = buildUpdateHistoryDetailsQuery(table, configId, columnName); // Create SQL query text using filters (like generating a report request)
        break;
        // Exit switch case to prevent execution of other cases
      }

      default:
        // Default case: Handle any unrecognized query type values
        return NextResponse.json(
          // Return error response to client with HTTP 400 status
          { error: `Invalid query type: ${type}` },
          // Error message including the invalid type value that was provided
          { status: 400 },
          // HTTP 400 Bad Request status code
        );
      // End default case response
    }

    // Execute the query to retrieve update history records
    const updateHistoryData = await executeQuery(session, query); // Run the query in Databricks and collect returned rows

    // Log the success event to Event Hub
    await logToEventHub({
      // Send structured success log to Azure Event Hub (used for Splunk monitoring)
      type: "INFO", // Mark as informational log
      detailMessage: `Successfully retrieved configuration updates history type: ${type} for user: ${user}`, // Message describing success
      programName, // API/program name
      startDatetime: requestStartTime, // Start time used for duration calculation
      status: "SUCCESS", // Indicate operation succeeded
      actionType: "Spark_SQL_Query", // Indicates action performed was SQL query execution
      actionDescription: `Fetched configuration updates history from table: ${table}`, // Describe what data was fetched
      user, // Record which user requested this API call
    }); // End Event Hub log

    // Return the update history records as a JSON response
    return NextResponse.json(updateHistoryData); // Send update history data back to frontend as JSON
  } catch (error: any) {
    // Catch block: runs if anything fails (DB error, invalid SQL, connection problem)
    // Log the error event to Event Hub
    const errorMessage = `Error retrieving configuration updates history type: ${type} for user: ${user}. Error message: ${error?.message ??
      "Unknown error occurred while retrieving configuration updates history."
      }`; // Extract readable message; fallback default text
    console.error(errorMessage, error.stack); // Print error details to server logs for debugging

    await logToEventHub({
      // Send structured failure log to Event Hub for monitoring and audit
      type: "ERROR", // Mark as ERROR because API failed
      detailMessage: errorMessage, // Provide failure details message
      programName, // API name
      startDatetime: requestStartTime, // Start time helps calculate how long the API ran before failing
      status: "FAILED", // Mark status as failed for dashboards and alerts
      actionType: "Spark_SQL_Query", // Indicates failure happened during SQL query execution
      actionDescription: `Failed to fetch configuration updates history from table: ${table}`, // Describe intended action for context
      user, // Record which user experienced this failure
    }); // End Event Hub error log

    // Return a 500 Internal Server Error response with the error message
    return NextResponse.json(
      // Respond to frontend so it can show an error message
      { error: errorMessage }, // JSON response body containing error information
      { status: 500 } // HTTP 500 means server-side failure (system error, not user mistake)
    ); // End error response
  } // End catch block
}); // End API route handler
