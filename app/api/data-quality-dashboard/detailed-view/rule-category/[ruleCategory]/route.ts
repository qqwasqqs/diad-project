/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script defines the API route to fetch rule details based on the category, result status, and dataset information.
    - It retrieves details about rules such as rule category, rule type, target columns, thresholds, and more.
    - Logs both successful and failed operations for traceability and debugging purposes.
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

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * Generates SQL query to retrieve rule details for a specific dataset, rule category, and result status.
 * This query fetches metadata, rule information, alert thresholds, and rule details for the failed rules.
 *
 * @param catalogName - The name of the catalog where the dataset is located.
 * @param schemaName - The schema in the catalog where the dataset is defined.
 * @param datasetName - The dataset name for which the rule details are being fetched.
 * @param ruleCategory - The category of rules (e.g., 'metadata', 'data_drift').
 * @param resultStatus - The result status of the rule execution (e.g., 'FAILED').
 * @returns The SQL query string to retrieve the rule details.
 */
const generateRuleDetailsQuery = (
  // Helper function that generates a SQL query based on input filters
  catalogName: string, // Catalog filter (example: "us_datalake_mng")
  schemaName: string, // Schema filter (example: "radar_mng")
  datasetName: string, // Dataset/table filter (example: "patient_summary")
  ruleCategory: string, // Rule category filter (example: "metadata")
  resultStatus: string // Result filter (example: "FAILED")
) => ` 
    -- Start of SQL query text that will be executed in Databricks (like generating a filtered report)

    SELECT 
        CATALOG_NAME, 
        -- Catalog name where data exists
        SCHEMA_NAME, 
        -- Schema name where table exists
        DATASET_NAME, 
        -- Dataset/table name
        CASE 
            -- Convert internal rule categories into user-friendly display names
            WHEN RULE_CATEGORY = 'metadata' THEN 'Metadata'
            -- Show 'Metadata' instead of 'metadata'
            WHEN RULE_CATEGORY = 'data_drift' THEN 'Data Drift'
            -- Show proper label for data drift rules
            WHEN RULE_CATEGORY = 'data_profiling' THEN 'Data Profiling'
            -- Show proper label for profiling rules
            ELSE RULE_CATEGORY
            -- If it is some other category, display it as is
        END AS RULE_CATEGORY,
        -- Final displayed rule category in the report

        RULE_TYPE, 
        -- Rule type (example: ColumnRule, DatasetRule)
        RULE_NAME,
        -- Rule name (example: "Null check on patient_id")
        TARGET_COLUMN, 
        -- Column that the rule is checking
        RESULT_VALUE,
        -- Result value (example: % nulls, deviation amount)
        RESULT_STATUS, 
        -- Whether rule run failed or passed
        BASELINE_VALUE,
        -- Baseline/reference value used for comparison
        CASE
            -- Select correct alert threshold based on severity type
            WHEN LOWER(ALERT_TYPE) = 'critical' THEN RULE_CRITICAL_THRESHOLD
            -- If alert is critical, show critical threshold
            WHEN LOWER(ALERT_TYPE) = 'warning' THEN RULE_WARNING_THRESHOLD
            -- If alert is warning, show warning threshold
            ELSE NULL
            -- If alert type unknown, keep threshold blank
        END AS ALERT_THRESHOLD,
        -- Final computed threshold shown to user
        REGEXP_REPLACE(DETAILS, '_', ' ') AS RULE_DETAILS
        -- Make details more readable by replacing underscores with spaces

    FROM (
        -- Subquery to pick the latest execution result of every rule
        SELECT DISTINCT 
            CATALOG_NAME, 
            -- Catalog name
            SCHEMA_NAME, 
            -- Schema name
            DATASET_NAME,
            -- Dataset/table name
            'Last Run Failed For' AS KEY, 
            -- Constant label used (could be for UI labeling/report key)
            RULE_TYPE, 
            -- Rule type
            RULE_NAME, 
            -- Rule name
            RULE_CATEGORY,
            -- Rule category
            CREATED_AT, 
            -- Rule execution created time
            TARGET_COLUMN, 
            -- Target column
            RULE_VALUE,
            -- The value used/configured for the rule
            RULE_WARNING_THRESHOLD, 
            -- Warning threshold
            RULE_CRITICAL_THRESHOLD, 
            -- Critical threshold
            BASELINE_VALUE, 
            -- Baseline for comparison
            RESULT_VALUE, 
            -- Result computed during execution
            RESULT_STATUS, 
            -- PASS/FAIL status
            DETAILS,
            -- Full details column (usually JSON or long text)
            DETAILS:alert_type AS ALERT_TYPE,
            -- Extract alert_type from JSON details field
            ROW_NUMBER() OVER (
                -- Rank rule execution results to identify latest run matching the requested status
                PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, RULE_NAME, TARGET_COLUMN
                -- Latest RUN_ID should come first (most recent execution matching requested status)
                ORDER BY CAST(RUN_ID AS INT) DESC
            ) AS rnk  
            -- rnk=1 means latest execution record matching the status filter

        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} 
        -- Read rule execution results from the main execution results table
        WHERE RULE_CATEGORY = '${ruleCategory}'
        -- Filter to selected rule category (example: only metadata rules)
        AND RESULT_STATUS = '${resultStatus}'
        AND CATALOG_NAME = '${catalogName}'
        -- Filter to selected catalog
        AND SCHEMA_NAME = '${schemaName}'
        -- Filter to selected schema
        AND DATASET_NAME = '${datasetName}'
        -- Filter to selected dataset/table
    ) subq
    -- Name the subquery result as "subq"

    WHERE rnk = 1 
    -- Keep only the most recent run record per rule+column combination
`;
// End of SQL query builder function

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * API route handler for fetching rule details based on the provided parameters.
 * This handler fetches the rule details, validates input, logs the process, and returns the results.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters.
 * @param params - The parameters passed in the URL, specifically the 'ruleCategory'.
 * @returns A JSON response with the fetched rule details or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest,
  // The incoming API request from the UI/dashboard

  { params }: { params: Promise<{ ruleCategory: string }> }
): Promise<NextResponse> {
  // Params include ruleCategory from URL path (example: /api/rules/metadata)
  // Define start time for logging the request duration
  const requestStartTime = new Date();
  // Save when request started (like stopwatch start)

  const programName = "DQDDetailedViewRuleDetailsAPI"; // Identifier for logging
  // Program/API name used in monitoring tools for traceability

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Get user ID from request headers or default to 'Anonymous'
  // Identify which user is requesting the data (audit requirement)

  // Extracting the rule category and search parameters from the URL
  const { ruleCategory } = await params;
  // Extract ruleCategory value from route parameters

  const { searchParams } = new URL(request.url);
  // Extract query parameters from the URL (like ?catalogName=...&schemaName=...)

  const catalogName = searchParams.get("catalogName");
  // Read catalogName from query string (filter input from UI)

  const schemaName = searchParams.get("schemaName");
  // Read schemaName from query string

  const datasetName = searchParams.get("datasetName");
  // Read datasetName from query string

  const resultStatus = searchParams.get("resultStatus");
  // Read resultStatus from query string (example: FAILED)

  // Validate if all required parameters are provided
  if (!catalogName || !schemaName || !datasetName || !resultStatus) {
    // If any required parameter is missing, we cannot run the query correctly

    const errorMessage =
      "Missing required query parameters: catalogName, schemaName, datasetName, resultStatus";
    // Clear message explaining which inputs are required

    console.error(errorMessage);
    // Print error to logs so developers/support know why the API returned 400

    // Return a 400 error with a descriptive message
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 = request is invalid (user/frontend missed required inputs)
  }

  try {
    // Initialize Databricks session to execute queries
    const session = await getDatabricksSession();
    // Open/reuse secure session to Databricks database

    // Execute the SQL query to fetch rule details
    const ruleDetails = await executeQuery(
      session,
      generateRuleDetailsQuery(
        catalogName,
        schemaName,
        datasetName,
        ruleCategory,
        resultStatus
      )
    );
    // Run query in Databricks and store output records in ruleDetails

    // Log success if query execution was successful
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful data retrieval
      detailMessage: `Successfully retrieved rule details for Rule Category '${ruleCategory}' in catalog: '${catalogName}', schema: '${schemaName}', dataset '${datasetName}'.`,
      // Human-readable success message for logs/monitoring tools
      programName,
      // Identify which API created log record
      startDatetime: requestStartTime,
      // Used to calculate how long request took
      status: "SUCCESS",
      // Mark status as success
      actionType: "Spark_SQL_Query",
      // Action performed: Databricks SQL query
      actionDescription: `Fetch Rule Details for ${ruleCategory} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what data was fetched and from which table
      user,
      // Identify user who requested this data
    });

    // Return the fetched rule details as a JSON response
    return NextResponse.json(ruleDetails);
    // Send data back to UI so user can view rule-level failed details
  } catch (error: any) {
    // Log error if there was an issue with fetching data
    const errorMessage = `Error retrieving rule details for Rule Category '${ruleCategory}' in catalog: '${catalogName}', schema: '${schemaName}', dataset '${datasetName}': ${error?.message ?? "Unknown error"
      }`;
    // Extract readable message; fallback default

    console.error(errorMessage);
    // Print error in server logs for debugging

    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Detailed failure message for investigation
      programName,
      // Identify API name
      startDatetime: requestStartTime,
      // Start time used for duration analysis
      status: "FAILED",
      // Mark request as failed
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch Rule Details for ${ruleCategory} from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Description of failed operation
      user,
      // User who triggered failure
    });

    // Return an error response with a 500 status code
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means server/system error (not frontend input mistake)
  }
});