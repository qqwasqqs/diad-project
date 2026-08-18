/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026


  Purpose of the script:
    This script defines API endpoints for managing Dashboard RBAC Groups.
    It supports retrieving, creating, updating, and deleting groups stored
    in Databricks while enforcing Role-Based Access Control (RBAC) policies.


    The API integrates with Azure Event Hub for operational logging and
    auditing, validates management scope access before modification
    operations, and ensures that only authorized administrators can
    manage groups within their assigned RBAC scope.


  Key Features:
    - Retrieves all visible groups based on RBAC management visibility rules
    - Creates new dashboard groups
    - Updates existing groups after RBAC scope validation
    - Deletes groups after RBAC scope validation
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
  DASHBOARD_GROUPS_TABLE, // Databricks RBAC table used to store group information
} from "@/constants/config"; // Project-level configuration constants
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:read cannot call GET successfully.
import { withAuthorization } from "@/lib/rbac/authorize";



/*
  @/lib/rbac/managementScope


    - What it is:
        Utility module that generates RBAC scope filters for
        dashboard group management operations.


    - Why used:
        Restricts visibility and modification of groups to only
        those that fall within the administrator's assigned scope.
*/
import {
    buildManagementGroupAccessAndClause,
    buildManagementGroupVisibilityAndClause,
  } from "@/lib/rbac/managementScope";


/*
  @/lib/rbac/sql


    - What it is:
        SQL utility module for safely formatting values before
        they are included in dynamic SQL statements.


    - Why used:
        Prevents malformed SQL and ensures identifiers and values
        are properly escaped before query execution.
*/
import { sqlString } from "@/lib/rbac/sql";



// Builds the group list query with roles-management group-level visibility.
// Example: Super Admin gets all groups; normal admins get assigned groups plus groups they created.
const getGroups = (request: NextRequest) => `
-- Select all available columns from the dashboard groups table using alias g
SELECT g.*
-- Read records from the configured Databricks dashboard groups table and assign alias g
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g
-- Start the WHERE clause with a condition that is always true so dynamic filters can be appended cleanly
WHERE 1 = 1
-- Append the RBAC visibility filter so the user only sees groups allowed by management visibility rules
  ${buildManagementGroupVisibilityAndClause(request, "g.group_id", "g.created_by")}
-- Sort the final result set alphabetically by group name for stable display ordering
ORDER BY g.group_name
`;


/*
  Builds the SQL INSERT statement for creating a new dashboard group.


  Why used:
      Creates a new group record with generated group ID,
      audit information, and timestamps.


  Example:
      Group Name: Data Quality Admins
      Description: Administrators responsible for DQ operations
*/
const addNewGroup = (
    group_name: string, // Name of the new dashboard group
    description: string, // Description of the new group's purpose
    created_by: string, // User ID of the admin creating this group
) => `-- Insert a new record into the configured dashboard groups table
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} (
-- Column that stores the unique identifier for the new group
    group_id,
-- Column that stores the human-readable name of the group
    group_name,
-- Column that stores the description of the group
    description,
-- Column that stores when the group was created
    created_at,
-- Column that stores which user created the group
    created_by,
-- Column that stores the latest update timestamp for the group
    updated_at,
-- End of the target column list for the insert operation
    group_type,
    source
) VALUES (
-- Insert a generated group identifier prefixed with g_
    '${"g_"+crypto.randomUUID()}',
-- Insert the provided group name into the group_name column
    '${group_name}',
-- Insert the provided description into the description column
    '${description}',
-- Insert the current ISO timestamp as the created_at value
    '${new Date().toISOString()}',
-- Insert the creating user identifier as the created_by value
    '${created_by}',
-- Insert the current ISO timestamp as the initial updated_at value
    '${new Date().toISOString()}',
-- End of the values list for the insert operation
    'CUSTOM',
    'MANUAL'
)`


/*
  Builds the SQL UPDATE statement for modifying an existing group.


  Why used:
      Updates group metadata and active status while
      preserving audit information.


  Example:
      Change description
      Rename group
      Activate/deactivate group
*/
const updateGroup = (
    group_id: string, // ID of the group record to update
    group_name?: string, // New group name, if changed
    description?: string, // New description, if changed
    is_active: boolean = true, // New active/inactive status
) => `
-- Update an existing record in the configured dashboard groups table
UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} 
-- Begin setting the columns that need to be modified for the selected group
SET ${group_name ? `group_name = '${group_name}',` : ``}
-- Conditionally update the description column only when a new description value is provided
    ${description ? `description = '${description}',` : ``}
-- Update the is_active flag based on the boolean value supplied to the function
    ${is_active===true ? `is_active = TRUE,` : `is_active = FALSE,`}
-- Always refresh the updated_at column to the current ISO timestamp
    updated_at = '${new Date().toISOString()}'
-- Restrict the update to the specific group identified by group_id
WHERE group_id = '${group_id}'
`;



/*
  Builds the SQL DELETE statement for removing a dashboard group.


  Why used:
      Permanently removes the specified group from the
      dashboard_groups table.


  Example:
      DELETE group_id = g_12345
*/
const deleteGroup = (
    group_id: string // ID of the group record to delete
) => `
-- Delete the matching record from the configured dashboard groups table
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} WHERE group_id='${group_id}'
`


/**
 * Retrieves all dashboard groups visible to the current user.
 *
 * RBAC Behavior:
 *   - Super Admins can view all groups.
 *   - Standard administrators can view only groups within
 *     their management visibility scope.
 *
 * @param request Incoming Next.js request object.
 * @returns List of dashboard groups as JSON.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardGroupsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    try { // Begin main logic; any errors are caught and logged below
        console.info("Received request to get dashboard groups") // Log that the GET request has started


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database        


        const result = await executeQuery(session, getGroups(request)); // Execute the groups query scoped by RBAC visibility and capture the resulting rows


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Groups`,
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
            actionDescription: `Fetch All Dashboard Groups`,
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
        const errorMessage = `Error fetching dashboard groups: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard groups."}`;
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
        actionDescription: `Failed to fetch dashboard groups: ${error}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }


    
});



 /**
 * Creates a new dashboard group.
 *
 * Validation:
 *   - Prevents duplicate group names.
 *   - Generates a unique group identifier.
 *
 * RBAC Behavior:
 *   - User must possess roles-management create permissions.
 *
 * @param request Incoming Next.js request object containing
 *                group name and description.
 * @returns Newly created group information.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {


    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardGroupsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    //get the request body schema and the data required to create a group.
    const group_name = body?.group_name // New group's name
    const description = body?.description // New group's description
    const created_by = user // Record the requesting user as the creator



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // check if group already exist 
        const checkGroup = `-- Select all columns to check whether a group with the provided name already exists
SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} WHERE group_name='${group_name}'` // Query to check whether a group with this name already exists
        const userPresent = await executeQuery(session, checkGroup); // Execute the duplicate-check query


        // check if a group is already present or not 
        if (userPresent.length!==0) { // If a group with this name already exists, reject the request


            // Error message
            const errorMessage = "A group with this Group Name is already present."; // Message returned to the caller


            // Log error message for debugging.
            console.error(errorMessage); // Log the duplicate-name error


            // Return error to user.
            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Respond with 400 Bad Request since the group name is a duplicate
        };


        // Generate query for adding new group.
        const query = addNewGroup(group_name, description, created_by); // Build the INSERT statement for the new group
        
        // execute the create group query
        const result = await executeQuery(session, query); // Execute the INSERT and capture the result


        console.log("Add New Group Response: ", result); // Log the database response for the insert


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Group with name: ${group_name}`,
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
            actionDescription: `Add New Group in the table: ${DASHBOARD_GROUPS_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result);
        // Send the insert result back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails


        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Adding new group: ${(error as Error)?.message ?? "Unknown error occurred while creating new group."}`;
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
        actionDescription: `Failed to run insert query to add new group for: ${body.group_name} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});


 /**
 * Updates an existing dashboard group.
 *
 * Validation:
 *   - Verifies that the target group exists.
 *   - Verifies that the current user has management access
 *     to the specified group.
 *
 * RBAC Behavior:
 *   - User can only update groups within their assigned
 *     management scope.
 *
 * @param request Incoming request containing updated group data.
 * @returns Update execution result.
 */
export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardGroupsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    const group_id = body.group_id // ID of the group record to update
    const group_name = body?.group_name // New group name, if provided
    const description = body?.description // New description, if provided
    const is_active = body?.is_active // New active/inactive flag, if provided



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // Check that the group exists and is one of the groups the current admin can manage.
        // Example: a Group A admin cannot update unrelated Group B.
        const checkGroup = `
-- Select all columns from the dashboard groups table to verify the target group exists and is manageable
            SELECT *
-- Read records from the configured Databricks dashboard groups table using alias g
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g
-- Filter the result to the specific group identifier provided in the request
            WHERE g.group_id = ${sqlString(group_id)}
-- Append the RBAC access clause so only groups within the user's management scope are considered valid
              ${buildManagementGroupAccessAndClause(request, "g.group_id")}
        `; // Query to verify the group exists and is within the admin's management access scope
        const groupPresent = await executeQuery(session, checkGroup); // Execute the group access-check query


        if (groupPresent.length===0) { // If no matching/accessible group was found, reject the update
            const errorMessage = `Group with this group_id does not exist or is outside your roles-management access: ${group_id}`; // Message returned to the caller


            console.error(errorMessage); // Log the access/existence error


            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the group access check failed
        };


        const query = updateGroup(group_id, group_name, description, is_active); // Build the UPDATE statement with the new field values


        const result = await executeQuery(session, query); // Execute the UPDATE and capture the result


        console.log("Update Group Response: ", result); // Log the database response for the update


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully updated group: ${group_name}`,
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
            actionDescription: `Update Group in the table: ${DASHBOARD_GROUPS_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result);
        // Send the update result back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails


        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Updating group: ${(error as Error)?.message ?? "Unknown error occurred while updating new user."}`;
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
        actionDescription: `Failed to run update query to update group for: ${body.group_name} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});


 /**
 * Deletes a dashboard group.
 *
 * Validation:
 *   - Verifies that the group exists.
 *   - Verifies that the user has management access to the group.
 *
 * RBAC Behavior:
 *   - Users cannot delete groups outside their management scope.
 *
 * @param request Incoming request containing group_id query parameter.
 * @returns Delete execution result.
 */
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardGroupsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Extract query parameters from the request URL
  
    const group_id = searchParams.get("group_id"); // Get the group_id to delete from the query string
    
    if(!group_id) { // If no group_id was provided, reject the request
      return NextResponse.json({error:"group_id is null."}, {status:400}); // Respond with 400 Bad Request since group_id is required
    }
  
    try { // Begin main logic; any errors are caught and logged below
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the group exists and is one of the groups the current admin can manage.
        // Example: a Group A admin cannot delete unrelated Group B.
        const checkGroup = `
-- Select all columns from the dashboard groups table to verify the target group exists and is deletable by this user
            SELECT *
-- Read records from the configured Databricks dashboard groups table using alias g
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g
-- Filter the result to the specific group identifier supplied for deletion
            WHERE g.group_id = ${sqlString(group_id)}
-- Append the RBAC access clause so only groups within the user's management scope can be deleted
              ${buildManagementGroupAccessAndClause(request, "g.group_id")}
        `; // Query to verify the group exists and is within the admin's management access scope
        const groupPresent = await executeQuery(session, checkGroup); // Execute the group access-check query
  
        if (groupPresent.length===0) { // If no matching/accessible group was found, reject the deletion
            const errorMessage = `This group_id does not exist or is outside your roles-management access: ${group_id}`; // Message returned to the caller
  
            console.error(errorMessage); // Log the access/existence error
  
            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the group access check failed
        };
  
        const query = deleteGroup(group_id); // Build the DELETE statement for this group
  
        const result = await executeQuery(session, query); // Execute the DELETE and capture the result
  
        console.log("Delete Group Response: ", result); // Log the database response for the delete
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully deleted: ${group_id}`,
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
            actionDescription: `Delete Group from the table: ${DASHBOARD_GROUPS_TABLE}`,
            // Describe the action performed and table used
            user,
            // Record who triggered the API call (audit requirement)
        });
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json(result);
        // Send the delete result back to the frontend as JSON
        
    } catch (error: unknown) {
        // Catch block: runs if Databricks connection or query execution fails
  
        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Deleting group: ${(error as Error)?.message ?? "Unknown error occurred while deleting group."}`;
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
        actionDescription: `Failed to run delete query to delete group for: ${group_id}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});