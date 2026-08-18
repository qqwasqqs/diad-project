/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script is for the Executive Dashboard API that fetches highlights regarding data integrity and KPI performance. 
    - The script queries Databricks for two main highlights: data integrity (quality) and KPI performance.
    - It logs the success or failure of these queries to Event Hub.
    - Returns a summary of datasets, quality scores, and KPI metrics.
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
  KPI_QUALITY_EXECUTION_RESULTS_TABLE, // Table name for storing KPI quality execution results
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table name for storing information about allowed tables and their associated tags
  KPI_QUALITY_CONFIG_TABLE, // Table name for storing KPI quality configuration details
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
  dataQualityTagScopeColumns,
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * SQL query for fetching quality (data integrity) highlights.
 * - Retrieves datasets' validation status, failed rules, and quality scores.
 * - Provides a summary of validated and non-validated datasets, rule performance, etc.
 */
const buildQualityHighlightsQuery = (request: NextRequest): string => {
  // Build the RBAC filter for execution-result rows.
  // Example: business_unit=Finance only counts Finance validation results.
  const rbacExecutionScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // Build the RBAC filter for dataset-tag rows used to calculate total datasets.
  // Example: dataset=customer_master only counts that dataset in total dataset metrics.
  const rbacDatasetTagScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityTagScopeColumns("st")
  );

  return `
  -- Define the CTEs and subqueries used to aggregate and calculate various metrics about data quality
  WITH latest_results AS (
    SELECT
      st.tag_value AS L1_BUSINESS_UNIT,  -- Tag value representing the business unit level
      di.schema_name,  -- Schema name of the dataset
      di.dataset_name,  -- Dataset name
      di.RESULT_STATUS,  -- The result of the data integrity check (e.g., PASSED, FAILED)
      di.RULE_TYPE,  -- Type of the rule that was executed
      di.RULE_NAME,  -- Name of the rule that was executed
      ROW_NUMBER() OVER (
        PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC  -- Assign row numbers within each CONFIG_ID group, ordered by RUN_ID in descending order
      ) AS rn  -- To ensure we only keep the latest execution per CONFIG_ID
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Join with allowed_tables_with_tags to fetch the business unit level (L1)

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
    WHERE 1 = 1
      ${rbacExecutionScopeClause}
      -- RBAC data-scope filter: only include quality execution rows allowed by the user's groups
  ),

  -- Define a CTE to check the dataset status (whether any failed checks exist for the dataset)
  dataset_status AS (
    SELECT
      L1_BUSINESS_UNIT,  -- Business unit level
      SCHEMA_NAME,  -- Schema name
      DATASET_NAME,  -- Dataset name
      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed  -- 1 if failed, 0 if passed
    FROM latest_results  -- From the latest_results CTE
    WHERE rn = 1  -- Only consider the most recent execution for each CONFIG_ID
    GROUP BY L1_BUSINESS_UNIT, DATASET_NAME, SCHEMA_NAME  -- Group by business unit, dataset, and schema
  ),

  -- Define a CTE to calculate the count of failed rules for each business unit and dataset
  failed_rule_types AS (
    SELECT
      L1_BUSINESS_UNIT,  -- Business unit level
      RULE_TYPE,  -- Rule type (e.g., data quality checks like uniqueness, completeness)
      RULE_NAME,  -- Rule name
      COUNT(*) AS failed_count  -- Count the number of failed occurrences of the rule
    FROM latest_results  -- From the latest_results CTE
    WHERE rn = 1 AND RESULT_STATUS = 'FAILED'  -- Only include the most recent results that failed
    GROUP BY L1_BUSINESS_UNIT, RULE_TYPE, RULE_NAME  -- Group by business unit, rule type, and rule name
  ),

  -- Define a CTE to find the most failed rule type within each business unit
  most_failed_rule_type AS (
    SELECT
      L1_BUSINESS_UNIT,  -- Business unit level
      RULE_TYPE as most_failed_rule_type,  -- The most frequently failed rule type
      RULE_NAME as most_failed_rule_name  -- The most frequently failed rule name
    FROM (
      SELECT
        L1_BUSINESS_UNIT,  -- Business unit level
        RULE_TYPE,  -- Rule type
        RULE_NAME,  -- Rule name
        ROW_NUMBER() OVER (PARTITION BY L1_BUSINESS_UNIT ORDER BY failed_count DESC) as rn  -- Rank the failed rules by frequency of failure
      FROM failed_rule_types  -- From the failed_rule_types CTE
    ) t
    WHERE rn = 1  -- Select the most frequent (most failed) rule type
  ),

  -- Define a CTE to filter tables in the schemas defined
  filtered_tables AS (
    SELECT
      t.table_catalog,  -- Table catalog
      t.table_schema,  -- Table schema
      t.table_name,  -- Table name
      st.tag_value AS L1_BUSINESS_UNIT,  -- Business unit level from the allowed_tables_with_tags table
      ROW_NUMBER() OVER (
        PARTITION BY table_name, SPLIT(table_schema, '_')[0]  -- Partition by table name and the first part of the schema name (before the underscore)
        ORDER BY CASE WHEN RIGHT(table_schema, 2) = '_v' THEN 1 ELSE 0 END, table_schema  -- Order by versioning suffix (_v)
      ) AS rn  -- Rank the tables based on schema and versioning
    FROM system.information_schema.tables t  -- From the system.tables information schema
    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      ON t.table_catalog = SPLIT(st.table_full_name, '\\\\.')[0]

      AND t.table_schema = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Join with allowed_tables_with_tags for business unit level

      AND t.table_name = SPLIT(st.table_full_name, '\\\\.')[2]
    WHERE 1 = 1
      ${rbacDatasetTagScopeClause}
      -- RBAC data-scope filter: only count datasets inside the user's assigned groups
  ),

  -- Define a CTE to count the total number of datasets in each business unit
  total_datasets AS (
    SELECT
      L1_BUSINESS_UNIT,  -- Business unit level
      COUNT(DISTINCT concat(table_schema, '.', table_name)) AS total_datasets  -- Count the unique datasets in each business unit (schema.table)
    FROM filtered_tables  -- From the filtered_tables CTE
    WHERE rn = 1  -- Only include the top-ranked tables (latest version)
    GROUP BY L1_BUSINESS_UNIT  -- Group by business unit level
  ),

  -- Define a CTE to count the rules executed for each business unit and their status (PASSED, FAILED)
  rule_counts AS (
    SELECT
      L1_BUSINESS_UNIT,  -- Business unit level
      COUNT(*) AS total_rules_executed,  -- Total number of rules executed for the business unit
      SUM(CASE WHEN RESULT_STATUS = 'PASSED' THEN 1 ELSE 0 END) AS passed_rules_count,  -- Count the passed rules
      SUM(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS failed_rules_count  -- Count the failed rules
    FROM latest_results  -- From the latest_results CTE
    WHERE rn = 1  -- Only include the most recent results
    GROUP BY L1_BUSINESS_UNIT  -- Group by business unit level
  ),

  -- Define a CTE to summarize the overall dataset and rule statuses per business unit
  summary AS (
    SELECT
      ds.L1_BUSINESS_UNIT,  -- Business unit level
      COUNT(ds.dataset_name) AS validated_datasets,  -- Count the datasets that have passed validation
      SUM(CASE WHEN ds.has_failed = 1 THEN 1 ELSE 0 END) AS failed_datasets,  -- Count datasets that failed validation
      SUM(CASE WHEN ds.has_failed = 0 THEN 1 ELSE 0 END) AS passed_datasets,  -- Count datasets that passed validation
      td.total_datasets,  -- Total datasets for the business unit
      mf.most_failed_rule_type,  -- The most frequently failed rule type
      mf.most_failed_rule_name,  -- The most frequently failed rule name
      rc.total_rules_executed,  -- Total number of rules executed
      rc.passed_rules_count,  -- Total number of passed rules
      rc.failed_rules_count,  -- Total number of failed rules
      CASE
        WHEN rc.total_rules_executed > 0 THEN ROUND((rc.passed_rules_count / rc.total_rules_executed) * 100, 2)  -- Calculate overall quality score (percentage of passed rules)
        ELSE 0  -- If no rules executed, set score to 0
      END AS overall_quality_score
    FROM dataset_status ds  -- From the dataset_status CTE
    LEFT JOIN total_datasets td
      ON ds.L1_BUSINESS_UNIT = td.L1_BUSINESS_UNIT  -- Join with total datasets for each business unit
    LEFT JOIN most_failed_rule_type mf
      ON ds.L1_BUSINESS_UNIT = mf.L1_BUSINESS_UNIT  -- Join with most failed rule types
    LEFT JOIN rule_counts rc
      ON ds.L1_BUSINESS_UNIT = rc.L1_BUSINESS_UNIT  -- Join with rule counts for each business unit
    GROUP BY ds.L1_BUSINESS_UNIT, td.total_datasets, mf.most_failed_rule_type, mf.most_failed_rule_name, rc.total_rules_executed, rc.passed_rules_count, rc.failed_rules_count
  )

  -- Final SELECT to summarize and calculate the overall quality score for each business unit
  SELECT
    SUM(validated_datasets) AS validated_datasets,  -- Total number of validated datasets
    SUM(total_datasets) AS total_datasets,  -- Total number of datasets
    SUM(total_datasets) - SUM(validated_datasets) AS non_validated_datasets,  -- Total number of non-validated datasets
    SUM(failed_datasets) AS failed_datasets,  -- Total number of failed datasets
    SUM(validated_datasets) - SUM(failed_datasets) AS successfully_validated_datasets, -- Total number of successfully validated datasets
    CONCAT(ROUND((SUM(validated_datasets) / SUM(total_datasets)) * 100, 2), '%') AS validated_datasets_percentage,  -- Percentage of validated datasets
    CONCAT(ROUND(((SUM(total_datasets) - SUM(validated_datasets)) / SUM(total_datasets)) * 100, 2), '%') AS non_validated_datasets_percentage,  -- Percentage of non-validated datasets
    FIRST(most_failed_rule_type, true) AS most_failed_rule_type,  -- Most frequently failed rule type (first in the result)
    FIRST(most_failed_rule_name, true) AS most_failed_rule_name,  -- Most frequently failed rule name (first in the result)
    SUM(total_rules_executed) AS total_rules_executed,  -- Total number of rules executed
    SUM(passed_rules_count) AS passed_rules_count,  -- Total number of passed rules
    SUM(failed_rules_count) AS failed_rules_count,  -- Total number of failed rules
    CASE
      WHEN SUM(total_rules_executed) > 0 THEN ROUND((SUM(passed_rules_count) / SUM(total_rules_executed)) * 100, 2)  -- Calculate overall quality score based on rules executed
      ELSE 0  -- If no rules executed, set score to 0
    END AS overall_quality_score  -- Final overall quality score for the business unit
  FROM summary  -- From the summary CTE where all the final calculations are made
`;
};

/**
 * SQL query for fetching KPI highlights.
 * - Retrieves the validation status of KPIs across various brands.
 * - Provides a summary of failed and passed KPIs, including their overall performance.
 */
const buildKpiHighlightsQuery = (request: NextRequest): string => {
  // Build the RBAC filter for KPI config rows joined into execution results.
  // Example: brand=Teva only includes KPI executions for the Teva brand.
  const rbacKpiScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  return `
  -- Define the latest_results CTE to get the most recent execution for each KPI based on the RUN_ID
  WITH latest_results AS (
    SELECT
      k.*,  -- Select all columns from the KPI execution results table
      ROW_NUMBER() OVER (
        PARTITION BY k.CONFIG_ID, k.KPI_UNIQUE_IDENTIFIER, k.KPI_UNIQUE_IDENTIFIER_VALUE
        ORDER BY k.RUN_ID DESC  -- Order by RUN_ID in descending order to get the latest record
      ) AS rn  -- Assign row numbers to each record within the same CONFIG_ID and KPI group
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k
    -- From the KPI execution results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results with the KPI configuration table based on CONFIG_ID to retrieve configuration details for each execution  
    WHERE c.ENABLED = TRUE 
    -- Only include enabled config rules
    ${rbacKpiScopeClause}
    -- RBAC data-scope filter: only include KPI execution rows allowed by the user's groups
  ),
  
  -- Define the kpi_status CTE to get the latest status of each KPI (whether it passed or failed)
  kpi_status AS (
    SELECT
      BRAND,  -- Brand associated with the KPI
      KPI_NAME,  -- The name of the KPI
      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed  -- Determine if the KPI has failed (1) or passed (0)
    FROM latest_results  -- From the latest_results CTE
    WHERE rn = 1  -- Only take the most recent result for each KPI
    GROUP BY
      BRAND,  -- Group by BRAND
      KPI_NAME  -- Group by KPI_NAME to get the status for each unique KPI
  ),
  
  -- Define the total_KPIs CTE to count the total KPIs for each brand
  total_KPIs AS (
    SELECT
      k.BRAND,  -- Brand associated with the KPIs
      COUNT(DISTINCT k.KPI_NAME) AS total_kpis  -- Count the total number of unique KPIs for each brand
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k -- From the KPI execution results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results with the KPI configuration table based on CONFIG_ID to retrieve configuration details for each execution  
    WHERE c.ENABLED = TRUE 
    -- Only include enabled config rules
    ${rbacKpiScopeClause}
    -- RBAC data-scope filter: keep total KPI counts inside the user's allowed groups
    GROUP BY
      k.BRAND  -- Group by BRAND to calculate total KPIs for each brand
  ),
  
  -- Define the brand_summary CTE to summarize KPIs' statuses (validated, failed, passed)
  brand_summary AS (
    SELECT
      ks.BRAND,  -- Brand associated with the KPI
      COUNT(DISTINCT ks.kpi_name) AS validated_kpis,  -- Count the validated KPIs
      SUM(CASE WHEN ks.has_failed = 1 THEN 1 ELSE 0 END) AS failed_kpis,  -- Count the KPIs that failed
      SUM(CASE WHEN ks.has_failed = 0 THEN 1 ELSE 0 END) AS passed_kpis,  -- Count the KPIs that passed
      tk.total_kpis,  -- The total number of KPIs for the brand from total_KPIs CTE
      CONCAT(
        ROUND((COUNT(DISTINCT ks.kpi_name) / tk.total_kpis)*100, 2),  -- Calculate percentage of validated KPIs
        '%'
      ) AS validated_kpis_percentage,  -- Percentage of validated KPIs
      CONCAT(
        ROUND((SUM(CASE WHEN ks.has_failed = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT ks.kpi_name))*100, 2),  -- Percentage of failed KPIs
        '%'
      ) AS failed_kpis_percentage,  -- Percentage of failed KPIs
      CONCAT(
        ROUND((SUM(CASE WHEN ks.has_failed = 0 THEN 1 ELSE 0 END) / COUNT(DISTINCT ks.kpi_name))*100, 2),  -- Percentage of passed KPIs
        '%'
      ) AS passed_kpis_percentage  -- Percentage of passed KPIs
    FROM
      kpi_status ks  -- From the kpi_status CTE
    LEFT JOIN
      total_KPIs tk  -- Left join to get the total number of KPIs per brand
        ON ks.BRAND = tk.BRAND  -- Join on BRAND
    GROUP BY
      ks.BRAND, tk.total_kpis  -- Group by BRAND and total KPIs for the brand
  ),
  
  -- Define the most_failed_brand CTE to get the brand with the most failed KPIs
  most_failed_brand AS (
    SELECT
      BRAND,  -- Brand associated with the failed KPIs
      failed_kpis  -- Number of failed KPIs for the brand
    FROM
      brand_summary  -- From the brand_summary CTE
    ORDER BY
      failed_kpis DESC  -- Order by the number of failed KPIs in descending order
    LIMIT 1  -- Select the brand with the highest number of failed KPIs
  )
  
  -- Final SELECT statement to aggregate and summarize the KPI highlights
  SELECT
    SUM(total_kpis) AS total_KPIs,  -- Total number of KPIs across all brands
    SUM(validated_kpis) AS validated_KPIs,  -- Total number of validated KPIs
    SUM(total_kpis) - SUM(validated_kpis) AS non_validated_KPIs,  -- Total number of non-validated KPIs
    SUM(failed_kpis) AS failed_KPIs,  -- Total number of failed KPIs
    SUM(validated_kpis) - SUM(failed_kpis) AS successfully_validated_KPIs, -- Total number of successfuly validated KPIs
    SUM(passed_kpis) AS passed_KPIs,  -- Total number of passed KPIs
    CONCAT(
      ROUND((SUM(validated_kpis) / SUM(total_kpis))*100, 2),  -- Calculate percentage of validated KPIs
      '%'
    ) AS validated_KPIs_percentage,  -- Percentage of validated KPIs
    CONCAT(
      ROUND(((SUM(total_kpis) - SUM(validated_kpis)) / SUM(total_kpis))*100, 2),  -- Calculate percentage of non-validated KPIs
      '%'
    ) AS non_validated_KPIs_percentage,  -- Percentage of non-validated KPIs
    ROUND((SUM(passed_kpis) / SUM(validated_kpis))*100, 2) AS overall_KPIs_score,  -- Overall score based on passed KPIs vs validated KPIs
    (SELECT BRAND FROM most_failed_brand) AS most_failed_KPI_brand  -- Brand with the most failed KPIs from the most_failed_brand CTE
  FROM
    brand_summary;  -- From the brand_summary CTE which contains the aggregated KPI data
`;
};

/* ----------------------------- API ROUTE HANDLER ----------------------------- */

/**
 * API route handler to fetch executive dashboard highlights (data integrity and KPI).
 * - Executes SQL queries for quality and KPI highlights.
 * - Logs the execution details to Event Hub (for success/failure tracking).
 * - Returns a JSON response with the queried highlights.
 *
 * @param {NextRequest} request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {NextResponse} - A JSON response containing the fetched highlights data.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs whenever someone calls this API endpoint using an HTTP GET request

  const requestStartTime = new Date();
  // Capture the exact time when the API request started
  // This is useful for measuring how long the request took (like a stopwatch)

  const programName = "ExecutiveDashboardHighlightsAPI";
  // A human-readable name for this API, used in logs so teams know which system created the log

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Try to read the user ID from the request headers
  // If no user ID is provided, label the request as coming from an "Anonymous" user

  try {
    console.info(
      "Executing Databricks session to fetch executive highlights..."
    );
    // Log a message indicating that the system is about to fetch data from Databricks
    // This is similar to saying: "Starting database work now"

    // Retrieve the Databricks session for executing queries
    const session = await getDatabricksSession();
    // Open (or reuse) a secure connection session to Databricks
    // Think of this like logging into the database before asking it questions

    // Execute both queries (quality and KPI highlights) in parallel to improve performance
    const [qualityHighlights, kpiHighlights] = await Promise.all([
      executeQuery(session, buildQualityHighlightsQuery(request)),
      executeQuery(session, buildKpiHighlightsQuery(request)),
    ]);
    // Run two SQL queries at the same time instead of one after the other
    // This is similar to asking two people to fetch different reports simultaneously to save time

    // Log the successful execution of the queries to Event Hub
    await logToEventHub({
      type: "INFO",
      // Mark this log as informational (not a warning or error)
      detailMessage:
        "SQL queries executed successfully for executive dashboard highlights.",
      // A clear message stating that everything worked as expected
      programName,
      // Identifies which application or API generated this log
      startDatetime: requestStartTime,
      // Pass the request start time so the logging system can calculate execution duration
      status: "SUCCESS",
      // Indicates the operation completed successfully
      actionType: "Spark_SQL_Query",
      // Categorizes the action as a Spark SQL database query
      actionDescription: `Executive Dashboard View Overall Dataset Stats from tables: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}`,
      // Describes exactly what business action was performed and which tables were accessed
      user,
      // Records which user triggered this API call (for auditing and compliance)
    });

    // Return the results as a JSON response (this is what the frontend/dashboard will receive)
    return NextResponse.json({
      // Quality Highlights:
      // If the database returned at least one row, send the first row (summary record).
      // Otherwise, send an empty object {} so the dashboard still works without breaking.
      qualityHighlights:
        qualityHighlights && qualityHighlights.length > 0
          ? qualityHighlights[0] // First row = summary (example: total records, invalid records, etc.)
          : {}, // No data found → return blank object instead of error

      // KPI Highlights:
      // Same logic as above — take the first row if available.
      // If no result came back, return {} as a safe fallback.
      kpiHighlights:
        kpiHighlights && kpiHighlights.length > 0
          ? kpiHighlights[0] // First row = KPI summary values
          : {}, // No data found → return blank object safely
    });
    // This JSON response is sent back to the frontend application (Executive Dashboard UI).
    // The dashboard UI reads this data and displays the highlights to executives.
    // Example: "Data Integrity Score", "Total KPI Passed", "Total Failed Checks", etc.
  } catch (error: unknown) {
    // This block runs if *anything* fails above (database issue, network error, etc.)

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Convert unknown failures into a safe, readable message for logs and the API response.

    console.error("Error during SQL query execution:", errorMessage);
    // Log the error locally so developers/operators can see it immediately in logs

    // Log the error details to Event Hub for traceability
    await logToEventHub({
      type: "ERROR",
      // Mark this log as an error (high importance)
      detailMessage: errorMessage,
      // Store the error message, or a fallback message if none exists
      programName,
      // Identify which API encountered the error
      startDatetime: requestStartTime,
      // Include the start time to calculate how long the request ran before failing
      status: "FAILED",
      // Clearly indicate the operation failed
      actionType: "Spark_SQL_Query",
      // Indicates the failure happened during a SQL query operation
      actionDescription: `Executive View Overall Dataset Stats from tables: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}`,
      // Business description of what the API *was trying* to do when it failed
      user,
      // Record which user was affected by this failure
    });

    // Return an error response with appropriate status and message
    return NextResponse.json(
      { error: errorMessage || "Internal Server Error" },
      // Send a simple error message back to the frontend

      { status: 500 }
      // HTTP 500 indicates a server-side failure (not a user mistake)
    );
  }
});
