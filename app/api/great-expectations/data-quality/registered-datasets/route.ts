/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    This script provides an API route to retrieve distinct registered datasets and their rule counts from data quality and data drift tables.
    - The API allows querying for unique combinations of dataset-related information from two configuration tables: `data_quality_config_table` and `data_drift_config_table`.
    - The API calculates the total rule count for each dataset by aggregating rules from both tables and returns the result as a JSON response.
    - Logs are sent to Event Hub for both success and failure cases to ensure traceability and proper monitoring.
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

/* ----------------------------- SQL QUERY BUILDER --------------------------------- */

/**
 * Generates the SQL query to fetch distinct datasets with their respective rule counts from data quality and data drift tables.
 *
 * This function constructs an SQL query to retrieve distinct dataset combinations from two tables: data quality and data drift configuration.
 * It calculates the number of rules associated with each dataset by joining both tables.
 *
 * @returns {string} The generated SQL query to fetch distinct dataset combinations with rule counts.
 */
const generateRegisteredDatasetsQuery = (request: NextRequest): string => {
  // This helper function creates the SQL query text (like preparing a "report request" for the database)

  // Build the RBAC filter for data quality config rows.
  // Example: business_unit=Finance only returns Finance datasets and rule counts.
  const rbacQualityScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("dq")
  );

  // Build the RBAC filter for data drift config rows.
  // Example: rule_category=data_drift only applies to drift configuration rows.
  const rbacDriftScopeClause = buildRbacDataScopeAndClause(
    request,
    dataDriftScopeColumns("dd")
  );

  return ` 
    -- ===========================================================================================
    -- CTE 1: DistinctCombinations - Combines unique dataset combinations from both tables
    -- ===========================================================================================
    WITH DistinctCombinations AS (
      -- Step 1: Get distinct combinations of datasets from both the data quality and data drift configuration tables
      -- This step combines unique dataset combinations from both tables using a UNION.
      -- Example: If dq table has (Finance, catalog1, schema1, revenue, raw) and dd table has the same, UNION returns it once
    
      SELECT
        dq.L1_BUSINESS_UNIT,  -- Business unit for the dataset. Example: 'Finance', 'Operations', 'Sales'
        dq.CATALOG_NAME,      -- Catalog name where the dataset is stored. Example: 'main_catalog', 'staging_catalog'
        dq.SCHEMA_NAME,       -- Schema name within the catalog. Example: 'data_quality_schema', 'raw_data_schema'
        dq.DATASET_NAME,      -- Name of the dataset. Example: 'customer_master', 'transaction_log', 'inventory_data'
        dq.DATASET_TYPE       -- Type of the dataset. Example: 'raw', 'transformed', 'aggregated'
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE} dq  -- Query data quality config table, alias as 'dq'. Example: 'main_catalog.config_schema.data_quality_config_mng'
      WHERE 1 = 1
        ${rbacQualityScopeClause}
        -- RBAC data-scope filter: only include data quality dataset registrations this user may view
    
      UNION  -- UNION removes duplicate combinations between the two tables. Example: if same dataset exists in both tables, it appears only once
    
      SELECT
        dd.L1_BUSINESS_UNIT,  -- Same fields as above, but from data drift table. Example: 'Finance', 'Operations'
        dd.CATALOG_NAME,      -- Example: 'main_catalog'
        dd.SCHEMA_NAME,       -- Example: 'data_quality_schema'
        dd.DATASET_NAME,      -- Example: 'customer_master'
        dd.DATASET_TYPE       -- Example: 'raw'
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE} dd  -- Query data drift config table, alias as 'dd'. Example: 'main_catalog.config_schema.data_drift_config_mng'
      WHERE 1 = 1
        ${rbacDriftScopeClause}
        -- RBAC data-scope filter: only include data drift dataset registrations this user may view
    ),
    
    -- ===========================================================================================
    -- CTE 2: RuleCounts - Calculates rule counts for each dataset from data quality table
    -- ===========================================================================================
    RuleCounts AS (
      -- Step 2: Calculate rule counts for each dataset from the data_quality_config_mng table
      -- This step calculates the number of rules associated with each dataset from the data quality configuration table.
      -- Example: If 'customer_master' dataset has 5 quality rules, rule_count_quality = 5
    
      SELECT
        dq.L1_BUSINESS_UNIT,  -- Business unit. Example: 'Finance'
        dq.CATALOG_NAME,      -- Catalog name. Example: 'main_catalog'
        dq.SCHEMA_NAME,       -- Schema name. Example: 'data_quality_schema'
        dq.DATASET_NAME,      -- Dataset name. Example: 'customer_master'
        dq.DATASET_TYPE,      -- Dataset type. Example: 'raw'
        COUNT(*) AS rule_count_quality  -- Count the number of rules for this dataset. Example: 5 rules found for 'customer_master'
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE} dq  -- Data quality config table. Example: 'main_catalog.config_schema.data_quality_config_mng'
      WHERE 1 = 1
        ${rbacQualityScopeClause}
        -- RBAC data-scope filter: only count quality rules inside the user's allowed scope
      GROUP BY
        dq.L1_BUSINESS_UNIT,  -- Group by business unit. Example: All 'Finance' records grouped together
        dq.CATALOG_NAME,      -- Group by catalog. Example: All 'main_catalog' records grouped together
        dq.SCHEMA_NAME,       -- Group by schema. Example: All 'data_quality_schema' records grouped together
        dq.DATASET_NAME,      -- Group by dataset name. Example: All 'customer_master' records grouped together
        dq.DATASET_TYPE       -- Group by dataset type. Example: All 'raw' type records grouped together
    ),
    
    -- ===========================================================================================
    -- CTE 3: RuleCountsDrift - Calculates rule counts for each dataset from data drift table
    -- ===========================================================================================
    RuleCountsDrift AS (
      -- Step 3: Calculate rule counts for each dataset from the data_drift_config_mng table
      -- This step calculates the number of rules associated with each dataset from the data drift configuration table.
      -- Example: If 'customer_master' dataset has 3 drift rules, rule_count_drift = 3
    
      SELECT
        dd.L1_BUSINESS_UNIT,  -- Business unit. Example: 'Finance'
        dd.CATALOG_NAME,      -- Catalog name. Example: 'main_catalog'
        dd.SCHEMA_NAME,       -- Schema name. Example: 'data_quality_schema'
        dd.DATASET_NAME,      -- Dataset name. Example: 'customer_master'
        dd.DATASET_TYPE,      -- Dataset type. Example: 'raw'
        COUNT(*) AS rule_count_drift  -- Count the number of drift rules for this dataset. Example: 3 drift rules found for 'customer_master'
      FROM
        ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE} dd  -- Data drift config table. Example: 'main_catalog.config_schema.data_drift_config_mng'
      WHERE 1 = 1
        ${rbacDriftScopeClause}
        -- RBAC data-scope filter: only count drift rules inside the user's allowed scope
      GROUP BY
        dd.L1_BUSINESS_UNIT,  -- Group by business unit. Example: All 'Finance' records grouped together
        dd.CATALOG_NAME,      -- Group by catalog. Example: All 'main_catalog' records grouped together
        dd.SCHEMA_NAME,       -- Group by schema. Example: All 'data_quality_schema' records grouped together
        dd.DATASET_NAME,      -- Group by dataset name. Example: All 'customer_master' records grouped together
        dd.DATASET_TYPE       -- Group by dataset type. Example: All 'raw' type records grouped together
    )
    
    -- ===========================================================================================
    -- FINAL SELECT: Combine distinct combinations with rule counts from both tables
    -- ===========================================================================================
    SELECT
      dc.L1_BUSINESS_UNIT,  -- Business unit from distinct combinations. Example: 'Finance'
      dc.CATALOG_NAME,      -- Catalog name from distinct combinations. Example: 'main_catalog'
      dc.SCHEMA_NAME,       -- Schema name from distinct combinations. Example: 'data_quality_schema'
      dc.DATASET_NAME,      -- Dataset name from distinct combinations. Example: 'customer_master'
      dc.DATASET_TYPE,      -- Dataset type from distinct combinations. Example: 'raw'
      COALESCE(rc.rule_count_quality, 0) + COALESCE(rdr.rule_count_drift, 0) AS rule_count
      -- Calculate total rule count by adding quality rules (5) and drift rules (3) = 8 total
      -- COALESCE returns 0 if no rules exist in either table, preventing NULL values
    FROM
      DistinctCombinations dc  -- Start with all distinct dataset combinations. Example: (Finance, main_catalog, data_quality_schema, customer_master, raw)
    LEFT JOIN RuleCounts rc
      -- Left join to include datasets even if they have no quality rules. Example: dataset with 5 quality rules joins successfully
      ON dc.L1_BUSINESS_UNIT = rc.L1_BUSINESS_UNIT  -- Join condition: match business unit. Example: 'Finance' matches 'Finance'
      AND dc.CATALOG_NAME = rc.CATALOG_NAME  -- Join condition: match catalog. Example: 'main_catalog' matches 'main_catalog'
      AND dc.SCHEMA_NAME = rc.SCHEMA_NAME  -- Join condition: match schema. Example: 'data_quality_schema' matches 'data_quality_schema'
      AND dc.DATASET_NAME = rc.DATASET_NAME  -- Join condition: match dataset. Example: 'customer_master' matches 'customer_master'
      AND dc.DATASET_TYPE = rc.DATASET_TYPE  -- Join condition: match dataset type. Example: 'raw' matches 'raw'
    LEFT JOIN RuleCountsDrift rdr
      -- Left join to include datasets even if they have no drift rules. Example: dataset with 3 drift rules joins successfully
      ON dc.L1_BUSINESS_UNIT = rdr.L1_BUSINESS_UNIT  -- Join condition: match business unit. Example: 'Finance' matches 'Finance'
      AND dc.CATALOG_NAME = rdr.CATALOG_NAME  -- Join condition: match catalog. Example: 'main_catalog' matches 'main_catalog'
      AND dc.SCHEMA_NAME = rdr.SCHEMA_NAME  -- Join condition: match schema. Example: 'data_quality_schema' matches 'data_quality_schema'
      AND dc.DATASET_NAME = rdr.DATASET_NAME  -- Join condition: match dataset. Example: 'customer_master' matches 'customer_master'
      AND dc.DATASET_TYPE = rdr.DATASET_TYPE  -- Join condition: match dataset type. Example: 'raw' matches 'raw'
    ORDER BY
      dc.L1_BUSINESS_UNIT,  -- Sort by business unit first. Example: 'Finance' comes before 'Operations'
      dc.CATALOG_NAME,      -- Then sort by catalog name. Example: 'main_catalog' before 'staging_catalog'
      dc.SCHEMA_NAME,       -- Then sort by schema name. Example: 'data_quality_schema' before 'raw_data_schema'
      dc.DATASET_NAME,      -- Then sort by dataset name. Example: 'customer_master' before 'transaction_log'
      dc.DATASET_TYPE;      -- Finally sort by dataset type. Example: 'raw' before 'transformed'
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch distinct registered datasets for rule configuration from the system.
 *
 * This API endpoint queries the data quality and data drift tables to retrieve distinct dataset combinations and 
 * calculates the associated rule counts for each dataset. The results are returned as a JSON response to the frontend.
 * 
 * It also logs the request details for auditing and monitoring purposes.
 * 
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns {Promise<NextResponse>} The JSON response containing the list of dataset combinations and calculates 
 * the associated rule counts for each datase or error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function executes when the frontend/browser calls this API using HTTP GET

  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date();
  // Save the exact start time (like starting a stopwatch to measure performance)

  const programName = "GreatExpectationsDataQualityRegisteredDatasetsAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(`Fetching distinct registered datasets initiated by user ${user}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Fetch the Databricks session to execute the SQL query.
    const session = await getDatabricksSession();
    // Create or reuse a secure session connection to Databricks (like opening a secure database session)

    // Generate the SQL query to retrieve distinct registered datasets.
    const query = generateRegisteredDatasetsQuery(request);
    // Build the SQL query text (database instructions)

    // Execute the query and fetch the result.
    const registeredDatasets = await executeQuery(session, query);
    // Run the SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully retrieved distinct registered datasets for the rule configuration.`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_SQL_Query",
      // Categorize the action: SQL query execution
      actionDescription: `Fetch Distinct Registered Datasets for the rule configuration from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE}`,
      // Describe the business operation performed for audit context
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the registered datasets as a JSON response.
    return NextResponse.json(registeredDatasets);
    // Send the results back to the frontend as JSON so UI can show list of registered datasets
  } catch (error: unknown) {
    // Catch block: runs if Databricks connection or query execution fails

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error retrieving registered datasets: ${
      error instanceof Error ? error.message : "Unknown error occurred while retrieving registered datasets."
    }`;
    // Extract error message; if unavailable, use fallback

    console.error(errorMessage, error instanceof Error ? error.stack : error);
    // Print error with stack trace so developers can identify where it failed

    await logToEventHub({
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR",
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage,
      // Detailed error message stored in logs
      programName,
      // Identify the API/service that failed
      startDatetime: requestStartTime,
      // Include start time so we know how long it ran before failing
      status: "FAILED",
      // Mark operation status as failed
      actionType: "Spark_SQL_Query",
      // Indicate it failed during SQL query execution
      actionDescription: `Failed to Fetch Distinct Registered Datasets for the rule configuration from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE}`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
