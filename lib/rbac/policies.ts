/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the RBAC policy resolution engine that maps incoming API requests to their required permissions and scopes.
    - The script defines DOMAIN_POLICIES that map API path prefixes to permission families (e.g., /api/kpi-dashboard requires kpi-dashboard:read for GET).
    - It supports custom read and write permissions per domain, allowing granular control over API authorization (e.g., roles-management-groups:read for group-specific endpoints).
    - It implements ROUTE_OVERRIDES for sensitive operations like cluster management, which require elevated permissions (e.g., data-quality-dashboard-detailed-view-cluster:manage).
    - It collects resource scopes from multiple request locations: route parameters ([businessUnit]), query strings (?brand=US), URL path patterns (/business-unit/Finance), and JSON request bodies.
    - It supports scope field name variations across camelCase (businessUnit), snake_case (business_unit), and Databricks-style uppercase (L1_BUSINESS_UNIT) formats to handle legacy and modern APIs.
    - It resolves the final RBAC policy for each request, producing the resource, action, required permissions, and collected scopes for downstream authorization checks.
    - Suitable for pharmaceutical/regulated environments requiring fine-grained API-to-permission mappings and flexible scope extraction from diverse request formats.
*/

// NextRequest contains the API request method, URL, headers, and body.
// Example: a GET request to /api/kpi-dashboard/summary-view.
import type { NextRequest } from "next/server";

// RbacPolicy describes what an API requires; RbacScope describes resource boundaries; RouteContext has URL params.
import type { RbacPolicy, RbacScope, RouteContext } from "./types";

// DomainPolicy describes the default RBAC behavior for a whole API folder.
// Example: every route under /api/kpi-dashboard maps to resource "kpi-dashboard".
type DomainPolicy = {
  prefix: string; // API path prefix, for example "/api/kpi-dashboard".
  resource: string; // RBAC resource name, for example "kpi-dashboard".
  readPermission?: string; // Optional custom read permission; otherwise resource:read is used.
  writePermission?: string; // Optional custom write permission; otherwise resource:action is used.
  enforceScopes?: boolean; // True means the request should also be checked for resource scopes.
};

// RouteOverride describes a special case where one exact route needs custom RBAC.
// Example: cluster start uses "cluster:manage" instead of a generic "cluster:create".
type RouteOverride = {
  pattern: RegExp; // Regular expression used to match the API path.
  methods: string[]; // HTTP methods affected by the override, for example ["POST"].
  resource: string; // RBAC resource used for this special route.
  action: string; // RBAC action used for this special route.
  permissions: string[]; // Exact permissions required for this route.
  enforceScopes?: boolean; // True means collect and enforce request scopes.
  requireAllPermissions?: boolean; // True means every permission is needed; false means any one is enough.
};

// HTTP methods that read data but should not change data.
// Example: GET /api/me is a read-style request.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ============================================================================
// DOMAIN_POLICIES CONFIGURATION
// ============================================================================

// DOMAIN_POLICIES maps API folders to permission families, defining the authorization requirements for each API endpoint group.
// Example: /api/data-refresh/trend-details requires data-refresh:read for GET requests.
const DOMAIN_POLICIES: DomainPolicy[] = [
  // Roles Management - Dashboard Groups API configuration.
  // Example: GET /api/roles-management/dashboard-groups requires roles-management-groups:read.
  {
    prefix: "/api/roles-management/dashboard-groups", // URL path prefix that identifies this API group.
    resource: "roles-management", // Resource family name used in permission keys and audit logs.
    writePermission: "roles-management-groups:write", // Required permission for POST/PUT/DELETE operations on groups.
    readPermission: "roles-management-groups:read", // Required permission for GET operations on groups.
  },
  // Roles Management - Dashboard Users API configuration.
  // Example: POST /api/roles-management/dashboard-users requires roles-management-users:write.
  {
    prefix: "/api/roles-management/dashboard-users", // URL path prefix for user management endpoints.
    resource: "roles-management", // Resource family name used in authorization checks.
    writePermission: "roles-management-users:write", // Required permission for user write operations.
    readPermission: "roles-management-users:read" // Required permission for user read operations.
  },
  // Roles Management - Dashboard Roles API configuration.
  // Example: GET /api/roles-management/dashboard-roles requires roles-management-roles:read.
  {
    prefix: "/api/roles-management/dashboard-roles", // URL path prefix for role management endpoints.
    resource: "roles-management", // Resource family name for audit and permission matching.
    writePermission: "roles-management-roles:write", // Required permission for role write operations.
    readPermission: "roles-management-roles:read" // Required permission for role read operations.
  },
  // Roles Management - Dashboard Permissions API configuration.
  // Example: GET /api/roles-management/dashboard-permissions requires roles-management-permissions:read.
  {
    prefix: "/api/roles-management/dashboard-permissions", // URL path prefix for permission management endpoints.
    resource: "roles-management", // Resource family name used in RBAC checks.
    writePermission: "roles-management-permissions:write", // Required permission for permission write operations.
    readPermission: "roles-management-permissions:read" // Required permission for permission read operations.
  },
  // Roles Management - Manage Group Scope API configuration.
  // Example: POST /api/roles-management/manage-group-scope requires roles-management-manage-group-scope:write.
  {
    prefix: "/api/roles-management/manage-group-scope", // URL path prefix for group scope management.
    resource: "roles-management", // Resource family name for scoping assignments.
    writePermission: "roles-management-manage-group-scope:write", // Required permission for scope write operations.
    readPermission: "roles-management-manage-group-scope:read", // Required permission for scope read operations.
  },
  // Roles Management - Manage Role Permission API configuration.
  // Example: POST /api/roles-management/manage-role-permission requires roles-management-manage-permissions:write.
  {
    prefix: "/api/roles-management/manage-role-permission", // URL path prefix for role-permission mapping.
    resource: "roles-management", // Resource family name for role-permission relationships.
    writePermission: "roles-management-manage-permissions:write", // Required permission for role-permission write operations.
    readPermission: "roles-management-manage-permissions:read" // Required permission for role-permission read operations.
  },
  // Roles Management - Manage User Role API configuration.
  // Example: POST /api/roles-management/manage-user-role requires roles-management-manage-user-roles:write.
  {
    prefix: "/api/roles-management/manage-user-role", // URL path prefix for user-role assignment.
    resource: "roles-management", // Resource family name for user role relationships.
    writePermission: "roles-management-manage-user-roles:write", // Required permission for user-role write operations.
    readPermission: "roles-management-manage-user-roles:read" // Required permission for user-role read operations.
  },
  // Roles Management - Manage Super Admin API configuration.
  // Example: POST /api/roles-management/manage-super-admin requires roles-management-admins:write.
  {
    prefix: "/api/roles-management/manage-super-admin", // URL path prefix for super admin elevation/revocation.
    resource: "roles-management", // Resource family name for super admin status changes.
    writePermission: "roles-management-admins:write", // Required permission for super admin write operations.
    readPermission: "roles-management-admins:read" // Required permission for super admin visibility.
  },
  // Roles Management - Import Azure AD Groups API configuration.
  // Example: POST /api/roles-management/import-ad-groups requires roles-management-import-ad-groups:write.
  {
    prefix: "/api/roles-management/import-ad-groups", // URL path prefix for importing/syncing Azure AD groups.
    resource: "roles-management", // Resource family name for Azure AD groups.
    writePermission: "roles-management-import-ad-groups:write", // Required permission for import AD groups write operations.
  },
  // Governance - User Privileges API configuration.
  // Example: GET /api/governance/user-privileges requires governance-user-privileges:read.
  { 
    prefix: "/api/governance/user-privileges", // URL path prefix for user privilege auditing.
    resource: "governance", // Resource family name for governance operations.
    readPermission: "governance-user-privileges:read", // Required permission for viewing user privileges.
    writePermission: "governance-user-privileges-cluster:manage" // Required permission for cluster operations related to user privileges.
  },
  // Governance - Login Activities API configuration.
  // Example: GET /api/governance/login-activities requires governance-login-activity:read.
  {
    prefix: "/api/governance/login-activities", // URL path prefix for login activity audit logs.
    resource: "governance", // Resource family name for governance audit trails.
    readPermission: "governance-login-activity:read", // Required permission for viewing login activity.
  },
  // Governance - Configuration Updates History API configuration.
  // Example: GET /api/governance/configuration-updates-history requires governance-configuration-update-history:read.
  {
    prefix: "/api/governance/configuration-updates-history", // URL path prefix for configuration change audit logs.
    resource: "governance", // Resource family name for configuration governance.
    readPermission: "governance-configuration-update-history:read", // Required permission for viewing configuration updates.
    writePermission: "governance-configuration-update-history-cluster:manage" // Required permission for cluster operations related to configuration.
  },
  // Data Quality Dashboard - Summary View API configuration.
  // Example: GET /api/data-quality-dashboard/summary-view requires data-quality-dashboard-summary-view:read.
  {
    prefix: "/api/data-quality-dashboard/summary-view", // URL path prefix for high-level DQ dashboard reporting.
    resource: "data-quality-dashboard-summary-view", // Resource family name specific to summary reporting.
    // enforceScopes: true, // Commented out: when enabled, scope checks apply (e.g., business_unit=Finance).
    readPermission: "data-quality-dashboard-summary-view:read", // Required permission for viewing DQ summary.
  },
  // Data Quality Dashboard - Detailed View API configuration.
  // Example: GET /api/data-quality-dashboard/detailed-view requires data-quality-dashboard-detailed-view:read.
  {
    prefix: "/api/data-quality-dashboard/detailed-view", // URL path prefix for granular DQ dashboard reporting.
    resource: "data-quality-dashboard-detailed-view", // Resource family name specific to detailed reporting.
    // enforceScopes: true, // Commented out: when enabled, scope checks apply (e.g., business_unit=Finance).
    readPermission: "data-quality-dashboard-detailed-view:read", // Required permission for viewing DQ details.
    writePermission: "data-quality-dashboard-detailed-view-cluster:manage" // Required permission for cluster operations on DQ detailed data.
  },
  // Data Quality Configuration - Registered Datasets API configuration.
  // Example: GET /api/great-expectations/data-quality/registered-datasets requires rules-management:read.
  {
    prefix: "/api/great-expectations/data-quality/registered-datasets", // URL path prefix for dataset registration.
    resource: "data-quality", // Resource family name for DQ configuration.
    enforceScopes: true, // Enable scope enforcement: users can only see datasets matching their scopes (e.g., dataset=customers).
    readPermission: "rules-management:read", // Required permission for viewing registered datasets.
  },
  // Data Quality Configuration - Manage Rule API configuration.
  // Example: POST /api/great-expectations/data-quality/manage-rule requires rules-management-manage-rules:write.
  {
    prefix: "/api/great-expectations/data-quality/manage-rule", // URL path prefix for rule creation/update/delete.
    resource: "data-quality", // Resource family name for DQ rules.
    writePermission: "rules-management-manage-rules:write", // Required permission for rule write operations.
  },
  // Data Quality Configuration - Register Dataset API configuration.
  // Example: POST /api/great-expectations/data-quality/register-dataset requires rules-management-register-dataset-cluster:manage.
  {
    prefix: "/api/great-expectations/data-quality/register-dataset", // URL path prefix for new dataset registration.
    resource: "data-quality", // Resource family name for dataset registration.
    writePermission: "rules-management-register-dataset-cluster:manage", // Required permission for registering datasets (cluster operation).
  },
  // Data Quality Configuration - Configured Rules API configuration.
  // Example: GET /api/great-expectations/data-quality/configured-rules requires rules-management-manage-rules:read.
  {
    prefix: "/api/great-expectations/data-quality/configured-rules", // URL path prefix for viewing configured rules.
    resource: "data-quality", // Resource family name for DQ rules.
    readPermission: "rules-management-manage-rules:read" // Required permission for viewing rule configurations.
  },
  // Data Quality Configuration - Dataset Metadata API configuration.
  // Example: GET /api/great-expectations/data-quality/dataset-metadata requires rules-management-manage-rules:read.
  {
    prefix: "/api/great-expectations/data-quality/dataset-metadata", // URL path prefix for dataset metadata retrieval.
    resource: "data-quality", // Resource family name for DQ metadata.
    readPermission: "rules-management-manage-rules:read" // Required permission for viewing dataset metadata.
  },
  // Data Quality Configuration - Configured Alerts API configuration.
  // Example: GET /api/great-expectations/data-quality/configured-alerts requires rules-management-manage-rules:write.
  {
    prefix: "/api/great-expectations/data-quality/configured-alerts", // URL path prefix for alert configuration viewing.
    resource: "data-quality", // Resource family name for DQ alerts.
    readPermission: "rules-management-manage-rules:write" // Required permission for alert configuration (elevated).
  },
  // Data Quality Configuration - Suggest Rules API configuration.
  // Example: GET /api/great-expectations/data-quality/suggest-rules requires rules-management-manage-rules:write.
  {
    prefix: "/api/great-expectations/data-quality/suggest-rules", // URL path prefix for AI-suggested rule recommendations.
    resource: "data-quality", // Resource family name for DQ rule suggestions.
    readPermission: "rules-management-manage-rules:write" // Required permission for accessing rule suggestions (elevated).
  },
  // KPI Configuration API configuration.
  // Example: GET /api/great-expectations/kpi requires kpi-config-management:read.
  {
    prefix: "/api/great-expectations/kpi", // URL path prefix for KPI configuration management.
    resource: "kpi-config", // Resource family name for KPI configurations.
    enforceScopes: true, // Enable scope enforcement: users can only manage KPIs matching their scopes (e.g., brand=US).
    readPermission: "kpi-config-management:read", // Required permission for viewing KPI configurations.
    writePermission: "kpi-config-management-cluster:manage", // Required permission for KPI write operations (cluster operation).
  },
  // KPI Dashboard - Summary View API configuration.
  // Example: GET /api/kpi-dashboard/summary-view requires kpi-dashboard-summary-view:read.
  {
    prefix: "/api/kpi-dashboard/summary-view", // URL path prefix for KPI summary dashboard.
    resource: "kpi-dashboard", // Resource family name for KPI dashboard reporting.
    enforceScopes: true, // Enable scope enforcement: users can only view KPIs matching their scopes (e.g., brand=US).
    readPermission: "kpi-dashboard-summary-view:read", // Required permission for KPI summary viewing.
  },
  // KPI Dashboard - Detailed View API configuration.
  // Example: GET /api/kpi-dashboard/detailed-view requires kpi-dashboard-detailed-view:read.
  {
    prefix: "/api/kpi-dashboard/detailed-view", // URL path prefix for detailed KPI metrics.
    resource: "kpi-dashboard", // Resource family name for detailed KPI reporting.
    enforceScopes: true, // Enable scope enforcement: users can only view detailed KPIs matching their scopes (e.g., brand=US).
    readPermission: "kpi-dashboard-detailed-view:read", // Required permission for detailed KPI viewing.
  },
  // Pipelines Dashboard API configuration.
  // Example: GET /api/pipelines-dashboard requires pipelines-dashboard:read.
  { 
    prefix: "/api/pipelines-dashboard", // URL path prefix for pipeline execution dashboard.
    resource: "pipelines-dashboard", // Resource family name for pipeline monitoring.
    readPermission: "pipelines-dashboard:read", // Required permission for pipeline dashboard access.
  },
  // Executive Dashboard API configuration.
  // Example: GET /api/executive-dashboard requires executive-dashboard:read.
  { 
    prefix: "/api/executive-dashboard", // URL path prefix for executive-level dashboard.
    resource: "executive-dashboard", // Resource family name for executive reporting.
    readPermission: "executive-dashboard:read" // Required permission for executive dashboard access.
  },
  { 
    prefix: "/api/tech-team-dashboard", // URL path prefix for tech-team-dashboard dashboard.
    resource: "tech-team-dashboard", // Resource family name for tech-team reporting.
    readPermission: "tech-team-dashboard:read" // Required permission for tech-team dashboard access.
  },
  // Data Refresh API configuration.
  // Example: GET /api/data-refresh requires data-refresh:read.
  { 
    prefix: "/api/data-refresh", // URL path prefix for data refresh operations.
    resource: "data-refresh", // Resource family name for refresh scheduling.
    enforceScopes: true, // Enable scope enforcement: users can only refresh data matching their scopes.
    readPermission: "data-refresh:read", // Required permission for viewing refresh status.
    writePermission: "data-refresh-cluster:manage", // Required permission for initiating data refresh (cluster operation).
  },
];

// ============================================================================
// ROUTE_OVERRIDES CONFIGURATION
// ============================================================================

// ROUTE_OVERRIDES defines route-specific permission exceptions for sensitive operations.
// Example: starting a cluster requires elevated permissions beyond the default domain policy permissions.
const ROUTE_OVERRIDES: RouteOverride[] = [
  // Cluster Management - Exact cluster endpoint override.
  // Example: POST /api/great-expectations/cluster requires any one of the cluster:manage permissions.
  {
    pattern: /^\/api\/great-expectations\/cluster(\/.*)?$/, // Regex pattern matching cluster endpoint and its sub-paths.
    methods: ["GET","POST"], // HTTP methods that trigger this override (cluster status and cluster start/stop).
    resource: "cluster", // Resource family name for audit logs and permission matching.
    action: "manage", // Action level: managing cluster lifecycle (higher privilege than standard CRUD).
    permissions: [
                  "data-quality-dashboard-detailed-view-cluster:manage", // Users managing DQ cluster can access cluster.
                  "kpi-config-management-cluster:manage", // Users managing KPI cluster can access cluster.
                  "governance-user-privileges-cluster:manage", // Users managing governance cluster can access cluster.
                  "governance-configuration-update-history-cluster:manage", // Users managing config cluster can access cluster.
                  "data-refresh-cluster:manage", // Users managing data refresh cluster can access cluster.
                  "rules-management-register-dataset-cluster:manage", // Users registering datasets can access cluster.
                  "rules-management-manage-rules:write", // Users managing DQ rules can access cluster.
                ], // List of accepted permissions (any one satisfies the requirement).
    requireAllPermissions: false, // False means user needs only ONE of the listed permissions, not all.
  },
  // Data Quality Dashboard - Business Unit Names endpoint override.
  // Example: GET /api/data-quality-dashboard/summary-view/business-unit-names requires any one of the specified permissions.
  {
    pattern: /^\/api\/data-quality-dashboard\/summary-view\/business-unit-names(\/.*)?$/, // Regex pattern for the business unit names endpoint.
    methods: ["GET"], // Only GET requests trigger this override.
    resource: "data-quality-dashboard-summary-view", // Resource family name for audit logs.
    action: "read", // Action level: reading business unit metadata.
    permissions: [
      "data-quality-dashboard-summary-view:read", // Standard DQ summary view permission.
      "data-refresh:read", // Users with data refresh read access.
      "roles-management-manage-group-scope:read", // Users managing group scopes can see business units.
      "rules-management-register-dataset-cluster:manage" // Users registering datasets can see business units.
    ], // List of accepted permissions (any one satisfies the requirement).
    requireAllPermissions: false // False means user needs only ONE of the listed permissions, not all.
  }
];
// QUERY_SCOPE_KEYS maps possible request field names to RBAC scope types.
// Example: businessUnit, L1_BUSINESS_UNIT, and L1_NAME all mean scope type "business_unit".
const QUERY_SCOPE_KEYS: Record<string, string[]> = {
  business_unit: [
    "businessUnit", // Camel-case API field.
    "business_unit", // Snake-case API field.
    "l1BusinessUnit", // Alternate frontend field.
    "l1_business_unit", // Alternate snake-case field.
    "L1_BUSINESS_UNIT", // Databricks-style uppercase field.
    "L1_NAME", // Existing data field used by some dashboard APIs.
  ],
  brand: ["brand", "brandName", "BRAND"], // Field names that identify a brand scope.
  catalog: ["catalog", "catalogName", "CATALOG_NAME"], // Field names that identify a catalog scope.
  schema: ["schema", "schemaName", "SCHEMA_NAME"], // Field names that identify a schema scope.
  dataset: ["dataset", "datasetName", "DATASET_NAME"], // Field names that identify a dataset scope.
  rule_category: ["ruleCategory", "RULE_CATEGORY"], // Field names that identify a rule category scope.
  kpi: ["kpi", "kpiName", "KPI_NAME"], // Field names that identify a KPI scope.
};

// Removes trailing slashes from paths so route matching is consistent.
// Example: "/api/me/" becomes "/api/me".
function normalizePath(pathname: string): string {
  // Keep "/" as-is, otherwise remove one or more trailing slashes.
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

// Converts an HTTP method into a business action.
// Example: GET becomes "read", POST becomes "create".
function methodAction(method: string): string {
  // Use upper-case so "get" and "GET" are treated the same.
  switch (method.toUpperCase()) {
    case "GET": // Read data.
    case "HEAD": // Read headers only.
    case "OPTIONS": // Ask what the route supports.
      return "read";
    case "POST": // Usually creates a new resource or starts an action.
      return "create";
    case "PUT": // Usually replaces a resource.
    case "PATCH": // Usually updates part of a resource.
      return "update";
    case "DELETE": // Usually deletes a resource.
      return "delete";
    default: // Unknown methods are treated as write-like to be conservative.
      return "write";
  }
}

// Finds which domain policy applies to an API path.
// Example: /api/kpi-dashboard/summary-view matches the /api/kpi-dashboard policy.
function getDomainPolicy(pathname: string): DomainPolicy {
  // Return the first matching policy; if none matches, use a generic API policy.
  return (
    DOMAIN_POLICIES.find((policy) => pathname.startsWith(policy.prefix)) ?? {
      prefix: "/api", // Generic fallback prefix.
      resource: "api", // Generic fallback resource.
    }
  );
}

// Chooses the exact permission key required for a domain and method.
// Example: GET under kpi-dashboard becomes "kpi-dashboard:read".
function getPolicyPermission(domainPolicy: DomainPolicy, method: string, action: string): string {
  // Read methods use readPermission if provided, otherwise resource:read.
  if (READ_METHODS.has(method)) {
    return domainPolicy.readPermission ?? `${domainPolicy.resource}:read`;
  }
  // Write methods use writePermission if provided, otherwise resource:action.
  return domainPolicy.writePermission ?? `${domainPolicy.resource}:${action}`;
}

// Adds one scope to the list if it is valid and not already present.
// Example: addScope(scopes, "brand", "US") adds { type:"brand", value:"US" }.
function addScope(scopes: RbacScope[], type: string, value: unknown): void {
  // Only string values are accepted as scopes.
  if (typeof value !== "string") {
    return;
  }

  // Remove extra spaces around the scope value.
  const trimmed = value.trim();

  // Ignore blank or placeholder values that do not represent real scopes.
  if (!trimmed || ["all", "undefined", "null"].includes(trimmed.toLowerCase())) {
    return;
  }

  // Check if the exact same scope already exists in a case-insensitive way.
  const exists = scopes.some(
    (scope) =>
      scope.type.toLowerCase() === type.toLowerCase() &&
      scope.value.toLowerCase() === trimmed.toLowerCase()
  );

  // Add the scope only once.
  if (!exists) {
    scopes.push({ type, value: trimmed });
  }
}

// Reads all known scope fields from a generic record and adds matching scopes.
// Example: { brand: "US", datasetName: "customers" } adds brand and dataset scopes.
function addScopeFromRecord(scopes: RbacScope[], record: Record<string, unknown>): void {
  // Loop through each supported scope type and its possible field names.
  for (const [scopeType, keys] of Object.entries(QUERY_SCOPE_KEYS)) {
    // Try every known field name for the current scope type.
    for (const key of keys) {
      // Add the scope when the field exists and has a useful value.
      addScope(scopes, scopeType, record[key]);
    }
  }

  // Also support explicit custom scopeType/scopeValue fields.
  // Example: { scopeType: "brand", scopeValue: "US" }.
  if (typeof record.scopeType === "string" && typeof record.scopeValue === "string") {
    addScope(scopes, record.scopeType, record.scopeValue);
  }

  // Also support the snake-case names already used by roles-management APIs.
  // Example: { scope_type: "business_unit", scope_value: "Finance" }.
  if (typeof record.scope_type === "string" && typeof record.scope_value === "string") {
    // Add the explicit scope to the authorization policy before the API handler runs.
    addScope(scopes, record.scope_type, record.scope_value);
  }
}

// Safely reads a JSON request body without consuming the original request.
// Example: POST body { "brand": "US" } can contribute a brand scope.
async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  // If the request is not JSON, there is no JSON body to inspect.
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return null;
  }

  // JSON parsing can fail, so keep this safe and return null on invalid JSON.
  try {
    // Clone the request so route handlers can still read the original body later.
    const body = await request.clone().json();

    // Use only object-shaped JSON bodies, not arrays or primitive values.
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    // Invalid JSON should not crash authorization; it simply contributes no scopes.
    return null;
  }
}

// Reads dynamic route parameters from Next.js route context.
// Example: /api/items/[id] can produce { id: "123" }.
async function getRouteParams(context?: RouteContext): Promise<Record<string, unknown>> {
  // Next.js may provide params immediately or as a Promise, so Promise.resolve handles both.
  const params = context?.params ? await Promise.resolve(context.params) : {};

  // Return params as a generic record so scope extraction can inspect field names.
  return params as Record<string, unknown>;
}

// Collects resource scopes from route params, query string, path segments, and JSON body.
// Example: /api/.../business-unit/Finance adds business_unit=Finance.
export async function collectRequestScopes(
  request: NextRequest, // Incoming API request.
  context?: RouteContext // Optional Next.js route params.
): Promise<RbacScope[]> {
  // Start with an empty list and add scopes from all available request locations.
  const scopes: RbacScope[] = [];

  // Parse the request URL so path and query parameters can be inspected.
  const url = new URL(request.url);

  // Normalize the path before matching path patterns.
  const pathname = normalizePath(url.pathname);

  // Read dynamic route params, such as [businessUnit].
  const routeParams = await getRouteParams(context);

  // Convert query parameters into a simple object, for example ?brand=US.
  const queryRecord = Object.fromEntries(url.searchParams.entries());

  // Add scopes found in route params.
  addScopeFromRecord(scopes, routeParams);

  // Add scopes found in query string.
  addScopeFromRecord(scopes, queryRecord);

  // Path patterns detect scopes embedded directly in the URL path.
  const pathScopePatterns: Array<[string, RegExp]> = [
    ["business_unit", /\/business-unit\/([^/]+)/], // Example: /business-unit/Finance.
    ["brand", /\/brand\/([^/]+)/], // Example: /brand/US.
    ["rule_category", /\/rule-category\/([^/]+)/], // Example: /rule-category/data-drift.
  ];

  // Check each supported path pattern.
  for (const [scopeType, pattern] of pathScopePatterns) {
    // Extract the matching path value if present.
    const value = pathname.match(pattern)?.[1];

    // Decode URL text like "US%20Commercial" into "US Commercial", then add it as a scope.
    if (value) addScope(scopes, scopeType, decodeURIComponent(value));
  }

  // Try to read JSON body fields as additional scopes.
  const jsonBody = await readJsonBody(request);

  // If a JSON object exists, inspect known scope fields inside it.
  if (jsonBody) {
    addScopeFromRecord(scopes, jsonBody);
  }

  // Return the full set of scopes discovered on this request.
  return scopes;
}

// Resolves the RBAC policy required for the current API request.
// Example: GET /api/data-refresh becomes permission "data-refresh:read".
export async function resolvePolicy(
  request: NextRequest, // Incoming API request.
  context?: RouteContext // Optional Next.js route params.
): Promise<RbacPolicy> {
  // Normalize the HTTP method to upper-case.
  const method = request.method.toUpperCase();

  // Normalize the request path so route matching is stable.
  const pathname = normalizePath(new URL(request.url).pathname);

  // Check whether a special route override applies before using the general domain policy.
  const routeOverride = ROUTE_OVERRIDES.find(
    (override) => override.methods.includes(method) && override.pattern.test(pathname)
  );

  // If an override matched, build the policy from the override.
  if (routeOverride) {
    // Collect scopes only when the override asks for scoped enforcement.
    const scopes = routeOverride.enforceScopes
      ? await collectRequestScopes(request, context)
      : [];

    // Return the special-case policy.
    return {
      resource: routeOverride.resource, // Resource family for audit and checks.
      action: routeOverride.action, // Action such as "manage" or "execute".
      permissions: routeOverride.permissions, // Required permission list.
      scopes, // Required scopes collected from the request.
      requireAllScopes: true, // All detected scopes must match when scopes exist.
      requireAllPermissions: routeOverride.requireAllPermissions
    };
  }

  // No override matched, so use the broader folder/domain policy.
  const domainPolicy = getDomainPolicy(pathname);

  // Convert HTTP method into a business action.
  const action = methodAction(method);

  // Collect scopes only for domains configured with enforceScopes=true.
  const scopes = domainPolicy.enforceScopes ? await collectRequestScopes(request, context) : [];

  // Return the default policy for this API path and method.
  return {
    resource: domainPolicy.resource, // Resource family, for example "kpi-dashboard".
    action, // Business action, for example "read" or "update".
    permissions: [getPolicyPermission(domainPolicy, method, action)], // Required permission key.
    scopes, // Required scopes, if any were collected.
    requireAllScopes: true, // All detected scopes must match when scopes exist.
  };
}
