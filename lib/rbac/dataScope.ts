/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the RBAC data-scoping engine that enforces row-level access control in Databricks SQL queries.
    - The script reads permission grants and group scopes from the request header (x-rbac-data-scope-grants) and converts them into SQL WHERE/AND predicates.
    - It builds case-insensitive SQL IN clauses and multi-scope AND logic to restrict query results to only rows a user is authorized to access.
    - It provides domain-specific scope column mappers for Data Quality execution results, Data Drift config, KPI config/execution, and dataset tags.
    - It wraps SELECT queries with RBAC filtering by applying predicates to the final result set, ensuring no data leaks occur.
    - It integrates with the Databricks SQL executor to transparently apply row-level filtering without modifying the original query logic.
    - Suitable for pharmaceutical/regulated environments requiring row-level access control across analytics, quality metrics, and KPI data.
*/

// NextRequest is the incoming API request type used by Next.js route handlers.
// Example: a dashboard API can pass its request here so this helper can read RBAC headers.
import type { NextRequest } from "next/server";

// IDBSQLSession is the active Databricks SQL session type used by executeScopedQuery.
// Example: const session = await getDatabricksSession().
import type IDBSQLSession from "@databricks/sql/dist/contracts/IDBSQLSession";

// executeQuery is the existing shared Databricks SQL runner used across API routes.
// Example: executeScopedQuery builds a safer query, then delegates to executeQuery.
import { executeQuery } from "@/lib/azure/databricksClient";

// grantSatisfiesPermission checks permission inheritance and wildcard permissions.
// Example: "data-quality-dashboard:*" can satisfy "data-quality-dashboard:read".
import { grantSatisfiesPermission } from "./permissions";

// sqlString safely quotes scope values before they are placed into SQL.
// Example: O'Brien becomes 'O''Brien' so the quote stays data, not SQL syntax.
import { sqlString } from "./sql";

// Shared RBAC types used to build scope grants and inspect policies.
import type { RbacPolicy, RbacScope, RbacUserContext } from "./types";

// This request header carries the user's permission-scoped group grants from authorization into the API SQL layer.
// Example value: [{"permissionKey":"kpi-dashboard:read","scopes":[{"type":"brand","value":"US"}]}].
export const RBAC_DATA_SCOPE_GRANTS_HEADER = "x-rbac-data-scope-grants";

// ScopeColumnMap tells RBAC which SQL column represents each business scope in one query.
// Example: { business_unit: "di.L1_BUSINESS_UNIT", dataset: "di.DATASET_NAME" }.
export type ScopeColumnMap = Record<string, string | string[] | undefined>;

// RbacDataScopeGrant is the compact grant shape stored in the request header for SQL filtering.
// Example: one group-role grant may allow data-quality-dashboard:read for business_unit=Finance.
export interface RbacDataScopeGrant {
  permissionKey: string; // Permission attached to this grant, such as "data-quality-dashboard:read".
  scopes: RbacScope[]; // Group scopes attached to this grant, such as business_unit=Finance.
}

// Normalizes text for case-insensitive comparisons.
// Example: " Finance " becomes "finance".
function normalize(value: string): string {
  // Trim spaces and lower-case text so "FINANCE" and "finance" are treated the same.
  return value.trim().toLowerCase();
}

// Checks whether a value means "all values".
// Example: "*" and "all" both mean there is no value restriction for that scope type.
function isWildcardValue(value: string): boolean {
  // Compare normalized text so " ALL " works the same as "all".
  return ["*", "all"].includes(normalize(value));
}

// Checks whether a scope means global access across every data row.
// Example: { type: "global", value: "*" } means the query should not add row filters.
function isGlobalScope(scope: RbacScope): boolean {
  // Normalize both type and value before comparing them.
  const type = normalize(scope.type);

  // Normalize the value once so wildcard checks are consistent.
  const value = normalize(scope.value);

  // "global" always means all data; "tenant=*" and "tenant=all" mean the same thing.
  return type === "global" || (type === "tenant" && ["*", "all"].includes(value));
}

// Removes duplicate scopes from a grant so SQL predicates stay small and readable.
// Example: two business_unit=Finance rows become one Finance filter.
function uniqueScopes(scopes: RbacScope[]): RbacScope[] {
  // Keep a set of normalized type/value pairs already seen.
  const seen = new Set<string>();

  // Keep the first copy of each scope and discard repeats.
  return scopes.filter((scope) => {
    // Build a stable key such as "business_unit::finance".
    const key = `${normalize(scope.type)}::${normalize(scope.value)}`;

    // If the scope was already seen, do not include it again.
    if (seen.has(key)) {
      return false;
    }

    // Remember this scope for later duplicate checks.
    seen.add(key);

    // Keep this first occurrence.
    return true;
  });
}

// Builds the data-scope grants that are relevant to the route policy that was just authorized.
// Example: a KPI route only receives grants that can satisfy one of the KPI route permissions.
export function buildDataScopeGrantsForPolicy(
  userContext: RbacUserContext, // Full current-user RBAC profile loaded from Databricks.
  policy: RbacPolicy // Route policy that was evaluated for this API request.
): RbacDataScopeGrant[] {
  // Super admins get one global grant so downstream SQL does not add row filters.
  if (userContext.isSuperAdmin) {
    return [{ permissionKey: "*", scopes: [{ type: "global", value: "*" }] }];
  }

  // Keep grants whose permission can satisfy at least one permission required by this API.
  const matchingGrants = userContext.grants.filter((grant) =>
    policy.permissions.length === 0
      ? true
      : policy.permissions.some((requiredPermission) =>
          grantSatisfiesPermission(grant, requiredPermission)
        )
  );

  // Convert the full grant objects into the minimal shape needed by SQL helpers.
  return matchingGrants.map((grant) => ({
    permissionKey: grant.permissionKey, // Preserve permission for diagnostics and future route-specific logic.
    scopes: uniqueScopes(grant.scopes), // Preserve the group scopes that define allowed data rows.
  }));
}

// Serializes data-scope grants for safe storage in a request header.
// Example: route handlers can later read x-rbac-data-scope-grants and build SQL filters.
export function serializeDataScopeGrants(grants: RbacDataScopeGrant[]): string {
  // JSON is used because headers are text but grants are structured data.
  return JSON.stringify(grants);
}

// Safely parses data-scope grants from a request header.
// Example: if the header is missing or malformed, return an empty list instead of crashing the API.
export function getRbacDataScopeGrantsFromRequest(request: NextRequest): RbacDataScopeGrant[] {
  // Read the header that withAuthorization attaches after the user is allowed.
  const rawHeaderValue = request.headers.get(RBAC_DATA_SCOPE_GRANTS_HEADER);

  // If there is no header, no data grants are available for this query.
  if (!rawHeaderValue) {
    return [];
  }

  // Header parsing can fail if the value is corrupted, so keep it guarded.
  try {
    // Parse JSON text into JavaScript data.
    const parsed = JSON.parse(rawHeaderValue);

    // Only arrays are accepted because the header should hold a list of grants.
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validate and normalize each grant defensively before using it for SQL.
    return parsed
      .map((grant): RbacDataScopeGrant | null => {
        // A usable grant must be an object with a permission key and an array of scopes.
        if (
          !grant ||
          typeof grant !== "object" ||
          typeof grant.permissionKey !== "string" ||
          !Array.isArray(grant.scopes)
        ) {
          return null;
        }

        // Keep only scope entries that have text type and text value.
        const scopes = grant.scopes.filter(
          (scope: unknown): scope is RbacScope =>
            Boolean(scope) &&
            typeof scope === "object" &&
            typeof (scope as RbacScope).type === "string" &&
            typeof (scope as RbacScope).value === "string"
        );

        // Return the clean grant shape.
        return {
          permissionKey: grant.permissionKey,
          scopes: uniqueScopes(scopes),
        };
      })
      .filter((grant): grant is RbacDataScopeGrant => Boolean(grant));
  } catch {
    // Malformed headers should behave as no grants, which makes scoped SQL return no rows.
    return [];
  }
}

// Converts one column or many fallback columns into a clean array.
// Example: business_unit may map to ["di.L1_BUSINESS_UNIT", "st.tag_value"].
function normalizeColumns(columns: string | string[] | undefined): string[] {
  // Treat missing columns as an empty list.
  if (!columns) {
    return [];
  }

  // Convert a single column string into a one-item list.
  const columnList = Array.isArray(columns) ? columns : [columns];

  // Remove blank column expressions.
  return columnList.map((column) => column.trim()).filter(Boolean);
}

// Groups scopes by type and removes wildcard values when a type already allows all values.
// Example: brand=US and brand=EU becomes { brand: ["US", "EU"] }.
function groupScopedValues(scopes: RbacScope[]): Map<string, string[]> {
  // Store scope values by normalized scope type.
  const grouped = new Map<string, string[]>();

  // Walk through every scope from a grant.
  for (const scope of scopes) {
    // Normalize the type so "Brand" and "brand" are grouped together.
    const type = normalize(scope.type);

    // Ignore global scopes here because callers handle them before grouping.
    if (isGlobalScope(scope)) {
      continue;
    }

    // Normalize the scope value for comparison.
    const value = scope.value.trim();

    // Ignore blank values because they cannot safely restrict SQL.
    if (!value) {
      continue;
    }

    // If this scope type already has "*" or "all", no individual value is needed.
    const currentValues = grouped.get(type) ?? [];

    // Wildcard means this type should not restrict the query.
    if (isWildcardValue(value)) {
      grouped.set(type, ["*"]);
      continue;
    }

    // If wildcard was previously added, extra values are unnecessary.
    if (currentValues.some(isWildcardValue)) {
      continue;
    }

    // Avoid duplicate values within the same scope type.
    if (!currentValues.some((existingValue) => normalize(existingValue) === normalize(value))) {
      currentValues.push(value);
    }

    // Save the updated value list.
    grouped.set(type, currentValues);
  }

  // Return grouped scope values.
  return grouped;
}

// Builds a case-insensitive SQL IN predicate for one scope type.
// Example: lower(CAST(di.BRAND AS STRING)) IN ('teva','actavis').
function buildValuePredicate(columns: string[], values: string[]): string | null {
  // A wildcard means this scope type gives all values, so no predicate is needed for that type.
  if (values.some(isWildcardValue)) {
    return null;
  }

  // If there are no concrete values, there is nothing safe to add.
  if (values.length === 0) {
    return null;
  }

  // Quote and normalize each value for a case-insensitive SQL comparison.
  const sqlValues = values.map((value) => sqlString(normalize(value))).join(", ");

  // Apply the same value set to every possible column expression for this scope type.
  const columnPredicates = columns.map(
    (column) => `lower(CAST(${column} AS STRING)) IN (${sqlValues})`
  );

  // One matching column is enough when a route supplies alternate column expressions.
  return `(${columnPredicates.join(" OR ")})`;
}

// Builds the predicate for one grant.
// Example: one group grant may require business_unit=Finance AND dataset=customers.
function buildGrantPredicate(
  grant: RbacDataScopeGrant, // One permission + group scopes grant.
  columnMap: ScopeColumnMap // SQL columns available in the query being protected.
): string | null {
  // A global scope means this grant can see all rows for this API.
  if (grant.scopes.some(isGlobalScope)) {
    return "";
  }

  // Group scopes by type so values in the same type use OR/IN logic.
  const groupedScopes = groupScopedValues(grant.scopes);

  // Keep predicates for each scope type that this query can represent.
  const grantPredicates: string[] = [];

  // Track whether at least one of the grant's scope types can be mapped to a SQL column.
  let hasMappedScopeType = false;

  // Check every scope type attached to this grant.
  for (const [scopeType, values] of groupedScopes.entries()) {
    // Find the SQL column or columns that represent this scope type in the current query.
    const columns = normalizeColumns(columnMap[scopeType]);

    // If this query does not have a column for this scope type, it cannot use that scope here.
    if (columns.length === 0) {
      continue;
    }

    // At least one scope type is safely represented by the query.
    hasMappedScopeType = true;

    // Build the SQL predicate for this type, unless the type has a wildcard value.
    const valuePredicate = buildValuePredicate(columns, values);

    // Add the predicate when concrete values are present.
    if (valuePredicate) {
      grantPredicates.push(valuePredicate);
    }
  }

  // If no grant scope could be mapped to this query, do not use the grant for data access.
  if (!hasMappedScopeType) {
    return null;
  }

  // If mapped scope types were all wildcard values, this grant gives unrestricted rows for this query shape.
  if (grantPredicates.length === 0) {
    return "";
  }

  // Different scope types are combined with AND to enforce narrow access.
  // Example: business_unit=Finance AND dataset=customer_master.
  return `(${grantPredicates.join(" AND ")})`;
}

// Builds the full SQL predicate for the current user's data scopes.
// Example: grant A Finance OR grant B HR becomes ((Finance predicate) OR (HR predicate)).
export function buildRbacDataScopePredicate(
  request: NextRequest, // Incoming request carrying the RBAC grants header.
  columnMap: ScopeColumnMap // SQL column expressions for this specific query.
): string {
  // Read grant-level scopes that withAuthorization attached after checking permissions.
  const grants = getRbacDataScopeGrantsFromRequest(request);

  // No grants means a scoped data route should return no rows.
  if (grants.length === 0) {
    return "1 = 0";
  }

  // Build predicates for grants that can be represented by the query.
  const grantPredicates: string[] = [];

  // Walk through each permission grant.
  for (const grant of grants) {
    // Convert this grant's scopes into SQL for the current query.
    const grantPredicate = buildGrantPredicate(grant, columnMap);

    // Empty string means the grant is global or wildcard-only for this query, so no row filter is needed.
    if (grantPredicate === "") {
      return "";
    }

    // Null means the grant could not be safely mapped to this query, so skip it.
    if (grantPredicate) {
      grantPredicates.push(grantPredicate);
    }
  }

  // If no grant can safely filter this query, return no rows instead of leaking data.
  if (grantPredicates.length === 0) {
    return "1 = 0";
  }

  // Grants are combined with OR because any one valid group grant can allow a row.
  return `(${grantPredicates.join(" OR ")})`;
}

// Builds an AND clause that can be appended to an existing SQL WHERE block.
// Example output: "AND ((lower(CAST(di.BRAND AS STRING)) IN ('us')))".
export function buildRbacDataScopeAndClause(
  request: NextRequest, // Incoming request carrying current-user RBAC data scopes.
  columnMap: ScopeColumnMap // Query-specific mapping from scope type to SQL column.
): string {
  // Build the core predicate first.
  const predicate = buildRbacDataScopePredicate(request, columnMap);

  // Empty predicate means full access, so no extra SQL is needed.
  if (!predicate) {
    return "";
  }

  // Prefix with AND because callers place this inside an existing WHERE clause.
  return `AND ${predicate}`;
}

// Builds a WHERE clause for queries that do not already have one.
// Example output: "WHERE lower(CAST(BRAND AS STRING)) IN ('us')".
export function buildRbacDataScopeWhereClause(
  request: NextRequest, // Incoming request carrying current-user RBAC data scopes.
  columnMap: ScopeColumnMap // Query-specific mapping from scope type to SQL column.
): string {
  // Build the core predicate first.
  const predicate = buildRbacDataScopePredicate(request, columnMap);

  // Empty predicate means full access, so no WHERE clause is needed.
  if (!predicate) {
    return "";
  }

  // Prefix with WHERE because callers use this when no WHERE exists yet.
  return `WHERE ${predicate}`;
}

// Wraps a complete SELECT query and filters its final rows using columns returned by that SELECT.
// Example: a query returning BRAND can be wrapped and filtered as __rbac_scoped.BRAND.
export function applyRbacDataScopeToQuery(
  sql: string, // Original SELECT SQL.
  request: NextRequest, // Incoming request carrying current-user RBAC data scopes.
  columnMap: ScopeColumnMap // Columns available on the final SELECT result.
): string {
  // Build the predicate against the wrapper alias supplied by the caller.
  const predicate = buildRbacDataScopePredicate(request, columnMap);

  // Empty predicate means full access, so return the original SQL unchanged.
  if (!predicate) {
    return sql;
  }

  // Remove extra trailing semicolons because this query will be nested inside another SELECT.
  const trimmedSql = sql.trim().replace(/;+$/, "");

  // Wrap the original SQL and apply the RBAC row filter to the outer result.
  return `
    SELECT *
    FROM (
      ${trimmedSql}
    ) __rbac_scoped
    WHERE ${predicate}
  `;
}

// Executes a scoped SELECT query in Databricks by wrapping the final result.
// Example: executeScopedQuery(session, request, sql, { brand: "__rbac_scoped.BRAND" }).
export async function executeScopedQuery<T = unknown>(
  session: IDBSQLSession, // Active Databricks SQL session.
  request: NextRequest, // Current API request carrying the RBAC grant header.
  sql: string, // Original SELECT SQL to execute.
  columnMap: ScopeColumnMap // Scope columns available in the final SELECT.
): Promise<T[]> {
  // Apply the RBAC wrapper before sending SQL to Databricks.
  const scopedSql = applyRbacDataScopeToQuery(sql, request, columnMap);

  // Delegate actual execution to the existing Databricks helper.
  return executeQuery<T>(session, scopedSql);
}

// Builds scope columns for Data Quality execution-result aliases.
// Example: dataQualityScopeColumns("di") maps business_unit to "di.L1_BUSINESS_UNIT".
export function dataQualityScopeColumns(alias?: string): ScopeColumnMap {
  // Add "alias." only when an alias is supplied.
  const prefix = alias ? `${alias}.` : "";

  // Return the common Data Quality scope-to-column mapping.
  return {
    business_unit: `${prefix}L1_BUSINESS_UNIT`,
    catalog: `${prefix}CATALOG_NAME`,
    schema: `${prefix}SCHEMA_NAME`,
    dataset: `${prefix}DATASET_NAME`,
    rule_category: `${prefix}RULE_CATEGORY`,
  };
}

// Builds scope columns for Data Drift configuration aliases.
// Example: dataDriftScopeColumns("dd") maps business_unit to "dd.L1_BUSINESS_UNIT" and rule_category to the literal "data_drift".
export function dataDriftScopeColumns(alias?: string): ScopeColumnMap {
  // Add "alias." only when an alias is supplied.
  const prefix = alias ? `${alias}.` : "";

  // Data drift config rows may not have a physical RULE_CATEGORY column, so use the literal category value.
  return {
    business_unit: `${prefix}L1_BUSINESS_UNIT`,
    catalog: `${prefix}CATALOG_NAME`,
    schema: `${prefix}SCHEMA_NAME`,
    dataset: `${prefix}DATASET_NAME`,
    rule_category: "'data_drift'",
  };
}

// Builds scope columns for Data Quality dataset-tag aliases.
// Example: dataQualityTagScopeColumns("st") maps business_unit to "st.tag_value".
export function dataQualityTagScopeColumns(alias = "st"): ScopeColumnMap {
  // Return scope columns derived from the dataset-tag table.
  return {
    business_unit: `${alias}.tag_value`,
    catalog: `SPLIT(${alias}.table_full_name, '\\\\.')[0]`,
    schema: `SPLIT(${alias}.table_full_name, '\\\\.')[1]`,
    dataset: `SPLIT(${alias}.table_full_name, '\\\\.')[2]`,
  };
}

// Builds scope columns for KPI configuration aliases.
// Example: kpiConfigScopeColumns("c") maps brand to "c.BRAND" and kpi to "c.KPI_NAME".
export function kpiConfigScopeColumns(alias?: string): ScopeColumnMap {
  // Add "alias." only when an alias is supplied.
  const prefix = alias ? `${alias}.` : "";

  // Return the common KPI configuration scope-to-column mapping.
  return {
    brand: `${prefix}BRAND`,
    catalog: `${prefix}CATALOG_NAME`,
    schema: `${prefix}SCHEMA_NAME`,
    dataset: `${prefix}DATASET_NAME`,
    kpi: `${prefix}KPI_NAME`,
  };
}

// Builds scope columns for KPI execution-result aliases.
// Example: kpiExecutionScopeColumns("k") maps brand to "k.BRAND".
export function kpiExecutionScopeColumns(alias?: string): ScopeColumnMap {
  // Add "alias." only when an alias is supplied.
  const prefix = alias ? `${alias}.` : "";

  // Execution result rows reliably expose brand and KPI name; deeper dataset scopes usually live on the config table.
  return {
    brand: `${prefix}BRAND`,
    kpi: `${prefix}KPI_NAME`,
  };
}

// Merges several scope column maps into one map.
// Example: mergeScopeColumnMaps(dataQualityScopeColumns("di"), dataQualityTagScopeColumns("st")).
export function mergeScopeColumnMaps(...maps: ScopeColumnMap[]): ScopeColumnMap {
  // Start with an empty result map.
  const merged: ScopeColumnMap = {};

  // Walk through every map provided by the caller.
  for (const map of maps) {
    // Walk through every scope type and its column expression(s).
    for (const [scopeType, columns] of Object.entries(map)) {
      // Normalize current and new columns into arrays.
      const existingColumns = normalizeColumns(merged[scopeType]);
      const newColumns = normalizeColumns(columns);

      // Combine columns while keeping order and avoiding exact duplicates.
      merged[scopeType] = [...existingColumns, ...newColumns].filter(
        (column, index, allColumns) => allColumns.indexOf(column) === index
      );
    }
  }

  // Return the combined mapping.
  return merged;
}
