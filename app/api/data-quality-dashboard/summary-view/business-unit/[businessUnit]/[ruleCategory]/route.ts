/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script provides API endpoints for retrieving rule-specific insights on dataset validation for a business unit in the Teva Data Integrity Dashboard.
    It includes:
    - Fetching highlights on dataset validation, rule-wise failed datasets, and top 5 failed datasets for a given rule category.
    - It logs success or failure to EventHub and returns structured JSON responses with the requested data.
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

// ----------------------------- SQL QUERY BUILDERS ----------------------------

/**
 * Builds the SQL query to fetch dataset validation highlights for a specific business unit and rule category.
 * This query calculates the number of validated, passed, and failed datasets for the given rule category.
 *
 * @param businessUnit - The business unit to fetch data for (e.g., 'Retail').
 * @param ruleCategory - The rule category to filter (e.g., 'data_profiling').
 * @returns The SQL query string to fetch dataset validation highlights.
 *
 * Example:
 *   Input:
 *     businessUnit = 'Retail', ruleCategory = 'data_profiling'
 *   Output:
 *     SQL query for retrieving dataset validation stats for 'data_profiling' in 'Retail'.
 */
const buildValidationHighlightsQuery = (
  businessUnit: string, // Business Unit selected in UI filter (example: "Retail")
  ruleCategory: string, // Rule category selected in UI filter (example: "data_profiling")
  request: NextRequest // Current request carrying RBAC scope headers from withAuthorization
): string => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: dataset=orders ensures this category summary only counts that dataset.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Return the validation highlights SQL with scope-level data control applied.
  return `
  WITH latest_results AS (
    -- Step 1: capture the latest validation run results for each rule configuration (CONFIG_ID)

    SELECT 
      di.schema_name,
      -- Schema where dataset belongs (like folder name in file system)

      di.dataset_name,
      -- Dataset/table name (like file name)

      di.RESULT_STATUS,
      -- Rule result: PASSED or FAILED

      di.RULE_CATEGORY,
      -- Rule category type (metadata / data_profiling / data_drift)

      ROW_NUMBER() OVER (
        PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC
        -- Ranking newest run first per CONFIG_ID (latest run gets rank 1)
      ) AS rn
      -- rn=1 means latest record
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Execution results table (stores validation results for all datasets)

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join schema tags table to map schema → business unit

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- Ensure business unit matches schema tag value

    WHERE st.tag_value = '${businessUnit}'
    -- Filter results only for selected business unit (like applying a dropdown filter)
      ${rbacScopeClause}
      -- RBAC data-scope filter: only include validation rows allowed by this user's groups
  ),

  all_datasets AS (
    -- Step 2: compute dataset-level failure flag (if any rule failed for dataset)

    SELECT RULE_CATEGORY, SCHEMA_NAME, DATASET_NAME,
      -- Dataset identifiers grouped by category + schema + dataset

      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed
      -- has_failed = 1 if any rule failed, otherwise 0
      -- Real-world: even 1 failed check makes dataset "unhealthy"
    FROM latest_results

    WHERE rn = 1
    -- Consider only latest execution record per CONFIG_ID

    GROUP BY RULE_CATEGORY, DATASET_NAME, SCHEMA_NAME
    -- Group by dataset to get dataset-level summary
  ),

  category_stats AS (
    -- Step 3: summarize dataset pass/fail counts for each rule category

    SELECT
      RULE_CATEGORY,
      -- Rule category being summarized

      COUNT(DATASET_NAME) AS validated_datasets,
      -- Number of datasets that were validated (appeared in results)

      SUM(CASE WHEN has_failed = 1 THEN 1 ELSE 0 END) AS failed_datasets,
      -- Count of datasets that failed at least one rule

      SUM(CASE WHEN has_failed = 0 THEN 1 ELSE 0 END) AS passed_datasets,
      -- Count of datasets that passed all rules

      STRING_AGG(DISTINCT CASE WHEN has_failed = 1 THEN DATASET_NAME END, ', ') AS dataset_names
      -- List dataset names that failed (for drilldown display)
    FROM all_datasets

    GROUP BY RULE_CATEGORY
    -- Aggregate counts at rule category level
  )

  SELECT
    RULE_CATEGORY,
    -- Return rule category in final results

    validated_datasets,
    -- Total validated dataset count

    failed_datasets,
    -- Total failed dataset count

    passed_datasets,
    -- Total passed dataset count

    dataset_names,
    -- Failed dataset names list for UI display

    CONCAT(ROUND((validated_datasets / NULLIF(validated_datasets, 0)) * 100, 2), '%') AS validated_datasets_percentage,
    -- % validated datasets (currently always 100%, because validated/validated)

    CONCAT(ROUND((failed_datasets / NULLIF(validated_datasets, 0)) * 100, 2), '%') AS failed_datasets_percentage,
    -- % failed datasets out of validated datasets

    CONCAT(ROUND((passed_datasets / NULLIF(validated_datasets, 0)) * 100, 2), '%') AS passed_datasets_percentage
    -- % passed datasets out of validated datasets
  FROM category_stats

  WHERE RULE_CATEGORY = '${ruleCategory}'
  -- Return only selected rule category

  ORDER BY validated_datasets DESC
  -- Sort by dataset count (not strictly needed but helps ordering)
`;
};

/**
 * Builds the SQL query to fetch the failed datasets by rule name for a specific business unit and rule category.
 * This query retrieves datasets that failed validation for a specific rule category.
 *
 * @param businessUnit - The business unit to fetch data for.
 * @param ruleCategory - The rule category to filter (e.g., 'data_profiling').
 * @returns The SQL query string to fetch failed datasets by rule category.
 *
 * Example:
 *   Input:
 *     businessUnit = 'Retail', ruleCategory = 'data_drift'
 *   Output:
 *     SQL query for retrieving failed datasets for 'data_drift' in 'Retail'.
 */
const buildRulewiseFailedDatasetsQuery = (
  businessUnit: string, // Business unit filter selected in UI
  ruleCategory: string, // Rule category filter selected in UI
  request: NextRequest // Current request carrying RBAC scope headers from withAuthorization
): string => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: catalog=dset_dev adds a catalog restriction to the failed-datasets query.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Return the rule-wise failed dataset SQL with RBAC data-scope filtering.
  return `
  WITH latest_results AS (
    -- Step 1: capture latest execution record per CONFIG_ID (latest rule run only)

    SELECT
      di.RULE_CATEGORY,
      -- Category of rule

      di.RULE_NAME,
      -- Rule name (example: "Schema_Check")

      di.DATASET_NAME,
      -- Dataset name

      di.CATALOG_NAME,
      -- Catalog name

      di.SCHEMA_NAME,
      -- Schema name

      di.CONFIG_ID,
      -- Rule config id

      di.RUN_ID,
      -- Run identifier

      di.RESULT_STATUS,
      -- PASSED / FAILED

      ROW_NUMBER() OVER (
        PARTITION BY di.CONFIG_ID ORDER BY di.RUN_ID DESC
        -- Rank the latest run first
      ) AS rn
      -- rn = 1 means latest run for that config

    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Execution results table

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join tags to map schemas to business units

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- Ensure BU mapping matches

    WHERE st.tag_value = '${businessUnit}'
    -- Filter to selected business unit
      ${rbacScopeClause}
      -- RBAC data-scope filter: only include rows allowed by this user's groups
  ),

  failed_datasets AS (
    -- Step 2: only failures for this category in latest run

    SELECT
      RULE_CATEGORY,
      RULE_NAME,
      DATASET_NAME,
      CATALOG_NAME,
      SCHEMA_NAME
    FROM latest_results

    WHERE rn = 1 AND RESULT_STATUS = 'FAILED'
      -- Keep only latest run results that FAILED

      AND RULE_CATEGORY = '${ruleCategory}'
      -- Keep only failures of the selected category
  )

  SELECT
    CASE WHEN RULE_CATEGORY = 'metadata' THEN 'Metadata'
        WHEN RULE_CATEGORY = 'data_drift' THEN 'Data Drift'
        WHEN RULE_CATEGORY = 'data_profiling' THEN 'Data Profiling'
        ELSE RULE_CATEGORY
    END AS RULE_CATEGORY,
    -- Convert rule category technical names into display-friendly labels

    RULE_NAME,
    -- Rule name grouped output

    COUNT(DISTINCT CONCAT(
      CATALOG_NAME, '.', SCHEMA_NAME, '.', DATASET_NAME
    )) AS distinct_dataset_count,
    -- How many unique datasets failed this rule

    array_join(
      collect_set(CONCAT(
        CATALOG_NAME, '.', SCHEMA_NAME, '.', DATASET_NAME
      )),
      ','
    ) AS unique_dataset_names
    -- Build list of dataset identifiers for UI details
  FROM failed_datasets

  GROUP BY 1, 2
  -- Group by rule category + rule name

  ORDER BY RULE_CATEGORY, RULE_NAME
  -- Sort output in clean order
`;
};

/**
 * Builds the SQL query to fetch the top 5 failed datasets for a given rule category in a business unit.
 * This query returns the top 5 datasets with the most failed rules for the given rule category.
 *
 * @param businessUnit - The business unit to fetch data for.
 * @param ruleCategory - The rule category to filter (e.g., 'data_profiling').
 * @returns The SQL query string to fetch the top 5 failed datasets.
 */
const buildTopFiveFailedDatasetsQuery = (
  businessUnit: string, // BU filter chosen in UI
  ruleCategory: string, // Rule category chosen in UI
  request: NextRequest // Current request carrying RBAC scope headers from withAuthorization
): string => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: schema=sales limits top failures to datasets in that schema.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Return the top-five failed datasets SQL with RBAC data-scope filtering.
  return `
  WITH latest_results AS (
    -- Step 1: include latest run records for each rule config

    SELECT di.*,
      -- Select all execution columns

      ROW_NUMBER() OVER (
        PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC
        -- Rank latest run first per rule config
      ) AS rn
      -- rn=1 indicates the newest record
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Execution results source

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags to map to BU

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- BU mapping match

    WHERE st.tag_value = '${businessUnit}'
    -- Selected business unit only
      ${rbacScopeClause}
      -- RBAC data-scope filter: only include rows inside this user's assigned groups
  ),

  failed_entries AS (
    -- Step 2: keep only latest FAILED entries

    SELECT *
    FROM latest_results

    WHERE rn = 1 AND RESULT_STATUS = 'FAILED'
    -- Only latest failed rule executions
  )

  SELECT
    CASE WHEN RULE_CATEGORY = 'metadata' THEN 'Metadata'
         WHEN RULE_CATEGORY = 'data_drift' THEN 'Data Drift'
         WHEN RULE_CATEGORY = 'data_profiling' THEN 'Data Profiling'
         ELSE RULE_CATEGORY
    END AS RULE_CATEGORY,
    -- Convert to display-friendly category names

    CATALOG_NAME,
    -- Catalog name for output
    
    DATASET_NAME,
    -- Dataset name for output

    SCHEMA_NAME,
    -- Schema name to identify dataset accurately

    COUNT(DISTINCT RULE_NAME) AS failed_rules_count,
    -- Number of unique failed rules for this dataset

    array_join(collect_set(RULE_NAME), ', ') AS failed_rule_names
    -- List of rule names that failed (for UI drill-down)
  FROM failed_entries

  WHERE RULE_CATEGORY = '${ruleCategory}'
  -- Only selected category failures

  GROUP BY 1, CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
  -- Group by dataset so each dataset appears once

  ORDER BY failed_rules_count DESC
  -- Show datasets with most failures first

  LIMIT 5
  -- Only return top 5 datasets
`;
};

// ------------------------------- API ROUTE HANDLER -------------------------------

/**
 * Handles GET requests to fetch insights related to a specific rule category for a business unit.
 * It retrieves dataset validation highlights, rule-wise failures, and top 5 failed datasets for the given rule category.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param params - The route parameters containing the business unit and rule category.
 * @returns The JSON response containing the requested data.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // Incoming API request from frontend UI
  // Route parameter object (contains businessUnit name and ruleCategory from URL)
  {
    params,
  }: { params: Promise<{ businessUnit: string; ruleCategory: string }> }
): // Route parameters include businessUnit + ruleCategory
  Promise<NextResponse> {
  const requestStartTime = new Date(); // Track the start time for logging
  // Save start time to calculate API duration

  const programName = "DQDSummaryViewRuleCategorySummaryAPI";
  // Program/API name for logs

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Capture the user ID from headers
  // Identify user for auditing purposes

  const { businessUnit, ruleCategory } = await params;
  // Extract BU and category from URL path variables

  try {
    // Try block: normal success path

    // Establish a Databricks session to run SQL queries
    const session = await getDatabricksSession();
    // Connect to Databricks so we can execute SQL queries

    // Execute the queries in parallel
    const [
      validationHighlights,
      rulewiseFailedDatasets,
      topFiveFailedDatasets,
    ] = await Promise.all([
      executeQuery(
        session,
        buildValidationHighlightsQuery(businessUnit, ruleCategory, request)
      ),
      // Query 1: highlight stats (validated, passed, failed)

      executeQuery(
        session,
        buildRulewiseFailedDatasetsQuery(businessUnit, ruleCategory, request)
      ),
      // Query 2: rule-wise dataset failures (per rule name)

      executeQuery(
        session,
        buildTopFiveFailedDatasetsQuery(businessUnit, ruleCategory, request)
      ),
      // Query 3: top 5 datasets with most failed rules
    ]);
    // Promise.all runs all 3 queries at same time to improve response speed

    // Log successful retrieval of data to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO means success
      detailMessage: `Successfully retrieved '${ruleCategory}' rule insights for Business Unit '${businessUnit}'.`,
      // Log message for Splunk/EventHub monitoring
      programName,
      // Program name used for tracking API
      startDatetime: requestStartTime,
      // For duration measurement
      status: "SUCCESS",
      // Mark request success
      actionType: "Spark_SQL_Query",
      // SQL query executed in Databricks
      actionDescription: `Fetch Rule Category Insights: Business Unit=${businessUnit}, Rule Category=${ruleCategory} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Record action details for auditing
      l1Tag: businessUnit,
      // Tag log by BU for filtering
      user,
      // Store user who requested data
    });

    // Return the aggregated results in JSON format
    return NextResponse.json({
      highlights:
        validationHighlights && validationHighlights.length > 0
          ? validationHighlights[0]
          : {},
      // Return first row of highlights (since it’s summary); else return empty object {}
      rulewiseFailedDatasets,
      // Array of failures grouped by rule name
      topFiveFailedDatasets,
      // Array of top 5 datasets with most failed rules
    });
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Failed fetching '${ruleCategory}' rule insights for Business Unit '${businessUnit}': ${error?.message ?? "Unknown error"
      }`;
    // Extract readable message; fallback default

    console.error(errorMessage);
    // Print error in server logs for debugging

    // Log error to EventHub if something goes wrong
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failure
      detailMessage: errorMessage,
      // Store error message for troubleshooting
      programName,
      // Identify API where failure occurred
      startDatetime: requestStartTime,
      // Helps calculate duration until failure
      status: "FAILED",
      // Mark as failed request
      actionType: "Spark_SQL_Query",
      // Failure came during SQL execution
      actionDescription: `Failed to fetch Rule Category Insights: Business Unit=${businessUnit}, Rule Category=${ruleCategory} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain failure context
      l1Tag: businessUnit,
      // BU tag
      user,
      // store user who triggered request
    });

    // Return an error response if the query execution fails
    return NextResponse.json(
      { error: errorMessage },
      // send readable error to frontend UI
      { status: 500 }
      // HTTP 500 = backend/server issue
    );
  }
});
