/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the LoginActivity component - a comprehensive audit and monitoring view
    under the Governance module of the Teva Data Integrity Automation Dashboard.
    
    This component serves as a centralized dashboard for security and compliance teams to track,
    analyze, and investigate user authentication activity across the entire organization.

    Key Responsibilities:
    
    1. SUMMARY STATISTICS DISPLAY
       - Shows total count of unique users who logged in during a selected time period.
       - Shows total count of unique workspaces (locations/departments) with login activity.
       - Provides at-a-glance overview of authentication activity scope for quick assessment.
       - Real-world example: "1,200 employees logged in across 15 locations last month"
    
    2. USER-WISE LOGIN ANALYSIS
       - Displays login activity grouped by individual users with workspaces they accessed.
       - Shows total login count per user to identify power users or suspicious activity patterns.
       - Allows filtering by user name/email to investigate specific individuals.
       - Makes counts clickable to drill down and see detailed login records for each user.
       - Real-world example: "John Smith logged in 45 times and accessed 3 different locations"
    
    3. WORKSPACE-WISE LOGIN ANALYSIS
       - Displays login activity grouped by workspace/location to track access patterns by department.
       - Shows unique user count per workspace to identify visitor patterns and access frequency.
       - Shows total login count per workspace to assess location traffic and activity levels.
       - Allows filtering by workspace name for targeted investigation of specific locations.
       - Makes counts clickable to view detailed login records for each workspace.
       - Real-world example: "New York office had 850 logins from 45 different employees this week"
    
    4. INACTIVE USER IDENTIFICATION
       - Identifies and displays users who have NOT logged in for the last 3 months.
       - Shows last login timestamp for each inactive user to track dormancy duration.
       - Allows filtering by user email to find specific inactive accounts.
       - Helps security teams identify stale accounts that may need deactivation or review.
       - Real-world example: "5 user accounts haven't been used in 3+ months and should be disabled"
    
    5. FLEXIBLE TIME PERIOD FILTERING
       - Provides customizable date range selector for all analysis views.
       - Allows users to investigate activity for specific time periods (last 7 days, last month, custom range).
       - Supports independent date range selection for each analysis view.
       - Enables historical investigation and trend analysis over different time windows.
       - Real-world example: "Compare Q1 and Q2 login patterns separately"
    
    6. DRILL-DOWN INVESTIGATION
       - Makes summary numbers clickable to open detailed modal with complete records.
       - Supports multiple drill-down paths: user details, workspace details, and login event details.
       - Passes date range context to modal to ensure consistency in filtered data.
       - Enables investigators to quickly move from summary to granular detail level.
       - Real-world example: "Click '45 Total Logins' for John Smith to see every login timestamp, location, and duration"
    
    Use Cases:
    - SECURITY AUDITS: Track who logged in when to verify access authorization and detect unauthorized attempts.
    - COMPLIANCE INVESTIGATIONS: Generate audit trails proving that access reviews were conducted during compliance periods.
    - ANOMALY DETECTION: Identify unusual login patterns (spike in logins, access from unusual locations, after-hours activity).
    - USER ACTIVITY ANALYSIS: Monitor user behavior, identify inactive accounts, and flag suspicious login frequency.
    - INCIDENT RESPONSE: Quickly investigate a security incident by examining login activity before/after event time.
    - ACCESS MANAGEMENT: Maintain accurate access records and identify orphaned accounts requiring deactivation.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------
// `@fluentui/react-components` (Fluent UI)
// - What it does: provides accessible, themeable UI components and styling helpers from Microsoft.
// - Why used here: supplies `makeStyles` for local styles and UI controls like `Title3`, `Field`, `Dropdown`, and `Option` used in the filters and header.
"use client";
import {
  makeStyles, // Function to create scoped CSS classes for styling React components with Fluent UI design tokens
  tokens, // Design system constants (colors, spacing, shadows, border radius) ensuring consistent UI styling
  Spinner, // Loading indicator component - animated spinning icon to show data is being fetched
  Text, // Typography component for rendering text with predefined styles (size, weight, color)
  Card, // Container component for grouping related content with elevation and background styling
  Badge, // Small visual indicator component that displays counts or status (e.g., "5 items")
  SearchBox, // Input component for user text search/filtering with placeholder text and onChange callback
} from "@fluentui/react-components"; // Microsoft Fluent UI React library providing accessible, themeable UI components

import {
  People20Filled, // Icon for displaying additional information
  Apps20Filled,
} from "@fluentui/react-icons"; // Icons used for visual indicators

// Local reusable data grid component
// - What it does: `DataGrid` renders tabular data with pagination, loading states and configurable columns.
// - Why used here: to display login audit records in a consistent, reusable table.
import { ColumnConfig, DataGrid } from "./DataGrid";

// Custom date range selector component and its TypeScript type
// - What it does: `CustomDateRange` is a small UI that lets users pick predefined ranges or a custom start/end.
// - Why used here: we need a date filter for login activity investigations.
import { CustomDateRange, DateRangeOption } from "./CustomDateRange";

// React core hook
// - What it does: `useState` stores component-local state and triggers re-renders when updated.
// - Why used here: to remember selected email and date range controlled by the user.
import { useMemo, useState } from "react";

// API hooks specific to governance features
// - What they do: encapsulate HTTPS calls and caching for fetching login emails and login activity.
// - Why used here: they provide the data shown in the dropdown and the table.
import { useGetLoginActivities } from "@/hooks/useGovernanceService";

// Shared helper for formatting timestamps into friendly strings
// - What it does: converts raw timestamps into human readable date/time text.
// - Why used here: to show "Login At" times in a readable way for auditors.
import { formatDateTime } from "@/lib/helper";

// LoginActivityDetailsModal - Secondary drill-down investigation modal component
// - What it does: Opens as a popup when user clicks on summary numbers in tables,
//   displaying granular details about login events and access patterns for investigation.
// - Why used here: Enables users to drill down from "Total Logins: 45" summary to see
//   all 45 individual login events with exact timestamps, services accessed, and actions.
// - Real-world analogy: Like clicking "View Details" on an Amazon order to see each item,
//   quantity, price, and shipping status instead of just the order total.
// - Component responsibilities:
//   1. Displays detailed login event records or access lists based on what was clicked
//   2. Provides search filtering within the detailed results
//   3. Shows data filtered by date range inherited from parent table
//   4. Allows copying cell values for audit documentation
// - Usage: Rendered conditionally at bottom of component when selectedLoginActivityDetails
//   is set by clicking on table numbers or metrics
import { LoginActivityDetailsModal } from "./LoginActivityDetailsModal";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useLoginActivityStyles
 *
 * Defines component-scoped styles using Fluent UI makeStyles.
 * Ensures consistent spacing, layout, and typography.
 */
const useLoginActivityStyles = makeStyles({
  // Creates and returns CSS class names used below to style the component
  titleContainer: {
    marginTop: tokens.spacingVerticalL, // Space below the header section
    marginBottom: tokens.spacingVerticalL, // Space below the header section
    alignItems: "left", // Vertically align header content
    display: "flex", // Arrange header items horizontally
    flexDirection: "column",
    gap: tokens.spacingHorizontalS, // Gap between child elements
  },
  filterContainer: {
    display: "flex", // Horizontal filter layout
    flexWrap: "wrap", // Wrap filters on smaller screens
    alignItems: "end",
    gap: tokens.spacingHorizontalM, // Spacing between filters
  },
  cardContainer: {
    display: "grid", // Use CSS grid to arrange cards horizontally
    gridTemplateColumns: "repeat(2, 1fr)", // Three equal-width columns by default
    gap: tokens.spacingHorizontalL, // Space between grid items
    marginTop: tokens.spacingVerticalXL, // Space above the group of cards
    width: "100%", // Make the grid full-width of its container
    height: "100%", // Give the grid most of the parent's height
  },
  // Base card styling shared across all variants
  card: {
    padding: tokens.spacingVerticalL, // Inner padding for content
    borderRadius: tokens.borderRadiusLarge, // Rounded corners
    backgroundColor: tokens.colorNeutralBackground3, // Subtle background color
    boxShadow: tokens.shadow4, // Slight elevation effect
    display: "flex", // Use flexbox to center content within the card
    flexDirection: "column", // Stack elements vertically (badge on top, title below)
    alignItems: "center", // Center horizontally
    justifyContent: "center", // Center vertically
    textAlign: "center", // Center text inside
    width: "100%", // Fill available column width
    height: "100%", // Fill available row height
    minHeight: "100px", // Standard minimum height
    borderLeft: `4px solid ${tokens.colorNeutralForeground2}`, // Neutral/brand accent
    color: tokens.colorNeutralForeground2, // Use brand color for text/icon accent
  },
  badgeBrand: {
    backgroundColor: tokens.colorNeutralForeground2, // Badge color for neutral/brand
  },
});

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * LoginActivity Component
 *
 * Displays a searchable and filterable audit log
 * of user login activity.
 *
 * Why this component is needed:
 * - Provides security and compliance teams with visibility into who is accessing the system, when, and from where.
 * - Enables investigation of suspicious login patterns and identification of inactive accounts.
 * - Serves as a critical tool for maintaining data integrity and enforcing access controls.
 *
 * Sample Input:
 * ```tsx
 * <LoginActivity />
 * ```
 *
 * Sample Output:
 * - A dashboard view showing:
 *  - Summary cards with total unique users and workspaces.
 *  - A user-wise login activity table with search and date filters.
 *  - A workspace-wise login activity table with search and date filters.
 *  - An inactive users table showing accounts that haven't logged in for 3+ months.
 *  - Clickable counts that open a modal with detailed login records for further investigation.
 *
 * @returns JSX.Element
 * Rendered Login Activity dashboard view.
 */
export const LoginActivity = () => {
  // -------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------

  // Create a `styles` object by calling our `useLoginActivityStyles` hook.
  // Real-world analogy: this picks the CSS rules the page will use (like choosing a theme).
  const styles = useLoginActivityStyles();

  const {canRead, isLoadingPermissions} = usePagePermissions("governance-login-activity");

  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  /**
   * selectedDateRange
   *
   * Stores the currently selected date range
   * used to filter login activity records.
   */
  const [summaryDateRange, setSummaryDateRange] = useState<DateRangeOption>({
    label: "", // Human-friendly label for the selected range (e.g., "Last 7 days")
    value: "", // Internal value identifier for the selected range
    startDate: null, // Start timestamp of the selected range (null means not set yet)
    endDate: null, // End timestamp of the selected range (null means not set yet)
  });

  const [userWiseDateRange, setUserWiseDateRange] = useState<DateRangeOption>({
    label: "", // Human-friendly label for the selected range (e.g., "Last 7 days")
    value: "", // Internal value identifier for the selected range
    startDate: null, // Start timestamp of the selected range (null means not set yet)
    endDate: null, // End timestamp of the selected range (null means not set yet)
  });

  const [workspaceWiseDateRange, setWorkspaceWiseDateRange] =
    useState<DateRangeOption>({
      label: "", // Human-friendly label for the selected range (e.g., "Last 7 days")
      value: "", // Internal value identifier for the selected range
      startDate: null, // Start timestamp of the selected range (null means not set yet)
      endDate: null, // End timestamp of the selected range (null means not set yet)
    });

  // State for user privileges details modal (whether it is open)
  const [isLoginActivityDetailsOpen, setIsLoginActivityDetailsOpen] =
    useState(false);
  // State for selected user privileges details to show in the modal
  const [selectedLoginActivityDetails, setSelectedLoginActivityDetails] =
    useState<any>({});

  // -------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------

  /**
   * summaryData & isSummaryLoading
   *
   * Fetch login summary records using the currently selected date range.
   * Real-world analogy: Think of this like requesting a department store manager
   * to pull a summary report of all store visits for a specific time period.
   *
   * - `summaryData`: contains the requested login summary data (unique users count, workspaces count)
   * - `isSummaryLoading`: a flag that's TRUE while fetching and FALSE when data is ready
   *
   * Note: the `!` after dates means "I promise these dates are already set" - similar to
   * assuring someone that you're ready to start before they gather the data.
   */
  const { data: summaryData, isFetching: isSummaryLoading } =
    useGetLoginActivities(
      "summary", // Type of data: summary view showing overall statistics
      summaryDateRange.startDate!, // Filter start: only show logins after this date (e.g., January 1, 2026)
      summaryDateRange.endDate!, // Filter end: only show logins before this date (e.g., January 31, 2026)
    );

  // Fetch login activity grouped by individual user with their login statistics
  // Real-world: Like getting a list of each employee with how many times they logged in
  const { data: userData, isFetching: isUserLoading } = useGetLoginActivities(
    "user", // Type of data: breakdown by individual users
    userWiseDateRange.startDate!, // Start date for filtering
    userWiseDateRange.endDate!, // End date for filtering
  );

  // Fetch login activity grouped by workspace to see which locations had logins
  // Real-world: Like tracking which store locations had visitors on a given day
  const { data: workspaceData, isFetching: isWorkspaceLoading } =
    useGetLoginActivities(
      "workspace", // Type of data: breakdown by workspaces/locations
      workspaceWiseDateRange.startDate!, // Start date for filtering
      workspaceWiseDateRange.endDate!, // End date for filtering
    );

  // Fetch list of inactive users who haven't logged in for 3 months
  // Real-world: Like getting a list of store employees who haven't worked in the past quarter
  // This helps identify dormant accounts that might need to be archived or reviewed
  const { data: inactiveUserData, isFetching: isInactiveUserLoading } =
    useGetLoginActivities(
      "inactiveUser", // Type of data: users who are inactive (no date range needed - always last 3 months)
    );

  // State for the search text box - remembers what user typed to filter by user name
  // Real-world: Like typing in Google search box to find specific results
  const [searchUser, setSearchUser] = useState("");

  // State for the search text box - remembers what user typed to filter by workspace name
  const [searchWorkspace, setSearchWorkspace] = useState("");

  // State for the search text box - remembers what user typed to filter by inactive user name
  const [searchInactiveUser, setSearchInactiveUser] = useState("");

  // -------------------------------------------------------------------
  // Table Column Configuration
  // -------------------------------------------------------------------

  // Define the structure and appearance of columns in the user-wise login activity table
  // This tells the DataGrid component: "Here's what columns to show and how to display them"
  const userWiseColumns: ColumnConfig<any>[] = [
    {
      key: "user_name", // Internal identifier to match this column with data from the API (like a receipt number to match against actual data)
      label: "User Name", // Header text displayed at top of column for users to read
      width: "auto", // Let column width adjust automatically based on content
      copyable: true, // Allow users to copy the text value (useful for email addresses)
      showMore: true, // If text is too long, show "..." and allow user to expand it
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "unique_workspaces", // Internal identifier linking to the data property
      label: "Workspaces Accessed", // Header text shown at top of column
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render function: Instead of showing raw number, make it clickable like a link
      // Real-world: Like clicking "View Details" to get more information
      render: (value: number, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS classes: make cursor a pointer and underline on hover (like a hyperlink)
          onClick={() =>
            // When user clicks this number, open a details modal showing which workspaces they accessed
            openLoginActivityDetails({
              title: "Workspaces Accessed", // Title for the modal
              detailsType: "userWorkspaceDetails", // Type tells modal what data to fetch
              detailsValue: row.user_name, // Pass the user name so modal knows which user to investigate
            })
          }
        >
          {/* Display the number with commas for readability (e.g., 1,200 instead of 1200), or show dash if missing */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "total_login_activities", // Internal identifier linking to the data property
      label: "Total Logins", // Header text showing "Total Logins"
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make the login count clickable to view detailed login records
      render: (value: number, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover (like a link)
          onClick={() =>
            // When clicked, open modal showing detailed login activity for this user
            // Real-world: Like clicking "Order details" to see each transaction in that order
            openLoginActivityDetails({
              title: "Total Logins", // Modal title
              detailsType: "userLoginDetails", // Type tells modal to fetch user login details
              detailsValue: row.user_name, // Tell modal which user's details to show
            })
          }
        >
          {/* Show login count with commas (e.g., "25" or "1,500"), or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
  ];

  // Define columns for workspace-wise login activity table
  // Shows which workspaces (departments/locations) have logins and their activity levels
  const workspaceWiseColumns: ColumnConfig<any>[] = [
    {
      key: "workspace_name", // Internal identifier to match this column with API data
      label: "Workspace Name", // Header text displayed at top of column
      width: "auto", // Let column width adjust automatically to fit content
      copyable: true, // Allow users to copy the workspace name text
      showMore: true, // Show "..." if text is long and allow expansion
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "unique_users", // Internal identifier linking to the data property
      label: "Unique Users", // Header text for "Unique Users" column
      width: "auto", // Automatically size the column
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Display unique user count as clickable to see user details
      // Real-world: Like clicking "See who accessed this location" to get a list of employees
      render: (value: number, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover
          onClick={() =>
            // Open modal to show which users accessed this workspace
            openLoginActivityDetails({
              title: "Unique Users", // Modal title
              detailsType: "workspaceUserDetails", // Type tells modal to fetch workspace user details
              detailsValue: row.workspace_name, // Tell modal which workspace to investigate
            })
          }
        >
          {/* Display count with commas (e.g., "150") or dash if empty */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "total_login_activities", // Internal identifier linking to the data property
      label: "Total Logins", // Header text showing "Total Logins"
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make total logins count clickable to view all login events for this workspace
      render: (value: number, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover (like a link)
          onClick={() =>
            // When clicked, open modal showing all login events that happened in this workspace
            // Real-world: Like seeing a store's foot traffic log for a specific date range
            openLoginActivityDetails({
              title: "Total Logins", // Modal title
              detailsType: "workspaceLoginDetails", // Type tells modal to fetch workspace login details
              detailsValue: row.workspace_name, // Tell modal which workspace's logs to show
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
  ];

  // Define columns for inactive users table (users who haven't logged in for 3+ months)
  // This helps identify dormant accounts that might need to be deactivated or archived
  const usersInactiveColumns: ColumnConfig<any>[] = [
    {
      key: "user_email", // Internal identifier linking to email data from API
      label: "User / Principal / Identity Name", // Header text displayed at top
      width: "auto", // Let column width adjust automatically
      copyable: true, // Allow users to copy the email address
      showMore: true, // Show "..." if email is too long and allow expansion
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "last_login_time", // Internal identifier for the last login date field
      label: "Last Login At", // Header text showing "Last Login At"
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // getValue: Transform raw data before display - convert timestamps to human-readable format
      // Real-world: Like converting "1704067200" (computer time) to "January 1, 2026, 3:00 PM" (human-readable)
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"), // If timestamp exists, format it nicely; otherwise show dash
    },
  ];

  // Create array of summary cards to display at the top of the page
  // These cards show key statistics like "Total Users" and "Total Workspaces"
  // Real-world: Like a dashboard showing "1,200 employees" and "15 stores"
  const activitySummaryCards = [
    {
      title: "Total Users", // Card label: "Total Users"
      // Count: Extract unique_users number from API data, or show 0 if no data available
      // Real-world: "There are 1,200 people who have logged in during selected time period"
      count:
        summaryData && summaryData.length > 0 ? summaryData[0].unique_users : 0,
      color: "brand", // Use the brand color theme for this card
      icon: <People20Filled />, // Show people icon to visually indicate "Users"
    },
    {
      title: "Total Workspaces", // Card label: "Total Workspaces"
      // Count: Extract unique_workspaces number from API data, or show 0 if no data available
      // Real-world: "There are 15 different locations/workspaces with login activity"
      count:
        summaryData && summaryData.length > 0
          ? summaryData[0].unique_workspaces
          : 0,
      color: "brand", // Use brand color
      icon: <Apps20Filled />, // Show apps icon to visually indicate "Workspaces"
    },
  ];

  // Function to open the details modal with specific information
  // Real-world: Like clicking on a store in Google Maps and a popup appears with more info
  const openLoginActivityDetails = (details: any) => {
    // Store which details were clicked so the modal knows what to display
    // Think of it as: "I clicked on user John's 'Workspaces', so remember that for the modal"
    setSelectedLoginActivityDetails(details);
    // Signal to the modal component to become visible (open it)
    setIsLoginActivityDetailsOpen(true);
  };

  // Filter the user activity data based on what the user typed in the search box
  // useMemo: This is an optimization - only recalculate when userData or searchUser changes
  // Real-world: Like typing "John" in Google search and only getting results containing "John"
  const filteredUserData = useMemo(() => {
    // Convert search text to lowercase for case-insensitive search
    // E.g., "John" and "john" will both match "JOHN"
    const searchText = searchUser.toLowerCase();

    // Filter the user data array: keep only users whose name contains the search text
    // Example: if userData = ["John", "Jane", "Bob"] and searchText = "a"
    // Result: ["Jane"] (only Jane contains 'a')
    return userData?.filter(
      (userAccess: any) =>
        userAccess?.user_name?.toLowerCase().includes(searchText), // Check if user's name contains search text
    );
  }, [userData, searchUser]); // Dependencies: if either userData or searchUser changes, recalculate the filtered list

  // Filter workspace activity data based on search box input
  // useMemo: Optimization - only recalculate when workspaceData or searchWorkspace changes
  // Real-world: Like typing "Store A" to see only that store's activity
  const filteredWorkspaceData = useMemo(() => {
    // Convert search text to lowercase for case-insensitive matching
    const searchText = searchWorkspace.toLowerCase();

    // Keep only workspaces whose names contain the search text
    // Example: searchText = "NY" will match "New York", "NYC", "new york store"
    return workspaceData?.filter(
      (datasetAccess: any) =>
        datasetAccess?.workspace_name?.toLowerCase().includes(searchText), // Check if workspace name contains search term
    );
  }, [workspaceData, searchWorkspace]); // Recalculate when either dependency changes

  // Filter inactive user data based on search box input
  // useMemo: Optimization - only recalculate when inactiveUserData or searchInactiveUser changes
  // Real-world: Like typing "john@" to find all inactive users with emails starting with "john@"
  const filteredInactiveUserData = useMemo(() => {
    // Convert search text to lowercase for case-insensitive search
    const searchText = searchInactiveUser.toLowerCase();

    // Keep only inactive users whose email addresses contain the search text
    // Example: searchText = "corp" will match "john.corp@company.com", "corporate@company.com"
    return inactiveUserData?.filter(
      (datasetAccess: any) =>
        datasetAccess?.user_email?.toLowerCase().includes(searchText), // Check if email contains search term
    );
  }, [inactiveUserData, searchInactiveUser]); // Recalculate when either dependency changes

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

    if(!isLoadingPermissions && !canRead) {
        window.location.href = "/forbidden";
    };

  return (
    // Root container for the entire Login Activity view
    // This is the outermost HTML div that wraps everything visible on this page
    <div>
      {/* Header section with title and date filter for summary cards */}
      <div className={styles.titleContainer}>
        {/* Page Title: "Login Activity Summary" */}
        <Text size={400} weight="semibold">
          Login Activity Summary
        </Text>

        <div className={styles.filterContainer}>
          {/* Date range picker: Lets user select which time period to view data for */}
          {/* Real-world: Like picking "January 2026" to see login data only for that month */}
          <CustomDateRange
            selectedRange={summaryDateRange} // Current date range selected from previous interactions
            setSelectedRange={setSummaryDateRange} // Function to call when user picks new date range
          />
        </div>
      </div>

      {/* Section: Display summary cards (Total Users, Total Workspaces) */}
      {isSummaryLoading ? (
        // While data is loading, show a spinning indicator
        <div className="flex min-h-[15vh] items-center justify-center">
          {/* Spinner: animated loading icon with accessible label "Loading data..." */}
          {/* Real-world: Like a "Please wait..." message while the store is looking up records */}
          <Spinner size="small" label="Loading data…" />
        </div>
      ) : (
        // Once data loads, display the summary cards in a grid
        <div className={styles.cardContainer}>
          {/* Loop through each card data and create a visual card for it */}
          {activitySummaryCards.map((item, index) => (
            // Card wrapper: displays a single summary statistic (e.g., "Total Users: 1,200")
            // Real-world: Like a dashboard widget showing "15,000 Transactions This Month"
            <Card
              // React key: unique identifier for this item in the list (used for efficient rendering)
              key={index}
              // Apply styling: border, padding, background color, etc.
              className={styles.card}
            >
              {/* Badge: Large highlighted box showing the number */}
              {/* Real-world: Like a trophy showing a big number of achievements */}
              <Badge
                // appearance="filled": Make the badge a solid color block (not just outline)
                appearance="filled"
                // Apply brand color styling to the badge background
                className={styles.badgeBrand}
                // size="extra-large": Make the number very large and prominent (easy to see from distance)
                size="extra-large"
                // icon: Show an icon inside the badge (People icon for "Total Users", Apps icon for "Workspaces")
                icon={item?.icon}
              >
                {/* Big number with commas for readability: "1,200" instead of "1200" */}
                {/* If count is 0 or missing, show dash "-" instead */}
                {item?.count ? item.count?.toLocaleString() : "-"}
              </Badge>

              {/* Title text below the number: "Total Users", "Total Workspaces", etc. */}
              <Text
                size={300} // Font size: small-medium
                weight="medium" // Font weight: medium thickness (makes text stand out)
              >
                {item.title}
              </Text>
            </Card>
          ))}
        </div>
      )}

      {/* Header section for "User-wise Login Activity" with search and date filter */}
      <div className={styles.titleContainer}>
        {/* Section Title: "User-wise Login Activity" */}
        {/* This shows login counts grouped by individual users */}
        <Text size={400} weight="semibold">
          User Login Activity
        </Text>

        {/* Container for filter controls (search box and date range) */}

        <div className={styles.filterContainer}>
          {/* Date range picker: Allow filtering by custom date range */}
          {/* Real-world: "Show logins from January 1 to January 31" */}
          <CustomDateRange
            selectedRange={userWiseDateRange} // Currently selected date range
            setSelectedRange={setUserWiseDateRange} // Call when user picks new date range
          />
          <div>
            <SearchBox
              className="w-[20rem]" // Set width to 20rem (320px) for consistent layout
              placeholder="Filter by user name..." // Helper text shown when search box is empty
              value={searchUser} // Current search text typed by user
              onChange={(_, data) => {
                // When user types in search box, update the search state
                // This triggers filteredUserData to recalculate and update the table below
                // Real-world: As you type "John", the table filters to show only John's records
                setSearchUser(data.value);
              }}
            />
          </div>
        </div>

      </div>

      {/* Table: Display user-wise login activity */}
      {/* Real-world: Like a spreadsheet showing each employee's login statistics */}
      <DataGrid
        columns={userWiseColumns} // Column definitions: tells table what columns to show (User Name, Workspaces, Total Logins)
        data={filteredUserData || []} // Table rows: user data filtered by search text; empty list if no data
        loading={isUserLoading} // Loading flag: show spinner while fetching data from server
      />

      {/* Header section for "Workspace-wise Login Activity" with search and date filter */}
      <div className={styles.titleContainer}>
        {/* Section Title: "Workspace-wise Login Activity" */}
        {/* This shows login counts grouped by workspace/location */}
        <Text size={400} weight="semibold">
          Workspace Login Activity
        </Text>


        {/* Search box: filter workspaces by name */}
        <div className={styles.filterContainer}>
          {/* Date range picker: Filter by date range */}
          {/* Real-world: "Show activity from February 1-15" */}
          <CustomDateRange
            selectedRange={workspaceWiseDateRange} // Currently selected date range
            setSelectedRange={setWorkspaceWiseDateRange} // Call when user picks new date range
          />
          <div>
            <SearchBox
              className="w-[20rem]" // Width of 320px for consistent layout
              placeholder="Filter by workspace name..." // Helper text when search box is empty
              value={searchWorkspace} // Current search text typed by user
              onChange={(_, data) => {
                // Update search state as user types
                // This filters the table to show only matching workspaces
                // Real-world: As you type "Store", the table shows only workspaces with "Store" in their name
                setSearchWorkspace(data.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Table: Display workspace-wise login activity */}
      {/* Real-world: Like a spreadsheet showing each store's login statistics */}
      <DataGrid
        columns={workspaceWiseColumns} // Column definitions: tells table what columns to show (Workspace, Unique Users, Total Logins)
        data={filteredWorkspaceData || []} // Table rows: workspace data filtered by search text; empty list if no data
        loading={isWorkspaceLoading} // Loading flag: show spinner while fetching data from server
      />

      {/* Header section for "Users Inactive for the Last 3 Months" with search filter */}
      {/* This section helps identify dormant user accounts that might need review or deactivation */}
      <div className={styles.titleContainer}>
        {/* Section Title: "Users Inactive for the Last 3 Months" */}
        {/* Inactive users are those who haven't logged in for 3+ months */}
        {/* Real-world: Like flagging employees who haven't clocked in all quarter */}
        <Text size={400} weight="semibold">
          Users Inactive for the Last 3 Months
        </Text>

        {/* Search box: filter inactive users by email */}
        <SearchBox
          className="w-[20rem]" // Width of 320px for consistent layout
          placeholder="Filter by user / principal / identity name..." // Helper text when search box is empty
          value={searchInactiveUser} // Current search text typed by user
          onChange={(_, data) => {
            // Update search state as user types
            // This filters the table to show only matching inactive user emails
            // Real-world: As you type "john", see all inactive users with "john" in their email
            setSearchInactiveUser(data.value);
          }}
        />
      </div>

      {/* Table: Display users who are inactive (haven't logged in for 3+ months) */}
      {/* Real-world: Like a list of employees on extended leave that need follow-up */}
      <DataGrid
        columns={usersInactiveColumns} // Column definitions: tells table what columns to show (User Email, Last Login Date)
        data={filteredInactiveUserData || []} // Table rows: inactive user data filtered by search text; empty list if no data
        loading={isInactiveUserLoading} // Loading flag: show spinner while fetching data from server
      />

      {/* Login Activity Details Modal: Popup window showing detailed login information */}
      {/* This opens when user clicks on a number in the tables (e.g., clicks on "Workspaces Accessed" count) */}
      {/* Only render modal if: 1) selectedLoginActivityDetails exists, 2) user clicked to open it */}
      {selectedLoginActivityDetails && (
        // Modal popup: Shows detailed login activity for the selected user/workspace
        // Real-world: Like clicking a store on a map to see its detailed sales report
        <LoginActivityDetailsModal
          open={isLoginActivityDetailsOpen} // Is modal currently visible? true = show, false = hide
          onOpenChange={setIsLoginActivityDetailsOpen} // Function to call when user closes modal
          title={selectedLoginActivityDetails?.title} // Modal title (e.g., "Total Logins", "Workspaces Accessed")
          detailsType={selectedLoginActivityDetails.detailsType} // What type of details to show (e.g., userLoginDetails, workspaceUserDetails)
          detailsValue={selectedLoginActivityDetails.detailsValue} // What specific data to show (e.g., user name, workspace name)
          // Pass date range to modal based on which table was clicked
          // If user table clicked: use userWiseDateRange; if workspace table clicked: use workspaceWiseDateRange
          // Real-world: Show modal "Show sales from the date range they selected"
          startDate={
            selectedLoginActivityDetails?.detailsType ===
              "userWorkspaceDetails" ||
              selectedLoginActivityDetails?.detailsType === "userLoginDetails"
              ? (userWiseDateRange?.startDate ?? undefined)
              : (workspaceWiseDateRange?.startDate ?? undefined)
          }
          endDate={
            selectedLoginActivityDetails?.detailsType ===
              "userWorkspaceDetails" ||
              selectedLoginActivityDetails?.detailsType === "userLoginDetails"
              ? (userWiseDateRange?.endDate ?? undefined)
              : (workspaceWiseDateRange?.endDate ?? undefined)
          }
        />
      )}
    </div>
  );
};
