/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Atharva Mundhada
  Date: 15 May 2026
  
  Purpose of the script:
    This script defines API endpoints for managing Dashboard RBAC Users.
    It supports retrieving, creating, updating, and deleting users stored
    in Databricks while enforcing Role-Based Access Control (RBAC) policies.


    The API integrates with Azure Event Hub for operational logging and
    auditing, validates management scope access before modification
    operations, and ensures that only authorized administrators can
    manage users within their assigned RBAC scope.


  Key Features:
    - Retrieves all visible users based on RBAC management visibility rules
    - Creates new dashboard users with email and Azure OID validation
    - Updates existing users after RBAC scope validation
    - Deletes users after RBAC scope validation
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
  DASHBOARD_USERS_TABLE,
} from "@/constants/config"; // Project-level configuration constants
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:write cannot create or update RBAC users.
import { withAuthorization } from "@/lib/rbac/authorize";
// User access is used for operations; user visibility also includes users created by the current admin.
// Example: a creator can see a new standalone user, but can update it only after RBAC access is assigned.
import {
  buildManagementUserAccessAndClause,
  buildManagementUserVisibilityAndClause,
} from "@/lib/rbac/managementScope";
// sqlString safely quotes incoming ids before they are used in SQL checks.
// Example: user id u_123 becomes 'u_123'.
import { sqlString } from "@/lib/rbac/sql";



// Builds the user list query with roles-management user-level visibility.
// Example: Super Admin gets all users; normal admins get group-shared users plus users they created.
const getUsers = (request: NextRequest) => `
-- Select all available columns from the dashboard users table using alias u
SELECT u.*
-- Read rows from the configured dashboard users table and assign alias u
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} u
-- Start the WHERE clause with an always-true condition so dynamic RBAC visibility filters can be appended safely
WHERE 1 = 1
-- Append the RBAC visibility clause so the current user only sees users allowed by management visibility rules
  ${buildManagementUserVisibilityAndClause(request, "u.user_id", "u.created_by")}
-- Sort the final result set alphabetically by display name for consistent UI ordering
ORDER BY u.display_name
`;


// Builds the SQL INSERT statement for creating a new dashboard user record with a generated user_id and audit timestamps.
const addNewUser = (
    email: string, // Email address of the new user (used as unique identifier for signup/login)
    display_name: string, // Human-readable display name for the user
    azure_oid: string, // Azure Object ID (OID) linking to the user's Azure AD/Entra ID account
    created_by: string // User ID of the admin creating this user
    ) => `-- Insert a new user record into the configured dashboard users table
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} (
-- Column that stores the unique identifier for the user
            user_id,
-- Column that stores the user's email address
            email,
-- Column that stores the user's display name
            display_name,
-- Column that stores the Azure Object ID for identity linkage
            azure_oid,
-- Column that stores when the user record was created
            created_at,
-- Column that stores which user created this record
            created_by,
-- Column that stores the latest update timestamp for the user record
            updated_at
-- End of the target column list for the insert operation
          )
-- Begin the values section for the new user record
          values
-- Start the ordered values list matching the columns defined above
          (
-- Insert a generated user identifier prefixed with u_
            '${"u_"+crypto.randomUUID()}',
-- Insert the provided email address into the email column
            '${email}',
-- Insert the provided display name into the display_name column
            '${display_name}',
-- Insert the provided Azure Object ID into the azure_oid column
            '${azure_oid}',
-- Insert the current ISO timestamp as the created_at value
            '${new Date().toISOString()}',
-- Insert the creating user identifier as the created_by value
            '${created_by}',
-- Insert the current ISO timestamp as the initial updated_at value
            '${new Date().toISOString()}'
-- End of the values list for the insert statement
          )
`;


// Builds the SQL UPDATE statement for modifying an existing dashboard user's fields and refreshing its updated_at timestamp.
const updateUser = (
    user_id: string, // ID of the user record to update
    email?: string, // New email address, if changed
    display_name?: string, // New display name, if changed
    azure_oid?: string, // New Azure OID, if changed
    is_active: boolean=true, // New active/inactive status
) => `
-- Update the existing user record in the configured dashboard users table
    UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE}
-- Begin setting the columns that need to be modified for the selected user
    SET ${email ? `email = '${email}',`: ``}
-- Conditionally update the display_name column only when a new display name value is provided
    ${display_name ? `display_name = '${display_name}',`: ``}
-- Conditionally update the azure_oid column only when a new Azure Object ID value is provided
    ${azure_oid ? `azure_oid = '${azure_oid}',`: ``}
-- Update the is_active flag based on the boolean value supplied to the function
    ${is_active==true ? `is_active = TRUE,`: `is_active = FALSE,`}
-- Always refresh the updated_at timestamp to record when the user was last modified
    updated_at = '${new Date().toISOString()}'
-- Restrict the update to the specific user identified by user_id
    WHERE user_id = '${user_id}'
`;


// Builds the SQL DELETE statement for removing a dashboard user from the database.
const deleteUser = (
    user_id: string // ID of the user record to delete
) => `
-- Delete the matching user record from the configured dashboard users table
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} WHERE user_id='${user_id}'
`


// GET handler: returns the list of dashboard users visible to the requesting user, wrapped with RBAC authorization.
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardUserAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    try { // Begin main logic; any errors are caught and logged below
        console.info("Received request to get dashboard users") // Log that the GET request has started


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database        


        const result = await executeQuery(session, getUsers(request)); // Execute the users query scoped by RBAC visibility and capture the resulting rows


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Users`,
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
            actionDescription: `Fetch All Dashboard Users`,
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
        const errorMessage = `Error fetching dashboard users: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard users."}`;
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
        actionDescription: `Failed to fetch dashboard users: ${error}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }


    
});


// POST handler: validates and inserts a new dashboard user record, wrapped with RBAC authorization.
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {


    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardUserAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
    
    const body = await request.json(); // Parse the incoming JSON request body
    
    try { // Begin main logic; any errors are caught and logged below
        const email = body?.email; // New user's email address
        const display_name = body?.display_name; // New user's display name
        const azure_oid = body?.azure_oid; // New user's Azure OID
        const created_by = user; // Record the requesting user as the creator
            
        
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // check if user already exist 
        const checkUser = `-- Select all columns to check whether a user with the provided email address already exists
SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} WHERE email='${email}'` // Query to check whether a user with this email already exists
        const userPresent = await executeQuery(session, checkUser); // Execute the duplicate-check query


        if (userPresent.length!==0) { // If a user with this email already exists, reject the request
            const errorMessage = "User with this email is already present."; // Message returned to the caller


            console.error(errorMessage); // Log the duplicate-email error


            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Respond with 400 Bad Request since the email is a duplicate
        };


        const query = addNewUser(email, display_name, azure_oid, created_by); // Build the INSERT statement for the new user


        const result = await executeQuery(session, query); // Execute the INSERT and capture the result


        console.log("Add New User Response: ", result); // Log the database response for the insert


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New User with email: ${email}`,
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
            actionDescription: `Add New User in the table: ${DASHBOARD_USERS_TABLE}`,
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
        const errorMessage = `Error Adding new user: ${(error as Error)?.message ?? "Unknown error occurred while adding new user."}`;
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
        actionDescription: `Failed to run insert query to add new user for: ${body?.email} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});



// PUT handler: validates RBAC access to the target user and updates its fields, wrapped with RBAC authorization.
export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardUserAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    const user_id = body.user_id // ID of the user record to update
    const email = body?.email; // New email address, if provided
    const display_name = body?.display_name; // New display name, if provided
    const azure_oid = body?.azure_oid; // New Azure OID, if provided
    const is_active = body?.is_active; // New active/inactive flag, if provided



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // Check that the user exists and shares at least one active RBAC group with the current admin.
        // Example: a Group A admin cannot update a user assigned only to Group B.
        const checkUser = `
-- Select all columns from the dashboard users table to verify the target user exists and is within management access
            SELECT *
-- Read records from the configured dashboard users table using alias u
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} u
-- Filter the result to the specific user identifier provided in the request
            WHERE u.user_id = ${sqlString(user_id)}
-- Append the RBAC access clause so only users within the user's management scope are considered valid for update
              ${buildManagementUserAccessAndClause(request, "u.user_id")}
        ` // Query to verify the user exists and is within the admin's management access scope
        const userPresent = await executeQuery(session, checkUser); // Execute the access-check query


        if (userPresent.length===0) { // If no matching/accessible user was found, reject the update
            const errorMessage = "User with this user_id does not exist or is outside your roles-management access."; // Message returned to the caller


            console.error(errorMessage); // Log the access/existence error


            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access/existence check failed
        };


        const query = updateUser(user_id, email, display_name, azure_oid, is_active); // Build the UPDATE statement with the new field values


        const result = await executeQuery(session, query); // Execute the UPDATE and capture the result


        console.log("Update User Response: ", result); // Log the database response for the update


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully updated user with email: ${email}`,
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
            actionDescription: `Update User in the table: ${DASHBOARD_USERS_TABLE}`,
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
        const errorMessage = `Error Updating user: ${(error as Error)?.message ?? "Unknown error occurred while updating new user."}`;
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
        actionDescription: `Failed to run update query to update user for: ${body?.email} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});



// DELETE handler: validates RBAC access before deleting a user, wrapped with RBAC authorization.
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardUserAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Extract query parameters from the request URL
  
    const user_id = searchParams.get("user_id"); // Get the user_id to delete from the query string
    
    if(!user_id) { // If no user_id was provided, reject the request
      return NextResponse.json({error:"user_id is null."}, {status:400}); // Respond with 400 Bad Request since user_id is required
    }
  
    try { // Begin main logic; any errors are caught and logged below
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the user exists and shares at least one active RBAC group with the current admin.
        // Example: a Group A admin cannot delete a user assigned only to Group B.
        const checkUser = `
-- Select all columns from the dashboard users table to verify the target user exists and is within management access
            SELECT *
-- Read records from the configured dashboard users table using alias u
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} u
-- Filter the result to the specific user identifier supplied for deletion
            WHERE u.user_id = ${sqlString(user_id)}
-- Append the RBAC access clause so only users within the current admin's management scope can be deleted
              ${buildManagementUserAccessAndClause(request, "u.user_id")}
        ` // Query to verify the user exists and is within the admin's management access scope
        const userPresent = await executeQuery(session, checkUser); // Execute the access-check query
  
        if (userPresent.length===0) { // If no matching/accessible user was found, reject the deletion
            const errorMessage = `This user_id does not exist or is outside your roles-management access: ${user_id}`; // Message returned to the caller
  
            console.error(errorMessage); // Log the access/existence error
  
            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access/existence check failed
        };
  
        const query = deleteUser(user_id); // Build the DELETE statement for this user
  
        const result = await executeQuery(session, query); // Execute the DELETE and capture the result
  
        console.log("Delete User Response: ", result); // Log the database response for the delete
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully deleted: ${user_id}`,
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
            actionDescription: `DeleteUser from the table: ${DASHBOARD_USERS_TABLE}`,
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
        const errorMessage = `Error Deleting user: ${(error as Error)?.message ?? "Unknown error occurred while deleting user."}`;
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
        actionDescription: `Failed to run delete query to delete user for: ${user_id}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});