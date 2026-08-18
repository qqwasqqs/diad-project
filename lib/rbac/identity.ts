/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains the identity extraction and principal normalization layer for the Teva dashboard authentication pipeline.
    - The script reads authenticated user identity from Microsoft EasyAuth headers (x-ms-client-principal, x-ms-client-principal-id, etc.) in production Azure App Service environments.
    - It decodes base64-encoded EasyAuth JSON payloads and extracts normalized identity attributes (email, display name, Azure object id, roles, and claims).
    - It supports local development mode by reading identity from the RBAC_LOCAL_USER_IDENTIFIER environment variable, allowing RBAC checks to hit Databricks even in dev.
    - It handles fallbacks gracefully across multiple EasyAuth claim types (preferred_username, upn, long-form Microsoft claims) to ensure identity is captured reliably.
    - It normalizes raw identity sources into a consistent AuthenticatedPrincipal object used by downstream RBAC and audit code.
    - It provides helpers to generate user-friendly audit identifiers and attach normalized identity headers (x-user-id, x-rbac-user-id, etc.) to requests for downstream route handlers.
    - Suitable for Azure App Service + Databricks environments with SSO/AAD authentication and local development workflows.
*/

// NextRequest is the Next.js object that contains request headers and URL details.
// Example: in Azure, EasyAuth identity arrives in headers such as x-ms-client-principal.
import type { NextRequest } from "next/server";

// These shared types describe normalized identity and RBAC user objects.
import type { AuthenticatedPrincipal, EasyAuthClaim, RbacUserContext } from "./types";

// EasyAuthPrincipalPayload describes the decoded Microsoft EasyAuth principal header.
// Example: x-ms-client-principal is base64 JSON that can contain claims like email and name.
type EasyAuthPrincipalPayload = {
  auth_typ?: string; // Authentication provider/type, for example "aad".
  name_typ?: string; // Claim type EasyAuth considers the user's name.
  role_typ?: string; // Claim type EasyAuth considers the user's role.
  claims?: EasyAuthClaim[]; // Newer EasyAuth claim list shape.
  user_claims?: EasyAuthClaim[]; // Alternate EasyAuth claim list shape.
};

// The .env key used to identify the local developer user for RBAC checks.
// Example: RBAC_LOCAL_USER_IDENTIFIER=radhe.tiwari@company.com can match dashboard_users.email.
const LOCAL_USER_IDENTIFIER_ENV = "RBAC_LOCAL_USER_IDENTIFIER";

// Claim types that can contain a user's email.
// Example: Azure AD may send email as "preferred_username" instead of "email".
const EMAIL_CLAIM_TYPES = new Set([
  "email", // Common short email claim name.
  "emails", // Some providers send plural email claims.
  "preferred_username", // Azure AD often uses this for the sign-in email.
  "upn", // User principal name, often the same as email.
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", // Long-form Microsoft email claim.
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn", // Long-form Microsoft UPN claim.
]);

// Claim types that can contain a user's display name.
// Example: "name" might contain "Radhe Tiwari".
const NAME_CLAIM_TYPES = new Set([
  "name", // Common short name claim.
  "preferred_username", // Useful fallback when a full name is not present.
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", // Long-form Microsoft name claim.
]);

// Claim types that can contain the Azure object id.
// Example: Azure AD object id uniquely identifies the person in the tenant.
const OID_CLAIM_TYPES = new Set([
  "oid", // Common Azure object id claim.
  "objectidentifier", // Alternate object id claim.
  "http://schemas.microsoft.com/identity/claims/objectidentifier", // Long-form Microsoft object id claim.
]);

// Claim types that can contain application roles.
// Example: an EasyAuth token might say the user has role "Admin".
const ROLE_CLAIM_TYPES = new Set([
  "roles", // Common plural roles claim.
  "role", // Common singular role claim.
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", // Long-form Microsoft role claim.
]);

// Checks whether the app is running in local development mode.
// Example: ENVIRONMENT=local means use RBAC_LOCAL_USER_IDENTIFIER from .env instead of EasyAuth.
function isLocalEnvironment(): boolean {
  // Lowercase comparison keeps "LOCAL" and "local" equivalent.
  return process.env.ENVIRONMENT?.trim().toLowerCase() === "local";
}

// Checks whether a value looks like an email address.
// Example: "radhe@company.com" is treated as an email identity.
function looksLikeEmail(value: string): boolean {
  // This simple check is enough to decide whether to fill the email field for RBAC lookup.
  return value.includes("@");
}

// Checks whether a value looks like an Azure object id/GUID.
// Example: "cb4da94f-f146-47c6-934e-edc883ce9228" is treated as an Azure object id.
function looksLikeGuid(value: string): boolean {
  // Match the common 8-4-4-4-12 GUID format.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Normalizes a claim type so claim comparisons are consistent.
// Example: " Email " becomes "email".
function normalizeClaimType(type: string): string {
  // Trim removes spaces; lower-case makes "Email" and "email" match.
  return type.trim().toLowerCase();
}

// Finds the first claim value whose claim type is in the allowed set.
// Example: find email from claims using EMAIL_CLAIM_TYPES.
function getFirstClaimValue(claims: EasyAuthClaim[], claimTypes: Set<string>): string | undefined {
  // Return the value from the first matching claim, or undefined if none exists.
  return claims.find((claim) => claimTypes.has(normalizeClaimType(claim.typ)))?.val;
}

// Extracts role values from EasyAuth claims.
// Example: claim value "Admin,Viewer" becomes ["Admin", "Viewer"].
function getRoleValues(claims: EasyAuthClaim[]): string[] {
  // Start with all claims provided by EasyAuth.
  return claims
    .filter((claim) => ROLE_CLAIM_TYPES.has(normalizeClaimType(claim.typ))) // Keep only role-related claims.
    .flatMap((claim) => claim.val.split(",")) // Split comma-separated role values.
    .map((role) => role.trim()) // Remove extra spaces around each role.
    .filter(Boolean); // Remove blank values.
}

// Decodes a base64/base64url JSON string into an object.
// Example: EasyAuth sends x-ms-client-principal as encoded JSON; this turns it back into JSON.
function decodeBase64Json<T>(encoded: string): T | null {
  // Use try/catch because malformed headers should not crash the whole API.
  try {
    // Convert URL-safe base64 characters back to normal base64 characters.
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");

    // Add "=" padding when the base64 string length requires it.
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

    // Decode the text and parse it as JSON.
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
  } catch (error) {
    // Log the problem for developers but return null so the caller can deny safely.
    console.warn("[RBAC] Unable to parse EasyAuth client principal header.", error);

    // Null means "identity could not be decoded".
    return null;
  }
}

// Reads the logged-in user from Microsoft EasyAuth headers for non-local environments.
// Example: Azure App Service adds these headers after successful SSO login.
function parseEasyAuthPrincipal(request: NextRequest): AuthenticatedPrincipal | null {
  // Encoded JSON containing claims such as email, name, and object id.
  const encodedPrincipal = request.headers.get("x-ms-client-principal");

  // EasyAuth principal id header, usually an object id or provider-specific id.
  const principalId = request.headers.get("x-ms-client-principal-id") ?? undefined;

  // EasyAuth principal name header, often the user's email.
  const principalName = request.headers.get("x-ms-client-principal-name") ?? undefined;

  // EasyAuth identity provider header, for example "aad".
  const provider = request.headers.get("x-ms-client-principal-idp") ?? undefined;

  // If none of the EasyAuth identity headers exist, this request is not EasyAuth-authenticated.
  if (!encodedPrincipal && !principalId && !principalName) {
    return null;
  }

  // Decode the claims payload when the encoded header exists.
  const payload = encodedPrincipal
    ? decodeBase64Json<EasyAuthPrincipalPayload>(encodedPrincipal)
    : null;

  // EasyAuth can put claims under either "claims" or "user_claims"; use whichever is present.
  const claims = payload?.claims ?? payload?.user_claims ?? [];

  // Prefer Azure object id from claims; fall back to the principal id header.
  const azureOid = getFirstClaimValue(claims, OID_CLAIM_TYPES) ?? principalId;

  // Prefer email from claims; fall back to the principal name header.
  const email = getFirstClaimValue(claims, EMAIL_CLAIM_TYPES) ?? principalName;

  // Prefer display name from claims; fall back to principal name or email.
  const displayName = getFirstClaimValue(claims, NAME_CLAIM_TYPES) ?? principalName ?? email;

  // Return one normalized identity object for all RBAC code to use.
  return {
    id: azureOid ?? email ?? "easyauth-principal", // Stable id, falling back to a clear placeholder.
    email, // User email if available.
    displayName, // Friendly display name if available.
    azureOid, // Azure object id if available.
    provider: provider ?? payload?.auth_typ, // Provider from header or decoded payload.
    roles: getRoleValues(claims), // EasyAuth roles extracted from claims.
    claims, // Raw claims for claim type visibility and debugging.
    source: "easyauth", // Marks this identity as coming from EasyAuth.
  };
}

// Reads the local developer identity from the .env file through process.env.
// Example: RBAC_LOCAL_USER_IDENTIFIER can be an email, Azure object id, or dashboard user_id.
function parseLocalEnvironmentPrincipal(): AuthenticatedPrincipal | null {
  // Read the configured local unique identifier and remove accidental spaces.
  const localUserIdentifier = process.env[LOCAL_USER_IDENTIFIER_ENV]?.trim();

  // If the local identifier is missing, local requests cannot be matched to dashboard_users.
  if (!localUserIdentifier) {
    console.warn(`[RBAC] ${LOCAL_USER_IDENTIFIER_ENV} is required when ENVIRONMENT=local.`);
    return null;
  }

  // Return a normalized principal that repository.ts can match against dashboard_users.
  return {
    id: localUserIdentifier, // Always use the configured value as the main lookup id.
    email: looksLikeEmail(localUserIdentifier) ? localUserIdentifier : undefined, // Email lookup when the value is an email.
    displayName: localUserIdentifier, // Friendly local display value for logs and /api/me.
    azureOid: looksLikeGuid(localUserIdentifier) ? localUserIdentifier : undefined, // Azure OID lookup when the value is a GUID.
    provider: "local-env", // Makes it clear this identity came from .env, not EasyAuth.
    roles: [], // .env identity does not provide EasyAuth app roles.
    claims: [{ typ: LOCAL_USER_IDENTIFIER_ENV, val: localUserIdentifier }], // Claim-style trace of the local id source.
    source: "local-env", // Marks this identity as .env based.
  };
}

// Gets the logged-in identity for the request.
// Example: local uses RBAC_LOCAL_USER_IDENTIFIER from .env; Azure uses EasyAuth headers.
export function getAuthenticatedPrincipal(request: NextRequest): AuthenticatedPrincipal | null {
  // Local development must use the .env user identifier so RBAC checks still hit Databricks.
  if (isLocalEnvironment()) {
    return parseLocalEnvironmentPrincipal();
  }

  // Non-local environments must use EasyAuth, because Azure App Service supplies the real user identity.
  return parseEasyAuthPrincipal(request);
}

// Chooses the best user identifier for audit logs.
// Example: use email when present, otherwise Azure object id, otherwise the generic id.
export function getPrincipalAuditId(principal: AuthenticatedPrincipal | RbacUserContext | null): string {
  // Anonymous means no identity was found.
  if (!principal) {
    return "Anonymous";
  }

  // Prefer email because it is easiest for people to search in audit logs.
  return principal.email ?? principal.azureOid ?? principal.id;
}

// Adds normalized user headers to the request after RBAC identifies the user.
// Example: downstream route code can read x-user-id without parsing EasyAuth or local .env identity again.
export function attachPrincipalHeaders(request: NextRequest, principal: RbacUserContext): void {
  // Pick the best user id available for downstream logging and business logic.
  const userId = principal.email ?? principal.dashboardUserId ?? principal.id;

  // Header mutation can fail in some runtime situations, so protect the API with try/catch.
  try {
    // Store a normalized user id for existing API code and audit helpers.
    request.headers.set("x-user-id", userId);

    // Store the user's email when available.
    if (principal.email) request.headers.set("x-user-email", principal.email);

    // Store the dashboard RBAC user id when available.
    if (principal.dashboardUserId) request.headers.set("x-rbac-user-id", principal.dashboardUserId);

    // Store the Azure object id when available.
    if (principal.azureOid) request.headers.set("x-rbac-azure-oid", principal.azureOid);

    // Store where the identity came from, for example "easyauth" or "local-env".
    request.headers.set("x-rbac-principal-source", principal.source);

    // Store whether the user is a super admin, so downstream code can skip extra RBAC checks when appropriate.
    request.headers.set("x-rbac-super-admin", principal.isSuperAdmin ? "true" : "false");
  } catch (error) {
    // Warn developers if the headers could not be attached, but do not fail the API.
    console.warn("[RBAC] Unable to attach normalized principal headers.", error);
  }
}
