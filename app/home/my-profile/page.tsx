/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 08 June 2026

  Purpose:
    Full-page user profile view for the Teva Data Integrity Dashboard.
    - Replaces the UserProfileDialog with a dedicated route (app/profile/page.tsx).
    - Fetches identity and RBAC data from GET /api/me via the useFetchMe() hook.
    - Displays principal identity, RBAC groups, roles, permissions, and scopes.
    - Handles loading, RBAC setup errors, and empty states gracefully.

  Route: /profile
*/

"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

import {
  makeStyles,
  tokens,
  Spinner,
  Badge,
  Text,
  Divider,
  Avatar,
  Tab,
  TabList,
} from "@fluentui/react-components";

import {
  PeopleTeamRegular,
  ShieldKeyholeRegular,
  KeyRegular,
  BuildingRegular,
  ShieldCheckmarkRegular,
  PersonRegular,
  GlobeRegular,
  LockClosedRegular,
} from "@fluentui/react-icons";

import { useState } from "react";
import { useFetchMe } from "@/hooks/useAuthService";

// ---------------------------------------------------------------------
// RBAC ERROR MESSAGES
// ---------------------------------------------------------------------

const RBAC_ERROR_MESSAGES: Record<string, string> = {
  RBAC_USER_NOT_FOUND:
    "Your account was authenticated but is not registered in the dashboard. Please contact your administrator.",
  RBAC_GROUP_NOT_ASSIGNED:
    "Your account is not assigned to any RBAC group. Contact your administrator to be added to a group.",
  RBAC_PERMISSION_NOT_ASSIGNED:
    "Your account has roles configured but no effective permissions were found. Contact your administrator.",
};

// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------

const useStyles = makeStyles({
  inner: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXL,
    backgroundColor: tokens.colorNeutralBackground3,
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
  },

  // ── Page header ──────────────────────────────────────────────────────
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },

  pageTitle: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
  },

  pageSubtitle: {
    color: tokens.colorNeutralForeground4,
    display: "block",
    marginTop: "2px",
  },

  // ── Identity card ────────────────────────────────────────────────────
  identityCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalXXL}`,
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXL,
    boxShadow: tokens.shadow8,
  },

  identityInfo: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    flex: 1,
    minWidth: 0,
  },

  identityName: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    lineHeight: "1.2",
  },

  identityEmail: {
    color: tokens.colorNeutralForeground4,
    display: "block",
  },

  identityMeta: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXS,
    flexWrap: "wrap",
  },

  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `2px ${tokens.spacingHorizontalS}`,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },

  // ── Stats row ────────────────────────────────────────────────────────
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: tokens.spacingHorizontalM,
  },

  statCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `4px solid ${tokens.colorNeutralForeground1}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    boxShadow: tokens.shadow8,
  },

  statLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground4,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },

  statValue: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    lineHeight: "1",
  },

  statSub: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
  },

  // ── Main content card ────────────────────────────────────────────────
  contentCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow8,
    overflow: "hidden",
  },

  tabBar: {
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },

  tabPanel: {
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    minHeight: "20vh",
    maxHeight: "50vh",
    overflowY: "auto"
  },

  // ── List rows ─────────────────────────────────────────────────────────
  listRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    ":last-child": {
      borderBottom: "none",
    },
  },

  rowIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: tokens.colorNeutralForeground2,
  },

  rowContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    wordBreak: "break-all",
  },

  rowSub: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
    fontFamily: "monospace",
  },

  rowBadges: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
    alignItems: "center",
    flexWrap: "wrap",
  },

  // ── Scopes section ────────────────────────────────────────────────────
  scopeSection: {
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },

  scopeSectionLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground2,
    display: "block",
    marginBottom: tokens.spacingVerticalM,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  scopeGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },

  scopePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `4px ${tokens.spacingHorizontalM}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },

  scopeType: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase100,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },

  // ── States ────────────────────────────────────────────────────────────
  loadingState: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "400px",
  },

  emptyState: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: `${tokens.spacingVerticalXXL} 0`,
    color: tokens.colorNeutralForeground1,
    fontStyle: "italic",
    fontSize: tokens.fontSizeBase200,
  },

  errorBox: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalL,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },

  errorCode: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteRedForeground1,
    fontFamily: "monospace",
    letterSpacing: "0.04em",
  },

  errorMessage: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorPaletteRedForeground1,
  },
});

// ---------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------

export default function ProfilePage() {
  const styles = useStyles();
  const { data: meData, isFetching } = useFetchMe();
  const [selectedTab, setSelectedTab] = useState<string>("groups");

  // ── Render: loading ──────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className={styles.loadingState}>
        <Spinner size="large" label="Loading your profile..." />
      </div>
    );
  }

  // ── Render: RBAC error ───────────────────────────────────────────────
  const rbacErrorCode = (meData as any)?.code;
  if (rbacErrorCode && RBAC_ERROR_MESSAGES[rbacErrorCode]) {
    return (
      <div className={styles.inner}>
        <div className={styles.errorBox}>
          <Text className={styles.errorCode}>{rbacErrorCode}</Text>
          <Text className={styles.errorMessage}>
            {RBAC_ERROR_MESSAGES[rbacErrorCode]}
          </Text>
        </div>
      </div>
    );
  }

  if (!meData) return null;

  const { principal, user } = meData as any;

  // ── Tab content renderers ────────────────────────────────────────────

  const renderGroups = () => {
    const groups = user?.groups ?? [];
    if (groups.length === 0)
      return <div className={styles.emptyState}>No group memberships found.</div>;

    return groups.map((g: any, i: number) => (
      <div key={g.groupId || i} className={styles.listRow}>
        <div className={styles.rowIconBox}>
          <PeopleTeamRegular fontSize={16} />
        </div>
        <div className={styles.rowContent}>
          <Text className={styles.rowTitle}>{g.groupName ?? `Group ${i + 1}`}</Text>
          <Text className={styles.rowSub}>{g.groupId}</Text>
        </div>
        {g.isActive !== undefined && (
          <div className={styles.rowBadges}>
            <Badge appearance="filled" color={g.isActive ? "success" : "danger"} size="small">
              {g.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        )}
      </div>
    ));
  };

  const renderRoles = () => {
    const roles = user?.roles ?? [];
    if (roles.length === 0)
      return <div className={styles.emptyState}>No roles assigned.</div>;

    return roles.map((r: any, i: number) => (
      <div key={r.roleId || i} className={styles.listRow}>
        <div className={styles.rowIconBox}>
          <ShieldKeyholeRegular fontSize={16} />
        </div>
        <div className={styles.rowContent}>
          <Text className={styles.rowTitle}>{r.roleName ?? `Role ${i + 1}`}</Text>
          <Text className={styles.rowSub}>{r.roleId}</Text>
        </div>
        <div className={styles.rowBadges}>
          {r.isSystem !== undefined && (
            <Badge appearance="outline" color={r.isSystem ? "warning" : "informative"} size="small">
              {r.isSystem ? "System" : "Custom"}
            </Badge>
          )}
        </div>
      </div>
    ));
  };

  const renderPermissions = () => {
    const permissions: string[] = user?.permissions ?? [];

    if (permissions.length === 0)
      return <div className={styles.emptyState}>No permissions found.</div>;

    return (
      <>
        {permissions.map((perm: string, i: number) => {
          const category = perm.includes(":") ? perm.split(":")[1] : perm.includes(".") ? perm.split(".")[0] : "all";
          const name = perm === "*" ? "Wildcard — All Permissions" : perm;
          return (
            <div key={perm || i} className={styles.listRow}>
              <div className={styles.rowIconBox}>
                <KeyRegular fontSize={16} />
              </div>
              <div className={styles.rowContent}>
                <Text className={styles.rowTitle}>{name}</Text>
              </div>
              <div className={styles.rowBadges}>
                <Badge appearance="outline" color={perm === "*" ? "warning" : "success"} size="small">
                  {perm === "*" ? "super" : category}
                </Badge>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <div className={styles.inner}>

      {/* ── Page heading ────────────────────────────────────────────── */}
      <div>
        <div className={styles.pageHeader}>
          <PersonRegular fontSize={20} style={{ color: tokens.colorNeutralForeground1 }} />
          <Text as="h1" size={500} className={styles.pageTitle}>
            My Profile
          </Text>
        </div>
        <Text size={200} className={styles.pageSubtitle}>
          Your identity, access groups, roles, and effective permissions in the Teva Data Integrity Dashboard.
        </Text>
      </div>

      {/* ── Identity card ────────────────────────────────────────────── */}
      <div className={styles.identityCard}>
        <Avatar
          name={user?.displayName || principal?.displayName}
          size={72}
          color="brand"
          aria-label={`Profile avatar for ${user?.displayName}`}
        />
        <div className={styles.identityInfo}>
          <Text as="h2" size={600} className={styles.identityName}>
            {user?.displayName || principal?.displayName}
          </Text>
          <Text size={300} className={styles.identityEmail}>
            {user?.email}
          </Text>
          <div className={styles.identityMeta}>
            <span className={styles.metaChip}>
              <LockClosedRegular style={{ fontSize: "11px" }} />
              {principal?.provider}
            </span>
            <span className={styles.metaChip}>
              {principal?.source}
            </span>
            {user?.isSuperAdmin && (
              <Badge
                appearance="filled"
                color="warning"
                size="medium"
                icon={<ShieldCheckmarkRegular />}
              >
                Super Admin
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Text className={styles.statLabel}>
            <PeopleTeamRegular fontSize={14} /> Groups
          </Text>
          <Text className={styles.statValue}>{user?.groups?.length ?? 0}</Text>
          <Text className={styles.statSub}>assigned memberships</Text>
        </div>
        <div className={styles.statCard}>
          <Text className={styles.statLabel}>
            <ShieldKeyholeRegular fontSize={14} /> Roles
          </Text>
          <Text className={styles.statValue}>{user?.roles?.length ?? 0}</Text>
          <Text className={styles.statSub}>active role assignments</Text>
        </div>
        <div className={styles.statCard}>
          <Text className={styles.statLabel}>
            <KeyRegular fontSize={14} /> Permissions
          </Text>
          <Text className={styles.statValue}>{user?.permissions?.length ?? 0}</Text>
          <Text className={styles.statSub}>effective entitlements</Text>
        </div>
      </div>

      {/* ── Tabbed content card ──────────────────────────────────────── */}
      <div className={styles.contentCard}>
        <div className={styles.tabBar}>
          <TabList
            selectedValue={selectedTab}
            onTabSelect={(_, d) => setSelectedTab(d.value as string)}
          >
            <Tab value="groups">
              Groups ({user?.groups?.length ?? 0})
            </Tab>
            <Tab value="roles">
              Roles ({user?.roles?.length ?? 0})
            </Tab>
            <Tab value="permissions">
              Permissions ({user?.permissions?.length ?? 0})
            </Tab>
          </TabList>
        </div>

        <div className={styles.tabPanel}>
          {selectedTab === "groups" && renderGroups()}
          {selectedTab === "roles" && renderRoles()}
          {selectedTab === "permissions" && renderPermissions()}
        </div>

        <div style={{gap:2, padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`}}>
        {(user?.scopes ?? []).length > 0 && (
        <div className={styles.scopeSection}>
          <Text className={styles.scopeSectionLabel}>
            Effective Scopes ({(user?.scopes ?? []).length})
          </Text>
          <div className={styles.scopeGrid}>
            {(user?.scopes ?? []).map((scope: any, i: number) => (
              <div key={`${scope.type}|${scope.value}`} className={styles.scopePill}>
                {scope.value === "*" ? (
                  <GlobeRegular style={{ fontSize: "12px", color: tokens.colorNeutralForeground2 }} />
                ) : (
                  <BuildingRegular style={{ fontSize: "12px", color: tokens.colorNeutralForeground2 }} />
                )}
                <Text className={styles.scopeType}>{scope.type}:</Text>
                <Text size={200} weight="bold">{scope.value}</Text>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      </div>

    </div>
  );
}