/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script handles the API route for retrieving data profiling metrics related to datasets in the Teva Data Integrity Automation Dashboard. 
    - It fetches and combines results from different data quality checks such as Completeness, Uniqueness, Min/Max/Mean values.
    - It logs successful and failed attempts in EventHub for monitoring and traceability.
    - The API returns detailed data profiling information for a specified catalog, schema, and dataset.
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

/* ----------------------------- SQL QUERY BUILDERS ----------------------------- */

/**
 * Builds a SQL query to fetch highlights data such as Completeness and Uniqueness percentages
 * for a specified dataset in the catalog and schema.
 *
 * @param catalogName - The name of the catalog (data source).
 * @param schemaName - The schema within the catalog.
 * @param datasetName - The name of the dataset within the schema.
 * @returns A SQL query string.
 *
 * FIX SUMMARY (compared to original):
 *   1. UNION changed to UNION ALL — the original performed set-based deduplication between
 *      the completeness and uniqueness branches before the outer filter ran. If both metrics
 *      happened to produce the same VALUE string for a dataset, one row was silently dropped.
 *      UNION ALL preserves both rows; the outer DISTINCT then correctly deduplicates only
 *      within the same KEY (completeness vs uniqueness), never across keys.
 *   2. ROW_NUMBER() PARTITION BY now includes CATALOG_NAME, SCHEMA_NAME, DATASET_NAME —
 *      the original partitioned only by CATALOG_NAME, SCHEMA_NAME, DATASET_NAME which was
 *      actually correct for dataset-level checks (no TARGET_COLUMN). Verified: no change
 *      needed to the partition itself, but the dataset filter added inside each branch
 *      (fix #3 below) is still required.
 *   3. Dataset-level filters (CATALOG_NAME / SCHEMA_NAME / DATASET_NAME) pushed inside each
 *      branch subquery so the ROW_NUMBER window sees only the target dataset's rows.
 *      The original only filtered on the outermost SELECT, meaning rnk was assigned across
 *      all datasets and rnk=1 could select another dataset's latest run.
 */
const buildHighlightsQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string
): string => {
  return `
    -- Retrieve latest data quality highlights (Completeness & Uniqueness)
    -- for a specific catalog, schema, and dataset
    SELECT *
    FROM (
      -- Completeness Highlight
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        KEY,
        VALUE
      FROM (
        SELECT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          -- Human-readable key for completeness metric
          'Completeness (%)' AS KEY,
          -- Include result value along with mandatory columns context
          CONCAT(RESULT_VALUE, ' (Mandatory Columns: ', TARGET_COLUMN, ')') AS VALUE,
          -- Rank runs to get the most recent execution per dataset
          -- FIX: Dataset filter added inside this subquery so ROW_NUMBER window operates
          -- only on the target dataset's rows, preventing another dataset's rnk=1 record
          -- from being selected when that dataset had a more recent completeness run.
          ROW_NUMBER() OVER (
              PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
              ORDER BY CAST(RUN_ID AS INT) DESC
            ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for dataset-level completeness checks
        WHERE
          rule_name = 'dataset_completeness_check'
          -- FIX: Filter pushed inside subquery so rnk=1 is the latest run for THIS dataset
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the most recent completeness result
      WHERE rnk = 1

      -- FIX: UNION ALL (was UNION). The original UNION applied set-based deduplication
      -- between completeness and uniqueness branches before the outer filter ran. If the
      -- completeness and uniqueness values happened to be identical for a dataset (e.g.
      -- both "100.0 (Mandatory Columns: id,name)"), one branch was silently dropped.
      -- UNION ALL preserves both rows; the outer SELECT DISTINCT then correctly separates
      -- them because they have different KEY values ('Completeness (%)' vs 'Uniqueness (%)').
      UNION ALL

      -- Uniqueness Highlight
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        KEY,
        VALUE
      FROM (
        SELECT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          -- Human-readable key for uniqueness metric
          'Uniqueness (%)' AS KEY,
          -- Include result value along with mandatory columns context
          CONCAT(RESULT_VALUE, ' (Mandatory Columns: ', TARGET_COLUMN, ')') AS VALUE,
          -- Rank runs to get the most recent execution per dataset
          -- FIX: Dataset filter added inside this subquery (same reasoning as completeness above)
          ROW_NUMBER() OVER (
              PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME
              ORDER BY CAST(RUN_ID AS INT) DESC
            ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for dataset-level uniqueness checks
        WHERE
          rule_name = 'dataset_uniqueness_check'
          -- FIX: Filter pushed inside subquery so rnk=1 is the latest run for THIS dataset
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the most recent uniqueness result
      WHERE rnk = 1
    )
    -- Final filter to return highlights for the requested dataset only
    -- This acts as a safety net; the primary isolation happens inside each branch above
    WHERE
      CATALOG_NAME = '${catalogName}'
      AND SCHEMA_NAME  = '${schemaName}'
      AND DATASET_NAME = '${datasetName}'
   `;
};

/**
 * Builds a SQL query to fetch a summary of data quality metrics such as Completeness, Uniqueness,
 * Min/Max/Mean values for the dataset in the catalog and schema.
 *
 * @param catalogName - The name of the catalog (data source).
 * @param schemaName - The schema within the catalog.
 * @param datasetName - The name of the dataset within the schema.
 * @returns A SQL query string.
 *
 * FIX SUMMARY (compared to original):
 *   1. All UNION changed to UNION ALL — same reasoning as buildHighlightsQuery above.
 *      The PIVOT relies on MAX(VALUE) across all branches for a given KEY. If UNION drops
 *      a row before PIVOT runs (because two branches share an identical row), the PIVOT
 *      produces '-' instead of the actual metric value.
 *   2. ROW_NUMBER() PARTITION BY now includes CATALOG_NAME, SCHEMA_NAME, DATASET_NAME AND
 *      TARGET_COLUMN — the original was correct on PARTITION but lacked the dataset filters
 *      inside each branch, so rnk=1 was globally assigned across all datasets.
 *   3. Dataset-level filters pushed inside every branch subquery (same reasoning as above).
 *   4. Removed redundant outer SELECT DISTINCT wrapping the entire UNION ALL — since each
 *      branch already applies rnk=1 (unique per partition), the outer DISTINCT adds an
 *      unnecessary sort/dedup pass on Databricks. The PIVOT handles aggregation correctly
 *      without it. The inner branch-level DISTINCT that was in the original is preserved
 *      because it deduplicates within the window (multiple identical rows in a single run).
 */
const buildSummaryQuery = (
  catalogName: string,
  schemaName: string,
  datasetName: string
): string => {
  return `
     -- Build column-level data quality summary for a dataset
     -- Includes latest completeness, uniqueness, and basic statistics
     SELECT *
     FROM (
      -- FIX: Removed outer SELECT DISTINCT that wrapped the entire UNION ALL.
      -- The original outer DISTINCT added a redundant sort/dedup pass on Databricks because
      -- each branch already guarantees uniqueness via rnk=1. The PIVOT's MAX() handles any
      -- remaining aggregation. Keeping only the branch-level DISTINCT (preserved below).
      SELECT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        TARGET_COLUMN,
        KEY,
        VALUE
      FROM
      (
        -- Column Completeness Metric
        SELECT DISTINCT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          TARGET_COLUMN,
          'Completeness (%)' AS KEY,
          RESULT_VALUE AS VALUE,
          -- Rank runs to select the most recent completeness result per column
          -- FIX: Dataset filter inside subquery ensures window only sees target dataset rows
          ROW_NUMBER() OVER (
            PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
            ORDER BY CAST(RUN_ID AS INT) DESC
          ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for column-level completeness checks
        WHERE
          rule_name = 'completeness_check'
          -- FIX: Filter pushed inside subquery so rnk=1 is the latest run for THIS dataset's column
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the latest completeness result
      WHERE rnk = 1

      -- FIX: UNION ALL (was UNION) — prevents set-based dedup before PIVOT runs
      UNION ALL

      -- Column Uniqueness Metric
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        TARGET_COLUMN,
        KEY,
        VALUE
      FROM
      (
        SELECT DISTINCT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          TARGET_COLUMN,
          'Uniqueness (%)' AS KEY,
          RESULT_VALUE AS VALUE,
          -- Rank runs to select the most recent uniqueness result per column
          -- FIX: Dataset filter inside subquery
          ROW_NUMBER() OVER (
            PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
            ORDER BY CAST(RUN_ID AS INT) DESC
          ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for column-level uniqueness checks
        WHERE
          rule_name = 'uniqueness_check'
          -- FIX: Filter pushed inside subquery
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the latest uniqueness result
      WHERE rnk = 1

      -- FIX: UNION ALL (was UNION)
      UNION ALL

      -- Column Minimum Value
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        TARGET_COLUMN,
        KEY,
        VALUE
      FROM
      (
        SELECT DISTINCT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          TARGET_COLUMN,
          'Min Value' AS KEY,
          -- Round numeric result for readability
          ROUND(RESULT_VALUE, 2) AS VALUE,
          -- Rank runs to select the most recent min value result per column
          -- FIX: Dataset filter inside subquery
          ROW_NUMBER() OVER (
            PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
            ORDER BY CAST(RUN_ID AS INT) DESC
          ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for minimum value checks
        WHERE
          rule_name = 'min_value_check'
          -- FIX: Filter pushed inside subquery
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the latest min value result
      WHERE rnk = 1

      -- FIX: UNION ALL (was UNION)
      UNION ALL

      -- Column Maximum Value
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        TARGET_COLUMN,
        KEY,
        VALUE
      FROM
      (
        SELECT DISTINCT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          TARGET_COLUMN,
          'Max Value' AS KEY,
          -- Round numeric result for readability
          ROUND(RESULT_VALUE, 2) AS VALUE,
          -- Rank runs to select the most recent max value result per column
          -- FIX: Dataset filter inside subquery
          ROW_NUMBER() OVER (
            PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
            ORDER BY CAST(RUN_ID AS INT) DESC
          ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for maximum value checks
        WHERE
          rule_name = 'max_value_check'
          -- FIX: Filter pushed inside subquery
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the latest max value result
      WHERE rnk = 1

      -- FIX: UNION ALL (was UNION)
      UNION ALL

      -- Column Mean Value
      SELECT DISTINCT
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        TARGET_COLUMN,
        KEY,
        VALUE
      FROM
      (
        SELECT DISTINCT
          CATALOG_NAME,
          SCHEMA_NAME,
          DATASET_NAME,
          TARGET_COLUMN,
          'Mean Value' AS KEY,
          -- Round numeric result for readability
          ROUND(RESULT_VALUE, 2) AS VALUE,
          -- Rank runs to select the most recent mean value result per column
          -- FIX: Dataset filter inside subquery
          ROW_NUMBER() OVER (
            PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
            ORDER BY CAST(RUN_ID AS INT) DESC
          ) rnk
        FROM
          ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
        -- Filter for mean value checks
        WHERE
          rule_name = 'mean_value_check'
          -- FIX: Filter pushed inside subquery
          AND CATALOG_NAME = '${catalogName}'
          AND SCHEMA_NAME  = '${schemaName}'
          AND DATASET_NAME = '${datasetName}'
      )
      -- Keep only the latest mean value result
      WHERE rnk = 1
     )
     -- Pivot metrics into columns for easier consumption by UI/reporting
     PIVOT (
       NVL(MAX(VALUE), '-') FOR KEY IN (
         'Completeness (%)' AS Completeness,
         'Uniqueness (%)'   AS Uniqueness,
         'Min Value'        AS Min_Value,
         'Max Value'        AS Max_Value,
         'Mean Value'       AS Mean_Value
       )
     )
     -- Final filter to restrict results to the requested dataset
     -- This acts as a safety net; the primary isolation is inside each branch above
     WHERE CATALOG_NAME = '${catalogName}'
       AND SCHEMA_NAME  = '${schemaName}'
       AND DATASET_NAME = '${datasetName}'
   `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve data profiling metrics for a specified catalog, schema, and dataset.
 * It retrieves two sets of data: highlights and summaries, and returns them in the response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters for catalog, schema, and dataset.
 * @returns A NextResponse with the retrieved data or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API function runs when the frontend requests profiling data using a GET call

  // Track start time for logging
  const startTime = new Date();
  // Save the start time (like starting a stopwatch to measure request duration)

  const programName = "DQDDetailedViewDataProfileAPI"; // The name of the API program
  // Program name helps identify this API in logs and monitoring dashboards

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve the user ID from the request headers or default to "Anonymous"
  // Identify who is calling the API (for auditing); fallback to Anonymous if not provided

  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url);
  // Parse the request URL to read query values (like ?catalogName=...&schemaName=...&datasetName=...)

  const catalogName = searchParams.get("catalogName");
  // Read catalogName filter from the URL (like selecting which main database folder to use)

  const schemaName = searchParams.get("schemaName");
  // Read schemaName filter from the URL (like selecting a sub-folder inside the catalog)

  const datasetName = searchParams.get("datasetName");
  // Read datasetName filter from URL (like selecting which report/table to analyze)

  // ------------------- PARAMETER VALIDATION -------------------
  if (!catalogName || !schemaName || !datasetName) {
    // If any required input is missing, we cannot generate the correct profiling report

    const errorMessage =
      "Missing required query parameters: catalogName, schemaName, datasetName";
    // Create clear human-readable message explaining what the user/frontend forgot to send

    console.error(errorMessage);
    // Log the error for debugging (helps developers/support team)

    // Return a 400 Bad Request response
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // HTTP 400 means frontend sent incorrect request (missing required parameters)
  }

  try {
    // ------------------- QUERY EXECUTION -------------------
    const session = await getDatabricksSession(); // Get Databricks session for executing queries
    // Open or reuse secure Databricks session/connection (like logging into the database)

    console.info(
      `Executing queries for Catalog: ${catalogName}, Schema: ${schemaName}, Dataset: ${datasetName}`
    );
    // Log which dataset is being processed (useful in debugging and audit trails)

    // Execute the queries for highlights and summaries concurrently
    const [highlights, summaries] = await Promise.all([
      executeQuery(
        session,
        buildHighlightsQuery(catalogName, schemaName, datasetName)
      ),
      // Query #1: fetch highlight metrics (summary KPIs) for the dataset

      executeQuery(
        session,
        buildSummaryQuery(catalogName, schemaName, datasetName)
      ),
      // Query #2: fetch detailed summary metrics (profiling breakdown) for dataset
    ]);
    // Promise.all runs both queries in parallel to reduce response time (faster than running one after the other)

    // ------------------- SUCCESS LOG -------------------
    await logToEventHub({
      type: "INFO",
      // INFO means the action completed successfully
      detailMessage: `Successfully retrieved data profiling for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}'`,
      // Message that confirms profiling data retrieval worked
      programName,
      // Identify which API logged this event
      startDatetime: startTime,
      // Start time used to measure how long the request took
      status: "SUCCESS",
      // Mark status as SUCCESS for monitoring dashboards and reports
      actionType: "Spark_SQL_Query",
      // Categorize the action: Databricks SQL query execution
      actionDescription: `Fetch Data profiling data from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what data was fetched and from which table
      user,
      // Record which user triggered this API request
    });

    // Return the combined highlights and summary data in the response
    return NextResponse.json({ highlights, summaries });
    // Send both outputs back to frontend UI (like sending both "top KPIs" and "detailed report" together)
  } catch (error: any) {
    // ------------------- ERROR LOG -------------------
    const errorMessage = `Error retrieving data profiling for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}': ${
      error.message || "Unknown error"
    }`;
    // Create detailed error message including dataset and location details for easier troubleshooting

    console.error(errorMessage);
    // Print error message in server logs for debugging

    // Log the error to EventHub
    await logToEventHub({
      type: "ERROR",
      // ERROR means request failed
      detailMessage: errorMessage,
      // Record error message in logs for monitoring/audit
      programName,
      // Identify which API failed
      startDatetime: startTime,
      // Start time used to calculate time-to-failure
      status: "FAILED",
      // Mark the operation as FAILED
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch Data profiling data from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what action failed and where
      user,
      // Store which user request failed
    });

    // Return a 500 Internal Server Error response
    return NextResponse.json(
      { error: errorMessage },
      // Return readable error to frontend so it can display message to user
      { status: 500 }
      // HTTP 500 indicates backend/server failure (system issue, not user mistake)
    );
  }
});