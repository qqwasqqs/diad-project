/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026

  Purpose of the script:
    This script provides a centralized Role-Based Access Control (RBAC) authorization framework
    for Next.js API routes. It authenticates users, retrieves their RBAC context, evaluates
    permissions and scopes against route policies, enforces access control decisions, and
    attaches authorization metadata to requests.

    The module also performs audit logging for authorization decisions, API access events,
    and CRUD operations, ensuring traceability, compliance, and security monitoring across
    the application. By wrapping API handlers with authorization checks, it provides a
    consistent and reusable mechanism for protecting backend endpoints and enforcing
    data access governance.
*/


// connection marks the route as dynamic in Next.js, so auth is checked at request time.
// NextResponse builds JSON error responses; NextRequest represents the incoming API request.
import { connection, NextResponse, type NextRequest } from "next/server";

// safeWriteAuditEvent records RBAC decisions without allowing audit failures to break APIs.
import { safeWriteAuditEvent } from "./audit";

// Identity helpers read local .env or EasyAuth identity, choose audit ids, and add normalized user headers.
import {
  attachPrincipalHeaders, // Adds headers like x-user-id after RBAC identifies the user.
  getAuthenticatedPrincipal, // Reads local .env identity in local mode, or EasyAuth identity in Azure.
  getPrincipalAuditId, // Chooses the best id for audit logs, usually email.
} from "./identity";

// Policy helpers decide what permission/scope one API route requires.
import { collectRequestScopes, resolvePolicy } from "./policies";

// Repository helper loads the user's groups, roles, permissions, and scopes from Databricks.
import { getRbacUserContext } from "./repository";

// Permission helpers check if a grant satisfies required permissions and scopes.
import { grantHasRequiredScopes, grantSatisfiesPermission } from "./permissions";

// Data-scope helpers pass the user's group scopes to SQL route handlers after authorization succeeds.
import { buildDataScopeGrantsForPolicy, serializeDataScopeGrants } from "./dataScope";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";

// Shared RBAC types used by the authorization wrapper.
import type {
  AuthenticatedPrincipal, // Normalized identity from EasyAuth or local .env.
  AuthorizationDecision, // Result of checking a user against a policy.
  AuthorizedRouteHandler, // Shape of a Next.js route handler wrapped by RBAC.
  RbacPolicy, // What one route requires.
  RbacScope, // Resource scope such as brand=US.
  RbacUserContext, // Complete current-user authorization profile.
  RouteContext, // Optional Next.js route params.
} from "./types";

// PolicyResolver lets a route provide either a fixed policy or a function that builds one.
// Example: withAuthorization(handler, { permissions: ["kpi:read"] }).
type PolicyResolver<TContext> =
  | RbacPolicy // Fixed policy object.
  | ((request: NextRequest, context: TContext) => Promise<RbacPolicy> | RbacPolicy); // Dynamic policy function.

// Extracts just the path from the request URL.
// Example: "https://site.com/api/me?x=1" becomes "/api/me".
function getRequestPath(request: NextRequest): string {
  // URL parsing is safer than manually splitting strings.
  return new URL(request.url).pathname;
}

// Gets or creates a correlation id for tracking one request across logs.
// Example: if the browser sends x-correlation-id, keep it; otherwise generate a new id.
function getCorrelationId(request: NextRequest): string {
  // Reuse the incoming id when present, otherwise create a new UUID.
  return request.headers.get("x-correlation-id") ?? crypto.randomUUID();
}

// Reads the client IP address from common proxy headers.
// Example: Azure App Service may set x-forwarded-for.
function getClientIp(request: NextRequest): string | undefined {
  // Prefer x-forwarded-for, then x-real-ip, otherwise return undefined.
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined;
}

// Identifies HTTP methods that usually change data.
// Example: POST is a write method; GET is not.
function isWriteMethod(method: string): boolean {
  // Anything except read-style methods is treated as write-like for CRUD auditing.
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

// Detects Next.js production build execution.
// Example: during npm run build, routes may be evaluated without real EasyAuth headers.
function isNextProductionBuild(): boolean {
  // Any one of these environment hints indicates build-time execution.
  return (
    process.env.NEXT_PRIVATE_BUILD_WORKER === "1" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

// Builds a local-only mock principal for design-mode development.
function getLocalDesignModeContext(): RbacUserContext {
  return {
    id: "local-design-mode",
    email: "local.design.mode@localhost",
    displayName: "Local Design Mode",
    provider: "local-env",
    roles: ["local-design-mode"],
    claims: [{ typ: "local_design_mode", val: "true" }],
    source: "local-env",
    dashboardUserId: "local-design-mode",
    groups: [{ groupId: "local-design-mode", groupName: "Local Design Mode" }],
    rbacRoles: [{ roleId: "local-design-mode", roleName: "Local Design Mode" }],
    grants: [{
      groupId: "local-design-mode",
      groupName: "Local Design Mode",
      roleId: "local-design-mode",
      roleName: "Local Design Mode",
      permissionKey: "*",
      scopes: [{ type: "tenant", value: "*" }],
    }],
    isSuperAdmin: true,
  };
}

// Checks whether a user's RBAC context satisfies one route policy.
// Example: user has "data-quality:*"; policy requires "data-quality:read"; decision is allowed.
function evaluatePolicy(userContext: RbacUserContext, policy: RbacPolicy): AuthorizationDecision {
  // Super admins skip detailed permission checks because they have all access.
  if (userContext.isSuperAdmin) {
    return {
      allowed: true, // Allow the API.
      status: 200, // Successful authorization status.
      outcome: "ALLOWED", // Audit-friendly result.
      matchedPermissions: policy.permissions, // Treat all required permissions as matched.
      matchedScopes: policy.scopes ?? [], // Treat all required scopes as matched.
    };
  }

  // Scopes required by the current route, or empty when the route is not scoped.
  const requiredScopes = policy.scopes ?? [];

  // Default behavior requires every listed permission unless a policy says otherwise.
  const requireAllPermissions = policy.requireAllPermissions ?? true;

  // Default behavior requires every listed scope unless a policy says otherwise.
  const requireAllScopes = policy.requireAllScopes ?? true;

  // Store which required permissions were satisfied.
  const matchedPermissions: string[] = [];

  // Store which required scopes were satisfied.
  const matchedScopes: RbacScope[] = [];

  // Check each permission required by the route policy.
  for (const requiredPermission of policy.permissions) {
    // Find one grant that satisfies both permission and scope.
    const matchingGrant = userContext.grants.find((grant) => {
      // If the permission text does not match, this grant cannot satisfy the requirement.
      if (!grantSatisfiesPermission(grant, requiredPermission)) {
        return false;
      }

      // Check whether this grant also covers the required scopes.
      const scopeDecision = grantHasRequiredScopes(grant, requiredScopes, requireAllScopes);

      // If scopes match, remember them for audit/debugging.
      if (scopeDecision.allowed) {
        matchedScopes.push(...scopeDecision.matchedScopes);
      }

      // The grant satisfies the requirement only when the scope decision is allowed.
      return scopeDecision.allowed;
    });

    // If a grant matched, record this required permission as satisfied.
    if (matchingGrant) {
      matchedPermissions.push(requiredPermission);
    } else if (requireAllPermissions) {
      // If all permissions are required, one missing permission is enough to deny immediately.
      return {
        allowed: false, // Block the API in enforce mode.
        status: 403, // Forbidden.
        outcome: "DENIED", // Audit-friendly result.
        reason:
          requiredScopes.length > 0
            ? `Missing permission ${requiredPermission} at the requested scope.`
            : `Missing permission ${requiredPermission}.`, // Explain missing permission.
        matchedPermissions, // Include any permissions already matched before the denial.
        matchedScopes, // Include any scopes already matched before the denial.
      };
    }
  }

  // Decide final allowed result for "all permissions" vs "any permission" policies.
  const allowed = requireAllPermissions
    ? matchedPermissions.length === policy.permissions.length
    : matchedPermissions.length > 0;

  // Return the final authorization decision.
  return {
    allowed, // True if permission requirements were met.
    status: allowed ? 200 : 403, // 200 for allowed, 403 for forbidden.
    outcome: allowed ? "ALLOWED" : "DENIED", // Audit-friendly result.
    reason: allowed ? undefined : "No matching permission grant was found.", // Denial reason.
    matchedPermissions, // Permissions that matched.
    matchedScopes, // Scopes that matched.
  };
}

// Resolves the route policy from either an explicit policy or automatic path-based policy.
// Example: most routes use resolvePolicy; /api/me passes a custom policy.
async function getPolicy<TContext extends RouteContext>(
  request: NextRequest, // Incoming request.
  context: TContext, // Route context such as params.
  policyResolver?: PolicyResolver<TContext> // Optional explicit policy or policy builder.
): Promise<RbacPolicy> {
  // If no route-specific policy was provided, infer it from path and method.
  if (!policyResolver) {
    const temp = resolvePolicy(request, context);
    return temp;
  }

  // If a policy function was provided, call it; otherwise use the provided object.
  const policy =
    typeof policyResolver === "function"
      ? await policyResolver(request, context)
      : policyResolver;

  // If the custom policy already includes scopes, trust it as complete.
  if (policy.scopes) {
    return policy;
  }

  // Otherwise add scopes collected from the request, so custom policies can still be scoped.
  return {
    ...policy, // Keep resource, action, permissions, and other policy fields.
    scopes: await collectRequestScopes(request, context), // Add detected request scopes.
  };
}

// Writes an audit event for the allow/deny authorization decision.
// Example: "AUTHORIZATION_DECISION DENIED for POST /api/...".
async function auditAuthorizationDecision(args: {
  request: NextRequest; // Incoming request being authorized.
  requestStartedAt: Date; // When the request started.
  correlationId: string; // Tracking id for this request.
  principal: AuthenticatedPrincipal | RbacUserContext | null; // User identity or null.
  policy: RbacPolicy; // Policy that was checked.
  decision: AuthorizationDecision; // Result of the policy check.
}): Promise<void> {
  // Write a safe audit event; failures here should not crash the API.
  await safeWriteAuditEvent({
    eventType: "AUTHORIZATION_DECISION", // This log is about the RBAC decision.
    principalId: getPrincipalAuditId(args.principal), // Best user id for audit logs.
    principalEmail: args.principal?.email, // User email when available.
    resourceType: "api_route", // The protected resource is an API route.
    resourceValue: `${args.request.method.toUpperCase()} ${getRequestPath(args.request)}`, // Example: "GET /api/me".
    scopes: args.policy.scopes, // Scopes considered for this decision.
    outcome: args.decision.outcome, // ALLOWED or DENIED.
    denialReason: args.decision.reason, // Explanation when denied.
    ipAddress: getClientIp(args.request), // Client IP if available.
    userAgent: args.request.headers.get("user-agent") ?? undefined, // Browser/client details.
    requestStartedAt: args.requestStartedAt, // Request start time.
    method: args.request.method.toUpperCase(), // HTTP method.
    path: getRequestPath(args.request), // API path.
    statusCode: args.decision.status, // Decision status.
    correlationId: args.correlationId, // Tracking id.
  });
}

// Writes an audit event after the API handler runs.
// Example: "API_ACCESS SUCCESS for GET /api/dashboard-modules".
async function auditApiAccess(args: {
  request: NextRequest; // Incoming request.
  requestStartedAt: Date; // When the request started.
  correlationId: string; // Tracking id for logs.
  principal: RbacUserContext; // Authorized user context.
  policy: RbacPolicy; // Policy used for the route.
  response?: Response; // API response if handler completed.
  error?: unknown; // Error if handler threw.
}): Promise<void> {
  // Use response status when available; otherwise use 500 for thrown errors.
  const statusCode = args.response?.status ?? 500;

  // Treat 2xx/3xx responses without thrown errors as success; everything else as failed.
  const outcome = statusCode >= 200 && statusCode < 400 && !args.error ? "SUCCESS" : "FAILED";

  // Build a readable failure reason for logs.
  const denialReason = args.error instanceof Error ? args.error.message : `HTTP_${statusCode}`;

  // Record general API access.
  await safeWriteAuditEvent({
    eventType: "API_ACCESS", // This log is about the API call result.
    principalId: getPrincipalAuditId(args.principal), // Best user id for audit logs.
    principalEmail: args.principal.email, // User email when available.
    resourceType: "api_route", // Protected resource type.
    resourceValue: `${args.request.method.toUpperCase()} ${getRequestPath(args.request)}`, // Example: "GET /api/me".
    scopes: args.policy.scopes, // Scopes considered for the route.
    outcome, // SUCCESS or FAILED.
    denialReason: outcome === "FAILED" ? denialReason : undefined, // Failure reason only when failed.
    ipAddress: getClientIp(args.request), // Client IP if available.
    userAgent: args.request.headers.get("user-agent") ?? undefined, // Browser/client details.
    requestStartedAt: args.requestStartedAt, // Request start time.
    method: args.request.method.toUpperCase(), // HTTP method.
    path: getRequestPath(args.request), // API path.
    statusCode, // Final response status.
    correlationId: args.correlationId, // Tracking id.
  });

  // Write an additional CRUD audit event for methods that can change data.
  if (isWriteMethod(args.request.method)) {
    await safeWriteAuditEvent({
      eventType: "CRUD_ACTION", // This log is about a write-style operation.
      principalId: getPrincipalAuditId(args.principal), // Best user id for audit logs.
      principalEmail: args.principal.email, // User email when available.
      resourceType: args.policy.resource, // Business resource, for example "data-quality".
      resourceValue: `${args.policy.action} ${getRequestPath(args.request)}`, // Example: "update /api/...".
      scopes: args.policy.scopes, // Scopes involved in the write.
      outcome, // SUCCESS or FAILED.
      denialReason: outcome === "FAILED" ? denialReason : undefined, // Failure reason only when failed.
      ipAddress: getClientIp(args.request), // Client IP if available.
      userAgent: args.request.headers.get("user-agent") ?? undefined, // Browser/client details.
      requestStartedAt: args.requestStartedAt, // Request start time.
      method: args.request.method.toUpperCase(), // HTTP method.
      path: getRequestPath(args.request), // API path.
      statusCode, // Final response status.
      correlationId: args.correlationId, // Tracking id.
    });
  }
}

// Builds a standard JSON error response for authorization failures.
// Example: authorizationErrorResponse(403, "Forbidden.") returns { error: "Forbidden." }.
function authorizationErrorResponse(status: 401 | 403 | 503, message: string): NextResponse {
  // Use a consistent error shape across all RBAC-protected APIs.
  return NextResponse.json({ error: message }, { status });
}

// Serializes scopes into a request header value.
// Example: [{ type: "brand", value: "US" }] becomes a JSON string route handlers can parse.
function serializeScopes(scopes: RbacScope[] | undefined): string {
  // Use an empty array when the route has no required scopes.
  return JSON.stringify(scopes ?? []);
}

// Attaches authorization details to the request before the actual API handler runs.
// Example: a route handler can read x-rbac-required-scopes to know which brand/dataset was validated.
function attachAuthorizationContextHeaders(args: {
  request: NextRequest; // Request that will be passed to the actual API route.
  principal: RbacUserContext; // Authorized user profile after RBAC lookup.
  policy: RbacPolicy; // Required resource, action, permissions, and scopes.
  decision: AuthorizationDecision; // Matched permissions and scopes from validation.
  correlationId: string; // Request tracking id used across logs and responses.
}): void {
  // Attach normalized user headers such as x-user-id and x-rbac-user-id.
  attachPrincipalHeaders(args.request, args.principal);

  // Header mutation can fail in some runtime situations, so protect the API with try/catch.
  try {
    // Pass the resource family that was authorized, for example "data-quality-dashboard".
    args.request.headers.set("x-rbac-resource", args.policy.resource);

    // Pass the action that was authorized, for example "read" or "update".
    args.request.headers.set("x-rbac-action", args.policy.action);

    // Pass required permissions as JSON so route handlers can inspect the exact policy.
    args.request.headers.set("x-rbac-required-permissions", JSON.stringify(args.policy.permissions));

    // Pass matched permissions as JSON so route handlers can see what satisfied authorization.
    args.request.headers.set("x-rbac-matched-permissions", JSON.stringify(args.decision.matchedPermissions));

    // Pass required scopes as JSON to the actual API route after authorization validation.
    args.request.headers.set("x-rbac-required-scopes", serializeScopes(args.policy.scopes));

    // Pass matched scopes as JSON so the route can compare requested vs granted scope if needed.
    args.request.headers.set("x-rbac-matched-scopes", serializeScopes(args.decision.matchedScopes));

    // Pass grant-level scopes so SQL routes can filter rows by the user's assigned groups.
    // Example: a Finance-only user gets a header that lets queries add WHERE business_unit = 'Finance'.
    args.request.headers.set(
      "x-rbac-data-scope-grants",
      serializeDataScopeGrants(buildDataScopeGrantsForPolicy(args.principal, args.policy))
    );

    // Pass the correlation id to downstream code so logs can stay connected.
    args.request.headers.set("x-correlation-id", args.correlationId);
  } catch (error) {
    // Warn developers if RBAC context headers could not be attached, but do not fail the API.
    console.warn("[RBAC] Unable to attach authorization context headers.", error);
  }
}

// Wraps an API route handler with authentication, authorization, and audit logging.
// Example: export const GET = withAuthorization(handler) protects a GET API route.
export function withAuthorization<TContext extends RouteContext = RouteContext>(
  handler: AuthorizedRouteHandler<TContext>, // Original route handler that should run only after RBAC allows it.
  policyResolver?: PolicyResolver<TContext> // Optional custom route policy.
): AuthorizedRouteHandler<TContext> {
  // Return a new handler that performs RBAC before calling the original handler.
  return async function authorizedRouteHandler(
    request: NextRequest, // Incoming API request.
    context: TContext // Next.js route context.
  ): Promise<Response> {
    // Force request-time behavior so protected APIs are not statically evaluated.
    await connection();

    // During Next.js build, do not perform real RBAC or Databricks work.
    if (isNextProductionBuild()) {
      return new Response(null, {
        status: 204, // No content because this is build-time only.
        headers: { "x-rbac-build-skip": "true" }, // Helps identify build skip behavior.
      });
    }

    // Capture when the request started for audit timing.
    const requestStartedAt = new Date();

    // Get or create a correlation id for tracing this request.
    const correlationId = getCorrelationId(request);

    // Resolve what this route requires.
    const policy = await getPolicy(request, context, policyResolver);

    // Local design mode bypasses external RBAC dependencies and always allows the request.
    if (isLocalDesignModeServer()) {
      const userContext = getLocalDesignModeContext();
      const decision: AuthorizationDecision = {
        allowed: true,
        status: 200,
        outcome: "ALLOWED",
        matchedPermissions: policy.permissions,
        matchedScopes: policy.scopes ?? [],
      };

      attachAuthorizationContextHeaders({
        request,
        principal: userContext,
        policy,
        decision,
        correlationId,
      });

      const response = await handler(request, context);
      try {
        response.headers.set("x-correlation-id", correlationId);
        response.headers.set("x-local-design-mode", "true");
      } catch (error) {
        console.warn("[RBAC] Unable to attach response headers in local design mode.", error);
      }
      return response;
    }

    // Read the authenticated user from local .env in local mode, otherwise from EasyAuth.
    const principal = getAuthenticatedPrincipal(request);

    // If there is no logged-in user and the route is not public, deny before RBAC lookup.
    if (!principal && !policy.allowAnonymous) {
      // Build an audit decision for missing authentication.
      const decision: AuthorizationDecision = {
        allowed: false, // Do not allow anonymous access.
        status: 401, // 401 means authentication is required.
        outcome: "DENIED", // Audit-friendly result.
        reason: "Authenticated principal was not found.", // Clear reason for logs.
        matchedPermissions: [], // No permissions matched because there was no user.
        matchedScopes: [], // No scopes matched because there was no user.
      };

      // Audit the authentication failure.
      await auditAuthorizationDecision({
        request, // Original request.
        requestStartedAt, // Start time.
        correlationId, // Tracking id.
        principal, // Null principal.
        policy, // Policy that could not be evaluated.
        decision, // Denial decision.
      });

      // Return a standard unauthenticated response.
      return authorizationErrorResponse(401, "Authentication required.");
    }

    // This will hold the full RBAC profile after lookup.
    let userContext: RbacUserContext | null = null;

    // RBAC lookup can fail if Databricks or configuration is unavailable.
    try {
      // Load the authenticated user from Databricks, regardless of whether they're from EasyAuth or local .env.
      userContext = principal ? await getRbacUserContext(principal) : null;
    } catch (error) {
      // Build an authorization decision for RBAC service failure.
      const decision: AuthorizationDecision = {
        allowed: false, // Do not allow when authorization service cannot evaluate safely.
        status: 503, // 503 means authorization service unavailable.
        outcome: "DENIED", // Audit-friendly result.
        reason: error instanceof Error ? error.message : "RBAC lookup failed.", // Useful troubleshooting detail.
        matchedPermissions: [], // No permission was matched.
        matchedScopes: [], // No scope was matched.
      };

      // Audit the RBAC lookup failure.
      await auditAuthorizationDecision({
        request, // Original request.
        requestStartedAt, // Start time.
        correlationId, // Tracking id.
        principal, // Authenticated principal if available.
        policy, // Policy being checked.
        decision, // Failure decision.
      });

      // Return a safe service-unavailable response.
      return authorizationErrorResponse(503, "Authorization service unavailable.");
    }

    // If the authenticated user is not active/found in dashboard_users, deny access.
    if (!userContext && !policy.allowAnonymous) {
      // Build an authorization decision for inactive/missing RBAC user.
      const decision: AuthorizationDecision = {
        allowed: false, // Do not allow inactive users.
        status: 403, // 403 means authenticated but forbidden.
        outcome: "DENIED", // Audit-friendly result.
        reason: "Authenticated user is not active in the RBAC user table.", // Clear denial reason.
        matchedPermissions: [], // No permission was matched.
        matchedScopes: [], // No scope was matched.
      };

      // Audit the inactive-user denial.
      await auditAuthorizationDecision({
        request, // Original request.
        requestStartedAt, // Start time.
        correlationId, // Tracking id.
        principal, // Authenticated principal.
        policy, // Policy being checked.
        decision, // Denial decision.
      });

      // Return a standard forbidden response.
      return authorizationErrorResponse(403, "Forbidden.");
    }

    // For anonymous/public routes without an authenticated user, create a minimal context.
    if (!userContext) {
      userContext = {
        id: "anonymous", // Placeholder id for anonymous access.
        displayName: "Anonymous", // Friendly name for logs.
        provider: "anonymous", // Marks this as unauthenticated access.
        roles: [], // Anonymous users have no EasyAuth roles.
        claims: [], // Anonymous users have no claims.
        source: "local-env", // Identifies this as anonymous access.
        dashboardUserId: "anonymous", // Dashboard user id for anonymous audit.
        groups: [], // Anonymous users are not in any RBAC groups.
        rbacRoles: [], // Anonymous users have no dashboard roles.
        grants: [], // Anonymous users have no permission grants.
        isSuperAdmin: false, // Anonymous users are never super admins.
      };
    }

    // Evaluate permissions and scopes against the policy.
    const decision = evaluatePolicy(userContext, policy);

    // Audit the authorization decision before running the handler.
    await auditAuthorizationDecision({
      request, // Original request.
      requestStartedAt, // Start time.
      correlationId, // Tracking id.
      principal: userContext, // Full RBAC user context.
      policy, // Policy that was evaluated.
      decision, // Allow/deny decision.
    });

    // In enforce mode, blocked decisions always stop here.
    if (!decision.allowed) {
      return authorizationErrorResponse(decision.status === 503 ? 503 : 403, "Forbidden.");
    }

    // Add normalized user, permission, and required scope headers for the actual API route.
    attachAuthorizationContextHeaders({
      request, // Same request object that will be passed to the route handler.
      principal: userContext, // Authorized user context from Databricks RBAC.
      policy, // Required permissions and scopes that were validated.
      decision, // Matched permissions and scopes from validation.
      correlationId, // Request tracking id for downstream logs.
    });

    // Run the original API handler and audit its result.
    try {
      // Call the route handler after authorization succeeds.
      const response = await handler(request, context);

      // Try to add tracing headers to the response.
      try {
        response.headers.set("x-correlation-id", correlationId); // Helps match browser response to logs.
      } catch (error) {
        // Some response objects may not allow header mutation; warn but do not fail the API.
        console.warn("[RBAC] Unable to attach response headers.", error);
      }

      // Audit the final API access result.
      await auditApiAccess({
        request, // Original request.
        requestStartedAt, // Start time.
        correlationId, // Tracking id.
        principal: userContext, // Authorized user.
        policy, // Policy used for the route.
        response, // Handler response.
      });

      // Return the original handler response to the browser.
      return response;
    } catch (error) {
      // If the handler throws, audit the failure before rethrowing.
      await auditApiAccess({
        request, // Original request.
        requestStartedAt, // Start time.
        correlationId, // Tracking id.
        principal: userContext, // Authorized user.
        policy, // Policy used for the route.
        error, // Thrown error.
      });

      // Rethrow so Next.js handles the error normally.
      throw error;
    }
  };
}
