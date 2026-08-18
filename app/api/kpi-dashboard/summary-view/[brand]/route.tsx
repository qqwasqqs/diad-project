/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script handles the API endpoint for retrieving KPI data for a specific brand in the Teva Data Integrity Automation Dashboard.
    - It fetches KPI highlights (validated, failed, and passed KPIs), lists all available brands, and retrieves unique data vendors.
    - The route executes three SQL queries:
        1. **HIGHLIGHTS_QUERY**: Retrieves KPI validation metrics for a specific brand.
        2. **LIST_BRANDS_QUERY**: Retrieves the list of all brands.
        3. **DATA_VENDORS_QUERY**: Retrieves distinct data vendors used in the KPIs.
    - The script logs success and failure to Event Hub for monitoring and auditing purposes.
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
 * SQL query to fetch KPI highlights for a specific brand.
 * This query retrieves the total number of validated, failed, and passed KPIs, and their corresponding percentages.
 *
 * @param brand - The brand for which KPI highlights need to be fetched.
 * @returns A SQL query string that will fetch the desired KPI metrics for the given brand.
 */
const getKpiHighlightsQuery = (brand: string, request: NextRequest): string => {
  // Build the RBAC filter for the joined KPI config alias.
  // Example: brand=Teva limits the highlighted KPI metrics to Teva rows.
  const rbacScopeClauseForConfigAlias = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // Build the RBAC filter for the config table when it is used without an alias.
  // Example: kpi=Sales only counts Sales KPI definitions in total KPI counts.
  const rbacScopeClauseForConfigTable = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns()
  );

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
  )
  -- Main query to generate the KPI summary (validated, failed, passed, percentages)
  SELECT
    COUNT(DISTINCT ks.kpi_name) AS validated_kpis,  -- Count the number of distinct KPIs that have been validated (i.e., included in the status check)
    -- This gives the total number of KPIs that have been evaluated for the brand.

    SUM(  -- Calculate the number of KPIs that have failed
      CASE
        WHEN ks.has_failed = 1 THEN 1  -- Count KPIs that have failed (i.e., has_failed = 1)
        ELSE 0  -- Otherwise, count as 0
      END
    ) AS failed_kpis,  -- Total number of failed KPIs
    -- This counts the number of KPIs that have failed.

    SUM(  -- Calculate the number of KPIs that have passed
      CASE
        WHEN ks.has_failed = 0 THEN 1  -- Count KPIs that have passed (i.e., has_failed = 0)
        ELSE 0  -- Otherwise, count as 0
      END
    ) AS passed_kpis,  -- Total number of passed KPIs
    -- This counts the number of KPIs that have passed.

    tk.total_kpis,  -- Fetch the total number of KPIs for the given brand from the 'total_KPIs' CTE
    -- This retrieves the total number of KPIs for the brand from the third CTE.

    CONCAT(  -- Concatenate the percentage of validated KPIs
      ROUND((COUNT(DISTINCT ks.kpi_name) / tk.total_kpis) * 100, 2), '%'  -- Calculate and round the percentage of validated KPIs
    ) AS validated_kpis_percentage,  -- Percentage of validated KPIs as a string with a '%' sign
    -- This calculates the percentage of KPIs that have been validated based on the total KPIs for the brand.

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
    -- This calculates the percentage of KPIs that have failed out of the validated KPIs.

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
    -- This calculates the percentage of KPIs that have passed out of the validated KPIs.

  FROM
    kpi_status ks  -- From the 'kpi_status' CTE which holds the status of each KPI (passed/failed)
    LEFT JOIN total_KPIs tk  -- Left join with the 'total_KPIs' CTE to get the total number of KPIs for the brand
      ON ks.BRAND = tk.BRAND  -- Join on the BRAND column to match KPIs with their total count for the brand

  WHERE
    ks.BRAND = '${brand}'  -- Filter by the brand parameter passed to the query
    -- This filters the result to show data for the specific brand passed to the query.

  GROUP BY
    ks.BRAND,  -- Group the results by the brand
    tk.total_kpis  -- Group the results by the total KPIs for that brand (from the 'total_KPIs' CTE)
    -- This ensures that the result is grouped by brand and total KPIs, calculating aggregates for each group.
`;
};

/**
 * SQL query to fetch the list of brands from the database.
 * This query returns all distinct brands present in the KPI configuration.
 *
 * @returns A SQL query string to fetch the list of brands.
 */
const getBrandsListQuery = (request: NextRequest): string => {
  // Build a scoped WHERE addition so brand dropdowns only show brands this user may see.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns()
  );

  return `
  SELECT
    BRAND
    -- Select the BRAND column (this is like listing all brand names)
  FROM
    ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE}
    -- Read from KPI configuration table (this table stores which KPIs belong to which brands)
  WHERE ENABLED = TRUE -- Only include enabled config rules
  ${rbacScopeClause}
  -- RBAC data-scope filter: only expose brands from allowed KPI configuration rows
  GROUP BY BRAND
  -- GROUP BY gives a unique list of brands (like removing duplicates in Excel)
`;
};

/**
 * SQL query to fetch the distinct data vendors used in the KPIs.
 * This query retrieves a list of unique data vendors involved in the KPI execution results.
 *
 * @returns A SQL query string to fetch the list of data vendors.
 */
const getDataVendorsQuery = (request: NextRequest): string => {
  // Build the RBAC filter for the KPI config alias used by the execution/config join.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  return `
  SELECT DISTINCT
   k.DATA_VENDOR
   -- DISTINCT ensures we get only unique vendor names (no repeated vendor rows)
  FROM
    ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_EXECUTION_RESULTS_TABLE} k
    -- Read execution results table (this table stores KPI run results including vendor)
  JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c ON c.CONFIG_ID = k.CONFIG_ID
  -- Join the KPI execution results table with the KPI configuration table to link each execution result with its corresponding configuration details using CONFIG_ID
  WHERE c.ENABLED = TRUE -- Only include enabled config rules
  ${rbacScopeClause}
  -- RBAC data-scope filter: only expose vendors from KPI rows this user may view
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch KPI data for a specific brand.
 * This function executes three queries to fetch:
 *   1. **KPI highlights** for the given brand.
 *   2. A **list of brands** available in the system.
 *   3. A list of **distinct data vendors** used for the KPIs.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @param params - The route parameters, including the brand name.
 * @returns A JSON response containing KPI highlights, a list of brands, and data vendors.
 */
export const GET = withAuthorization(async function GET(
  request: NextRequest, // Incoming HTTP request from frontend (like user clicking "view brand details")
  { params }: { params: Promise<{ brand: string }> } // Route parameter object (contains brand name from URL)
): Promise<NextResponse> {
  const requestStartTime = new Date(); // Track the start time of the request for logging
  // Save the time when API started (like a stopwatch start)

  const programName = "KPIDashboardSummaryViewBrandDetailsAPI"; // Program name for logging purposes
  // A label used in logs so we can identify this API in Splunk/Event Hub

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve the user ID from the request header (fallback to "Anonymous")
  // Read user ID from request headers to know who requested the report (audit compliance)

  const { brand } = await params; // Extract the brand from the route parameters
  // Example: URL "/api/kpi/Teva" → brand = "Teva"

  try {
    console.info(
      `[${requestStartTime.toISOString()}] Fetching KPI data for brand: ${brand}`
    );
    // Log request start with timestamp and which brand is being requested

    // Establish a Databricks session for executing queries
    const session = await getDatabricksSession();
    // Open or reuse connection/session to Databricks database (like logging in)

    // Execute the three SQL queries concurrently using Promise.all
    const [highlights, brands, dataVendors] = await Promise.all([
      executeQuery(session, getKpiHighlightsQuery(brand, request)),
      // Query 1: Get KPI highlights for selected brand (main summary results)

      executeQuery(session, getBrandsListQuery(request)),
      // Query 2: Get list of all brands (useful for dropdown filter in UI)

      executeQuery(session, getDataVendorsQuery(request)),
      // Query 3: Get list of all vendors (useful for dropdown filter in UI)
    ]);
    // Running all 3 queries together saves time (like asking 3 people to fetch 3 reports at same time)

    // Log the successful query execution to Event Hub
    await logToEventHub({
      type: "INFO",
      // INFO indicates API call succeeded
      detailMessage: `Successfully retrieved KPI data for brand: ${brand}`,
      // Message describing success for monitoring dashboards
      programName,
      // Include which API created the log
      startDatetime: requestStartTime,
      // Start time helps calculate total duration of request
      status: "SUCCESS",
      // Mark request as successful
      actionType: "Spark_SQL_Query",
      // Indicates that SQL queries were executed in Databricks
      actionDescription: `Fetch KPI highlights, brands, and data vendors from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Description of what was fetched and from which tables
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for Splunk filtering and reporting
      user,
      // Identify which user requested this data
    });

    // Return the response as a JSON object containing the requested data
    return NextResponse.json({
      highlights: highlights && highlights.length > 0 ? highlights[0] : {}, // The first result is the KPI highlights for the given brand
      // If highlights exists return first row; otherwise return empty object (prevents frontend crash)
      brands, // The second result is the list of available brands
      // This list helps UI show brand dropdown without hardcoding brands
      dataVendors, // The third result is the list of distinct data vendors
      // This list helps UI show vendor dropdown
    });
  } catch (error: unknown) {
    // Log error details if the query fails
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    // Extract readable error message; fallback if error is unknown

    console.error(
      `[${new Date().toISOString()}] Error fetching KPI data: ${errorMessage}`,
      error
    );
    // Print detailed error log with timestamp (helps debugging root cause)

    // Log the error event to Event Hub
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: `Error fetching KPI data for brand: ${brand} - ${errorMessage}`,
      // Detailed error message including which brand request failed
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Helps know when failure occurred and duration
      status: "FAILED",
      // Mark request as failed
      actionType: "Spark_SQL_Query",
      // Failure happened during SQL execution
      actionDescription: `Failed to fetch KPI highlights, brands, and data vendors from tables: ${KPI_QUALITY_EXECUTION_RESULTS_TABLE}, ${KPI_QUALITY_CONFIG_TABLE}`,
      // Describe what process failed for investigation
      l1Tag: KPI_L1_TAG_NAME,
      // Business tag for monitoring filters
      user,
      // Include user identity for audit
    });

    // Return a 500 response with the error message
    return NextResponse.json(
      { error: errorMessage },
      // Return error message in JSON format so frontend can show proper error banner
      { status: 500 }
      // HTTP 500 means "server problem" (system issue, not user input error)
    );
  }
});
