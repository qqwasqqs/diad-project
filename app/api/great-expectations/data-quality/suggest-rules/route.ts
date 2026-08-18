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
  DATA_DRIFT_CONFIG_TABLE, // Table name for data drift rule configurations used in audit log descriptions
  DATA_QUALITY_CONFIG_TABLE, // Table name for data quality rule configurations used in audit log descriptions
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import { buildRbacDataScopeAndClause } from "@/lib/rbac/dataScope";

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
const generateRegisteredDatasetsQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string,
  request: NextRequest
): string => {
  // This helper function creates the SQL query text (like preparing a "report request" for the database)

  // Build the RBAC filter for Databricks information_schema rows.
  // Example: catalog=prod and dataset=customer_master only returns suggestions for that allowed table.
  const rbacScopeClause = buildRbacDataScopeAndClause(request, {
    catalog: "table_catalog",
    schema: "table_schema",
    dataset: "table_name",
  });

  return `   
-- Step 1: Retrieve raw column metadata from the system catalog
  -- This CTE fetches column names, data types, and comments for a specific table
  WITH describe_table AS (
    SELECT
        column_name        AS col_name,              -- Original column name from the table
        lower(data_type)   AS raw_data_type,         -- Data type converted to lowercase for easier matching
        comment                                       -- Column description/comment if available
    FROM
        system.information_schema.columns            -- System table containing metadata about all columns
    WHERE
        table_catalog = '${catalogName}'             -- Filter by catalog (e.g., 'main', 'hive_metastore')
        AND table_schema  = '${schemaName}'          -- Filter by schema/database (e.g., 'sales_db')
        AND table_name    = '${datasetName}'         -- Filter by specific table name (e.g., 'customer_orders')
        ${rbacScopeClause}
        -- RBAC data-scope filter: only inspect metadata for tables this user may access
),


-- Step 2: Normalize data types to standard categories
-- This simplifies the various data type representations into consistent types
-- Example: 'varchar', 'char', 'string' all become 'string'
normalized_schema AS (
    SELECT
        col_name,                                    -- Keep the column name
        CASE
            WHEN raw_data_type IN ('int', 'integer') THEN 'int'              -- Normalize integer types
            WHEN raw_data_type IN ('bigint', 'long') THEN 'bigint'           -- Normalize long integer types
            WHEN raw_data_type = 'float' THEN 'float'                        -- Single precision decimal
            WHEN raw_data_type = 'double' THEN 'double'                      -- Double precision decimal
            WHEN raw_data_type LIKE 'decimal%' THEN 'decimal'                -- Matches 'decimal(10,2)', 'decimal(5)', etc.
            WHEN raw_data_type IN ('string', 'varchar', 'char') THEN 'string' -- Normalize all text types to 'string'
            WHEN raw_data_type IN ('boolean', 'bool') THEN 'boolean'         -- Normalize boolean types
            WHEN raw_data_type = 'date' THEN 'date'                          -- Date without time component
            WHEN raw_data_type LIKE 'timestamp%' THEN 'timestamp'            -- Matches 'timestamp', 'timestamp_ntz', etc.
            ELSE 'unknown'                                                    -- Catch-all for unrecognized types
        END AS data_type
    FROM describe_table
),


-- Step 3: Classify columns into functional categories based on data type and naming patterns
-- This helps determine which data quality rules are applicable to each column
-- Example: A column named 'customer_id' would be marked as is_id=true and is_numeric=true
classified_columns AS (
    SELECT
        col_name,
        data_type,


        -- Identify ID columns based on naming conventions
        -- Example: 'id', 'user_id', 'customer_id', 'order_id' would all be marked as ID columns
        CASE
            WHEN lower(col_name) = 'id'              -- Exact match for column named 'id'
              OR lower(col_name) LIKE '%_id'         -- Ends with '_id' (e.g., 'customer_id')
              OR lower(col_name) LIKE '%id%'         -- Contains 'id' anywhere (e.g., 'userid', 'identification')
            THEN true ELSE false
        END AS is_id,


        -- Identify date/time columns based on data type or naming patterns
        -- Example: 'created_date', 'updated_timestamp', 'order_dt' would be marked as datetime
        CASE
            WHEN data_type IN ('date', 'timestamp')  -- Explicit date/timestamp data type
            THEN true ELSE false
        END AS is_datetime,


        -- Identify numeric columns (useful for statistical checks like min, max, mean)
        -- Example: 'price', 'quantity', 'customer_id' would be numeric
        CASE
            WHEN data_type IN ('int','bigint','float','double','decimal')  -- Any numeric data type
              OR lower(col_name) = 'id'                                     -- ID columns are also treated as numeric
            THEN true ELSE false
        END AS is_numeric,


        -- Identify string/text columns (useful for consistency and pattern checks)
        -- Example: 'customer_name', 'email', 'address' would be strings
        CASE
            WHEN data_type = 'string'
            THEN true ELSE false
        END AS is_string
    FROM normalized_schema
),


-- Step 4: Define suggested data quality rules for each column
-- Rules are selected based on the column's classification
-- This is the core logic that maps column characteristics to appropriate validation rules
column_rules AS (
    SELECT
        col_name,
        is_datetime,                                 -- Pass through datetime flag for use in final output
        array_distinct(                              -- Remove duplicate rules from the final list
            flatten(array(                           -- Flatten nested arrays into a single-level array
                -- Base rules applicable to ALL columns regardless of type
                -- These check if data exists and if values are unique
                array(
                    'completeness_check',            -- Checks if column has non-null values (e.g., 95% completeness)
                    'row_level_completeness_check',  -- Checks completeness at individual row level
                    'uniqueness_check',              -- Checks if values are unique across the dataset
                    'row_level_uniqueness_check'     -- Checks uniqueness at row level
                ),
                
                -- Rules specific to NUMERIC columns
                -- Example: For a 'price' column, these rules would check min/max prices, average price, and valid range
                CASE WHEN is_numeric THEN array(
                    'min_value_check',               -- Validates minimum value (e.g., price >= 0)
                    'max_value_check',               -- Validates maximum value (e.g., price <= 10000)
                    'mean_value_check',              -- Checks if average is within expected range
                    'range_check'                    -- Validates values fall within expected range
                ) ELSE array() END,                  -- Empty array if not numeric
                
                -- Rules specific to DATE/TIMESTAMP columns
                -- Example: For 'order_date', checks if dates are within reasonable range (not in future, not too old)
                CASE WHEN is_datetime THEN array('range_check') ELSE array() END,
                
                -- Rules specific to STRING columns
                -- Example: For 'email', checks if format follows expected pattern (contains @, proper domain)
                CASE WHEN is_string THEN array('consistency_check') ELSE array() END
            ))
        ) AS suggested_rules                         -- Final list of recommended rules for this column
    FROM classified_columns
),


-- Step 5: Build the final output structure
-- Creates two types of entries: one for dataset-level rules and one for each column
all_entries AS (
    -- Entry for dataset-level (table-level) metadata and profiling rules
    -- These apply to the entire table, not individual columns (excluding freshness/timeliness which moved to datetime columns)
    SELECT '${datasetName}' AS key_name,             -- Table name as the key
           map(
               -- Metadata category: rules about the dataset as a whole
               'metadata', map(
                   'volume', array('volume_check'),             -- Checks row count (e.g., table has expected number of rows)
                   'format', array('schema_validation', 'schema_extraction')  -- Validates table structure matches expected schema
               ),
               -- Data profiling category: dataset-level quality metrics
               'data_profiling', map(
                   'completeness', array('dataset_completeness_check')  -- Checks overall dataset completeness
               )
           ) AS value_map
    
    UNION ALL
    
    -- Entries for each column with their specific data quality rules
    -- Each column gets rules based on its classification from previous steps
    -- DATE/TIMESTAMP columns also receive freshness and timeliness checks
    SELECT col_name AS key_name,                     -- Column name as the key
           map(
               -- Metadata category: only populated for date/timestamp columns
               -- Example: For 'created_date' or 'updated_timestamp', includes freshness and timeliness checks
               'metadata', CASE WHEN is_datetime THEN map(
                   'freshness', array('freshness_check'),       -- Checks if datetime column values are up-to-date (e.g., last updated within 24 hours)
                   'timeliness', array('timeliness_check')      -- Checks if datetime column values arrive on schedule
               ) ELSE map() END,
               
               -- Data profiling category: column-level quality metrics
               'data_profiling', map(
                   -- Completeness rules: Only include if the column had completeness rules suggested
                   -- Example: For 'customer_name', includes both completeness checks
                   'completeness', array_intersect(suggested_rules, array('completeness_check', 'row_level_completeness_check')),
                   
                   -- Uniqueness rules: Only include if the column had uniqueness rules suggested
                   -- Example: For 'customer_id', includes both uniqueness checks
                   'uniqueness', array_intersect(suggested_rules, array('uniqueness_check', 'row_level_uniqueness_check')),
                   
                   -- Validity rules: Only include if the column had range_check suggested
                   -- Example: For 'order_date' or 'price', includes range_check
                   'validity', array_intersect(suggested_rules, array('range_check')),
                   
                   -- Consistency rules: Only include if the column had consistency_check suggested
                   -- Example: For 'email' or 'phone_number', includes consistency_check
                   'consistency', array_intersect(suggested_rules, array('consistency_check')),
                   
                   -- Numeric rules: Only include if the column had numeric checks suggested
                   -- Example: For 'revenue', includes min/max/mean value checks
                   'numeric', array_intersect(suggested_rules, array('min_value_check', 'max_value_check', 'mean_value_check'))
               )
           ) AS value_map
    FROM column_rules
)


-- Step 6: Return the final results
-- Output contains one row for the dataset and one row per column, each with their suggested rules
-- Date/timestamp columns will now have freshness and timeliness checks in their metadata map
SELECT key_name, value_map
FROM all_entries;

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

  const programName = "RulesManagementRegisteredDatasetsAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(`Fetching distinct registered datasets initiated by user ${user}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)
  const { searchParams } = new URL(request.url);
  // Break down the request URL to read query parameters (example: ?businessUnit=...&catalogName=...&schemaName=...&datasetName=...)

  // Extracting query parameters from the URL


  const catalogName = searchParams.get("catalogName");
  // Get catalogName from request URL (like selecting which database container to look in)

  const schemaName = searchParams.get("schemaName");
  // Get schemaName from request URL (like choosing a folder inside the database)

  const datasetName = searchParams.get("datasetName");
  // Get datasetName from request URL (like picking which table/report you want details for)

  // ------------------- PARAMETER VALIDATION -------------------
  if (!catalogName || !schemaName || !datasetName) {
    // If any required parameter is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: businessUnit, catalogName, schemaName, datasetName";
    // Clear message explaining which inputs are required

    console.error(errorMessage);
    // Print error to logs so developers/support know why the API returned 400

    // Return a 400 error with a descriptive message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 = request is invalid (user/frontend missed required inputs)
  }
  try {
    // Try block: normal successful process runs here; failures go to catch block

    // Fetch the Databricks session to execute the SQL query.
    const session = await getDatabricksSession();
    // Create or reuse a secure session connection to Databricks (like opening a secure database session)

    // Generate the SQL query to retrieve distinct registered datasets.
    const query = generateRegisteredDatasetsQuery(catalogName ,schemaName, datasetName, request);
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
