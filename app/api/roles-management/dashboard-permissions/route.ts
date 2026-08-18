/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  Purpose of the script:
    This script defines API endpoints for managing Dashboard Permissions.
    It supports retrieving, creating, and updating permissions stored
    in Databricks while enforcing Role-Based Access Control (RBAC).


    The API integrates with Azure Event Hub for operational logging
    and auditing, validates management access before updates, and
    ensures administrators can only manage permissions within their
    authorized RBAC scope.
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
  DASHBOARD_PERMISSIONS_TABLE,
} from "@/constants/config"; // Project-level configuration constants
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:read cannot list dashboard permissions.
import { withAuthorization } from "@/lib/rbac/authorize";
// Permission access is used for operations; visibility also includes permissions created by the current admin.
// Example: a creator can see a new standalone permission, but can update it only after RBAC access is assigned.
import {
  buildManagementPermissionAccessAndClause,
  buildManagementPermissionVisibilityAndClause,
} from "@/lib/rbac/managementScope";
// sqlString safely quotes incoming permission ids before they are used in SQL checks.
// Example: permission id p_123 becomes 'p_123'.
import { sqlString } from "@/lib/rbac/sql";



// Builds the permission list query with roles-management visibility through role/group usage or creator ownership.
// Example: Super Admin gets all permissions; normal admins get group-used permissions plus permissions they created.
const getPermissions = (request: NextRequest) => `
-- Select distinct permission records to avoid duplicates caused by RBAC visibility relationships
SELECT DISTINCT p.*
-- Read rows from the configured dashboard permissions table using alias p
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} p
-- Start the WHERE clause with a condition that is always true so dynamic RBAC filters can be appended safely
WHERE 1 = 1
-- Append the RBAC visibility clause so the current user only sees permissions allowed by management visibility rules
  ${buildManagementPermissionVisibilityAndClause(request, "p.permission_id", "p.created_by")}
-- Sort the final permission list by permission_key for consistent display order
ORDER BY p.permission_key
`;


// Builds the SQL INSERT statement for creating a new dashboard permission record with a generated permission_id and audit timestamps.
const addNewPermission = ( 
    permission_key:string, // Unique key identifying the permission (e.g. "users:read")
    category:string, // Grouping/category label the permission belongs to
    description:string, // Human-readable description of what the permission allows
    is_active:boolean=true, // Whether the permission is currently active/usable
    created_by:string, // User ID of the admin creating this permission
    ) => `-- Insert a new permission record into the configured dashboard permissions table
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} (
-- Column that stores the unique identifier for the permission
            permission_id,
-- Column that stores the unique permission key used by the application
            permission_key,
-- Column that stores the category or grouping for the permission
            category,
-- Column that stores the human-readable description of the permission
            description,
-- Column that stores whether the permission is active
            is_active,
-- Column that stores when the permission record was created
            created_at,
-- Column that stores which user created the permission
            created_by,
-- Column that stores the most recent update timestamp for the permission
            updated_at
-- End of the target column list for the insert operation
          )
-- Begin the values section for the new permission record
          values
-- Start the ordered values list matching the columns defined above
          (
-- Insert a generated permission identifier prefixed with p_
            '${"p_"+crypto.randomUUID()}',
-- Insert the provided permission key
            '${permission_key}',
-- Insert the provided category value
            '${category}',
-- Insert the provided permission description
            '${description}',
-- Insert the active flag as TRUE or FALSE based on the supplied boolean value
            '${is_active===true ? `TRUE`: `FALSE`}',
-- Insert the current ISO timestamp as the created_at value
            '${new Date().toISOString()}',
-- Insert the creating user identifier as the created_by value
            '${created_by}',
-- Insert the current ISO timestamp as the initial updated_at value
            '${new Date().toISOString()}'
-- End of the values list for the insert statement
          )
`;


// Builds the SQL UPDATE statement for modifying an existing dashboard permission's fields and refreshing its updated_at timestamp.
const updatePermission = (
    permission_id: string, // ID of the permission record to update
    permission_key?: string, // New permission key, if changed
    category?: string, // New category, if changed
    description?: string, // New description, if changed
    is_active: boolean=true, // New active/inactive status
) => `
-- Update the existing permission record in the configured dashboard permissions table
    UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE}
-- Begin setting the columns that need to be modified for the selected permission
    SET ${permission_key ? `permission_key = '${permission_key}',`: ``}
-- Conditionally update the category column only when a new category value is provided
    ${category ? `category = '${category}',`: ``}
-- Conditionally update the description column only when a new description value is provided
    ${description ? `description = '${description}',`: ``}
-- Update the is_active flag based on the boolean value supplied to the function
    ${is_active===true ? `is_active = TRUE,`: `is_active = FALSE,`}
-- Always refresh the updated_at timestamp to record when the permission was last modified
    updated_at = '${new Date().toISOString()}'
-- Restrict the update to the specific permission identified by permission_id
    WHERE permission_id = '${permission_id}'
`;


/**
 * Retrieves all dashboard permissions visible to the current user.
 *
 * RBAC Behavior:
 *   - Super Admins can view all permissions.
 *   - Standard administrators can view only permissions within
 *     their management visibility scope.
 *
 * @param request Incoming Next.js request object.
 * 
 * @returns List of dashboard permissions as JSON.
 */
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
  
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardPermissionsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    try { // Begin main logic; any errors are caught and logged below
        console.info("Received request to get dashboard permissions") // Log that the GET request has started


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database        


        const result = await executeQuery(session, getPermissions(request)); // Execute the permissions query scoped by RBAC visibility and capture the resulting rows


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Permissions`,
            // Human readable success message
            programName,
            // Include API name in log for clear tracking
            startDatetime: requestStartTime,
            // Include start time so duration can be measured
            status: "SUCCESS",
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query",
            // Categorize action type as SQL query execution
            actionDescription: `Fetch All Dashboard Permissions`,
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
        const errorMessage = `Error fetching dashboard permissions: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard permissions."}`;
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
        actionDescription: `Failed to fetch dashboard permissions: ${error}`,
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
 * Creates a new dashboard permission.
 *
 * Validation:
 *   - Prevents duplicate permission keys.
 *   - Generates a unique permission identifier.
 *
 * RBAC Behavior:
 *   - User must possess roles-management create permissions.
 *
 * @param request Incoming Next.js request object containing
 *                permission key and description.
 * @returns Newly created permission information.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {


    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardPermissionsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
    
    const body = await request.json(); // Parse the incoming JSON request body
    
    try { // Begin main logic; any errors are caught and logged below
        const permission_key = body?.permission_key; // New permission's unique key
        const category = body?.category; // New permission's category
        const description = body?.description; // New permission's description
        const is_active = body?.is_active; // New permission's active flag
        const created_by = user; // Record the requesting user as the creator
        
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // check if user already exist 
        const checkPermission = `-- Select all columns to check whether a permission with the provided key already exists
SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} WHERE permission_key='${permission_key}'` // Query to check whether a permission with this key already exists
        const permissionPresent = await executeQuery(session, checkPermission); // Execute the duplicate-check query


        if (permissionPresent.length!==0) { // If a permission with this key already exists, reject the request
            const errorMessage = "Permission with this key is already present."; // Message returned to the caller


            console.error(errorMessage); // Log the duplicate-key error


            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Respond with 400 Bad Request since the key is a duplicate
        };


        const query = addNewPermission(permission_key, category, description, is_active, created_by); // Build the INSERT statement for the new permission


        const result = await executeQuery(session, query); // Execute the INSERT and capture the result


        console.log("Add New Permission Response: ", result); // Log the database response for the insert


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Permission with key: ${permission_key}`,
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
            actionDescription: `Add New Permission in the table: ${DASHBOARD_PERMISSIONS_TABLE}`,
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
        const errorMessage = `Error Adding new permission: ${(error as Error)?.message ?? "Unknown error occurred while adding new permission."}`;
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
        actionDescription: `Failed to run insert query to add new permission for: ${body?.permission_key} with payload: ${JSON.stringify(body)}`,
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
 * Updates an existing dashboard permission.
 *
 * Validation:
 *   - Verifies that the target permission exists.
 *   - Verifies that the current user has management access
 *     to the specified permission.
 *
 * RBAC Behavior:
 *   - User can only update permissions within their assigned
 *     management scope.
 *
 * @param request Incoming request containing updated permission data.
 * @returns Update execution result.
 */
export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)


    const programName = "DashboardPermissionsAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API


    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing


    const body = await request.json(); // Parse the incoming JSON request body


    const permission_id = body.permission_id // ID of the permission record to update
    const permission_key = body?.permission_key; // New permission key, if provided
    const category = body?.category; // New category, if provided
    const description = body?.description; // New description, if provided
    const is_active = body?.is_active; // New active/inactive flag, if provided



    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging


        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database


        // Check that the permission exists and is connected to at least one role in the admin's RBAC groups.
        // Example: a Group A admin cannot update a permission used only in Group B.
        const checkPermission = `
-- Select all columns from the dashboard permissions table to verify the target permission exists and is within management access
            SELECT *
-- Read records from the configured dashboard permissions table using alias p
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} p
-- Filter the result to the specific permission identifier provided in the request
            WHERE p.permission_id = ${sqlString(permission_id)}
-- Append the RBAC access clause so only permissions within the user's management scope are considered valid for update
              ${buildManagementPermissionAccessAndClause(request, "p.permission_id")}
        `; // Query to verify the permission exists and is within the admin's management access scope
        const permissionPresent = await executeQuery(session, checkPermission); // Execute the access-check query


        if (permissionPresent.length===0) { // If no matching/accessible permission was found, reject the update
            const errorMessage = "Permission with this permission_id does not exist or is outside your roles-management access."; // Message returned to the caller


            console.error(errorMessage); // Log the access/existence error


            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access/existence check failed
        };


        const query = updatePermission(permission_id, permission_key, category, description, is_active); // Build the UPDATE statement with the new field values


        const result = await executeQuery(session, query); // Execute the UPDATE and capture the result


        console.log("Update Permission Response: ", result); // Log the database response for the update


        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully updated permission with key: ${permission_key}`,
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
            actionDescription: `Update Permission in the table: ${DASHBOARD_PERMISSIONS_TABLE}`,
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
        const errorMessage = `Error Updating permission: ${(error as Error)?.message ?? "Unknown error occurred while updating new permission."}`;
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
        actionDescription: `Failed to run update query to update permission for: ${body?.permission_key} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });


        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
});