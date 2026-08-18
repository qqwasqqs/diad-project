/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This API route is responsible for retrieving the data refresh status of datasets within the data integrity system.
    - It fetches information about the refresh status (refreshed or unrefreshed) for datasets based on specific rules and business units.
    - The query is executed against a Databricks database, and results are returned in JSON format.
    - Both successful and error events are logged for monitoring and traceability.
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

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeAndClause,
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY ------------------------------ */

/**
 * Generates an SQL query to fetch the data refresh status for datasets.
 * This query checks whether datasets have been refreshed (passed the timeliness check)
 * or unrefreshed (failed the timeliness check) within a given rule category and business unit.
 *
 * @param businessUnit - The L1 business unit to filter by (optional)
 * @param ruleCategory - The category of the rule to filter by (optional)
 * @returns SQL query string to fetch data refresh details
 */
const generateDataRefreshQuery = (
  startDate: string,
  endDate: string,
  businessUnit: string | null,
  ruleCategory: string | null,
  request: NextRequest
) => {
  // Build the RBAC row filter from the user's group scopes.
  // Example: business_unit=Finance and rule_category=metadata becomes an AND filter on di columns.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Return the SQL query with RBAC data-scope control applied in the base CTE.
  return `
  -- CTE to get the latest execution results for each dataset
  WITH latest_results AS (
    SELECT
      di.L1_BUSINESS_UNIT, -- Business unit from schema tags
      di.catalog_name, -- Catalog name from data integrity execution results
      di.schema_name, -- Schema name
      di.dataset_name, -- Dataset name
      di.RESULT_STATUS, -- Result status of the execution (PASSED/FAILED)
      di.RULE_CATEGORY, -- Rule category (e.g., 'timeliness_check')
      di.RULE_NAME, -- Name of the rule that was executed
      di.DETAILS:brief_description AS DETAILS,
      di.CREATED_AT, -- Timestamp when the result was created
      ROW_NUMBER() OVER (PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC) AS rn -- Row number to get the latest result per dataset
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags table to map schema → business unit

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]
    WHERE 1 = 1
      -- Base WHERE lets RBAC add AND filters without changing the rest of the query shape
      ${rbacScopeClause}
      -- RBAC data-scope filter: only include dataset rows allowed by this user's groups
  ),
  
  -- CTE to get datasets with a 'PASSED' timeliness check rule
  refreshed_datasets AS (
    SELECT
      L1_BUSINESS_UNIT,
      RULE_CATEGORY,
      catalog_name,
      schema_name,
      dataset_name,
      DETAILS,
      CREATED_AT as refreshed_at -- Timestamp when the dataset was refreshed
    FROM
      latest_results
    WHERE
      rn = 1 -- Only consider the latest result per dataset
      AND RULE_NAME = 'timeliness_check' -- Filter by timeliness_check rule
      AND RESULT_STATUS = 'PASSED' -- Only include datasets that passed the check
  ),
  
  -- CTE to get datasets with a 'FAILED' timeliness check rule
  unrefreshed_datasets AS (
    SELECT
      L1_BUSINESS_UNIT,
      RULE_CATEGORY,
      catalog_name,
      schema_name,
      dataset_name,
      DETAILS,
      CREATED_AT as not_refreshed_at -- Timestamp when the dataset failed the check
    FROM
      latest_results
    WHERE
      rn = 1 -- Only consider the latest result per dataset
      AND RULE_NAME = 'timeliness_check' -- Filter by timeliness_check rule
      AND RESULT_STATUS = 'FAILED' -- Only include datasets that failed the check
  ),
  
  -- Final CTE to combine refreshed and unrefreshed datasets
  final AS (
    SELECT
      'Refreshed' AS refresh_status, -- Label datasets as 'Refreshed'
      L1_BUSINESS_UNIT,
      RULE_CATEGORY,
      catalog_name || '.' || schema_name || '.' || dataset_name AS dataset_name, -- Full dataset name (catalog.schema.dataset)
      refreshed_at AS timestamp, -- Timestamp for the refreshed dataset
      DETAILS
    FROM
      refreshed_datasets
    UNION ALL
    SELECT
      'Unrefreshed' AS refresh_status, -- Label datasets as 'Unrefreshed'
      L1_BUSINESS_UNIT,
      RULE_CATEGORY,
      catalog_name || '.' || schema_name || '.' || dataset_name AS dataset_name, -- Full dataset name (catalog.schema.dataset)
      not_refreshed_at AS timestamp, -- Timestamp for the unrefreshed dataset
      DETAILS
    FROM
      unrefreshed_datasets  
  )
  
  -- Final select to count and aggregate dataset statuses
  SELECT
    COUNT_IF(refresh_status = 'Refreshed') AS refreshed_datasets, -- Count the number of refreshed datasets
    COUNT_IF(refresh_status = 'Unrefreshed') AS unrefreshed_datasets, -- Count the number of unrefreshed datasets
    GREATEST(
      MAX(CASE WHEN refresh_status = 'Refreshed' THEN timestamp END), -- Get the latest timestamp for refreshed datasets
      MAX(CASE WHEN refresh_status = 'Unrefreshed' THEN timestamp END) -- Get the latest timestamp for unrefreshed datasets
    ) AS last_refresh_timestamp, -- The most recent timestamp across all datasets
    COLLECT_LIST(named_struct(
      'refresh_status', refresh_status, -- Status of refresh (Refreshed/Unrefreshed)
      'L1_BUSINESS_UNIT', L1_BUSINESS_UNIT, -- Business unit of the dataset
      'RULE_CATEGORY', RULE_CATEGORY, -- Rule category of the dataset
      'dataset_name', dataset_name, -- Full name of the dataset
      'timestamp', timestamp, -- Timestamp of the refresh
      'DETAILS', details
    )) FILTER (WHERE refresh_status='Unrefreshed') AS datasets -- Collect detailed dataset info into a list
  FROM
    final  
  WHERE timestamp >= '${startDate}'
  AND timestamp <= '${endDate}'

  -- Apply optional filters for business unit and rule category if provided
  ${businessUnit ? `AND L1_BUSINESS_UNIT = '${businessUnit}'` : ""}  
  ${ruleCategory ? `AND RULE_CATEGORY = '${ruleCategory}'` : ""} 
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch the data refresh status of datasets.
 * It accepts query parameters for `businessUnit` and `ruleCategory` to filter the results.
 * The function executes an SQL query and returns the result as a JSON response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns - A JSON response containing the data refresh status or an error message
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API is called when dashboard wants to know whether datasets are fresh / recently updated

  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DataRefreshAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  const { searchParams } = new URL(request.url); // Parse the query parameters from the request URL
  // Extract query parameters from URL (example: ?businessUnit=Retail&ruleCategory=metadata)

  const businessUnit = searchParams.get("businessUnit"); // Get the business unit filter from query params
  // Read business unit filter selected in UI dropdown (example: "US Commercial")

  const ruleCategory = searchParams.get("ruleCategory"); // Get the rule category filter from query params
  // Read rule category filter selected in UI dropdown (example: "metadata")

  const startDate = searchParams.get("startDate"); // Get the start date filter from query params
  // Read start date filter selected in UI dropdown (example: "Last 7 Days"; startDate = 2026-02-15)

  const endDate = searchParams.get("endDate"); // Get the end date filter from query params
  // Read end date filter selected in UI dropdown (example: "Last 7 Days"; endDate = 2026-02-22 (Today))

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

  // Log the received query parameters for traceability
  console.info(
    `Received request for business unit: ${businessUnit}, rule category: ${ruleCategory}, start date: ${startDate}, end date: ${endDate}.`
  );
  // Print received filter inputs so troubleshooting is easier if UI complains about wrong data

  try {
    // Try block: normal successful execution happens here

    // Retrieve the Databricks session to execute the query
    const session = await getDatabricksSession();
    // Create or reuse secure Databricks session (like logging into the database)

    // Execute the query to fetch the data refresh status
    const rows = await executeQuery(
      session,
      generateDataRefreshQuery(startDate, endDate, businessUnit, ruleCategory, request)
    );
    // Build SQL query using provided filters, run it, and store results in rows

    // Log the success event after the query is executed
    await logToEventHub({
      type: "INFO",
      // INFO means query executed successfully
      detailMessage: "Query executed successfully to fetch data refresh status",
      // Success message that monitoring team can use
      programName,
      // Identifies API name in logs
      startDatetime: requestStartTime,
      // Start time used to calculate response duration
      status: "SUCCESS",
      // Mark operation successful
      actionType: "Spark_SQL_Query",
      // Categorize action as Databricks SQL query
      actionDescription: `Fetch data refresh status from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what query did and which table was accessed
      l1Tag: businessUnit,
      // Tag this log event with business unit so Splunk reports can group by BU
      user,
      // Store user who triggered request for audit
    });

    // Return the first result from the query (if any), otherwise return an empty object
    return NextResponse.json(rows && rows.length > 0 ? rows[0] : {});
    // If query returned data → return first row (expected to be one summary record);
    // if query returned nothing → return {} so frontend does not crash
  } catch (error: any) {
    // Catch block: runs if query fails, session fails, or any system issue occurs

    const errorMessage =
      error?.message ??
      "Unknown error occurred while fetching data refresh status.";
    // Extract readable error message; if missing, provide default message

    console.error(errorMessage);
    // Print error in server logs for debugging

    // Log the error event if the query execution fails
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Store error message (fallback to default if unavailable)
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Helps measure time-to-failure
      status: "FAILED",
      // Mark operation failed
      actionType: "Spark_SQL_Query",
      // Failure happened while running SQL query
      actionDescription: `Fetch data refresh status from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what failed and which table was involved
      l1Tag: businessUnit,
      // Tag this log event with business unit so Splunk reports can group by BU
      user,
      // Store user context for debugging and audit
    });

    // Return a JSON error response with the appropriate status code
    return NextResponse.json(
      { error: errorMessage },
      // Send error message so UI can show a banner/toast to user
      { status: 500 }
      // HTTP 500 = server/system problem (not a user input issue)
    );
  }
});
