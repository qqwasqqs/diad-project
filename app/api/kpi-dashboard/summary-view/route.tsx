/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script handles the API endpoint for fetching the summary view of KPI data for the Teva Data Integrity Automation Dashboard.
    - It retrieves key metrics on the KPIs' validation status, including the total, validated, failed, and passed KPIs.
    - The route executes two SQL queries:
        1. **HIGHLIGHTS_QUERY**: Retrieves KPI validation status highlights across different brands.
        2. **BRAND_SUMMARY_QUERY**: Fetches the total number of KPIs for each brand, along with the validated and non-validated counts.
    - The script logs both successful and failed queries to Event Hub for monitoring and auditing purposes.
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
  KPI_QUALITY_CONFIG_TABLE, // Table name for storing KPI quality configuration details
  KPI_QUALITY_EXECUTION_RESULTS_TABLE, // Table name for storing KPI quality execution results
  KPI_L1_TAG_NAME, // L1 business tag used for KPI Splunk logging, monitoring, and reporting
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
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERIES ----------------------------- */

/**
 * SQL query to fetch highlights for KPI validation across brands.
 * The query retrieves the total KPIs, validated KPIs, failed KPIs, and their respective percentages.
 * This is useful for getting a quick overview of the KPI status across brands.
 */
const buildKpiHighlightsQuery = (request: NextRequest): string => {
  // Build the RBAC row filter from the logged-in user's KPI scopes.
  // Example: brand=US limits the summary cards to US-brand KPIs.
  const rbacScopeClauseForConfigAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // The total KPI CTE reads the config table without an alias, so it needs an unaliased scope map.
  const rbacScopeClauseForConfigTable = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns()
  );

  // Return the KPI highlights query with RBAC filters applied at source CTEs.
  return ` 
  -- Define a Common Table Expression (CTE) to fetch the latest KPI execution results
  WITH latest_results AS (
    SELECT
      k.*,  -- Select all columns from the KPI execution results table
      ROW_NUMBER() OVER (  -- Generate a row number for each KPI based on the run ID
          PARTITION BY k.CONFIG_ID, k.KPI_UNIQUE_IDENTIFIER, k.KPI_UNIQUE_IDENTIFIER_VALUE  -- Group by configuration, KPI, and unique identifier
          ORDER BY k.RUN_ID DESC  -- Order by the run ID in descending order to get the most recent result first
        ) AS rn  -- Assign row numbers to each group
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k -- From the KPI execution results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results table with the KPI configuration table to link each execution result with its corresponding configuration details using CONFIG_ID
    WHERE c.ENABLED = TRUE -- Only include enabled config rules  
    ${rbacScopeClauseForConfigAlias}
    -- RBAC data-scope filter: only include KPI rows allowed by the user's groups
    -- This CTE ensures that we only keep the latest execution result for each KPI per configuration.
  ),
  -- Define a second CTE to calculate the failure status of KPIs
  kpi_status AS (
    SELECT
      BRAND,  -- Select the brand name
      KPI_NAME,  -- Select the KPI name
      MAX(  -- Calculate whether the KPI has failed in any of the latest executions
        CASE
          WHEN RESULT_STATUS = 'FAILED' THEN 1  -- Mark as '1' if the result status is 'FAILED'
          ELSE 0  -- Otherwise, mark as '0'
        END
      ) AS has_failed  -- Store whether the KPI has failed at least once (0 = Passed, 1 = Failed)
    FROM
      latest_results  -- Use the latest results from the first CTE
    WHERE
      rn = 1  -- Only consider the most recent execution for each KPI
    GROUP BY
      BRAND,  -- Group by brand
      KPI_NAME  -- Group by KPI name
    -- This CTE calculates whether each KPI for a brand has failed in the latest execution.
  ),
  -- Define a third CTE to calculate the total number of KPIs for each brand
  total_KPIs AS (
    SELECT
      BRAND,  -- Select the brand
      COUNT(DISTINCT KPI_NAME) AS total_kpis  -- Count the distinct KPIs for each brand
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE}  -- From the KPI configuration table
    WHERE ENABLED = TRUE -- Only include enabled config rules
    ${rbacScopeClauseForConfigTable}
    -- RBAC data-scope filter: keep total KPI counts inside the user's allowed scope
    GROUP BY
      BRAND  -- Group by brand
    -- This CTE calculates the total number of KPIs defined for each brand in the configuration table.
  ),
  -- Define a fourth CTE to summarize KPI data per brand, including validated, failed, passed KPIs, and their percentages
  brand_summary AS (
    SELECT
      ks.BRAND,  -- Select the brand
      COUNT(DISTINCT ks.kpi_name) AS validated_kpis,  -- Count the distinct KPIs that have been validated
      SUM(  -- Calculate the number of KPIs that have failed
        CASE
          WHEN ks.has_failed = 1 THEN 1  -- Count KPIs that have failed (i.e., has_failed = 1)
          ELSE 0  -- Otherwise, count as 0
        END
      ) AS failed_kpis,  -- Total number of failed KPIs
      SUM(  -- Calculate the number of KPIs that have passed
        CASE
          WHEN ks.has_failed = 0 THEN 1  -- Count KPIs that have passed (i.e., has_failed = 0)
          ELSE 0  -- Otherwise, count as 0
        END
      ) AS passed_kpis,  -- Total number of passed KPIs
      tk.total_kpis,  -- Fetch the total number of KPIs for the given brand from the 'total_KPIs' CTE
      CONCAT(  -- Concatenate the percentage of validated KPIs
        ROUND((COUNT(DISTINCT ks.kpi_name) / tk.total_kpis) * 100, 2), '%'
      ) AS validated_kpis_percentage,  -- Percentage of validated KPIs as a string with a '%' sign
      CONCAT(  -- Concatenate the percentage of failed KPIs
        ROUND(  -- Calculate the percentage of failed KPIs
          (
            SUM(  -- Sum the failed KPIs
              CASE
                WHEN ks.has_failed = 1 THEN 1  -- Count KPIs that have failed
                ELSE 0  -- Otherwise, count as 0
              END
            ) / COUNT(DISTINCT ks.kpi_name)  -- Divide by the number of validated KPIs to get the percentage
          ) * 100,
          2  -- Round the result to 2 decimal places
        ),
        '%'
      ) AS failed_kpis_percentage,  -- Percentage of failed KPIs as a string with a '%' sign
      CONCAT(  -- Concatenate the percentage of passed KPIs
        ROUND(  -- Calculate the percentage of passed KPIs
          (
            SUM(  -- Sum the passed KPIs
              CASE
                WHEN ks.has_failed = 0 THEN 1  -- Count KPIs that have passed
                ELSE 0  -- Otherwise, count as 0
              END
            ) / COUNT(DISTINCT ks.kpi_name)  -- Divide by the number of validated KPIs to get the percentage
          ) * 100,
          2  -- Round the result to 2 decimal places
        ),
        '%'
      ) AS passed_kpis_percentage  -- Percentage of passed KPIs as a string with a '%' sign
    FROM
      kpi_status ks  -- From the 'kpi_status' CTE which holds the status of each KPI (passed/failed)
      LEFT JOIN total_KPIs tk  -- Left join with the 'total_KPIs' CTE to get the total number of KPIs for the brand
        ON ks.BRAND = tk.BRAND  -- Join on the BRAND column to match KPIs with their total count for the brand
    GROUP BY
      ks.BRAND,  -- Group the results by the brand
      tk.total_kpis  -- Group the results by the total KPIs for that brand (from the 'total_KPIs' CTE)
    -- This CTE calculates the total KPIs, passed KPIs, failed KPIs, and their percentages for each brand.
  ),
  -- Define a fifth CTE to get the brand with the most failed KPIs
  most_failed_brand AS (
    SELECT
      BRAND,  -- Select the brand
      failed_kpis  -- Select the number of failed KPIs
    FROM
      brand_summary  -- From the 'brand_summary' CTE
    ORDER BY
      failed_kpis DESC  -- Order the brands by the number of failed KPIs in descending order
    LIMIT 1  -- Limit the result to the brand with the most failed KPIs
    -- This CTE identifies the brand with the highest number of failed KPIs.
  )
  -- Final SELECT to aggregate the summary of KPIs for all brands
  SELECT
    SUM(total_kpis) AS total_kpis,  -- Total number of KPIs across all brands
    SUM(validated_kpis) AS validated_kpis,  -- Total number of validated KPIs across all brands
    SUM(failed_kpis) AS failed_kpis,  -- Total number of failed KPIs across all brands
    SUM(passed_kpis) AS passed_kpis,  -- Total number of passed KPIs across all brands
    CONCAT(ROUND((SUM(validated_kpis) / SUM(total_kpis)) * 100, 2), '%') AS validated_kpis_percentage,  -- Total validated KPIs as a percentage
    CONCAT(ROUND((SUM(passed_kpis) / SUM(validated_kpis)) * 100, 2), '%') AS passed_kpis_percentage,  -- Total passed KPIs as a percentage of validated KPIs
    CONCAT(ROUND((SUM(failed_kpis) / SUM(validated_kpis)) * 100, 2), '%') AS failed_kpis_percentage  -- Total failed KPIs as a percentage of validated KPIs
  FROM
    brand_summary  -- From the 'brand_summary' CTE, which contains the summary of KPIs per brand
`;
};

/**
 * SQL query to fetch the total number of KPIs, validated KPIs, and non-validated KPIs for each brand.
 * This query helps in summarizing KPI data at the brand level for the dashboard view.
 */
const buildBrandKpiSummaryQuery = (request: NextRequest): string => {
  // Build RBAC filters for the config-only CTE and the execution/config joined query.
  const rbacScopeClauseForConfigTable = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns()
  );

  // Build RBAC filters for the config alias used in the joined execution query.
  const rbacScopeClauseForConfigAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // Return the brand summary query with scope-level data control applied.
  return ` 
  -- Define a Common Table Expression (CTE) to fetch the latest KPI execution results
  WITH latest_results AS (
    SELECT
      k.*,  -- Select all columns from the KPI execution results table
      ROW_NUMBER() OVER (  -- Generate a row number for each KPI based on the run ID
          PARTITION BY k.CONFIG_ID, k.KPI_UNIQUE_IDENTIFIER, k.KPI_UNIQUE_IDENTIFIER_VALUE  -- Group by configuration, KPI, and unique identifier
          ORDER BY k.RUN_ID DESC  -- Order by the run ID in descending order to get the most recent result first
        ) AS rn  -- Assign row numbers to each group
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k -- From the KPI execution results table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
    -- Join the KPI execution results table with the KPI configuration table to link each execution result with its corresponding configuration details using CONFIG_ID
    WHERE c.ENABLED = TRUE -- Only include enabled config rules
    ${rbacScopeClauseForConfigAlias}
    -- RBAC data-scope filter: only include KPI rows allowed by the user's groups
    -- This CTE ensures that we only keep the latest execution result for each KPI per configuration.
  ),
  -- Define a second CTE to calculate the failure status of KPIs
  kpi_status AS (
    SELECT
      BRAND,  -- Select the brand name
      KPI_NAME,  -- Select the KPI name
      MAX(  -- Calculate whether the KPI has failed in any of the latest executions
        CASE
          WHEN RESULT_STATUS = 'FAILED' THEN 1  -- Mark as '1' if the result status is 'FAILED'
          ELSE 0  -- Otherwise, mark as '0'
        END
      ) AS has_failed  -- Store whether the KPI has failed at least once (0 = Passed, 1 = Failed)
    FROM
      latest_results  -- Use the latest results from the first CTE
    WHERE
      rn = 1  -- Only consider the most recent execution for each KPI
    GROUP BY
      BRAND,  -- Group by brand
      KPI_NAME  -- Group by KPI name
    -- This CTE calculates whether each KPI for a brand has failed in the latest execution.
  ),
  -- Create a temporary table (CTE) that calculates the total KPI count per brand
  total_KPIs AS ( 
    SELECT 
      BRAND, 
      -- Brand name (example: "Teva", "Actavis")
      COUNT(DISTINCT KPI_NAME) AS Total_KPIs
      -- Count unique KPIs configured for that brand (Total KPIs)
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE}
    -- Read KPI definitions/configurations table (like master KPI list)
    WHERE ENABLED = TRUE 
    -- Only include enabled config rules
    ${rbacScopeClauseForConfigTable}
    -- RBAC data-scope filter: only count configured KPIs inside the user's allowed scope
    GROUP BY BRAND
    -- Group results brand-wise so each brand gets one Total_KPIs number
  )
  -- Main query to generate the KPI summary (total, validated, failed, non validated)
  SELECT
    ks.BRAND, 
    -- Brand name coming from execution results
    tk.Total_KPIs,
    -- Total KPI count per brand from the KPI_details summary table
    COUNT(DISTINCT ks.KPI_NAME) AS Validated_KPIs,  -- Count the number of distinct KPIs that have been validated (i.e., included in the status check)
    -- This gives the total number of KPIs that have been evaluated for the brand.

    SUM(  -- Calculate the number of KPIs that have failed
      CASE
        WHEN ks.has_failed = 1 THEN 1  -- Count KPIs that have failed (i.e., has_failed = 1)
        ELSE 0  -- Otherwise, count as 0
      END
    ) AS Failed_KPIs,  -- Total number of failed KPIs
    -- This counts the number of KPIs that have failed.
    tk.Total_KPIs - COUNT(DISTINCT ks.KPI_NAME) AS Non_Validated_KPIs
    -- KPIs that exist in configuration but did NOT execute (like expected tests not performed)
  FROM
    kpi_status ks  -- From the 'kpi_status' CTE which holds the status of each KPI (passed/failed)
  LEFT JOIN total_KPIs tk  -- Left join with the 'total_KPIs' CTE to get the total number of KPIs for the brand
    ON ks.BRAND = tk.BRAND  -- Join on the BRAND column to match KPIs with their total count for the brand
  GROUP BY
    ks.BRAND,  -- Group the results by the brand
    tk.total_kpis  -- Group the results by the total KPIs for that brand (from the 'total_KPIs' CTE)
    -- This ensures that the result is grouped by brand and total KPIs, calculating aggregates for each group.
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */
// Section divider: API endpoint starts here

/**
 * Handles the GET request to retrieve summary data for KPIs.
 * - Executes two SQL queries to fetch:
 *   1. KPI highlights (overall validation percentages for KPIs across brands).
 *   2. Brand-wise KPI validation counts (total, validated, and non-validated).
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns A JSON response containing KPI highlights and brand-wise KPI counts.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs when the frontend calls this API using HTTP GET request

  // Track the start time of the request for logging
  const requestStartTime = new Date();
  // Save when request started (like starting a stopwatch)

  // Define program name and user (retrieved from headers) for logging purposes
  const programName = "KPIDashboardSummaryViewAPI";
  // A label used in monitoring logs to identify this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Fallback to "Anonymous" if no user ID is provided
  // Identify which user requested the report; if missing, treat it as Anonymous

  try {
    // Try block: normal successful flow runs here; failures go to catch block

    // Log the start of the request processing
    console.info(
      `[${requestStartTime.toISOString()}] Starting request for KPI dashboard summary.`
    );
    // Print timestamp log to server console so support team knows request started

    // Get the Databricks session
    const session = await getDatabricksSession();
    // Open or reuse a secure connection session to Databricks (like logging into database)

    // Execute both SQL queries concurrently
    const [highlights, brandSummary] = await Promise.all([
      executeQuery(session, buildKpiHighlightsQuery(request)),
      // Run KPI highlights query (gives overall KPI stats)

      executeQuery(session, buildBrandKpiSummaryQuery(request)),
      // Run brand summary query (gives KPI stats per brand)
    ]);
    // Promise.all executes both in parallel to save time (like asking two people to fetch two reports simultaneously)

    // Log success details to Event Hub
    await logToEventHub({
      type: "INFO",
      // INFO means operation succeeded normally
      detailMessage: "Successfully retrieved KPI dashboard summary data.",
      // Message for logs explaining what was done successfully
      programName,
      // API name for traceability
      startDatetime: requestStartTime,
      // Used to calculate processing time
      status: "SUCCESS",
      // Mark status as success for monitoring dashboards
      actionType: "Spark_SQL_Query",
      // Categorize action as SQL query execution
      actionDescription: `Fetch KPI summary and brand-wise counts from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Business description of what tables were queried
      l1Tag: KPI_L1_TAG_NAME,
      // Business unit tag for reporting/alert routing in Splunk
      user,
      // Store the user who triggered the request
    });

    // Return the query results as JSON
    return NextResponse.json({
      highlights: highlights && highlights.length > 0 ? highlights[0] : {}, // The first result is the KPI highlights
      // If highlights exists return first row; otherwise return empty object (prevents frontend crash)

      brands: brandSummary, // The second result is the brand summary data
      // Return full brand summary list which UI can display as table/chart
    });
  } catch (error: unknown) {
    // Catch block: runs if any error occurs (Databricks connection issue, SQL failure, etc.)

    // Log error details to Event Hub if an exception occurs
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while processing the request.";
    // Extract readable error message; fallback to default message if missing

    console.error(
      `[${new Date().toISOString()}] Error: ${errorMessage}`,
      error
    );
    // Print timestamped error log including the full error object for debugging

    // Log the failure event
    await logToEventHub({
      type: "ERROR",
      // ERROR log indicates request failed
      detailMessage: `Error retrieving KPI summary data: ${errorMessage}`,
      // Store failure reason for investigation
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Start time to measure how long request ran before failing
      status: "FAILED",
      // Mark status as failed
      actionType: "Spark_SQL_Query",
      // Categorize as SQL query failure
      actionDescription: `Failed to fetch KPI summary and brand-wise counts from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe what failed and which tables were involved
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for filtering logs
      user,
      // Record which user was affected / initiated the request
    });

    // Return a JSON error response
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 (server error) so frontend knows this is a backend/system issue
  }
});
