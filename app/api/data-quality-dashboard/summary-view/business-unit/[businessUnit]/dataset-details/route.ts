/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script handles the retrieval of dataset details for a specific business unit.
    It performs the following tasks:
    - Executes a SQL query to fetch dataset details from the database.
    - Logs the success or failure of the operation to EventHub.
    - Returns the results as a JSON response.
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
} from "@/constants/config"; // Project-level configuration constants

import { parseFullyQualifiedDatasetName } from "@/lib/helper";

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


// ----------------------------- SQL QUERY BUILDER -----------------------------

/**
 * Constructs the SQL query to retrieve dataset details for the specified business unit, dataset, and filtering criteria.
 *
 * @param {string} businessUnit - The business unit name to filter by.
 * @param {string} catalogName - The catalog name to filter by.
 * @param {string} schemaName - The schema name to filter by.
 * @param {string} datasetName - The dataset name to filter by.
 * @param {string} resultStatus - The result status (e.g., 'FAILED') to filter by.
 * @param {string | null} ruleCategory - Optional filter for rule category.
 * @param {string | null} ruleType - Optional filter for rule type.
 * @param {string | null} ruleName - Optional filter for rule name.
 *
 * @returns {string} The SQL query string to execute.
 *
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - catalogName: "MainCatalog"
 *    - schemaName: "SalesSchema"
 *    - datasetName: "Dataset1"
 *    - resultStatus: "FAILED"
 *  Output:
 *    A SQL query string that retrieves the relevant dataset details.
 */
const buildDatasetDetailsQuery = (
  businessUnit: string, // Business Unit filter (example: "Retail")
  catalogName: string, // Catalog filter (example: "MainCatalog")
  schemaName: string, // Schema filter (example: "SalesSchema")
  datasetName: string, // Dataset filter (example: "Dataset1")
  resultStatus: string, // Result status filter (example: "FAILED")
  ruleCategory: string | null, // Optional filter: rule category (example: "metadata")
  ruleType: string | null, // Optional filter: rule type (example: "Freshness")
  ruleName: string | null, // Optional filter: rule name (example: "Null_Check")
  request: NextRequest // Current request carrying RBAC scope headers from withAuthorization
): string => {
  // This function builds a SQL query string like building a report request using filters

  // Build an RBAC row filter from the user's Data Quality group scopes.
  // Example: dataset=customer_master adds an extra dataset check to this detailed SQL query.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns()
  );

  return `
    -- Select specific fields related to data integrity execution results
    SELECT
      RULE_TYPE,  -- Type of the rule that was applied (e.g., "timeliness_check")
      RULE_NAME,  -- Name of the rule being executed (e.g., "check_1")
      COLUMN_NAME,  -- Name of the column being checked in the dataset
      ALERT_TYPE,  -- Type of alert generated (e.g., "Critical", "Warning")
      DETAILS  -- The brief description of the details from the rule execution
    FROM (
      -- Inner query to retrieve the most recent result for each CONFIG_ID
      SELECT
        DETAILS:brief_description AS DETAILS,  -- Brief description from the rule's execution details
        RULE_TYPE,  -- The type of rule applied (e.g., data quality, timeliness)
        RULE_NAME,  -- The name of the rule applied
        DETAILS:column_name AS COLUMN_NAME,  -- The name of the column being validated in the dataset
        DETAILS:alert_type AS ALERT_TYPE,  -- The type of alert generated based on the rule
        ROW_NUMBER() OVER (PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC) AS rn  -- Row numbering to get the latest result for each CONFIG_ID
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}  -- Data integrity execution results table
      WHERE
        L1_BUSINESS_UNIT = '${businessUnit}'  -- Filter by the specified business unit
        AND CATALOG_NAME = '${catalogName}'  -- Filter by the specified catalog name
        AND SCHEMA_NAME = '${schemaName}'  -- Filter by the specified schema name
        AND DATASET_NAME = '${datasetName}'  -- Filter by the specified dataset name
        ${ruleCategory ? `AND RULE_CATEGORY = '${ruleCategory}'` : ""}  -- Optionally filter by rule category if provided
        ${ruleType ? `AND RULE_TYPE = '${ruleType}'` : ""}  -- Optionally filter by rule type if provided
        ${ruleName ? `AND RULE_NAME = '${ruleName}'` : ""}  -- Optionally filter by rule name if provided
        AND RESULT_STATUS = '${resultStatus}'  -- Filter by the specified result status (e.g., 'PASSED', 'FAILED')
        ${rbacScopeClause}
        -- RBAC data-scope filter: prevents rows outside the user's assigned groups from appearing
    )
    -- Outer query to select only the most recent (latest) result for each CONFIG_ID (rn = 1)
    WHERE
      rn = 1  -- Ensure that only the most recent result (row number = 1) is selected for each CONFIG_ID
  `;
};

// ------------------------------- API ROUTE HANDLER -------------------------------

/**
 * The handler for the GET request to fetch dataset details for a specific business unit.
 *
 * This function:
 * - Retrieves the dataset name and other optional parameters from the request.
 * - Validates and parses the dataset name.
 * - Executes the SQL query to fetch dataset details.
 * - Logs the operation's success or failure to EventHub.
 * - Returns the result as a JSON response.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param {object} context - Contains the route parameters.
 * @param {string} context.businessUnit - The business unit to fetch dataset details for.
 *
 * @returns {NextResponse} A JSON response containing the dataset details or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 * 
 * Example:
 *  Input:
 *    - businessUnit: "Retail"
 *    - datasetName: "Dataset1"
 *  Output:
 *    - 200 OK response with dataset details.
 *    - 400 Bad Request if datasetName format is invalid.
 *    - 500 Internal Server Error if there's an issue executing the query.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // Incoming request from frontend/dashboard
  // Route parameter object (contains businessUnit name from URL)
  { params }: { params: Promise<{ businessUnit: string }> }
): // Route parameters include businessUnit (from URL path)
Promise<NextResponse> {
  const requestStartTime = new Date(); // Record the start time of the request
  // Save start time to measure request duration

  const programName = "DQDSummaryViewDatasetDetailsAPI"; // Name of the program making the request
  // Used to label logs so they can be searched in Splunk/EventHub

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from request headers
  // Identify who requested dataset details (audit). Default = Anonymous

  const { businessUnit } = await params; // Extract the business unit from the route parameters
  // Business unit comes from API URL (example: /api/Retail/details)

  const { searchParams } = new URL(request.url);
  // Parse query parameters from URL (?datasetName=...&ruleType=...)

  // Retrieve search parameters for the dataset details query
  const fullDatasetName = searchParams.get("datasetName");
  // Dataset name from query param (expected in fully qualified format like catalog.schema.dataset)

  const resultStatus = searchParams.get("resultStatus") ?? "FAILED";
  // Read resultStatus filter; default to FAILED if user did not send it

  const ruleCategory = searchParams.get("ruleCategory");
  // Read optional ruleCategory filter

  const ruleType = searchParams.get("ruleType");
  // Read optional ruleType filter

  const ruleName = searchParams.get("ruleName");
  // Read optional ruleName filter

  // Log the start of the request processing
  console.debug(
    `[${programName}] Starting to process GET request for Business Unit: ${businessUnit}`
  );
  // Debug statement helps trace request start in backend logs

  // Validate and parse the dataset name
  const parsedDataset = parseFullyQualifiedDatasetName(fullDatasetName!);
  // Convert full dataset name string into catalogName/schemaName/datasetName

  if (!parsedDataset) {
    // If parsing fails, dataset format is wrong and query cannot run

    console.error(
      `[${programName}] Invalid dataset name format: ${fullDatasetName}`
    );
    // Log invalid input format for debugging

    return NextResponse.json(
      { error: "Invalid datasetName format" },
      // Return clear message to frontend

      { status: 400 }
      // HTTP 400 means request is incorrect (invalid datasetName)
    );
  }

  const { catalogName, schemaName, datasetName } = parsedDataset;
  // Extract catalog, schema, dataset from parsed object (like splitting a file path)

  try {
    // Try block: normal success flow

    // Log the parsed dataset details for debugging
    console.debug(`[${programName}] Parsed Dataset Details: `, parsedDataset);
    // Print parsed dataset details so we confirm correct inputs are being used

    // Establish a Databricks session
    const session = await getDatabricksSession();
    // Connect to Databricks so SQL can be executed

    // Log the query execution start
    console.debug(
      `[${programName}] Executing query for Business Unit: ${businessUnit}`
    );
    // Debug log before executing SQL

    // Execute the SQL query to fetch dataset details
    const datasetDetails = await executeQuery(
      session,
      buildDatasetDetailsQuery(
        businessUnit,
        catalogName,
        schemaName,
        datasetName,
        resultStatus,
        ruleCategory,
        ruleType,
        ruleName,
        request
      )
    );
    // Build SQL query using filters and execute it to fetch dataset rule details

    // Log success to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO indicates request succeeded
      detailMessage: `Successfully retrieved dataset details for Business Unit '${businessUnit}' in Dataset: '${datasetName}', Catalog: '${catalogName}' and schema: '${schemaName}'.`,
      // Log message for monitoring tools
      programName,
      // Identify which API logged this message
      startDatetime: requestStartTime,
      // Used to calculate how long request took
      status: "SUCCESS",
      // Mark request as successful
      actionType: "Spark_SQL_Query",
      // This action is Databricks SQL query
      actionDescription: `Fetch dataset details for Business Unit: '${businessUnit}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what query was done and which table was accessed
      l1Tag: businessUnit,
      // Tag log with business unit so it can be filtered by BU
      user,
      // User who requested details
    });

    // Return the result as a JSON response
    console.debug(
      `[${programName}] Successfully retrieved dataset details for ${businessUnit}`
    );
    // Debug log to show API finished successfully

    return NextResponse.json(datasetDetails);
    // Send details back to frontend (used to show rule details in UI)
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Error retrieving dataset details for Business Unit '${businessUnit}' in Dataset: '${datasetName}', Catalog: '${catalogName}' and schema: '${schemaName}': ${
      error?.message ?? "Unknown error"
    }`;
    // Extract readable message; fallback default

    // Log error to EventHub if an exception occurs
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed

      detailMessage: errorMessage,
      // Store detailed failure message
      programName,
      // Identify API that failed
      startDatetime: requestStartTime,
      // Used to measure time-to-failure
      status: "FAILED",
      // Mark request failed
      actionType: "Spark_SQL_Query",
      // Failure category: SQL query
      actionDescription: `Failed to fetch dataset details for Business Unit: '${businessUnit}' from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what failed and where (table reference)
      l1Tag: businessUnit,
      // BU tag for grouping errors
      user,
      // Capture user for audit/debug
    });

    // Log the error to the console
    console.error(
      `[${programName}] Error occurred for Business Unit: ${businessUnit}`,
      error
    );
    // Print full error object including stack trace

    // Return error response
    return NextResponse.json(
      { error: errorMessage },
      // Send readable error message back to client
      { status: 500 }
      // HTTP 500 = backend failure (frontend can display an error message)
    );
  }
});
