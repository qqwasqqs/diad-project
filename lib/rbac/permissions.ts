/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the core permission matching and scope evaluation logic for the Teva dashboard RBAC system.
    - The script implements permission inheritance rules, allowing higher-level actions (e.g., "admin") to imply lower-level actions (e.g., "read", "write", "delete").
    - It supports wildcard permission matching at multiple levels: "*" for all permissions, "resource:*" for all actions on a resource, and "resource.*" for dot-style permission families.
    - It implements hierarchical permission matching using the IMPLIED_ACTIONS table, ensuring that "data-quality:admin" satisfies API requirements for "data-quality:read" or "data-quality:delete".
    - It evaluates scope matching, allowing global/wildcard scopes ("*", "all") to cover any specific scope, and validating exact scope-type and scope-value pairs.
    - It provides grant evaluation helpers to check whether a user's full permission grant (permissionKey + scopes) satisfies an API route's authorization requirements, supporting both "all scopes required" and "any scope sufficient" modes.
    - It normalizes permission/scope text for case-insensitive comparisons, ensuring "Data-Quality:Read", "data-quality:READ", and variants all match consistently.
    - Suitable for pharmaceutical/regulated environments requiring clear permission hierarchies, scope-based data isolation, and auditable authorization decisions.
*/

// PermissionGrant describes one permission assigned to a user through RBAC.
// RbacScope describes where that permission applies, such as one brand or one dataset.
import type { PermissionGrant, RbacScope } from "./types";

// IMPLIED_ACTIONS defines permission inheritance.
// Example: "admin" includes "read", so a user with "data-quality:admin" can read data-quality APIs.
const IMPLIED_ACTIONS: Record<string, string[]> = {
  admin: ["manage", "write", "create", "read", "update", "delete", "execute"], // Highest level: includes all common actions.
  manage: ["write", "create", "read", "update", "delete", "execute"], // Manage includes write and execute style actions.
  write: ["create", "read", "update", "delete"], // Write implies the user can perform normal data changes and read.
  create: ["read"], // If a user can create, they can usually read the related area.
  update: ["read"], // If a user can update, they can usually read the related area.
  delete: ["read"], // If a user can delete, they can usually read the related area.
  execute: ["read"], // If a user can execute an action, they can usually read the related area.
};

// Normalizes text so comparisons are fair and predictable.
// Example: " Data-Quality:Read " becomes "data-quality:read".
function normalize(value: string): string {
  // Trim removes extra spaces; lower-case makes "READ" and "read" match.
  return value.trim().toLowerCase();
}

// Splits a permission into the part before ":" and the action after ":".
// Example: "data-quality:read" becomes resource="data-quality", action="read".
function splitPermission(permissionKey: string): { resource: string; action: string } | null {
  // Normalize before splitting so the rest of the logic receives clean text.
  const normalized = normalize(permissionKey);

  // Find the last colon because permission resources could theoretically contain earlier separators.
  const separatorIndex = normalized.lastIndexOf(":");

  // If there is no colon, this is not a valid resource:action permission.
  if (separatorIndex === -1) {
    return null;
  }

  // Return the resource and action separately so inheritance can be checked.
  return {
    resource: normalized.slice(0, separatorIndex), // Example: "data-quality".
    action: normalized.slice(separatorIndex + 1), // Example: "read".
  };
}

// Checks exact and wildcard permission matches.
// Example: "*" matches everything, and "data-quality:*" matches "data-quality:read".
function wildcardPermissionMatches(grantedPermission: string, requiredPermission: string): boolean {
  // Clean the permission assigned to the user.
  const granted = normalize(grantedPermission);

  // Clean the permission required by the API.
  const required = normalize(requiredPermission);

  // "*" means all permissions; exact equality means the user has exactly what the API needs.
  if (granted === "*" || granted === required) {
    return true;
  }

  // "resource:*" means every colon-style action for that resource is allowed.
  // Example: "kpi-dashboard:*" matches "kpi-dashboard:read".
  if (granted.endsWith(":*")) {
    return required.startsWith(`${granted.slice(0, -2)}:`);
  }

  // "resource.*" supports dot-style permission families if the app adds them later.
  // Example: "report.*" matches "report.export".
  if (granted.endsWith(".*")) {
    return required.startsWith(`${granted.slice(0, -2)}.`);
  }

  // No wildcard rule matched.
  return false;
}

// Checks action inheritance when resource names are the same.
// Example: "data-quality:admin" satisfies "data-quality:delete".
function hierarchicalPermissionMatches(grantedPermission: string, requiredPermission: string): boolean {
  // Split the user's permission into resource and action.
  const granted = splitPermission(grantedPermission);

  // Split the API's required permission into resource and action.
  const required = splitPermission(requiredPermission);

  // Inheritance only works when both permissions are valid and target the same resource.
  if (!granted || !required || granted.resource !== required.resource) {
    return false;
  }

  // Look up which actions are included by the user's granted action.
  const impliedActions = IMPLIED_ACTIONS[granted.action] ?? [];

  // The permission matches if the required action is included by the granted action.
  return impliedActions.includes(required.action);
}

// Public helper used across RBAC to compare one granted permission against one required permission.
// Example: permissionMatches("roles-management:admin", "roles-management:read") returns true.
export function permissionMatches(grantedPermission: string, requiredPermission: string): boolean {
  // A match can be either exact/wildcard or action-inheritance based.
  return (
    wildcardPermissionMatches(grantedPermission, requiredPermission) ||
    hierarchicalPermissionMatches(grantedPermission, requiredPermission)
  );
}

// Checks whether one granted scope covers one required scope.
// Example: granted {type:"brand", value:"*"} covers required {type:"brand", value:"US"}.
export function scopeMatches(grantedScope: RbacScope, requiredScope: RbacScope): boolean {
  // Normalize the granted scope type, for example "Brand" becomes "brand".
  const grantedType = normalize(grantedScope.type);

  // Normalize the granted scope value, for example " US " becomes "us".
  const grantedValue = normalize(grantedScope.value);

  // Normalize the required scope type.
  const requiredType = normalize(requiredScope.type);

  // Normalize the required scope value.
  const requiredValue = normalize(requiredScope.value);

  // A global scope means access everywhere, regardless of requested scope.
  if (
    grantedType === "global" ||
    (grantedType === "tenant" && ["*", "all"].includes(grantedValue))
  ) {
    return true;
  }

  // If the categories differ, the scope does not match.
  // Example: brand=US does not satisfy dataset=customers.
  if (grantedType !== requiredType) {
    return false;
  }

  // "*" or "all" means all values inside the same scope type; otherwise values must match exactly.
  return ["*", "all"].includes(grantedValue) || grantedValue === requiredValue;
}

// Checks whether one permission grant has the scopes needed by an API route.
// Example: a Finance-only grant satisfies a request scoped to business_unit=Finance.
export function grantHasRequiredScopes(
  grant: PermissionGrant, // The user's permission grant being checked.
  requiredScopes: RbacScope[], // Scopes required by the API request.
  requireAllScopes: boolean // True means every required scope must match; false means any one match is enough.
): { allowed: boolean; matchedScopes: RbacScope[] } {
  // If the API did not require a scope, the grant is automatically allowed for scope purposes.
  if (requiredScopes.length === 0) {
    return { allowed: true, matchedScopes: [] };
  }

  // Keep each required scope that is covered by at least one scope on the user's grant.
  const matchedScopes = requiredScopes.filter((requiredScope) =>
    grant.scopes.some((grantScope) => scopeMatches(grantScope, requiredScope))
  );

  // Decide if the matched scopes are enough based on "all scopes" vs "any scope" behavior.
  return {
    allowed: requireAllScopes
      ? matchedScopes.length === requiredScopes.length
      : matchedScopes.length > 0,
    matchedScopes, // Return matching scopes so audit logs can explain the decision.
  };
}

// Checks only the permission portion of a grant, not the scope portion.
// Example: grant.permissionKey="kpi-dashboard:*" satisfies "kpi-dashboard:read".
export function grantSatisfiesPermission(
  grant: PermissionGrant, // The user's grant being checked.
  requiredPermission: string // The permission the API route requires.
): boolean {
  // Delegate the permission text comparison to the shared matcher above.
  return permissionMatches(grant.permissionKey, requiredPermission);
}
