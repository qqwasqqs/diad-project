/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the foundational TypeScript types and interfaces that define the RBAC and authorization schema across the Teva dashboard backend.
    - The script defines the core authorization data model: AuthenticatedPrincipal (logged-in identity), RbacUserContext (complete user profile), RbacPolicy (API requirements), and AuthorizationDecision (authorization outcomes).
    - It specifies permission grant structures combining groups, roles, and scopes (e.g., group "DQ Team" + role "Viewer" grants "data-quality:read" for brand "US").
    - It defines RbacScope types that enforce resource-level boundaries, allowing permissions to be restricted to specific brands, datasets, business units, and other organizational dimensions.
    - It establishes audit event types (API_ACCESS, AUTHORIZATION_DECISION, CRUD_ACTION) and outcomes (ALLOWED, DENIED, SUCCESS, FAILED) for compliance and troubleshooting.
    - It provides EasyAuthClaim and AuthenticatedPrincipal types that normalize identity from Azure EasyAuth headers or local development configuration.
    - It defines RouteContext and AuthorizedRouteHandler types to integrate RBAC checks into Next.js API route handlers.
    - Suitable for pharmaceutical/regulated environments requiring a strict, auditable type contract for all authorization decisions and identity attributes.
*/

// NextRequest is the request object used by Next.js API routes.
// Example: it contains the URL, HTTP method, headers, and query string for a browser request.
import type { NextRequest } from "next/server";

// AuditEventType lists the kinds of RBAC activity we record for traceability.
// Example: "AUTHORIZATION_DECISION" records whether access was allowed or denied.
export type AuditEventType =
  | "API_ACCESS" // Records that an API was called, for example "GET /api/me".
  | "AUTHORIZATION_DECISION" // Records the RBAC decision, for example "allowed" or "denied".
  | "CRUD_ACTION"; // Records write-style actions, for example create, update, or delete.

// AuditOutcome lists the possible results saved in audit logs.
// Example: "DENIED" means the user tried an action they were not allowed to perform.
export type AuditOutcome = "ALLOWED" | "DENIED" | "SUCCESS" | "FAILED";

// EasyAuthClaim represents one identity detail sent by Microsoft EasyAuth.
// Example: typ="email", val="radhe@company.com".
export interface EasyAuthClaim {
  typ: string; // The claim name, for example "email" or "name".
  val: string; // The claim value, for example "radhe@company.com".
}

// AuthenticatedPrincipal is the normalized logged-in user identity.
// Example: EasyAuth headers or RBAC_LOCAL_USER_IDENTIFIER are converted into this clean shape before RBAC checks.
export interface AuthenticatedPrincipal {
  id: string; // Main identity id, for example an Azure object id or email.
  email?: string; // User email, for example "radhe@company.com".
  displayName?: string; // Human-friendly name, for example "Radhe Tiwari".
  azureOid?: string; // Azure AD object id, useful for matching users across systems.
  provider?: string; // Identity provider, for example "aad" for Azure Active Directory.
  roles: string[]; // Roles sent by EasyAuth, if available.
  claims: EasyAuthClaim[]; // Raw EasyAuth claim list, without exposing tokens.
  source: "easyauth" | "local-env"; // Shows whether identity came from Azure EasyAuth or the local .env file.
}

// RbacScope represents the area where a permission applies.
// Example: type="brand", value="US" means the permission applies only to the US brand.
export interface RbacScope {
  type: string; // Scope category, for example "brand", "dataset", or "business_unit".
  value: string; // Scope value, for example "US", "Finance", or "*".
}

// RbacGroup represents one dashboard group assigned to a user.
// Example: "Data Quality Viewers".
export interface RbacGroup {
  groupId: string; // Stable group id from Databricks.
  groupName?: string; // Optional friendly group name for display and logs.
}

// RbacRole represents one role assigned through a group.
// Example: "DQ Admin" can grant data-quality permissions.
export interface RbacRole {
  roleId: string; // Stable role id from Databricks.
  roleName?: string; // Optional friendly role name for display and logs.
}

// PermissionGrant is one effective permission the user receives from a group and role.
// Example: group "DQ Team" + role "Viewer" grants "data-quality-dashboard:read" for brand "US".
export interface PermissionGrant {
  groupId: string; // Group that contributes this permission.
  groupName?: string; // Friendly group name, if available.
  roleId?: string; // Role that contributes this permission.
  roleName?: string; // Friendly role name, if available.
  permissionKey: string; // Permission name, for example "data-quality:read" or "kpi-config:write".
  scopes: RbacScope[]; // Scopes where this permission is valid.
}

// RbacUserContext is the complete authorization profile for one logged-in user.
// Example: /api/me returns a safe summary based on this object.
export interface RbacUserContext extends AuthenticatedPrincipal {
  dashboardUserId?: string; // User id from dashboard_users.
  groups: RbacGroup[]; // Active groups assigned to the user.
  rbacRoles: RbacRole[]; // Active RBAC roles assigned through those groups.
  grants: PermissionGrant[]; // Effective permissions after combining groups, roles, and scopes.
  isSuperAdmin?: boolean; // True only when dashboard_super_admins has an active database row for this user.
}

// RbacPolicy describes what one API route requires before it can run.
// Example: GET /api/kpi-dashboard may require "kpi-dashboard:read".
export interface RbacPolicy {
  resource: string; // Resource family, for example "kpi-dashboard" or "roles-management".
  action: string; // Action being attempted, for example "read", "create", or "delete".
  permissions: string[]; // Required permissions, for example ["data-quality:read"].
  requireAllPermissions?: boolean; // True means every permission is needed; false means any one is enough.
  scopes?: RbacScope[]; // Optional resource scopes required for this request.
  requireAllScopes?: boolean; // True means every required scope must match.
  allowAnonymous?: boolean; // True only for public routes; most RBAC routes leave this false.
}

// AuthorizationDecision records the result of checking a user against a policy.
// Example: allowed=false with reason="Missing permission data-quality:read".
export interface AuthorizationDecision {
  allowed: boolean; // True means the API can continue; false means it should be blocked.
  status: 200 | 401 | 403 | 503; // HTTP-like result: 401 unauthenticated, 403 forbidden, 503 RBAC lookup failed.
  outcome: "ALLOWED" | "DENIED"; // Human-readable decision saved in audit logs.
  reason?: string; // Optional explanation, especially useful for denials.
  matchedPermissions: string[]; // Permissions from the policy that the user satisfied.
  matchedScopes: RbacScope[]; // Scopes from the policy that the user satisfied.
}

// RbacAuditEvent is the common log record sent to Databricks audit tables and Event Hub.
// Example: it can record "Radhe called GET /api/me and the result was SUCCESS".
export interface RbacAuditEvent {
  eventType: AuditEventType; // What kind of event happened, for example "API_ACCESS".
  principalId: string; // User id used in logs, for example an email or Azure object id.
  principalEmail?: string; // Optional email for easier searching in logs.
  resourceType?: string; // Type of thing being accessed, for example "api_route".
  resourceValue?: string; // Specific thing being accessed, for example "GET /api/me".
  scopes?: RbacScope[]; // Scopes involved in the request, if any.
  outcome: AuditOutcome; // Result of the event, for example "SUCCESS" or "DENIED".
  denialReason?: string; // Why the request failed or was denied.
  ipAddress?: string; // Client IP address, usually from proxy headers.
  userAgent?: string; // Browser/client description, for example Chrome or Edge details.
  requestStartedAt?: Date; // Time the API request started.
  method?: string; // HTTP method, for example "GET" or "POST".
  path?: string; // API path, for example "/api/dashboard-modules".
  statusCode?: number; // Final HTTP status code, for example 200 or 403.
  correlationId?: string; // Request tracking id used to connect logs across systems.
}

// RouteContext represents optional Next.js route parameters.
// Example: /api/users/[id] can provide params.id.
export type RouteContext = {
  params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]>; // Route params can be immediate or promised by Next.js.
};

// AuthorizedRouteHandler is the shape of an API handler after RBAC wrapping.
// Example: withAuthorization(handler) returns a function with this shape.
export type AuthorizedRouteHandler<TContext = RouteContext> = (
  request: NextRequest, // Incoming request from the browser or API client.
  context: TContext // Route context such as dynamic URL parameters.
) => Promise<Response> | Response; // The API can return a response immediately or asynchronously.
