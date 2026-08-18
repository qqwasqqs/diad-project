/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  
  Purpose of the script:
  This API module provides CRUD operations (GET, POST, DELETE) for managing dashboard role-permission 
  mappings in a Databricks SQL environment. It handles role-based access control (RBAC) by enforcing 
  authorization checks and group-scoped permission management, ensuring that only authorized administrators 
  can view, add, or delete role permissions. All operations are logged to Azure Event Hub for audit and 
  monitoring purposes. The API supports retrieving all permissions for a specific role (GET), adding new 
  permissions to a role (POST), and removing permissions from a role (DELETE).
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
  DASHBOARD_ROLES_TABLE,
  DASHBOARD_PERMISSIONS_TABLE,
  DASHBOARD_ROLE_PERMISSION_TABLE,
} from "@/constants/config"; // Project-level configuration constants

// @/lib/rbac/authorize
// What it is: Authorization middleware that validates user roles and permissions before API execution.
// Why used: To enforce role-based access control (RBAC) by checking if the logged-in user has 
// roles-management permission before allowing this API to run. Example: a user without 
// roles-management:write cannot attach permissions to roles.
import { withAuthorization } from "@/lib/rbac/authorize"; // Authorization decorator/middleware for role permission checks

// @/lib/rbac/managementScope
// What it is: A utility module that builds WHERE clause filters based on user's RBAC group membership.
// Why used: To limit role-permission changes to groups where the requesting user has management authority.
// Example: a Group A admin can manage permissions for roles used in Group A, but not roles in Group B.
import { buildManagementRoleAccessAndClause } from "@/lib/rbac/managementScope"; // RBAC group-scoped WHERE clause builder

// @/lib/rbac/sql
// What it is: A SQL safety utility module that escapes and properly quotes SQL identifiers and values.
// Why used: To prevent SQL injection attacks by safely quoting role IDs, permission IDs, and mapping IDs 
// before embedding them into SQL queries. Example: role id r_123 becomes 'r_123'.
import { sqlString } from "@/lib/rbac/sql"; // SQL string escaping utility to prevent injection

/* ----------------------------- TABLE CONSTANTS -------------------------------- */


/* ----------------------------- SQL QUERY BUILDERS -------------------------------- */

// Function to build a SQL query that retrieves all permissions assigned to a specific role,
// filtered by the current user's RBAC group access level.
// Example: a Group A admin sees role permissions only when the role is used in Group A.
const getRoleForPermission = (
    request: NextRequest, // HTTP request object containing user context and RBAC information
    role_id: string, // The unique identifier of the role whose permissions are being queried
) => `
SELECT 
    rpm.mapping_id, -- Unique identifier for each role-permission mapping record
    rpm.role_id, -- Foreign key reference to the role
    rpm.permission_id, -- Foreign key reference to the permission
    r.role_name, -- Human-readable name of the role for display purposes
    p.permission_key, -- Unique key identifier of the permission for system use
    p.category, -- Category or grouping of the permission (e.g., "admin", "user", "viewer")
    rpm.created_by, -- Audit field: user ID of who created this mapping
    rpm.created_at -- Audit field: timestamp when this mapping was created
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE} rpm
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r
        ON r.role_id = rpm.role_id -- Join to get role details
    JOIN ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} p
        ON p.permission_id = rpm.permission_id -- Join to get permission details
WHERE rpm.role_id = ${sqlString(role_id)} -- Filter for the specific role being queried
AND p.is_active = TRUE -- Only include active permissions (exclude soft-deleted ones)
AND r.is_active = TRUE -- Only include active roles (exclude soft-deleted ones)
  ${buildManagementRoleAccessAndClause(request, "rpm.role_id")}`; // Apply RBAC group-scoped filtering

// Function to build a SQL INSERT query that adds a new permission to a role
const addNewPermissionToRole = (
    role_id: string, // The unique identifier of the role receiving the new permission
    permission_id: string, // The unique identifier of the permission being added
    created_by: string // Audit field: user ID of who is creating this new mapping
) => `
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE} (
    mapping_id, -- Auto-generated unique identifier for this role-permission association
    role_id, -- The role receiving the permission
    permission_id, -- The permission being granted to the role
    created_at, -- Timestamp of creation (set to current time)
    created_by -- User ID performing the creation (audit requirement)
) VALUES (
    '${"rp_"+crypto.randomUUID()}', -- Generate unique mapping ID with "rp_" prefix followed by UUID
    '${role_id}', -- Role ID quoted for SQL safety
    '${permission_id}', -- Permission ID quoted for SQL safety
    '${new Date().toISOString()}', -- Current timestamp in ISO 8601 format
    '${created_by}' -- User performing the operation, quoted for SQL safety
)`; // End INSERT query construction

// Function to build a SQL DELETE query that removes a permission from a role
const deletePermissionFromRole = (
    mapping_id: string // The unique identifier of the role-permission mapping to delete
) => `
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE} WHERE mapping_id = '${mapping_id}' -- Delete the specific role-permission association
`; // End DELETE query construction

/* ----------------------------- GET EXPORT (RETRIEVE ROLE PERMISSIONS) -------------------------------- */

// Export GET handler: Retrieves all permissions assigned to a specific role
// Authorization: Requires withAuthorization middleware (checks roles-management:read permission)
// Purpose: Fetch and display the list of permissions currently assigned to a dashboard role
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardRolePermissionAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Parse the query parameters from the request URL
    // Extract URL search parameters so we can read query string values like ?role_id=xyz
    
    const role_id = searchParams.get("role_id"); // Extract the role_id query parameter from the request URL
    // The role_id tells us which role's permissions to retrieve
    
    if(!role_id) { // Validate that role_id parameter was provided and is not null/empty
      return NextResponse.json({error:"role_id is null."}, {status:400}); // Return 400 Bad Request if role_id is missing
      // HTTP 400 indicates the client made a bad request (missing required parameter)
    }
  
    try { // Begin try block to catch any errors during query execution
        console.info("Received request to get dashboard rolewise permissions"); // Log that the GET request was received
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a session to connect to Databricks
        // Open (or reuse) a secure connection/session to Databricks database        
  
        const result = await executeQuery(session, getRoleForPermission(request, role_id)); // Execute the role permissions query
        // Run the SQL query constructed by getRoleForPermission() and capture the result rows
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({ // Send a structured success log record to Azure Event Hub
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO", // Log level indicating this is an informational/success message
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Role Permissions`, // Human-readable success message
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            programName, // The API name that generated this log entry
            // Include API name in log for clear tracking
            startDatetime: requestStartTime, // The time when this API call started
            // Include start time so duration can be measured
            status: "SUCCESS", // Operation completed without errors
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query", // Categorizes the operation as a SQL query
            // Categorize action type as SQL query execution
            actionDescription: `Fetch All Dashboard Role Permissions`, // Describes what action was performed
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
        const errorMessage = `Error fetching dashboard role permissions: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard role permissions."}`; // Construct error message
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
        actionDescription: `Failed to fetch dashboard role permissions: ${error}`, // Details about what failed
        // Describe what it tried to do for better investigation
        user, // The user ID whose request caused the error
        // Include which user triggered the failing request
        }); // End Event Hub error log
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  
    
  }); // End GET handler export
  
/* ----------------------------- POST EXPORT (ADD PERMISSION TO ROLE) -------------------------------- */

// Export POST handler: Adds a new permission to a specific role
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Purpose: Create a new role-permission association in the dashboard system
// Request body: { role_id: string, permission_id: string }
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardRolePermissionAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const body = await request.json(); // Parse the JSON request body containing role and permission IDs
    // Deserialize the POST body to access role_id and permission_id parameters
  
    const role_id = body?.role_id; // Extract the role ID from the request body
    // The role that will receive the new permission
    const permission_id = body?.permission_id; // Extract the permission ID from the request body
    // The permission being added to the role
    const created_by = user; // Set the created_by field to the current user for audit purposes
    // Track which user created this new role-permission mapping
  
  
    try { // Begin try block to catch errors during validation and query execution
        console.debug("Received request body:", JSON.stringify(body)); // Log the incoming request body for debugging
        // Print the full request payload for troubleshooting
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a Databricks SQL session
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the target role is used in at least one RBAC group the current admin belongs to.
        // Example: a Group A admin cannot add permissions to a role used only in Group B.
        const checkRole = ` -- SQL query to verify the role exists and is within user's management scope
            SELECT * -- Select all columns to check if record exists
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE} r -- Query from dashboard_roles table
            WHERE r.role_id = ${sqlString(role_id)} -- Filter for the specific role ID (SQL-escaped)
              ${buildManagementRoleAccessAndClause(request, "r.role_id")} -- Add RBAC group membership filter
        `; // End checkRole query
        
        const checkPermission = `SELECT * FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE} WHERE permission_id=${sqlString(permission_id)}`; // SQL query to verify the permission exists
        // Query all columns from permissions table where permission_id matches (SQL-escaped)
        
        const [permissionPresent, rolePresent] = await Promise.all([ // Execute both validation queries in parallel
            executeQuery(session, checkPermission), // Query to check if permission exists
            executeQuery(session, checkRole) // Query to check if role exists within user's scope
        ]); // Destructure results: first is permission check, second is role check
        
        if (permissionPresent.length===0 || rolePresent.length===0) { // Check if either validation query returned no results
            const errorMessage = permissionPresent.length===0 ? "Permission not present" : "Role not present or outside your roles-management access"; // Set error message based on which check failed
            // If permission was not found, say so; otherwise the role wasn't found or user lacks access
  
            console.error(errorMessage); // Log the validation failure to console
            // Print the error for debugging purposes
  
            return NextResponse.json({ error: errorMessage }, { status: rolePresent.length===0 ? 403 : 400 }); // Return error response with appropriate HTTP status
            // Return 403 Forbidden if role access denied, 400 Bad Request if permission not found
        }; // End validation error handling
  
        const query = addNewPermissionToRole(role_id, permission_id, created_by); // Build the INSERT query to add permission to role
        // Construct the SQL INSERT statement using the helper function
  
        const result = await executeQuery(session, query); // Execute the INSERT query against Databricks
        // Run the SQL to create the new role-permission mapping
  
        console.log("Add New Permission to Role Response: ", result); // Log the database response for debugging
        // Print the result to console (typically shows rows affected or query status)
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({ // Send success log to Azure Event Hub
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO", // Log level for successful operation
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Permission to Role with id: ${role_id}`, // Human-readable success message including the role ID
            // Detailed message about the successful operation, including dataset, business unit, catalog, schema, target column, and number of rules retrieved
            programName, // API name for log filtering
            // Include API name in log for clear tracking
            startDatetime: requestStartTime, // When the operation started
            // Include start time so duration can be measured
            status: "SUCCESS", // Operation completed successfully
            // Mark status as success for dashboard/monitoring
            actionType: "Spark_SQL_Query", // Categorizes as SQL operation
            // Categorize action type as SQL query execution
            actionDescription: `Add New Permission to Role in the table: ${DASHBOARD_ROLE_PERMISSION_TABLE}`, // Describes the operation performed
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
        const errorMessage = `Error Adding new permission to role: ${(error as Error)?.message ?? "Unknown error occurred while creating new permission to role."}`; // Construct comprehensive error message
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
        actionDescription: `Failed to run insert query to add new permission to role for: ${body.role_id} with payload: ${JSON.stringify(body)}`, // Detailed description of attempted action
        // Describe what it tried to do for better investigation
        user, // User whose request failed
        // Include which user triggered the failing request
        }); // End Event Hub error log
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  }); // End POST handler export
  
/* ----------------------------- DELETE EXPORT (REMOVE PERMISSION FROM ROLE) -------------------------------- */

// Export DELETE handler: Removes a permission from a specific role
// Authorization: Requires withAuthorization middleware (checks roles-management:write permission)
// Purpose: Delete a role-permission association from the dashboard system
// Query parameter: ?mapping_id=xyz (the role-permission mapping to delete)
export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardRolePermissionAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Parse URL query parameters
    // Extract query string parameters from the request URL
  
    const mapping_id = searchParams.get("mapping_id"); // Extract the mapping_id query parameter
    // The mapping_id uniquely identifies which role-permission association to delete
    
    if(!mapping_id) { // Validate that mapping_id parameter was provided
      return NextResponse.json({error:"mapping_id is null."}, {status:400}); // Return 400 Bad Request if mapping_id is missing
      // HTTP 400 indicates the client made a bad request (missing required parameter)
    }
  
    try { // Begin try block to catch errors during validation and deletion
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession(); // Get or create a Databricks SQL session
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the role-permission mapping belongs to a role used in the admin's RBAC groups.
        // Example: a Group A admin cannot delete a permission mapping for a Group B-only role.
        const checkPermissionInRole = ` -- SQL query to verify the mapping exists and user has access
            SELECT * -- Select all columns to verify the mapping record exists
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE} rpm -- Query from role-permission mappings table
            WHERE rpm.mapping_id = ${sqlString(mapping_id)} -- Filter for the specific mapping ID (SQL-escaped)
              ${buildManagementRoleAccessAndClause(request, "rpm.role_id")} -- Add RBAC group membership filter
        `; // End checkPermissionInRole query
        
        const permissionPresent = await executeQuery(session, checkPermissionInRole); // Execute query to check if mapping exists and is accessible
        // Run validation query to ensure the mapping_id exists and user has permission to delete it
  
        if (permissionPresent.length===0) { // Check if validation query returned no results
            const errorMessage = `This mapping_id does not exist or is outside your roles-management access: ${mapping_id}`; // Error message if validation failed
            // The mapping doesn't exist or the user lacks access to delete it
  
            console.error(errorMessage); // Log the validation failure to console
            // Print the error for debugging
  
            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Return 403 Forbidden response
            // HTTP 403 indicates the user lacks permission to perform this action
        }; // End validation error handling
  
        const query = deletePermissionFromRole(mapping_id); // Build the DELETE query using helper function
        // Construct the SQL DELETE statement to remove the role-permission mapping
  
        const result = await executeQuery(session, query); // Execute the DELETE query against Databricks
        // Run the SQL to delete the role-permission mapping
  
        console.log("Delete permission from role Response: ", result); // Log the database response for debugging
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
            actionDescription: `Delete Permission of Role in the table: ${DASHBOARD_ROLE_PERMISSION_TABLE}`, // Describes the operation performed
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
        const errorMessage = `Error Deleting permission of role: ${(error as Error)?.message ?? "Unknown error occurred while deleting permission of role."}`; // Construct comprehensive error message
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
        actionDescription: `Failed to run delete query to delete permission of role for: ${mapping_id}`, // Detailed description of attempted action
        // Describe what it tried to do for better investigation
        user, // User whose request failed
        // Include which user triggered the failing request
        }); // End Event Hub error log
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 }); // Return HTTP 500 with error details
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  }); // End DELETE handler export