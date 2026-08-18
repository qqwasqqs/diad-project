/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 26 February 2026

  Purpose of the script:
    This script defines the LoginActivityDetailsModal component - a detailed drill-down view
    modal for investigating login activity and user access patterns in the Governance module
    of the Teva Data Integrity Automation Dashboard.

    This modal serves as a secondary investigation tool that opens when users click on summary
    numbers in the main LoginActivity table, providing granular details about authentication
    events, user access patterns, and workspace activity.

    Key Responsibilities:

    1. DETAILED LOGIN EVENT DISPLAY
       - Shows complete login event records with timestamps, services accessed, and actions performed.
       - Displays user, workspace, service name, and specific action (login, logout, etc.) for each event.
       - Enables security teams to investigate specific login incidents and build audit trails.
       - Real-world example: "When user 'john@company.com' clicked 'Total Logins', see all 45 login
         events with exact timestamps, which systems they accessed, and what actions they performed"

    2. USER-CENTRIC INVESTIGATION
       - When opened from "Total Logins" count in User row: shows all login events for that user.
       - When opened from "Workspaces Accessed" count in User row: shows which workspaces that user accessed.
       - Allows filtering detailed login records with search box (e.g., search for specific workspace name).
       - Respects date range context from parent table to show only relevant time period data.
       - Real-world example: "See all logins by John Smith in January 2026 - which locations, which services, 
         exact times"

    3. WORKSPACE-CENTRIC INVESTIGATION
       - When opened from "Unique Users" count in Workspace row: shows all users who accessed that workspace.
       - When opened from "Total Logins" count in Workspace row: shows all login events for that workspace.
       - Allows filtering to find specific users or events within the workspace access records.
       - Maintains date range context to show only data from selected time period.
       - Real-world example: "See all users who logged into New York office in Q1 - who they are, when they
         logged in, what they did"

    4. CONTEXT-AWARE COLUMN DISPLAY
       - Automatically adjusts displayed columns based on what type of details was clicked.
       - Scenario 1 (Login Events): Shows User, Workspace, Service, Action, Timestamp
       - Scenario 2 (Access List): Shows just User/Workspace names in simple list format
       - Column headers dynamically update to reflect context (e.g., "Workspace Name" vs "User Name").
       - Reduces UI clutter by showing only relevant columns for the investigation type.
       - Real-world example: "If you clicked 'see which workspaces', show workspace names. If you clicked 
         'see all logins', show full event details with timestamps"

    5. SEARCHABLE DRILL-DOWN RESULTS
       - Provides search box to filter detailed results by user name, workspace name, or service name.
       - Case-insensitive search for user convenience (searching "john" finds "JOHN", "John", "john").
       - Allows investigators to narrow down large result sets to specific rows of interest.
       - Real-world example: "Got 100 login events for a workspace? Search 'john' to see only John's logins"

    6. DATE RANGE CONTEXT INHERITANCE
       - Inherits date range from parent LoginActivity table to maintain investigation consistency.
       - Ensures detailed records only show data from the same time period user filtered in main table.
       - Prevents confusion between different time periods in summary vs detail view.
       - Real-world example: "User selected 'Last 7 days' in main table, modal also shows only last 7 days
         data, not data from other months"

    7. READY-TO-COPY DATA FORMAT
       - Table cells support copy-to-clipboard functionality for audit documentation.
       - Allows analysts to quickly export specific data points into reports or emails.
       - Improves efficiency in creating compliance documentation from investigation findings.
       - Real-world example: "Copy 'john@company.com' to paste into incident report"

    Use Cases:
    - SECURITY INCIDENT INVESTIGATION: "Suspicious login detected at 3 AM - click to see all login events
      for that user in detail"
    - COMPLIANCE AUDIT: "Verify who accessed what systems when - drill down to see complete event records"
    - USER ACCESS REVIEW: "Did employee X access the right systems? Click their name to audit all their
      logins and services"
    - ANOMALY INVESTIGATION: "User logged into New York AND Chicago simultaneously? Click workspace to see
      both events with exact timestamps"
    - ACCESS APPROVAL: "Manager needs to approve a user's access request - review all their login history
      first"
    - ONBOARDING/OFFBOARDING: "New hire's first week - verify they have access to right systems. Old employee
      leaving - audit all their last month's access to prevent data theft"
*/

//---------------------- Imports -------------------------//

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for async parameter resolution, managing component state and side effects.
*/
import React, { useMemo, useState } from "react"; // Core React library

// API hooks specific to governance features
// - What they do: encapsulate HTTPS calls and caching for fetching login emails and login activity.
// - Why used here: they provide the data shown in the dropdown and the table.
import { useGetLoginActivities } from "@/hooks/useGovernanceService";

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  // Import statement: bringing in components from the Fluent UI library
  Dialog, // Component: Main dialog/modal wrapper that creates the popup window
  DialogSurface, // Component: The outer container/frame of the dialog with styling and positioning
  DialogBody, // Component: Container for dialog content (title, body, actions)
  DialogTitle, // Component: Header section of dialog that displays the title and close button
  DialogContent, // Component: Main content area of dialog where data and interactive elements are placed
  Button, // Component: Reusable button component for user interactions (clickable elements)
  tokens, // Export: Fluent UI design tokens for consistent colors, spacing, typography, and sizing
  makeStyles, // Hook: Function to create component-specific styles using Fluent UI styling approach
  SearchBox, // Component: Input field with search capabilities for filtering table data
} from "@fluentui/react-components"; // Source: Microsoft's Fluent UI component library for React applications

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Dismiss24Filled } from "@fluentui/react-icons"; // Fluent UI icon for close action

/* @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Reusable DataGrid component and column configuration type

// Shared helper for formatting timestamps into friendly strings
// - What it does: converts raw timestamps into human readable date/time text.
// - Why used here: to show "Login At" times in a readable way for auditors.
import { formatDateTime } from "@/lib/helper";

//---------------------- Styles -------------------------//

/**
 * useStyles
 *
 * Centralized styling for DatasetDetailsModal using Fluent UI tokens.
 * Ensures consistent spacing, typography, and responsive sizing.
 */
const useStyles = makeStyles({
  // Controls the maximum width of the modal dialog
  surface: {
    maxWidth: "80vw", // Max width: 80% of the viewport width for large screens
  },

  // Styles applied to the modal title text
  title: {
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font weight for emphasis
  },

  // Restricts content height to enable scrolling for large datasets
  content: {
    maxHeight: "80vh", // Max height: 80% of the viewport height to prevent overflow and enable scrolling
  },
});

//---------------------- Types -------------------------//

/**
 * LoginActivityDetailsModalProps
 *
 * TypeScript interface defining all the properties (props) required to use the LoginActivityDetailsModal component.
 * Real-world analogy: Like a recipe that lists all required ingredients - you must provide each one.
 */
interface LoginActivityDetailsModalProps {
  // Whether the modal dialog is currently open and visible to user
  // true = show the dialog popup, false = hide the dialog
  // Real-world: Like a lightbulb switch - on or off
  open: boolean;

  // Function to call when the modal should open or close
  // The parent component uses this to update its own state
  // Real-world: When user clicks close button, this function tells the parent "I'm closing"
  onOpenChange: (open: boolean) => void;

  // The main title to display in the modal header
  // Example: "Total Logins", "Workspaces Accessed", "john@company.com"
  title: string;

  // What type of details to show (determines which columns to display and what data to fetch)
  // Options: "userLoginDetails", "workspaceLoginDetails", "userWorkspaceDetails", "workspaceUserDetails"
  // Real-world: Like telling a report generator, "Show me sales details" vs. "Show me customer details"
  detailsType: string;

  // The specific user or workspace to show details for
  // Example: "john@company.com", "Workspace A", "Marketing_Team"
  // Real-world: Like specifying "Show me details for customer John"
  detailsValue?: string;

  // Start date for filtering records (show logins from this date onwards)
  // Example: January 1, 2026
  // Real-world: Like saying "only show records from January 1st"
  startDate?: Date;

  // End date for filtering records (show logins up to this date)
  // Example: January 31, 2026
  // Real-world: Like saying "only show records up to end of January"
  endDate?: Date;
}

//---------------------- Component -------------------------//

//---------------------- Component -------------------------//

/**
 * LoginActivityDetailsModal Component
 *
 * A popup modal that displays detailed login activity and access information.
 * Opens when user clicks on a login statistic (like clicking "Total Logins" or "Workspaces Accessed").
 *
 * Why this component is needed:
 * - Enables investigation of specific login events and user/workspace access patterns
 * - Provides detailed view drilled down from summary statistics shown in the main table
 * - Allows searching through and filtering detailed records for security audits and analysis
 *
 * Real-world analogy:
 * - Think of the main LoginActivity page as a monthly sales summary
 * - Clicking on a number opens this modal to show the individual transactions that make up that sum
 *
 * Sample Input (props):
 *  {
 *    open: true,                          // Modal is visible
 *    title: "Total Logins",               // Title shown at the top
 *    detailsType: "userLoginDetails",     // Type of details to show
 *    detailsValue: "john@company.com",    // User/workspace to get details for
 *    startDate: Date("2026-01-01"),       // Filter from this date
 *    endDate: Date("2026-01-31")          // Filter until this date
 *  }
 *
 * Sample Output:
 *  - Modal popup titled "Total Logins (john@company.com)"
 *  - Table showing columns: Workspace Name, Service Name, Action, Login At
 *  - Search box to filter records
 *  - Close button (X) to dismiss the modal
 *
 * @param props - LoginActivityDetailsModalProps
 * @returns JSX.Element - The rendered modal popup
 */
export const LoginActivityDetailsModal: React.FC<
  LoginActivityDetailsModalProps
> = ({
  open, // Whether the modal dialog is currently visible (true = open, false = closed)
  onOpenChange, // Function called when user tries to close the modal - tells parent to update its state
  title, // Main title displayed at top of modal (e.g., "Total Logins", "Workspaces Accessed")
  detailsType, // What type of details to fetch and display (determines table columns and data fetched)
  detailsValue, // Which specific user or workspace to show details for (e.g., "john@company.com")
  startDate, // Start of date range for filtering (e.g., January 1, 2026)
  endDate, // End of date range for filtering (e.g., January 31, 2026)
}) => {
  //---------------------- Hooks -------------------------//

  // Load component-specific styles
  // Real-world: Like picking a CSS theme that controls how the dialog looks (width, colors, etc.)
  const styles = useStyles();

  /**
   * Fetch detailed login activity records from the backend API.
   * Real-world analogy: Imagine you click on "John's Login Details" in a spreadsheet.
   * The system then calls the database to fetch all login events for John and returns them here.
   *
   * - `data`: Array of login activity records matching the detailsType, detailsValue, and date range
   * - `isFetching`: TRUE while loading from server, FALSE when data is ready
   *
   * Parameters:
   * - detailsType: What kind of details to fetch ("userLoginDetails", "workspaceLoginDetails", "userWorkspaceDetails")
   * - startDate & endDate: Filter records to only this date range (e.g., January 1-31, 2026)
   * - detailsValue: Which user or workspace to get details for (e.g., show logins for "john@company.com")
   */
  const { data, isFetching: isLoading } = useGetLoginActivities(
    detailsType, // Type of details to show (determines what data to fetch)
    startDate, // Start date filter (e.g., January 1, 2026)
    endDate, // End date filter (e.g., January 31, 2026)
    detailsValue, // The specific user/workspace name to get details for
  );

  // State for the search text box - remembers what user typed to filter the table
  // Real-world: Like typing in Ctrl+F search box to find specific records in the list
  const [search, setSearch] = useState("");

  //---------------------- Table Configuration -------------------------//

  /**
   * Column definitions for the login activity details table.
   * Dynamically changes based on what type of details the user clicked to view.
   *
   * Real-world analogy: Like a spreadsheet that has different columns depending on what
   * report you're viewing. A sales report shows different columns than a customer report.
   *
   * There are two scenarios:
   * 1. If user clicked on login events ("userLoginDetails" or "workspaceLoginDetails")
   *    - Shows: User/Workspace name, Service accessed, Action performed, When login happened
   *
   * 2. If user clicked on workspace/user details ("userWorkspaceDetails")
   *    - Shows: Just the name of the workspace or user accessed
   */
  const loginActivityColumns: ColumnConfig<any>[] =
    detailsType === "workspaceLoginDetails" ||
    detailsType === "userLoginDetails"
      ? [
          // First scenario: Detailed login event records
          {
            key: "name", // Database field name to pull data from
            // Header changes based on context:
            // - If showing details FOR a user: show list of "Workspaces" they accessed
            // - If showing details FOR a workspace: show list of "Users" who logged in
            label:
              detailsType === "userLoginDetails"
                ? "Workspace Name"
                : "User Name",
            width: "auto", // Let column size automatically based on content
            sortable: true, // Enables sorting functionality for the column
          },
          {
            key: "service_name", // Database field: name of the service/app accessed
            label: "Service Name", // Header: "Service Name" (e.g., "Azure Data Platform", "PowerBI")
            width: "auto", // Automatically size
          },
          {
            key: "action_name", // Database field: what action was performed
            label: "Action", // Header: "Action" (e.g., "READ", "WRITE", "DELETE")
            width: "auto", // Automatically size
          },
          {
            key: "event_time", // Database field: timestamp of when the event happened
            label: "Login At", // Header: "Login At" - when the login/action occurred
            width: "auto", // Automatically size
            sortable: true, // Enables sorting functionality for the column
            // getValue: Custom formatter - convert raw timestamp to human-readable format
            // Real-world: Convert "1704067200" (computer timestamp) to "January 1, 2026, 3:00 PM" (human-readable)
            getValue: (value, row, index) =>
              value ? formatDateTime(value) : "-", // Show formatted time if exists, otherwise show dash
          },
        ]
      : [
          // Second scenario: Simple workspace or user list (no detailed login events)
          {
            key: "name", // Database field name
            // Header changes based on context:
            // - If "userWorkspaceDetails": show list of "Workspace Names"
            // - If another type: show list of "User Names"
            label:
              detailsType === "userWorkspaceDetails"
                ? "Workspace Name"
                : "User Name",
            width: "auto", // Automatically size
            sortable: true, // Enables sorting functionality for the column
          },
        ];

  /**
   * Filter login activity data based on search text entered by user.
   * useMemo: Optimization - only recalculate when data or search text changes.
   *
   * Real-world: Like typing "john" in a search box and seeing only records with "john" in the name.
   * Before: [{name: "John Smith"}, {name: "Jane Doe"}, {name: "Bob Johnson"}]
   * Type: "john"
   * After: [{name: "John Smith"}, {name: "Bob Johnson"}] (both contain "john")
   */
  const filteredLoginActivities = useMemo(() => {
    // Convert search text to lowercase for case-insensitive search
    // E.g., "John" and "john" and "JOHN" will all match "john"
    const searchText = search.toLowerCase();

    // Filter the login data array: keep only records whose name contains the search text
    return data?.filter(
      (login: any) => login?.name?.toLowerCase().includes(searchText), // Check if the name field contains our search text
    );
  }, [data, search]); // Dependencies: recalculate if either data or search changes

  const handleClose = () => {
    setSearch("");
    onOpenChange(false);
  }

  //---------------------- Render -------------------------//

  return (
    // Root Dialog component: popup window for detailed login activity information
    // Real-world: Like when you click "View Details" on a transaction and a popup appears
    <Dialog
      open={open} // Is the dialog visible? true = show, false = hide
      onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)} // When user closes dialog, call parent function to hide it
    >
      {/* Dialog Surface: the outer container/frame of the popup */}
      <DialogSurface className={styles.surface}>
        {/* Dialog Body: contains title, close button, and content */}
        <DialogBody>
          {/* ============ Modal Title Section ============ */}
          <DialogTitle
            className={styles.title} // Apply styling: font size, weight, color
            action={
              // Close button in top-right corner of dialog
              // Real-world: Like the "X" button on a window
              <Button
                appearance="subtle" // Style: subtle appearance (not a prominent button)
                icon={<Dismiss24Filled />} // Icon: X symbol to indicate "close"
                aria-label="Close" // Accessibility label for screen readers (identifies button for visually impaired)
                onClick={handleClose} // When clicked, close the dialog
              />
            }
          >
            {/* Title line 1: The context of what's being shown */}
            {/* Example: "Total Logins", "Workspaces Accessed", "john@company.com" */}
            {title}

            {/* Title line 2: The detail value (smaller text, gray color) */}
            {/* Real-world: Shows "(john@company.com)" under the title for context */}
            <span className="text-sm text-neutral-foreground-2">
              ({detailsValue})
            </span>
          </DialogTitle>

          {/* ============ Modal Content Section ============ */}
          <DialogContent className={styles.content}>
            {" "}
            {/* Enable scrolling if content is very tall */}
            {/* Search bar section (aligned to the right) */}
            <div className="flex">
              {" "}
              {/* flex: Push search box to right side */}
              {/* Search input field */}
              <SearchBox
                className="w-[20rem]" // Width: 320px for consistent layout
                // Placeholder text: changes based on what type of data is shown
                // Real-world: Shows "Filter by workspace name" when viewing a user's workspaces
                // Shows "Filter by user name" when viewing a workspace's users
                placeholder={`Filter by ${
                  detailsType === "userLoginDetails" ||
                  detailsType === "userWorkspaceDetails"
                    ? "workspace name" // If filtering workspaces, show "Filter by workspace name"
                    : "user name" // Otherwise show "Filter by user name"
                }`}
                value={search} // Current text typed in the search box (from state)
                onChange={(_, data) => {
                  // When user types in search box, update the search state
                  // This triggers the table to filter and show only matching records
                  // Real-world: As you type "john", the table updates to show only records with "john"
                  setSearch(data.value);
                }}
              />
            </div>
            {/* Data Table: displays the detailed login activity records */}
            {/* Real-world: Think of it as a spreadsheet showing login events */}
            <DataGrid
              columns={loginActivityColumns} // Column definitions: tells table what columns to display (User/Workspace, Service, Action, Time)
              data={filteredLoginActivities || []} // Table rows: filtered login data; empty list if no data
              loading={isLoading} // Loading flag: show spinner while fetching from server
            />
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
