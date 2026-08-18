/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script handles the retrieval of failed rule categories for a specific business unit.
    It performs the following tasks:
    - Executes a SQL query to get the failed rule categories from the database.
    - Logs the success or failure of the operation to EventHub.
    - Returns the result as a JSON response.
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

// ----------------------------- SQL QUERY -----------------------------

/**
 * Generates an SQL query to retrieve the distinct rule categories with a "FAILED" result for the given business unit.
 *
 * @param {string} businessUnit - The name of the business unit to filter the results by.
 * @returns {string} The SQL query string.
 *
 * Example:
 *  businessUnit = "Retail"
 *  returns:
 *  "SELECT DISTINCT RULE_CATEGORY FROM latest_results WHERE rn = 1 AND RESULT_STATUS = 'FAILED'"
 */
const buildFailedRuleCategoriesQuery = (
  businessUnit: string,
  request: NextRequest
): string => {
  // Helper function that builds the SQL text dynamically based on the selected business unit

  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: rule_category=metadata limits this category list to metadata rows only.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  return `
    -- Start of SQL query: fetch "failed rule categories" for a business unit

    WITH latest_results AS (
      -- Create a temporary result set that keeps only the latest execution record per CONFIG_ID

      SELECT
        *,
        -- Select all columns from execution results (like selecting every column in an Excel sheet)

        ROW_NUMBER() OVER (
          -- Create a ranking number so we can identify which row is latest
          PARTITION BY CONFIG_ID
          -- Group records by CONFIG_ID (each rule configuration)
          ORDER BY RUN_ID DESC
          -- Sort latest runs first (highest RUN_ID = most recent execution)
        ) AS rn
        -- rn = 1 means "latest run record" for that CONFIG_ID

      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
      -- Main execution results table (contains rule execution outcomes)

      INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
        -- Join allowed_tables_with_tags to map schemas to business units

        ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

        AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
        -- Link execution result schema name to allowed_tables_with_tags table
  
        AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]
        
      WHERE st.tag_value = '${businessUnit}'
      -- Keep only rows that belong to this business unit (like filtering a report to one BU)
        ${rbacScopeClause}
        -- RBAC data-scope filter: only include rows allowed by the user's assigned groups
    )

    SELECT DISTINCT RULE_CATEGORY
    -- Return only unique rule categories (no duplicates)

    FROM latest_results
    -- Read from the prepared latest_results dataset

    WHERE rn = 1 AND RESULT_STATUS = 'FAILED'
    -- Only include latest run records AND only those that failed
  `;
};

// ------------------------------- API ROUTE HANDLER --------------------------------

/**
 * The handler for the GET request to fetch failed rule categories for a specific business unit.
 *
 * This function executes the SQL query to retrieve the failed rule categories, logs the results to EventHub,
 * and returns the results as a JSON response.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param {object} context - Contains the route parameters.
 * @param {string} context.businessUnit - The business unit to filter the rule categories.
 *
 * @returns {NextResponse} A JSON response containing the failed rule categories or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 * 
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *  Output:
 *    - 200 OK response with a list of failed rule categories.
 *    - 500 Internal Server Error if the query fails.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // Incoming HTTP request from frontend/dashboard
  // Route parameter object (contains businessUnit name from URL)
  { params }: { params: Promise<{ businessUnit: string }> }
): // Route parameters include businessUnit (example URL: /api/ruleCategories/Retail)
Promise<NextResponse> {
  const requestStartTime = new Date(); // Record the start time of the request
  // Save the start time (like starting a stopwatch)

  const programName = "DQDSummaryViewRuleCategoriesAPI"; // Name of the program making the request
  // Used in logs to identify which API generated messages

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from the request headers
  // Identify user for auditing; fallback to Anonymous if header missing

  const { businessUnit } = await params; // Extract the business unit from route parameters
  // Read businessUnit from URL route (example: "Retail")

  // Log the start of the request processing
  console.debug(
    `[${programName}] Starting to process GET request for Business Unit: ${businessUnit}`
  );
  // Debug log that API started processing

  try {
    // Try block = normal successful execution path

    // Establish a Databricks session
    const session = await getDatabricksSession();
    // Connect/reuse Databricks session (like logging into database)

    // Log the query execution start
    console.debug(
      `[${programName}] Executing query for Business Unit: ${businessUnit}`
    );
    // Debug log telling which business unit query is being executed for

    // Execute the SQL query to fetch failed rule categories
    const rows = await executeQuery(
      session,
      buildFailedRuleCategoriesQuery(businessUnit, request)
    );
    // Run SQL query in Databricks and store returned rows (list of rule categories)

    // Log success to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful operation
      detailMessage: `Successfully retrieved failed rule categories for Business Unit '${businessUnit}'.`,
      // Human-friendly success message for Splunk/EventHub
      programName,
      // Which API created this log
      startDatetime: requestStartTime,
      // Used to compute execution time
      status: "SUCCESS",
      // Mark request as success
      actionType: "Spark_SQL_Query",
      // Action performed: SQL query executed in Databricks
      actionDescription: `Fetch Failed Rule Categories for ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what the query fetched and from where
      l1Tag: businessUnit,
      // Tag log with business unit for filtering logs by BU
      user,
      // User who triggered the request
    });

    // Return the result as a JSON response
    console.debug(
      `[${programName}] Successfully retrieved data for ${businessUnit}`
    );
    // Debug log confirming data retrieval succeeded

    return NextResponse.json(rows);
    // Send list of failed rule categories back to frontend for display (dropdown/table)
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Error retrieving failed rule categories for Business Unit '${businessUnit}': ${
      error.message || "Unknown error"
    }`;
    // Extract readable message; fallback default

    // Log error to EventHub if an exception occurs
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failure
      detailMessage: errorMessage,
      // Store failure reason in monitoring tools
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Start time helps measure how long it ran before failing
      status: "FAILED",
      // Mark status as failed
      actionType: "Spark_SQL_Query",
      // Failure happened during SQL query execution
      actionDescription: `Failed to fetch Failed Rule Categories for ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what failed and which table/action was involved
      l1Tag: businessUnit,
      // Tag error log with business unit so alerts can be BU-specific
      user,
      // Store user who triggered failure for audit
    });

    // Log the error to the console
    console.error(
      `[${programName}] Error occurred for Business Unit: ${businessUnit}`,
      errorMessage
    );
    // Print detailed error in backend logs for debugging (includes stack trace)

    // Return error response
    return NextResponse.json(
      { error: errorMessage },
      // Send readable error back to frontend UI
      { status: 500 }
      // HTTP 500 indicates server/system issue
    );
  }
});
