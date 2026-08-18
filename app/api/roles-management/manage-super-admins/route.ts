/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  
  Purpose of the script:
  This API module provides CRUD operations (GET, POST, DELETE) for managing Dashboard Super Admin assignments 
  and ownership. It handles the promotion and demotion of users to/from Super Admin status, enforces Super Admin 
  authorization checks, and manages user group membership removal for revoked admins. The module ensures that 
  only existing Super Admins can modify Super Admin assignments through header-based verification. All operations 
  are logged to Azure Event Hub for audit and monitoring purposes. The GET endpoint retrieves all current Super Admins 
  with their metadata, the POST endpoint adds new Super Admins (with optional removal from existing groups), and the 
  DELETE endpoint removes Super Admin privileges from users.
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

// @/constants/config
// What it is: A centralized configuration/constants module containing common project constants such as
// Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
// of approved Databricks schema names (SCHEMAS) used for filtering queries.
// Why used: To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
// promote consistency, reduce duplication, and simplify maintenance when these values change.
import {
  CATALOG_NAME, // Databricks catalog name used as the logical database container
  SCHEMA_NAME, // Databricks schema name used to organize tables within the catalog
  DASHBOARD_ADMINS_TABLE,
  DASHBOARD_GROUPS_TABLE,
  DASHBOARD_USERS_TABLE,
  DASHBOARD_USER_GROUP_ROLE_TABLE,
} from "@/constants/config"; // Project-level configuration constants

// @/lib/rbac/authorize
// What it is: Authorization middleware that validates user roles and permissions before API execution.
// Why used: To enforce role-based access control (RBAC) by checking if the logged-in user has 
// required permissions before allowing this API to run. This is a decorator/middleware that wraps
// the GET, POST, and DELETE handlers.
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:read cannot even list Super Admin assignments.
import { withAuthorization } from "@/lib/rbac/authorize"; // Authorization decorator/middleware for role permission checks

// @/lib/rbac/sql
// What it is: A SQL safety utility module that escapes and properly quotes SQL identifiers and values.
// Why used: To prevent SQL injection attacks by safely quoting user IDs and other dynamic values 
// before embedding them into SQL queries. Example: user id u_123 becomes 'u_123'.
import { sqlString } from "@/lib/rbac/sql"; // SQL string escaping utility to prevent injection


/* ----------------------------- SQL QUERY BUILDERS -------------------------------- */

// SQL query to fetch all Super Admins with their associated user details and metadata
// Template string defining the SQL query to retrieve all Super Admins
const getAllAdmins = ` 
SELECT 
    sat.user_id, -- Unique identifier of the Super Admin user
    sat.added_by, -- Audit field: user ID of who promoted this user to Super Admin
    sat.added_at, -- Audit field: timestamp when this user was added as Super Admin
    sat.is_active, -- Flag indicating if this Super Admin assignment is currently active
    ut.display_name, -- User's display name from the users table for UI presentation
    ut.email -- User's email address from the users table for contact/identification
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} sat -- Query from Super Admins table
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} ut -- Join with users table
    ON sat.user_id=ut.user_id`; // Match based on user_id to get user details

// Function to build a SQL INSERT query that adds a new Super Admin to the system
const addNewSuperAdmin = (
    user_id: string, // The unique identifier of the user being promoted to Super Admin
    added_by: string, // Audit field: user ID of who is performing this promotion
    is_active: boolean = true, // Boolean flag to set whether this Super Admin is initially active
    ) => `INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} (
            user_id, -- Column: the user being added as Super Admin
            added_by, -- Column: who performed the promotion (audit)
            added_at, -- Column: timestamp of promotion (set to current time)
            is_active -- Column: active status of this Super Admin assignment
          )
          values
          (
            '${user_id}', -- Value: Super Admin user ID (quoted for SQL safety)
            '${added_by}', -- Value: user performing promotion (quoted for SQL safety)
            '${new Date().toISOString()}', -- Value: current timestamp in ISO 8601 format
            ${is_active===true ? `TRUE`:`FALSE`} -- Value: boolean flag (TRUE or FALSE based on parameter)
          )
`; // End INSERT query construction

// Function to build a SQL DELETE query that removes a user from the Super Admin table
const deleteUser = (
    user_id: string // The unique identifier of the Super Admin user to be removed
) => `
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} WHERE user_id='${user_id}' -- Delete the Super Admin record for this user
`; // End DELETE query construction

// Function to build a SQL query that checks which groups a user is a member of
const checkIfPresentInGroup = (user_id:string) => ` -- Query to find all groups this user belongs to
SELECT 
    ugr.user_id, -- User ID from the user-group-role mapping table
    g.group_id, -- Group ID from the groups table
    g.group_name -- Group name from the groups table for display purposes
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} ugr -- Query from user-group-role mappings
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g -- Join with groups table
    ON g.group_id = ugr.group_id -- Match based on group_id
WHERE ugr.user_id='${user_id}'`; // Filter for the specific user ID (SQL injection risk - should use sqlString)

// Function to build a SQL DELETE query that removes a user from all groups they belong to
// Query to delete all group memberships for this user
const removeUserFromGroups = (user_id:string) => `
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE} -- Delete from mappings table
WHERE user_id='${user_id}'`; // Remove all records where this user is assigned to groups

/* ----------------------------- AUTHORIZATION HELPERS -------------------------------- */

// Function to verify that the current user is a database-backed Super Admin before allowing Super Admin modifications
// Verifies that the current user is a database-backed Super Admin before changing Super Admin assignments.
// Example: x-rbac-super-admin=true is added only after dashboard_super_admins confirms the user is active.
function requireSuperAdmin(request: NextRequest): NextResponse | null { // Authorization check function
    // Read the Super Admin flag created by the RBAC authorization layer.
    const isSuperAdmin = request.headers.get("x-rbac-super-admin") === "true"; // Check if header indicates Super Admin status

    // Super Admins may continue to the actual API logic.
    if (isSuperAdmin) { // If the user is a Super Admin
        return null; // Return null to allow the handler to proceed
    }

    // Everyone else receives a clear denial response.
    return NextResponse.json( // Non-Super Admins get denied
        { error: "Only Super Admins can manage Super Admin assignments." }, // Error message explaining the restriction
        { status: 403 } // HTTP 403 Forbidden status code
    );
}

/* ----------------------------- GET EXPORT (RETRIEVE ALL SUPER ADMINS) -------------------------------- */

// Export GET handler: Retrieves all Dashboard Super Admins with their metadata
// Authorization: Requires withAuthorization middleware (checks roles-management:read permission)
// Additional check: Requires Super Admin status via requireSuperAdmin function
// Purpose: Fetch and display the list of all current Super Admins/owners in the system
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> { // GET handler wrapped with authorization middleware
  
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)

    const programName = "DashboardAdminsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API

    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
    
    const superAdminDeniedResponse = requireSuperAdmin(request); // Perform additional Super Admin authorization check
    // Verify that the requester is a Super Admin before allowing access to Super Admin data
    if (superAdminDeniedResponse) return superAdminDeniedResponse; // If not a Super Admin, return the 403 error response

    try { // Begin try block to catch any errors during query execution
        console.info("Received request to get dashboard owners"); // Log that the GET request was received
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a session to connect to Databricks
        // Open (or reuse) a secure connection/session to Databricks database        

        const result = await executeQuery(session, getAllAdmins); // Execute the Super Admins query
        // Run the SQL query getAllAdmins and capture the result rows

        // Log the success of the operation to Event Hub.
        await logToEventHub({ // Send a structured success log record to Azure Event Hub
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO", // Log level indicating this is an informational/success message
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Owners`, // Human-readable success message
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            programName, // The API name that generated this log entry
            // Include API name in log for clear tracking
            startDatetime: requestStartTime, // The time when this API call started
            // Include start time so duration can be measured
            status: "SUCCESS", // Operation completed without errors
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query", // Categorizes the operation as a SQL query
            // Categorize action type as SQL query execution
            actionDescription: `Fetch All Dashboard Owners`, // Describes what action was performed
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
        const errorMessage = `Error fetching dashboard owners: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard owners."}`; // Construct error message
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
        actionDescription: `Failed to fetch dashboard owners: ${error}`, // Details about what failed
        // Describe what it tried to do for better investigation
        user, // The user ID whose request caused the error
        // Include which user triggered the failing request
        }); // End Event Hub error log

        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }

    
}); // End GET handler export

/* ----------------------------- POST EXPORT (ADD NEW SUPER ADMIN) -------------------------------- */

// Export POST handler: Adds a new Super Admin to the system
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Additional check: Requires Super Admin status via requireSuperAdmin function
// Purpose: Promote a user to Super Admin with optional removal from existing groups
// Request body: { user_id: string, is_active: boolean, confirmRemoveUser?: boolean }
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> { // POST handler wrapped with authorization middleware

    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)

    const programName = "DashboardAdminsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API

    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
    
    const superAdminDeniedResponse = requireSuperAdmin(request); // Perform additional Super Admin authorization check
    // Verify that the requester is a Super Admin before allowing creation of new Super Admins
    if (superAdminDeniedResponse) return superAdminDeniedResponse; // If not a Super Admin, return the 403 error response
    
    const body = await request.json(); // Parse the JSON request body containing user details
    // Deserialize the POST body to access user_id, is_active, and confirmRemoveUser parameters
    
    try { // Begin try block to catch errors during validation and query execution
        const user_id = body?.user_id; // Extract the user ID of the user being promoted to Super Admin
        // The user who will be added as a Super Admin
        const is_active = body?.is_active; // Extract the active status flag from the request body
        // Whether this Super Admin assignment should be active immediately
        const confirmRemoveUser = body?.confirmRemoveUser; // Extract confirmation flag for group removal
        // Whether the user has confirmed removal from existing groups before promotion
        
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a Databricks SQL session
        // Open (or reuse) a secure connection/session to Databricks database
        
        const userInGroup = await executeQuery(session, checkIfPresentInGroup(user_id)); // Check which groups this user is currently a member of
        // Query the database to see if the user has any existing group assignments

        if(userInGroup.length>0 && !confirmRemoveUser){ // If user is in groups and hasn't confirmed removal
            return NextResponse.json({isUserInAGroup:true, userInGroup}); // Return the list of groups without proceeding
            // Tell the frontend that the user must confirm removal from these groups first
        }

        if(confirmRemoveUser){ // If user confirmed removal from groups
            try{ // Nested try block for group removal operation
                await executeQuery(session, removeUserFromGroups(user_id)); // Execute the removal query
                // Delete all user-group-role mappings for this user

            }
            catch { // If group removal fails
                return NextResponse.json({error:"an error occurred while removing user from groups."}, {status:500}); // Return error response
                // HTTP 500 indicates the server encountered an error
            }
        }
        
        console.debug("Received request body:", JSON.stringify(body)); // Log the incoming request body for debugging
        // Print the full request payload for troubleshooting
        // Open (or reuse) a secure connection/session to Databricks database
        
        // check if admin already exist 
        const checkAdmin = `SELECT user_id FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} WHERE user_id=${sqlString(user_id)} AND is_active = TRUE`; // SQL query to check if user is already a Super Admin
        // Query to see if this user already has active Super Admin status
        const adminPresent = await executeQuery(session, checkAdmin); // Execute the admin existence check
        // Run the query to see if a record exists for this user

        if (adminPresent.length!==0) { // If the query returned results (user already is a Super Admin)
            const errorMessage = "User is already owner."; // Set error message
            // The user already has Super Admin privileges

            console.error(errorMessage); // Log the validation failure to console
            // Print the error for debugging purposes

            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Return 400 Bad Request
            // HTTP 400 indicates the request is invalid (user already an admin)
        };

        const checkUser = `SELECT user_id FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE} WHERE user_id=${sqlString(user_id)}`; // SQL query to verify the user exists
        // Query to check if the user ID exists in the users table
        const usernotPresent = await executeQuery(session, checkUser); // Execute the user existence check
        // Run the query to see if a user record exists

        if (usernotPresent.length===0) { // If the query returned no results (user doesn't exist)
            const errorMessage = "User not found."; // Set error message
            // The specified user ID was not found in the system

            console.error(errorMessage); // Log the validation failure to console
            // Print the error for debugging purposes

            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Return 400 Bad Request
            // HTTP 400 indicates the request is invalid (user doesn't exist)
        };

        const query = addNewSuperAdmin(user_id, user, is_active); // Build the INSERT query to add new Super Admin
        // Construct the SQL INSERT statement using the helper function

        const result = await executeQuery(session, query); // Execute the INSERT query against Databricks
        // Run the SQL to create the new Super Admin record

        console.log("Add New Admin Response: ", result); // Log the database response for debugging
        // Print the result to console (typically shows rows affected or query status)

        // Log the success of the operation to Event Hub.
        await logToEventHub({ // Send success log to Azure Event Hub
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO", // Log level for successful operation
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Owner with user_id: ${user_id}`, // Human-readable success message including the new Super Admin's user ID
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            programName, // API name for log filtering
            // Include API name in log for clear tracking
            startDatetime: requestStartTime, // When the operation started
            // Include start time so duration can be measured
            status: "SUCCESS", // Operation completed successfully
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query", // Categorizes as SQL operation
            // Categorize action type as SQL query execution
            actionDescription: `Add New Owner in the table: ${DASHBOARD_ADMINS_TABLE}`, // Describes the operation performed
            // Describe the action performed and table used
            user, // User who performed the operation
            // Record who triggered the API call (audit requirement)
        }); // End Event Hub success log
        // End Event Hub success log
    
        // Return the configured rules data as a JSON response.
        return NextResponse.json({isUserInAGroup:false,result}); // Return success response with result data
        // Send the database response back to the frontend with group status flag
        
    } catch (error: unknown) { // Catch any errors from validation or database operations
        // Catch block: runs if Databricks connection or query execution fails

        // Log the error event to Event Hub in case of failure.
        const errorMessage = `Error Adding new owner: ${(error as Error)?.message ?? "Unknown error occurred while adding new owner."}`; // Construct comprehensive error message
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
        actionDescription: `Failed to run insert query to add new owner for: ${body?.user_id} with payload: ${JSON.stringify(body)}`, // Detailed description of attempted action
        // Describe what it tried to do for better investigation
        user, // User whose request failed
        // Include which user triggered the failing request
        }); // End Event Hub error log

        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
}); // End POST handler export


/* ----------------------------- DELETE EXPORT (REMOVE SUPER ADMIN) -------------------------------- */

// Export DELETE handler: Removes a user from Super Admin status
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Additional check: Requires Super Admin status via requireSuperAdmin function
// Purpose: Revoke Super Admin privileges from a user
// Query parameter: ?user_id=xyz (the Super Admin to be removed)
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> { // DELETE handler wrapped with authorization middleware
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardAdminsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
    
    const superAdminDeniedResponse = requireSuperAdmin(request); // Perform additional Super Admin authorization check
    // Verify that the requester is a Super Admin before allowing removal of Super Admins
    if (superAdminDeniedResponse) return superAdminDeniedResponse; // If not a Super Admin, return the 403 error response
  
    const { searchParams } = new URL(request.url); // Parse URL query parameters
    // Extract query string parameters from the request URL
  
    const user_id = searchParams.get("user_id"); // Extract the user_id query parameter
    // The user ID of the Super Admin to be removed
    
    if(!user_id) { // Validate that user_id parameter was provided
      return NextResponse.json({error:"user_id is null."}, {status:400}); // Return 400 Bad Request if user_id is missing
      // HTTP 400 indicates the client made a bad request (missing required parameter)
    }
  
    try { // Begin try block to catch errors during validation and deletion
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a Databricks SQL session
        // Open (or reuse) a secure connection/session to Databricks database
  
        // check if user already exist 
        const checkOwner = `SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE} WHERE user_id=${sqlString(user_id)}`; // SQL query to verify the Super Admin exists
        // Query to check if this user ID exists in the Super Admins table
        const ownerPresent = await executeQuery(session, checkOwner); // Execute the Super Admin existence check
        // Run the query to see if a Super Admin record exists for this user
  
        if (ownerPresent.length===0) { // If the query returned no results (user is not a Super Admin)
            const errorMessage = `This owner with user_id does not exist: ${user_id}`; // Set error message
            // The specified user is not a Super Admin
  
            console.error(errorMessage); // Log the validation failure to console
            // Print the error for debugging
  
            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Return 400 Bad Request
            // HTTP 400 indicates the request is invalid (user not found as Super Admin)
        };
  
        const query = deleteUser(user_id); // Build the DELETE query using helper function
        // Construct the SQL DELETE statement to remove the Super Admin record
  
        const result = await executeQuery(session, query); // Execute the DELETE query against Databricks
        // Run the SQL to delete the Super Admin record
  
        console.log("Delete User Response: ", result); // Log the database response for debugging
        // Print the result to console (typically shows rows affected or query status)
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({ // Send success log to Azure Event Hub
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO", // Log level for successful operation
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully deleted: ${user_id}`, // Human-readable success message including the deleted Super Admin's user ID
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            programName, // API name for log filtering
            // Include API name in log for clear tracking
            startDatetime: requestStartTime, // When the operation started
            // Include start time so duration can be measured
            status: "SUCCESS", // Operation completed successfully
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query", // Categorizes as SQL operation
            // Categorize action type as SQL query execution
            actionDescription: `Delete Owner from the table: ${DASHBOARD_ADMINS_TABLE}`, // Describes the operation performed
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
        const errorMessage = `Error Deleting owner: ${(error as Error)?.message ?? "Unknown error occurred while deleting owner."}`; // Construct comprehensive error message
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
        actionDescription: `Failed to run delete query to delete owner for: ${user_id}`, // Detailed description of attempted action
        // Describe what it tried to do for better investigation
        user, // User whose request failed
        // Include which user triggered the failing request
        }); // End Event Hub error log
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
}); // End DELETE handler export