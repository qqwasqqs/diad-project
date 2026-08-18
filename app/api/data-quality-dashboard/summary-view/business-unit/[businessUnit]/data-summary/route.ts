/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script is responsible for retrieving dataset validation summaries and rule-wise failures for a given business unit.
    It fetches data related to dataset validation status and failure statistics, logs successes and failures, and returns the data in a structured format.
    Key Functionalities:
    - It constructs and executes SQL queries to retrieve dataset validation highlights and rule-wise failure data.
    - Logs the result to EventHub for monitoring and traceability.
    - Returns a structured JSON response containing the validation statistics and failure data.
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
  dataQualityTagScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants;

// ----------------------------- SQL QUERIES -----------------------------

/**
 * Constructs the SQL query to retrieve dataset validation highlights for a given business unit.
 * This query aggregates dataset validation results and calculates the number of failed, passed, and total datasets for the business unit.
 *
 * @param {string} businessUnit - The business unit for which to fetch dataset validation highlights.
 *
 * @returns {string} The SQL query string to retrieve dataset validation highlights.
 *
 * Example:
 *  Input:
 *    businessUnit: "Retail"
 *  Output:
 *    SQL query that returns validation statistics for the "Retail" business unit.
 */
const buildValidationHighlightsQuery = (
  businessUnit: string,
  request: NextRequest
): string => {
  // Build RBAC filters for execution rows and physical dataset tag rows.
  // Example: dataset=customer_master keeps the BU summary restricted to that dataset.
  const executionScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // The total-datasets CTE reads tag rows as alias "st".
  const tagScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityTagScopeColumns("st")
  );

  // Return the validation highlights SQL with RBAC data-scope filtering.
  return `
  WITH latest_results AS (
    -- Step 1: pick the latest run result for each rule configuration (CONFIG_ID)

    SELECT
      st.tag_value AS L1_BUSINESS_UNIT,
      -- Business unit name (example: Retail / US Commercial)

      di.schema_name,
      -- Schema name where dataset exists (like folder name)

      di.dataset_name,
      -- Dataset/table name (like file name)

      di.RESULT_STATUS,
      -- Shows if that rule result was PASSED or FAILED

      ROW_NUMBER() OVER (
        -- Give ranking to results to identify which run is the newest
        PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC
        -- Group by rule config; latest run is ranked as 1
      ) AS rn
      -- rn = 1 means latest execution record for each rule config

    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Source table storing rule execution results

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags so each schema is mapped to business unit

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Connect dataset schema to schema tag table

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- Ensure the business unit value matches the tag value
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${executionScopeClause}
      -- RBAC data-scope filter: only include execution rows this user may view
  ),

  dataset_status AS (
    -- Step 2: decide if dataset has ANY failure in latest results

    SELECT
      L1_BUSINESS_UNIT,
      -- Business unit name

      SCHEMA_NAME,
      -- Schema name

      DATASET_NAME,
      -- Dataset name

      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed
      -- If any rule fails → dataset marked has_failed = 1
      -- Real-world: if even 1 check fails, dataset is considered unhealthy
    FROM latest_results

    WHERE rn = 1
    -- Only consider latest execution rows

    GROUP BY L1_BUSINESS_UNIT, DATASET_NAME, SCHEMA_NAME
    -- Group results by dataset + schema + BU
  ),

  filtered_tables AS (
    -- Step 3: get list of all physical tables present in system schemas

    SELECT
      t.table_catalog,
      -- Catalog name

      t.table_schema,
      -- Schema name

      t.table_name,
      -- Table name

      st.tag_value AS L1_BUSINESS_UNIT,
      -- Business unit (mapped using schema tags)

      ROW_NUMBER() OVER (
        PARTITION BY table_name, SPLIT(table_schema, '_')[0]
        -- Group similar schemas (example: versioned schemas like dev/prod)

        ORDER BY CASE WHEN RIGHT(table_schema, 2) = '_v' THEN 1 ELSE 0 END, table_schema
        -- Prefer non-versioned schema first (or versioned based on ordering)
      ) AS rn
      -- rn = 1 selects the preferred schema/table variant

    FROM system.information_schema.tables t
    -- Databricks system table listing all tables

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags to attach business unit to schemas

      ON t.table_catalog = SPLIT(st.table_full_name, '\\\\.')[0]

      AND t.table_schema = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match schema name with tag schema name

      AND t.table_name = SPLIT(st.table_full_name, '\\\\.')[2]
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${tagScopeClause}
      -- RBAC data-scope filter: only count total datasets inside this user's allowed scope
  ),

  total_datasets AS (
    -- Step 4: count total datasets available per business unit (like total files in folder)

    SELECT
      L1_BUSINESS_UNIT,
      -- BU name

      COUNT(DISTINCT CONCAT(table_catalog, '.', table_schema, '.', table_name)) AS total_datasets
      -- Count unique datasets in that BU
    FROM filtered_tables

    WHERE rn = 1
    -- Only selected schema/table variant is counted

    GROUP BY L1_BUSINESS_UNIT
    -- One total count per Business Unit
  )

  SELECT
    ds.L1_BUSINESS_UNIT,
    -- BU name for final dashboard output

    COUNT(ds.dataset_name) AS validated_datasets,
    -- How many datasets have run validation (i.e., present in results table)

    SUM(CASE WHEN ds.has_failed = 1 THEN 1 ELSE 0 END) AS failed_datasets,
    -- How many validated datasets have failures

    SUM(CASE WHEN ds.has_failed = 0 THEN 1 ELSE 0 END) AS passed_datasets,
    -- How many validated datasets have no failures

    td.total_datasets,
    -- Total number of datasets that exist in BU (even if not validated yet)

    CONCAT(ROUND((COUNT(ds.dataset_name) / td.total_datasets) * 100, 2), '%') AS validated_datasets_percentage,
    -- % of datasets validated = validated / total

    CONCAT(ROUND((SUM(CASE WHEN ds.has_failed = 1 THEN 1 ELSE 0 END) / COUNT(ds.dataset_name)) * 100, 2), '%') AS failed_datasets_percentage,
    -- % failed among validated datasets

    CONCAT(ROUND((SUM(CASE WHEN ds.has_failed = 0 THEN 1 ELSE 0 END) / COUNT(ds.dataset_name)) * 100, 2), '%') AS passed_datasets_percentage
    -- % passed among validated datasets

  FROM dataset_status ds
  -- Base table = per dataset pass/fail status

  LEFT JOIN total_datasets td
    -- Join total datasets count with validation status table

    ON ds.L1_BUSINESS_UNIT = td.L1_BUSINESS_UNIT
    -- Join using BU name

  WHERE ds.L1_BUSINESS_UNIT = '${businessUnit}'
  -- Filter only requested business unit

  GROUP BY ds.L1_BUSINESS_UNIT, td.total_datasets
  -- Group by BU to calculate overall BU summary

  ORDER BY validated_datasets DESC
  -- Sort so BU with most validations appears first (not needed but helpful)
`;
};

/**
 * Constructs the SQL query to retrieve rule-wise dataset failures for a given business unit.
 * This query aggregates the failed datasets by rule category and lists the distinct datasets per category.
 *
 * @param {string} businessUnit - The business unit for which to fetch rule-wise failures.
 *
 * @returns {string} The SQL query string to retrieve rule-wise failure data.
 *
 * Example:
 *  Input:
 *    businessUnit: "Retail"
 *  Output:
 *    SQL query that returns rule-wise failure statistics for the "Retail" business unit.
 */
const buildRulewiseFailureDatasetsQuery = (
  businessUnit: string,
  request: NextRequest
): string => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: rule_category=metadata limits this failure summary to metadata failures.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Return the rule-wise failure SQL with scope-level data control applied.
  return `
  WITH latest_results AS (
    -- Step 1: fetch latest run result per CONFIG_ID for this business unit

    SELECT
      di.RULE_CATEGORY,
      -- Category of rule (metadata / drift / profiling)

      di.CATALOG_NAME,
      -- Catalog name

      di.SCHEMA_NAME,
      -- Schema name

      di.DATASET_NAME,
      -- Dataset name

      di.CONFIG_ID,
      -- Rule config ID

      di.RUN_ID,
      -- Run ID

      di.RESULT_STATUS,
      -- PASSED / FAILED result status

      ROW_NUMBER() OVER (
        PARTITION BY di.CONFIG_ID ORDER BY di.RUN_ID DESC
        -- Rank newest run first for each CONFIG_ID
      ) AS rn
      -- rn=1 means latest record

    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Execution results table

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join schema tags to map BU

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- Ensure BU mapping matches

    WHERE st.tag_value = '${businessUnit}'
    -- Filter to only requested business unit
      ${rbacScopeClause}
      -- RBAC data-scope filter: only include failed rows allowed by the user's groups
  ),

  failed_datasets AS (
    -- Step 2: keep only failed datasets in latest run

    SELECT
      RULE_CATEGORY,
      CATALOG_NAME,
      SCHEMA_NAME,
      DATASET_NAME
    FROM latest_results

    WHERE rn = 1 AND RESULT_STATUS = 'FAILED'
    -- Only latest record & only failed
  ),

  category_counts AS (
    -- Step 3: group failures by rule category

    SELECT
      CASE
        WHEN RULE_CATEGORY = 'data_profiling' THEN 'Data Profiling'
        WHEN RULE_CATEGORY = 'data_drift' THEN 'Data Drift'
        WHEN RULE_CATEGORY = 'metadata' THEN 'Metadata'
        ELSE RULE_CATEGORY
      END AS rule_category,
      -- Convert technical names to display-friendly labels for UI

      COUNT(DISTINCT CONCAT(
        CATALOG_NAME, '.', SCHEMA_NAME, '.', DATASET_NAME
      )) AS distinct_dataset_count,
      -- Count unique datasets failing in that category

      ARRAY_JOIN(
        COLLECT_SET(DISTINCT CONCAT(
          CATALOG_NAME, '.', SCHEMA_NAME, '.', DATASET_NAME
        )),
        ', '
      ) AS unique_dataset_names
      -- Build a comma separated list of dataset names for UI drilldown
    FROM failed_datasets

    GROUP BY RULE_CATEGORY
    -- Group by category to get counts per category
  )

  SELECT * FROM category_counts
  -- Return final grouped results

  ORDER BY rule_category
  -- Sort output by category name
`;
};

// ------------------------------- API ROUTE HANDLER -------------------------------

/**
 * Handles the GET request to retrieve dataset validation summaries and rule-wise failure statistics.
 * This function validates the input parameters, executes the queries to fetch the relevant data,
 * logs the success or failure of the operation, and returns the results in a structured format.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param {object} context - Contains route parameters.
 * @param {string} context.businessUnit - The business unit to fetch the data for.
 *
 * @returns {NextResponse} A JSON response containing the validation statistics and rule-wise failure data, or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 * 
 * Example:
 *  Input:
 *    businessUnit: "Retail"
 *  Output:
 *    - 200 OK response with dataset validation highlights and rule-wise failure statistics.
 *    - 400 Bad Request if the query parameters are missing or invalid.
 *    - 500 Internal Server Error if an exception occurs.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // Incoming request from dashboard frontend
  // Route parameter object (contains businessUnit name from URL)
  { params }: { params: Promise<{ businessUnit: string }> }
): // Route parameters include businessUnit in the URL path
  Promise<NextResponse> {
  const requestStartTime = new Date(); // Track request start time for logging
  // Save start time for request duration and performance monitoring

  const programName = "DQDSummaryViewDataSummaryAPI";
  // API name used in EventHub logs

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Identify user who made the request; fallback if missing

  const { businessUnit } = await params;
  // Extract business unit from URL route parameters

  try {
    // Try block: normal successful execution

    // Establish a session with Databricks
    const session = await getDatabricksSession();
    // Connect/reuse Databricks session for SQL execution

    // Execute both queries concurrently
    const [validationHighlights, rulewiseFailureDatasets] = await Promise.all([
      executeQuery(session, buildValidationHighlightsQuery(businessUnit, request)),
      // Query 1: overall BU validation summary for dashboard highlight cards

      executeQuery(session, buildRulewiseFailureDatasetsQuery(businessUnit, request)),
      // Query 2: failure dataset list grouped by rule category
    ]);
    // Promise.all runs both queries at same time (faster response)

    // Log success to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO indicates success
      detailMessage: `Successfully retrieved data summary and rule-wise failures for Business Unit: ${businessUnit}.`,
      // Human readable message for monitoring dashboards
      programName,
      // API name for tracking
      startDatetime: requestStartTime,
      // Start time for duration measurement
      status: "SUCCESS",
      // Mark log as success
      actionType: "Spark_SQL_Query",
      // Action type is SQL query execution
      actionDescription: `Fetch data summary stats for Business Unit: ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what data was fetched and from where
      l1Tag: businessUnit,
      // Log tag = business unit (so Splunk filters by BU)
      user,
      // User for auditing and traceability
    });

    // Return the results as a JSON response
    return NextResponse.json({
      highlights:
        validationHighlights && validationHighlights.length > 0
          ? validationHighlights[0]
          : {},
      // highlights is first row summary; if empty, return {} so UI does not crash

      rulewiseFailureDatasets,
      // rulewiseFailureDatasets is array grouped by rule category (used for charts / drilldown)
    });
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Failed to retrieve validation stats for Business Unit: ${businessUnit}. Error: ${error?.message ?? "Unknown error"
      }`;
    // Extract readable message; fallback default

    console.error(errorMessage);
    // Print error in server logs for debugging

    // Log error to EventHub
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failure
      detailMessage: errorMessage,
      // Store detailed error message
      programName,
      // API name that failed
      startDatetime: requestStartTime,
      // Used to compute duration until failure
      status: "FAILED",
      // Mark request failed
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query
      actionDescription: `Failed to fetch data summary stats for Business Unit: ${businessUnit} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain which action failed
      l1Tag: businessUnit,
      // Log tag = business unit (so Splunk filters by BU)
      user,
      // Store who triggered error
    });

    // Return an error response
    return NextResponse.json(
      { error: errorMessage },
      // Return readable message for frontend display
      { status: 500 }
      // HTTP 500 indicates system/server error
    );
  }
});
