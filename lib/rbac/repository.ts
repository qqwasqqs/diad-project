/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the RBAC user context loader that builds a complete authorization profile for authenticated principals.
    - The script matches authenticated identities (from EasyAuth or local .env) to active dashboard_users via email, Azure object id, or user id.
    - It executes a complex LEFT JOIN query across dashboard_users, groups, roles, permissions, and scopes to flatten all active RBAC relationships into SQL rows.
    - It merges duplicate rows (from SQL joins on many-to-many relationships) into clean RbacUserContext objects containing unique groups, roles, and permission grants.
    - It detects Super Admins by checking dashboard_super_admins and enriches their context with all active RBAC entities (all groups, roles, permissions, and scopes).
    - It implements in-memory caching with configurable TTL (RBAC_CACHE_TTL_MS) to avoid repeated Databricks queries when the same user accesses multiple APIs in quick succession.
    - It handles Databricks boolean-like values (true, 1, "true") and deduplicates scopes by normalized type/value pairs for stable API responses.
    - Suitable for pharmaceutical/regulated environments requiring centralized RBAC loading from Databricks with built-in caching and Super Admin enrichment.
*/

// Catalog and schema identify where RBAC tables live in Databricks.
// Example: dset_dev.data_integrity.dashboard_users.
import { CATALOG_NAME, SCHEMA_NAME, DASHBOARD_ADMINS_TABLE, DASHBOARD_GROUPS_TABLE, DASHBOARD_GROUP_SCOPES_TABLE, DASHBOARD_PERMISSIONS_TABLE, DASHBOARD_ROLES_TABLE, DASHBOARD_ROLE_PERMISSION_TABLE, DASHBOARD_USERS_TABLE, DASHBOARD_USER_GROUP_ROLE_TABLE } from "@/constants/config";

// Databricks helpers open a SQL session and execute SQL text.
// Example: executeQuery(session, "SELECT * FROM table") returns rows.
import { executeQuery, getDatabricksSession } from "@/lib/azure/databricksClient";

// sqlString safely quotes user-provided values before they are used in SQL.
// Example: O'Brien becomes 'O''Brien'.
import { sqlString } from "./sql";

// Shared RBAC types used to build the current user's authorization profile.
import type {
  AuthenticatedPrincipal, // Normalized identity from EasyAuth or local .env.
  PermissionGrant, // One effective permission assigned through group and role.
  RbacGroup, // One RBAC group.
  RbacRole, // One RBAC role.
  RbacScope, // One resource scope, for example brand=US.
  RbacUserContext, // Complete authorization profile for a user.
} from "./types";

// RbacDatabricksRow describes one row returned by the RBAC join query.
// Example: one user can produce many rows, one per group-role-permission-scope combination.
type RbacDatabricksRow = {
  user_id?: string; // User id from dashboard_users.
  email?: string; // User email from dashboard_users.
  display_name?: string; // Friendly user name from dashboard_users.
  azure_oid?: string; // Azure object id from dashboard_users.
  group_id?: string; // Group id from dashboard_groups.
  group_name?: string; // Friendly group name.
  role_id?: string; // Role id from dashboard_roles.
  role_name?: string; // Friendly role name.
  permission_key?: string; // Permission key, for example "data-quality:read".
  scope_type?: string; // Scope type, for example "brand".
  scope_value?: string; // Scope value, for example "US".
  is_super_admin?: boolean | number | string; // True when dashboard_super_admins has an active row for this user.
};

// SuperAdminGroupRow describes one active group returned for unrestricted super admin visibility.
// Example: a super admin should see every group in management screens.
type SuperAdminGroupRow = {
  group_id?: string; // Group id from dashboard_groups.
  group_name?: string; // Friendly group name.
};

// SuperAdminRoleRow describes one active role returned for unrestricted super admin visibility.
// Example: a super admin should see every role in management screens.
type SuperAdminRoleRow = {
  role_id?: string; // Role id from dashboard_roles.
  role_name?: string; // Friendly role name.
};

// SuperAdminPermissionRow describes one active permission returned for unrestricted super admin visibility.
// Example: a super admin receives every permission key from dashboard_permissions.
type SuperAdminPermissionRow = {
  permission_key?: string; // Permission key, for example "roles-management:admin".
};

// SuperAdminScopeRow describes one active scope returned for unrestricted super admin visibility.
// Example: a super admin can see every configured business_unit, brand, dataset, and global scope.
type SuperAdminScopeRow = {
  scope_type?: string; // Scope type, for example "business_unit".
  scope_value?: string; // Scope value, for example "Finance".
};

// TABLES stores fully qualified Databricks table names in one place.
// Example: TABLES.users points to dashboard_users.
const TABLES = {
  users: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USERS_TABLE}`, // User master table.
  groups: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUPS_TABLE}`, // Group master table.
  roles: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLES_TABLE}`, // Role master table.
  permissions: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_PERMISSIONS_TABLE}`, // Permission master table.
  userGroupRoles: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_USER_GROUP_ROLE_TABLE}`, // User-group-role assignments.
  rolePermissions: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ROLE_PERMISSION_TABLE}`, // Role-permission assignments.
  groupScopes: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_GROUP_SCOPES_TABLE}`, // Group scope assignments.
  superAdmins: `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_ADMINS_TABLE}`, // Database source of truth for Super Admin users.
};

// userContextCache avoids calling Databricks repeatedly for the same user within a short time window.
// Example: loading five dashboard APIs quickly can reuse the same RBAC profile.
const userContextCache = new Map<string, { expiresAt: number; value: RbacUserContext | null }>();

// Reads the RBAC cache time-to-live from environment settings.
// Example: RBAC_CACHE_TTL_MS=60000 caches user context for one minute.
function cacheTtlMs(): number {
  // Default to 60000 milliseconds when no env value is configured.
  return Number(process.env.RBAC_CACHE_TTL_MS ?? "60000");
}

// Builds a stable cache key for one principal.
// Example: prefer "radhe@company.com"; otherwise use Azure object id; otherwise use the principal id.
function getCacheKey(principal: AuthenticatedPrincipal): string {
  // Lowercase values so "Radhe@Company.com" and "radhe@company.com" reuse the same cache entry.
  return (
    principal.email?.toLowerCase() ??
    principal.azureOid?.toLowerCase() ??
    principal.id.toLowerCase()
  );
}

// Reads a cached RBAC context if it exists and is not expired.
// Example: if the user was looked up 10 seconds ago and TTL is 60 seconds, reuse it.
function getCachedContext(cacheKey: string): RbacUserContext | null | undefined {
  // Look up the user in the in-memory cache.
  const cached = userContextCache.get(cacheKey);

  // undefined means "nothing was cached for this key".
  if (!cached) {
    return undefined;
  }

  // If the cache entry expired, remove it and behave as if no cache existed.
  if (cached.expiresAt <= Date.now()) {
    userContextCache.delete(cacheKey);
    return undefined;
  }

  // Return the cached value, which can be a real context or null for "not found".
  return cached.value;
}

// Stores an RBAC context in cache when caching is enabled.
// Example: a successful lookup for a user is saved for RBAC_CACHE_TTL_MS.
function setCachedContext(cacheKey: string, value: RbacUserContext | null): void {
  // Read the configured cache duration.
  const ttlMs = cacheTtlMs();

  // A TTL of zero or below disables caching.
  if (ttlMs <= 0) {
    return;
  }

  // Store the value along with the exact expiry time.
  userContextCache.set(cacheKey, {
    expiresAt: Date.now() + ttlMs, // Time when this cache entry becomes stale.
    value, // The RBAC user context or null if the user was not found.
  });
}

// Builds the SQL WHERE condition that matches the authenticated identity to dashboard_users.
// Example: match by email, Azure object id, or dashboard user id.
function buildPrincipalPredicate(principal: AuthenticatedPrincipal): string {
  // Start with no match conditions and add only fields that exist on the principal.
  const predicates: string[] = [];

  // Match by email when the authenticated identity has an email.
  if (principal.email) {
    predicates.push(`lower(u.email) = lower(${sqlString(principal.email)})`);
  }

  // Match by Azure object id when available.
  if (principal.azureOid) {
    predicates.push(`u.azure_oid = ${sqlString(principal.azureOid)}`);
  }

  // Match by dashboard user id as a final identity option.
  if (principal.id) {
    predicates.push(`u.user_id = ${sqlString(principal.id)}`);
  }

  // Join all possible identity matches with OR; if none exist, use an always-false condition.
  return predicates.length > 0 ? predicates.join(" OR ") : "1 = 0";
}

// Converts Databricks boolean-like values into a real JavaScript boolean.
// Example: true, 1, and "true" all become true.
function dbBoolean(value: unknown): boolean {
  // Native boolean true is already true.
  if (value === true) {
    return true;
  }

  // Some drivers can return boolean columns as 1.
  if (value === 1) {
    return true;
  }

  // Some drivers can return boolean columns as text.
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true" || value.trim() === "1";
  }

  // Everything else is treated as false.
  return false;
}

// Removes duplicate scopes by type/value.
// Example: two business_unit=Finance rows become one scope object.
function uniqueScopes(scopes: RbacScope[]): RbacScope[] {
  // Keep scopes in a Map keyed by normalized type/value.
  const scopesByKey = new Map<string, RbacScope>();

  // Process each scope candidate.
  for (const scope of scopes) {
    // Ignore blank scope rows because they cannot represent access.
    if (!scope.type || !scope.value) {
      continue;
    }

    // Use lower-case keys so "Finance" and "finance" are treated as the same scope.
    scopesByKey.set(`${scope.type.toLowerCase()}|${scope.value.toLowerCase()}`, scope);
  }

  // Return unique scopes in a stable order for API responses and debugging.
  return Array.from(scopesByKey.values()).sort((left, right) =>
    `${left.type}:${left.value}`.localeCompare(`${right.type}:${right.value}`)
  );
}

// Converts the many RBAC SQL rows into one clean RbacUserContext.
// Example: 10 SQL rows for one user become one profile with groups, roles, grants, and scopes.
function buildContextFromRows(
  principal: AuthenticatedPrincipal, // EasyAuth or local .env identity that started the lookup.
  rows: RbacDatabricksRow[] // Rows returned by Databricks.
): RbacUserContext | null {
  // Use the first row as the user's base record.
  const firstRow = rows[0];

  // If no user_id exists, the authenticated person is not an active RBAC user.
  if (!firstRow?.user_id) {
    return null;
  }

  // Map groups by id so duplicates from SQL joins are collapsed.
  const groupsById = new Map<string, RbacGroup>();

  // Map roles by id so duplicates from SQL joins are collapsed.
  const rolesById = new Map<string, RbacRole>();

  // Map grants by group, role, and permission so repeated scopes attach to the same grant.
  const grantsByKey = new Map<string, PermissionGrant>();

  // Process each SQL row and merge it into the final context.
  for (const row of rows) {
    // If this row includes a group, store it once.
    if (row.group_id) {
      groupsById.set(row.group_id, {
        groupId: row.group_id, // Stable group id.
        groupName: row.group_name, // Friendly group name if available.
      });
    }

    // If this row includes a role, store it once.
    if (row.role_id) {
      rolesById.set(row.role_id, {
        roleId: row.role_id, // Stable role id.
        roleName: row.role_name, // Friendly role name if available.
      });
    }

    // A permission grant needs both a group and a permission key.
    if (!row.group_id || !row.permission_key) {
      continue;
    }

    // Create a unique key for the group-role-permission combination.
    const grantKey = `${row.group_id}|${row.role_id ?? ""}|${row.permission_key}`;

    // Reuse an existing grant or create a new one with an empty scope list.
    const grant =
      grantsByKey.get(grantKey) ??
      ({
        groupId: row.group_id, // Group that gives this permission.
        groupName: row.group_name, // Friendly group name.
        roleId: row.role_id, // Role that gives this permission.
        roleName: row.role_name, // Friendly role name.
        permissionKey: row.permission_key, // Permission such as "data-quality:read".
        scopes: [], // Scopes are added below.
      } satisfies PermissionGrant);

    // If this row includes a scope, attach it to the grant.
    if (row.scope_type && row.scope_value) {
      // Convert SQL scope columns into an RBAC scope object.
      const scope: RbacScope = { type: row.scope_type, value: row.scope_value };

      // Check whether this scope already exists on the grant.
      const scopeExists = grant.scopes.some(
        (existingScope) =>
          existingScope.type.toLowerCase() === scope.type.toLowerCase() &&
          existingScope.value.toLowerCase() === scope.value.toLowerCase()
      );

      // Add the scope only once.
      if (!scopeExists) {
        grant.scopes.push(scope);
      }
    }

    // Store the updated grant back into the map.
    grantsByKey.set(grantKey, grant);
  }

  // Return the final RBAC profile for this user.
  return {
    ...principal, // Keep identity fields from EasyAuth or local .env.
    dashboardUserId: firstRow.user_id, // Dashboard user id from Databricks.
    email: firstRow.email ?? principal.email, // Prefer RBAC table email, fall back to EasyAuth email.
    displayName: firstRow.display_name ?? principal.displayName, // Prefer RBAC table display name.
    azureOid: firstRow.azure_oid ?? principal.azureOid, // Prefer RBAC table Azure object id.
    groups: Array.from(groupsById.values()), // Final unique group list.
    rbacRoles: Array.from(rolesById.values()), // Final unique role list.
    grants: Array.from(grantsByKey.values()), // Final unique permission grant list.
    isSuperAdmin: rows.some((row) => dbBoolean(row.is_super_admin)), // True only when database super-admin mapping exists.
  };
}

// Loads every active group, role, permission, and scope for a database-backed Super Admin.
// Example: a Super Admin can manage all RBAC setup without needing explicit group-role mappings.
async function enrichSuperAdminContext(
  session: Awaited<ReturnType<typeof getDatabricksSession>>, // Active Databricks SQL session.
  context: RbacUserContext // Base context already loaded for the active dashboard user.
): Promise<RbacUserContext> {
  // Global scope means unrestricted row-level access across all scoped APIs.
  const globalScope: RbacScope = { type: "global", value: "*" };

  // Load all active RBAC entities in parallel because these lists are independent.
  const [groupRows, roleRows, permissionRows, scopeRows] = await Promise.all([
    executeQuery<SuperAdminGroupRow>(
      session,
      `
        SELECT group_id, group_name
        FROM ${TABLES.groups}
        WHERE is_active = true
        ORDER BY group_name
      `
    ),
    executeQuery<SuperAdminRoleRow>(
      session,
      `
        SELECT role_id, role_name
        FROM ${TABLES.roles}
        WHERE is_active = true
        ORDER BY role_name
      `
    ),
    executeQuery<SuperAdminPermissionRow>(
      session,
      `
        SELECT permission_key
        FROM ${TABLES.permissions}
        WHERE is_active = true
        ORDER BY permission_key
      `
    ),
    executeQuery<SuperAdminScopeRow>(
      session,
      `
        SELECT DISTINCT scope_type, scope_value
        FROM ${TABLES.groupScopes}
        WHERE is_active = true
          AND (expires_at IS NULL OR expires_at > current_timestamp())
        ORDER BY scope_type, scope_value
      `
    ),
  ]);

  // Convert every active group row into the public RbacGroup shape.
  const groups = groupRows
    .filter((row) => Boolean(row.group_id))
    .map((row) => ({
      groupId: row.group_id!, // group_id exists because of the filter above.
      groupName: row.group_name, // Friendly name can be undefined if the DB row is unusual.
    }));

  // Convert every active role row into the public RbacRole shape.
  const roles = roleRows
    .filter((row) => Boolean(row.role_id))
    .map((row) => ({
      roleId: row.role_id!, // role_id exists because of the filter above.
      roleName: row.role_name, // Friendly name can be undefined if the DB row is unusual.
    }));

  // Convert all active scope rows and add global=* so data APIs are unrestricted.
  const allScopes = uniqueScopes([
    globalScope,
    ...scopeRows
      .filter((row) => row.scope_type && row.scope_value)
      .map((row) => ({ type: row.scope_type!, value: row.scope_value! })),
  ]);

  // Use a synthetic grant container only to represent unrestricted access in memory.
  // Super Admin identification still comes only from dashboard_super_admins.
  const superAdminGrantContainer = {
    groupId: "__super_admin__",
    groupName: "Super Admin",
    roleId: "__super_admin__",
    roleName: "Super Admin",
  };

  // Give the wildcard permission every known scope so /api/me can show unrestricted scope visibility.
  const wildcardGrant: PermissionGrant = {
    ...superAdminGrantContainer,
    permissionKey: "*",
    scopes: allScopes,
  };

  // Also expose every active permission key as an effective grant for UI visibility and diagnostics.
  const permissionGrants: PermissionGrant[] = permissionRows
    .filter((row) => Boolean(row.permission_key))
    .map((row) => ({
      ...superAdminGrantContainer,
      permissionKey: row.permission_key!,
      scopes: [globalScope],
    }));

  // Return the enriched Super Admin context.
  return {
    ...context,
    groups, // Super Admin can manage and view every active group.
    rbacRoles: roles, // Super Admin can manage and view every active role.
    grants: [wildcardGrant, ...permissionGrants], // Super Admin has every permission plus wildcard.
    isSuperAdmin: true, // Authorization bypass uses this flag.
  };
}

// Loads the complete RBAC profile for one authenticated principal.
// Example: called by withAuthorization before an API handler runs.
// Note: Identity source (EasyAuth or local .env) is resolved by getAuthenticatedPrincipal().
export async function getRbacUserContext(
  principal: AuthenticatedPrincipal // Logged-in identity from EasyAuth or local .env.
): Promise<RbacUserContext | null> {
  // Build the cache key for this user.
  const cacheKey = getCacheKey(principal);

  // Try to read the user's RBAC context from in-memory cache.
  const cachedContext = getCachedContext(cacheKey);

  // undefined means no cache entry; null or a context are valid cached results.
  if (cachedContext !== undefined) {
    return cachedContext;
  }

  // Open or reuse a Databricks SQL session.
  const session = await getDatabricksSession();

  // SQL query joins active users, groups, roles, permissions, and scopes into flat rows.
  const query = `
  -- Select the required user, group, role, permission, scope, and super admin fields for the principal record
      SELECT
  -- Return the unique identifier of the user from the users table
        u.user_id,
  -- Return the email address of the user for login/contact identification
        u.email,
  -- Return the display name of the user for UI presentation
        u.display_name,
  -- Return the Azure Object ID linked to the user identity
        u.azure_oid,
  -- Return the group ID associated with the user's group-role mapping
        g.group_id,
  -- Return the group name for display and authorization context
        g.group_name,
  -- Return the role ID assigned to the user within the group
        r.role_id,
  -- Return the human-readable role name assigned to the user
        r.role_name,
  -- Return the permission key granted through the mapped role-permission relationship
        p.permission_key,
  -- Return the scope type that defines what kind of scope applies to the group
        gs.scope_type,
  -- Return the scope value associated with the group's scope definition
        gs.scope_value,
  -- Start a CASE expression to derive whether the user is a Super Admin
        CASE
  -- If a matching active Super Admin record exists, mark the user as a Super Admin
          WHEN sa.user_id IS NOT NULL THEN true
  -- Otherwise mark the user as not being a Super Admin
          ELSE false
  -- End the CASE expression
        END AS is_super_admin
  -- Use the users table as the primary source so every active user can be evaluated
      FROM ${TABLES.users} u
  -- Left join the Super Admins table so users are retained even if they are not Super Admins
      LEFT JOIN ${TABLES.superAdmins} sa
  -- Match Super Admin records to the current user by user_id
        ON sa.user_id = u.user_id
  -- Only consider active Super Admin assignments
        AND sa.is_active = true
  -- Left join the user-group-role mapping table so users are retained even if they have no group-role mapping
      LEFT JOIN ${TABLES.userGroupRoles} ugr
  -- Match user-group-role mappings to the current user by user_id
        ON ugr.user_id = u.user_id
  -- Only consider active user-group-role mappings
        AND ugr.is_active = true
  -- Left join the groups table so group details can be returned for each active mapping
      LEFT JOIN ${TABLES.groups} g
  -- Match the group record using the group_id from the user-group-role mapping
        ON g.group_id = ugr.group_id
  -- Only consider active groups
        AND g.is_active = true
  -- Left join the roles table so role details can be returned for each active mapping
      LEFT JOIN ${TABLES.roles} r
  -- Match the role record using the role_id from the user-group-role mapping
        ON r.role_id = ugr.role_id
  -- Only consider active roles
        AND r.is_active = true
  -- Left join the role-permissions mapping table to connect roles to permissions
      LEFT JOIN ${TABLES.rolePermissions} rpm
  -- Match role-permission rows using the role ID from the roles table
        ON rpm.role_id = r.role_id
  -- Left join the permissions table so permission keys can be returned
      LEFT JOIN ${TABLES.permissions} p
  -- Match permissions using the permission ID from the role-permissions mapping table
        ON p.permission_id = rpm.permission_id
  -- Only consider active permissions
        AND p.is_active = true
  -- Left join the group scopes table so scope information can be returned for the group
      LEFT JOIN ${TABLES.groupScopes} gs
  -- Match group scope records using the group ID from the groups table
        ON gs.group_id = g.group_id
  -- Only consider active group scope records
        AND gs.is_active = true
  -- Only consider scope records that are not expired or that have no expiry date
        AND (gs.expires_at IS NULL OR gs.expires_at > current_timestamp())
  -- Filter the result so only active users are included
      WHERE u.is_active = true
  -- Apply the dynamically generated principal filter predicate
        AND (${buildPrincipalPredicate(principal)})
    `;

  // Run the query and return typed rows.
  const rows = await executeQuery<RbacDatabricksRow>(session, query);

  // Merge rows into one RBAC user context.
  let context = buildContextFromRows(principal, rows);

  // If the database marks this user as Super Admin, load unrestricted RBAC visibility.
  if (context?.isSuperAdmin) {
    context = await enrichSuperAdminContext(session, context);
  }

  // Cache the result so nearby API calls do not repeat the same Databricks work.
  setCachedContext(cacheKey, context);

  // Return the context, or null if the user was not active/found in dashboard_users.
  return context;
}
