/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 15 May 2026
  
  Purpose of the script:
    This script defines API endpoints for managing Dashboard Group Scopes.
    It supports retrieving, creating, updating, and deleting scope assignments
    to groups stored in Databricks while enforcing Role-Based Access Control (RBAC) policies.

    Scopes define the data access boundaries for each group. Each scope is tagged with a 
    scope_type (e.g., business_unit, brand) and a scope_value (e.g., Finance, US Commercial).
    The API validates scope values against known dataset tags before assignment and prevents
    duplicate scope assignments within a group.

    The API integrates with Azure Event Hub for operational logging and auditing, validates
    management scope access before modification operations, and includes business logic
    to auto-assign brand scopes when certain business_unit scopes are assigned.

  Key Features:
    - Retrieves all scopes assigned to a specific group based on RBAC access rules
    - Creates new group scopes with dataset tag validation
    - Prevents duplicate scope assignments
    - Implements business logic to auto-assign brand scopes for US Commercial
    - Updates existing scopes with expiration date and active status support
    - Deletes scopes after RBAC scope validation
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
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table containing valid scope values and metadata tags
  DASHBOARD_GROUPS_TABLE,
  DASHBOARD_GROUP_SCOPES_TABLE,
} from "@/constants/config"; // Project-level configuration constants
// withAuthorization checks the logged-in user's roles-management permission before this API runs.
// Example: a user without roles-management:write cannot add a scope to a group.
import { withAuthorization } from "@/lib/rbac/authorize";
// buildManagementGroupAccessAndClause keeps group-scope operations limited to groups the admin can manage.
// Example: a Group A admin can edit scopes for Group A, but not unrelated Group B.
import { buildManagementGroupAccessAndClause } from "@/lib/rbac/managementScope";
// sqlString safely quotes incoming ids and scope values before they are used in SQL checks.
// Example: scope value Finance becomes 'Finance'.
import { sqlString } from "@/lib/rbac/sql";


// Builds the group-scope list query and filters by the owning group, not by the scope row itself.
// Example: a Group A admin can see all scope rows assigned to Group A.
const getGroupScopes = (
    request: NextRequest, // HTTP request object containing user/admin context
    group_id: string // ID of the group whose scopes to retrieve
) => `
SELECT gs.*
FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE} gs
WHERE gs.group_id = ${sqlString(group_id)}
  ${buildManagementGroupAccessAndClause(request, "gs.group_id")}
`;

// Builds the SQL INSERT statement for adding a new scope assignment to a group with generated scope_id and audit timestamps.
const addGroupScope = (
    group_id:string, // ID of the group to assign this scope to
    scope_value:string, // Value of the scope (e.g., "Finance", "US Commercial")
    granted_by:string, // User ID of the admin granting this scope
    scope_type:string, // Type/category of the scope (e.g., "business_unit", "brand")
) => `
INSERT INTO ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE} (
    scope_id,
    group_id,
    scope_type,
    scope_value,
    granted_by,
    granted_at,
    updated_at
) VALUES (
    '${"gs_"+crypto.randomUUID()}',
    '${group_id}',
    '${scope_type}',
    '${scope_value}',
    '${granted_by}',
    '${new Date().toISOString()}',
    '${new Date().toISOString()}'
)
`;

// Builds the SQL UPDATE statement for modifying an existing group scope's fields and refreshing its updated_at timestamp.
const updateGroupScope = (
    scope_id:string, // ID of the scope assignment to update
    scope_type:string, // New scope type, if changed
    scope_value:string, // New scope value, if changed
    expires_at?:Date, // Optional expiration date for the scope assignment
    is_active:boolean=true, // New active/inactive status
) => `
UPDATE ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE}
SET ${scope_type ? `scope_type='${scope_type}',`: ``}
    ${scope_value ? `scope_value='${scope_value}',`: ``}
    ${expires_at ? `expires_at='${expires_at.toISOString()}',`: ``}
    ${is_active===true ? `is_active=TRUE,`: `is_active=FALSE,`}
    updated_at = '${new Date().toISOString()}'
WHERE scope_id = '${scope_id}'
`;

// Builds the SQL DELETE statement for removing a scope assignment from a group.
const deleteGroupScope = (
    scope_id:string // ID of the scope assignment to delete
) => `
DELETE FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE} WHERE scope_id='${scope_id}'`;


// GET handler: returns the list of scopes assigned to a specific group, wrapped with RBAC authorization.
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<NextResponse> {
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardGroupScopeAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Parse the query parameters from the request URL
  
    const group_id = searchParams.get("group_id"); // Get the group_id from the query string
    
    if(!group_id) { // If no group_id was provided, reject the request
      return NextResponse.json({error:"group_id is null."}, {status:400}); // Respond with 400 Bad Request since group_id is required
    }
  
    try { // Begin main logic; any errors are caught and logged below
        console.info("Received request to get dashboard group scopes"); // Log that the GET request has started
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database        
  
        const result = await executeQuery(session, getGroupScopes(request, group_id)); // Execute the scopes query scoped by RBAC access and capture the resulting rows
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Fetched Dashboard Group Scopes`,
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
            actionDescription: `Fetch All Dashboard Group Scopes`,
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
        const errorMessage = `Error fetching dashboard group scopes: ${(error as Error)?.message ?? "Unknown error occurred while fetching dashboard group scopes."}`;
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
        actionDescription: `Failed to fetch dashboard group scopes: ${error}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  
  });
  
  // POST handler: validates group access and scope value, then creates a new scope assignment, wrapped with RBAC authorization.
  export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardGroupScopeAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const body = await request.json(); // Parse the incoming JSON request body
  
    const group_id = body?.group_id; // ID of the group to assign the scope to
    const scope_value = body?.scope_value; // Value of the scope to assign
    const scope_type = body?.scope_type; // Type/category of the scope
  
  
    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // Check that the target group is one of the groups the current admin can manage.
        // Example: a Group A admin can add scopes to Group A, but not Group B.
        const checkGroup = `
            SELECT *
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE} g
            WHERE g.group_id = ${sqlString(group_id)}
              ${buildManagementGroupAccessAndClause(request, "g.group_id")}
        `; // Query to verify the group exists and is within the admin's management access scope
        const groupPresent = await executeQuery(session, checkGroup); // Execute the group access-check query
        
        if (groupPresent.length===0) { // If no matching/accessible group was found, reject the scope assignment
            const errorMessage = "Group with this group_id is not present or is outside your roles-management access."; // Message returned to the caller

            console.error(errorMessage); // Log the group access/existence error

            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the group access check failed
        };

        // For business_unit scope rows, confirm the value exists in dataset tags before saving it.
        // Example: business_unit=Finance must exist as a known tag value.
        const checkScope = scope_type === "business_unit" // Check if this is a business_unit scope type
            ? `
                SELECT *
                FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE}
                WHERE tag_value = ${sqlString(scope_value)}
            ` // Query to validate business_unit scope value against known dataset tags
            : `
                SELECT ${sqlString(scope_value)} AS scope_value
            `; // For non-business_unit types, skip validation (just return the value)
        const scopePresent = await executeQuery(session, checkScope); // Execute the scope value validation query

        if(scopePresent.length===0) { // If the scope value is not valid (not found in dataset tags), reject the assignment
            const errorMessage = "Selected scope value is not present."; // Message returned to the caller

            console.error(errorMessage); // Log the scope value validation error

            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the scope value is invalid
        }
  
        const checkScopeAlreadyPresent = `
            SELECT *
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE}
            WHERE scope_type = ${sqlString(scope_type)}
              AND scope_value = ${sqlString(scope_value)}
              AND group_id = ${sqlString(group_id)}
        `; // Query to check if this exact scope is already assigned to this group
        const scopeAlreadyPresent = await executeQuery(session, checkScopeAlreadyPresent); // Execute the duplicate-check query

        if(scopeAlreadyPresent.length>0) { // If this scope is already assigned to this group, reject the request
            const errorMessage = "Selected scope value is already present."; // Message returned to the caller

            console.error(errorMessage); // Log the duplicate scope assignment error

            return NextResponse.json({ error: errorMessage }, { status: 400 }); // Respond with 400 Bad Request since the scope is a duplicate
        }

        const query = addGroupScope(group_id, scope_value, user, scope_type); // Build the INSERT statement for the new scope assignment
  
        const result = await executeQuery(session, query); // Execute the INSERT and capture the result

        if(scope_type === 'business_unit' && scope_value === 'US Commercial') { // Special business logic: auto-assign brand scope for US Commercial
            const brandQuery = addGroupScope(group_id, "all", user, "brand"); // Build the INSERT for the auto-assigned brand scope
            await executeQuery(session, brandQuery); // Execute the auto-assignment
        }
  
        console.log("Add New Group Scope Response: ", result); // Log the database response for the insert
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully Added New Group to Scope with id: ${group_id}`,
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
            actionDescription: `Add New Group Scope in the table: ${DASHBOARD_GROUP_SCOPES_TABLE}`,
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
        const errorMessage = `Error Adding new scope to a group: ${(error as Error)?.message ?? "Unknown error occurred while creating new scope to a group."}`;
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
        actionDescription: `Failed to run insert query to add new scope to a group for: ${body.group_id} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  });
  
  
  // PUT handler: validates RBAC access to the target scope and updates its fields, wrapped with RBAC authorization.
  export const PUT = withAuthorization(async function PUT(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardGroupScopeAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const body = await request.json(); // Parse the incoming JSON request body
  
    const scope_id = body?.scope_id; // ID of the scope assignment to update
    const scope_type = body?.scope_type; // New scope type, if provided
    const scope_value = body?.scope_value; // New scope value, if provided
    const expires_at = body?.expires_at ? new Date(body.expires_at) : undefined; // Optional expiration date, converted to Date object
    const is_active = body?.is_active; // New active/inactive flag, if provided
  
  
    try { // Begin main logic; any errors are caught and logged below
        console.debug("Received request body:", JSON.stringify(body)); // Log the raw request payload for debugging
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // check if user already exist 
        const checkGroup = `
            SELECT *
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE} gs
            WHERE gs.scope_id = ${sqlString(scope_id)}
              ${buildManagementGroupAccessAndClause(request, "gs.group_id")}
        `; // Query to verify the scope assignment exists and belongs to a group the admin can manage
  
        const groupPresent = await executeQuery(session, checkGroup); // Execute the scope access-check query
  
        if (groupPresent.length===0) { // If no matching/accessible scope was found, reject the update
            const errorMessage = "Group scope not present or is outside your roles-management access."; // Message returned to the caller
            console.error(errorMessage); // Log the access/existence error
            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access check failed
        };
  
        const query = updateGroupScope(scope_id, scope_type, scope_value, expires_at, is_active); // Build the UPDATE statement with the new field values
  
        const result = await executeQuery(session, query); // Execute the UPDATE and capture the result
  
        console.log("Update Group Scope Response: ", result); // Log the database response for the update
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully updated user scope in group: ${scope_id}`,
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
            actionDescription: `Update User Scope in Group Scope in the table: ${DASHBOARD_GROUP_SCOPES_TABLE}`,
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
        const errorMessage = `Error Updating user scope in group scope: ${(error as Error)?.message ?? "Unknown error occurred while updating scope in a group scope."}`;
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
        actionDescription: `Failed to run update query to update scope  in group scope for: ${body.scope_id} with payload: ${JSON.stringify(body)}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  });
  
  
  // DELETE handler: validates RBAC access before deleting a scope assignment, wrapped with RBAC authorization.
  export const DELETE = withAuthorization(async function DELETE(request:NextRequest): Promise<NextResponse> {
    
    const requestStartTime = new Date(); // Capture the start time of the request for logging
    // Save start time so we can measure how long this API takes (like starting a stopwatch)
  
    const programName = "DashboardGroupScopeAPI"; // Program name for logging purposes
    // API name used in EventHub/Splunk so logs can be filtered by this API
  
    const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract the user ID from headers, default to "Anonymous"
    // Identify user who requested refresh status (for audit); fallback to Anonymous if missing
  
    const { searchParams } = new URL(request.url); // Extract query parameters from the request URL
  
    const scope_id = searchParams.get("scope_id"); // Get the scope_id to delete from the query string
    
    if(!scope_id) { // If no scope_id was provided, reject the request
      return NextResponse.json({error:"scope_id is null."}, {status:400}); // Respond with 400 Bad Request since scope_id is required
    }
  
    try { // Begin main logic; any errors are caught and logged below
  
        // Fetch a valid Databricks session.
        const session = await getDatabricksSession();
        // Open (or reuse) a secure connection/session to Databricks database
  
        // check if user already exist 
        const checkGroupScope = `
            SELECT *
            FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE} gs
            WHERE gs.scope_id = ${sqlString(scope_id)}
              ${buildManagementGroupAccessAndClause(request, "gs.group_id")}
        `; // Query to verify the scope assignment exists and belongs to a group the admin can manage
        const groupScopePresent = await executeQuery(session, checkGroupScope); // Execute the scope access-check query
  
        if (groupScopePresent.length===0) { // If no matching/accessible scope was found, reject the deletion
            const errorMessage = `This scope_id does not exist or is outside your roles-management access: ${scope_id}`; // Message returned to the caller

            console.error(errorMessage); // Log the access/existence error

            return NextResponse.json({ error: errorMessage }, { status: 403 }); // Respond with 403 Forbidden since the access check failed
        };
  
        const query = deleteGroupScope(scope_id); // Build the DELETE statement for this scope assignment
  
        const result = await executeQuery(session, query); // Execute the DELETE and capture the result
  
        console.log("Delete scope from Group Scope Response: ", result); // Log the database response for the delete
  
        // Log the success of the operation to Event Hub.
        await logToEventHub({
            // Send a success log record to Azure Event Hub (for Splunk monitoring/audit)
            type: "INFO",
            // Mark this event as informational (successful normal event)
            detailMessage: `Successfully deleted: ${scope_id}`,
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
            actionDescription: `Delete Group Scope in the table: ${DASHBOARD_GROUP_SCOPES_TABLE}`,
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
        const errorMessage = `Error Deleting scope from group scope: ${(error as Error)?.message ?? "Unknown error occurred while deleting scope."}`;
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
        actionDescription: `Failed to run delete query to delete user role from group for: ${scope_id}`,
        // Describe what it tried to do for better investigation
        user,
        // Include which user triggered the failing request
        });
  
        // Return a 500 Internal Server Error response with the error message.
        return NextResponse.json({ error: errorMessage }, { status: 500 });
        // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
    }
  });