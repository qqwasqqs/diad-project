/*
Project Name : Teva Data Integrity
Business Owner, Team : Keerthi Pusuloori
Script Author, Team : Parthesh Patel
Date: 20 May 2026
Updated: 02 June 2026

Purpose of the script:
This script defines the ForbiddenAccessDialog component.
- Renders a full-screen overlay dialog whenever a 403 Forbidden API response is detected.
- Explains to the user exactly which RBAC entitlement is missing based on the permission
  context passed in via props.
- Provides the workspace ID, the required permission key, and actionable guidance so the
  user knows who to contact and what to ask for.
- Matches the visual language of the Teva Data Integrity application:
  Fluent UI tokens, makeStyles, neutral color palette, consistent spacing.

Changes in this update (02 June 2026):
1. Added `errorCode` prop — accepts all RBAC error codes returned by withAuthorization()
   and /api/me (route.ts): RBAC_USER_NOT_FOUND, RBAC_GROUP_NOT_ASSIGNED,
   RBAC_PERMISSION_NOT_ASSIGNED, RBAC_INACTIVE_USER, RBAC_INSUFFICIENT_PERMISSION.
2. Dynamic dialog title — derived from errorCode instead of always showing
   "Unable to view page". Each error code has a distinct, actionable title.
3. Dynamic body copy — when no requiredPermission is provided (setup-level errors),
   the body message is derived from errorCode so the detail block never renders empty.
4. Escape key dismiss — useEffect listens for the Escape key and calls onDismiss,
   so keyboard users can close the dialog without reaching for the mouse.
5. aria-describedby — dialog div now references the body text element for screen
   reader accessibility (WCAG 2.1 role=dialog requirement).

Business Value:
- Eliminates confusion when users hit access walls — they see exactly what is missing.
- Reduces support tickets by giving users the precise permission name to request.
- Keeps the UX consistent with the rest of the analytics dashboard.

Usage:
  import { ForbiddenAccessDialog } from "@/components/ui/ForbiddenAccessDialog";

  <ForbiddenAccessDialog
    open={is403Error}
    onDismiss={() => setIs403Error(false)}
    errorCode={apiError?.code}              // NEW — pass RBAC error code from API response
    requiredPermission="dashboard.read"     // optional — permission key from RBAC schema
    permissionCategory="dashboard"          // optional — category enum from dashboard_permissions
    resourceName="Pipelines Monitoring"     // optional — human-readable name of the page/resource
    workspaceId="803071606813628"           // optional — shown in the error detail
    adminContact="your workspace administrator" // optional — defaults sensibly
  />
*/

"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
  Why used: Provides standardized UI components consistent with the rest of the
  Teva Data Integrity application — tokens, makeStyles, Dialog, Button, Text.
*/
import {
  makeStyles,   // Fluent UI hook for scoped component styles
  tokens,       // Fluent UI design tokens for spacing, colors, typography
  Button,       // Fluent UI Button for the dismiss / contact actions
  Text,         // Fluent UI Text for consistent typography hierarchy
  Badge,        // Fluent UI Badge to highlight the permission key
  Divider,      // Fluent UI Divider for visual separation inside the dialog
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
  - What it is: Fluent UI SVG icon components.
  - Why used: Provides contextually meaningful icons (lock, warning, person)
    that reinforce the "access denied" message without being alarming.
*/
import {
  LockClosedFilled,    // Primary icon — reinforces "access denied" clearly
  ShieldErrorRegular,  // Secondary icon shown in the permission badge area
  PersonCallRegular,   // Icon for the "Contact Admin" action button
  ArrowLeftRegular,    // Icon for the "Go Back" action button
  InfoRegular,         // Icon for the detail section header
} from "@fluentui/react-icons";

/*
  react
  - What it is: React library.
  - Why used: Component rendering, props typing, and useEffect for Escape key handling.
  CHANGE: Added useEffect import for the Escape key dismiss listener (fix #4).
*/
import React, { useEffect } from "react";

// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------

/**
 * RbacErrorCode
 *
 * All RBAC error codes returned by withAuthorization() and /api/me (route.ts).
 * Each code maps to a distinct title and body message in this component.
 *
 * RBAC_USER_NOT_FOUND          — authenticated via EasyAuth/Azure AD but not in dashboard_users
 * RBAC_GROUP_NOT_ASSIGNED      — user exists but belongs to no RBAC group
 * RBAC_PERMISSION_NOT_ASSIGNED — user has groups/roles but no effective permission grants
 * RBAC_INACTIVE_USER           — user record is marked is_active = false in dashboard_users
 * RBAC_INSUFFICIENT_PERMISSION — user is set up but lacks the specific permission for this resource
 */
type RbacErrorCode =
  | "RBAC_USER_NOT_FOUND"
  | "RBAC_GROUP_NOT_ASSIGNED"
  | "RBAC_PERMISSION_NOT_ASSIGNED"
  | "RBAC_INACTIVE_USER"
  | "RBAC_INSUFFICIENT_PERMISSION"
  | string; // catch-all for any unrecognised codes

/**
 * ForbiddenAccessDialogProps
 * Props accepted by the ForbiddenAccessDialog component.
 */
export interface ForbiddenAccessDialogProps {
  /** Whether the overlay is visible. Drive this with your 403 error state. */
  open: boolean;

  /**
   * Called when the user clicks "Go Back", presses Escape, or clicks the backdrop.
   * Use this to reset your 403 error state and navigate away.
   */
  onDismiss: () => void;

  /**
   * NEW (fix #1) — The RBAC error code from the 403 API response body.
   * Drives the dialog title and body copy when no requiredPermission is available.
   * Example: "RBAC_USER_NOT_FOUND", "RBAC_INSUFFICIENT_PERMISSION"
   * If omitted, the component falls back to generic "Access Denied" copy.
   */
  errorCode?: RbacErrorCode;

  /**
   * The dot-notation RBAC permission key the user is missing.
   * Shown prominently so the user knows exactly what to request.
   * Example: "dashboard.read", "data.write", "rbac.manage"
   * Optional — not available for setup-level errors (RBAC_USER_NOT_FOUND, etc.)
   */
  requiredPermission?: string;

  /**
   * The RBAC permission category (dashboard | data | audit | rbac | identity).
   * Used to give contextual guidance in the message body.
   */
  permissionCategory?: "dashboard" | "data" | "audit" | "rbac" | "identity" | string;

  /**
   * Human-readable name of the page or resource the user tried to access.
   * Example: "Pipelines Monitoring", "Data Quality Dashboard", "Roles Management"
   */
  resourceName?: string;

  /**
   * Optional workspace / tenant ID shown in the detail line, matching the
   * Databricks-style error message the team is familiar with.
   */
  workspaceId?: string;

  /**
   * Who the user should contact. Defaults to "your workspace administrator".
   */
  adminContact?: string;
}

// ---------------------------------------------------------------------
// ERROR CODE CONTENT MAP  (NEW — fix #2 and fix #3)
//
// Maps each RBAC error code to:
//   title       — replaces the hardcoded "Unable to view page" heading
//   bodyMessage — replaces the generic body when no requiredPermission is present
//
// These messages are shown when the detail block would otherwise be empty,
// i.e. for setup-level errors where there is no specific permission key to show.
// ---------------------------------------------------------------------

type ErrorCodeContent = {
  title: string;
  bodyMessage: string;
};

const ERROR_CODE_CONTENT: Record<string, ErrorCodeContent> = {
  /**
   * RBAC_USER_NOT_FOUND
   * User authenticated via EasyAuth/Azure AD but not present in dashboard_users.
   * A workspace admin must provision the account before any access is possible.
   */
  RBAC_USER_NOT_FOUND: {
    title: "Account Not Provisioned",
    bodyMessage:
      "You have been authenticated successfully, but your account has not been registered in the Teva Data Integrity dashboard. Please contact your administrator to provision your account and assign you to the appropriate group.",
  },

  /**
   * RBAC_GROUP_NOT_ASSIGNED
   * User exists in dashboard_users but has no RBAC group membership.
   * All permissions in this system flow through groups — no group = no access.
   */
  RBAC_GROUP_NOT_ASSIGNED: {
    title: "No Group Assigned",
    bodyMessage:
      "Your account exists but has not been assigned to any access group. All permissions in this dashboard are managed through groups. Please contact your administrator and ask to be added to the appropriate RBAC group.",
  },

  /**
   * RBAC_PERMISSION_NOT_ASSIGNED
   * User has group + role assignment but the role has no permissions attached.
   * Usually a misconfiguration in the Roles Management tab.
   */
  RBAC_PERMISSION_NOT_ASSIGNED: {
    title: "No Permissions Configured",
    bodyMessage:
      "Your account has been assigned to a group and has roles, but no effective permissions have been granted. This is usually a configuration issue. Please contact your administrator and ask them to verify that your role has permissions attached in the Roles Management tab.",
  },

  /**
   * RBAC_INACTIVE_USER
   * User record is present but is_active = false in dashboard_users.
   * An admin must re-activate the account.
   */
  RBAC_INACTIVE_USER: {
    title: "Account Deactivated",
    bodyMessage:
      "Your account has been deactivated in the Teva Data Integrity dashboard. You cannot access any pages until your account is reactivated. Please contact your administrator to restore access.",
  },

  /**
   * RBAC_INSUFFICIENT_PERMISSION
   * User is fully set up but lacks the specific permission for this resource/action.
   * This is the most common 403 — a regular user hitting a restricted page.
   * Body falls through to the standard template (requiredPermission is available).
   */
  RBAC_INSUFFICIENT_PERMISSION: {
    title: "Insufficient Permissions",
    bodyMessage: "", // Left empty — the standard body template is used instead because requiredPermission is available
  },
};

/** Fallback used for any unrecognised error code or when errorCode is not provided. */
const DEFAULT_ERROR_CONTENT: ErrorCodeContent = {
  title: "Unable to view page",
  bodyMessage: "", // Left empty — the standard body template handles this case
};

// ---------------------------------------------------------------------
// STYLING
// — Unchanged from the original. All styles use Fluent UI tokens to stay
//   in sync with the rest of the app's color palette and spacing scale.
// ---------------------------------------------------------------------

const useStyles = makeStyles({

  // ── Backdrop overlay ────────────────────────────────────────────────
  backdrop: {
    // Fixed full-screen overlay that sits above all other content
    position: "fixed",
    inset: 0,          // shorthand for top/right/bottom/left: 0
    zIndex: 9999,      // ensure it floats above sidebars, headers, grids
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Semi-transparent dark backdrop consistent with the dark-themed Databricks error
    // but softened to stay within the Fluent UI neutral palette
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    backdropFilter: "blur(2px)", // subtle blur so the underlying page is still hinted
  },

  // ── Dialog card ─────────────────────────────────────────────────────
  card: {
    // The centered white/neutral card matching the Fluent UI dialog surface style
    // used throughout the rest of the application
    backgroundColor: tokens.colorNeutralBackground1, // same surface used by all Fluent UI dialogs
    borderRadius: tokens.borderRadiusXLarge,          // softer corners matching Fluent UI DialogSurface
    border: `1px solid ${tokens.colorNeutralStroke1}`, // subtle border consistent with other dialogs
    boxShadow: tokens.shadow64,                        // Fluent UI's largest shadow for floating surfaces
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
    maxWidth: "520px",
    width: "calc(100vw - 48px)", // responsive: never touches viewport edges on small screens
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL, // consistent vertical rhythm between sections
  },

  // ── Icon area ────────────────────────────────────────────────────────
  iconWrapper: {
    // Centered lock icon with a tinted circular background — the "hero" of the card
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    // Danger-tinted background using Fluent UI's palette red tokens so it reads
    // as "error / access denied" without being garish
    backgroundColor: tokens.colorPaletteRedBackground1,
    flexShrink: 0,
    alignSelf: "flex-start", // left-align with the text below for visual anchor
  },

  // ── Title row ────────────────────────────────────────────────────────
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },

  titleText: {
    // Primary heading — uses the same weight/size as DialogTitle in other pages
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: "1.3",
  },

  // ── Body text ────────────────────────────────────────────────────────
  bodyText: {
    color: tokens.colorNeutralForeground2, // slightly muted body copy, same as Fluent UI body
    lineHeight: "1.6",
    display: "block",
  },

  // ── Permission detail block ───────────────────────────────────────────
  detailBlock: {
    // Inset panel showing the specific permission details — styled like a
    // code/info callout consistent with the popover surfaces used elsewhere
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },

  detailRow: {
    // Each label + value pair inside the detail block
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    flexWrap: "wrap", // wraps on narrow viewports
  },

  detailLabel: {
    // Muted uppercase label — same pattern as tableHeaderText in DashboardGroupsTab
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },

  detailValue: {
    // Value text — right-aligned for label/value balance
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightRegular,
    textAlign: "right",
    wordBreak: "break-all", // prevent long permission keys from overflowing
  },

  // ── Permission key badge ─────────────────────────────────────────────
  permissionBadgeRow: {
    // Row containing the "Required permission" label and the permission key badge
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    flexWrap: "wrap",
  },

  // ── Error code badge row (NEW — fix #1) ───────────────────────────────
  errorCodeRow: {
    // Shows the raw RBAC error code as a scannable badge for admin diagnosis
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },

  errorCodeLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  // ── Info section header ───────────────────────────────────────────────
  infoHeader: {
    // Small "What does this mean?" header above the explanation text
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
  },

  // ── Action buttons row ────────────────────────────────────────────────
  actionsRow: {
    // Horizontally arranged action buttons — matches DialogActions pattern
    display: "flex",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap", // stack on narrow viewports
    marginTop: tokens.spacingVerticalXS,
  },
});

// ---------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------

/**
 * getCategoryGuidance
 *
 * Returns a human-readable sentence explaining what the missing permission
 * category governs, so the user can describe the access they need to their admin.
 * Unchanged from original.
 */
function getCategoryGuidance(category?: string): string {
  switch (category) {
    case "dashboard":
      return "This permission controls access to one or more pages or views within the Analytics Dashboard.";
    case "data":
      return "This permission controls access to read, write, or export underlying data assets.";
    case "audit":
      return "This permission controls access to audit logs, login activity, and configuration history.";
    case "rbac":
      return "This permission controls the ability to manage users, groups, roles, and permission assignments.";
    case "identity":
      return "This permission controls identity and authentication-related operations within the workspace.";
    default:
      return "This permission controls access to a protected resource within the Analytics Dashboard.";
  }
}

// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * ForbiddenAccessDialog
 *
 * Full-screen overlay shown when any API call returns a 403 Forbidden response.
 *
 * Drop-in usage in any page:
 *
 *   const [is403, setIs403] = useState(false);
 *   const [rbacError, setRbacError] = useState<{ code?: string; permission?: string } | null>(null);
 *
 *   // In your API error handler / React Query onError:
 *   if (error?.response?.status === 403) {
 *     setRbacError({ code: error.response.data?.code, permission: error.response.data?.requiredPermission });
 *     setIs403(true);
 *   }
 *
 *   return (
 *     <>
 *       <YourPageContent />
 *       <ForbiddenAccessDialog
 *         open={is403}
 *         onDismiss={() => setIs403(false)}
 *         errorCode={rbacError?.code}
 *         requiredPermission={rbacError?.permission}
 *         permissionCategory="dashboard"
 *         resourceName="Pipelines Monitoring"
 *         workspaceId="803071606813628"
 *       />
 *     </>
 *   );
 */
export function ForbiddenAccessDialog({
  open,
  onDismiss,
  errorCode,
  requiredPermission,
  permissionCategory,
  resourceName = "this page",
  workspaceId,
  adminContact = "your workspace administrator",
}: ForbiddenAccessDialogProps) {
  const styles = useStyles();

  // ── FIX #4: Escape key dismiss ────────────────────────────────────────
  // Listens for the Escape key while the dialog is open and calls onDismiss.
  // Cleans up the listener when the dialog closes or the component unmounts.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss]);

  // Nothing to render when the dialog is closed
  if (!open) return null;

  // ── FIX #2: Derive dynamic title from errorCode ───────────────────────
  // Looks up the title for the given error code. Falls back to the default
  // "Unable to view page" if the code is not recognised or not provided.
  const errorContent =
    (errorCode && ERROR_CODE_CONTENT[errorCode]) ? ERROR_CODE_CONTENT[errorCode] : DEFAULT_ERROR_CONTENT;
  const dialogTitle = errorContent.title;

  // ── FIX #3: Derive dynamic body copy when no requiredPermission ────────
  // For setup-level errors (RBAC_USER_NOT_FOUND, RBAC_GROUP_NOT_ASSIGNED,
  // RBAC_PERMISSION_NOT_ASSIGNED, RBAC_INACTIVE_USER) there is no permission
  // key to show, so we use the code-specific body message instead of the
  // standard template that references requiredPermission and workspaceId.
  const useSetupBody =
    !requiredPermission && errorContent.bodyMessage.length > 0;

  // Derive the category guidance text — used in the "What this means" section
  const categoryGuidance = getCategoryGuidance(permissionCategory);

  // Determine the entitlement label shown in the detail block
  const entitlementLabel =
    permissionCategory === "rbac"
      ? "RBAC Management access"
      : permissionCategory === "audit"
      ? "Audit access"
      : permissionCategory === "data"
      ? "Data access"
      : permissionCategory === "identity"
      ? "Identity access"
      : "Dashboard access";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    // Backdrop — clicking it calls onDismiss so the user can navigate away
    <div className={styles.backdrop} onClick={onDismiss}>

      {/*
        Card — stopPropagation prevents backdrop click from firing when clicking inside.
        FIX #5: Added aria-describedby pointing to the body text element so screen
        readers announce the explanation automatically when the dialog opens.
      */}
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forbidden-dialog-title"
        aria-describedby="forbidden-dialog-body"  // FIX #5 — was missing in original
      >

        {/* ── Title row with lock icon ──────────────────────────────── */}
        <div className={styles.titleRow}>

          {/* Lock icon with danger-tinted background */}
          <div className={styles.iconWrapper}>
            <LockClosedFilled
              fontSize={28}
              style={{ color: tokens.colorPaletteRedForeground1 }}
            />
          </div>

          {/* Heading text — FIX #2: now dynamic instead of hardcoded */}
          <div>
            <Text
              id="forbidden-dialog-title"
              as="h2"
              size={600}
              className={styles.titleText}
            >
              {dialogTitle}
            </Text>

            {/* Subtitle — resource name shown when provided */}
            {resourceName && resourceName !== "this page" && (
              <Text
                size={200}
                style={{ color: tokens.colorNeutralForeground3, display: "block", marginTop: "2px" }}
              >
                {resourceName}
              </Text>
            )}
          </div>
        </div>

        {/* ── Primary explanation ───────────────────────────────────── */}
        {/*
          FIX #3: If this is a setup-level error with no requiredPermission,
          show the code-specific body message. Otherwise show the standard
          permission-focused template from the original component.
        */}
        <Text
          id="forbidden-dialog-body"   // FIX #5 — aria-describedby target
          size={300}
          className={styles.bodyText}
        >
          {useSetupBody ? (
            // Setup-level error body — specific to the error code, no permission key needed
            errorContent.bodyMessage
          ) : (
            // Standard body — references resourceName, workspaceId, and adminContact
            <>
              You do not have permission to access{" "}
              <strong>{resourceName}</strong>
              {workspaceId ? (
                <> in workspace <strong>{workspaceId}</strong></>
              ) : null}
              . Please contact {adminContact} to ensure you are assigned to the
              workspace and have the required entitlement to access this page.
            </>
          )}
        </Text>

        {/* ── Permission detail block ───────────────────────────────── */}
        {/*
          The detail block is shown when:
          - requiredPermission is present (standard insufficient-permission 403), OR
          - errorCode is present (shows the error code badge for admin diagnosis)
          This ensures the block is never empty for setup-level errors.
        */}
        <div className={styles.detailBlock}>

          {/* Detail block header */}
          <div className={styles.infoHeader}>
            <InfoRegular fontSize={14} />
            <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground2 }}>
              Required access details
            </Text>
          </div>

          <Divider style={{ marginBlock: tokens.spacingVerticalXXS }} />

          {/* Required permission key — highlighted as a badge */}
          {requiredPermission && (
            <div className={styles.permissionBadgeRow}>
              <Text className={styles.detailLabel}>Required Permission</Text>
              <Badge
                appearance="filled"
                color="danger"
                style={{ fontFamily: "monospace", fontSize: tokens.fontSizeBase200 }}
              >
                <ShieldErrorRegular fontSize={12} style={{ marginRight: "4px" }} />
                {requiredPermission}
              </Badge>
            </div>
          )}

          {/* Permission category */}
          {permissionCategory && (
            <div className={styles.detailRow}>
              <Text className={styles.detailLabel}>Category</Text>
              <Badge appearance="outline" color="brand">
                {permissionCategory}
              </Badge>
            </div>
          )}

          {/* Required entitlement type — only meaningful when requiredPermission is present */}
          {requiredPermission && (
            <div className={styles.detailRow}>
              <Text className={styles.detailLabel}>Entitlement Required</Text>
              <Text className={styles.detailValue}>{entitlementLabel}</Text>
            </div>
          )}

          {/* Workspace ID — shown only when provided */}
          {workspaceId && (
            <div className={styles.detailRow}>
              <Text className={styles.detailLabel}>Workspace ID</Text>
              <Text className={styles.detailValue}>{workspaceId}</Text>
            </div>
          )}

          {/* FIX #1: Error code badge — always shown when errorCode is provided.
              Admins can cross-reference this directly against withAuthorization()
              and rbacSetupError() in the backend without guessing. */}
          {errorCode && (
            <div className={styles.errorCodeRow}>
              <Text className={styles.errorCodeLabel}>Error Code</Text>
              <Badge appearance="outline" color="danger" size="medium">
                {errorCode}
              </Badge>
            </div>
          )}
        </div>

        {/* ── What this means ───────────────────────────────────────── */}
        {/*
          Only shown when permissionCategory is provided and there is a
          requiredPermission to contextualise. Suppressed for setup-level
          errors where categoryGuidance would be misleading.
        */}
        {permissionCategory && requiredPermission && (
          <Text size={200} className={styles.bodyText}>
            {categoryGuidance} If you believe you have received this message in
            error, please contact {adminContact} or Teva Data Integrity support.
          </Text>
        )}

        {/* ── Action buttons ────────────────────────────────────────── */}
        <div className={styles.actionsRow}>

          {/* Go Back — primary action, navigates away and clears the error */}
          <Button
            appearance="primary"
            icon={<ArrowLeftRegular />}
            onClick={onDismiss}
          >
            Go Back
          </Button>

          {/* Contact Admin — secondary action, opens a pre-filled mailto */}
          <Button
            appearance="secondary"
            icon={<PersonCallRegular />}
            onClick={() => {
              const subject = encodeURIComponent(
                `Access Request — ${resourceName}${requiredPermission ? ` (${requiredPermission})` : ""}${errorCode ? ` [${errorCode}]` : ""}`
              );
              const body = encodeURIComponent(
                `Hello,\n\nI am unable to access "${resourceName}" in the Teva Data Integrity Analytics Dashboard.\n\n` +
                `Required permission: ${requiredPermission ?? "N/A"}\n` +
                `Category: ${permissionCategory ?? "N/A"}\n` +
                (workspaceId ? `Workspace ID: ${workspaceId}\n` : "") +
                (errorCode ? `Error Code: ${errorCode}\n` : "") +
                `\nPlease grant me the "${entitlementLabel}" entitlement.\n\nThank you.`
              );
              window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
            }}
          >
            Contact Admin
          </Button>
        </div>

      </div>
    </div>
  );
}

export default ForbiddenAccessDialog;
