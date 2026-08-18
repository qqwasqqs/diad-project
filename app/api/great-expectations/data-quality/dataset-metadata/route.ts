/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2025 
  Purpose of the script: 
    This API route handler is responsible for fetching metadata about a specific dataset in Databricks,
    - including the total number of data quality and data drift rules configured for that dataset, the count of row-level rules, 
    details about each column (name, data type, comment, and associated rule count), and the dataset type.
    - It serves as a backend endpoint that the frontend can call to display dataset metadata and rule counts
    in the UI, helping users understand the data quality coverage for their datasets.
    - The API accepts query parameters for business unit, catalog name, schema name, and dataset name to identify
    the target dataset in Databricks and returns structured metadata information about that dataset's data quality rules and characteristics.
    - The API also includes robust error handling and logs both successful operations and errors to Azure Event Hub for monitoring, alerting, and audit purposes.
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
 *
 * Builds a a SQL query string that counts the total number of data quality and data drift rules configured for a given dataset,
 * counts how many of those rules are row-level, and aggregates details about each column in the dataset (name, data type, comment, and associated rule count).
 * The query is dynamically built based on the provided parameters for business unit, catalog name, schema name, and dataset name, allowing it to be flexible for different datasets in Databricks.
 * The resulting SQL query is designed to be executed against the Databricks environment, leveraging system tables and the specific configuration tables for data quality and drift rules to gather comprehensive metadata about the dataset's data quality coverage.
 *
 * @param businessUnit - The business unit to filter the rules by (required). This is a key identifier for scoping the query to the relevant dataset configurations.
 * @param catalogName - The catalog name in Databricks to filter the rules by (optional). This allows the query to target a specific logical database container.
 * @param schemaName - The schema name in Databricks to filter the rules by (optional). This allows the query to target a specific organizational folder within the catalog.
 * @param datasetName - The name of the dataset (table) in Databricks for which to retrieve metadata and rule counts (required).
 * @returns A string containing the SQL query that can be executed against Databricks to fetch the desired metadata about the dataset's data quality rules and characteristics.
 */
const buildDataQualityDatasetMetadataQuery = (
  businessUnit: string, // Required parameter to specify which business unit's dataset configurations to query
  catalogName: string | null, // Optional parameter to specify which Databricks catalog to target (if not provided, query will not filter by catalog)
  schemaName: string | null, // Optional parameter to specify which Databricks schema to target (if not provided, query will not filter by schema)
  datasetName: string, // Required parameter to specify which dataset/table's metadata and rule counts to retrieve
  request: NextRequest, // Current request carrying RBAC scope headers from authorization
): string => {
  // This helper function creates and returns a SQL query as plain text based on email and date filters

  // Build the RBAC filter for quality configuration rows used in rule counts.
  // Example: business_unit=Finance only counts rules for Finance datasets.
  const rbacQualityScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns()
  );

  // Build the RBAC filter for drift configuration rows used in rule counts.
  // Example: rule_category=data_drift only allows drift-rule rows from this branch.
  const rbacDriftScopeClause = buildRbacDataScopeAndClause(
    request,
    dataDriftScopeColumns()
  );

  return `
    SELECT
      -- Count total rules: data quality + data drift rules for this dataset
      -- Example: If dataset has 5 DQ rules and 3 drift rules, this returns 8
      (
        SELECT count(*)
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}
        WHERE L1_BUSINESS_UNIT = '${businessUnit}'
          -- Filter by business unit (e.g., 'Finance', 'Operations')
          ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
          -- Optional: Filter by catalog name (e.g., 'production_catalog') if provided
          ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
          -- Optional: Filter by schema name (e.g., 'sales_schema') if provided
          AND DATASET_NAME = '${datasetName}'
          -- Filter by specific dataset/table name (e.g., 'customer_transactions')
          ${rbacQualityScopeClause}
          -- RBAC data-scope filter: only count quality rules inside the user's assigned scope
      )
      +
      -- Add drift rules count to quality rules count
      (
        SELECT count(*)
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE}
        WHERE L1_BUSINESS_UNIT = '${businessUnit}'
          -- Same business unit filter
          ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
          -- Same optional catalog filter
          ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
          -- Same optional schema filter
          AND DATASET_NAME = '${datasetName}'
          -- Same dataset filter
          ${rbacDriftScopeClause}
          -- RBAC data-scope filter: only count drift rules inside the user's assigned scope
      ) AS total_rule_count,
      -- Result column name: total_rule_count (e.g., 8)

      -- Count row-level rules only (subset of total rules)
      -- Example: If 3 out of 8 rules are row-level, this returns 3
      (
        (
          SELECT count(*)
          FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}
          WHERE L1_BUSINESS_UNIT = '${businessUnit}'
            -- Filter by business unit
            ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
            -- Optional catalog filter
            ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
            -- Optional schema filter
            AND DATASET_NAME = '${datasetName}'
            -- Filter by dataset
            ${rbacQualityScopeClause}
            -- RBAC data-scope filter: only include row-level quality rules this user may view
            AND RULE_NAME IN (
              -- List of row/dataset level rule types from quality config
              'volume_check',
              -- Example: Checks if row count is within expected range
              'schema_extraction',
              -- Example: Extracts schema structure from dataset
              'schema_validation',
              -- Example: Validates schema matches expected structure
              'dataset_completeness_check',
              -- Example: Checks % of non-null values across dataset
              'row_level_completeness_check',
              -- Example: Checks completeness at individual row level
              'dataset_uniqueness_check',
              -- Example: Checks for duplicate rows in entire dataset
              'row_level_uniqueness_check',
              -- Example: Checks for duplicates at row level
              'cross_table_consistency_check',
              -- Example: Validates data consistency across related tables
              'timeliness_check'
              -- Example: Ensures that the dataset is current by verifying its timestamp or last modified date.
            )
        )
        +
        -- Add drift rules count to quality rules count for row-level rules
        (
          SELECT count(*)
          FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE}
          WHERE L1_BUSINESS_UNIT = '${businessUnit}'
            -- Filter by business unit
            ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
            -- Optional catalog filter
            ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
            -- Optional schema filter
            AND DATASET_NAME = '${datasetName}'
            -- Filter by dataset
            ${rbacDriftScopeClause}
            -- RBAC data-scope filter: only include row-level drift rules this user may view
            AND RULE_NAME IN (
              -- List of row/dataset level rule types from drift config
              'variance_check',
              -- Example: Checks if data variance exceeds threshold
              'outlier_check',
              -- Example: Detects anomalous/outlier values in rows
              'drift_check_psi_categorical',
              -- Example: Population Stability Index for categorical columns
              'drift_check_psi_numeric',
              -- Example: Population Stability Index for numeric columns
              'stddev_check',
              -- Example: Checks if standard deviation changed significantly
              'drift_check_kl_numeric',
              -- Example: Kullback-Leibler divergence for numeric drift
              'normality_check',
              -- Example: Tests if data distribution remains normal
              'drift_check_kl_categorical',
              -- Example: Kullback-Leibler divergence for categorical drift
              'median_check',
              -- Example: Checks if median value drifted
              'quartile1_check',
              -- Example: Checks if 25th percentile drifted
              'quartile3_check',
              -- Example: Checks if 75th percentile drifted
              'mode_check'
              -- Example: Checks if most frequent value drifted
            )
        )
      ) AS row_rule_count,
      -- Result column name: row_rule_count (e.g., 3)

      -- Aggregate column details into array of structured objects
      -- Example result: [{column_name: 'id', data_type: 'BIGINT', comment: 'Primary Key', rule_count: 2}, ...]
      array_agg(
        -- Aggregate multiple rows into a single array
        named_struct(
          -- Create structured objects with named fields
          'column_name', sic.column_name,
          -- Example field value: 'customer_id'
          'data_type', sic.data_type,
          -- Example field value: 'STRING'
          'comment', sic.comment,
          -- Example field value: 'Customer identifier'
          'rule_count',
          -- Count rules targeting this specific column
          (
            (
              SELECT count(*)
              FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}
              WHERE L1_BUSINESS_UNIT = '${businessUnit}'
                -- Filter by business unit
                AND CATALOG_NAME = '${catalogName}'
                -- Filter by catalog (required here, not optional)
                AND SCHEMA_NAME = '${schemaName}'
                -- Filter by schema (required here, not optional)
                AND DATASET_NAME = '${datasetName}'
                -- Filter by dataset
                ${rbacQualityScopeClause}
                -- RBAC data-scope filter: only count column-level quality rules this user may view
                AND TARGET_COLUMN = sic.column_name
                -- Match rules for this specific column (e.g., 'customer_id')
            )
            +
            -- Add drift rules count for this column
            (
              SELECT count(*)
              FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE}
              WHERE L1_BUSINESS_UNIT = '${businessUnit}'
                -- Filter by business unit
                AND CATALOG_NAME = '${catalogName}'
                -- Filter by catalog (required here)
                AND SCHEMA_NAME = '${schemaName}'
                -- Filter by schema (required here)
                AND DATASET_NAME = '${datasetName}'
                -- Filter by dataset
                ${rbacDriftScopeClause}
                -- RBAC data-scope filter: only count column-level drift rules this user may view
                AND TARGET_COLUMN = sic.column_name
                -- Match drift rules for this specific column
            )
          )
          -- Example rule_count value: 2 (if column has 1 DQ + 1 drift rule)
        )
      ) AS columns_details,
      -- Result column name: columns_details (array of column objects)

      -- Get dataset type/classification (e.g., 'TRANSACTIONAL', 'ANALYTICAL')
      -- Example: Returns 'TRANSACTIONAL' for transaction tables, 'ANALYTICAL' for reports
      (
        SELECT DATASET_TYPE
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}
        WHERE L1_BUSINESS_UNIT = '${businessUnit}'
          -- Filter by business unit
          ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
          -- Optional: Filter by catalog if provided
          ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
          -- Optional: Filter by schema if provided
          AND DATASET_NAME = '${datasetName}'
          -- Filter by dataset
          ${rbacQualityScopeClause}
          -- RBAC data-scope filter: only return dataset type from an allowed quality config row
        LIMIT 1
        -- Return only first match since all rows should have same dataset type
      ) AS dataset_type
      -- Result column name: dataset_type (e.g., 'TRANSACTIONAL')

    -- Source: Pull column metadata from Databricks information schema
    FROM system.information_schema.columns sic
    WHERE table_catalog = '${catalogName}'
      -- Filter to match the catalog (e.g., 'production_catalog')
      AND table_schema = '${schemaName}'
      -- Filter to match the schema (e.g., 'sales_schema')
      AND table_name = '${datasetName}'
      -- Filter to match the dataset/table name (e.g., 'customer_transactions')
      AND (
        EXISTS (
          SELECT 1
          FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}
          WHERE L1_BUSINESS_UNIT = '${businessUnit}'
            ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
            ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
            AND DATASET_NAME = '${datasetName}'
            ${rbacQualityScopeClause}
        )
        OR EXISTS (
          SELECT 1
          FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE}
          WHERE L1_BUSINESS_UNIT = '${businessUnit}'
            ${catalogName ? `AND CATALOG_NAME = '${catalogName}'` : ""}
            ${schemaName ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
            AND DATASET_NAME = '${datasetName}'
            ${rbacDriftScopeClause}
        )
      );
      -- RBAC data-scope gate: do not expose physical column metadata unless an allowed config row exists
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * API route handler for fetching dataset metadata and data quality rule counts for a specified dataset in Databricks.
 * This function is triggered when the frontend makes an HTTP GET request to this API endpoint, with query parameters specifying the business unit, catalog name, schema name, and dataset name.
 * The handler validates the input parameters, constructs a SQL query to retrieve the relevant metadata from Databricks, executes the query, and returns the results as a JSON response.
 * The handler also includes comprehensive error handling and logs both successful operations and errors to Azure Event Hub for monitoring, alerting, and audit purposes, ensuring that any issues can be quickly identified and addressed by the development/support teams.
 * The expected output of this API is a JSON object containing:
 * - total_rule_count: The total number of data quality and data drift rules configured for the specified dataset.
 * - row_rule_count: The count of rules that are specifically row-level checks.
 * - columns_details: An array of objects, each containing metadata about a column in the dataset (column name, data type, comment) and the count of rules associated with that column.
 * - dataset_type: The classification/type of the dataset (e.g., 'TRANSACTIONAL', 'ANALYTICAL') as defined in the data quality configuration.
 * The frontend can use this metadata to display insights about the dataset's data quality coverage and characteristics in the UI, helping users understand how well their datasets are monitored and where there may be gaps in rule coverage.
 *
 * @param request - The incoming HTTP request (NextRequest object) containing query parameters for business unit, catalog name, schema name, and dataset name.
 * @returns {Promise<NextResponse>} - A promise that resolves to a NextResponse object containing the JSON response with dataset metadata and rule counts,
 * or an error message with appropriate HTTP status code if validation fails or an error occurs during processing.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs automatically whenever the frontend calls this API endpoint using HTTP GET

  // Record the start time of the request for logging.
  const requestStartTime = new Date();
  // Save current time so we can calculate how long the request took (like starting a stopwatch)

  const programName = "GreatExpectationsDataQualityDatasetMetadataAPI"; // Program name for logging context.
  // A label/name used in logs to identify which API is generating this log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID from request headers for auditing.
  // Read user ID from request header; if missing, treat it as Anonymous (useful for audit tracking)

  const { searchParams } = new URL(request.url);
  // Break down the request URL to read query parameters (example: ?businessUnit=...&catalogName=...&schemaName=...&datasetName=...)

  // Extracting query parameters from the URL
  const businessUnit = searchParams.get("businessUnit");
  // Get businessUnit from request URL (like selecting which database container to look in)

  const catalogName = searchParams.get("catalogName");
  // Get catalogName from request URL (like selecting which database container to look in)

  const schemaName = searchParams.get("schemaName");
  // Get schemaName from request URL (like choosing a folder inside the database)

  const datasetName = searchParams.get("datasetName");
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
      `Starting to fetch dataset metadata for: ${businessUnit} in Catalog: ${catalogName ?? "Unknown Catalog"}, Schema: ${schemaName ?? "Unknown Schema"}, Dataset: ${datasetName}`,
    );

    // Fetch a valid Databricks session.
    const session = await getDatabricksSession();
    // Open (or reuse) a secure connection/session to Databricks database

    // Build the SQL query to retrieve the dataset metadata and rule counts.
    const query = buildDataQualityDatasetMetadataQuery(
      businessUnit, // Required parameter to specify which business unit's dataset configurations to query
      catalogName, // Optional parameter to specify which Databricks catalog to target (if not provided, query will not filter by catalog)
      schemaName, // Optional parameter to specify which Databricks schema to target (if not provided, query will not filter by schema)
      datasetName, // Required parameter to specify which dataset/table's metadata and rule counts to retrieve
      request, // Current request carries the RBAC data scopes that become SQL filters
    );
    // Build query string using business unit + catalog + schema + dataset filters (like preparing an instruction for Databricks)

    // Execute the query and fetch the dataset metadata and rule counts.
    const datasetMetadata = await executeQuery(session, query);
    // Run SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success of the operation to Event Hub.
    await logToEventHub({
      // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
      type: "INFO",
      // Mark this event as informational (successful normal event)
      detailMessage: `Successfully retrieved data quality dataset metadata for Dataset '${datasetName}' in businessUnit: '${businessUnit}', Catalog: '${catalogName ?? "Unknown Catalog"}', Schema: '${schemaName ?? "Unknown Schema"}'.`,
      // Human readable success message
      programName,
      // Include API name in log for clear tracking
      startDatetime: requestStartTime,
      // Include start time so duration can be measured
      status: "SUCCESS",
      // Mark status as success for dashboard/monitoring
      actionType: "Spark_SQL_Query",
      // Categorize action type as SQL query execution
      actionDescription: `Fetch Dataset Metadata from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE}, and system.information_schema.columns for dataset '${datasetName}'`,
      // Describe the action performed and table used
      user,
      // Record who triggered the API call (audit requirement)
    });
    // End Event Hub success log

    // Return the dataset metadata and rule counts as a JSON response.
    return NextResponse.json(
      datasetMetadata && datasetMetadata.length > 0 ? datasetMetadata[0] : {},
    );
    // Send retrieved rows back to frontend as JSON so UI can display dataset metadata and rule counts
  } catch (error: unknown) {
    // Catch block: runs if Databricks query fails, session fails, or any unexpected error occurs

    // Log the error to Event Hub.
    const errorMessage = `Error retrieving dataset metadata for Dataset '${datasetName}' in businessUnit: '${businessUnit}', Catalog: '${catalogName ?? "Unknown Catalog"}', Schema: '${schemaName ?? "Unknown Schema"}': ${
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
      actionDescription: `Failed to fetch Dataset Metadata from tables: ${DATA_QUALITY_CONFIG_TABLE}, ${DATA_DRIFT_CONFIG_TABLE}, and system.information_schema.columns for dataset '${datasetName}'`,
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
