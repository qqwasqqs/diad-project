/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This API endpoint is designed to retrieve user privileges from a Databricks SQL database. 
    It serves as a backend service for the frontend application, allowing it to fetch 
    and display user access information based on various query parameters. 
    The API executes specific SQL queries against the Databricks database to gather 
    insights about user permissions and access levels, which are crucial for governance and security monitoring.
  
    Key features:
    - Dynamic Query Execution: The API can execute different SQL queries based on the 'type' parameter provided in the request, allowing for flexible data retrieval.
    - Error Handling: It includes robust error handling to catch and log any issues that arise during query execution, ensuring that failures are properly recorded and can be addressed.
    - Event Logging: The API logs both successful and failed operations to an Azure Event Hub, providing valuable telemetry for monitoring, auditing, and troubleshooting purposes.
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
} from "@/constants/config";
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Builds a SQL query to retrieve a list of unique datasets (catalog.schema.table combinations).
 * This query fetches all distinct table names along with their catalog and schema names
 * from the user privileges view, filtering out null table names.
 *
 * @returns A SQL query string that returns distinct CATALOG_NAME, SCHEMA_NAME, and TABLE_NAME
 */
const buildUniqueDatasetListQuery = (): string => {
  // Function to construct the SQL query for retrieving unique datasets
  return ` 
    -- SELECT DISTINCT: Retrieve only unique combinations of catalog, schema, and table
    -- This eliminates duplicate rows if the same dataset appears multiple times
    SELECT DISTINCT 
      CATALOG_NAME,        -- The logical database container name in Databricks
      SCHEMA_NAME,         -- The schema/database name within the catalog
      TABLE_NAME           -- The individual table/dataset name
    -- FROM clause: Specify the source table containing user privilege information
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.user_privileges_v
    -- WHERE clause: Filter out rows where TABLE_NAME is NULL to ensure data quality
    WHERE TABLE_NAME IS NOT NULL;
  `;
};

/**
 * Builds a SQL query to count total principals and segregate them by read/write access levels.
 * This query aggregates user access information based on privilege types, filtered by
 * the specified catalog, schema, and dataset names.
 *
 * @param catalogName - The catalog name to filter by (use "All" for no filtering)
 * @param schemaName - The schema name to filter by (use "All" for no filtering)
 * @param datasetName - The table/dataset name to filter by (use "All" for no filtering)
 * @returns A SQL query string that returns principal counts grouped by access type
 */
const buildTotalPrincipalsCountQuery = (
  catalogName: string, // Catalog filter parameter
  schemaName: string, // Schema filter parameter
  datasetName: string, // Dataset/table filter parameter
): string => {
  // Function to construct the SQL query for counting principals by access level
  return ` 
    -- COUNT(DISTINCT PRINCIPAL_NAME): Count unique users/roles in the system
    SELECT
      COUNT(DISTINCT PRINCIPAL_NAME) AS total_principals,
      -- Count principals who have READ access privileges (SELECT, EXECUTE, BROWSE)
      COUNT(DISTINCT CASE 
          -- CASE expression: Evaluates privilege type and conditionally counts principals
          WHEN PRIVILEGE IN ('SELECT', 'EXECUTE', 'BROWSE') 
          -- Return PRINCIPAL_NAME if privilege is a READ operation, otherwise NULL
          THEN PRINCIPAL_NAME 
      END) AS principals_with_read_access,
      -- Count principals who have WRITE access privileges (INSERT, UPDATE, DELETE, etc.)
      COUNT(DISTINCT CASE 
          -- CASE expression: Evaluates privilege type for WRITE operations
          WHEN PRIVILEGE IN (
              'INSERT',      -- Insert new records
              'UPDATE',      -- Modify existing records
              'DELETE',      -- Remove records
              'MERGE',       -- Merge/upsert operations
              'TRUNCATE',    -- Truncate entire table
              'MODIFY'       -- General modification privilege
          ) 
          -- Return PRINCIPAL_NAME if privilege is a WRITE operation, otherwise NULL
          THEN PRINCIPAL_NAME 
      END) AS principals_with_write_access
    -- FROM clause: Specify the user privileges view as data source
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.user_privileges_v
    -- WHERE clause: Apply filters based on provided parameters
    WHERE 
      1 = 1  -- Base condition (always true; simplifies adding conditional filters)
      -- Conditionally filter by CATALOG_NAME if catalogName is not "All"
      ${catalogName !== "All" ? `AND CATALOG_NAME = '${catalogName}'` : ""}
      -- Conditionally filter by SCHEMA_NAME if schemaName is not "All"
      ${schemaName !== "All" ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
      -- Conditionally filter by TABLE_NAME if datasetName is not "All"
      ${datasetName !== "All" ? `AND TABLE_NAME = '${datasetName}'` : ""}
  `;
};

/**
 * Builds a SQL query to retrieve detailed access information for principals.
 * This query lists each principal and their associated privileges, filtered by access type
 * (READ or WRITE) and optional catalog/schema/dataset filters.
 *
 * @param catalogName - The catalog name to filter by (use "All" for no filtering)
 * @param schemaName - The schema name to filter by (use "All" for no filtering)
 * @param datasetName - The table/dataset name to filter by (use "All" for no filtering)
 * @param access - The access type: "READ" or "WRITE"
 * @returns A SQL query string that returns principal names with their privileges
 */
const buildPrincipalsAccessDetailsQuery = (
  catalogName: string, // Catalog filter parameter
  schemaName: string, // Schema filter parameter
  datasetName: string, // Dataset/table filter parameter
  access: string, // Access type filter ("READ" or "WRITE")
): string => {
  // Function to construct the SQL query for retrieving principal access details
  return ` 
    -- SELECT: Retrieve principal names and their associated privileges
    SELECT
      PRINCIPAL_NAME,    -- The user/role name with access privileges
      -- string_agg: Concatenate all distinct privileges for each principal into a comma-separated string
      string_agg(DISTINCT PRIVILEGE, ', ') AS privileges
    -- FROM clause: Specify the user privileges view as data source
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.user_privileges_v
    -- WHERE clause: Apply filters based on parameters
    WHERE 
      1 = 1  -- Base condition (always true; simplifies adding conditional filters)
      -- Conditionally filter by CATALOG_NAME if catalogName is not "All"
      ${catalogName !== "All" ? `AND CATALOG_NAME = '${catalogName}'` : ""}
      -- Conditionally filter by SCHEMA_NAME if schemaName is not "All"
      ${schemaName !== "All" ? `AND SCHEMA_NAME = '${schemaName}'` : ""}
      -- Conditionally filter by TABLE_NAME if datasetName is not "All"
      ${datasetName !== "All" ? `AND TABLE_NAME = '${datasetName}'` : ""}
      -- Filter for READ access: Include only SELECT, EXECUTE, BROWSE privileges
      ${access === "READ" ? `AND PRIVILEGE IN ('SELECT', 'EXECUTE', 'BROWSE')` : ""}
      -- Filter for WRITE access: Include only INSERT, UPDATE, DELETE, MERGE, TRUNCATE, MODIFY privileges
      ${access === "WRITE" ? `AND PRIVILEGE IN ('INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'MODIFY')` : ""}
    -- GROUP BY: Aggregate privileges for each principal
    GROUP BY PRINCIPAL_NAME;
  `;
};

/**
 * Builds a SQL query to retrieve user access privileges across all datasets.
 * This query uses a CTE (Common Table Expression) to combine catalog, schema, and table names,
 * then aggregates access counts by principal and privilege type.
 *
 * @returns A SQL query string that returns principals with their dataset access counts
 */
const buildUserAccessPrivilegesQuery = (): string => {
  // Function to construct the SQL query for retrieving user access privileges
  return `
    -- WITH clause: Define a CTE (Common Table Expression) named "base" for reusability
    WITH base AS (
      -- SELECT: Retrieve principal names, full dataset paths, and privileges
      SELECT
        PRINCIPAL_NAME,    -- The user/role name with access
        -- Concatenate catalog, schema, and table names with dots to create full dataset path
        CATALOG_NAME || '.' || SCHEMA_NAME || '.' || TABLE_NAME AS dataset,
        PRIVILEGE          -- The type of privilege granted
      -- FROM clause: Specify the user privileges view as data source
      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.user_privileges_v
      -- WHERE clause: Filter for complete records (no NULL values in key columns)
      WHERE CATALOG_NAME IS NOT NULL      -- Ensure catalog name exists
        AND SCHEMA_NAME IS NOT NULL       -- Ensure schema name exists
        AND TABLE_NAME IS NOT NULL        -- Ensure table name exists
    )
    -- SELECT from CTE: Aggregate access information by principal
    SELECT
      PRINCIPAL_NAME,     -- The user/role name
      -- COUNT(DISTINCT dataset): Count how many unique datasets this principal has access to
      COUNT(DISTINCT dataset) AS total_datasets,
      -- Count unique datasets where principal has READ access (SELECT, EXECUTE, BROWSE)
      COUNT(DISTINCT CASE
        -- CASE expression: Filter for READ privileges
        WHEN PRIVILEGE IN ('SELECT', 'EXECUTE', 'BROWSE')
        -- Return dataset if privilege is READ, otherwise NULL
        THEN dataset
      END) AS datasets_with_read_access,
      -- Count unique datasets where principal has WRITE access (INSERT, UPDATE, DELETE, etc.)
      COUNT(DISTINCT CASE
        -- CASE expression: Filter for WRITE privileges
        WHEN PRIVILEGE IN (
          'INSERT',      -- Insert new records
          'UPDATE',      -- Modify existing records
          'DELETE',      -- Remove records
          'MERGE',       -- Merge/upsert operations
          'TRUNCATE',    -- Truncate entire table
          'MODIFY'       -- General modification privilege
        )
        -- Return dataset if privilege is WRITE, otherwise NULL
        THEN dataset
      END) AS datasets_with_write_access
    -- FROM clause: Query the base CTE
    FROM base
    -- GROUP BY: Aggregate counts for each distinct principal
    GROUP BY PRINCIPAL_NAME;
  `;
};

/**
 * Builds a SQL query to retrieve detailed access information for a specific principal.
 * This query lists all datasets accessible to the principal, filtered by access type
 * (READ or WRITE), along with their associated privileges.
 *
 * @param principalName - The name of the principal/user to filter by
 * @param access - The access type: "READ" or "WRITE"
 * @returns A SQL query string that returns datasets and privileges for the principal
 */
const buildUserAccessPrivilegesDetailsQuery = (
  principalName: string, // The principal/user name to filter by
  access: string, // Access type filter ("READ" or "WRITE")
): string => {
  // Function to construct the SQL query for retrieving detailed access for a specific principal
  return ` 
    -- SELECT: Retrieve full dataset names and their associated privileges
    SELECT 
      -- Concatenate catalog, schema, and table names with dots to create full dataset path
      CATALOG_NAME || '.' || SCHEMA_NAME || '.' || TABLE_NAME AS name,
      -- string_agg: Concatenate all distinct privileges into a comma-separated string
      string_agg(DISTINCT PRIVILEGE, ', ') AS privileges
    -- FROM clause: Specify the user privileges view as data source
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.user_privileges_v
    -- WHERE clause: Apply filters for data quality and parameter matching
    WHERE CATALOG_NAME IS NOT NULL       -- Ensure catalog name exists
      AND SCHEMA_NAME IS NOT NULL        -- Ensure schema name exists
      AND TABLE_NAME IS NOT NULL         -- Ensure table name exists
      -- Filter by the specified principal name
      AND PRINCIPAL_NAME = '${principalName}'
      -- Filter for READ access: Include only SELECT, EXECUTE, BROWSE privileges
      ${access === "READ" ? `AND PRIVILEGE IN ('SELECT', 'EXECUTE', 'BROWSE')` : ""}
      -- Filter for WRITE access: Include only INSERT, UPDATE, DELETE, MERGE, TRUNCATE, MODIFY privileges
      ${access === "WRITE" ? `AND PRIVILEGE IN ('INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'MODIFY')` : ""}
    -- GROUP BY: Aggregate privileges for each unique dataset combination
    GROUP BY CATALOG_NAME, SCHEMA_NAME, TABLE_NAME;
  `;
};

/**
 * Builds a SQL query to retrieve user dataset access within a specified date range.
 * This query uses executed query history to determine which datasets were accessed by which users.
 * It aggregates access counts by user and access type (READ or WRITE).
 *
 * @param startDate - The start date for the query history range (format: 'YYYY-MM-DD')
 * @param endDate - The end date for the query history range (format: 'YYYY-MM-DD')
 * @returns A SQL query string that returns user access aggregation by date range
 */
const buildUserWiseDatasetAccessQuery = (
  startDate: string, // Start date for filtering executed queries
  endDate: string, // End date for filtering executed queries
): string => {
  // Function to construct the SQL query for user-wise dataset access within a date range
  return `
    -- WITH clause: Define a CTE (Common Table Expression) named "base" for reusability
    WITH base AS (
      -- SELECT: Retrieve executed user, full dataset paths, and statement types
      SELECT
        EXECUTED_BY,      -- The user who executed the query
        -- Concatenate catalog, schema, and dataset names with dots to create full dataset path
        CATALOG_NAME || '.' || SCHEMA_NAME || '.' || DATASET_NAME AS dataset,
        STATEMENT_TYPE    -- The type of SQL statement executed (SELECT, INSERT, UPDATE, etc.)
      -- FROM clause: Specify the executed query history table as data source
      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.executed_query_history_mng
      -- WHERE clause: Filter for complete records within the specified date range
      WHERE CATALOG_NAME IS NOT NULL       -- Ensure catalog name exists
        AND SCHEMA_NAME IS NOT NULL        -- Ensure schema name exists
        AND DATASET_NAME IS NOT NULL       -- Ensure dataset name exists
        -- Filter by date range: Include only queries executed between startDate and endDate
        AND EXECUTED_ON BETWEEN '${startDate}' AND '${endDate}'
    )
    -- SELECT from CTE: Aggregate access information by user
    SELECT
      EXECUTED_BY,        -- The user who executed queries
      -- COUNT(DISTINCT dataset): Count how many unique datasets this user accessed
      COUNT(DISTINCT dataset) AS total_datasets,
      -- Count unique datasets where user executed READ operations (SELECT, EXECUTE, BROWSE)
      COUNT(DISTINCT CASE
        -- CASE expression: Filter for READ statement types
        WHEN STATEMENT_TYPE IN ('SELECT', 'EXECUTE', 'BROWSE')
        -- Return dataset if operation is READ, otherwise NULL
        THEN dataset
      END) AS datasets_with_read_access,
      -- Count unique datasets where user executed WRITE operations (INSERT, UPDATE, DELETE, etc.)
      COUNT(DISTINCT CASE
        -- CASE expression: Filter for WRITE statement types
        WHEN STATEMENT_TYPE IN (
          'INSERT',      -- Insert new records
          'UPDATE',      -- Modify existing records
          'DELETE',      -- Remove records
          'MERGE',       -- Merge/upsert operations
          'TRUNCATE',    -- Truncate entire table
          'MODIFY'       -- General modification operation
        )
        -- Return dataset if operation is WRITE, otherwise NULL
        THEN dataset
      END) AS datasets_with_write_access
    -- FROM clause: Query the base CTE
    FROM base
    -- GROUP BY: Aggregate counts for each distinct user
    GROUP BY EXECUTED_BY;
  `;
};

/**
 * Builds a SQL query to retrieve detailed dataset access for a specific principal within a date range.
 * This query lists all datasets accessed by the principal during the specified period,
 * filtered by operation type (READ or WRITE), along with associated statement types.
 *
 * @param principalName - The name of the principal/user to filter by
 * @param access - The access type: "READ" or "WRITE"
 * @param startDate - The start date for the query history range (format: 'YYYY-MM-DD')
 * @param endDate - The end date for the query history range (format: 'YYYY-MM-DD')
 * @returns A SQL query string that returns datasets and statement types for the principal
 */
const buildUserWiseDatasetAccessDetailsQuery = (
  principalName: string, // The principal/user name to filter by
  access: string, // Access type filter ("READ" or "WRITE")
  startDate: string, // Start date for filtering executed queries
  endDate: string, // End date for filtering executed queries
): string => {
  // Function to construct the SQL query for detailed user-wise dataset access within a date range
  return ` 
    -- SELECT: Retrieve full dataset names and their associated operation types
    SELECT 
      -- Concatenate catalog, schema, and dataset names with dots to create full dataset path
      CATALOG_NAME || '.' || SCHEMA_NAME || '.' || DATASET_NAME AS name,
      -- string_agg: Concatenate all distinct statement types into a comma-separated string
      string_agg(DISTINCT STATEMENT_TYPE, ', ') AS privileges
    -- FROM clause: Specify the executed query history table as data source
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.executed_query_history_mng
    -- WHERE clause: Apply filters for data quality, principal, date range, and access type
    WHERE CATALOG_NAME IS NOT NULL       -- Ensure catalog name exists
      AND SCHEMA_NAME IS NOT NULL        -- Ensure schema name exists
      AND DATASET_NAME IS NOT NULL       -- Ensure dataset name exists
      -- Filter by date range: Include only queries executed between startDate and endDate
      AND EXECUTED_ON BETWEEN '${startDate}' AND '${endDate}'
      -- Filter by the specified principal name (user who executed the query)
      AND EXECUTED_BY = '${principalName}'
      -- Filter for READ access: Include only SELECT, EXECUTE, BROWSE statements
      ${access === "READ" ? `AND STATEMENT_TYPE IN ('SELECT', 'EXECUTE', 'BROWSE')` : ""}
      -- Filter for WRITE access: Include only INSERT, UPDATE, DELETE, MERGE, TRUNCATE, MODIFY statements
      ${access === "WRITE" ? `AND STATEMENT_TYPE IN ('INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'MODIFY')` : ""}
    -- GROUP BY: Aggregate statement types for each unique dataset combination
    GROUP BY CATALOG_NAME, SCHEMA_NAME, DATASET_NAME;
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles GET requests to retrieve governance user privileges data from Databricks.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing headers and query parameters
 * @returns Promise<NextResponse> - JSON response with user privileges data or error message
 *
 * @remarks
 * This API endpoint supports multiple query types via the 'type' query parameter:
 * - 'totalPrincipalsCount': Returns total count of principals with optional catalog, schema, and dataset filters
 * - 'principalsAccessDetails': Returns detailed access information for principals (requires 'access' parameter)
 * - 'uniqueDatasetList': Returns list of unique datasets
 * - 'userAccessPrivileges': Returns user access privilege summary
 * - 'userAccessPrivilegesDetails': Returns detailed privileges for a specific principal and access type
 * - 'userWiseDatasetAccess': Returns dataset access grouped by user within a date range
 * - 'userWiseDatasetAccessDetails': Returns detailed access for a specific principal and dataset within a date range
 *
 * @throws Will return 400 Bad Request if required query parameters are missing
 * @throws Will return 500 Internal Server Error if query execution fails
 *
 * @example
 * // Get total principals count
 * GET /api/governance/user-privileges?type=totalPrincipalsCount&catalogName=prod&schemaName=marketing
 *
 * @example
 * // Get user access privilege details
 * GET /api/governance/user-privileges?type=userAccessPrivilegesDetails&principalName=john.doe&access=SELECT
 *
 * @headers
 * x-user-id - Optional user identifier for auditing purposes. Defaults to "Anonymous" if not provided.
 *
 * @queryParams
 * type - Required. Specifies which data retrieval operation to perform
 * catalogName - Optional. Filters results by Databricks catalog name (default: "All")
 * schemaName - Optional. Filters results by schema name (default: "All")
 * datasetName - Optional. Filters results by dataset name (default: "All")
 * access - Required for certain query types. Specifies the access level to filter
 * principalName - Required for user details queries. Name of the principal/user to retrieve details for
 * startDate - Required for date-range queries. Start date for filtering access records
 * endDate - Required for date-range queries. End date for filtering access records
 *
 * @logs
 * All operations are logged to Event Hub with detailed information including:
 * - Request start time for performance monitoring
 * - User identifier for audit trail
 * - Query type and execution status
 * - Error messages and stack traces for failed operations
 *
 * @returns - A JSON response containing the query result or error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs whenever frontend calls this endpoint using HTTP GET

  const requestStartTime = new Date(); // Record the start time for logging purposes.
  // Store start time (like starting a stopwatch) so execution duration can be measured

  const programName = "GovernanceUserPrivilegesAPI"; // Program name for logging context.
  // Name of this API used to identify it in monitoring systems (Splunk/Event Hub)

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID from request headers for auditing.
  // Identify who triggered the request; if missing, treat user as Anonymous

  const { searchParams } = new URL(request.url);
  // Parse the request URL so we can read query parameters (example: ?type=userPrivileges)

  const type = searchParams.get("type");
  // Extract the primary type parameter to decide which query to execute

  // Validate that the required 'type' parameter is present; if not, return a 400 Bad Request response with an error message.
  if (!type) {
    // If 'type' parameter is missing, log the error and return a 400 response indicating the client made a bad request
    const errorMessage = "Missing required query parameter: type";
    // Log the error message to server logs for debugging purposes
    console.error(errorMessage);
    // 400 Bad Request indicates that the client did not provide necessary information or provided invalid data
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    // Try block: normal successful execution happens here; failures go to catch block

    console.info(`Starting query execution for type: ${type}`);
    // Print log to indicate query execution begins

    const session = await getDatabricksSession();
    // Open or reuse a secure Databricks session (like opening a connection to the database)

    let query = "";
    // Variable to hold dynamically selected query

    /* ------------------------- QUERY ROUTING LOGIC ------------------------- */

    // Switch statement: Route to the appropriate query builder based on the 'type' parameter
    switch (type) {
      // Case 1: Handle request for total principals count with optional filtering
      case "totalPrincipalsCount": {
        // Extract catalog name from query parameters, default to "All" if not provided
        const catalogName = searchParams.get("catalogName") ?? "All";
        // Extract schema name from query parameters, default to "All" if not provided
        const schemaName = searchParams.get("schemaName") ?? "All";
        // Extract dataset name from query parameters, default to "All" if not provided
        const datasetName = searchParams.get("datasetName") ?? "All";

        // Build and assign the SQL query for counting principals with filters
        query = buildTotalPrincipalsCountQuery(
          catalogName, // Pass catalog filter to query builder
          schemaName, // Pass schema filter to query builder
          datasetName, // Pass dataset filter to query builder
        );
        // Exit this case and proceed to query execution
        break;
      }

      // Case 2: Handle request for detailed access information of principals
      case "principalsAccessDetails": {
        // Extract catalog name from query parameters, default to "All" if not provided
        const catalogName = searchParams.get("catalogName") ?? "All";
        // Extract schema name from query parameters, default to "All" if not provided
        const schemaName = searchParams.get("schemaName") ?? "All";
        // Extract dataset name from query parameters, default to "All" if not provided
        const datasetName = searchParams.get("datasetName") ?? "All";
        // Extract access type (READ or WRITE) from query parameters
        const access = searchParams.get("access");

        // Check if required 'access' parameter is missing
        if (!access) {
          // Return 400 Bad Request error if access parameter not provided
          return NextResponse.json(
            { error: "Missing required query parameter: access" },
            { status: 400 },
          );
        }

        // Build and assign the SQL query for principal access details with filters
        query = buildPrincipalsAccessDetailsQuery(
          catalogName, // Pass catalog filter to query builder
          schemaName, // Pass schema filter to query builder
          datasetName, // Pass dataset filter to query builder
          access, // Pass access type filter to query builder (READ or WRITE
        );
        // Exit this case and proceed to query execution
        break;
      }

      // Case 3: Handle request for list of unique datasets
      case "uniqueDatasetList": {
        // Build and assign the SQL query to retrieve unique dataset list
        query = buildUniqueDatasetListQuery();
        // Exit this case and proceed to query execution
        break;
      }

      // Case 4: Handle request for user access privileges summary
      case "userAccessPrivileges": {
        // Build and assign the SQL query for user access privileges aggregation
        query = buildUserAccessPrivilegesQuery();
        // Exit this case and proceed to query execution
        break;
      }

      // Case 5: Handle request for detailed access privileges of a specific principal
      case "userAccessPrivilegesDetails": {
        // Extract principal/user name from query parameters
        const principalName = searchParams.get("principalName");
        // Extract access type (READ or WRITE) from query parameters
        const access = searchParams.get("access");

        // Check if either required parameter is missing
        if (!principalName || !access) {
          // Return 400 Bad Request error if required parameters not provided
          return NextResponse.json(
            {
              error:
                "Missing required query parameter: principalName and access",
            },
            { status: 400 },
          );
        }

        // Build and assign the SQL query for specific principal access details
        query = buildUserAccessPrivilegesDetailsQuery(principalName, access);
        // Exit this case and proceed to query execution
        break;
      }

      // Case 6: Handle request for user-wise dataset access within a date range
      case "userWiseDatasetAccess": {
        // Extract start date from query parameters for filtering query history
        const startDate = searchParams.get("startDate");
        // Extract end date from query parameters for filtering query history
        const endDate = searchParams.get("endDate");

        // Check if either required date parameter is missing
        if (!startDate || !endDate) {
          // Return 400 Bad Request error if date parameters not provided
          return NextResponse.json(
            {
              error: "Missing required query parameters: startDate and endDate",
            },
            { status: 400 },
          );
        }

        // Build and assign the SQL query for user dataset access within date range
        query = buildUserWiseDatasetAccessQuery(startDate, endDate);
        // Exit this case and proceed to query execution
        break;
      }

      // Case 7: Handle request for detailed dataset access of a specific principal within date range
      case "userWiseDatasetAccessDetails": {
        // Extract start date from query parameters for filtering query history
        const startDate = searchParams.get("startDate");
        // Extract end date from query parameters for filtering query history
        const endDate = searchParams.get("endDate");
        // Extract principal/user name from query parameters
        const principalName = searchParams.get("principalName");
        // Extract access type (READ or WRITE) from query parameters
        const access = searchParams.get("access");

        // Check if any required parameter is missing
        if (!principalName || !access || !startDate || !endDate) {
          // Return 400 Bad Request error if any required parameter not provided
          return NextResponse.json(
            {
              error:
                "Missing required query parameters: principalName, access, startDate and endDate",
            },
            { status: 400 },
          );
        }

        // Build and assign the SQL query for specific principal dataset access details within date range
        query = buildUserWiseDatasetAccessDetailsQuery(
          principalName, // Pass principal name filter to query builder
          access, // Pass access type filter to query builder (READ or WRITE)
          startDate, // Pass start date filter to query builder
          endDate, // Pass end date filter to query builder
        );
        // Exit this case and proceed to query execution
        break;
      }

      // Default case: Handle invalid or unrecognized query type
      default:
        // Return 400 Bad Request error if query type doesn't match any valid case
        return NextResponse.json(
          { error: `Invalid query type: ${type}` },
          { status: 400 },
        );
    }

    /* ------------------------- EXECUTE QUERY ------------------------- */

    const rows = await executeQuery(session, query);
    // Run the SQL query and store returned results

    // Log the success of the operation to Event Hub.
    await logToEventHub({
      // Send a structured success event to Event Hub for monitoring/audit
      type: "INFO",
      // INFO indicates successful action
      detailMessage: `Successfully executed query of user privileges type: ${type} for user principal: ${user}`,
      // Success message for monitoring/logging tools
      programName,
      // Identifies which API logged this event
      startDatetime: requestStartTime,
      // Used to calculate total time taken
      status: "SUCCESS",
      // Mark operation result as success
      actionType: "Spark_SQL_Query",
      // Indicates it was a SQL query operation
      actionDescription: `Executed query type: ${type} from tables: user_privileges_v, executed_query_history_mng`,
      // Explain what business action was done
      user,
      // Include who triggered request
    });

    // Return the retrieved rows as a JSON response.
    return NextResponse.json(rows);
    // Send data back to frontend
  } catch (error: any) {
    // Catch block: runs if something fails

    // Log the error to Event Hub in case of a failure.
    const errorMessage = `Error executing query for user principal: ${user}, query type: ${type}, error: ${
      error?.message ?? "Unknown error during query execution"
    }`;
    // Extract readable error message; fallback to default message

    console.error(errorMessage, error.stack); // Log the full error for debugging.
    // Print full error details including stack trace to server logs

    await logToEventHub({
      // Send structured error log to Event Hub for alerting/troubleshooting
      type: "ERROR",
      // ERROR indicates serious failure
      detailMessage: errorMessage,
      // Store failure reason
      programName,
      // Identify which API failed
      startDatetime: requestStartTime,
      // Helps calculate how long it ran before failing
      status: "FAILED",
      // Mark operation as failed
      actionType: "Spark_SQL_Query",
      actionDescription: `Failed query execution from tables: user_privileges_v, executed_query_history_mng`,
      user,
      // Record who triggered failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 means server-side error (system issue, not user mistake)
  }
});
