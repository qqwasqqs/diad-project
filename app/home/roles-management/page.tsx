/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose of the script:
  This script represents the Roles Management Dashboard page.
  - Displays all dashboard users, groups, roles, and permissions registered in the RBAC system.
  - Provides a tab-based layout to switch between Groups, Users, Roles, and Permissions views.
  - Allows admins to add and update users, groups, roles, and permissions via dialogs.
  - Groups tab provides additional "Manage" and "Permissions" action buttons per row for deeper navigation.
  - Roles and Permissions tabs support CRUD operations for custom (non-system) entries only.
  - Supports search filtering within each tab independently.

  Business Value:
  - Centralizes all RBAC management operations in a single, tab-driven interface.
  - Enables admins to onboard and manage users, groups, roles, and permissions without code changes.
  - Reduces unauthorized access risks by maintaining up-to-date RBAC records.
  - Provides a single pane of glass for all access control operations.
*/


//---------------------- Client Component Directive ----------------------//

// Mark this file as a client component because it uses React hooks, local state, and interactive tab UI behavior.
"use client";


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------


// Import Fluent UI components and styling helpers used to build the page header, tabs, and loading state.
import {
  Title3, // Fluent UI heading component used for the page title.
  makeStyles, // Fluent UI hook used to create component-scoped styles.
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography.
  TabList, // Container component that renders the tab navigation bar.
  Tab, // Individual tab item used inside the TabList.
  Spinner, // Loading spinner shown while permissions are being resolved.
} from "@fluentui/react-components";


// Import React hooks used for side effects and local component state.
import { useEffect, useState } from "react";


// Tab components — one file per tab for maintainability
import { DashboardGroupsTab } from "@/components/ui/DashboardGroupsTab"; // Tab component responsible for Groups management UI.
import { DashboardUsersTab } from "@/components/ui/DashboardUsersTab"; // Tab component responsible for Users management UI.
import { DashboardRolesTab } from "@/components/ui/DashboardRolesTab"; // Tab component responsible for Roles management UI.
import { DashboardPermissionsTab } from "@/components/ui/DashboardPermissionsTab"; // Tab component responsible for Permissions management UI.


// Shared types
import { RolesManagementTabKey, RolesManagementTab } from "@/types/api"; // Shared tab-related TypeScript types used by this page.
import DashboardSuperAdminTab from "@/components/ui/DashboardSuperAdminTab"; // Tab component responsible for Super Admins management UI.
import { usePagePermissions } from "@/hooks/hasPagePermissions"; // Custom permission hook used to determine which tabs the user is allowed to view.


// ---------------------------------------------------------------------
// STYLING CONFIGURATION
// ---------------------------------------------------------------------


// Create page-level styles for the Roles Management dashboard.
const useStyles = makeStyles({
  root: {}, // Root wrapper style object, currently empty but reserved for future page-level styling.
  header: {
    display: "flex", // Use flexbox for the page header layout.
    flexDirection: "column", // Stack header items vertically.
    gap: tokens.spacingHorizontalS, // Add spacing between items inside the header.
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Render the page title in bold weight.
    color: tokens.colorNeutralForeground1, // Use the primary neutral foreground color for the title.
    marginBottom: tokens.spacingVerticalS, // Add space below the page title.
  },
});


// ---------------------------------------------------------------------
// COMPONENT DEFINITION
// ---------------------------------------------------------------------


/**
 * RolesManagement
 *
 * Main page component that renders:
 * - A page title header
 * - A tab bar to switch between Groups, Users, Roles, and Permissions
 * - The corresponding tab component for the currently active tab
 *
 * All tab-specific state, handlers, columns, and dialogs live inside
 * each individual tab component file for clean separation of concerns.
 *
 * @returns JSX.Element
 */
export default function RolesManagement() {
  const styles = useStyles(); // Resolve generated class names from the style hook.


  const { hasPermission, isLoadingPermissions } = usePagePermissions("roles-management"); // Fetch permission helper and loading state for the Roles Management page.


  const canViewGroupsTab = hasPermission("roles-management-groups:read"); // Determine whether the current user can view the Groups tab.
  const canViewUsersTab = hasPermission("roles-management-users:read"); // Determine whether the current user can view the Users tab.
  const canViewRolesTab = hasPermission("roles-management-roles:read"); // Determine whether the current user can view the Roles tab.
  const canViewPermissionsTab = hasPermission("roles-management-permissions:read"); // Determine whether the current user can view the Permissions tab.
  const canViewSuperAdminsTab = hasPermission("roles-management-admins:read"); // Determine whether the current user can view the Super Admins tab.


  // Track the currently active tab; default to Groups as the landing view
  const [selectedTab, setSelectedTab] = useState<RolesManagementTabKey | "">(""); // Store the currently selected tab key, or an empty string until permissions resolve.


  useEffect(() => {
      setSelectedTab(
        canViewGroupsTab
        ? "GROUPS"
        : canViewUsersTab
        ? "USERS"
        : canViewRolesTab
        ? "ROLES"
        : canViewPermissionsTab
        ? "PERMISSIONS"
        : canViewSuperAdminsTab
        ? "ADMINS"
        : ""
      ); // Automatically select the first tab the user is allowed to see, in priority order.
  }, [
    canViewGroupsTab, // Re-run selection logic when Groups tab visibility changes.
    canViewPermissionsTab, // Re-run selection logic when Permissions tab visibility changes.
    canViewRolesTab, // Re-run selection logic when Roles tab visibility changes.
    canViewSuperAdminsTab, // Re-run selection logic when Super Admins tab visibility changes.
    canViewUsersTab, // Re-run selection logic when Users tab visibility changes.
  ]);


  /**
  * rolesManagementTabs
  *
  * Defines the ordered list of tabs shown on the Roles Management page.
  * Driven by data so adding a new tab only requires a new entry here.
  */
  const rolesManagementTabs: RolesManagementTab[] = [
    { value: "GROUPS", label: "Groups", canView: canViewGroupsTab }, // Configuration entry for the Groups tab.
    { value: "USERS", label: "Users", canView: canViewUsersTab }, // Configuration entry for the Users tab.
    { value: "ROLES", label: "Roles", canView: canViewRolesTab }, // Configuration entry for the Roles tab.
    { value: "PERMISSIONS", label: "Permissions", canView: canViewPermissionsTab }, // Configuration entry for the Permissions tab.
    { value: "ADMINS", label: "Admins", canView: canViewSuperAdminsTab }, // Configuration entry for the Super Admins tab.
  ];


  // ── Permission loading guard ───────────────────────────────────────
    /*
      While /me is still fetching we don't know yet whether the user has access.
      Show a full-page spinner to avoid flashing the forbidden dialog prematurely.
    */
    if (isLoadingPermissions) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center"> {/* Centered container for the permission-loading spinner. */}
                <Spinner size="medium" label="Loading..." /> {/* Show loading state while page-level permissions are being fetched. */}
            </div>
        );
    };


  return (
    <div className={styles.root}> {/* Root wrapper for the Roles Management page. */}


      {/* Page header */}
      <div className={styles.header}> {/* Header section containing the page title. */}
        <Title3 className={styles.title}>Roles Management</Title3> {/* Main heading for the page. */}
      </div>


      {/* ── TAB NAVIGATION ─────────────────────────────────────────────── */}
      <TabList
        selectedValue={selectedTab} // Bind the currently selected tab to component state.
        onTabSelect={(_, tabSelectionData) => setSelectedTab(tabSelectionData.value as RolesManagementTabKey)} // Update selected tab when the user clicks a different tab.
        appearance="subtle" // Use subtle Fluent UI tab styling.
        className="mb-4 border-b border-gray-200" // Add bottom margin and bottom border under the tab bar.
      >
        {rolesManagementTabs.map((tabConfig) => { // Iterate through tab definitions to render only permitted tabs.
          return (tabConfig.canView && (
          <Tab key={tabConfig.value} value={tabConfig.value}> {/* Render a tab only if the current user can view it. */}
            {tabConfig.label} {/* Display the human-readable tab label. */}
          </Tab>
          ))
          })}
      </TabList>


      {/* ── TAB CONTENT ────────────────────────────────────────────────── */}
      {canViewGroupsTab && selectedTab === "GROUPS" && <DashboardGroupsTab />} {/* Render Groups tab content only when the tab is visible and currently selected. */}
      {canViewUsersTab && selectedTab === "USERS" && <DashboardUsersTab />} {/* Render Users tab content only when the tab is visible and currently selected. */}
      {canViewRolesTab && selectedTab === "ROLES" && <DashboardRolesTab />} {/* Render Roles tab content only when the tab is visible and currently selected. */}
      {canViewPermissionsTab && selectedTab === "PERMISSIONS" && <DashboardPermissionsTab />} {/* Render Permissions tab content only when the tab is visible and currently selected. */}
      {canViewSuperAdminsTab && selectedTab === "ADMINS" && <DashboardSuperAdminTab />} {/* Render Super Admins tab content only when the tab is visible and currently selected. */}


    </div>
  );
}