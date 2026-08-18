# RBAC API Authorization

All route handlers under `app/api` are wrapped with `withAuthorization` from
`@/lib/rbac/authorize`.

## Flow

1. Identity is resolved from `RBAC_LOCAL_USER_IDENTIFIER` when
   `ENVIRONMENT=local`; in non-local environments it is read from Microsoft
   EasyAuth headers, primarily `x-ms-client-principal`,
   `x-ms-client-principal-id`, and `x-ms-client-principal-name`.
2. The authenticated principal is resolved against Databricks
   `dashboard_users`.
3. Active group-role assignments, role-permission mappings, active group
   scopes, and database-backed Super Admin status are loaded from the RBAC
   tables.
4. The route policy is inferred from the API path and method.
5. Authorization decisions, API access, and write-method CRUD actions are
   written to `dashboard_audit_log` and mirrored to Event Hub.

## Current User APIs

- `GET /api/me` returns the logged-in user's identity plus effective
  RBAC groups, roles, permissions, and scopes. It does not return access or ID
  tokens.
- `GET /api/dashboard-modules` reads active rows from `dashboard_modules` and
  returns only the modules whose `required_permissions` match the user's
  effective grants. Module visibility is permission-based; individual dashboard
  data APIs still enforce scoped authorization.

## Roles Management Access Model

APIs under `app/api/roles-management` use roles-management entity access, not
business data-scope access.

The important distinction is:

- Group scopes in `dashboard_group_scopes` control data visibility for business
  APIs, such as dashboards, KPI APIs, data quality APIs, and other scoped data
  APIs.
- Roles-management APIs control RBAC setup itself, so they use group, user,
  role, and permission relationships from the RBAC management tables.

### Roles Management Flow

1. `withAuthorization` authenticates the request and loads the RBAC user from
   Databricks.
2. The policy resolver requires `roles-management:read` for read methods and
   `roles-management:write` for write methods.
3. The roles-management policy does not use `enforceScopes`; request fields such
   as `scope_type` and `scope_value` are not used to decide whether the user can
   manage RBAC records.
4. `withAuthorization` adds normalized headers such as `x-rbac-user-id` and
   `x-rbac-super-admin`.
5. Each roles-management route adds SQL access filters from
   `lib/rbac/managementScope.ts`.
6. Super Admins, identified from `dashboard_super_admins`, bypass these
   entity-level filters and can manage all RBAC records.
7. Normal roles-management admins are filtered by active RBAC relationships in
   `dashboard_user_group_role_mapping` and `dashboard_role_permission_mapping`.

### Visibility Rules

List visibility is slightly broader than operation access so creators do not
lose sight of newly created standalone records.

- Groups: a normal admin can see groups where they have an active
  user-group-role mapping, plus groups they created.
- Users: a normal admin can see users who share at least one active group with
  them, plus users they created.
- Roles: a normal admin can see roles that are used in one of their active
  groups, plus roles they created.
- Permissions: a normal admin can see permissions attached to roles used in one
  of their active groups, plus permissions they created.
- User-role mappings: a normal admin can add, update, or delete mappings only
  for groups they can manage, and only with roles visible through their RBAC
  groups.
- Role-permission mappings: a normal admin can add or delete mappings only for
  roles visible through their RBAC groups.
- Group-scope rows: the `manage-group-scope` API still reads and writes
  `dashboard_group_scopes`, but access is based on whether the admin can manage
  the owning group. The scope value itself is not used to decide roles-management
  access.
- Super Admin assignments: only a database-backed Super Admin can list, add, or
  delete Super Admin assignments.

Creator visibility is list-only. A row being created by the current user does
not grant update, delete, assign, or revoke access. Management operations still
use RBAC relationship checks.

### Example

If Radhe is assigned to `Group A` and has `roles-management:write`:

- Radhe can see and update `Group A`.
- Radhe can see users assigned to `Group A`.
- Radhe can manage roles used in `Group A`.
- Radhe can manage permissions attached to roles used in `Group A`.
- Radhe cannot manage unrelated `Group B` records unless Radhe is also assigned
  to `Group B` or is an active Super Admin.

If Radhe creates a new standalone role and does not assign it anywhere yet:

- Radhe can still see the role in the role list because Radhe is the creator.
- Radhe cannot update, delete, or assign that role through protected operations
  until normal RBAC relationship access allows it.

If `Group A` has a group scope such as `business_unit = Finance`, that scope is
used by scoped data APIs. It does not by itself decide whether Radhe can manage
RBAC records in roles-management.

### Helper Functions

`lib/rbac/managementScope.ts` centralizes the SQL filters used by
roles-management routes:

- `buildManagementGroupAccessAndClause` checks group-level access.
- `buildManagementGroupVisibilityAndClause` checks group-level list visibility,
  including creator-owned groups.
- `buildManagementUserAccessAndClause` checks user-level access.
- `buildManagementUserVisibilityAndClause` checks user-level list visibility,
  including creator-owned users.
- `buildManagementRoleAccessAndClause` checks role-level access.
- `buildManagementRoleVisibilityAndClause` checks role-level list visibility,
  including creator-owned roles.
- `buildManagementPermissionAccessAndClause` checks permission-level access.
- `buildManagementPermissionVisibilityAndClause` checks permission-level list
  visibility, including creator-owned permissions.
- `buildManagementPermissionKeyAccessAndClause` checks permission-key access
  when a route works with permission keys instead of permission ids.

## Permission Keys

Use lower-case `resource:action` permission keys. The policy resolver currently
uses these resource families:

- `roles-management`
- `governance`
- `data-quality-dashboard`
- `data-quality`
- `kpi-config`
- `cluster`
- `kpi-dashboard`
- `pipelines-dashboard`
- `executive-dashboard`
- `data-refresh`

Actions are usually inferred from HTTP methods:

- `GET`, `HEAD`, `OPTIONS` -> `read`
- `POST` -> `create`
- `PUT`, `PATCH` -> `update`
- `DELETE` -> `delete`

Some operational endpoints override that default, for example cluster start
requires `cluster:manage`.

## Inheritance

The permission matcher supports:

- Exact permission matches, for example `data-quality:read`
- Wildcards, for example `data-quality:*` or `*`
- Action inheritance:
  - `admin` includes `manage`, `write`, `create`, `read`, `update`, `delete`,
    and `execute`
  - `manage` includes `write`, `create`, `read`, `update`, `delete`, and
    `execute`
  - `write` includes `create`, `read`, `update`, and `delete`

## Scopes

Scoped APIs infer scopes from route params, query strings, and JSON request
bodies. Supported scope types include:

- `business_unit`
- `brand`
- `catalog`
- `schema`
- `dataset`
- `rule_category`
- `kpi`

Group scopes with `scope_type = global` or `tenant` and `scope_value = *` grant
tenant-wide access. A scope value of `*` or `all` grants all values for the same
scope type.

These scopes are for data/API row filtering. Roles-management APIs use the
entity-level access model described above.

## Rollout Flags

- `RBAC_LOCAL_USER_IDENTIFIER` is required when `ENVIRONMENT=local`; set it to
  the local user's `dashboard_users.email`, `dashboard_users.azure_oid`, or
  `dashboard_users.user_id`. Local development still performs the real Databricks
  RBAC lookup using this identifier.
- `RBAC_CACHE_TTL_MS` controls in-process RBAC lookup caching.
