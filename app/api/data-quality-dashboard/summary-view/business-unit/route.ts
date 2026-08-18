/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This API route handles the retrieval of dataset validation highlights and L1 business units.
    - It fetches overall dataset statistics (validated, failed, passed) and provides a list of L1 business units.
    - The queries are executed against a Databricks database to fetch the latest dataset status.
    - The response includes dataset statistics and a list of L1 business units.
    - Success and error events are logged for traceability.
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
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * SQL query to fetch highlights for dataset validation, including the number of validated, passed, and failed datasets.
 * It also calculates the percentages of passed, failed, and validated datasets.
 *
 * @returns SQL query string to fetch dataset validation statistics
 */
const buildDatasetHighlightsQuery = (request: NextRequest): string => {
  // Build RBAC filters for execution rows and for the dataset-tag rows used to count total datasets.
  // Example: business_unit=Finance keeps both validated and total dataset counts inside Finance.
  const executionScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // The total-dataset CTE reads tags as alias "st", so the scope filter uses tag-derived columns.
  const tagScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityTagScopeColumns("st")
  );

  // Return the full highlights SQL with RBAC filters applied at the source CTEs.
  return `
  WITH latest_results AS (
    -- Step 1: identify the latest run record for each rule configuration (CONFIG_ID)
    -- This ensures we do NOT count old validation results (like reading only the most recent report)

    SELECT
      st.tag_value as L1_BUSINESS_UNIT,
      -- Business unit name (example: "Retail", "US Commercial")

      di.schema_name,
      -- Schema name where dataset exists (like a folder name)

      di.dataset_name,
      -- Dataset/table name (like a file name inside a folder)

      di.RESULT_STATUS,
      -- Status of validation run: PASSED / FAILED

      ROW_NUMBER() OVER (PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC) AS rn
      -- Row number ranking: rn=1 means latest run for that rule config
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    -- Table containing rule execution results (validation audit)

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags table to map schemas to business units

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match dataset schema to schema tag schema name

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- Ensure BU stored in results matches BU tag value
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${executionScopeClause}
      -- RBAC data-scope filter: only include execution rows allowed by the user's groups
  ),

  dataset_status AS (
    -- Step 2: collapse rule-level results into dataset-level status
    -- If ANY rule failed for a dataset → dataset is considered failed

    SELECT
      L1_BUSINESS_UNIT,
      -- Business unit

      SCHEMA_NAME,
      -- Schema name

      DATASET_NAME,
      -- Dataset name

      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed
      -- has_failed=1 means dataset has at least one failed rule
    FROM latest_results

    WHERE rn = 1
    -- Only latest results are considered (rn=1)

    GROUP BY L1_BUSINESS_UNIT, DATASET_NAME, SCHEMA_NAME
    -- Group by dataset so dataset appears once
  ),

  filtered_tables AS (
    -- Step 3: find all datasets physically existing in Databricks (even if not validated)
    -- This helps calculate total datasets = validated + non-validated

    SELECT
      t.table_catalog,
      -- Catalog name

      t.table_schema,
      -- Schema name

      t.table_name,
      -- Table name

      st.tag_value AS L1_BUSINESS_UNIT,
      -- Business unit derived from schema tags

      ROW_NUMBER() OVER (
        PARTITION BY table_name, SPLIT(table_schema, '_')[0]
        -- Group by table name and base schema prefix

        ORDER BY CASE WHEN RIGHT(table_schema, 2) = '_v' THEN 1 ELSE 0 END, table_schema
        -- Prefer non-versioned schemas or lowest sorted schema
      ) AS rn
      -- rn=1 means the chosen best match version of the dataset

    FROM system.information_schema.tables t
    -- System table listing all datasets

    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join table tags to get business unit mapping

      ON t.table_catalog = SPLIT(st.table_full_name, '\\\\.')[0]

      AND t.table_schema = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Match schema name in tables list to schema tags

      AND t.table_name = SPLIT(st.table_full_name, '\\\\.')[2]
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${tagScopeClause}
      -- RBAC data-scope filter: only count physical datasets allowed by the user's groups
  ),

  total_datasets AS (
    -- Step 4: count how many datasets exist in each BU (total possible datasets)

    SELECT
      L1_BUSINESS_UNIT,
      -- BU name

      COUNT(DISTINCT concat(table_catalog, '.', table_schema, '.', table_name)) AS total_datasets
      -- Count datasets (unique schema.table)
    FROM filtered_tables

    WHERE rn = 1
    -- Only count best schema/table version (avoid duplicates from versions)

    GROUP BY L1_BUSINESS_UNIT
    -- One row per business unit
  ),

  summary AS (
    -- Step 5: summarize validations results per BU

    SELECT
      ds.L1_BUSINESS_UNIT,
      -- BU name

      COUNT(ds.dataset_name) AS validated_datasets,
      -- Number of datasets that actually ran validation (appear in execution results)

      SUM(CASE WHEN ds.has_failed = 1 THEN 1 ELSE 0 END) AS failed_datasets,
      -- Number of validated datasets that have failures

      SUM(CASE WHEN ds.has_failed = 0 THEN 1 ELSE 0 END) AS passed_datasets,
      -- Number of validated datasets that have no failures

      td.total_datasets
      -- Total datasets available in BU (validated + not validated)

    FROM dataset_status ds
    -- Dataset status table (validated datasets)

    LEFT JOIN total_datasets td
      -- Join total datasets for BU

      ON ds.L1_BUSINESS_UNIT = td.L1_BUSINESS_UNIT
      -- Match on BU name

    GROUP BY ds.L1_BUSINESS_UNIT, td.total_datasets
    -- Aggregate results per BU
  )

  SELECT
    SUM(validated_datasets) AS validated_datasets,
    -- Total validated datasets across all BUs

    SUM(failed_datasets) AS failed_datasets,
    -- Total failed datasets across all BUs

    SUM(passed_datasets) AS passed_datasets,
    -- Total passed datasets across all BUs

    SUM(total_datasets) AS total_datasets,
    -- Total datasets across all BUs (including non-validated)

    CONCAT(ROUND((SUM(validated_datasets) / SUM(total_datasets)) * 100, 2), '%') AS validated_datasets_percentage,
    -- % datasets validated out of total datasets

    CONCAT(ROUND((SUM(failed_datasets) / NULLIF(SUM(validated_datasets),0)) * 100, 2), '%') AS failed_datasets_percentage,
    -- % failed among validated datasets (NULLIF avoids divide by 0)

    CONCAT(ROUND((SUM(passed_datasets) / NULLIF(SUM(validated_datasets),0)) * 100, 2), '%') AS passed_datasets_percentage,
    -- % passed among validated datasets

    '100%' AS total_datasets_percentage
    -- Total dataset percentage always 100% (because it's total baseline)
  FROM summary
  -- Use summary results for final totals
`;
};

/**
 * SQL query to fetch the number of validated and non-validated datasets for each L1 business unit.
 *
 * @returns SQL query string to fetch dataset validation summary by business unit
 */
const buildBusinessUnitsQuery = (request: NextRequest): string => {
  // Build RBAC filters for the validation rows and the total dataset rows.
  // Example: dataset=customer_master prevents other datasets from contributing to BU counts.
  const executionScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  // The total-datasets CTE uses dataset tags as alias "st".
  const tagScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityTagScopeColumns("st")
  );

  // Return the business-unit summary SQL with scope-level data control.
  return `
  WITH latest_results AS (
    -- Step 1: Get latest rule execution per CONFIG_ID (same logic as highlights query)

    SELECT
      st.tag_value as L1_BUSINESS_UNIT,
      -- Business unit

      di.schema_name,
      -- Schema

      di.dataset_name,
      -- Dataset name

      di.RESULT_STATUS,
      -- Passed/Failed status

      ROW_NUMBER() OVER (PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC) AS rn
      -- Latest run rank
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      -- Join tags to map schemas to BU

      ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

      AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
      -- Join condition for schema mapping

      AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]

      AND di.L1_BUSINESS_UNIT = st.tag_value
      -- BU mapping
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${executionScopeClause}
      -- RBAC data-scope filter: only include validation rows this user may view
  ),

  dataset_status AS (
    -- Step 2: dataset-level status (has failed yes/no)

    SELECT
      L1_BUSINESS_UNIT,
      SCHEMA_NAME,
      DATASET_NAME,
      MAX(CASE WHEN RESULT_STATUS = 'FAILED' THEN 1 ELSE 0 END) AS has_failed
    FROM latest_results

    WHERE rn = 1
    -- Only latest rule execution rows

    GROUP BY L1_BUSINESS_UNIT, DATASET_NAME, SCHEMA_NAME
    -- Group by dataset
  ),

  filtered_tables AS (
    -- Step 3: total datasets available per BU

    SELECT
      t.table_catalog,
      t.table_schema,
      t.table_name,
      st.tag_value AS L1_BUSINESS_UNIT,
      ROW_NUMBER() OVER (
        PARTITION BY table_name, SPLIT(table_schema, '_')[0]
        ORDER BY CASE WHEN RIGHT(table_schema, 2) = '_v' THEN 1 ELSE 0 END, table_schema
      ) AS rn
    FROM system.information_schema.tables t
    INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
      ON t.table_catalog = SPLIT(st.table_full_name, '\\\\.')[0]

      AND t.table_schema = SPLIT(st.table_full_name, '\\\\.')[1]
      
      AND t.table_name = SPLIT(st.table_full_name, '\\\\.')[2]
    WHERE 1 = 1
      -- Base WHERE lets RBAC append AND filters safely
      ${tagScopeClause}
      -- RBAC data-scope filter: only include dataset tags inside the user's allowed scope
  ),

  total_datasets AS (
    -- Step 4: calculate totals per Business Unit

    SELECT
      L1_BUSINESS_UNIT,
      COUNT(DISTINCT concat(table_catalog, '.', table_schema, '.', table_name)) AS total_datasets
    FROM filtered_tables

    WHERE rn = 1
    -- Best schema version only

    GROUP BY L1_BUSINESS_UNIT
  )

  SELECT
    ds.L1_BUSINESS_UNIT,
    -- BU name

    td.total_datasets AS Total_Datasets,
    -- Total datasets in BU

    COUNT(ds.dataset_name) AS Validated_Datasets,
    -- Datasets validated (appear in results)

    td.total_datasets - COUNT(ds.dataset_name) AS Non_Validated_Datasets
    -- Datasets not validated yet = total - validated
  FROM dataset_status ds

  LEFT JOIN total_datasets td
    ON ds.L1_BUSINESS_UNIT = td.L1_BUSINESS_UNIT
    -- Join dataset status with total counts

  GROUP BY ds.L1_BUSINESS_UNIT, td.total_datasets
  -- One row per BU

  ORDER BY Validated_Datasets DESC
  -- Sort by most validated datasets
`;
};

/* ------------------------------- Route API ------------------------------ */

/**
 * Handles the GET request to retrieve dataset validation highlights and L1 business unit statistics.
 * It executes two SQL queries to fetch the overall dataset statistics and the list of L1 business units.
 * The results are returned as a JSON response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns - A JSON response containing the dataset validation statistics and list of L1 business units
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  const requestStartTime = new Date(); // Record the start time of the request for logging purposes
  // Used for measuring performance and request time

  const programName = "DQDSummaryViewAPI"; // Program name for logging purposes
  // Helps identify which API generated the logs

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Get the user ID from the request header or use a default value
  // Captures user identity for auditing and tracking

  console.info(
    `Received request from user: ${user}, program: ${programName}, start time: ${requestStartTime.toISOString()}`
  );
  // Print useful info in logs for debugging

  try {
    // Try block = normal successful execution

    // Retrieve a Databricks session for executing queries
    const session = await getDatabricksSession();
    // Connect to Databricks so we can run SQL queries

    // Execute both queries concurrently using Promise.all for efficiency
    const [datasetHighlights, businessUnits] = await Promise.all([
      executeQuery(session, buildDatasetHighlightsQuery(request)),
      // Query 1: overall highlights (validated/passed/failed totals)

      executeQuery(session, buildBusinessUnitsQuery(request)),
      // Query 2: business unit breakdown (validated vs non-validated)
    ]);
    // Promise.all runs both queries in parallel for better speed

    // Log the successful execution of the queries
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful execution
      detailMessage:
        "Successfully fetched dataset validation statistics and L1 business units",
      // Message shown in EventHub / Splunk
      programName,
      // Which API logged this event
      startDatetime: requestStartTime,
      // Used to track request duration
      status: "SUCCESS",
      // Mark operation as successful
      actionType: "Spark_SQL_Query",
      // Category of work done = Spark SQL query
      actionDescription: `Fetch Dataset Stats & Business Units from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what tables were used
      user,
      // User who triggered query
    });

    // Return the results in a structured JSON response
    return NextResponse.json({
      highlights:
        datasetHighlights && datasetHighlights.length > 0
          ? datasetHighlights[0]
          : {}, // Extract the first result (dataset highlights)
      // Highlights expected to return single summary row; fallback {} avoids UI crash
      businessUnits, // Return the list of L1 business units
      // Used by UI to list business units and their counts
    });
  } catch (error: any) {
    // Catch block runs if any query fails

    // Log error if there was an issue with fetching data
    const errorMessage = `Error occurred while fetching data: ${
      error.message || "Unknown error"
    }`;
    // Extract readable message; fallback default

    // Log any errors that occur during query execution
    console.error(errorMessage);
    // Helpful for debugging in backend logs

    await logToEventHub({
      type: "ERROR",
      // ERROR indicates failure
      detailMessage: errorMessage,
      // Log actual error message if available
      programName,
      // API name
      startDatetime: requestStartTime,
      // Request start time
      status: "FAILED",
      // Mark request failed
      actionType: "Spark_SQL_Query",
      // Failure occurred in SQL query execution
      actionDescription: `Failed to fetch Dataset Stats & Business Units from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what action failed
      user,
      // Store user id for auditing
    });

    // Return an error response with a 500 status code
    return NextResponse.json(
      { error: errorMessage },
      // Send error message to frontend
      { status: 500 }
      // HTTP 500 means server/backend failure
    );
  }
});
