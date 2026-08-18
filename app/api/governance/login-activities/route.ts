/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This API endpoint retrieves login activity data from Databricks SQL.
    - It connects to Databricks SQL to execute queries against the system.access.audit and system.access.workspaces_latest tables.
    - The API supports multiple query types (summary, user, workspace) to retrieve different views of login activity.
    - It includes robust error handling and logs all operations (success and failure) to Azure Event Hub for monitoring and audit purposes.
    - The API is designed to be consumed by a frontend application that displays governance-related login activity insights.
    - The script uses Next.js Route Handlers to define an HTTP GET endpoint, making it easy to integrate into a modern web application architecture.
    - Overall, this API serves as a critical component of the Teva Data Integrity initiative by providing visibility into user access patterns and supporting governance efforts.
    - The API is built with scalability and maintainability in mind, allowing for easy extension to support additional query types or data sources in the future as governance needs evolve.
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
import { logToEventHub } from "@/lib/azure/eventHubLogger";
import { withAuthorization } from "@/lib/rbac/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Centralized Event Hub logger for API observability

/* ----------------------------- SQL QUERY BUILDER ----------------------------- */

/**
 * Generates a SQL query to retrieve a summary of unique users, and workspaces.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildSummaryQuery = (startDate: string, endDate: string): string => {
  // Function takes two string parameters (startDate and endDate) and returns a SQL query string
  return `
    -- Fetch summary of unique users, and workspaces
    -- This query counts distinct users and workspaces between startDate and endDate
    SELECT
      -- Count the number of unique/distinct users based on their email addresses
      COUNT(DISTINCT adt.user_identity.email) AS unique_users,
      -- Count the number of unique/distinct workspace names
      COUNT(DISTINCT wl.workspace_name) AS unique_workspaces
    FROM system.access.audit adt
    -- Query the audit table which contains login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}';
      -- Filter events to only include those within the specified date range
  `;
};

/**
 * Generates a SQL query to retrieve login activity summary by workspace.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildWorkspaceQuery = (startDate: string, endDate: string): string => {
  // Function takes two string parameters (startDate and endDate) and returns a SQL query string
  return `
    -- Fetch login activity summary by workspace
    -- This query groups login activities by workspace and counts unique users
    SELECT
      -- Select the workspace ID from the audit table
      adt.workspace_id,
      -- Select the workspace name from the workspaces table and alias it as workspace_name
      wl.workspace_name AS workspace_name,
      -- Count unique users per workspace (based on email)
      COUNT(DISTINCT adt.user_identity.email) AS unique_users,
      -- Count total number of login activities per workspace
      COUNT(adt.user_identity.email) AS total_login_activities
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
    GROUP BY adt.workspace_id, wl.workspace_name;
    -- Group results by workspace_id and workspace_name so COUNT functions apply per workspace
  `;
};

/**
 * Generates a SQL query to retrieve unique users in a specific workspace.
 * @param uniqueId - The workspace name to filter by.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildWorkspaceUserDetailsQuery = (
  // Function parameter: uniqueId is the workspace name to filter by
  uniqueId: string,
  // Function parameter: startDate is the beginning of the date range (string format)
  startDate: string,
  // Function parameter: endDate is the end of the date range (string format)
  endDate: string,
): string => {
  // Function returns a SQL query string
  return `
    -- Fetch all unique users who logged in to a specific workspace
    -- This query retrieves distinct user emails for a given workspace within a date range
    SELECT
      -- Select the distinct/unique user email address and alias it as name
      DISTINCT adt.user_identity.email AS name
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
      AND wl.workspace_name = '${uniqueId}';
      -- Filter to only include events from the specified workspace (using uniqueId as workspace name)
  `;
};

/**
 * Generates a SQL query to retrieve login details for users in a specific workspace.
 * @param uniqueId - The workspace name to filter by.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildWorkspaceLoginDetailsQuery = (
  // Function parameter: uniqueId is the workspace name to filter by
  uniqueId: string,
  // Function parameter: startDate is the beginning of the date range (string format)
  startDate: string,
  // Function parameter: endDate is the end of the date range (string format)
  endDate: string,
): string => {
  // Function returns a SQL query string
  return `
    -- Fetch detailed login activity for all users in a specific workspace
    -- This query shows user, service, action, and timestamp for each login event
    SELECT
      -- Select the user email address and alias it as name
      adt.user_identity.email AS name,
      -- Select the service name (e.g., workspace, SQL, etc.)
      adt.service_name,
      -- Select the action name (e.g., login, logout, read, write, etc.)
      adt.action_name,
      -- Select the timestamp when the login event occurred
      adt.event_time
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
      AND wl.workspace_name = '${uniqueId}';
      -- Filter to only include events from the specified workspace (using uniqueId as workspace name)
  `;
};

/**
 * Generates a SQL query to retrieve login activity summary by user.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildUserQuery = (startDate: string, endDate: string): string => {
  // Function takes two string parameters (startDate and endDate) and returns a SQL query string
  return `
    -- Fetch login activity summary by user
    -- This query counts unique workspaces and total logins for each user
    SELECT
      -- Select the user email address and alias it as user_name
      adt.user_identity.email AS user_name,
      -- Count the number of unique/distinct workspaces each user logged into
      COUNT(DISTINCT wl.workspace_name) AS unique_workspaces,
      -- Count the total number of login activities per user across all workspaces
      COUNT(wl.workspace_name) AS total_login_activities
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
    GROUP BY adt.user_identity.email;
    -- Group results by user email so COUNT functions apply per user
  `;
};

/**
 * Generates a SQL query to retrieve unique workspaces accessed by a specific user.
 * @param uniqueId - The user email to filter by.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildUserWorkspaceDetailsQuery = (
  // Function parameter: uniqueId is the user email to filter by
  uniqueId: string,
  // Function parameter: startDate is the beginning of the date range (string format)
  startDate: string,
  // Function parameter: endDate is the end of the date range (string format)
  endDate: string,
): string => {
  // Function returns a SQL query string
  return `
    -- Fetch all unique workspaces accessed by a specific user
    -- This query retrieves distinct workspace names for a given user within a date range
    SELECT
      -- Select the distinct/unique workspace name and alias it as name
      DISTINCT wl.workspace_name AS name
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
      AND adt.user_identity.email = '${uniqueId}'
      -- Filter to only include events from the specified user (using uniqueId as user email)
  `;
};

/**
 * Generates a SQL query to retrieve login details for a specific user.
 * @param uniqueId - The user email to filter by.
 * @param startDate - The start date for the query.
 * @param endDate - The end date for the query.
 * @returns The SQL query string.
 */
const buildUserLoginDetailsQuery = (
  // Function parameter: uniqueId is the user email to filter by
  uniqueId: string,
  // Function parameter: startDate is the beginning of the date range (string format)
  startDate: string,
  // Function parameter: endDate is the end of the date range (string format)
  endDate: string,
): string => {
  // Function returns a SQL query string
  return `
    -- Fetch detailed login activity for a specific user across all workspaces
    -- This query shows workspace, service, action, and timestamp for each login event by the user
    SELECT
      -- Select the workspace name and alias it as name
      wl.workspace_name AS name,
      -- Select the service name (e.g., workspace, SQL, etc.)
      adt.service_name,
      -- Select the action name (e.g., login, logout, read, write, etc.)
      adt.action_name,
      -- Select the timestamp when the login event occurred
      adt.event_time
    FROM system.access.audit adt
    -- Query the audit table which contains all login/access events
    JOIN system.access.workspaces_latest wl ON (wl.workspace_id = adt.workspace_id)
    -- Join with workspaces table to get workspace names using workspace_id as the join key
    WHERE adt.action_name IN (  -- Filter for specific actions related to authentication or login activities
        'aadBrowserLogin',  -- Action related to user logs in via Microsoft Entra ID (browser SSO)
        'accountLoginCodeAuthentication'  -- Action related to login via one-time login code flow
      )
      AND adt.user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      AND wl.workspace_name IS NOT NULL
      -- Filter to exclude null workspace names (invalid/incomplete records)
      AND adt.event_time BETWEEN '${startDate}' AND '${endDate}'
      -- Filter events to only include those within the specified date range
      AND adt.user_identity.email = '${uniqueId}'
      -- Filter to only include events from the specified user (using uniqueId as user email)
  `;
};

/**
 * Generates SQL query to fetch users who have NOT logged in for the last 3 months.
 * @returns SQL query string
 */
export const buildInactiveUsersQuery = (): string => {
  // Function takes no parameters and returns a SQL query string
  return `
    -- Query to fetch users who have not logged in for the last 3 months
    -- This query identifies inactive users based on their last login timestamp

    WITH logins_in_range AS (
      -- Create a temporary named result set (CTE) called logins_in_range
      -- Fetch the most recent login for each user
      SELECT
        -- Select the user email address and alias it as user_email
        user_identity.email AS user_email,
        -- Select the maximum (most recent) event_time for each user and alias as last_login_time
        MAX(event_time) AS last_login_time
      FROM system.access.audit
      -- Query the audit table which contains all login/access events
      WHERE user_identity.email IS NOT NULL
      -- Filter to exclude null email addresses (invalid/incomplete records)
      GROUP BY user_identity.email
      -- Group events by user email so MAX() returns the most recent login per user
    )

    -- Select all users who have not logged in during the last 3 months
    -- This is the main query that uses the logins_in_range CTE defined above
    SELECT
      -- Select the user email address from the CTE
      user_email,
      -- Select the timestamp of the user's last login from the CTE
      last_login_time
    FROM logins_in_range
    -- Query the temporary result set (CTE) created above
    WHERE last_login_time IS NULL
      -- Condition 1: Include users who have never logged in (last_login_time is null)
         OR last_login_time < CURRENT_DATE - INTERVAL 3 MONTH
         -- Condition 2: Include users whose last login was more than 3 months ago
    ORDER BY last_login_time ASC;
    -- Sort results by last_login_time in ascending order (null values first, then oldest dates)
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the GET request to retrieve login activity data.
 *
 * This API endpoint fetches login activity details for a user (identified by email) within a specific date range.
 * It logs the success or failure of the query execution to Event Hub.
 *
 * @param request - The incoming HTTPS(NextRequest object) containing headers and query parameters such as email, startDate, and endDate.
 * @returns A JSON response with the login activity data or an error message.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  // This function runs automatically whenever the frontend calls this API endpoint using HTTP GET

  // Record the start time of the request for logging.
  const requestStartTime = new Date();
  // Save current time so we can calculate how long the request took (like starting a stopwatch)

  const programName = "GovernanceLoginActivitiesAPI"; // Program name for logging context.
  // A label/name used in logs to identify which API is generating this log record

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // User ID from request headers for auditing.
  // Read user ID from request header; if missing, treat it as Anonymous (useful for audit tracking)

  // Extract query parameters from the request URL.
  const { searchParams } = new URL(request.url);
  // Parse the incoming request URL so we can read parameters like ?email=...&startDate=...&endDate=...

  const type = searchParams.get("type");
  // Extract the primary type parameter to decide which query to execute

  // Validate required query parameters.
  if (!type) {
    // If any required parameter is missing, we cannot run the report/query correctly

    const errorMessage = "Missing required query parameters: type";
    // Prepare a readable error message explaining what is missing

    console.error(errorMessage); // Log the error for debugging purposes.
    // Print error to server logs so developers/support can quickly diagnose the problem

    // Return a 400 Bad Request response if any required parameter is missing.
    return NextResponse.json({ error: errorMessage }, { status: 400 });
    // Return a friendly JSON error message; HTTP status 400 means "request was invalid"
  }

  try {
    // Try block: runs normal flow; if error occurs, it goes to the catch block

    // Log the start of the process to Event Hub.
    console.info(`Starting to fetch login activity for type: ${type}`);
    // Print a message showing what report is being generated (which user + what date range)

    // Fetch a valid Databricks session.
    const session = await getDatabricksSession();
    // Open (or reuse) a secure connection/session to Databricks database

    let query: string;

    // Use switch statement to decide the query based on 'type'
    switch (type) {
      // Start of switch statement that routes to different query builders based on the 'type' parameter

      case "summary": {
        // Case 1: User requested a summary report of unique users and workspaces
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string

        if (!startDate || !endDate) {
          // Validate that both startDate and endDate are provided; if missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error: "Missing required query parameters: startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for summary case

        query = buildSummaryQuery(startDate, endDate);
        // Build and assign SQL query for summary report using provided dates
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "user": {
        // Case 2: User requested login activity summary grouped by individual users
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string

        if (!startDate || !endDate) {
          // Validate that both startDate and endDate are provided; if missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error: "Missing required query parameters: startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for user case

        query = buildUserQuery(startDate, endDate);
        // Build and assign SQL query for user activity summary using provided dates
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "userWorkspaceDetails": {
        // Case 3: User requested list of workspaces accessed by a specific user
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string
        const uniqueId = searchParams.get("uniqueId");
        // Extract the "uniqueId" (user email) to filter by specific user

        if (!uniqueId || !startDate || !endDate) {
          // Validate that uniqueId, startDate, and endDate are all provided; if any missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error:
                "Missing required query parameters: uniqueId, startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for userWorkspaceDetails case

        query = buildUserWorkspaceDetailsQuery(uniqueId, startDate, endDate);
        // Build and assign SQL query for user's workspace list using provided parameters
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "userLoginDetails": {
        // Case 4: User requested detailed login activity records for a specific user
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string
        const uniqueId = searchParams.get("uniqueId");
        // Extract the "uniqueId" (user email) to filter by specific user

        if (!uniqueId || !startDate || !endDate) {
          // Validate that uniqueId, startDate, and endDate are all provided; if any missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error:
                "Missing required query parameters: uniqueId, startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for userLoginDetails case

        query = buildUserLoginDetailsQuery(uniqueId, startDate, endDate);
        // Build and assign SQL query for user's detailed login activity using provided parameters
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "workspace": {
        // Case 5: User requested login activity summary grouped by workspace
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string

        if (!startDate || !endDate) {
          // Validate that both startDate and endDate are provided; if missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error: "Missing required query parameters: startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for workspace case

        query = buildWorkspaceQuery(startDate, endDate);
        // Build and assign SQL query for workspace activity summary using provided dates
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "workspaceUserDetails": {
        // Case 6: User requested list of users who accessed a specific workspace
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string
        const uniqueId = searchParams.get("uniqueId");
        // Extract the "uniqueId" (workspace name) to filter by specific workspace

        if (!uniqueId || !startDate || !endDate) {
          // Validate that uniqueId, startDate, and endDate are all provided; if any missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error:
                "Missing required query parameters: uniqueId, startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for workspaceUserDetails case

        query = buildWorkspaceUserDetailsQuery(uniqueId, startDate, endDate);
        // Build and assign SQL query for workspace's user list using provided parameters
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "workspaceLoginDetails": {
        // Case 7: User requested detailed login activity records for a specific workspace
        const startDate = searchParams.get("startDate");
        // Extract the "startDate" value from the URL query string
        const endDate = searchParams.get("endDate");
        // Extract the "endDate" value from the URL query string
        const uniqueId = searchParams.get("uniqueId");
        // Extract the "uniqueId" (workspace name) to filter by specific workspace

        if (!uniqueId || !startDate || !endDate) {
          // Validate that uniqueId, startDate, and endDate are all provided; if any missing, return error
          return NextResponse.json(
            // Return error response to client with HTTP 400 status
            {
              error:
                "Missing required query parameters: uniqueId, startDate and endDate",
              // Error message explaining which parameters are missing
            },
            { status: 400 },
            // HTTP 400 Bad Request status code
          );
        }
        // End validation check for workspaceLoginDetails case

        query = buildWorkspaceLoginDetailsQuery(uniqueId, startDate, endDate);
        // Build and assign SQL query for workspace's detailed login activity using provided parameters
        break;
        // Exit switch case to prevent execution of other cases
      }

      case "inactiveUser":
        // Case 8: User requested list of inactive users (no login in last 3 months)
        query = buildInactiveUsersQuery();
        // Build and assign SQL query for inactive users; no date parameters needed (uses fixed 3-month window)
        break;
      // Exit switch case to prevent execution of other cases

      default:
        // Default case: Handle any unrecognized query type values
        return NextResponse.json(
          // Return error response to client with HTTP 400 status
          { error: `Invalid query type: ${type}` },
          // Error message including the invalid type value that was provided
          { status: 400 },
          // HTTP 400 Bad Request status code
        );
      // End default case response
    }
    // End of switch statement

    // Execute the query and fetch the login activity data.
    const loginActivityData = await executeQuery(session, query);
    // Run SQL query and fetch the resulting rows (like receiving the report output)

    // Log the success of the operation to Event Hub.
    await logToEventHub({
      // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
      type: "INFO",
      // Mark this event as informational (successful normal event)
      detailMessage: `Successfully executed query of login activity type: ${type} for user: ${user}`,
      // Human readable success message
      programName,
      // Include API name in log for clear tracking
      startDatetime: requestStartTime,
      // Include start time so duration can be measured
      status: "SUCCESS",
      // Mark status as success for dashboard/monitoring
      actionType: "Spark_SQL_Query",
      // Categorize action type as SQL query execution
      actionDescription:
        "Fetch Login Activity from tables: system.access.audit, system.access.workspaces_latest",
      // Describe the action performed and table used
      user,
      // Record who triggered the API call (audit requirement)
    });
    // End Event Hub success log

    // Return the login activity data as a JSON response.
    return NextResponse.json(loginActivityData);
    // Send retrieved rows back to frontend as JSON so UI can display login history
  } catch (error: any) {
    // Catch block: runs if Databricks query fails, session fails, or any unexpected error occurs

    // Log the error to Event Hub.
    const errorMessage = `Error retrieving login activity type: ${type} for user: ${user}. Error message: ${
      error?.message ?? "Unknown error during query execution"
    }`;
    // Extract readable error message; fallback message if error is unknown

    console.error(errorMessage, error.stack); // Log the full error for debugging.
    // Print error and stack trace so developers know the exact cause/line of failure

    await logToEventHub({
      // Send failure log to Azure Event Hub for monitoring/alerting/audit
      type: "ERROR",
      // Mark this as an ERROR event since operation failed
      detailMessage: errorMessage,
      // Store detailed failure message for troubleshooting
      programName,
      // API/program name for traceability
      startDatetime: requestStartTime,
      // Start time allows calculation of how long it ran before failing
      status: "FAILED",
      // Mark status failed so monitoring tools can alert if needed
      actionType: "Spark_SQL_Query",
      // Categorize action as SQL query operation
      actionDescription:
        "Failed to Fetch Login Activity from tables: system.access.audit, system.access.workspaces_latest",
      // Describe intended action for context
      user,
      // Track which user request experienced failure
    });
    // End Event Hub error log

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // HTTP 500 indicates server-side failure (system issue, not user mistake)
  }
  // End try/catch
});
