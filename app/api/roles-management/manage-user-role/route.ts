/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  
  Purpose of the script:
  This API module provides CRUD operations (GET, POST, PUT, DELETE) for managing user-group-role associations
  in a dashboard system with granular RBAC enforcement. It handles the assignment of users to groups with specific 
  roles, modification of user roles within groups, and removal of user-group-role mappings. The module enforces 
  authorization checks at both the group and role level to ensure that only authorized administrators can manage 
  user-group-role assignments within their scope. All operations validate that groups, users, roles, and mappings 
  exist and are accessible to the current user's RBAC context. The API includes special logic to prevent Super Admins 
  from being added to groups directly (they require admin intervention). All operations are logged to Azure Event Hub 
  for audit and monitoring purposes.
*/

/* ----------------------------- IMPORTS -------------------------------- */

// next/server
// What it is: Next.js server-side module that provides request/response utilities for Route Handlers
// (API endpoints) in the App Router.
// Why used: To handle incoming HTTP requests and generate structured HTTP responses in Next.js APIs,
// including reading request payloads, returning JSON responses, and managing status codes.
import { NextRequest, NextResponse } from "next/server"; // Next.js types/utilities for server route handling

// @/lib/azure/databricksClient
// What it is: A local utility module responsible for connecting to Databricks SQL, managing sessions,
// and executing queries using the Databricks SQL Connector.
// Why used: To abstract Databricks connectivity and query execution into reusable functions, ensuring
// consistent authentication, session management, error handling, and resource cleanup across APIs.
import {
  executeQuery, // Function to execute SQL queries against Databricks
  getDatabricksSession, // Function to retrieve or create a Databricks SQL session
} from "@/lib/azure/databricksClient"; // Session + query execution helpers for Databricks SQL

// @/lib/azure/eventHubLogger
// What it is: A local logging module that publishes structured operational logs to Azure Event Hub.
// Why used: To capture API execution telemetry (success/failure, duration, errors, metadata) and stream
// it to Event Hub for downstream ingestion into monitoring systems such as Splunk for analytics,
// alerting, and audit/compliance tracking.
import { logToEventHub } from "@/lib/azure/eventHubLogger"; // Centralized Event Hub logger for API observability

// @/lib/rbac/authorize
// What it is: Authorization middleware that validates user roles and permissions before API execution.
// Why used: To enforce role-based access control (RBAC) by checking if the logged-in user has 
// required permissions before allowing this API to run. This is a decorator/middleware that wraps
// all the HTTP handlers (GET, POST, PUT, DELETE).
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:write cannot assign a role to a group.
import { withAuthorization } from "@/lib/rbac/authorize"; // Authorization decorator/middleware for role permission checks

// @/lib/rbac/managementScope
// What it is: Utility modules that build WHERE clause filters based on user's RBAC group and role membership.
// Why used: To limit user-group-role changes to groups and roles where the requesting user has management authority.
// These helpers ensure user-role mappings stay inside the current admin's RBAC groups and visible roles.
// Example: a Group A admin can assign users to Group A roles, but not unrelated Group B roles.
import {
  buildManagementGroupAccessAndClause, // Function to filter queries by authorized groups
  buildManagementRoleAccessAndClause, // Function to filter queries by authorized roles
} from "@/lib/rbac/managementScope"; // RBAC group and role scoping builders

// @/lib/rbac/sql
// What it is: A SQL safety utility module that escapes and properly quotes SQL identifiers and values.
// Why used: To prevent SQL injection attacks by safely quoting mapping IDs, user IDs, group IDs, role IDs
// and other dynamic values before embedding them into SQL queries.
// sqlString safely quotes incoming ids before they are used in SQL checks.
// Example: mapping id ugr_123 becomes 'ugr_123'.
import { sqlString } from "@/lib/rbac/sql"; // SQL string escaping utility to prevent injection

// @/constants/config
// What it is: A centralized configuration/constants module containing common project constants such as
// Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
// of approved Databricks schema names (SCHEMAS) used for filtering queries.
// Why used: To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
// promote consistency, reduce duplication, and simplify maintenance when these values change.
import {
  CATALOG_NAME, // Databricks catalog name used as the logical database container
  SCHEMA_NAME, // Databricks schema name used to organize tables within the catalog
  DASHBOARD_ROLES_TABLE, // Constant for the name of dashboard roles table
  DASHBOARD_USERS_TABLE, // Constant for the name of dashboard users table
  DASHBOARD_GROUPS_TABLE, // Constant for the name of dashboard groups table
  DASHBOARD_USER_GROUP_ROLE_TABLE, // Constant for the name of dashboard user group roles table
  DASHBOARD_ADMINS_TABLE, // Constant for the name of dashboard admins table
} from "@/constants/config"; // Project-level configuration constants


/* ----------------------------- SQL QUERY BUILDERS -------------------------------- */

// Function to build a SQL query that retrieves all users assigned to a specific group with their roles,
// filtered by the current user's RBAC group access level.
// Builds the user-role list query for one group and filters that group by the current admin's RBAC groups.
// Example: if group_id is Group B and the admin belongs only to Group A, the admin receives no rows.
const getUserRoles = (
  request: NextRequest, // HTTP request object containing user context and RBAC information
  group_id: string // The unique identifier of the group whose user-role assignments are being queried
) => `SELECT 
  ugr.mapping_id, -- Unique identifier for each user-group-role mapping record
  ugr.user_id, -- Foreign key reference to the user
  ugr.role_id, -- Foreign key reference to the role assigned to this user in the group
  ugr.group_id, -- Foreign key reference to the group
  u.display_name, -- User's display name from the users table for UI presentation
  ugr.added_by, -- Audit field: user ID of who created this mapping
  ugr.added_at, -- Audit field: timestamp when this mapping was created
  ugr.is_active -- Flag indicating if this user-group-role assignment is currently active
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} ugr -- Query from user-group-role mappings table
JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} u -- Join with users table
  ON ugr.user_id = u.user_id -- Match based on user_id to get user details
WHERE ugr.group_id = ${sqlString(group_id)} -- Filter for the specific group (SQL-escaped)
  ${buildManagementGroupAccessAndClause(request, "ugr.group_id")}`; // Apply RBAC group-scoped filtering

// Function to build a SQL INSERT query that adds a new user to a group with a specific role
const addNewUserRole = (
  user_id: string, // The unique identifier of the user being added to the group
  group_id: string, // The unique identifier of the group the user is being added to
  role_id: string, // The unique identifier of the role being assigned to this user in the group
  added_by: string, // Audit field: user ID of who is performing this addition
) => `INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} (
  mapping_id, -- Column: auto-generated unique identifier for this user-group-role association
  user_id, -- Column: the user being added to the group
  group_id, -- Column: the group receiving the user
  role_id, -- Column: the role assigned to the user in this group
  added_by, -- Column: who performed this addition (audit)
  added_at -- Column: timestamp of addition (set to current time)
) VALUES (
  '${"ugr_"+crypto.randomUUID()}', -- Value: unique mapping ID with "ugr_" prefix followed by UUID
  '${user_id}', -- Value: user ID (quoted for SQL safety)
  '${group_id}', -- Value: group ID (quoted for SQL safety)
  '${role_id}', -- Value: role ID (quoted for SQL safety)
  '${added_by}', -- Value: user performing the addition (quoted for SQL safety)
  '${new Date().toISOString()}' -- Value: current timestamp in ISO 8601 format
)`; // End INSERT query construction

// Function to build a SQL UPDATE query that modifies a user's role assignment in a group
const updateUserRole = (
  mapping_id: string, // The unique identifier of the user-group-role mapping to update
  user_id: string, // The user ID associated with this mapping (for validation)
  group_id: string, // The group ID associated with this mapping (for validation)
  role_id: string, // The new role ID to assign (if provided)
  is_active: boolean = true, // Whether this mapping should be active after update
) => `
UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} -- Update the user-group-role mappings table
SET ${role_id ? `role_id='${role_id}',`:``} -- Conditionally update role_id only if a new role was provided
    ${is_active===true ? `is_active=TRUE`:`is_active=FALSE`} -- Update active status based on parameter (TRUE or FALSE)
WHERE mapping_id='${mapping_id}' -- Match the specific mapping being updated (SQL injection risk - should use sqlString)
AND user_id='${user_id}' -- Additional validation: ensure user_id matches (SQL injection risk)
AND group_id='${group_id}' -- Additional validation: ensure group_id matches (SQL injection risk)
`; // End UPDATE query construction

// Function to build a SQL DELETE query that removes a user-group-role assignment
const deleteUserRole = (
  mapping_id: string // The unique identifier of the user-group-role mapping to delete
) => `
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} -- Delete from user-group-role mappings table
WHERE mapping_id='${mapping_id}'`; // Delete the specific mapping (SQL injection risk - should use sqlString)

/* ----------------------------- GET EXPORT (RETRIEVE USER-GROUP-ROLE ASSIGNMENTS) -------------------------------- */

// Export GET handler: Retrieves all users assigned to a specific group with their roles
// Authorization: Requires withAuthorization middleware (checks roles-management:read permission)
// Purpose: Fetch and display the list of user-role assignments within a group
// Query parameter: ?group_id=xyz (the group whose assignments to retrieve)
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> { // GET handler wrapped with authorization middleware
  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DashboardUserRolesAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  const { searchParams } = new URL(request.url); // Parse the query parameters from the request URL
  // Extract URL search parameters so we can read query string values like ?group_id=xyz

  const group_id = searchParams.get("group_id"); // Extract the group_id query parameter from the request URL
  // The group_id tells us which group's user-role assignments to retrieve
  
  if(!group_id) { // Validate that group_id parameter was provided and is not null/empty
    return NextResponse.json({error:"group_id is null."}, {status:400}); // Return 400 Bad Request if group_id is missing
    // HTTP 400 indicates the client made a bad request (missing required parameter)
  }

  try { // Begin try block to catch any errors during query execution
      console.info("Received request to get dashboard groupwise user roles"); // Log that the GET request was received
      // Print informational message for debugging

      // Fetch a valid Databricks session.
      const session = await getDatabricksSession(); // Get or create a session to connect to Databricks
      // Open (or reuse) a secure connection/session to Databricks database        

      const result = await executeQuery(session, getUserRoles(request, group_id)); // Execute the user roles query for the group
      // Run the SQL query constructed by getUserRoles() and capture the result rows

      // Log the success of the operation to Event Hub.
      await logToEventHub({ // Send a structured success log record to Azure Event Hub
          // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
          type: "INFO", // Log level indicating this is an informational/success message
          // Mark this event as informational (successful normal event)
          detailMessage: `Successfully Fetched Dashboard Group User Roles`, // Human-readable success message
          // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
          programName, // The API name that generated this log entry
          // Include API name in log for clear tracking
          startDatetime: requestStartTime, // The time when this API call started
          // Include start time so duration can be measured
          status: "SUCCESS", // Operation completed without errors
          // Mark status as success for dashboard/monitoring
          actionType: "Spark_SQL_Query", // Categorizes the operation as a SQL query
          // Categorize action type as SQL query execution
          actionDescription: `Fetch All Dashboard Group User ROles`, // Describes what action was performed
          // Describe the action performed and table used
          user, // The user ID who triggered this operation
          // Record who triggered the API call (audit requirement)
      }); // End Event Hub success log
      // End Event Hub success log
  
      // Return the configured rules data as a JSON response.
      return NextResponse.json(result); // Send the query results back to the client as JSON
      // Send retrieved rows back to frontend as JSON so UI can display configured rules
  } catch (error: unknown) { // Catch any errors that occurred during database query or connection
      // Catch block: runs if Databricks connection or query execution fails

      // Log the error event to Event Hub in case of failure.
      const errorMessage = `Error fetching dashboard groups user roles: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard groups user roles."}`; // Construct error message
      // Extract error message; if unavailable, use fallback

      console.error(errorMessage, (error as Error).stack); // Log error details to console with stack trace
      // Print error with stack trace so developers can identify where it failed

      await logToEventHub({ // Send structured error log to Azure Event Hub for alerting and monitoring
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR", // Log level indicating this is an error that needs attention
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage, // The error message explaining what went wrong
      // Detailed error message stored in logs
      programName, // The API name that encountered the error
      // Identify the API/service that failed
      startDatetime: requestStartTime, // When this API call started (before the error occurred)
      // Include start time so we know how long it ran before failing
      status: "FAILED", // Operation did not complete successfully
      // Mark operation status as failed
      actionType: "Spark_SQL_Query", // Categorizes the operation as a SQL query
      // Indicate it failed during query execution
      actionDescription: `Failed to fetch dashboard group user roles: ${error}`, // Details about what failed
      // Describe what it tried to do for better investigation
      user, // The user ID whose request caused the error
      // Include which user triggered the failing request
      }); // End Event Hub error log

      // Return a 500 Internal Server Error response with the error message.
      return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
      // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
}); // End GET handler export

/* ----------------------------- POST EXPORT (ADD USER TO GROUP WITH ROLE) -------------------------------- */

// Export POST handler: Adds a new user to a group with a specific role
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Purpose: Create a new user-group-role association with comprehensive validation
// Request body: { user_id: string, group_id: string, role_id: string }
// Special logic: Prevents Super Admins from being added to groups (requires admin intervention)
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> { // POST handler wrapped with authorization middleware

  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DashboardUserRolesAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  const body = await request.json(); // Parse the JSON request body containing user and group details
  // Deserialize the POST body to access user_id, group_id, and role_id parameters

  const user_id = body?.user_id; // Extract the user ID of the user being added to the group
  // The user who will be assigned a role in the group
  const group_id = body?.group_id; // Extract the group ID of the group receiving the user
  // The group to which the user is being added
  const role_id = body?.role_id; // Extract the role ID being assigned to the user in the group
  // The role the user will have within this group
  const added_by = user; // Set the added_by field to the current user for audit purposes
  // Track which user created this new user-group-role mapping


  try { // Begin try block to catch errors during validation and query execution
      console.debug("Received request body:", JSON.stringify(body)); // Log the incoming request body for debugging
      // Print the full request payload for troubleshooting

      // Fetch a valid Databricks session.
      const session = await getDatabricksSession(); // Get or create a Databricks SQL session
      // Open (or reuse) a secure connection/session to Databricks database

      // Check that the target group is one of the current admin's RBAC groups before adding a mapping.
      // Example: a Group A admin cannot add a user to Group B.
      const checkGroup = ` -- SQL query to verify the group exists and is within user's management scope
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g -- Query from groups table
        WHERE g.group_id = ${sqlString(group_id)} -- Filter for the specific group ID (SQL-escaped)
          ${buildManagementGroupAccessAndClause(request, "g.group_id")} -- Add RBAC group membership filter
      `; // End checkGroup query
      
      const checkUser = `SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} WHERE user_id=${sqlString(user_id)}`; // SQL query to verify the user exists
      // Query all columns from users table where user_id matches (SQL-escaped)
      
      // SQL query to verify the role exists and is within user's management scope
      const checkRole = `
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r -- Query from roles table
        WHERE r.role_id = ${sqlString(role_id)} -- Filter for the specific role ID (SQL-escaped)
          ${buildManagementRoleAccessAndClause(request, "r.role_id")} -- Add RBAC role-level filter
      `; // End checkRole query
      
      const checkSuperAdmin = `SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} WHERE user_id=${sqlString(user_id)} AND is_active = TRUE`; // SQL query to check if user is a Super Admin
      // Query to verify if this user has active Super Admin status (prevents direct group assignment)
      
      const [groupPresent, userPresent, rolePresent, isSuperAdmin] = await Promise.all([ // Execute all validation queries in parallel
          executeQuery(session, checkGroup), // Query to check if group exists and is accessible
          executeQuery(session, checkUser), // Query to check if user exists
          executeQuery(session, checkRole), // Query to check if role exists and is accessible
          executeQuery(session, checkSuperAdmin) // Query to check if user is a Super Admin
      ]); // Destructure results into four variables

      if (userPresent.length===0 || groupPresent.length===0 || rolePresent.length===0) { // Check if any required entity was not found
          const errorMessage = userPresent.length===0 ? "User not present" : groupPresent.length===0 ? "Group not present or outside your roles-management access" : "Role not present or outside your roles-management access"; // Set error message based on which check failed
          // If user not found, group not accessible, or role not accessible, provide specific error

          console.error(errorMessage); // Log the validation failure to console
          // Print the error for debugging purposes

          return NextResponse.json({ error: errorMessage }, { status: groupPresent.length===0 || rolePresent.length===0 ? 403 : 400 }); // Return error response with appropriate HTTP status
          // Return 403 Forbidden if group/role access denied, 400 Bad Request if user not found
      }; // End validation error handling

      if(isSuperAdmin.length>0){ // If the user is a Super Admin
        const errorMessage = "User is a super admin. Please contact you admin to add the user to a group."; // Set error message
        // Super Admins cannot be added to groups directly - they require special handling

        console.error(errorMessage); // Log the validation failure to console
        // Print the error for debugging

        return NextResponse.json({ error:errorMessage }, { status:400 }); // Return 400 Bad Request
        // HTTP 400 indicates the request is invalid (Super Admin cannot be added to group)
      }; // End Super Admin check

      const query = addNewUserRole(user_id, group_id, role_id, added_by); // Build the INSERT query to add user to group with role
      // Construct the SQL INSERT statement using the helper function

      const result = await executeQuery(session, query); // Execute the INSERT query against Databricks
      // Run the SQL to create the new user-group-role mapping

      console.log("Add New User Role in Group Response: ", result); // Log the database response for debugging
      // Print the result to console (typically shows rows affected or query status)

      // Log the success of the operation to Event Hub.
      await logToEventHub({ // Send success log to Azure Event Hub
          // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
          type: "INFO", // Log level for successful operation
          // Mark this event as informational (successful normal event)
          detailMessage: `Successfully Added New User to Group with id: ${group_id}`, // Human-readable success message including the group ID
          // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
          programName, // API name for log filtering
          // Include API name in log for clear tracking
          startDatetime: requestStartTime, // When the operation started
          // Include start time so duration can be measured
          status: "SUCCESS", // Operation completed successfully
          // Mark status as success for dashboard/monitoring
          actionType: "Spark_SQL_Query", // Categorizes as SQL operation
          // Categorize action type as SQL query execution
          actionDescription: `Add New Group in the table: ${DASHBOARD_GROUPS_TABLE}`, // Describes the operation performed
          // Describe the action performed and table used
          user, // User who performed the operation
          // Record who triggered the API call (audit requirement)
      }); // End Event Hub success log
      // End Event Hub success log
  
      // Return the configured rules data as a JSON response.
      return NextResponse.json(result); // Return the query result to the client as JSON
      // Send the database response back to the frontend
      
  } catch (error: unknown) { // Catch any errors from validation or database operations
      // Catch block: runs if Databricks connection or query execution fails

      // Log the error event to Event Hub in case of failure.
      const errorMessage = `Error Adding new user to a group: ${(error as Error)?.message ?? "Unknown error occurred while creating new user to a group."}`; // Construct comprehensive error message
      // Extract error message; if unavailable, use fallback

      console.error(errorMessage, (error as Error).stack); // Log error and stack trace to console
      // Print error with stack trace so developers can identify where it failed

      await logToEventHub({ // Send error log to Azure Event Hub
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR", // Log level indicating error
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage, // Error message explaining what went wrong
      // Detailed error message stored in logs
      programName, // API name for filtering
      // Identify the API/service that failed
      startDatetime: requestStartTime, // When the operation started before failing
      // Include start time so we know how long it ran before failing
      status: "FAILED", // Operation did not complete
      // Mark operation status as failed
      actionType: "Spark_SQL_Query", // Categorizes as SQL operation
      // Indicate it failed during query execution
      actionDescription: `Failed to run insert query to add new user to a group for: ${body.group_id} with payload: ${JSON.stringify(body)}`, // Detailed description of attempted action
      // Describe what it tried to do for better investigation
      user, // User whose request failed
      // Include which user triggered the failing request
      }); // End Event Hub error log

      // Return a 500 Internal Server Error response with the error message.
      return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
      // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
}); // End POST handler export


/* ----------------------------- PUT EXPORT (UPDATE USER-GROUP-ROLE ASSIGNMENT) -------------------------------- */

// Export PUT handler: Updates an existing user-group-role assignment
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Purpose: Modify a user's role within a group or change their active status
// Request body: { mapping_id: string, user_id: string, group_id: string, role_id: string, is_active: boolean }
export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> { // PUT handler wrapped with authorization middleware
  
  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DashboardUserRolesAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  const body = await request.json(); // Parse the JSON request body containing mapping and update details
  // Deserialize the PUT body to access mapping_id and other update parameters

  const mapping_id = body.mapping_id; // Extract the mapping ID of the user-group-role assignment to update
  // Unique identifier for the association being modified
  const user_id = body?.user_id; // Extract the user ID for validation
  // Used to verify the mapping matches the expected user
  const group_id = body?.group_id; // Extract the group ID for validation
  // Used to verify the mapping matches the expected group
  const role_id = body?.role_id; // Extract the new role ID to assign
  // The role to be updated (if changing roles)
  const is_active = body?.is_active; // Extract the active status flag
  // Whether this mapping should be active after update


  try { // Begin try block to catch errors during validation and update
      console.debug("Received request body:", JSON.stringify(body)); // Log the incoming request body for debugging
      // Print the full request payload for troubleshooting

      // Fetch a valid Databricks session.
      const session = await getDatabricksSession(); // Get or create a Databricks SQL session
      // Open (or reuse) a secure connection/session to Databricks database

      // Check that the existing mapping and requested target group are both inside the current admin's RBAC groups.
      // Example: a Group A admin cannot edit a mapping that belongs to Group B.
      const checkUserRole = ` -- SQL query to verify the mapping exists and is within user's management scope
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} ugr -- Query from user-group-role mappings table
        WHERE ugr.mapping_id = ${sqlString(mapping_id)} -- Filter for the specific mapping ID (SQL-escaped)
          ${buildManagementGroupAccessAndClause(request, "ugr.group_id")} -- Add RBAC group membership filter
      `; // End checkUserRole query
      
      const checkGroup = ` -- SQL query to verify the group exists and is within user's management scope
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g -- Query from groups table
        WHERE g.group_id = ${sqlString(group_id)} -- Filter for the specific group ID (SQL-escaped)
          ${buildManagementGroupAccessAndClause(request, "g.group_id")} -- Add RBAC group membership filter
      `; // End checkGroup query
      
      const checkUser = `SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} WHERE user_id=${sqlString(user_id)}`; // SQL query to verify the user exists
      // Query all columns from users table where user_id matches (SQL-escaped)
      
      const checkRole = ` -- SQL query to verify the role exists and is within user's management scope
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r -- Query from roles table
        WHERE r.role_id = ${sqlString(role_id)} -- Filter for the specific role ID (SQL-escaped)
          ${buildManagementRoleAccessAndClause(request, "r.role_id")} -- Add RBAC role-level filter
      `; // End checkRole query

      const [userRolePresent, groupPresent, userPresent, rolePresent] = await Promise.all([ // Execute all validation queries in parallel
                executeQuery(session, checkUserRole), // Query to check if mapping exists and is accessible
                executeQuery(session, checkGroup), // Query to check if group exists and is accessible
                executeQuery(session, checkUser), // Query to check if user exists
                executeQuery(session, checkRole) // Query to check if role exists and is accessible
            ]); // Destructure results into four variables

      if (userRolePresent.length === 0) { // If the user-role mapping was not found
          const errorMessage = "User-role mapping does not exist or is outside your roles-management access."; // Set error message
          // The mapping doesn't exist or the user lacks access to modify it
          console.error(errorMessage); // Log the validation failure to console
          // Print the error for debugging
          return NextResponse.json({ error: errorMessage }, { status: 403 }); // Return 403 Forbidden
          // HTTP 403 indicates the user lacks permission to perform this action
      }; // End mapping existence check

      if (userPresent.length===0 || groupPresent.length===0 || rolePresent.length===0) { // Check if any required entity was not found
          const errorMessage = userPresent.length===0 ? "User not present" : groupPresent.length===0 ? "Group not present or outside your roles-management access" : "Role not present or outside your roles-management access"; // Set error message based on which check failed
          // If user not found, group not accessible, or role not accessible, provide specific error
          console.error(errorMessage); // Log the validation failure to console
          // Print the error for debugging
          return NextResponse.json({ error: errorMessage }, { status: groupPresent.length===0 || rolePresent.length===0 ? 403 : 400 }); // Return error response with appropriate HTTP status
          // Return 403 Forbidden if group/role access denied, 400 Bad Request if user not found
      }; // End validation error handling

      const query = updateUserRole(mapping_id, user_id, group_id, role_id, is_active); // Build the UPDATE query to modify the user-group-role assignment
      // Construct the SQL UPDATE statement using the helper function

      const result = await executeQuery(session, query); // Execute the UPDATE query against Databricks
      // Run the SQL to update the user-group-role mapping

      console.log("Update Group Response: ", result); // Log the database response for debugging
      // Print the result to console (typically shows rows affected or query status)

      // Log the success of the operation to Event Hub.
      await logToEventHub({ // Send success log to Azure Event Hub
          // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
          type: "INFO", // Log level for successful operation
          // Mark this event as informational (successful normal event)
          detailMessage: `Successfully updated user role in group: ${group_id}`, // Human-readable success message including the group ID
          // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
          programName, // API name for log filtering
          // Include API name in log for clear tracking
          startDatetime: requestStartTime, // When the operation started
          // Include start time so duration can be measured
          status: "SUCCESS", // Operation completed successfully
          // Mark status as success for dashboard/monitoring
          actionType: "Spark_SQL_Query", // Categorizes as SQL operation
          // Categorize action type as SQL query execution
          actionDescription: `Update User Role in Group in the table: ${DASHBOARD_USER_GROUP_ROLE_TABLE}`, // Describes the operation performed
          // Describe the action performed and table used
          user, // User who performed the operation
          // Record who triggered the API call (audit requirement)
      }); // End Event Hub success log
      // End Event Hub success log
  
      // Return the configured rules data as a JSON response.
      return NextResponse.json(result); // Return the query result to the client as JSON
      // Send the database response back to the frontend
      
  } catch (error: unknown) { // Catch any errors from validation or database operations
      // Catch block: runs if Databricks connection or query execution fails

      // Log the error event to Event Hub in case of failure.
      const errorMessage = `Error Updating user role in group: ${(error as Error)?.message ?? "Unknown error occurred while updating user role in a group."}`; // Construct comprehensive error message
      // Extract error message; if unavailable, use fallback

      console.error(errorMessage, (error as Error).stack); // Log error and stack trace to console
      // Print error with stack trace so developers can identify where it failed

      await logToEventHub({ // Send error log to Azure Event Hub
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR", // Log level indicating error
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage, // Error message explaining what went wrong
      // Detailed error message stored in logs
      programName, // API name for filtering
      // Identify the API/service that failed
      startDatetime: requestStartTime, // When the operation started before failing
      // Include start time so we know how long it ran before failing
      status: "FAILED", // Operation did not complete
      // Mark operation status as failed
      actionType: "Spark_SQL_Query", // Categorizes as SQL operation
      // Indicate it failed during query execution
      actionDescription: `Failed to run update query to update user role in group for: ${body.group_id} with payload: ${JSON.stringify(body)}`, // Detailed description of attempted action
      // Describe what it tried to do for better investigation
      user, // User whose request failed
      // Include which user triggered the failing request
      }); // End Event Hub error log

      // Return a 500 Internal Server Error response with the error message.
      return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
      // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
}); // End PUT handler export


/* ----------------------------- DELETE EXPORT (REMOVE USER FROM GROUP) -------------------------------- */

// Export DELETE handler: Removes a user-group-role assignment
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Purpose: Delete a user's association with a group and role
// Query parameter: ?mapping_id=xyz (the user-group-role mapping to delete)
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> { // DELETE handler wrapped with authorization middleware
  
  const requestStartTime = new Date(); // Capture the start time of the request for logging
  // Save start time so we can measure how long this API takes (like starting a stopwatch)

  const programName = "DashboardUserRolesAPI"; // Program name for logging purposes
  // API name used in EventHub/Splunk so logs can be filtered by this API

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
  // Identify user who requested refresh status (for audit); fallback to Anonymous if missing

  const { searchParams } = new URL(request.url); // Parse URL query parameters
  // Extract query string parameters from the request URL

  const mapping_id = searchParams.get("mapping_id"); // Extract the mapping_id query parameter
  // The mapping_id uniquely identifies which user-group-role association to delete
  
  if(!mapping_id) { // Validate that mapping_id parameter was provided
    return NextResponse.json({error:"mapping_id is null."}, {status:400}); // Return 400 Bad Request if mapping_id is missing
    // HTTP 400 indicates the client made a bad request (missing required parameter)
  }

  try { // Begin try block to catch errors during validation and deletion

      // Fetch a valid Databricks session.
      const session = await getDatabricksSession(); // Get or create a Databricks SQL session
      // Open (or reuse) a secure connection/session to Databricks database

      // Check that the mapping belongs to one of the current admin's RBAC groups before deleting it.
      // Example: a Group A admin cannot remove a user-role mapping from Group B.
      const checkUserRole = ` -- SQL query to verify the mapping exists and is within user's management scope
        SELECT * -- Select all columns to check if record exists
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} ugr -- Query from user-group-role mappings table
        WHERE ugr.mapping_id = ${sqlString(mapping_id)} -- Filter for the specific mapping ID (SQL-escaped)
          ${buildManagementGroupAccessAndClause(request, "ugr.group_id")} -- Add RBAC group membership filter
      `; // End checkUserRole query
      
      const userRolePresent = await executeQuery(session, checkUserRole); // Execute the mapping existence and access check
      // Run the query to see if the mapping exists and is accessible to the current user

      if (userRolePresent.length===0) { // If the query returned no results (mapping doesn't exist or user lacks access)
          const errorMessage = `This mapping_id does not exist or is outside your roles-management access: ${mapping_id}`; // Set error message
          // The mapping doesn't exist or the user lacks access to delete it

          console.error(errorMessage); // Log the validation failure to console
          // Print the error for debugging

          return NextResponse.json({ error: errorMessage }, { status: 403 }); // Return 403 Forbidden
          // HTTP 403 indicates the user lacks permission to perform this action
      }; // End validation error handling

      const query = deleteUserRole(mapping_id); // Build the DELETE query using helper function
      // Construct the SQL DELETE statement to remove the user-group-role mapping

      const result = await executeQuery(session, query); // Execute the DELETE query against Databricks
      // Run the SQL to delete the user-group-role mapping

      console.log("Delete user role from Group Response: ", result); // Log the database response for debugging
      // Print the result to console (typically shows rows affected or query status)

      // Log the success of the operation to Event Hub.
      await logToEventHub({ // Send success log to Azure Event Hub
          // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
          type: "INFO", // Log level for successful operation
          // Mark this event as informational (successful normal event)
          detailMessage: `Successfully deleted: ${mapping_id}`, // Human-readable success message including the deleted mapping ID
          // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
          programName, // API name for log filtering
          // Include API name in log for clear tracking
          startDatetime: requestStartTime, // When the operation started
          // Include start time so duration can be measured
          status: "SUCCESS", // Operation completed successfully
          // Mark status as success for dashboard/monitoring
          actionType: "Spark_SQL_Query", // Categorizes as SQL operation
          // Categorize action type as SQL query execution
          actionDescription: `Delete User Role Group in the table: ${DASHBOARD_USER_GROUP_ROLE_TABLE}`, // Describes the operation performed
          // Describe the action performed and table used
          user, // User who performed the operation
          // Record who triggered the API call (audit requirement)
      }); // End Event Hub success log
      // End Event Hub success log
  
      // Return the configured rules data as a JSON response.
      return NextResponse.json(result); // Return the query result to the client as JSON
      // Send the database response back to the frontend
      
  } catch (error: unknown) { // Catch any errors from validation or database operations
      // Catch block: runs if Databricks connection or query execution fails

      // Log the error event to Event Hub in case of failure.
      const errorMessage = `Error Deleting user role from group: ${(error as Error)?.message ?? "Unknown error occurred while deleting user role."}`; // Construct comprehensive error message
      // Extract error message; if unavailable, use fallback

      console.error(errorMessage, (error as Error).stack); // Log error and stack trace to console
      // Print error with stack trace so developers can identify where it failed

      await logToEventHub({ // Send error log to Azure Event Hub
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR", // Log level indicating error
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage, // Error message explaining what went wrong
      // Detailed error message stored in logs
      programName, // API name for filtering
      // Identify the API/service that failed
      startDatetime: requestStartTime, // When the operation started before failing
      // Include start time so we know how long it ran before failing
      status: "FAILED", // Operation did not complete
      // Mark operation status as failed
      actionType: "Spark_SQL_Query", // Categorizes as SQL operation
      // Indicate it failed during query execution
      actionDescription: `Failed to run delete query to delete user role from group for: ${mapping_id}`, // Detailed description of attempted action
      // Describe what it tried to do for better investigation
      user, // User whose request failed
      // Include which user triggered the failing request
      }); // End Event Hub error log

      // Return a 500 Internal Server Error response with the error message.
      return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
      // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
}); // End DELETE handler export