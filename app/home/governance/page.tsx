/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the Governance page of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides governance-related views in a tab-based layout.
    - Allows users to switch between login activity,
      configuration change history, and user privilege management.
    - Ensures auditability, traceability, and access control visibility.

    Why this is a client component:
    - Uses React state for tab selection.
    - Renders interactive UI components.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

// `@fluentui/react-components` is Microsoft's Fluent UI library.
// - What it does: provides accessible, themeable UI building blocks (tabs, buttons, inputs).
// - Why used here: we use `TabList` and `Tab` to create a consistent tabbed navigation UI.
import { TabList, Tab, Spinner } from "@fluentui/react-components";

// `react` is the core library for building components with state and lifecycle.
// - What it does: allows us to declare components and use hooks like `useState`.
// - Why used here: we use `useState` to remember which tab the user selected.
import { useEffect, useState } from "react";

// Local UI components specific to Governance features in this project.
// Each of these components renders a section of the governance page.
/*  @/components/ui/ConfigurationUpdateHistory
    - What it is: Component that displays configuration update history logs.
    - Why used: Renders the UI for viewing configuration changes made by users. 
*/
import { ConfigurationUpdateHistory } from "@/components/ui/ConfigurationUpdateHistory"; // shows configuration change logs

/*  @/components/ui/LoginActivity
    - What it is: Component that displays user login and audit activity.
    - Why used: Renders the UI for viewing user login events and audit trails. 
*/
import { LoginActivity } from "@/components/ui/LoginActivity"; // shows login/audit activities

/*  @/components/ui/UserPrivileges
    - What it is: Component that displays user roles and permissions.
    - Why used: Renders the UI for viewing and managing user access privileges. 
*/
import { UserPrivileges } from "@/components/ui/UserPrivileges"; // shows user roles and permissions
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// Constants and Types
// ---------------------------------------------------------------------

/**
 * GovernanceTabKey
 *
 * Union type representing all valid governance tab identifiers.
 * Ensures type safety when switching between tabs.
 * - What it does: restricts tab identifiers to three allowed string values.
 * - Why used: ensures we don't accidentally set the active tab to an invalid value.
 */
type GovernanceTabKey =
  | "LOGIN_ACTIVITY"
  | "CONFIGURATION_UPDATE_HISTORY"
  | "USER_PRIVILEGES";

/**
 * GovernanceTab
 *
 * Represents metadata for a single governance tab.
 * - `value` is the programmatic identifier (one of `GovernanceTabKey`).
 * - `label` is what the user sees on the tab (e.g., "Login Activity").
 */
interface GovernanceTab {
  /** Internal tab identifier used for state and logic */
  value: GovernanceTabKey;

  /** Human-readable label shown in the UI */
  label: string;

  canView: boolean;
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * Governance Component
 *
 * Renders the Governance page with tab-based navigation
 * for different governance and audit views.
 *
 * Why this component is needed:
 * - Centralizes governance-related information.
 * - Enables easy navigation between audit and access-control sections.
 * - Improves compliance and traceability visibility.
 *
 * Sample Input:
 * ```tsx
 * <Governance />
 * ```
 *
 * Sample Output:
 * - A tabbed interface with:
 *   - Login Activity
 *   - Configuration Update History
 *   - User Privileges
 * - Only the selected tab's content is rendered at a time.
 *
 * @returns JSX.Element
 * The rendered Governance page.
 */
export default function Governance() {
  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  const {hasPermission, isLoadingPermissions} = usePagePermissions("governance");

  const canViewLoginActivity = hasPermission("governance-login-activity:read");
  const canViewConfigurationPage = hasPermission("governance-configuration-update-history:read");
  const canViewUserPrivileges = hasPermission("governance-user-privileges:read");
 
  /**
   * `selectedGovernanceTab` holds the currently active tab's key.
   * - `setSelectedGovernanceTab` is the function to change it.
   * Real-world analogy: like a TV remote — `selectedGovernanceTab` is the current channel,
   * and `setSelectedGovernanceTab` changes the channel when you press a button.
   */
  const [selectedGovernanceTab, setSelectedGovernanceTab] =
    useState<GovernanceTabKey | "">("");


  useEffect(() => {
    setSelectedGovernanceTab(
      canViewLoginActivity 
      ? "LOGIN_ACTIVITY" 
      : canViewConfigurationPage
      ? "CONFIGURATION_UPDATE_HISTORY" 
      : canViewUserPrivileges 
      ? "USER_PRIVILEGES" 
      : "");
  },[
    canViewConfigurationPage, 
    canViewLoginActivity, 
    canViewUserPrivileges,
  ]);
  // -------------------------------------------------------------------
  // Tab Configuration
  // -------------------------------------------------------------------

  /**
   * governanceTabs
   *
   * Defines the list of available governance tabs.
   * Each object matches the `GovernanceTab` interface so rendering is driven by data.
   * Used to dynamically render the tab navigation UI.
   */
  const governanceTabs: GovernanceTab[] = [
    {
      value: "LOGIN_ACTIVITY",
      label: "Login Activity",
      canView: canViewLoginActivity
    },
    {
      value: "CONFIGURATION_UPDATE_HISTORY",
      label: "Configuration Update History",
      canView: canViewConfigurationPage
    },
    {
      value: "USER_PRIVILEGES",
      label: "User Privileges",
      canView: canViewUserPrivileges
    },
  ];

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

    // ── Permission loading guard ───────────────────────────────────────
    /*
      While /me is still fetching we don't know yet whether the user has access.
      Show a full-page spinner to avoid flashing the forbidden dialog prematurely.
    */
      if (isLoadingPermissions) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
                <Spinner size="medium" label="Loading..." />
            </div>
        );
    };

  return (
    // Root container for the Governance page
    <div>
      {/* ------------------------------------------------------------- */}
      {/* Tab Navigation Header                                         */}
      {/* ------------------------------------------------------------- */}
      <TabList
        selectedValue={selectedGovernanceTab} // Prop: which tab is currently selected (controlled component)
        onTabSelect={(_, data) =>
          setSelectedGovernanceTab(data.value as GovernanceTabKey)
        } // Handler: when a tab is clicked, update state
        appearance="subtle" // Styling prop: makes tabs visually subtle
        className="mb-4 border-b border-gray-200" // CSS classes: bottom margin and a light bottom border for separation
      >
        {/* Render each tab dynamically from configuration */}
        {governanceTabs.map((tab) => {
          return (tab.canView && (
          <Tab
            key={tab.value} // Unique React key to help React track list items
            value={tab.value} // Value (one of `GovernanceTabKey`) used to identify this tab when selected
          >
            {tab.label}
            {/* Visible label text for the tab, what the user reads and clicks */}
          </Tab>
        ))
        })}
      </TabList>

      {/* ------------------------------------------------------------- */}
      {/* Tab Content Rendering                                         */}
      {/* ------------------------------------------------------------- */}

      {/* Login Activity View: only render when the login tab is selected */}
      {selectedGovernanceTab === "LOGIN_ACTIVITY" && (
        <LoginActivity /> // Renders the login audit events table or cards
      )}

      {/* Configuration Update History View: only render when its tab is selected */}
      {selectedGovernanceTab === "CONFIGURATION_UPDATE_HISTORY" && (
        <ConfigurationUpdateHistory /> // Renders configuration change log and details
      )}

      {/* User Privileges View: only render when its tab is selected */}
      {selectedGovernanceTab === "USER_PRIVILEGES" && (
        <UserPrivileges /> // Renders user role assignments and permission controls
      )}
    </div>
  );
}
