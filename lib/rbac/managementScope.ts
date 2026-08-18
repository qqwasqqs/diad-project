/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the RBAC access control helpers for the Teva dashboard management APIs (groups, users, roles, permissions admin panel).
    - The script builds SQL predicates that enforce admin-level authorization, ensuring admins can only view and modify RBAC objects they are authorized to manage.
    - It provides separate helpers for operations (create/update/delete) using strict RBAC checks and list visibility (reads) using RBAC + creator ownership.
    - Super Admins receive unrestricted access across all groups, users, roles, and permissions; normal admins are scoped to groups they belong to.
    - It validates group membership through dashboard_user_group_role_mapping, ensuring admins can only manage groups where they hold an active role.
    - It enforces transitive access control: users are manageable only when they share at least one active group with the current admin; roles are manageable when assigned in admin groups.
    - List APIs include creator-visibility logic so newly created RBAC objects remain visible to their creator before full group-role assignments are applied.
    - It handles multiple user identity formats (dashboard user id, email, Azure OID) for both access checks and creator-visibility matching to support legacy and modern row designs.
    - Suitable for pharmaceutical/regulated environments requiring strict admin governance and audit trails of who manages RBAC policies.
*/

// NextRequest is the incoming API request type used by Next.js route handlers.
// Example: a roles-management API passes its request here so this helper can read the current RBAC user id.
import type { NextRequest } from "next/server";

// CATALOG_NAME and SCHEMA_NAME point to the Databricks location that contains RBAC tables.
// Example: dset_dev.data_integrity.dashboard_user_group_role_mapping.
import { CATALOG_NAME, SCHEMA_NAME, DASHBOARD_USER_GROUP_ROLE_TABLE, DASHBOARD_PERMISSIONS_TABLE, DASHBOARD_ROLE_PERMISSION_TABLE } from "@/constants/config";

// sqlString safely quotes values before they are placed inside generated SQL.
// Example: O'Brien becomes 'O''Brien' so the quote stays text, not SQL syntax.
import { sqlString } from "./sql";

// Table names are kept in one local object so generated SQL stays consistent and easy to update.
const TABLES = {
  userGroupRoles: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE}`, // User/group/role assignment table.
  rolePermissions: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE}`, // Role/permission assignment table.
  permissions: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE}`, // Permission master table, used to match permission keys.
};

// Reads whether the current user is a database-backed Super Admin.
// Example: Super Admins receive x-rbac-super-admin=true from withAuthorization after dashboard_super_admins is checked.
function isSuperAdminRequest(request: NextRequest): boolean {
  // Only the exact string "true" should bypass management data filters.
  return request.headers.get("x-rbac-super-admin") === "true";
}

// Reads the dashboard user id for the logged-in admin.
// Example: "u_123" is the dashboard_users.user_id attached by the RBAC authorization layer.
function getCurrentDashboardUserId(request: NextRequest): string | null {
  // Use the normalized RBAC user id header instead of EasyAuth email because RBAC tables are keyed by user_id.
  return request.headers.get("x-rbac-user-id");
}

// Reads all current-user identifiers that may have been stored in created_by.
// Example: older rows may store an email, while newer rows may store dashboard user id.
function getCurrentCreatorIdentifiers(request: NextRequest): string[] {
  // Collect every identifier header that can reasonably identify the logged-in user.
  const rawIdentifiers = [
    request.headers.get("x-rbac-user-id"), // Dashboard user id, for example u_123.
    request.headers.get("x-user-id"), // Existing normalized user id, often the user's email.
    request.headers.get("x-user-email"), // Explicit email, for example radhe@company.com.
    request.headers.get("x-rbac-azure-oid"), // Azure object id, useful for older audit-style rows.
  ];

  // Normalize and remove blanks/duplicates so the SQL IN list stays small and stable.
  return Array.from(
    new Set(
      rawIdentifiers
        .map((identifier) => identifier?.trim().toLowerCase())
        .filter((identifier): identifier is string => Boolean(identifier))
    )
  );
}

// Builds the common SQL condition that means a mapping row is active.
// Example: inactive user-role mappings should not give someone management visibility.
function activeMappingPredicate(alias: string): string {
  // COALESCE treats a missing/null is_active value as active, matching the existing route behavior.
  return `COALESCE(${alias}.is_active, TRUE) = TRUE`;
}

// Returns blank SQL for Super Admins, a quoted user id for normal admins, or null when no RBAC user id exists.
// Example: Super Admin sees all rows; normal admin is filtered; missing id returns no rows.
function getScopedAdminUserId(request: NextRequest): string | null {
  // Super Admins are unrestricted, so callers do not need a user id filter.
  if (isSuperAdminRequest(request)) {
    return "";
  }

  // Normal roles-management admins are filtered by their own RBAC group/role relationships.
  const currentUserId = getCurrentDashboardUserId(request);

  // If the id is missing, fail closed so the query returns no data instead of too much data.
  return currentUserId ? sqlString(currentUserId) : null;
}

// Builds a SQL predicate that checks whether the current user created a row.
// Example: lower(group.created_by) IN ('u_123', 'radhe@company.com').
function buildCreatedByPredicate(request: NextRequest, createdByExpression: string): string | null {
  // Get every possible identifier stored in created_by for this user.
  const creatorIdentifiers = getCurrentCreatorIdentifiers(request);

  // No identifiers means creator visibility cannot be safely proven.
  if (creatorIdentifiers.length === 0) {
    return null;
  }

  // Quote each identifier so it is safe inside SQL.
  const identifierList = creatorIdentifiers.map(sqlString).join(", ");

  // Compare case-insensitively because emails and ids may vary in casing.
  return `lower(CAST(${createdByExpression} AS STRING)) IN (${identifierList})`;
}

// Combines an RBAC access predicate with a creator-visibility predicate for list APIs only.
// Example: show the row if the admin can manage it OR if the admin created it.
function buildVisibilityAndClause(accessPredicate: string | null, createdByPredicate: string | null): string {
  // Keep only real predicates; null means that part cannot be proven.
  const predicates = [accessPredicate, createdByPredicate].filter(
    (predicate): predicate is string => Boolean(predicate)
  );

  // If neither RBAC access nor creator ownership is available, return no rows.
  if (predicates.length === 0) {
    return "AND 1 = 0";
  }

  // OR means creator ownership can make a row visible, but operations still use RBAC-only helpers.
  return `AND (${predicates.join(" OR ")})`;
}

// Builds the raw predicate proving the current admin belongs to the target group.
// Example: used by both operation checks and creator-aware list visibility.
function buildManagementGroupAccessPredicate(
  request: NextRequest,
  groupIdExpression: string,
  adminAlias = "rbac_admin_group"
): string | null {
  // Blank means Super Admin, so no data filter is needed.
  const scopedAdminUserId = getScopedAdminUserId(request);

  // Super Admins can see and operate on every group.
  if (scopedAdminUserId === "") {
    return "";
  }

  // Missing RBAC user id means no safe way to prove access.
  if (scopedAdminUserId === null) {
    return null;
  }

  // Check that the current admin has an active membership in the same group being read or changed.
  return `
    EXISTS (
      SELECT 1
      FROM ${TABLES.userGroupRoles} ${adminAlias}
      WHERE ${adminAlias}.user_id = ${scopedAdminUserId}
        AND ${adminAlias}.group_id = ${groupIdExpression}
        AND ${activeMappingPredicate(adminAlias)}
    )
  `;
}

// Builds an AND clause proving the current admin belongs to the target group.
// Example: a Finance Admin group member can manage that Finance Admin group row, but not unrelated groups.
export function buildManagementGroupAccessAndClause(
  request: NextRequest,
  groupIdExpression: string,
  adminAlias = "rbac_admin_group"
): string {
  // Build the RBAC-only group access predicate.
  const accessPredicate = buildManagementGroupAccessPredicate(request, groupIdExpression, adminAlias);

  // Blank predicate means Super Admin access, so no AND clause is needed.
  if (accessPredicate === "") {
    return "";
  }

  // Missing predicate means access cannot be proven, so return no rows.
  if (!accessPredicate) {
    return "AND 1 = 0";
  }

  // Prefix with AND so callers can append this to an existing WHERE block.
  return `AND ${accessPredicate}`;
}

// Builds an AND clause for group list visibility, including creator-owned standalone groups.
// Example: a newly created group is visible to its creator even before user-role mappings are added.
export function buildManagementGroupVisibilityAndClause(
  request: NextRequest,
  groupIdExpression: string,
  createdByExpression: string,
  adminAlias = "rbac_admin_group_visibility"
): string {
  // Super Admins see every row, so no visibility filter is needed.
  if (isSuperAdminRequest(request)) {
    return "";
  }

  // Use RBAC access OR creator ownership for list visibility.
  return buildVisibilityAndClause(
    buildManagementGroupAccessPredicate(request, groupIdExpression, adminAlias),
    buildCreatedByPredicate(request, createdByExpression)
  );
}

// Builds the raw predicate proving the target user shares at least one active group with the current admin.
// Example: used by both operation checks and creator-aware user list visibility.
function buildManagementUserAccessPredicate(
  request: NextRequest,
  userIdExpression: string,
  targetAlias = "rbac_target_user",
  adminAlias = "rbac_admin_user"
): string | null {
  // Blank means Super Admin, so no data filter is needed.
  const scopedAdminUserId = getScopedAdminUserId(request);

  // Super Admins can see and operate on every user.
  if (scopedAdminUserId === "") {
    return "";
  }

  // Missing RBAC user id means no safe way to prove access.
  if (scopedAdminUserId === null) {
    return null;
  }

  // The target user is manageable only when both people have an active mapping to the same group.
  return `
    EXISTS (
      SELECT 1
      FROM ${TABLES.userGroupRoles} ${targetAlias}
      JOIN ${TABLES.userGroupRoles} ${adminAlias}
        ON ${adminAlias}.group_id = ${targetAlias}.group_id
        AND ${adminAlias}.user_id = ${scopedAdminUserId}
        AND ${activeMappingPredicate(adminAlias)}
      WHERE ${targetAlias}.user_id = ${userIdExpression}
        AND ${activeMappingPredicate(targetAlias)}
    )
  `;
}

// Builds an AND clause proving the target user shares at least one active group with the current admin.
// Example: a Finance group admin sees users assigned to Finance groups, but not users assigned only to HR groups.
export function buildManagementUserAccessAndClause(
  request: NextRequest,
  userIdExpression: string,
  targetAlias = "rbac_target_user",
  adminAlias = "rbac_admin_user"
): string {
  // Build the RBAC-only user access predicate.
  const accessPredicate = buildManagementUserAccessPredicate(request, userIdExpression, targetAlias, adminAlias);

  // Blank predicate means Super Admin access, so no AND clause is needed.
  if (accessPredicate === "") {
    return "";
  }

  // Missing predicate means access cannot be proven, so return no rows.
  if (!accessPredicate) {
    return "AND 1 = 0";
  }

  // Prefix with AND so callers can append this to an existing WHERE block.
  return `AND ${accessPredicate}`;
}

// Builds an AND clause for user list visibility, including creator-owned standalone users.
// Example: a newly created user is visible to its creator before group assignment happens.
export function buildManagementUserVisibilityAndClause(
  request: NextRequest,
  userIdExpression: string,
  createdByExpression: string,
  targetAlias = "rbac_target_user_visibility",
  adminAlias = "rbac_admin_user_visibility"
): string {
  // Super Admins see every row, so no visibility filter is needed.
  if (isSuperAdminRequest(request)) {
    return "";
  }

  // Use RBAC access OR creator ownership for list visibility.
  return buildVisibilityAndClause(
    buildManagementUserAccessPredicate(request, userIdExpression, targetAlias, adminAlias),
    buildCreatedByPredicate(request, createdByExpression)
  );
}

// Builds the raw predicate proving the target role is used inside at least one group the current admin belongs to.
// Example: used by both operation checks and creator-aware role list visibility.
function buildManagementRoleAccessPredicate(
  request: NextRequest,
  roleIdExpression: string,
  targetAlias = "rbac_target_role",
  adminAlias = "rbac_admin_role"
): string | null {
  // Blank means Super Admin, so no data filter is needed.
  const scopedAdminUserId = getScopedAdminUserId(request);

  // Super Admins can see and operate on every role.
  if (scopedAdminUserId === "") {
    return "";
  }

  // Missing RBAC user id means no safe way to prove access.
  if (scopedAdminUserId === null) {
    return null;
  }

  // The role is manageable when it is assigned in a group where the current admin is also active.
  return `
    EXISTS (
      SELECT 1
      FROM ${TABLES.userGroupRoles} ${targetAlias}
      JOIN ${TABLES.userGroupRoles} ${adminAlias}
        ON ${adminAlias}.group_id = ${targetAlias}.group_id
        AND ${adminAlias}.user_id = ${scopedAdminUserId}
        AND ${activeMappingPredicate(adminAlias)}
      WHERE ${targetAlias}.role_id = ${roleIdExpression}
        AND ${activeMappingPredicate(targetAlias)}
    )
  `;
}

// Builds an AND clause proving the target role is used inside at least one group the current admin belongs to.
// Example: a Finance group admin sees roles assigned in Finance groups, but not roles used only in HR groups.
export function buildManagementRoleAccessAndClause(
  request: NextRequest,
  roleIdExpression: string,
  targetAlias = "rbac_target_role",
  adminAlias = "rbac_admin_role"
): string {
  // Build the RBAC-only role access predicate.
  const accessPredicate = buildManagementRoleAccessPredicate(request, roleIdExpression, targetAlias, adminAlias);

  // Blank predicate means Super Admin access, so no AND clause is needed.
  if (accessPredicate === "") {
    return "";
  }

  // Missing predicate means access cannot be proven, so return no rows.
  if (!accessPredicate) {
    return "AND 1 = 0";
  }

  // Prefix with AND so callers can append this to an existing WHERE block.
  return `AND ${accessPredicate}`;
}

// Builds an AND clause for role list visibility, including creator-owned standalone roles.
// Example: a newly created role is visible to its creator before group assignment happens.
export function buildManagementRoleVisibilityAndClause(
  request: NextRequest,
  roleIdExpression: string,
  createdByExpression: string,
  targetAlias = "rbac_target_role_visibility",
  adminAlias = "rbac_admin_role_visibility"
): string {
  // Super Admins see every row, so no visibility filter is needed.
  if (isSuperAdminRequest(request)) {
    return "";
  }

  // Use RBAC access OR creator ownership for list visibility.
  return buildVisibilityAndClause(
    buildManagementRoleAccessPredicate(request, roleIdExpression, targetAlias, adminAlias),
    buildCreatedByPredicate(request, createdByExpression)
  );
}

// Builds the raw predicate proving the target permission is attached to a role used in current admin's groups.
// Example: used by both operation checks and creator-aware permission list visibility.
function buildManagementPermissionAccessPredicate(
  request: NextRequest,
  permissionIdExpression: string,
  rolePermissionAlias = "rbac_target_permission",
  targetRoleAlias = "rbac_target_permission_role",
  adminAlias = "rbac_admin_permission"
): string | null {
  // Blank means Super Admin, so no data filter is needed.
  const scopedAdminUserId = getScopedAdminUserId(request);

  // Super Admins can see and operate on every permission.
  if (scopedAdminUserId === "") {
    return "";
  }

  // Missing RBAC user id means no safe way to prove access.
  if (scopedAdminUserId === null) {
    return null;
  }

  // The permission is manageable when it belongs to a role used in one of the admin's active groups.
  return `
    EXISTS (
      SELECT 1
      FROM ${TABLES.rolePermissions} ${rolePermissionAlias}
      JOIN ${TABLES.userGroupRoles} ${targetRoleAlias}
        ON ${targetRoleAlias}.role_id = ${rolePermissionAlias}.role_id
        AND ${activeMappingPredicate(targetRoleAlias)}
      JOIN ${TABLES.userGroupRoles} ${adminAlias}
        ON ${adminAlias}.group_id = ${targetRoleAlias}.group_id
        AND ${adminAlias}.user_id = ${scopedAdminUserId}
        AND ${activeMappingPredicate(adminAlias)}
      WHERE ${rolePermissionAlias}.permission_id = ${permissionIdExpression}
    )
  `;
}

// Builds an AND clause proving the target permission is attached to a role used in the current admin's groups.
// Example: a Finance group admin sees permissions connected to roles active in Finance groups.
export function buildManagementPermissionAccessAndClause(
  request: NextRequest,
  permissionIdExpression: string,
  rolePermissionAlias = "rbac_target_permission",
  targetRoleAlias = "rbac_target_permission_role",
  adminAlias = "rbac_admin_permission"
): string {
  // Build the RBAC-only permission access predicate.
  const accessPredicate = buildManagementPermissionAccessPredicate(
    request,
    permissionIdExpression,
    rolePermissionAlias,
    targetRoleAlias,
    adminAlias
  );

  // Blank predicate means Super Admin access, so no AND clause is needed.
  if (accessPredicate === "") {
    return "";
  }

  // Missing predicate means access cannot be proven, so return no rows.
  if (!accessPredicate) {
    return "AND 1 = 0";
  }

  // Prefix with AND so callers can append this to an existing WHERE block.
  return `AND ${accessPredicate}`;
}

// Builds an AND clause for permission list visibility, including creator-owned standalone permissions.
// Example: a newly created permission is visible to its creator before role-permission mappings are added.
export function buildManagementPermissionVisibilityAndClause(
  request: NextRequest,
  permissionIdExpression: string,
  createdByExpression: string,
  rolePermissionAlias = "rbac_target_permission_visibility",
  targetRoleAlias = "rbac_target_permission_role_visibility",
  adminAlias = "rbac_admin_permission_visibility"
): string {
  // Super Admins see every row, so no visibility filter is needed.
  if (isSuperAdminRequest(request)) {
    return "";
  }

  // Use RBAC access OR creator ownership for list visibility.
  return buildVisibilityAndClause(
    buildManagementPermissionAccessPredicate(
      request,
      permissionIdExpression,
      rolePermissionAlias,
      targetRoleAlias,
      adminAlias
    ),
    buildCreatedByPredicate(request, createdByExpression)
  );
}

// Builds an AND clause proving the permission key is already visible through the current admin's manageable groups.
// Example: use this when a route identifies permissions by permission_key instead of permission_id.
export function buildManagementPermissionKeyAccessAndClause(
  request: NextRequest,
  permissionKeyExpression: string,
  permissionAlias = "rbac_permission_key"
): string {
  // Blank means Super Admin, so no data filter is needed.
  const scopedAdminUserId = getScopedAdminUserId(request);

  // Super Admins can see and operate on every permission key.
  if (scopedAdminUserId === "") {
    return "";
  }

  // Missing RBAC user id means no safe way to prove access, so return no rows.
  if (scopedAdminUserId === null) {
    return "AND 1 = 0";
  }

  // Connect the permission key back to the permission id, then reuse role/group membership visibility.
  return `
    AND EXISTS (
      SELECT 1
      FROM ${TABLES.permissions} ${permissionAlias}
      WHERE ${permissionAlias}.permission_key = ${permissionKeyExpression}
        ${buildManagementPermissionAccessAndClause(request, `${permissionAlias}.permission_id`)}
    )
  `;
}
