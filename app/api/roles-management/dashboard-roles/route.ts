/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  
  Purpose of the script:
    This script defines API endpoints for managing Dashboard RBAC Roles.
    It supports retrieving, creating, updating, and deleting roles stored
    in Databricks while enforcing Role-Based Access Control (RBAC) policies.


    The API integrates with Azure Event Hub for operational logging and
    auditing, validates management scope access before modification
    operations, and ensures that only authorized administrators can
    manage roles within their assigned RBAC scope.


  Key Features:
    - Retrieves all visible roles based on RBAC management visibility rules
    - Creates new dashboard roles
    - Updates existing roles after RBAC scope validation
    - Deletes roles after RBAC scope validation (excluding system roles)
    - Logs all successful and failed operations to Azure Event Hub
    - Enforces RBAC authorization using withAuthorization
    - Uses Databricks SQL for data persistence and validation
*/


/* ----------------------------- IMPORTS -------------------------------- */


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
  DASHBOARD_ROLES_TABLE
} from "@/constants/config"; // Project-level configuration constants


// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:read cannot list dashboard roles.
import { withAuthorization } from "@/lib/rbac/authorize";


// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildManagementRoleAccessAndClause,
  buildManagementRoleVisibilityAndClause,
} from "@/lib/rbac/managementScope";


// sqlString safely quotes incoming role ids before they are used in SQL checks.
// Example: role id r_123 becomes 'r_123'.
import { sqlString } from "@/lib/rbac/sql";



// Builds the role list query with roles-management role-level visibility through mappings or creator ownership.
// Example: Super Admin gets all roles; normal admins get group-used roles plus roles they created.
const getRoles = (request: NextRequest) => `
-- Select distinct role records to avoid duplicate rows caused by RBAC visibility relationships
SELECT DISTINCT r.*
-- Read rows from the configured dashboard roles table using alias r
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r
-- Start the WHERE clause with an always-true condition so dynamic RBAC filters can be appended safely
WHERE 1 = 1
-- Append the RBAC visibility clause so the current user only sees roles allowed by management visibility rules
  ${buildManagementRoleVisibilityAndClause(request, "r.role_id", "r.created_by")}
-- Sort the final role list alphabetically by role name for consistent display ordering
ORDER BY r.role_name
`;


// Builds the SQL INSERT statement for creating a new dashboard role record with a generated role_id and audit timestamps.
const addNewRole = (
    role_name: string, // Unique name of the new role (e.g. "Data Quality Admin")
    description: string, // Human-readable description of the role's purpose
    is_active: boolean=true, // Whether the role is currently active/usable
    created_by: string, // User ID of the admin creating this role
) =>`-- Insert a new role record into the configured dashboard roles table
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} (
-- Column that stores the unique identifier for the new role
    role_id,
-- Column that stores the human-readable unique name of the role
    role_name,
-- Column that stores the description of the role
    description,
-- Column that stores whether the role is active
    is_active,
-- Column that stores when the role record was created
    created_at,
-- Column that stores which user created the role
    created_by,
-- Column that stores the latest update timestamp for the role
    updated_at
-- End of the target column list for the insert operation
) VALUES (
-- Insert a generated role identifier prefixed with r_
    '${"r_"+crypto.randomUUID()}',
-- Insert the provided role name into the role_name column
    '${role_name}',
-- Insert the provided description into the description column
    '${description}',
-- Insert the active flag as TRUE or FALSE based on the supplied boolean value
    ${is_active===true ? `TRUE,`: `FALSE,`}
-- Insert the current ISO timestamp as the created_at value
    '${new Date().toISOString()}',
-- Insert the creating user identifier as the created_by value
    '${created_by}',
-- Insert the current ISO timestamp as the initial updated_at value
    '${new Date().toISOString()}'
-- End of the values list for the insert statement
)`


// Builds the SQL UPDATE statement for modifying an existing dashboard role's fields and refreshing its updated_at timestamp.
const updateRole = (
    role_id: string, // ID of the role record to update
    role_name?: string, // New role name, if changed
    description?: string, // New description, if changed
    is_active: boolean=true, // New active/inactive status
) => ` 
-- Update the existing role record in the configured dashboard roles table
UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE}
-- Begin setting the columns that need to be modified for the selected role
SET ${role_name ? `role_name = '${role_name}',` : ``}
-- Conditionally update the description column only when a new description value is provided
    ${description ? `description = '${description}',` : ``}
-- Update the is_active flag based on the boolean value supplied to the function
    ${is_active===true ? `is_active = TRUE` : `is_active = FALSE`}
-- Restrict the update to the specific role identified by role_id
WHERE role_id = '${role_id}'
`


// Builds the SQL DELETE statement for removing a dashboard role from the database.
const deleteRole = (
    role_id: string // ID of the role record to delete
) => `
-- Delete the matching role record from the configured dashboard roles table
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} WHERE role_id='${role_id}'
`



// GET handler: returns the list of dashboard roles visible to the requesting user, wrapped with RBAC authorization.
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardRolesAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    try { // Begin main logic; any errors are caught and logged below
        console.info("Received request to get dashboard roles") // Log that the GET request has started


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database        


        const result = await executeQuery(session, getRoles(request)); // Execute the roles query scoped by RBAC visibility and capture the resulting rows


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Roles`,
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            // Human readable success message
            programName,
            // Include API name in log for clear tracking
            startDatetime: requestStartTime,
            // Include start time so duration can be measured
            status: "SUCCESS",
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query",
            // Categorize action type as SQL query execution
            actionDescription: `Fetch All Dashboard Roles`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result);
        // Send retrieved rows back to frontend as JSON so UI can display configured rules
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails


        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error fetching dashboard roles: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard roles."}`;
        // Extract error message; if unavailable, use fallback


        console.error(errorMessage, (error as Error).stack);
        // Print error with stack trace so developers can identify where it failed


        await logToEventHub({
        // Send structured failure log to Event Hub for monitoring and alerting
        type: "ERROR",
        // ERROR indicates the operation failed and needs attention
        detailMessage: errorMessage,
        // Detailed error message stored in logs
        programName,
        // Identify the API/service that failed
        startDatetime: requestStartTime,
        // Include start time so we know how long it ran before failing
        status: "FAILED",
        // Mark operation status as failed
        actionType: "Spark_SQL_Query",
        // Indicate it failed during query execution
        actionDescription: `Failed to fetch dashboard roles: ${error}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }    
});


// POST handler: validates and inserts a new dashboard role record, wrapped with RBAC authorization.
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {


    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardRolesAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    const role_name = body?.role_name // New role's name
    const description = body?.description // New role's description
    const is_active = body?.is_active // New role's active flag
    const created_by = user // Record the requesting user as the creator



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // check if group already exist 
        const checkRole = `-- Select all columns to check whether a role with the provided name already exists
SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} WHERE role_name='${role_name}'` // Query to check whether a role with this name already exists
        const rolePresent = await executeQuery(session, checkRole); // Execute the duplicate-check query


        if (rolePresent.length!==0) { // If a role with this name already exists, reject the request
            const errorMessage = "A role with this Role Name is already present."; // Message returned to the caller


            console.error(errorMessage); // Log the duplicate-name error


            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Respond with 400 Bad Request since the role name is a duplicate
        };


        const query = addNewRole(role_name, description, is_active, created_by); // Build the INSERT statement for the new role


        const result = await executeQuery(session, query); // Execute the INSERT and capture the result


        console.log("Add New Role Response: ", result); // Log the database response for the insert


        const role_id = await executeQuery(session, checkRole); // Re-query to fetch the newly created role's ID and details


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Role with name: ${role_name}`,
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            // Human readable success message
            programName,
            // Include API name in log for clear tracking
            startDatetime: requestStartTime,
            // Include start time so duration can be measured
            status: "SUCCESS",
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query",
            // Categorize action type as SQL query execution
            actionDescription: `Add New role in the table: ${DASHBOARD_ROLES_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(role_id[0]?.role_id); // Send the newly created role's ID back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails


        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Adding new role: ${(error as Error)?.message ?? "Unknown error occurred while creating new role."}`;
        // Extract error message; if unavailable, use fallback


        console.error(errorMessage, (error as Error).stack);
        // Print error with stack trace so developers can identify where it failed


        await logToEventHub({
        // Send structured failure log to Event Hub for monitoring and alerting
        type: "ERROR",
        // ERROR indicates the operation failed and needs attention
        detailMessage: errorMessage,
        // Detailed error message stored in logs
        programName,
        // Identify the API/service that failed
        startDatetime: requestStartTime,
        // Include start time so we know how long it ran before failing
        status: "FAILED",
        // Mark operation status as failed
        actionType: "Spark_SQL_Query",
        // Indicate it failed during query execution
        actionDescription: `Failed to run insert query to add new role for: ${body.role_name} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});



// PUT handler: validates RBAC access to the target role and updates its fields, wrapped with RBAC authorization.
export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardRolesAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    const role_id = body?.role_id // ID of the role record to update
    const role_name = body?.role_name // New role name, if provided
    const description = body?.description // New description, if provided
    const is_active = body?.is_active // New active/inactive flag, if provided



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // Check that the role exists and is used inside at least one group the current admin belongs to.
        // Example: a Group A admin cannot update a role used only in Group B.
        const checkRole = `
-- Select all columns from the dashboard roles table to verify the target role exists and is within management access
            SELECT *
-- Read records from the configured dashboard roles table using alias r
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r
-- Filter the result to the specific role identifier provided in the request
            WHERE r.role_id = ${sqlString(role_id)}
-- Append the RBAC access clause so only roles within the user's management scope are considered valid for update
              ${buildManagementRoleAccessAndClause(request, "r.role_id")}
        ` // Query to verify the role exists and is within the admin's management access scope
        const rolePresent = await executeQuery(session, checkRole); // Execute the access-check query


        if (rolePresent.length===0) { // If no matching/accessible role was found, reject the update
            const errorMessage = `Role with this role_id does not exist or is outside your roles-management access: ${role_id}`; // Message returned to the caller


            console.error(errorMessage); // Log the access/existence error


            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access/existence check failed
        };


        const query = updateRole(role_id, role_name, description, is_active); // Build the UPDATE statement with the new field values


        const result = await executeQuery(session, query); // Execute the UPDATE and capture the result


        console.log("Update Role Response: ", result); // Log the database response for the update


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully updated role: ${role_name}`,
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            // Human readable success message
            programName,
            // Include API name in log for clear tracking
            startDatetime: requestStartTime,
            // Include start time so duration can be measured
            status: "SUCCESS",
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query",
            // Categorize action type as SQL query execution
            actionDescription: `Update Role in the table: ${DASHBOARD_ROLES_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result); // Send the update result back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails


        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Updating role: ${(error as Error)?.message ?? "Unknown error occurred while updating role."}`;
        // Extract error message; if unavailable, use fallback


        console.error(errorMessage, (error as Error).stack);
        // Print error with stack trace so developers can identify where it failed


        await logToEventHub({
        // Send structured failure log to Event Hub for monitoring and alerting
        type: "ERROR",
        // ERROR indicates the operation failed and needs attention
        detailMessage: errorMessage,
        // Detailed error message stored in logs
        programName,
        // Identify the API/service that failed
        startDatetime: requestStartTime,
        // Include start time so we know how long it ran before failing
        status: "FAILED",
        // Mark operation status as failed
        actionType: "Spark_SQL_Query",
        // Indicate it failed during query execution
        actionDescription: `Failed to run update query to update role for: ${body.role_name} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});



// DELETE handler: validates RBAC access and system role protection before deleting a role, wrapped with RBAC authorization.
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardRolesAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Extract query parameters from the request URL
  
    const role_id = searchParams.get("role_id"); // Get the role_id to delete from the query string
    
    if(!role_id) { // If no role_id was provided, reject the request
      return NextResponse.json({error:"role_id is null."}, {status:400}); // Respond with 400 Bad Request since role_id is required
    }
  
    try { // Begin main logic; any errors are caught and logged below
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the role exists, is not a protected system role, and is inside the admin's RBAC groups.
        // Example: a Group A admin cannot delete a role used only in Group B.
        const checkRole = `
-- Select all columns from the dashboard roles table to verify the target role exists, is not a system role, and is within management access
            SELECT *
-- Read records from the configured dashboard roles table using alias r
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r
-- Filter the result to the specific role identifier supplied for deletion
            WHERE r.role_id = ${sqlString(role_id)}
-- Ensure protected system roles are excluded from deletion by requiring is_system to be false
              AND COALESCE(r.is_system, FALSE) = FALSE
-- Append the RBAC access clause so only roles within the user's management scope can be deleted
              ${buildManagementRoleAccessAndClause(request, "r.role_id")}
        ` // Query to verify the role exists, is not a system role, and is within the admin's management access scope
        const groupPresent = await executeQuery(session, checkRole); // Execute the access and system-role protection check
  
        if (groupPresent.length===0) { // If no matching/accessible/non-system role was found, reject the deletion
            const errorMessage = `This role_id does not exist, is a system role, or is outside your roles-management access: ${role_id}`; // Message returned to the caller
  
            console.error(errorMessage); // Log the access/system-role/existence error
  
            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access/system-role/existence check failed
        };
  
        const query = deleteRole(role_id); // Build the DELETE statement for this role
  
        const result = await executeQuery(session, query); // Execute the DELETE and capture the result
  
        console.log("Delete Role Response: ", result); // Log the database response for the delete
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully deleted: ${role_id}`,
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            // Human readable success message
            programName,
            // Include API name in log for clear tracking
            startDatetime: requestStartTime,
            // Include start time so duration can be measured
            status: "SUCCESS",
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query",
            // Categorize action type as SQL query execution
            actionDescription: `Delete Role from the table: ${DASHBOARD_ROLES_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result); // Send the delete result back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails
  
        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Deleting role: ${(error as Error)?.message ?? "Unknown error occurred while deleting role."}`;
        // Extract error message; if unavailable, use fallback
  
        console.error(errorMessage, (error as Error).stack);
        // Print error with stack trace so developers can identify where it failed
  
        await logToEventHub({
        // Send structured failure log to Event Hub for monitoring and alerting
        type: "ERROR",
        // ERROR indicates the operation failed and needs attention
        detailMessage: errorMessage,
        // Detailed error message stored in logs
        programName,
        // Identify the API/service that failed
        startDatetime: requestStartTime,
        // Include start time so we know how long it ran before failing
        status: "FAILED",
        // Mark operation status as failed
        actionType: "Spark_SQL_Query",
        // Indicate it failed during query execution
        actionDescription: `Failed to run delete query to delete role for: ${role_id}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});