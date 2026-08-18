/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the RBAC (Role-Based Access Control) audit logging module for the Teva dashboard.
    - The script captures authorization events (allowed/denied access decisions) with full context (user, resource, scope, outcome).
    - It formats audit events and persists them to Databricks SQL (dashboard_audit_log table) for historical compliance auditing.
    - It streams the same events to Azure Event Hub for near-real-time operational monitoring and alerting via Splunk/external systems.
    - It includes helper functions to extract client IP, format multi-scope access patterns, and safely log without disrupting the main API request flow.
    - Uses Promise.allSettled to ensure one destination failure (e.g., Event Hub outage) does not block the other (Databricks insert).
    - Suitable for pharmaceutical/regulated environments requiring immutable audit trails of access control decisions.
*/

// Catalog and schema identify where the audit table lives in Databricks.
// Example: dset_dev.data_integrity.dashboard_audit_log.
import { CATALOG_NAME, SCHEMA_NAME, DASHBOARD_AUDIT_LOG } from "@/constants/config";

// Databricks helpers open a SQL session and run insert statements.
import { executeQuery, getDatabricksSession } from "@/lib/azure/databricksClient";

// Event Hub helper sends audit/telemetry events to Azure Event Hub.
// Example: Splunk or another monitoring system can consume these events.
import { logToEventHub } from "@/lib/azure/eventHubLogger";

// SQL helpers safely format values before putting them into SQL text.
import { sqlNullableString, sqlString, sqlTimestamp } from "./sql";

// Audit event and scope types used by this file.
import type { RbacAuditEvent, RbacScope } from "./types";

// Fully qualified audit table name in Databricks.
const AUDIT_TABLE = `${CATALOG_NAME}.${SCHEMA_NAME}.${DASHBOARD_AUDIT_LOG}`;

// Extracts the first IP address from proxy headers.
// Example: "10.0.0.1, 10.0.0.2" becomes "10.0.0.1".
function getClientIp(event: RbacAuditEvent): string | undefined {
  // Split by comma because x-forwarded-for can contain multiple IPs.
  return event.ipAddress?.split(",")[0]?.trim();
}

// Converts a list of scopes into the two audit table columns scope_type and scope_value.
// Example: [{type:"brand", value:"US"}] becomes scopeType="brand", scopeValue="US".
function formatScopes(scopes?: RbacScope[]): Pick<RbacAuditEvent, "resourceType"> & {
  scopeType?: string; // Audit table scope_type column.
  scopeValue?: string; // Audit table scope_value column.
} {
  // No scopes means there is nothing to store in scope columns.
  if (!scopes || scopes.length === 0) {
    return {};
  }

  // A single scope can be stored directly.
  if (scopes.length === 1) {
    return {
      scopeType: scopes[0].type, // Example: "brand".
      scopeValue: scopes[0].value, // Example: "US".
    };
  }

  // Multiple scopes are compacted into one readable value.
  return {
    scopeType: "multiple", // Marks that more than one scope was involved.
    scopeValue: scopes.map((scope) => `${scope.type}=${scope.value}`).join(";"), // Example: "brand=US;dataset=customers".
  };
}

// Inserts one audit event into the Databricks audit table.
// Example: writes "DENIED GET /api/kpi-dashboard" with user and reason.
async function insertAuditEvent(event: RbacAuditEvent): Promise<void> {
  // Open or reuse a Databricks SQL session.
  const session = await getDatabricksSession();

  // Create a unique id for this audit event.
  const eventId = crypto.randomUUID();

  // Capture the current time as the audit event timestamp.
  const eventAt = new Date();

  // Convert scope array into audit table scope columns.
  const formattedScope = formatScopes(event.scopes);

  // Build the SQL insert statement.
  const query = `
    INSERT INTO ${AUDIT_TABLE} (
      event_id,
      event_type,
      principal_id,
      resource_type,
      resource_value,
      scope_type,
      scope_value,
      outcome,
      denial_reason,
      ip_address,
      user_agent,
      event_at
    )
    VALUES (
      ${sqlString(eventId)},
      ${sqlString(event.eventType)},
      ${sqlString(event.principalId)},
      ${sqlNullableString(event.resourceType)},
      ${sqlNullableString(event.resourceValue)},
      ${sqlNullableString(formattedScope.scopeType)},
      ${sqlNullableString(formattedScope.scopeValue)},
      ${sqlString(event.outcome)},
      ${sqlNullableString(event.denialReason)},
      ${sqlNullableString(getClientIp(event))},
      ${sqlNullableString(event.userAgent)},
      ${sqlTimestamp(eventAt)}
    )
  `;

  // Execute the insert statement in Databricks.
  await executeQuery(session, query);
}

// Sends the same audit event to Azure Event Hub.
// Example: operations teams can monitor authorization denials in near real time.
async function writeEventHubAudit(event: RbacAuditEvent): Promise<void> {
  // Treat DENIED and FAILED as failed events; everything else is success.
  const status = event.outcome === "DENIED" || event.outcome === "FAILED" ? "FAILED" : "SUCCESS";

  // Send a structured event to Event Hub.
  await logToEventHub({
    type: status === "FAILED" ? "WARN" : "INFO", // Failed audit events are warnings; successful ones are info.
    detailMessage: `${event.eventType} ${event.outcome} for ${event.method ?? ""} ${
      event.path ?? event.resourceValue ?? "unknown-resource"
    }`.trim(), // Human-readable summary, for example "API_ACCESS SUCCESS for GET /api/me".
    programName: "RBACAuthorization", // Source program name used by monitoring.
    user: event.principalEmail ?? event.principalId, // Prefer email for readability.
    startDatetime: event.requestStartedAt, // Original API request start time.
    status, // SUCCESS or FAILED.
    actionType: event.eventType, // Audit event category.
    actionDescription: event.denialReason, // Failure/denial explanation when available.
    apiUsage: {
      method: event.method, // HTTP method, for example "GET".
      path: event.path, // API path, for example "/api/me".
      statusCode: event.statusCode, // HTTP status, for example 200 or 403.
      correlationId: event.correlationId, // Request tracking id.
      resourceType: event.resourceType, // Resource type, for example "api_route".
      resourceValue: event.resourceValue, // Specific resource, for example "GET /api/me".
      scopes: event.scopes, // Scopes involved in the request.
    },
  });
}

// Writes an audit event to both Databricks and Event Hub.
// Example: one authorization decision is stored historically and streamed operationally.
export async function writeAuditEvent(event: RbacAuditEvent): Promise<void> {
  // allSettled means one logging destination can fail without stopping the other.
  await Promise.allSettled([insertAuditEvent(event), writeEventHubAudit(event)]);
}

// Safe audit wrapper that prevents logging failures from breaking the user's API request.
// Example: if Event Hub is down, the API can still return its real response.
export async function safeWriteAuditEvent(event: RbacAuditEvent): Promise<void> {
  // Catch unexpected audit failures so authorization logic remains resilient.
  try {
    // Attempt the normal audit write flow.
    await writeAuditEvent(event);
  } catch (error) {
    // Log to server console for troubleshooting.
    console.error("[RBAC] Failed to write audit event.", error);
  }
}
