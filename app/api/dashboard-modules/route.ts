/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 01 June 2026

  Purpose of the script:
// WHAT THIS FILE DOES:
//   When a user opens the dashboard, their browser asks this file:
//   "Which menu items should I show in the left-hand sidebar?"
//
//   This file answers that question by:
//     1. Checking who the user is (authentication).
//     2. Looking up what permissions that user has (e.g. "can view reports").
//     3. Fetching every menu item from the database.
//     4. Filtering out menu items the user is not allowed to see.
//     5. Grouping parent menu items together with their child sub-items.
//     6. Sending the final nested list back to the browser as JSON.
//
// REAL-WORLD ANALOGY:
//   Think of this like a restaurant menu system.
//   The database holds every dish on the menu.
//   Not every customer can order every dish (e.g. staff-only items).
//   This file figures out which dishes THIS customer is allowed to see,
//   and returns a menu with sections (starters, mains) and their items.
// ============================================================================
*/

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — IMPORTS
// These lines bring in tools written elsewhere that this file needs to work.
// Think of them like "plugins" or "appliances" you plug in before cooking.
// ─────────────────────────────────────────────────────────────────────────────

// NextResponse: a helper that packages data into a proper HTTP response the
//   browser can read. Like putting a letter into an envelope before sending it.
// NextRequest: represents the incoming request from the user's browser.
//   Like the envelope that arrives containing the user's question.
import { NextResponse, type NextRequest } from "next/server";

// CATALOG_NAME: the Databricks "database cluster" name, e.g. "dset_dev".
// SCHEMA_NAME: the sub-folder inside that cluster, e.g. "data_integrity".
// Together they form the address of the table in Databricks, like a street + city.
import { CATALOG_NAME, SCHEMA_NAME, DASHBOARD_MODULES_TABLE } from "@/constants/config";

// getDatabricksSession: opens (or reuses) a connection to the Databricks database.
//   Like picking up a telephone before you can talk to the database.
// executeQuery: sends a SQL question to the database and waits for the answer.
//   Like asking "show me all menu items" and getting back a list of rows.
import { executeQuery, getDatabricksSession } from "@/lib/azure/databricksClient";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// getAuthenticatedPrincipal: figures out WHO is making this request.
//   On a developer's local machine it reads from a .env file.
//   On the live Azure server it reads from Microsoft EasyAuth headers.
//   Either way, it returns an object identifying the user (email, object ID, etc.).
import { getAuthenticatedPrincipal } from "@/lib/rbac/identity";

// permissionMatches: compares two permission strings to see if one covers the other.
//   Example: the user has "reports:*" (wildcard = all reports actions).
//            the module needs "reports:read".
//            permissionMatches("reports:*", "reports:read") → true ✓
//   Like checking if a master key opens a specific door.
import { permissionMatches } from "@/lib/rbac/permissions";

// getRbacUserContext: loads the full RBAC profile for the identified user.
//   RBAC = Role-Based Access Control — the system that decides what each user can do.
//   This function returns which groups, roles, and permissions the user has.
//   Like fetching someone's employee record to see their job title and access badge level.
import { getRbacUserContext } from "@/lib/rbac/repository";

// RbacPolicy: a TypeScript type that describes "what resource + action this endpoint protects".
//   Like a label on the bouncer's clipboard saying "this door = dashboard-modules, action = read".
// RbacUserContext: a TypeScript type that describes the logged-in user's full RBAC profile.
//   Like an employee badge that lists their name, department, and all the rooms they can enter.
import type { RbacPolicy, RbacUserContext } from "@/lib/rbac/types";

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
 

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — NEXT.JS ROUTE SETTINGS
// These two lines tell Next.js how to run this API route.
// ─────────────────────────────────────────────────────────────────────────────

// "nodejs" tells Next.js to run this file using the full Node.js server engine.
// This is required because the Databricks client library uses Node.js features
// (like TCP sockets) that are not available in the lightweight "edge" runtime.
// Think of it like saying "this recipe needs a full oven, not just a microwave".
export const runtime = "nodejs";

// "force-dynamic" tells Next.js: never cache the response to this API.
// Every user gets a fresh, personalised answer each time they ask.
// Without this, Next.js might serve one user's menu to a completely different user.
// Like a waiter who takes a fresh order each time rather than serving yesterday's food.
export const dynamic = "force-dynamic";


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — RAW DATABASE ROW TYPE
//
// When we ask Databricks "give me all modules", it returns rows of data.
// Each row is one menu item from the database. The shape of that raw row
// is described here as a TypeScript type — it tells us what fields to expect
// and what data types they might be (string, number, null, etc.).
//
// IMPORTANT: database drivers don't always return perfectly typed data.
// Numbers might come back as strings, booleans as 0/1, arrays as text.
// That's why every field here is marked optional (?) and typed loosely.
// The parsing helpers in Section 5 will clean them up into reliable types.
// ─────────────────────────────────────────────────────────────────────────────

// DashboardModuleRow = the shape of one raw row from the dashboard_modules table.
// The "?" after each field name means "this field might be missing — handle it safely".
type DashboardModuleRow = {

  // The unique identifier for this menu item, stored in the database.
  // Example: "mod-reports" or "mod-data-quality".
  // Used internally to link children to their parents.
  module_id?: string;

  // The ID of this module's parent menu item.
  // If this is NULL (empty), the module is a top-level item in the sidebar.
  // If it has a value like "mod-reports", this module is a sub-item under Reports.
  // Example: "mod-reports-sales" has parent_module_id = "mod-reports".
  // Like a folder structure: NULL = top-level folder, value = file inside a folder.
  parent_module_id?: string | null;

  // A URL-safe short name used in navigation and code.
  // Example: "reports" or "reports/sales". Never has spaces or special characters.
  // The browser uses this to build the page URL: /dashboard/reports/sales.
  module_slug?: string;

  // The human-readable label shown in the sidebar.
  // Example: "Sales Reports" or "Data Quality Dashboard".
  display_name?: string;

  // An optional file path for the icon shown next to the menu item.
  // Example: "/icons/reports.svg". May be null/empty for child items.
  icon_path?: string | null;

  // The list of permissions a user needs in order to see this module.
  // Typed as "unknown" because Databricks can return this in several formats:
  //   - a real JavaScript array: ["reports:read", "reports:export"]
  //   - a string that looks like an array: "['reports:read','reports:export']"
  //   - a comma-separated string: "reports:read,reports:export"
  // The parseRequiredPermissions function will normalise whatever arrives.
  required_permissions?: unknown;

  // Controls whether the user needs ALL listed permissions or just ONE.
  // true  → user must have every permission in the list (AND logic).
  // false → user only needs one permission from the list (OR logic).
  // Typed loosely because the database might return true/false, 1/0, or "yes"/"no".
  require_all?: boolean | number | string | null;

  // A number that controls the display order of modules in the sidebar.
  // Lower number = appears higher up. Example: 1 = first, 2 = second, etc.
  // Typed loosely because the database might return a number or a string like "10".
  sort_order?: number | string | null;

  // How deeply nested this module is in the menu hierarchy.
  // 0 = top-level sidebar item (e.g. "Reports").
  // 1 = first-level child (e.g. "Sales" under "Reports").
  // 2 = second-level grandchild (e.g. "Q1 Sales" under "Sales" under "Reports").
  // Typed loosely for the same reason as sort_order.
  depth?: number | string | null;
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — CLEAN INTERNAL TYPES
//
// After the raw database rows are parsed and cleaned, we work with these
// two well-typed shapes internally. They have no "unknown" or optional fields —
// everything is a guaranteed, clean value we can safely use in logic.
// ─────────────────────────────────────────────────────────────────────────────

// DashboardModule = a fully cleaned, flat (non-nested) module object.
// "Flat" means children are NOT yet attached here — that happens later in buildVisibleTree.
// This shape is used internally for permission checking and tree building.
// It is NEVER sent directly to the browser.
type DashboardModule = {

  // The module's unique ID after cleaning. Guaranteed to be a non-empty string.
  // Example: "mod-reports"
  moduleId: string;

  // The parent's ID, or null if this is a top-level module.
  // Example: null for "Reports", "mod-reports" for "Sales Reports".
  parentModuleId: string | null;

  // The URL-safe slug. Guaranteed non-empty. Example: "reports/sales".
  moduleSlug: string;

  // The sidebar label. Guaranteed non-empty. Example: "Sales Reports".
  displayName: string;

  // The icon file path. Optional — not all modules have icons.
  // Example: "/icons/reports.svg" or undefined if no icon was set.
  iconPath?: string;

  // The list of permission strings needed to see this module.
  // Always a proper string array (never null, never a raw string).
  // Example: ["reports:read"] or [] (empty = anyone can see it).
  requiredPermissions: string[];

  // Whether the user needs ALL permissions (true) or just ONE (false).
  // Always a real boolean after parsing.
  requireAll: boolean;

  // The display order number. Always a finite number. Example: 1, 2, 10.
  sortOrder: number;

  // How deep in the menu hierarchy this module sits.
  // Always 0, 1, or 2 after parsing.
  depth: number;

  // Which of the required permissions this specific user actually holds.
  // Filled in by canSeeModule() during permission checking.
  // Starts as an empty array []; populated later.
  // Example: if module needs ["reports:read", "reports:export"]
  //          and user has ["reports:read"], this becomes ["reports:read"].
  matchedPermissions: string[];
};

// DashboardModuleNode = the shape that IS sent to the browser in the API response.
//
// "Omit<DashboardModule, "parentModuleId" | "depth">" means:
//   take everything from DashboardModule but REMOVE parentModuleId and depth.
//   Those two fields are internal implementation details the browser doesn't need.
//
// The "& { children: DashboardModuleNode[] }" part ADDS a children array.
//   children holds sub-menu items, each of which is also a DashboardModuleNode.
//   This makes the type recursive — a node can contain nodes, which contain nodes.
//
// Real-world example of this shape in JSON:
//   {
//     moduleId: "mod-reports",
//     moduleSlug: "reports",
//     displayName: "Reports",
//     iconPath: "/icons/reports.svg",
//     sortOrder: 1,
//     requiredPermissions: [],
//     requireAll: true,
//     matchedPermissions: [],
//     children: [                        ← sub-items live here
//       {
//         moduleId: "mod-reports-sales",
//         moduleSlug: "reports/sales",
//         displayName: "Sales",
//         sortOrder: 1,
//         requiredPermissions: ["reports:read"],
//         requireAll: true,
//         matchedPermissions: ["reports:read"],
//         children: []                   ← no further nesting
//       }
//     ]
//   }
type DashboardModuleNode = Omit<DashboardModule, "parentModuleId" | "depth"> & {
  // The list of visible child modules nested under this parent.
  // Empty array [] means this module has no children (or none the user can see).
  children: DashboardModuleNode[];
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — RBAC POLICY FOR THIS ENDPOINT
//
// Every API endpoint in this system declares a "policy" — a small object that
// tells the withAuthorization wrapper what this endpoint is for.
// It is used when writing audit log records ("user X read dashboard-modules").
// ─────────────────────────────────────────────────────────────────────────────

// MODULES_POLICY defines the security contract for this specific API endpoint.
// Notice that permissions is an empty array [].
// That means: ANY logged-in, active RBAC user may CALL this endpoint.
// The per-module permission filtering happens INSIDE the handler, not at the door.
// Think of it like: anyone can enter the library, but only some books are on your shelf.
const MODULES_POLICY: RbacPolicy = {
  // A human-readable name for the resource being accessed. Appears in audit logs.
  // Example audit log entry: "User alice@company.com READ dashboard-modules"
  resource: "dashboard-modules",

  // The action being performed. "read" = fetching/viewing data (not writing or deleting).
  action: "read",

  // No special permission required to reach this endpoint at all.
  // Individual module visibility is controlled inside buildVisibleTree.
  permissions: [],
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — TABLE ADDRESS
// ─────────────────────────────────────────────────────────────────────────────

// MODULES_TABLE is the fully-qualified name of the database table this file reads from.
// It is built by combining three parts with dots in between:
//   CATALOG_NAME  = "dset_dev"         (the Databricks catalog/cluster)
//   SCHEMA_NAME   = "data_integrity"   (the schema/folder inside that catalog)
//   table name    = "dashboard_modules" (the specific table)
// Final result: "dset_dev.data_integrity.dashboard_modules"
// This is like a full postal address: country.city.street.
const MODULES_TABLE = `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_MODULES_TABLE}`;


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — PARSING HELPER FUNCTIONS
//
// Databricks doesn't always return data in the exact format JavaScript expects.
// These four small functions each take one "dirty" database value and return
// a clean, reliable value that the rest of the code can safely use.
//
// Think of them like a washing machine: raw database values go in, clean values come out.
// ─────────────────────────────────────────────────────────────────────────────

// parseRequiredPermissions
// ─────────────────────────
// PURPOSE: Takes the raw required_permissions value from the database
//          and always returns a clean JavaScript string array.
//
// WHY IT'S NEEDED: Databricks can return the same data in three different formats
//   depending on driver version and table settings:
//   Format A — real array:           ["reports:read", "reports:export"]
//   Format B — single-quoted string: "['reports:read','reports:export']"
//   Format C — comma string:          "reports:read,reports:export"
//   This function handles all three and returns a consistent array either way.
//
// EXAMPLE:
//   Input:  "['reports:read', 'reports:export']"
//   Output: ["reports:read", "reports:export"]
function parseRequiredPermissions(value: unknown): string[] {

  // If the database returned nothing (null, undefined, 0, empty string, false),
  // return an empty array. An empty array means "no permissions required" —
  // every logged-in user can see this module.
  if (!value) return [];

  // CASE A: Databricks already returned a real JavaScript array.
  // Convert each item to a string (in case any are numbers), trim whitespace,
  // and remove any blank entries that might have slipped in.
  // Example: [" reports:read ", ""] → ["reports:read"]
  if (Array.isArray(value)) {
    return value
      .map((permission) => String(permission).trim()) // Convert each item to trimmed string.
      .filter(Boolean);             // Remove empty strings from the array.
  }

  // If the value is neither an array nor a string, we have no way to interpret it.
  // Return empty array (= treat as "no permissions required") as a safe fallback.
  if (typeof value !== "string") return [];

  // Remove any leading/trailing spaces from the raw string value.
  // Example: "  reports:read  " → "reports:read"
  const trimmed = value.trim();

  // If after trimming the string is empty, there are no permissions configured.
  if (!trimmed) return [];

  // CASE B: The value is a string that looks like a JSON array with single quotes.
  // Databricks sometimes uses single quotes instead of the double quotes JSON requires.
  // We replace single quotes with double quotes, then attempt to parse as JSON.
  // Example input:  "['reports:read','reports:export']"
  // After replace:  '["reports:read","reports:export"]'
  // After parse:    ["reports:read", "reports:export"]
  try {
    // Replace every single quote with a double quote so JSON.parse can read it.
    const parsed = JSON.parse(trimmed.replace(/'/g, '"')) as unknown;

    // If JSON parsing produced an array, clean and return it.
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => String(p).trim()) // Trim each permission string.
        .filter(Boolean);             // Remove any empty strings.
    }
  } catch {
    // JSON.parse threw an error — the string was not valid JSON even after the fix.
    // That's fine; we fall through to Case C below.
  }

  // CASE C: Last resort — the value is a plain comma-separated string,
  // possibly with surrounding square brackets.
  // Example input: "[reports:read, reports:export]"
  // Step 1 — remove leading "[":  "reports:read, reports:export]"
  // Step 2 — remove trailing "]": "reports:read, reports:export"
  // Step 3 — split by comma:      ["reports:read", " reports:export"]
  // Step 4 — trim + strip quotes: ["reports:read", "reports:export"]
  // Step 5 — remove blanks:       ["reports:read", "reports:export"]
  return trimmed
    .replace(/^\[/, "")   // Remove "[" from the very start of the string.
    .replace(/\]$/, "")   // Remove "]" from the very end of the string.
    .split(",")           // Split the string into an array at every comma.
    .map((p) =>
      p.trim()                        // Remove whitespace from both ends.
       .replace(/^["']|["']$/g, "")  // Remove any surrounding " or ' quote characters.
    )
    .filter(Boolean);     // Drop any empty strings left over.
}


// parseRequireAll
// ────────────────
// PURPOSE: Converts the raw require_all database value into a reliable true/false boolean.
//
// WHY IT'S NEEDED: SQL databases can represent true/false in many ways:
//   - As a real boolean:  true  or false
//   - As an integer:      1     or 0
//   - As a string:        "true", "yes", "1"  or  "false", "no", "0"
//
// EXAMPLE:
//   Input: "yes"  → Output: true
//   Input: 0      → Output: false
//   Input: true   → Output: true
function parseRequireAll(value: DashboardModuleRow["require_all"]): boolean {

  // If the database already returned a proper JavaScript boolean, use it directly.
  if (typeof value === "boolean") return value;

  // If it came back as a number: 1 = true (any non-zero number), 0 = false.
  if (typeof value === "number") return value !== 0;

  // If it came back as text, check for common "truthy" string values.
  // .toLowerCase() ensures "True", "TRUE", "Yes", "YES" all match.
  if (typeof value === "string") {
    return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  }

  // For any other unexpected type (null, undefined, object), default to true.
  // "true" is the safer default — it means the user must meet ALL requirements,
  // which is more restrictive. Better to accidentally lock someone out than
  // accidentally grant access.
  return true;
}


// parseSortOrder
// ───────────────
// PURPOSE: Converts the raw sort_order database value into a safe integer.
//
// WHY IT'S NEEDED: sort_order might come back as a string "10" instead of number 10,
//   or might be null/undefined if the database column was not filled in.
//
// EXAMPLE:
//   Input: "5"        → Output: 5
//   Input: null       → Output: 0   (defaults to 0, appears at the top)
//   Input: "invalid"  → Output: 0   (NaN is caught, replaced with 0)
function parseSortOrder(value: DashboardModuleRow["sort_order"]): number {
  // Number(...) converts strings, booleans, and null to numbers.
  // The "?? 0" means: if value is null or undefined, use 0 instead before converting.
  const n = Number(value ?? 0);

  // Number.isFinite catches NaN (Not a Number) and Infinity — both invalid for ordering.
  // If the result is a valid finite number, return it. Otherwise fall back to 0.
  return Number.isFinite(n) ? n : 0;
}


// parseDepth
// ───────────
// PURPOSE: Converts the raw depth database value into a safe non-negative integer.
//
// WHY IT'S NEEDED: Same reason as parseSortOrder — the database might return a string,
//   null, or an invalid value. Also, depth must be 0 or greater (no negative depths).
//
// EXAMPLE:
//   Input: "2"    → Output: 2
//   Input: null   → Output: 0  (treated as root/top-level)
//   Input: -1     → Output: 0  (negative depth is invalid, clamped to 0)
//   Input: 1.7    → Output: 1  (fractional depths are not meaningful, floor to integer)
function parseDepth(value: DashboardModuleRow["depth"]): number {
  // Convert to number, defaulting null/undefined to 0.
  const n = Number(value ?? 0);

  // Only accept finite, non-negative numbers.
  // Math.floor strips any decimal fraction (e.g. 1.9 → 1).
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — ROW NORMALIZER
//
// normalizeModule takes ONE raw row from the database (messy, typed loosely)
// and returns ONE clean DashboardModule object (reliable, well-typed).
// It calls the four parsing helpers above to clean each individual field.
//
// If the row is so broken it cannot be used (e.g. no slug), it returns null.
// Callers filter out nulls so broken rows are silently skipped.
// ─────────────────────────────────────────────────────────────────────────────

// normalizeModule
// ────────────────
// INPUT:  one raw DashboardModuleRow from the database.
// OUTPUT: a clean DashboardModule object, or null if the row is unusable.
//
// EXAMPLE:
//   Input row: { module_id: " mod-reports ", module_slug: "reports", depth: "0", ... }
//   Output:    { moduleId: "mod-reports", moduleSlug: "reports", depth: 0, ... }
function normalizeModule(row: DashboardModuleRow): DashboardModule | null {

  // Extract and trim the module_slug. The "?." is optional chaining —
  // if row.module_slug is undefined, this safely returns undefined instead of crashing.
  // Example: "  reports  " → "reports"
  const moduleSlug = row.module_slug?.trim();

  // A module without a slug is unusable — the browser needs the slug to build URLs.
  // Return null to signal "skip this row". The caller will filter these out.
  if (!moduleSlug) return null;

  // Build and return the clean, well-typed module object.
  return {

    // Use module_id if available (trimmed). Fall back to using the slug as the ID
    // if module_id was not set in the database. Every module must have some unique ID.
    moduleId: row.module_id?.trim() || moduleSlug,

    // Clean the parent_module_id. Trim whitespace; treat empty string as null.
    // null = this is a top-level/root menu item with no parent.
    parentModuleId: row.parent_module_id?.trim() || null,

    // The cleaned slug (already extracted and trimmed above).
    moduleSlug,

    // Use display_name if available. Fall back to the slug if no name was set.
    // This ensures the sidebar always has something readable to show.
    displayName: row.display_name?.trim() || moduleSlug,

    // Use icon_path if it has a value. Convert empty string to undefined
    // so that the iconPath field is simply absent rather than being an empty string.
    iconPath: row.icon_path?.trim() || undefined,

    // Parse the required_permissions field using the dedicated helper above.
    // Always returns a clean string array, never null or a weird format.
    requiredPermissions: parseRequiredPermissions(row.required_permissions),

    // Parse require_all using the dedicated helper above.
    // Always returns a real true/false boolean.
    requireAll: parseRequireAll(row.require_all),

    // Parse sort_order using the dedicated helper above.
    // Always returns a finite number (0 if missing/invalid).
    sortOrder: parseSortOrder(row.sort_order),

    // Parse depth using the dedicated helper above.
    // Always returns 0, 1, 2, or another non-negative integer.
    depth: parseDepth(row.depth),

    // Start with an empty array. This will be filled in later by canSeeModule()
    // once we know which of the required permissions this user actually has.
    matchedPermissions: [],
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — PERMISSION CHECKING HELPERS
//
// These two functions work together to answer: "Can this user see this module?"
//
// getMatchedPermissions: figures out WHICH of the required permissions the user has.
// canSeeModule:          uses that result to give a final YES or NO answer.
// ─────────────────────────────────────────────────────────────────────────────

// getMatchedPermissions
// ──────────────────────
// PURPOSE: Given a module and a user, find the INTERSECTION —
//          i.e. which of the module's required permissions does the user actually hold?
//
// HOW IT WORKS:
//   For each permission the module requires, check whether any of the user's
//   granted permissions "matches" it. A match can be exact or via wildcard.
//
// EXAMPLE:
//   Module requires: ["reports:read", "reports:export"]
//   User has grants: ["reports:*"]          ← wildcard covers all reports actions
//   permissionMatches("reports:*", "reports:read")   → true  ✓
//   permissionMatches("reports:*", "reports:export") → true  ✓
//   Result: ["reports:read", "reports:export"]  (both matched)
//
// ANOTHER EXAMPLE:
//   Module requires: ["reports:read", "admin:read"]
//   User has grants: ["reports:read"]        ← only one specific permission
//   permissionMatches("reports:read", "reports:read") → true  ✓
//   permissionMatches("reports:read", "admin:read")   → false ✗
//   Result: ["reports:read"]  (only one matched)
function getMatchedPermissions(
  module: DashboardModule,      // The module whose permissions we are checking.
  userContext: RbacUserContext  // The logged-in user's full RBAC profile.
): string[] {

  // Loop over every permission the module requires.
  // Keep only the ones where the user has at least one grant that covers it.
  return module.requiredPermissions.filter((required) =>
    // Check if ANY of the user's grants matches this required permission.
    // "some" stops as soon as it finds one match — efficient for large grant lists.
    userContext.grants.some((grant) =>
      // permissionMatches handles exact matches AND wildcard matches.
      // Example: permissionMatches("reports:*", "reports:read") → true
      permissionMatches(grant.permissionKey, required)
    )
  );
}


// canSeeModule
// ─────────────
// PURPOSE: Gives a final YES (true) or NO (false) answer:
//          "Is this logged-in user allowed to see this specific module?"
//
// LOGIC:
//   Case 1 — No permissions required:
//     The module has an empty requiredPermissions list.
//     Any active RBAC user can see it. Return true immediately.
//     Example: a "Home" page that everyone can access.
//
//   Case 2 — requireAll = true (AND logic):
//     The user must hold EVERY permission in the list.
//     Example: module needs ["reports:read", "reports:export"].
//              User must have BOTH to see it.
//
//   Case 3 — requireAll = false (OR logic):
//     The user only needs ONE permission from the list.
//     Example: module needs ["reports:read", "reports:export"].
//              User needs just ONE of those to see it.
//
// SIDE EFFECT:
//   This function also saves the matched permissions onto module.matchedPermissions.
//   This is used later so the API response can explain WHY a module was visible.
function canSeeModule(module: DashboardModule, userContext: RbacUserContext): boolean {

  // Super Admin is approved by dashboard_super_admins and can see every module.
  if (userContext.isSuperAdmin) {
    // Mark every required permission as matched so the response explains why the module is visible.
    module.matchedPermissions = module.requiredPermissions;

    // Return true immediately because Super Admin bypasses normal module permission checks.
    return true;
  }

  // Case 1: No permissions needed → everyone can see this module. Return true now.
  if (module.requiredPermissions.length === 0) return true;

  // Find which required permissions this user actually holds for this module.
  const matched = getMatchedPermissions(module, userContext);

  // Save the matched permissions onto the module object so they appear in the response.
  // Example: if the user has "reports:read" but needed "reports:read" AND "reports:export",
  //          matchedPermissions will be ["reports:read"] — showing a partial match.
  module.matchedPermissions = matched;

  // Case 2 (requireAll = true): the user must have matched ALL required permissions.
  // Example: module needs 2 permissions, user matched 2 → true ✓
  //          module needs 2 permissions, user matched 1 → false ✗
  // Case 3 (requireAll = false): the user just needs to have matched at least 1.
  // Example: module needs 2 permissions, user matched 1 → true ✓
  //          module needs 2 permissions, user matched 0 → false ✗
  return module.requireAll
    ? matched.length === module.requiredPermissions.length  // AND logic: all must match.
    : matched.length > 0;                                  // OR logic:  any one is enough.
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 — TREE BUILDER
//
// buildVisibleTree is the core function of this file.
// It takes a flat list of ALL modules and returns a NESTED TREE of only the
// modules this specific user is allowed to see, with children attached to parents.
//
// ANALOGY:
//   Imagine a company org chart printed on index cards (flat list).
//   buildVisibleTree picks out only the cards for people in YOUR department,
//   then arranges them into a hierarchy: manager on top, reports below.
//
// HOW THE TREE IS BUILT (three steps):
//   Step 1 — FILTER:  Run canSeeModule on every module. Build a Map of visible ones.
//   Step 2 — WIRE:    Loop over visible nodes. Root nodes (no parent) go into the
//                     result array. Child nodes are attached to their parent's children[].
//   Step 3 — SORT:    Sort both roots and their children by sort_order ascending.
//
// WHY ORDER BY depth ASC IN SQL MATTERS:
//   We process the flat list once in order. depth ASC means all depth-0 nodes
//   (roots) are inserted into the Map BEFORE depth-1 children arrive.
//   So when a child tries to find its parent in the Map, the parent is already there.
//   Without this ordering, a child could arrive before its parent, causing it to be
//   incorrectly promoted to root.
// ─────────────────────────────────────────────────────────────────────────────

// HIDE_EMPTY_PARENTS controls a special edge case:
//   What if a parent module passes the permission check but ALL of its children fail?
//   false (default) → show the parent anyway. It might still link to its own page.
//   true            → hide the parent if it has no visible children AND no icon/permissions
//                     (i.e. it is a pure section header with nothing under it).
// Flip this to true if your sidebar should never show empty section headers.
const HIDE_EMPTY_PARENTS = false;

// buildVisibleTree
// ─────────────────
// INPUT:  allModules — every active module from the database, normalised and flat.
//         userContext — the logged-in user's RBAC profile (groups, roles, grants).
// OUTPUT: a nested array of DashboardModuleNode objects — the sidebar menu tree.
function buildVisibleTree(
  allModules: DashboardModule[],
  userContext: RbacUserContext
): DashboardModuleNode[] {


  // ── STEP 1: FILTER ──────────────────────────────────────────────────────────
  // Walk through every module. For each one, ask canSeeModule: can this user see it?
  // If yes, add it to nodeMap (a dictionary keyed by moduleId).
  // If no, skip it entirely.
  //
  // We use a Map (dictionary) rather than an array so we can look up any node
  // instantly by its moduleId in Step 2 — like a phone book indexed by name.

  // nodeMap: a dictionary where:
  //   key   = moduleId string (e.g. "mod-reports")
  //   value = a DashboardModuleNode object with an empty children array (filled in Step 2)
  const nodeMap = new Map<string, DashboardModuleNode>();

  // Loop through every module in the flat list.
  for (const dashboardModule of allModules) {

    // Ask: can this logged-in user see this module?
    // If NO → skip this module entirely. "continue" jumps to the next loop iteration.
    if (!canSeeModule(dashboardModule, userContext)) continue;

    // The user CAN see this module. Prepare it for the API response.
    // We use destructuring to SEPARATE the internal fields from the response fields:
    //   _p  = parentModuleId (internal — tells us who the parent is, but browser doesn't need it)
    //   _d  = depth          (internal — used for ordering, not needed in response)
    //   rest = everything else (moduleId, moduleSlug, displayName, etc.) → goes to browser
    // The underscore prefix (_p, _d) is a coding convention meaning "I'm deliberately
    // not using this variable — I just needed to extract it to get 'rest'".
    const rest: Omit<DashboardModule, "parentModuleId" | "depth"> = {
      moduleId: dashboardModule.moduleId,
      moduleSlug: dashboardModule.moduleSlug,
      displayName: dashboardModule.displayName,
      iconPath: dashboardModule.iconPath,
      requiredPermissions: dashboardModule.requiredPermissions,
      requireAll: dashboardModule.requireAll,
      sortOrder: dashboardModule.sortOrder,
      matchedPermissions: dashboardModule.matchedPermissions,
    };

    // Store this node in the Map with an empty children array.
    // Children will be attached in Step 2 below.
    nodeMap.set(dashboardModule.moduleId, { ...rest, children: [] });
  }


  // ── STEP 2: WIRE ────────────────────────────────────────────────────────────
  // Walk through the nodeMap and sort each node into the right place:
  //   - Nodes with no parent → push into roots[] (top-level sidebar items).
  //   - Nodes with a parent  → push into that parent's children[] array.
  //   - Nodes whose parent is not visible → promote to roots[] so they aren't lost.

  // roots will hold only the TOP-LEVEL visible modules.
  // This is what we ultimately return (with children already attached).
  const roots: DashboardModuleNode[] = [];

  // Loop over every visible node in the Map.
  // The "[, node]" syntax means we only care about the value (node), not the key.
  for (const [, node] of nodeMap) {

    // Look up the original flat module to retrieve parentModuleId.
    // (It was stripped off when building the node in Step 1, so we go back to allModules.)
    // The "!" at the end tells TypeScript "I know this won't be undefined" — we just
    // inserted it so it is guaranteed to be there.
    const flat = allModules.find((mod) => mod.moduleId === node.moduleId)!;

    if (!flat.parentModuleId) {
      // This module has no parent — it is a root/top-level menu item.
      // Push it directly into the roots array.
      // Example: "Reports" has no parent → goes into roots.
      roots.push(node);

    } else {
      // This module has a parent. Try to find the parent in the nodeMap.
      // The parent is in nodeMap only if the user is also allowed to see it.
      const parentNode = nodeMap.get(flat.parentModuleId);

      if (parentNode) {
        // Parent IS visible to this user → attach this node as a child of that parent.
        // Example: "Sales Reports" has parent "Reports" → pushed into Reports.children[].
        parentNode.children.push(node);

      } else {
        // Parent is NOT visible to this user (canSeeModule returned false for the parent).
        // We don't want to silently lose this child module.
        // Instead, PROMOTE it: treat it as a root-level item so the user can still see it.
        // Example: parent "Admin" is hidden from a regular user, but child "My Profile"
        //          is allowed → "My Profile" appears at the top level instead.
        roots.push(node);
      }
    }
  }


  // ── STEP 3 (OPTIONAL): HIDE EMPTY PARENTS ───────────────────────────────────
  // This step only runs when HIDE_EMPTY_PARENTS is set to true (default is false).
  // It removes pure section-header modules that ended up with no visible children.
  //
  // A "pure grouping node" is defined as:
  //   - Has no required permissions (open to everyone), AND
  //   - Has no icon (not a navigable page in itself — just a label).
  //
  // If such a node also has no visible children, it would appear as an empty
  // section header in the sidebar — confusing and useless. So we remove it.

  const result = HIDE_EMPTY_PARENTS
    ? roots.filter((root) => {
        // Get the original flat module so we can check its fields.
        const flat = allModules.find((mod) => mod.moduleId === root.moduleId)!;

        // A "pure group" node = no permissions required AND no icon.
        // These are section labels (like "Reports") with no page of their own.
        const isPureGroup =
          flat.requiredPermissions.length === 0 && // No permission gate → just a header.
          !flat.iconPath;                           // No icon → not a standalone page.

        // Keep this node if it is NOT a pure group, OR if it has visible children.
        // Remove it only if it IS a pure group AND has zero visible children.
        return !isPureGroup || root.children.length > 0;
      })
    : roots; // HIDE_EMPTY_PARENTS is false → include all roots without filtering.


  // ── STEP 4: SORT ─────────────────────────────────────────────────────────────
  // Sort the root-level modules by their sort_order number, ascending (lowest first).
  // Example: sort_order 1 appears before sort_order 2.
  result.sort((a, b) => a.sortOrder - b.sortOrder);

  // Also sort each root module's children by their sort_order.
  // This ensures sub-menu items appear in the correct order too.
  // Note: this handles one level of children. For grandchildren, you would need
  // to recurse deeper, but two levels is sufficient for most dashboard sidebars.
  result.forEach((r) => r.children.sort((a, b) => a.sortOrder - b.sortOrder));

  // Return the finished nested tree, ready to be sent to the browser.
  return result;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — USER CONTEXT HELPER
// ─────────────────────────────────────────────────────────────────────────────

// getUserContext
// ───────────────
// PURPOSE: A small helper that combines two steps into one:
//   1. Figure out WHO is making this request (getAuthenticatedPrincipal).
//   2. Load WHAT that person is allowed to do (getRbacUserContext).
//
// INPUT:  The incoming HTTP request object.
// OUTPUT: The user's full RBAC profile (groups, roles, permissions, grants),
//         or null if the user identity could not be established.
//
// EXAMPLE:
//   Request arrives from alice@company.com.
//   getAuthenticatedPrincipal → { email: "alice@company.com", oid: "abc-123" }
//   getRbacUserContext        → { userId: "usr-alice", grants: ["reports:read"], ... }
async function getUserContext(request: NextRequest): Promise<RbacUserContext | null> {

  // Step 1: identify WHO sent this request.
  // On Azure: reads the X-MS-CLIENT-PRINCIPAL header set by EasyAuth.
  // Locally:  reads MOCK_USER_EMAIL from the .env file.
  // Returns null if no identity can be determined.
  const principal = getAuthenticatedPrincipal(request);

  // Step 2: if we know who the user is, load their RBAC profile from Databricks.
  // If principal is null (anonymous request), return null immediately — no profile.
  // The "?" is a ternary operator: if principal exists, load context; else return null.
  return principal ? await getRbacUserContext(principal) : null;
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — MAIN ROUTE HANDLER
//
// This is the actual API endpoint: GET /api/dashboard-modules
//
// The browser calls this URL when loading the dashboard sidebar.
// withAuthorization wraps it to ensure:
//   - The user is authenticated (has a valid session).
//   - The access attempt is recorded in the audit log.
//   - MODULES_POLICY is enforced at the door.
//
// EXAMPLE SUCCESSFUL RESPONSE (JSON):
// {
//   "modules": [
//     {
//       "moduleId": "mod-reports",
//       "moduleSlug": "reports",
//       "displayName": "Reports",
//       "iconPath": "/icons/reports.svg",
//       "sortOrder": 1,
//       "requiredPermissions": [],
//       "requireAll": true,
//       "matchedPermissions": [],
//       "children": [
//         {
//           "moduleId": "mod-reports-sales",
//           "moduleSlug": "reports/sales",
//           "displayName": "Sales Reports",
//           "sortOrder": 1,
//           "requiredPermissions": ["reports:read"],
//           "requireAll": true,
//           "matchedPermissions": ["reports:read"],
//           "children": []
//         }
//       ]
//     }
//   ],
//   "totalModules": 10,
//   "visibleModules": 3
// }
// ─────────────────────────────────────────────────────────────────────────────

// Export the GET handler so Next.js knows to call it for HTTP GET requests
// to this route. withAuthorization wraps it with authentication + audit logging.
export const GET = withAuthorization(async function GET(
  request: NextRequest   // The incoming HTTP request from the user's browser.
): Promise<Response> {   // Returns an HTTP response (JSON) back to the browser.
    
  // Capture the start time for logging purposes
  const requestStartTime = new Date();
  // Save request start time (like starting a stopwatch to measure duration)

  const programName = "DashboardModulesAPI"; // Name of the program (API)
  // A fixed label used in logs to identify which API generated the message

  const user = request.headers.get("x-user-id") ?? "Anonymous"; // Extract user ID from headers or default to "Anonymous"
  // Identify who is making the request (for audit tracking); if missing, set Anonymous
  
  try {
    // ── STEP 1: LOAD USER CONTEXT ──────────────────────────────────────────────
    // Find out who this request is from and load their full RBAC permissions.
    // This tells us which modules the user is allowed to see.
    const userContext = await getUserContext(request);

    // If userContext is null, the user is authenticated (they passed the outer
    // withAuthorization check) but has NO record in the RBAC users table.
    // This means they have no roles or permissions assigned yet.
    // We cannot safely show them any modules, so we return a 403 Forbidden error.
    // 403 means "I know who you are, but you're not allowed in here."
    if (!userContext) {
      // ------------------- ERROR LOG -------------------
      const errorMessage = "Authenticated user is not active in the RBAC user table.";
      // Prepare detailed error message containing dataset, catalog, schema so troubleshooting is easier

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
          actionDescription: `User is not active in RBAC table.`,
          // Explain which table/action the API attempted
          user,
          // Include which user triggered this request
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 403 } // HTTP 403 = Forbidden.
      );
    }


    // ── STEP 2: OPEN DATABASE CONNECTION ──────────────────────────────────────
    // Get (or reuse) an open connection to the Databricks database.
    // getDatabricksSession reuses an existing session if one is already open,
    // avoiding the overhead of opening a new connection for every request.
    // Like picking up a phone that's already connected rather than dialling again.
    const session = await getDatabricksSession();

    // ── STEP 3: FETCH ALL ACTIVE MODULES FROM THE DATABASE ────────────────────
    // Run a SQL SELECT query to get all rows from the dashboard_modules table
    // where is_active = true (we never show deactivated modules).
    //
    // ORDER BY clause explanation:
    //   depth ASC       → parents (depth 0) come before children (depth 1, 2).
    //                     This is CRITICAL for buildVisibleTree to work in one pass.
    //   sort_order ASC  → within the same depth level, lower sort numbers come first.
    //   display_name ASC→ break ties alphabetically so the order is always predictable.
    const rows = await executeQuery<DashboardModuleRow>(
      session,   // The open Databricks session to run the query on.
      `
        SELECT
          module_id,           -- The unique module identifier.
          parent_module_id,    -- Links child modules to their parent (NULL = root).
          module_slug,         -- URL-friendly name used in navigation.
          display_name,        -- Human-readable label shown in the sidebar.
          icon_path,           -- Optional icon file path.
          required_permissions,-- Array of permissions needed to view this module.
          require_all,         -- true = need all permissions, false = need any one.
          sort_order,          -- Display order number (lower = higher in the list).
          depth                -- Nesting level: 0 = root, 1 = child, 2 = grandchild.
        FROM ${MODULES_TABLE}
        WHERE is_active = true
        ORDER BY depth ASC, sort_order ASC, display_name ASC
      `
    );
    // "rows" is now an array of raw DashboardModuleRow objects from Databricks.
    // Each row's values may be loosely typed (strings instead of numbers, etc.).


    // ── STEP 4: NORMALISE RAW ROWS INTO CLEAN MODULE OBJECTS ──────────────────
    // Map every raw row through normalizeModule to get clean, well-typed objects.
    // Filter out any nulls (rows that were too broken to use — e.g. missing slug).
    //
    // The "(m): m is DashboardModule" syntax is a TypeScript type guard.
    // It tells TypeScript: "after this filter, I guarantee every item is a DashboardModule".
    // Without it, TypeScript would think the array might still contain nulls.
    const allModules = rows
      .map(normalizeModule)                               // Clean each row.
      .filter((m): m is DashboardModule => m !== null);  // Remove broken/null rows.
    // "allModules" is now a clean DashboardModule[] — no nulls, no loose types.


    // ── STEP 5: BUILD THE PERMISSION-FILTERED, NESTED TREE ────────────────────
    // Pass all cleaned modules and the user's RBAC context to buildVisibleTree.
    // It will:
    //   - Filter out modules the user cannot see (permission check).
    //   - Nest children inside their parent modules (tree building).
    //   - Sort everything by sort_order (ordering).
    //   - Return a ready-to-use nested array for the sidebar.
    const visibleTree = buildVisibleTree(allModules, userContext);


    // ── STEP 6: COUNT VISIBLE NODES (FOR DEBUGGING/TELEMETRY) ─────────────────
    // Count the total number of visible modules across all nesting levels.
    // This is returned in the response and helps with debugging and monitoring.
    //
    // countNodes is a RECURSIVE function — it calls itself on each node's children.
    // Example tree:  Reports (1) → Sales (1) → Q1 (1)  =  3 total nodes.
    //                Home (1)                            =  1 total node.
    //                Total: 4 visible nodes.
    //
    // "reduce" accumulates a running total:
    //   Start at sum = 0.
    //   For each node: add 1 (for the node itself) + countNodes(its children).
    function countNodes(nodes: DashboardModuleNode[]): number {
      return nodes.reduce(
        (sum, n) => sum + 1 + countNodes(n.children), // 1 for this node + all its descendants.
        0  // Start the running total at zero.
      );
    }

    // Log success if query execution was successful
    await logToEventHub({
      type: "INFO",
      // INFO indicates successful normal operation
      detailMessage: `Successfully retrieved dashboard modules for the user: ${user}`,
      // A readable success message that can be used in Splunk monitoring dashboards
      programName,
      // API name so we know which service logged this message
      startDatetime: requestStartTime,
      // Include start time for performance monitoring
      status: "SUCCESS",
      // Mark request as successfully completed
      actionType: "Spark_SQL_Query",
      // Categorize action as Databricks SQL query execution
      actionDescription: `Fetch Dashboard Modules for user.`,
      // Describe what action the API performed (data quality summary fetch)
      user,
      // User ID of the person who initiated the request (important for audit)
    });

    // ── STEP 7: SEND THE RESPONSE ──────────────────────────────────────────────
    // Package the results as JSON and send them to the browser.
    // NextResponse.json() sets the Content-Type header to application/json automatically.
    return NextResponse.json({

      // The nested, permission-filtered module tree for the sidebar.
      // This is what the frontend component reads to render the navigation menu.
      modules: visibleTree,

      // Total number of active modules in the database (all users combined).
      // Useful for admin debugging: "the database has 10 modules total".
      totalModules: allModules.length,

      // Number of modules (across all nesting levels) visible to THIS user.
      // Useful for debugging: "this user can see 3 out of 10 modules".
      visibleModules: countNodes(visibleTree),
    });

  } catch (error: any) {
      // ------------------- ERROR LOG -------------------
      const errorMessage = `Error retrieving dashboard modules for user ${user}: ${error.message || "Unknown error"}`;
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
          actionDescription: `Failed to fetch Dashboard Modules.`,
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

// MODULES_POLICY is passed to withAuthorization.
// It records "what resource and action" in the audit log for this request.
}, MODULES_POLICY);
