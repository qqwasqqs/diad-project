/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This API route is responsible for retrieving the trend data of unrefreshed datasets
    within the data integrity system.
    - It fetches time-series data showing how many datasets failed the timeliness_check rule
      over a given date range, grouped into dynamic time buckets based on the range size.
    - The bucket size is automatically adjusted (hours or days) to produce a meaningful chart
      regardless of whether the user selects a 1-day or 100-day window.
    - Optionally filters by L1 business unit and/or a specific dataset name for drill-down views.
    - The query is executed against a Databricks database, and results are returned in JSON format.
    - Both successful and error events are logged for monitoring and traceability.
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

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
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

/* ----------------------------- SQL QUERY ------------------------------ */

/**
 * Generates a dynamic SQL query to fetch the trend of unrefreshed datasets over time.
 *
 * The query automatically adjusts the bucket size (time grouping) based on the width of
 * the requested date range so the resulting chart always has a meaningful number of data points:
 *   - ≤ 1 day  → 3-hour buckets
 *   - ≤ 5 days → 1-day buckets
 *   - ≤ 15 days → 2-day buckets
 *   - ≤ 30 days → 5-day buckets
 *   - ≤ 100 days → 10-day buckets
 *   - > 100 days → 20-day buckets
 *
 * Each bucket aggregates the count of FAILED timeliness_check results and collects
 * the individual dataset detail records for drill-down purposes.
 *
 * @param startDate   - ISO date string for the start of the time window (e.g. "2025-11-03")
 * @param endDate     - ISO date string for the end of the time window (e.g. "2025-11-10")
 * @param businessUnit - Optional L1 Business Unit name to filter results (e.g. "US Commercial")
 * @param datasetName  - Optional fully-qualified dataset name to scope to a single dataset drill-down
 *                       (e.g. "catalog.schema.my_table")
 * @returns SQL query string that produces bucketed trend data for the unrefreshed dataset chart
 */
const generateDataRefreshTrendChartQuery = (
  startDate: string | null,
  endDate: string | null,
  businessUnit: string | null,
  datasetName: string | null,
  request: NextRequest,
) => {
  // Parse the start and end date strings into Date objects for arithmetic
  const start = new Date(startDate!);
  const end = new Date(endDate!);

  // Calculate the difference in milliseconds between start and end dates
  const diffMs = end.getTime() - start.getTime();

  // Convert milliseconds to days for bucket size decision logic
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Default to 3-hour buckets; will be overridden below based on diffDays
  let bucketSizeHours: number = 3;
  let bucketSizeDays: number | null = null;
  // bucketSizeDays is null when using hourly buckets (diffDays <= 1)

  // Determine bucket size based on the date range width
  // Smaller ranges → finer granularity; larger ranges → coarser grouping
  if (diffDays <= 1) {
    bucketSizeHours = 3;
    // 1-day window: group by every 3 hours (example: 00:00–03:00, 03:00–06:00, ...)
  } else if (diffDays <= 5) {
    bucketSizeDays = 1;
    // Up to 5 days: one bucket per day (example: 03 Nov, 04 Nov, 05 Nov)
  } else if (diffDays <= 15) {
    bucketSizeDays = 2;
    // Up to 15 days: bucket every 2 days (example: 03–04 Nov, 05–06 Nov)
  } else if (diffDays <= 30) {
    bucketSizeDays = 5;
    // Up to 30 days: bucket every 5 days (example: 01–05 Nov, 06–10 Nov)
  } else if (diffDays <= 100) {
    bucketSizeDays = 10;
    // Up to 100 days: bucket every 10 days
  } else {
    bucketSizeDays = 20;
    // More than 100 days: bucket every 20 days for high-level trend visibility
  }

  // Flag to switch between hourly and daily bucketing logic in the SQL template
  const isHourly = diffDays <= 1;
  // true  → use TIMESTAMPDIFF(HOUR, ...) and INTERVAL HOUR in SQL
  // false → use DATEDIFF / DATE_ADD in SQL

  // Helper: format a JS Date as a SQL-safe timestamp string 'YYYY-MM-DD HH:MM:SS'
  // Used for TIMESTAMP comparisons in the WHERE clause and bucket arithmetic
  // Example: new Date("2025-11-10T09:45:00Z") → "2025-11-10 09:45:00"
  const toSqlTimestamp = (d: Date) => d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

  // Helper: format a JS Date as a SQL-safe date string 'YYYY-MM-DD'
  // Used for DATE comparisons and day-based bucket arithmetic
  // Example: new Date("2025-11-10T09:45:00Z") → "2025-11-10"
  const toSqlDate = (d: Date) => d.toISOString().split('T')[0];

  const startTs = toSqlTimestamp(start); // Start boundary as SQL timestamp (e.g. "2025-11-03 00:00:00")
  const endTs = toSqlTimestamp(end);     // End boundary as SQL timestamp (e.g. "2025-11-10 23:59:59")
  const startDt = toSqlDate(start);      // Start boundary as SQL date (e.g. "2025-11-03")
  const endDt = toSqlDate(end);          // End boundary as SQL date (e.g. "2025-11-10")

  // Build the RBAC row filter from this user's group scopes.
  // Example: business_unit=Finance limits the trend chart to Finance dataset rows.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("di")
  );

  return `
WITH base AS (
  -- Step 1: Collect all timeliness_check execution results within the date window.
  -- Also enrich each row with computed fields (full dataset name, brief description, derived_from, alert_type).
  -- Assign a row number per CONFIG_ID ordered by most recent RUN_ID so we can identify the latest run later.
  SELECT
    di.CREATED_AT AS date,
    -- Execution timestamp; used for bucketing and trend plotting

    di.L1_BUSINESS_UNIT,
    -- Business unit for optional BU-level filtering

    di.catalog_name || '.' || di.schema_name || '.' || di.dataset_name AS dataset_name,
    -- Fully qualified dataset name (catalog.schema.table) for display and filtering
    -- Example: "teva_catalog.us_commercial.sales_fact"

    di.RESULT_STATUS,
    -- Validation result: 'PASSED' or 'FAILED'

    di.DETAILS:brief_description AS DETAILS,
    -- Short human-readable description extracted from the DETAILS JSON column

    di.DETAILS:derived_from AS DERIVED_FROM,
    -- Source system the dataset is derived from (extracted from DETAILS JSON)

    di.DETAILS:alert_type AS ALERT_TYPE,
    -- Type of alert triggered (extracted from DETAILS JSON)

    ROW_NUMBER() OVER (PARTITION BY CONFIG_ID ORDER BY RUN_ID DESC) AS rn
    -- rn=1 identifies the most recent execution result per rule configuration
  FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE} di
  INNER JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
    -- Join table tags table to map schema → business unit

    ON di.CATALOG_NAME = SPLIT(st.table_full_name, '\\\\.')[0]

    AND di.SCHEMA_NAME = SPLIT(st.table_full_name, '\\\\.')[1]
    -- Match dataset schema to schema tag schema name

    AND di.DATASET_NAME = SPLIT(st.table_full_name, '\\\\.')[2]
  WHERE
    di.RULE_NAME = 'timeliness_check'
    -- Only timeliness_check rules are relevant for refresh trend analysis

    AND di.CREATED_AT >= '${startTs}'
    AND di.CREATED_AT <= '${endTs}'
    -- Scope results to the requested date/time window

    ${businessUnit ? `AND di.L1_BUSINESS_UNIT = '${businessUnit}'` : ''}
    -- Optional: filter to a single L1 Business Unit (example: "US Commercial")

    ${datasetName !== null ? `AND di.catalog_name || '.' || di.schema_name || '.' || di.dataset_name = '${datasetName}'` : ''}
    -- Optional: filter to a single dataset for drill-down view
    -- Example: "teva_catalog.us_commercial.sales_fact"

    ${rbacScopeClause}
    -- RBAC data-scope filter: only include rows allowed by the user's assigned groups
),

filtered AS (
  -- Step 2: Keep only FAILED results (unrefreshed datasets).
  -- When drilling down to a specific dataset (datasetName is set), we include ALL run records
  -- for that dataset (not just the latest) to show every failure occurrence in the trend.
  -- For the BU-level view, we only use the latest run per config (rn = 1) to avoid double-counting.
  SELECT *
  FROM base
  WHERE RESULT_STATUS = 'FAILED'
  ${datasetName ? '' : 'AND rn = 1'}
  -- For dataset drill-down: show all runs; for BU view: show only latest run per config
),

-- Step 3: Assign each failure record to a time bucket based on the computed bucket size.
-- Hourly buckets: align each record to the nearest bucket_start using FLOOR on hour difference.
-- Daily buckets: align each record to the nearest bucket_start using date modulo arithmetic.
bucketed AS (
  SELECT
    ${isHourly
      ? `CAST(
           timestampadd(
             HOUR,
             CAST(FLOOR(TIMESTAMPDIFF(HOUR, TIMESTAMP('${startTs}'), date) / ${bucketSizeHours}) * ${bucketSizeHours} AS INT),
             TIMESTAMP('${startTs}')
           ) AS TIMESTAMP
         )
      -- Hourly bucket: floor(hoursSinceStart / bucketSize) * bucketSize hours after start
      -- Example: for 3-hour buckets, 07:42 → bucket starting at 06:00
      `
      : `CAST(
           date_sub(
             date,
             pmod(datediff(date, DATE('${startDt}')), ${bucketSizeDays})
           ) AS DATE
         )
      -- Day bucket: subtract the day-of-range modulo bucketSize to snap to the bucket start
      -- Example: for 5-day buckets, Nov 8 (day 5 from Nov 3) → snaps to Nov 3 bucket
      `
    } AS bucket_start_date,
    -- The computed start of the bucket this record belongs to

    date,
    -- Original execution timestamp (preserved for detail records)

    dataset_name,
    -- Fully qualified dataset name

    DETAILS,
    DERIVED_FROM,
    ALERT_TYPE
  FROM filtered
),

-- Step 4: Aggregate bucketed records — count failures per bucket and collect detail records
-- for the drill-down dialog that opens when a user clicks a chart dot.
agg AS (
  SELECT
    bucket_start_date,
    -- Bucket start used as the X-axis value in the trend chart

    COUNT(*) AS unrefreshed_count,
    -- Number of unrefreshed dataset occurrences in this bucket (Y-axis value)

    COLLECT_LIST(named_struct(
      'date', date,
      'dataset_name', dataset_name,
      'DETAILS', DETAILS,
      'DERIVED_FROM', DERIVED_FROM,
      'ALERT_TYPE', ALERT_TYPE
    )) AS dataset_details
    -- Array of individual failure records for this bucket; shown in the drill-down DataGrid
  FROM bucketed
  GROUP BY bucket_start_date
)

-- Step 5: Final SELECT — format bucket_start_date into display-friendly strings for the chart.
-- date is the short key used by the XAxis dataKey in the chart component.
-- bucket_label is the human-readable range label shown in the custom tooltip.
SELECT
  ${isHourly
    ? `date_format(bucket_start_date, 'dd-MM-yyyy hh:mm a') AS date,
       -- Short formatted date+time for XAxis tick (example: "05-11-2025 06:00 AM")

       CONCAT(
         date_format(bucket_start_date, 'dd MMM yyyy'),
         ' ',
         date_format(bucket_start_date, 'hh:mm a'),
         ' - ',
         date_format(
           LEAST(bucket_start_date + INTERVAL ${bucketSizeHours} HOUR, TIMESTAMP('${endTs}')),
           'hh:mm a'
         )
       ) AS bucket_label,
       -- Human-readable range label for tooltip (example: "05 Nov 2025 06:00 AM - 09:00 AM")
       -- LEAST caps the end of the last bucket at the requested endDate
       `
    : `date_format(bucket_start_date, 'dd-MM-yyyy') AS date,
       -- Short formatted date for XAxis tick (example: "05-11-2025")

       CONCAT(
         date_format(bucket_start_date, 'dd MMM yyyy'),
         ' - ',
         date_format(
           LEAST(date_add(bucket_start_date, ${bucketSizeDays! - 1}), DATE('${endDt}')),
           'dd MMM yyyy'
         )
       ) AS bucket_label,
       -- Human-readable date range label for tooltip (example: "03 Nov 2025 - 07 Nov 2025")
       -- LEAST caps the end of the last bucket at the requested endDate
       `
  }

  unrefreshed_count,
  -- Count of failures in this bucket (Y-axis value plotted on the chart line)

  dataset_details
  -- Array of detail records for this bucket (shown in dialog when user clicks the dot)

FROM agg
ORDER BY bucket_start_date;
-- Ensure chart data is in ascending chronological order
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to fetch the trend data of unrefreshed datasets for chart rendering.
 * It accepts query parameters to filter and scope the time-series data returned.
 * The function executes a dynamically generated SQL query and returns the result as a JSON array.
 *
 * @param request - The incoming HTTPS request (NextRequest object) containing query parameters and headers.
 * @returns - A JSON array of bucketed trend data points, each containing:
 *              - `date`: formatted bucket start date string (XAxis key)
 *              - `bucket_label`: human-readable bucket range for the tooltip
 *              - `unrefreshed_count`: number of unrefreshed datasets in this bucket (YAxis value)
 *              - `dataset_details`: array of individual failure records for drill-down
 *            Or an error JSON with status 500 if the query fails.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing
 * the eventual completion or failure of an asynchronous operation. In this case, the Promise resolves
 * with a NextResponse containing the trend data once the request is successfully processed.
 * If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API is called when the dashboard renders the trend chart for unrefreshed datasets

  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DataRefreshTrendChartAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested trend data (for audit); fallback to Anonymous if missing

  const { searchParams } = new URL(request.url); // Parse the query parameters from the request URL
  // Extract query parameters from URL (example: ?businessUnit=Retail&startDate=2025-11-03)

  const businessUnit = searchParams.get("businessUnit"); // Get the business unit filter from query params
  // Read business unit filter selected in UI dropdown (example: "US Commercial")

  const datasetName = searchParams.get("datasetName"); // Get the dataset name filter from query params
  // Read dataset name for drill-down view (example: "teva_catalog.us_commercial.sales_fact")
  // null when viewing the BU-level trend (not a single dataset)

  const startDate = searchParams.get("startDate"); // Get the start date filter from query params
  // Read start date filter selected in UI dropdown (example: "Last 7 Days"; startDate = 2026-02-15)

  const endDate = searchParams.get("endDate"); // Get the end date filter from query params
  // Read end date filter selected in UI dropdown (example: "Last 7 Days"; endDate = 2026-02-22 (Today))

  // Log the received query parameters for traceability
  console.info(
    `Received request for business unit: ${businessUnit}, dataset name: ${datasetName}, start date: ${startDate}, end date: ${endDate}.`
  );
  // Print received filter inputs so troubleshooting is easier if UI complains about wrong data

  try {
    // Try block: normal successful execution happens here

    // Retrieve the Databricks session to execute the query
    const session = await getDatabricksSession();
    // Create or reuse secure Databricks session (like logging into the database)

    // Generate the dynamic SQL query using the parsed filter parameters
    const query = generateDataRefreshTrendChartQuery(startDate, endDate, businessUnit, datasetName, request);
    // Build SQL query using provided filters — bucket size and SQL template are chosen automatically
    
    // Execute the query to fetch the trend data
    const rows = await executeQuery(
      session,
      query
    );
    // Run the generated SQL against Databricks and store all result rows in the array

    // Log the success event after the query is executed
    await logToEventHub({
      type: "INFO",
      // INFO means query executed successfully
      detailMessage: "Query executed successfully to fetch data refresh status",
      // Success message that monitoring team can use
      programName,
      // Identifies API name in logs
      startDatetime: requestStartTime,
      // Start time used to calculate response duration
      status: "SUCCESS",
      // Mark operation successful
      actionType: "Spark_SQL_Query",
      // Categorize action as Databricks SQL query
      actionDescription: `Fetch data refresh status from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Describe what query did and which table was accessed
      l1Tag: businessUnit,
      // Tag this log event with business unit so Splunk reports can group by BU
      user,
      // Store user who triggered request for audit
    });

    // Return all rows as a JSON array (one element per time bucket)
    return NextResponse.json(rows);
    // Each row is one chart data point — frontend maps this array directly to the LineChart data prop
  } catch (error: any) {
    // Catch block: runs if query fails, session fails, or any system issue occurs

    const errorMessage =
      error?.message ??
      "Unknown error occurred while fetching data refresh status.";
    // Extract readable error message; if missing, provide default message

    console.error(errorMessage);
    // Print error in server logs for debugging

    // Log the error event if the query execution fails
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Store error message (fallback to default if unavailable)
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Helps measure time-to-failure
      status: "FAILED",
      // Mark operation failed
      actionType: "Spark_SQL_Query",
      // Failure happened while running SQL query
      actionDescription: `Fetch data refresh status from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain what failed and which table was involved
      l1Tag: businessUnit,
      // Tag this log event with business unit so Splunk reports can group by BU
      user,
      // Store user context for debugging and audit
    });

    // Return a JSON error response with the appropriate status code
    return NextResponse.json(
      { error: errorMessage },
      // Send error message so UI can show a banner/toast to user
      { status: 500 }
      // HTTP 500 = server/system problem (not a user input issue)
    );
  }
});
