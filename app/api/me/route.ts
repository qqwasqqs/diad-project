/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 May 2026

  Purpose of the script:
    This script defines the /api/me endpoint, which returns the authenticated user's
    identity and Role-Based Access Control (RBAC) profile. It retrieves the user's
    authentication details, RBAC groups, roles, permissions, and scopes, and provides
    a normalized response that can be consumed by the frontend application.

    The API also validates the user's RBAC setup by checking whether the user exists
    in the RBAC system, belongs to at least one group, and has effective permission
    grants assigned. Clear error responses are returned when RBAC configuration is
    incomplete. The endpoint is protected using the centralized authorization framework
    and serves as the primary source of user identity and authorization information
    within the application.
*/

// NextResponse lets this API send a clean JSON answer back to the browser.
// NextRequest represents the incoming browser/API request.
import { NextResponse, type NextRequest } from "next/server";

// withAuthorization is the shared RBAC gatekeeper used by every API route.
// Example: it checks "Is this person logged in and active in RBAC?" before this file runs.
import { withAuthorization } from "@/lib/rbac/authorize";

// getAuthenticatedPrincipal reads .env identity locally or Microsoft EasyAuth identity in Azure.
// Example: RBAC_LOCAL_USER_IDENTIFIER or EasyAuth may provide "radhe@company.com".
import { getAuthenticatedPrincipal } from "@/lib/rbac/identity";

// getRbacUserContext loads the user's groups, roles, permissions, and scopes from Databricks.
// Example: a user can belong to "Data Quality Admins" and receive "data-quality:*".
import { getRbacUserContext } from "@/lib/rbac/repository";

// These are TypeScript shapes that describe the RBAC data used in this route.
// They help developers avoid returning or reading the wrong kind of data.
import type { PermissionGrant, RbacPolicy, RbacScope, RbacUserContext } from "@/lib/rbac/types";

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


// This route uses Node.js runtime because Databricks and audit helpers need server-side Node APIs.
export const runtime = "nodejs";

// This tells Next.js that the answer must be generated per request, because every user has different RBAC data.
export const dynamic = "force-dynamic";

// /api/me lets the handler return detailed RBAC setup messages for the logged-in user.
// permissions: [] means "no special permission is required beyond being authenticated".
const ME_POLICY: RbacPolicy = {
  resource: "identity", // Human-readable resource name used in audit logs.
  action: "read", // The user is reading their own identity/RBAC profile.
  permissions: [], // No extra permission like "admin" is needed for seeing your own profile.
  allowAnonymous: true, // The handler below still requires EasyAuth, but this lets it return custom RBAC setup errors.
};

// Returns a clean list with duplicates removed and values sorted alphabetically.
// Example: ["read", "read", "write"] becomes ["read", "write"].
function uniqueSorted(values: string[]): string[] {
  // Remove empty values, put the rest in a Set to remove duplicates, then sort for a stable API response.
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

// Collects all unique scopes assigned through the user's permission grants.
// Example: if two roles both grant business_unit=Finance, the API returns it once.
function uniqueScopes(grants: PermissionGrant[]): RbacScope[] {
  // This Map uses "type|value" as a key, so duplicate scopes overwrite the same entry.
  const scopesByKey = new Map<string, RbacScope>();

  // Review every permission grant the user received through groups and roles.
  for (const grant of grants) {
    // Review every scope attached to the current permission grant.
    for (const scope of grant.scopes) {
      // Store the scope using lowercase comparison so "Finance" and "finance" are treated as the same scope.
      scopesByKey.set(`${scope.type.toLowerCase()}|${scope.value.toLowerCase()}`, scope);
    }
  }

  // Return the unique scopes in a predictable order so the UI and logs are easier to compare.
  return Array.from(scopesByKey.values()).sort((left, right) =>
    `${left.type}:${left.value}`.localeCompare(`${right.type}:${right.value}`)
  );
}

// Converts the internal RBAC context into the public /api/me response.
// Example: it returns permissions and scopes, but it does not return EasyAuth access tokens.
function buildMeResponse(userContext: RbacUserContext) {
  // Keep EasyAuth identity data separate from dashboard RBAC authorization data.
  return {
    principal: {
      id: userContext.id, // EasyAuth/Azure identity id.
      email: userContext.email, // User email, for example "radhe@company.com".
      displayName: userContext.displayName, // Human-readable name if EasyAuth provided one.
      azureOid: userContext.azureOid, // Azure object id, useful for matching Azure AD users.
      provider: userContext.provider, // Identity provider, for example "aad".
      source: userContext.source, // Whether the identity came from EasyAuth or local .env.
      roles: userContext.roles, // EasyAuth roles, if the app receives any.
      claimTypes: uniqueSorted(userContext.claims.map((claim) => claim.typ)), // Claim names only; token values are not exposed.
    },
    user: {
      userId: userContext.dashboardUserId, // User id from dashboard_users.
      email: userContext.email, // Email after RBAC user lookup.
      displayName: userContext.displayName, // Display name after RBAC user lookup.
      azureOid: userContext.azureOid, // Azure object id after RBAC user lookup.
      groups: userContext.groups, // RBAC groups assigned to this user.
      roles: userContext.rbacRoles, // Dashboard RBAC roles assigned through groups.
      permissions: uniqueSorted(userContext.grants.map((grant) => grant.permissionKey)), // Effective permission keys.
      scopes: uniqueScopes(userContext.grants), // Effective resource/tenant scopes.
      isSuperAdmin: userContext.isSuperAdmin === true, // True only when marked by RBAC database configuration.
    },
  };
}

// Builds a consistent RBAC setup error response for /api/me.
// Example: code="RBAC_GROUP_NOT_ASSIGNED" tells the UI exactly which setup step is missing.
async function rbacSetupError(
  programName:string,
  requestStartTime:Date,
  user:string,
  code: string, 
  errorMessage: string
): Promise<NextResponse> {
  await logToEventHub({
    type: "ERROR",
    // ERROR indicates the process failed
    detailMessage: errorMessage,
    // Store detailed errorMessage reason in Event Hub (goes to Splunk)
    programName,
    // Identify which API failed
    startDatetime: requestStartTime,
    // Helps calculate how long request ran before failing
    status: "FAILED",
    // Mark request as failed
    actionType: "Spark_SQL_Query",
    // Categorize the failure as related to SQL query execution
    actionDescription: errorMessage,
    // Explain which table/action the API attempted
    user,
    // Include which user triggered this request
});

  // Use 403 because the user is authenticated, but their dashboard RBAC setup is incomplete.
  return NextResponse.json({ code, errorMessage }, { status: 403 });
}

// GET /api/me returns the logged-in user's identity and RBAC profile.
// Example response: { principal: { email: "radhe@company.com" }, user: { permissions: ["data-quality:read"] } }.
export const GET = withAuthorization(async function GET(request: NextRequest): Promise<Response> {

  // Capture the start time for logging purposes
  const requestStartTime = new Date();
  // Save request start time (like starting a stopwatch to measure duration)

  const programName = "DashboardMeAPI"; // Name of the program (API)
  // A fixed label used in logs to identify which API generated the message

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from headers or default to "Anonymous"
  // Identify who is making the request (for audit tracking); if missing, set Anonymous

  try {

    // Read the logged-in user; principal source depends on ENVIRONMENT setting (local vs EasyAuth).
    const principal = getAuthenticatedPrincipal(request);

    // If identity could not be resolved, the browser is not authenticated.
    if (!principal) {
      await logToEventHub({
        type: "ERROR",
        // ERROR indicates the process failed
        detailMessage: "User is not authenticated to view or write in the dashboard.",
        // Store detailed error reason in Event Hub (goes to Splunk)
        programName,
        // Identify which API failed
        startDatetime: requestStartTime,
        // Helps calculate how long request ran before failing
        status: "FAILED",
        // Mark request as failed
        actionType: "Spark_SQL_Query",
        // Categorize the failure as related to SQL query execution
        actionDescription: `User does not have access to the dashboard.`,
        // Explain which table/action the API attempted
        user,
        // Include which user triggered this request
    });

      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Load this authenticated user's dashboard RBAC data from Databricks.
    const userContext = await getRbacUserContext(principal);

    // Error 1: EasyAuth authenticated the person, but dashboard_users does not contain that user.
    if (!userContext) {
      return rbacSetupError(
        programName,
        requestStartTime,
        user,
        "RBAC_USER_NOT_FOUND",
        "User not found in dashboard RBAC users. Please contact your administrator."
      );
    }

    // Super Admin users are database-approved in dashboard_super_admins and do not need normal group/role setup.
    if (userContext.isSuperAdmin) {
      // Log success if query execution was successful
      await logToEventHub({
        type: "INFO",
        // INFO indicates successful normal operation
        detailMessage: `Successfully retrieved admin information for ${user}.`,
        // A readable success message that can be used in Splunk monitoring dashboards
        programName,
        // API name so we know which service logged this message
        startDatetime: requestStartTime,
        // Include start time for performance monitoring
        status: "SUCCESS",
        // Mark request as successfully completed
        actionType: "Spark_SQL_Query",
        // Categorize action as Databricks SQL query execution
        actionDescription: `Fetch Admin Information for Data Integrity Dashboard.`,
        // Describe what action the API performed (data quality summary fetch)
        user,
        // User ID of the person who initiated the request (important for audit)
      });

      // return response.
      return NextResponse.json(buildMeResponse(userContext));
    }

    // Error 2: The user exists, but is not assigned to any RBAC group.
    if (userContext.groups.length === 0) {
      return rbacSetupError(
        programName,
        requestStartTime,
        user,
        "RBAC_GROUP_NOT_ASSIGNED",
        "User is not assigned to any RBAC group. Please contact your administrator."
      );
    }

    // Error 3: The user has a group/role setup, but no effective permission grants were found.
    if (userContext.grants.length === 0) {
      return rbacSetupError(
        programName,
        requestStartTime,
        user,
        "RBAC_PERMISSION_NOT_ASSIGNED",
        "User does not have any RBAC permission assigned. Please contact your administrator."
      );
    }

    // Log success if query execution was successful
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful normal operation
      detailMessage: `Successfully retrieved user information for ${user}`,
      // A readable success message that can be used in Splunk monitoring dashboards
      programName,
      // API name so we know which service logged this message
      startDatetime: requestStartTime,
      // Include start time for performance monitoring
      status: "SUCCESS",
      // Mark request as successfully completed
      actionType: "Spark_SQL_Query",
      // Categorize action as Databricks SQL query execution
      actionDescription: `Fetch User Information for Data Integrity Dashboard.`,
      // Describe what action the API performed (data quality summary fetch)
      user,
      // User ID of the person who initiated the request (important for audit)
    });

    // Send the safe, normalized identity/RBAC response to the browser.
    return NextResponse.json(buildMeResponse(userContext));

  } catch (error: any) {
    // ------------------- ERROR LOG -------------------
    const errorMessage = `Error retrieving user data for ${user}: ${error.message || "Unknown error"}`;
    // Prepare detailed error message containing dataset, catalog, schema so troubleshooting is easier

    console.error(errorMessage);
    // Print error in server logs for debugging

    await logToEventHub({
        type: "ERROR",
        // ERROR indicates the process failed
        detailMessage: errorMessage,
        // Store detailed error reason in Event Hub (goes to Splunk)
        programName,
        // Identify which API failed
        startDatetime: requestStartTime,
        // Helps calculate how long request ran before failing
        status: "FAILED",
        // Mark request as failed
        actionType: "Spark_SQL_Query",
        // Categorize the failure as related to SQL query execution
        actionDescription: `Failed to fetch User Information for Data Integrity Dashboard.`,
        // Explain which table/action the API attempted
        user,
        // Include which user triggered this request
    });

    // Return a 500 error with the error message
    return NextResponse.json(
        { error: errorMessage },
        // Return response body with readable error message for frontend display
        { status: 500 }
        // HTTP 500 means backend/server/system issue (not user input issue)
    );
  }
}, ME_POLICY);
