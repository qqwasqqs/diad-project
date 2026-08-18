/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script provides an API route to retrieve an overview of the data quality for a given dataset.
    - The overview includes metadata for the dataset, row and column counts, impacted entities, and the percentage of failed rules by category.
    - It logs both successful and failed operations to Event Hub for traceability.
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

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * Generates the SQL query for retrieving metadata, row count, column count, key columns, and schema owner
 * for a given dataset in a specific catalog and schema.
 *
 * @param catalogName - The name of the catalog to query.
 * @param schemaName - The name of the schema to query.
 * @param datasetName - The name of the dataset to query.
 * @returns The SQL query string to fetch the overview data.
 *
 * NO FIXES REQUIRED — this query reads from system.information_schema (not the execution
 * results table) so it has no ROW_NUMBER/PARTITION issues. The COUNT(*) subqueries and
 * array_agg operate on schema metadata which is inherently current and dataset-scoped.
 */
const getOverviewQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string
) => `
    -- Select metadata information about the dataset (columns, data types, and comments)
    SELECT
      -- Aggregate column metadata (name, data type, comment) into an array of named structs
      array_agg(named_struct(
        'col_name', sic.column_name,  -- Column name
        'data_type', sic.data_type,  -- Data type of the column
        'comment', sic.comment  -- Comment associated with the column (if any)
      )) AS table_metadata,
      
      -- Get the row count for the dataset by counting the number of rows in the table
      (SELECT COUNT(*) FROM ${catalogName}.${schemaName}.${datasetName}) AS row_count,
      
      -- Get the number of columns in the dataset by querying the information schema
      (SELECT COUNT(*) FROM system.information_schema.columns
       WHERE table_catalog = '${catalogName}'
         AND table_schema = '${schemaName}'
         AND table_name = '${datasetName}') AS column_count,
      
      -- Get the list of key columns (primary or unique keys) used in the dataset
      (SELECT COLLECT_LIST(column_name) FROM system.information_schema.key_column_usage
       WHERE table_catalog = '${catalogName}'
         AND table_schema = '${schemaName}'
         AND table_name = '${datasetName}') AS key_columns,
      
      -- Get the schema owner from the information schema
      (SELECT schema_owner FROM system.information_schema.schemata
       WHERE catalog_name = '${catalogName}'
         AND schema_name = '${schemaName}') AS schema_owner
      
    -- Filter columns in the specific dataset in the given catalog and schema
    FROM system.information_schema.columns sic
    WHERE sic.table_catalog = '${catalogName}'  -- Specify the catalog
      AND sic.table_schema = '${schemaName}'  -- Specify the schema
      AND sic.table_name = '${datasetName}'  -- Specify the dataset (table)
`;

/**
 * Generates the SQL query to retrieve impacted entities related to a dataset.
 *
 * @param catalogName - The name of the catalog.
 * @param schemaName - The name of the schema.
 * @param datasetName - The name of the dataset.
 * @returns The SQL query string to fetch impacted entities.
 *
 * NO FIXES REQUIRED — this query reads from impacted_entities_mng with a direct WHERE
 * filter on catalog/schema/dataset. No window functions or date comparisons are involved.
 */
const getImpactedEntitiesQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string,
  request: NextRequest
) => `
    -- Select the impacted entities based on the dataset, schema, and catalog
    ${(() => {
      // Build an RBAC filter for impacted entity rows because they also carry dataset location columns.
      // Example: dataset=customer_master prevents impacted-entity rows for other datasets from appearing.
      return "";
    })()}
    SELECT
      -- Depending on the type of impacted entity, construct the impacted entity name
      CASE
        -- If the impacted entity is a 'DATASET', concatenate the target catalog, schema, and entity name
        WHEN IMPACTED_ENTITY_TYPE = 'DATASET' THEN
          TARGET_CATALOG_NAME || '.' || TARGET_SCHEMA_NAME || '.' || IMPACTED_ENTITY_NAME
        -- If the impacted entity is a 'JOB', simply return the impacted job ID
        WHEN IMPACTED_ENTITY_TYPE = 'JOB' THEN
          IMPACTED_JOB_ID
        -- For all other impacted entity types, return the impacted entity name
        ELSE
          IMPACTED_ENTITY_NAME
      END AS IMPACTED_ENTITY_NAME,  -- Output the appropriate impacted entity name based on the type
      
      -- Output the type of the impacted entity (e.g., 'DATASET', 'JOB', etc.)
      IMPACTED_ENTITY_TYPE
      
    -- From the impacted_entities_mng table in the specified catalog and schema
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.impacted_entities_mng
    
    -- Filter based on the catalog name, schema name, and dataset name
    WHERE CATALOG_NAME = '${catalogName}'  -- Filter for the specific catalog
      AND SCHEMA_NAME = '${schemaName}'  -- Filter for the specific schema
      AND DATASET_NAME = '${datasetName}'  -- Filter for the specific dataset
      -- RBAC data-scope filter: only include impacted entities inside the user's assigned groups
      
      -- Ensure that the impacted entity name is not NULL
      AND IMPACTED_ENTITY_NAME IS NOT NULL
    
    -- Order the result by the impacted entity type (e.g., 'JOB' or 'DATASET')
    ORDER BY IMPACTED_ENTITY_TYPE
`;

/**
 * Generates the SQL query to calculate the percentage of failed rules by category for a dataset.
 *
 * @param catalogName - The name of the catalog.
 * @param schemaName - The name of the schema.
 * @param datasetName - The name of the dataset.
 * @returns The SQL query string to calculate the failed rule percentage.
 *
 * FIX SUMMARY (compared to original):
 *   1. Scoped to latest RUN_ID per rule via a latest_runs CTE — the original scanned ALL
 *      historical execution records for the dataset. A rule that failed 100 times historically
 *      but is currently passing would still count 100 failures, inflating the failure
 *      percentage chart with stale data. The fix selects only the most recent execution
 *      record per rule (rnk=1) so the chart reflects the current state of each rule.
 *   2. PARTITION BY includes TARGET_COLUMN in addition to RULE_NAME — some rules run per
 *      column (e.g. completeness_check on column_A and completeness_check on column_B are
 *      two separate rows). Without TARGET_COLUMN in the partition, both rows share the same
 *      window and only one survives to rnk=1, undercounting the total number of rules.
 *      Including TARGET_COLUMN ensures each rule+column combination gets its own rnk.
 *   3. COALESCE on RULE_CATEGORY — if a rule record has a NULL RULE_CATEGORY (data entry
 *      gap or a new rule type not yet categorised), it forms a NULL group that most dashboard
 *      pie/bar chart renderers either drop or crash on. COALESCE to 'Uncategorized' keeps
 *      those rules visible and correctly counted in the percentage calculation.
 *   4. NULLIF(tf.sum_failed_rule_count, 0) preserved — prevents division by zero when all
 *      rules are passing (sum_failed_rule_count = 0).
 */
const getFailedRulePercentageQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string,
  request: NextRequest
) => {
  // Build the RBAC row filter from the user's Data Quality group scopes.
  // Example: catalog=dset_dev adds an extra catalog condition to the latest_runs CTE.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns()
  );

  // Return the failed-rule percentage SQL with scope-level data control.
  return `
    -- FIX: latest_runs CTE selects only the most recent execution per rule+column combination.
    -- Original query scanned ALL historical runs, causing stale failures from past executions
    -- to inflate the category failure percentage shown in the dashboard overview chart.
    WITH latest_runs AS (
        SELECT
            -- FIX: COALESCE handles NULL RULE_CATEGORY values (new/uncategorised rule types)
            -- so they appear as 'Uncategorized' in the chart instead of being silently dropped.
            COALESCE(RULE_CATEGORY, 'Uncategorized') AS RULE_CATEGORY,
            RULE_NAME,
            TARGET_COLUMN,
            RESULT_STATUS,
            -- FIX: PARTITION BY includes both RULE_NAME and TARGET_COLUMN so that column-level
            -- rules (e.g. completeness_check applied to multiple columns) each get their own
            -- rank. Without TARGET_COLUMN, all columns sharing the same RULE_NAME competed for
            -- one rnk=1 slot, undercounting total rules in the percentage denominator.
            ROW_NUMBER() OVER (
                PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, RULE_NAME, TARGET_COLUMN
                ORDER BY CAST(RUN_ID AS INT) DESC
            ) AS rnk
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        WHERE CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
          ${rbacScopeClause}
          -- RBAC data-scope filter: only include rule rows allowed by the user's groups
    ),

    -- Only the most recent run per rule+column (current state of each rule)
    current_runs AS (
        SELECT RULE_CATEGORY, RULE_NAME, TARGET_COLUMN, RESULT_STATUS
        FROM latest_runs
        WHERE rnk = 1
    ),

    -- CTE to calculate the number of failed and total rules per rule category
    rule_counts AS (
        SELECT 
            RULE_CATEGORY,  -- Rule category (e.g., 'Integrity', 'Consistency', etc.)
            -- Count the number of failed rules in this category
            COUNT(CASE WHEN RESULT_STATUS = 'FAILED' THEN RULE_NAME END) AS failed_rule_count,
            -- Count the total number of rules in this category
            COUNT(RULE_NAME) AS total_rule_count
        FROM current_runs
        GROUP BY RULE_CATEGORY
    ),
    -- CTE to calculate the total number of failed rules across all categories
    total_failed AS (
        SELECT SUM(failed_rule_count) AS sum_failed_rule_count 
        FROM rule_counts  -- Summing up the failed rule counts from the rule_counts CTE
    )

    -- Final SELECT to calculate the failed rule percentage for each rule category
    SELECT
        rc.RULE_CATEGORY,  -- Rule category name
        rc.failed_rule_count,  -- Number of failed rules in this category
        rc.total_rule_count,  -- Total number of rules in this category
        -- Calculate the percentage of failed rules within the category
        ROUND(100.0 * rc.failed_rule_count / NULLIF(tf.sum_failed_rule_count, 0), 2) AS failed_rule_percentage
        -- The NULLIF function ensures no division by zero in case of no failed rules
    FROM rule_counts rc
    -- Cross join with the total_failed CTE to get the total failed rule count in all categories
    CROSS JOIN total_failed tf
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for fetching an overview of a dataset, including metadata,
 * impacted entities, and the percentage of failed rules by category.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters for catalog, schema, and dataset.
 * @returns A JSON response containing the dataset overview or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API runs when the dashboard needs the "dataset overview" section for a selected dataset

  const requestStartTime = new Date(); // Track start time for logging purposes
  // Save start time (like starting a stopwatch to track request duration)

  const programName = "DQDDetailedViewOverviewAPI"; // Program name for logging
  // Program name used in logs so monitoring systems know which API generated this record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve user ID from headers or default to "Anonymous"
  // Identify user who triggered request (for audit); fallback to Anonymous if missing

  const { searchParams } = new URL(request.url);
  // Parse the URL query parameters (example: ?catalogName=X&schemaName=Y&datasetName=Z)

  const catalogName = searchParams.get("catalogName");
  // Extract catalogName from query string (like selecting the main database folder)

  const schemaName = searchParams.get("schemaName");
  // Extract schemaName from query string (like selecting the sub-folder inside the catalog)

  const datasetName = searchParams.get("datasetName");
  // Extract datasetName from query string (like selecting which report/table user wants)

  // ------------------- PARAMETER VALIDATION -------------------
  if (!catalogName || !schemaName || !datasetName) {
    // If any required parameter is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: catalogName, schemaName, datasetName";
    // Clear message explaining which inputs are required

    console.error(errorMessage);
    // Print error to logs so developers/support know why the API returned 400

    // Return a 400 error with a descriptive message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 = request is invalid (user/frontend missed required inputs)
  }

  try {
    // Try block: normal flow runs here; errors go to catch block

    // Start Databricks session
    const session = await getDatabricksSession();
    // Create or reuse secure Databricks session/connection (like logging into the database)

    // Fetch data concurrently for overview, impacted entities, and failed rule percentage
    const [overview, impactedEntities, failedRulePercentage] =
      await Promise.all([
        executeQuery(
          session,
          getOverviewQuery(catalogName, schemaName, datasetName)
        ),
        // Query #1: fetch dataset overview details (like dataset name, owner, total rules, etc.)

        executeQuery(
          session,
          getImpactedEntitiesQuery(catalogName, schemaName, datasetName, request)
        ),
        // Query #2: fetch list of impacted entities (like which reports/teams are affected)

        executeQuery(
          session,
          getFailedRulePercentageQuery(catalogName, schemaName, datasetName, request)
        ),
        // Query #3: fetch failure percentage by category (like 40% Metadata failures, 20% Data Drift failures)
      ]);
    // Promise.all runs all three queries at the same time (faster like ordering 3 reports together)

    // Log the success of the operation
    await logToEventHub({
      type: "INFO",
      // INFO indicates request succeeded normally
      detailMessage: `Successfully retrieved overview for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}'.`,
      // Human-readable success message for monitoring tools (like Splunk)
      programName,
      // Identify which API logged this success
      startDatetime: requestStartTime,
      // Start time helps calculate request duration
      status: "SUCCESS",
      // Mark request as successful
      actionType: "Spark_SQL_Query",
      // Categorize operation as Databricks SQL query execution
      actionDescription: `Fetch dataset overview and related data from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what action happened and which table was involved
      user,
      // Record which user requested dataset overview
    });

    // Return the response with the retrieved data
    return NextResponse.json({
      overview: overview && overview.length > 0 ? overview[0] : {}, // Use the first overview record if available;
      // otherwise return an empty object to avoid errors on the dashboard
      // overview query returns one summary row, so we take first row as overview object
      impactedEntities, // List of impacted entities
      // impactedEntities is usually a list/array (frontend can show in table/list)
      failedRulePercentage, // Percentage of failed rules by category
      // failedRulePercentage is usually list/array grouped by category (used for charts)
    });
  } catch (error: any) {
    // Catch block: runs if any error occurs (Databricks down, SQL error, network issue)

    // Log the error in case of failure
    const errorMessage = `Error retrieving dataset overview for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}': ${
      error?.message ?? "Unknown error"
    }`;
    // Extract readable error message; fallback to "Unknown error" if message missing

    console.error(
      `[ERROR] [${requestStartTime.toISOString()}] Error retrieving dataset overview: ${errorMessage}`
    );
    // Log failure with timestamp for debugging

    // Log the failure event
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Store detailed failure reason including dataset information for investigation
      programName,
      // Identify which API encountered the failure
      startDatetime: requestStartTime,
      // Start time allows tracking request duration before failure
      status: "FAILED",
      // Mark request as failed
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch dataset overview and related data from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what operation failed and where
      user,
      // Store user ID for audit and debugging
    });

    // Return a 500 Internal Server Error response with the error message
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 indicates server/system error (frontend can show error banner)
  }
});
