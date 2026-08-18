/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This API route is responsible for retrieving a list of business unit names (L1 level) 
    from the system's schema tags and returning them as a JSON response.
    - The data is fetched by executing a SQL query against the Databricks instance.
    - Successful and error events are logged to EventHub for traceability and monitoring.
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
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table name for storing information about allowed tables and their associated tags
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
  buildRbacDataScopeAndClause,
  dataQualityTagScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY ------------------------------ */

/**
 * SQL query to fetch the distinct business unit names (L1 level) from the system's schema tags.
 * This query selects all unique tag values as `L1_BUSINESS_UNIT` from the schema tags.
 */
const buildBusinessUnitsQuery = (request: NextRequest): string => {
  // Convert the logged-in user's group scopes into SQL for the dataset-tag table.
  // Example: business_unit=Finance becomes "AND st.tag_value IN ('finance')" for this query.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityTagScopeColumns("st")
  );

  // Return the SQL query with RBAC row filtering included.
  return `
  SELECT
    st.tag_value AS L1_BUSINESS_UNIT
    -- Pick schema tag value and rename it as L1_BUSINESS_UNIT (used as business unit name)
  FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
  -- Read from Databricks system schema tags table (like reading category labels stored in system metadata)
  WHERE st.tag_value IS NOT NULL
  -- Filter to remove null value from business unit names
  ${rbacScopeClause}
  -- RBAC data-scope filter: only return business units allowed by the user's assigned groups
  GROUP BY st.tag_value
  -- GROUP BY returns unique business unit names (like removing duplicates in Excel list)
`;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request for fetching a list of business unit names (L1 level) from the system schema tags.
 * The function executes the SQL query and returns the result as a JSON response.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the request parameters and headers.
 * @returns - A JSON response with the business unit names or an error message if the operation fails.
 * 
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of 
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This API runs when the dashboard needs to populate Business Unit dropdown filter options

  const requestStartTime = new Date(); // Record the start time of the API request for logging purposes
  // Save start time (like starting a stopwatch to measure how long API takes)

  const programName = "DQDSummaryViewBusinessUnitNamesAPI"; // Program name for identifying the logs
  // Program name is used in EventHub/Splunk so logs can be easily filtered by API name

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Get the user ID from the request header, default to "Anonymous"
  // Identify the user requesting the data for auditing; if missing, assume Anonymous

  // ------------------- EXECUTE SQL QUERY -------------------
  try {
    // Try block begins: normal successful flow will run here

    console.info("Starting the process to fetch business unit names...");
    // Log message to show API started its main work

    // Get the Databricks session to execute the query
    const session = await getDatabricksSession();
    // Create or reuse secure Databricks connection session (like opening database login session)

    // Execute the SQL query to fetch business unit names
    const businessUnits = await executeQuery(session, buildBusinessUnitsQuery(request));
    // Run SQL query and store results (this becomes dropdown list in UI)

    // ------------------- SUCCESS LOGGING -------------------
    const successMessage =
      "Successfully retrieved L1 business unit names from the schema tags.";
    // Prepare a success message string that will be used in logs and EventHub

    console.info(successMessage);
    // Print the success message in server console for debugging/traceability

    // Log success event to EventHub
    await logToEventHub({
      type: "INFO",
      // INFO means this action completed successfully
      detailMessage: successMessage,
      // Store success message in EventHub logs (used in Splunk dashboards)
      programName,
      // Identify which API generated this log
      startDatetime: requestStartTime,
      // Start time used to calculate duration and monitor performance
      status: "SUCCESS",
      // Mark request as successful
      actionType: "Spark_SQL_Query",
      // Categorize the action: Databricks SQL query execution
      actionDescription: `Fetch L1 Business Unit Names from table: ${DATA_INTEGRITY_DATASET_TAGS_TABLE}`,
      // Clear description of what query was done and from where
      user,
      // Store which user triggered the request (audit logging)
    });

    // Return the business unit names as a JSON response
    return NextResponse.json(businessUnits);
    // Send list of business units back to frontend so dashboard dropdown options can be shown
  } catch (error: any) {
    // ------------------- ERROR HANDLING -------------------
    // Catch block runs if Databricks query fails or connection fails

    const errorMessage =
      error?.message ??
      "An unknown error occurred while fetching business unit names.";
    // Extract readable error message; if missing, provide default message

    console.error(errorMessage);
    // Print error message to server console to help troubleshoot

    // Log error event to EventHub
    await logToEventHub({
      type: "ERROR",
      // ERROR means the request failed
      detailMessage: errorMessage,
      // Store error details in EventHub logs (used by monitoring)
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Track when request started (useful for failure duration calculation)
      status: "FAILED",
      // Mark operation as failed
      actionType: "Spark_SQL_Query",
      // Failure occurred during SQL query execution
      actionDescription: `Failed to fetch L1 Business Unit Names from table: ${DATA_INTEGRITY_DATASET_TAGS_TABLE}`,
      // Describe what failed and where
      user,
      // Store user identity for audit and debugging
    });

    // Return an error response to the client
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means backend/system error; frontend can show error toast/banner
  }
}
);
