/* 
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script defines an API route for fetching detailed data quality metrics related to data drift,
    including statistical checks like Median, Standard Deviation, and Data Drift measures (KL and PSI).
    It ensures that the data integrity checks are executed, and logs the results and errors to EventHub for traceability.
    The API handles query parameters for catalog, schema, and dataset and queries Databricks for results.
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */
/**
 * Builds a SQL query to fetch various data quality metrics for a specific dataset.
 * The query combines several statistical checks and data drift tests (KL and PSI) and pivots the results.
 *
 * @param catalogName - The name of the catalog (data source).
 * @param schemaName - The schema within the catalog.
 * @param datasetName - The dataset name within the schema.
 * @returns A SQL query string.
 */
const buildSummaryQuery = (
    catalogName: string,
    schemaName: string,
    datasetName: string
): string => {
    return `
        -- Main query to get the summary of various checks on the dataset
        SELECT
        *
        FROM
        (
        -- UNION ALL of various statistical checks (median, stddev, variance, etc.)
        SELECT DISTINCT
            CATALOG_NAME,
            SCHEMA_NAME,
            DATASET_NAME,
            TARGET_COLUMN,
            KEY,  -- Key of the statistic (e.g., 'Median', 'Variance', etc.)
            VALUE  -- Result value for each statistic (e.g., median value, standard deviation)
        FROM
            (
            -- Median Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Median' AS KEY,  -- Key for median check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for median check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk  -- To get the latest run for each dataset and column
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'median_check'  -- Filtering for median check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL 

            -- Standard Deviation Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Standard Deviation' AS KEY,  -- Key for standard deviation check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for stddev check
                ROW_NUMBER() OVER (
                    -- FIX: PARTITION BY includes full dataset identity
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'stddev_check'  -- Filtering for stddev check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Variance Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Variance' AS KEY,  -- Key for variance check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for variance check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'variance_check'  -- Filtering for variance check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Quartile 1 (Q1) Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Q1' AS KEY,  -- Key for Q1 (first quartile) check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for Q1 check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'quartile1_check'  -- Filtering for Q1 check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Quartile 3 (Q3) Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Q3' AS KEY,  -- Key for Q3 (third quartile) check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for Q3 check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'quartile3_check'  -- Filtering for Q3 check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Outlier Percentage Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Outlier Percentage' AS KEY,  -- Key for outlier percentage check
                ROUND(RESULT_VALUE, 2) AS VALUE,  -- Rounded value for outlier check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'outlier_check'  -- Filtering for outlier percentage check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Mode Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Mode' AS KEY,  -- Key for mode check
                RESULT_VALUE AS VALUE,  -- Mode value for the check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'mode_check'  -- Filtering for mode check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Normality Check
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Normality Check' AS KEY,  -- Key for normality check
                RESULT_VALUE AS VALUE,  -- Normality test p-value for the check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                rule_name = 'normality_check'  -- Filtering for normality check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL 

            -- Drift Check-KL (Kullback-Leibler Divergence)
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Drift Check-KL' AS KEY,  -- Key for Drift check using KL divergence
                RESULT_VALUE AS VALUE,  -- KL divergence value for drift check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN, rule_name
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                (rule_name = 'drift_check_kl_numeric'
                OR rule_name = 'drift_check_kl_categorical')  -- Filtering for KL divergence drift check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'

            UNION ALL  

            -- Drift Check-PSI (Population Stability Index)
            SELECT DISTINCT
                CATALOG_NAME,
                SCHEMA_NAME,
                DATASET_NAME,
                TARGET_COLUMN,
                'Drift Check-PSI' AS KEY,  -- Key for Drift check using PSI
                RESULT_VALUE AS VALUE,  -- PSI value for drift check
                ROW_NUMBER() OVER (
                    PARTITION BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME, TARGET_COLUMN, rule_name
                    ORDER BY CAST(RUN_ID AS INT) DESC
                ) AS rnk
            FROM
                ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
            WHERE
                (rule_name = 'drift_check_psi_categorical'
                OR rule_name = 'drift_check_psi_numeric')  -- Filtering for PSI drift check rule
                AND CATALOG_NAME = '${catalogName}'
                AND SCHEMA_NAME  = '${schemaName}'
                AND DATASET_NAME = '${datasetName}'
            ) AS unioned
        WHERE
            rnk = 1  -- Only take the most recent (latest) result for each dataset/column
        ) AS final
        -- Pivot the results to have one row per dataset/column and each check as a separate column
        PIVOT (
            NVL(MAX(VALUE), '-') FOR KEY IN (
            'Median' AS Median,
            'Standard Deviation' AS Standard_Deviation,
            'Variance' AS Variance,
            'Q1' AS Q1,
            'Q3' AS Q3,
            'Outlier Percentage' AS Outlier_Percentage,
            'Mode' AS Mode,
            'Normality Check' AS Normality_Test_pValue,
            'Drift Check-KL' AS Data_Drift_KL_Div,
            'Drift Check-PSI' AS Data_Drift_PSI
            )
        )
        -- Filter by catalog, schema, and dataset name to ensure we're pulling the correct dataset
        WHERE
        CATALOG_NAME = '${catalogName}'
        AND SCHEMA_NAME = '${schemaName}'
        AND DATASET_NAME = '${datasetName}'
    `;
};

/* ------------------------------- API ROUTE HANDLER -------------------------------- */

/**
 * Handles the GET request for retrieving data quality metrics for a given catalog, schema, and dataset.
 *
 * This function extracts query parameters, validates them, executes the SQL query, logs the results, and returns the data.
 * If any errors occur, it logs them and returns an appropriate error response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns A NextResponse containing the query result or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
    // This is the API endpoint function that runs when the frontend calls this URL using GET

    // Capture the start time for logging purposes
    const requestStartTime = new Date();
    // Save request start time (like starting a stopwatch to measure duration)

    const programName = "DQDDetailedViewDataDriftAPI"; // Name of the program (API)
    // A fixed label used in logs to identify which API generated the message

    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from headers or default to "Anonymous"
    // Identify who is making the request (for audit tracking); if missing, set Anonymous

    const { searchParams } = new URL(request.url);
    // Break down the request URL to read query parameters (example: ?catalogName=...&schemaName=...&datasetName=...)

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
            "Missing required query parameters: catalogName, schemaName, datasetName";
        // Clear message explaining which inputs are required

        console.error(errorMessage);
        // Print error to logs so developers/support know why the API returned 400

        // Return a 400 error with a descriptive message
        return NextResponse.json({ error: errorMessage }, { status: 400 });
        // HTTP 400 = request is invalid (user/frontend missed required inputs)
    }

    try {
        // ------------------- EXECUTE QUERY -------------------

        const session = await getDatabricksSession(); // Get Databricks session
        // Create or reuse secure Databricks connection session (like logging into database)

        const query = buildSummaryQuery(catalogName, schemaName, datasetName); // Build the SQL query
        // Generate the SQL query string using the user-provided filters (like preparing a report request)

        console.info(
            `Executing query for Catalog: ${catalogName}, Schema: ${schemaName}, Dataset: ${datasetName}`
        );
        // Log the query context so we know which dataset was requested (useful for troubleshooting)

        // Execute the query using the Databricks session
        const queryResults = await executeQuery(session, query);
        // Run SQL query in Databricks and store results returned (like receiving the report output)

        // Log success if query execution was successful
        await logToEventHub({
            type: "INFO",
            // INFO indicates successful normal operation
            detailMessage: `Successfully retrieved data quality metrics for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}'`,
            // A readable success message that can be used in Splunk monitoring dashboards
            programName,
            // API name so we know which service logged this message
            startDatetime: requestStartTime,
            // Include start time for performance monitoring
            status: "SUCCESS",
            // Mark request as successfully completed
            actionType: "Spark_SQL_Query",
            // Categorize action as Databricks SQL query execution
            actionDescription: `Fetch Data quality metrics from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
            // Describe what action the API performed (data quality summary fetch)
            user,
            // User ID of the person who initiated the request (important for audit)
        });

        // Return the result of the query as JSON response
        return NextResponse.json(queryResults);
        // Send the query output back to frontend UI so it can display the data quality metrics
    } catch (error: any) {
        // ------------------- ERROR LOG -------------------
        const errorMessage = `Error retrieving data quality metrics for Dataset '${datasetName}' in Catalog: '${catalogName}' and schema: '${schemaName}': ${error.message || "Unknown error"
            }`;
        // Prepare detailed error message containing dataset, catalog, schema so troubleshooting is easier

        console.error(errorMessage);
        // Print error in server logs for debugging

        await logToEventHub({
            type: "ERROR",
            // ERROR indicates the process failed
            detailMessage: errorMessage,
            // Store detailed error reason in Event Hub (goes to Splunk)
            programName,
            // Identify which API failed
            startDatetime: requestStartTime,
            // Helps calculate how long request ran before failing
            status: "FAILED",
            // Mark request as failed
            actionType: "Spark_SQL_Query",
            // Categorize the failure as related to SQL query execution
            actionDescription: `Failed to fetch Data quality metrics from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
            // Explain which table/action the API attempted
            user,
            // Include which user triggered this request
        });

        // Return a 500 error with the error message
        return NextResponse.json(
            { error: errorMessage },
            // Return response body with readable error message for frontend display
            { status: 500 }
            // HTTP 500 means backend/server/system issue (not user input issue)
        );
    }
});