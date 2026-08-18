/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2026
  
  Purpose of the script:
    This script provides an API route handler to retrieve configured data quality and data drift rules
    for a specified business unit and dataset from Databricks.
    
    Key Functionalities:
    - Accepts query parameters (businessUnit, datasetName, catalogName, schemaName, targetColumn)
    - Validates required parameters (businessUnit and datasetName)
    - Executes SQL queries against Databricks to fetch rule configurations from both
      DATA_QUALITY_CONFIG_TABLE and DATA_DRIFT_CONFIG_TABLE
    - Returns combined rule metadata including thresholds, baselines, alert settings, and rule details
    - Logs all operations (success/failure) to Azure Event Hub for monitoring, auditing, and observability
    - Ensures proper error handling and comprehensive telemetry for troubleshooting
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
  DATA_QUALITY_CONFIG_TABLE, // Table name for data quality rule configurations
  DATA_DRIFT_CONFIG_TABLE, // Table name for data drift rule configurations
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
  dataDriftScopeColumns,
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Builds a SQL query to retrieve data quality and data drift configuration rules.
 *
 * This function constructs a UNION query that combines rules from both the data quality
 * and data drift configuration tables, filtering by business unit, catalog, schema, dataset,
 * and optionally by target column. When no target column is specified, it filters for
 * specific predefined rule names from each category.
 *
 * @param businessUnit - The L1 business unit identifier used to filter the configuration records.
 * @param catalogName - Optional catalog name to further filter the results. If null, all catalogs are included.
 * @param schemaName - Optional schema name to further filter the results. If null, all schemas are included.
 * @param datasetName - The specific dataset name to filter configuration records for.
 * @param targetColumn - Optional target column name to filter rules. If null, filters by predefined rule names instead.
 *
 * @returns {string} A SQL query string that retrieves configuration records from both data quality
 *                   and data drift tables with appropriate WHERE clause filters and UNION clause.
 *
 * @example
 * // Query configurations for a specific business unit and dataset
 * const query = buildLoginActivityQuery(
 *   'Finance',
 *   null,
 *   null,
 *   'transactions_dataset',
 *   null
 * );
 * // Returns UNION query filtering by business unit and dataset with predefined rule names
 *
 * @example
 * // Query configurations for a specific business unit, catalog, schema, dataset, and target column
 * const query = buildLoginActivityQuery(
 *   'Finance',
 *   'main_catalog',
 *   'staging',
 *   'transactions_dataset',
 *   'amount'
 * );
 * // Returns UNION query filtering all parameters and only columns targeting 'amount'
 *
 * @remarks
 * - When targetColumn is null, the query includes specific predefined rule names to avoid
 *   including column-level rules in the dataset/row level results.
 * - The function uses string interpolation for SQL construction and requires that
 *   CATALOG_NAME, SCHEMA_NAME, DATA_QUALITY_CONFIG_TABLE, and DATA_DRIFT_CONFIG_TABLE
 *   are defined as constants in the scope.
 * - SQL injection vulnerabilities may exist if these parameters are user-supplied without proper sanitization.
 *   Consider using parameterized queries instead.
 */
const buildDataQualityConfiguredRulesQuery = (
  businessUnit: string, // Required business unit filter for the query (like 'Finance', 'Operations')
  catalogName: string | null, // Optional catalog filter; if null, query will include all catalogs (like 'main', 'staging')
  schemaName: string | null, // Optional schema filter; if null, query will include all schemas (like 'raw', 'processed')
  datasetName: string, // Required dataset name filter for the query (like 'transactions_dataset')
  targetColumn: string | null, // Optional target column filter; if null, query will filter by predefined rule names instead (like 'amount', 'customer_id')
  request: NextRequest, // Current request carrying RBAC scope headers from authorization
): string => {
  // This helper function creates and returns a SQL query as plain text based on businessUnit, catalogName, schemaName, datasetName, and targetColumn filters

  // Build the RBAC filter for rows from the data quality configuration table.
  // Example: dataset=customer_master only returns rules configured for that dataset.
  const rbacQualityScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns()
  );

  // Build the RBAC filter for rows from the data drift configuration table.
  // Example: rule_category=data_drift only allows drift rules from this branch.
  const rbacDriftScopeClause = buildRbacDataScopeAndClause(
    request,
    dataDriftScopeColumns()
  );

  return `
    SELECT
      CONFIG_ID, -- Unique identifier for each configuration record (Example: 'CONFIG_001')
      L1_BUSINESS_UNIT, -- First-level business unit identifier (Example: 'Finance', 'Operations')
      DATASET_TYPE, -- Type/classification of the dataset (Example: 'Transactional', 'Reporting')
      CATALOG_NAME, -- Databricks catalog name serving as the logical database container (Example: 'main', 'staging')
      SCHEMA_NAME, -- Databricks schema name organizing tables within the catalog (Example: 'raw', 'processed')
      DATASET_NAME, -- Name of the dataset/table being monitored (Example: 'transactions', 'customer_orders')
      PIPELINE_NAME, -- Name of the data pipeline producing this dataset (Example: 'etl_pipeline_v2')
      RULE_CATEGORY, -- Category type of the rule (Example: 'data_quality', 'metadata')
      RULE_TYPE, -- Type of rule check being performed (Example: 'Completeness', 'Uniqueness')
      RULE_NAME, -- Specific name of the rule (Example: 'volume_check', 'schema_validation')
      TARGET_COLUMN, -- Specific column this rule applies to; null for dataset-level rules (Example: 'amount', 'customer_id')
      RULE_WARNING_THRESHOLD, -- Warning threshold value for alerting (Example: 95.5)
      RULE_CRITICAL_THRESHOLD, -- Critical threshold value for alerting (Example: 90.0)
      THRESHOLD_UNIT, -- Unit of measurement for thresholds (Example: 'percentage', 'count')
      THRESHOLD_LOOKBACK_VALUE, -- Number of periods to look back for threshold calculation (Example: 7, 30)
      THRESHOLD_LOOKBACK_UNIT, -- Time unit for lookback period (Example: 'days', 'weeks')
      THRESHOLD_DERIVATION_TYPE, -- Method used to derive threshold (Example: 'baseline_percentage', 'fixed_value')
      RULE_VALUE, -- Current or configured value for the rule (Example: 100000)
      BASELINE_VALUE, -- Baseline/reference value for comparison (Example: 99500)
      BASELINE_LOOKBACK_VALUE, -- Number of periods used for baseline calculation (Example: 30)
      BASELINE_LOOKBACK_UNIT, -- Time unit for baseline lookback (Example: 'days', 'months')
      BASELINE_DERIVATION_TYPE, -- Method used to calculate baseline (Example: 'average', 'percentile_95')
      ALERT_FLAG, -- Flag indicating if alerts should be triggered (Example: true, false)
      RECEIVER_ALERT_ID, -- ID of the alert receiver/recipient (Example: 'team_email_distribution_001')
      ENABLED, -- Flag indicating if the rule is active (Example: true, false)
      RUN_FREQUENCY, -- Frequency at which the rule is executed (Example: 'daily', 'hourly')
      CREATED_BY, -- User who created this configuration record (Example: 'radhe.tiwari@company.com')
      CREATED_AT, -- Timestamp when record was created (Example: '2026-01-20 10:30:00')
      UPDATED_BY, -- User who last updated this record (Example: 'keerthi.pusuloori@company.com')
      UPDATED_AT -- Timestamp of last update (Example: '2026-01-22 14:15:00')
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE} -- Query the data quality configuration table (Example: 'main.schema_quality.data_quality_config')
    WHERE
      L1_BUSINESS_UNIT = '${businessUnit}' -- Filter by the provided business unit (Example: L1_BUSINESS_UNIT = 'Finance')
      ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""} -- Optional: filter by catalog if provided (Example: AND CATALOG_NAME = 'main')
      ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""} -- Optional: filter by schema if provided (Example: AND SCHEMA_NAME = 'processed')
      AND DATASET_NAME = '${datasetName}' -- Filter by the specific dataset name provided (Example: AND DATASET_NAME = 'transactions_dataset')
      ${rbacQualityScopeClause}
      -- RBAC data-scope filter: only return quality rules inside the user's assigned group scope
      ${
        targetColumn
          ? `AND TARGET_COLUMN = '${targetColumn}'` // If target column is provided, filter by that column (Example: AND TARGET_COLUMN = 'amount')
          : `AND RULE_NAME IN ( -- If no target column, filter by dataset/row-level rule names to exclude column-specific rules
              'volume_check', -- Checks total row count matches expected volume
              'schema_extraction', -- Validates schema structure is extracted correctly
              'schema_validation', -- Ensures schema matches expected definition
              'dataset_completeness_check', -- Checks if dataset has required data
              'row_level_completeness_check', -- Validates individual rows are complete
              'dataset_uniqueness_check', -- Ensures no duplicate rows at dataset level
              'row_level_uniqueness_check', -- Validates uniqueness constraints per row
              'cross_table_consistency_check', -- Verifies consistency across related tables
              'timeliness_check' -- Ensures that the dataset is current by verifying its timestamp or last modified date.
            )`
      }

    UNION -- Combine results from data quality and data drift tables

    SELECT
      CONFIG_ID, -- Unique identifier for each configuration record (Example: 'CONFIG_002')
      L1_BUSINESS_UNIT, -- First-level business unit identifier (Example: 'Finance', 'Operations')
      DATASET_TYPE, -- Type/classification of the dataset (Example: 'Transactional', 'Reporting')
      CATALOG_NAME, -- Databricks catalog name (Example: 'main', 'staging')
      SCHEMA_NAME, -- Databricks schema name (Example: 'raw', 'processed')
      DATASET_NAME, -- Name of the dataset/table (Example: 'customer_transactions')
      PIPELINE_NAME, -- Pipeline name producing the dataset (Example: 'etl_pipeline_v3')
      'data_drift' AS RULE_CATEGORY, -- Hardcoded category for drift rules (Example: 'data_drift')
      RULE_TYPE, -- Type of drift rule (Example: 'Variance', 'Outlier Detection')
      RULE_NAME, -- Name of the drift rule (Example: 'variance_check', 'drift_check_psi_numeric')
      TARGET_COLUMN, -- Column being monitored for drift (Example: 'transaction_amount', 'customer_age')
      RULE_WARNING_THRESHOLD, -- Warning threshold for drift detection (Example: 0.15)
      RULE_CRITICAL_THRESHOLD, -- Critical threshold for drift (Example: 0.25)
      THRESHOLD_UNIT, -- Unit of drift measurement (Example: 'percentage_change', 'psi_value')
      THRESHOLD_LOOKBACK_VALUE, -- Periods to compare against (Example: 30)
      THRESHOLD_LOOKBACK_UNIT, -- Time unit for comparison window (Example: 'days')
      THRESHOLD_DERIVATION_TYPE, -- Method for threshold derivation (Example: 'historical_mean_plus_stddev')
      RULE_VALUE, -- Current drift metric value (Example: 0.18)
      BASELINE_VALUE, -- Expected baseline value for drift comparison (Example: 0.10)
      BASELINE_LOOKBACK_VALUE, -- Historical periods used for baseline (Example: 90)
      BASELINE_LOOKBACK_UNIT, -- Time unit for baseline period (Example: 'days')
      BASELINE_DERIVATION_TYPE, -- Method to calculate baseline (Example: 'mean_of_last_90_days')
      ALERT_FLAG, -- Whether to alert on drift detection (Example: true)
      RECEIVER_ALERT_ID, -- Alert distribution list ID (Example: 'data_quality_team_001')
      ENABLED, -- Whether the drift rule is active (Example: true)
      RUN_FREQUENCY, -- How often drift is checked (Example: 'daily')
      CREATED_BY, -- Creator of the drift rule (Example: 'john.analyst@company.com')
      CREATED_AT, -- Creation timestamp (Example: '2026-01-15 09:00:00')
      UPDATED_BY, -- Last modifier of the rule (Example: 'jane.engineer@company.com')
      UPDATED_AT -- Last update timestamp (Example: '2026-01-20 16:45:00')
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE} -- Query the data drift configuration table (Example: 'main.schema_quality.data_drift_config')
    WHERE
      L1_BUSINESS_UNIT = '${businessUnit}' -- Filter by the provided business unit (Example: L1_BUSINESS_UNIT = 'Finance')
      ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""} -- Optional: filter by catalog if provided (Example: AND CATALOG_NAME = 'main')
      ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""} -- Optional: filter by schema if provided (Example: AND SCHEMA_NAME = 'processed')
      AND DATASET_NAME = '${datasetName}' -- Filter by the specific dataset name (Example: AND DATASET_NAME = 'customer_transactions')
      ${rbacDriftScopeClause}
      -- RBAC data-scope filter: only return drift rules inside the user's assigned group scope
      ${
        targetColumn
          ? `AND TARGET_COLUMN = '${targetColumn}'` // If target column provided, filter by that specific column (Example: AND TARGET_COLUMN = 'transaction_amount')
          : `AND RULE_NAME IN ( -- If no target column, filter by drift-specific rule names for dataset/row level
              'variance_check', -- Detects changes in data variance/dispersion
              'outlier_check', -- Identifies unusual values in the distribution
              'drift_check_psi_categorical', -- PSI drift detection for categorical columns
              'drift_check_psi_numeric', -- PSI drift detection for numeric columns
              'stddev_check', -- Monitors standard deviation changes
              'drift_check_kl_numeric', -- KL divergence drift for numeric data
              'normality_check', -- Validates normal distribution assumptions
              'drift_check_kl_categorical', -- KL divergence drift for categorical data
              'median_check', -- Tracks changes in median value
              'quartile1_check', -- Monitors first quartile (25th percentile)
              'quartile3_check', -- Monitors third quartile (75th percentile)
              'mode_check' -- Detects changes in the most frequent value
            )`
      }
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * API route handler for HTTP GET requests to retrieve configured data quality and data drift rules for a specified dataset.
 * This function processes incoming requests with query parameters, validates inputs, executes a SQL query against Databricks
 * to fetch rule configurations, and returns the results as JSON. It also logs all operations to Azure Event Hub for monitoring and auditing purposes.
 *
 * @param request - The incoming HTTP request(NextRequest object) containing query parameters for business unit, catalog name, schema name, dataset name, and target column.
 * @returns {Promise<NextResponse>} - A NextResponse object containing the JSON response with the retrieved rule configurations or
 * an error message with appropriate HTTP status code if validation fails or an error occurs during processing.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs automatically whenever the frontend calls this API endpoint using HTTP GET

  // Record the start time of the request for calculating execution duration and logging
  const requestStartTime = new Date();
  // Save current time so we can calculate how long the request took (like starting a stopwatch)

  const programName = "GreatExpectationsDataQualityConfiguredRulesAPI"; // Program name for logging context.
  // A label/name used in logs to identify which API is generating this log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID from request headers for auditing.
  // Read user ID from request header; if missing, treat it as Anonymous (useful for audit tracking)

  const { searchParams } = new URL(request.url);
  // Break down the request URL to read query parameters (example: ?businessUnit=...&catalogName=...&schemaName=...&datasetName=...&targetColumn=...)

  // Extracting query parameters from the URL
  const businessUnit = searchParams.get("businessUnit");
  // Get businessUnit from request URL (like selecting which database container to look in)

  const catalogName = searchParams.get("catalogName");
  // Get catalogName from request URL (like selecting which database container to look in)

  const schemaName = searchParams.get("schemaName");
  // Get schemaName from request URL (like choosing a folder inside the database)

  const datasetName = searchParams.get("datasetName");
  // Get datasetName from request URL (like picking which table/report you want details for)

  const targetColumn = searchParams.get("targetColumn");
  // Get datasetName from request URL (like picking which table/report you want details for)

  // ------------------- PARAMETER VALIDATION -------------------
  if (!businessUnit || !datasetName) {
    // If any required parameter is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: businessUnit, datasetName";
    // Clear message explaining which inputs are required

    console.error(errorMessage);
    // Print error to logs so developers/support know why the API returned 400

    // Return a 400 error with a descriptive message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 = request is invalid (user/frontend missed required inputs)
  }

  try {
    // Try block: runs normal flow; if error occurs, it goes to the catch block

    // Log informational message indicating the beginning of the operation
    console.info(
      `Starting to fetch data quality configured rules for: ${businessUnit} in Catalog: ${catalogName ?? "Unknown Catalog"}, Schema: ${schemaName ?? "Unknown Schema"}, Dataset: ${datasetName}, Target Column: ${targetColumn ?? "Unknown Column"} by user: ${user}`,
    );

    // Fetch a valid Databricks session.
    const session = await getDatabricksSession();
    // Open (or reuse) a secure connection/session to Databricks database

    // Build the SQL query to retrieve the data quality configured rules data.
    const query = buildDataQualityConfiguredRulesQuery(
      businessUnit, // Required parameter to specify which business unit's dataset configurations to query
      catalogName, // Optional parameter to specify which Databricks catalog to target (if not provided, query will not filter by catalog)
      schemaName, // Optional parameter to specify which Databricks schema to target (if not provided, query will not filter by schema)
      datasetName, // Required parameter to specify which dataset/table's configured rules to retrieve
      targetColumn, // Optional parameter to specify which target column's rules to retrieve (if not provided, query will filter by predefined rule names for dataset/row level rules
      request, // Current request carries the RBAC data scopes that become SQL filters
    );
    // Build query string using business unit + catalog + schema + dataset + target column filters (like preparing an instruction for Databricks)

    // Execute the SQL query against Databricks and fetch the results.
    const configuredRulesData = await executeQuery(session, query);
    // Run SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success of the operation to Event Hub.
    await logToEventHub({
      // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
      type: "INFO",
      // Mark this event as informational (successful normal event)
      detailMessage: `Successfully retrieved data quality configured rules for Dataset '${datasetName}' in businessUnit: '${businessUnit}' and catalog: '${catalogName ?? "Unknown Catalog"}' and schema: '${schemaName ?? "Unknown Schema"}' and targetColumn: '${targetColumn ?? "Unknown Column"}'.`,
      // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
      // Human readable success message
      programName,
      // Include API name in log for clear tracking
      startDatetime: requestStartTime,
      // Include start time so duration can be measured
      status: "SUCCESS",
      // Mark status as success for dashboard/monitoring
      actionType: "Spark_SQL_Query",
      // Categorize action type as SQL query execution
      actionDescription: `Fetch Data Quality Configured Rules from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE} for dataset: ${datasetName}`,
      // Describe the action performed and table used
      user,
      // Record who triggered the API call (audit requirement)
    });
    // End Event Hub success log

    // Return the configured rules data as a JSON response.
    return NextResponse.json(configuredRulesData);
    // Send retrieved rows back to frontend as JSON so UI can display configured rules
  } catch (error: unknown) {
    // Catch block: runs if Databricks query fails, session fails, or any unexpected error occurs

    // Log the error to Event Hub.
    const errorMessage = `Error retrieving data quality configured rules for Dataset '${datasetName}' in businessUnit: '${businessUnit}' and catalog: '${catalogName ?? "Unknown Catalog"}' and schema: '${schemaName ?? "Unknown Schema"}' and targetColumn: '${targetColumn ?? "Unknown Column"}': ${
      error instanceof Error ? error.message : "Unknown error during query execution"
    }`;
    // Extract readable error message; fallback message if error is unknown

    console.error(errorMessage, error instanceof Error ? error.stack : error); // Log the full error for debugging.
    // Print error and stack trace so developers know the exact cause/line of failure

    await logToEventHub({
      // Send failure log to Azure Event Hub for monitoring/alerting/audit
      type: "ERROR",
      // Mark this as an ERROR event since operation failed
      detailMessage: errorMessage,
      // Store detailed failure message for troubleshooting
      programName,
      // API/program name for traceability
      startDatetime: requestStartTime,
      // Start time allows calculation of how long it ran before failing
      status: "FAILED",
      // Mark status failed so monitoring tools can alert if needed
      actionType: "Spark_SQL_Query",
      // Categorize action as SQL query operation
      actionDescription: `Failed to Fetch Data Quality Configured Rules from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE} for dataset: ${datasetName}`,
      // Describe intended action for context
      user,
      // Track which user request experienced failure
    });
    // End Event Hub error log

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 indicates server-side failure (system issue, not user mistake)
  }
  // End try/catch
});
