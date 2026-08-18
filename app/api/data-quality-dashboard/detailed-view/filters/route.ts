/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:
    This script provides an API route to fetch filter options (catalog name, schema name, and dataset name) for the Data Quality Dashboard.
    - The route executes a SQL query to retrieve distinct values for `CATALOG_NAME`, `SCHEMA_NAME`, and `DATASET_NAME` from the data integrity execution results.
    - It logs both successful and failed operations to Event Hub for traceability.
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

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeWhereClause,
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY ----------------------------- */

/**
 * SQL query to retrieve distinct filter values for catalog name, schema name, and dataset name.
 * These filters are used to provide options for the Data Quality Dashboard.
 *
 * @returns A SQL query string.
 */
const buildFilterQuery = (request: NextRequest): string => {
  // Build a WHERE clause from the logged-in user's RBAC group scopes.
  // Example: dataset=customer_master limits dropdown values to that dataset only.
  const rbacScopeWhereClause = buildRbacDataScopeWhereClause(
    request,
    dataQualityScopeColumns()
  );

  // Return the SQL query with scope-level row control applied.
  return `
    SELECT DISTINCT
      CATALOG_NAME,
      -- Catalog name = top-level database container (like a main folder)
      SCHEMA_NAME,
      -- Schema name = group of tables inside catalog (like a sub-folder)
      DATASET_NAME
      -- Dataset name = actual table/report name (like a file name)
    FROM
      ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}
      -- This table contains execution results; we use it as the source for available filter values
    ${rbacScopeWhereClause}
    -- RBAC data-scope filter: only expose filter options from rows this user may view
`;
};
// End SQL query string (FILTER_QUERY)

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for fetching filter options for the Data Quality Dashboard.
 * This function retrieves distinct values for `CATALOG_NAME`, `SCHEMA_NAME`, and `DATASET_NAME` to populate filter options.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and the query parameters.
 * @returns A JSON response with the filter data or an error message.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API function is called when the dashboard needs filter dropdown values

  const requestStartTime = new Date(); // Track start time for logging purposes
  // Save start time (like a stopwatch start) so we can measure request duration

  const programName = "DQDDetailedViewFiltersAPI"; // Program name for event logging
  // Name used in logs/monitoring so we know this event came from this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Retrieve user ID from headers or default to "Anonymous"
  // Identify which user opened this dashboard page (for audit); fallback to Anonymous if missing

  try {
    // Start the Databricks session
    const session = await getDatabricksSession();
    // Create or reuse secure Databricks database connection (like signing in to the database)

    // Execute the SQL query to get filter data
    const filterData = await executeQuery(session, buildFilterQuery(request));
    // Run SQL query and collect results (these results become dropdown options in UI)

    // Log the success of the operation
    await logToEventHub({
      type: "INFO",
      // INFO indicates request succeeded normally
      detailMessage:
        "Successfully retrieved filter options for the Data Quality Dashboard.",
      // Easy-to-understand success message for monitoring
      programName,
      // API name to identify log source
      startDatetime: requestStartTime,
      // Used to calculate request duration
      status: "SUCCESS",
      // Mark operation as SUCCESS
      actionType: "Spark_SQL_Query",
      // Indicates a Databricks SQL query was executed
      actionDescription: `Fetch filter options for Data Quality Dashboard Detailed View from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Business description: what data was fetched and from where
      user,
      // User who triggered this API request
    });

    // Return the filter data as a JSON response
    return NextResponse.json(filterData);
    // Send filter values back to frontend so dropdown filters can be populated
  } catch (error: any) {
    // Log the error in case of failure
    const errorMessage = `Error retrieving filter options: ${
      error?.message ?? "Unknown error"
    }`;
    // Extract readable error message; fallback to default if missing

    console.error(
      `[ERROR] [${requestStartTime.toISOString()}] Error retrieving filter options: ${errorMessage}`
    );
    // Print detailed error message with timestamp for troubleshooting

    // Log the failure event
    await logToEventHub({
      type: "ERROR",
      // ERROR indicates request failed
      detailMessage: errorMessage,
      // Store failure reason for analysis in Splunk
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Helps track how long it ran before failing
      status: "FAILED",
      // Mark status as FAILED
      actionType: "Spark_SQL_Query",
      // Failure happened during SQL query execution
      actionDescription: `Failed to fetch filter options for Data Quality Dashboard Detailed View from table: ${DATA_INTEGRITY_EXECUTION_RESULTS_TABLE}`,
      // Explain which operation failed and which table was involved
      user,
      // Capture user context for audit and debugging
    });

    // Return a 500 Internal Server Error with the error message
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 indicates backend system issue; frontend can show error toast/banner
  }
});
