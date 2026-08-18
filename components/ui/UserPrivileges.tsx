/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the UserPrivileges component - a comprehensive access control management
    and auditing view under the Governance module of the Teva Data Integrity Automation Dashboard.

    This component serves as a centralized control panel for security and compliance teams to manage,
    review, and audit user access privileges across the entire data ecosystem (catalogs, schemas, tables).

    Key Responsibilities:

    1. HIERARCHICAL FILTER NAVIGATION
       - Provides cascading dropdown filters: Catalog → Schema → Dataset
       - Users drill down from broad (all catalogs) to specific (single table) access scope.
       - Dynamically populates options based on parent selection (schemas only show if relevant to selected catalog).
       - Reduces cognitive load by showing only valid filter combinations.
       - Real-world example: "Select Sales catalog → shows only Sales schemas → shows only relevant tables"

    2. PRINCIPAL ACCESS SUMMARY STATISTICS
       - Displays summary cards showing total principals with system access.
       - Breaks down principals into read-only vs. write access categories.
       - Provides at-a-glance metrics for access distribution and authorization scope.
       - Summary cards are clickable to explore detailed principal lists.
       - Real-world example: "150 total principals: 100 with read access, 50 with write access"

    3. DETAILED PRINCIPAL ACCESS ACCORDION
       - When user clicks a summary card, expands accordion showing full principal list.
       - Displays each principal's exact permissions/operations allowed (SELECT, INSERT, DELETE, etc.).
       - Supports copy-to-clipboard for audit documentation and compliance reporting.
       - Allows expanding truncated privilege lists for principals with many permissions.
       - Real-world example: "Click '100 Read Access' → accordion shows list of 100 principals with exactly what they can read"

    4. USER ACCESS PRIVILEGES TABLE
       - Shows which users/principals have access to how many datasets.
       - Breaks down access into three categories: Total Datasets, Read-Only Access, Write Access.
       - Each count is clickable to drill down and see specific datasets and their permissions.
       - Searchable by principle name to find specific users/service accounts quickly.
       - Real-world example: "Find 'john@company.com' → see he has access to 45 datasets: 30 read-only, 15 write"

    5. USER-WISE DATASET ACCESS AUDIT TRAIL
       - Tracks which users accessed which datasets and when they accessed them.
       - Provides date range filtering to investigate access during specific time periods.
       - Breaks down access into Read vs. Write categories with timestamps.
       - Supports historical audit queries: "Who accessed what in Q1 2026?"
       - Real-world example: "Filter Q3 2025 → see 'sarah@company.com' accessed 5 datasets in that quarter"

    6. SEARCHABLE PRIVILEGE DISCOVERY
       - Full-text search across all privilege tables to find specific users by email/name.
       - Case-insensitive search for user convenience (searching "john" finds "JOHN" or "John").
       - Applies search across both summary and detailed views independently.
       - Real-world example: "Type 'finance' in search → see all Finance team members and their datasets"

    7. DRILL-DOWN INVESTIGATION PATH
       - Clicking any metric (count of datasets, access level) opens detailed modal.
       - Modal provides granular view of specific access records with full context.
       - Date range context from parent trickle down to child modal for consistency.
       - Enables investigators to quickly move from overview to detailed analysis.
       - Real-world example: "Click '35 Read-Accessed Datasets' → modal shows all 35 with access timestamps"

    8. CASCADE-DEPENDENT FILTER UPDATING
       - When catalog changes, schema/dataset filters automatically reset to "All".
       - Schema options update to show only schemas in selected catalog.
       - Dataset options update to show only tables in selected catalog+schema combination.
       - Prevents invalid filter combinations and confused state.
       - Real-world example: "Had 'Finance' catalog + 'Payroll' schema selected, then switch to 'Sales' catalog → automatically resets to show Sales schemas"

    Use Cases:
    - ACCESS CONTROL REVIEWS: Audit who has what access for compliance reviews and certifications.
    - USER ONBOARDING: Verify new hire has correct dataset access before deployment.
    - USER OFFBOARDING: Audit departing employee's access before account deactivation to prevent data theft.
    - PRIVILEGE ESCALATION INVESTIGATION: Find if user has more access than authorized after suspicious activity.
    - COMPLIANCE AUDITS: Generate privilege reports for external auditors about access governance.
    - INCIDENT RESPONSE: Quickly determine what data a compromised user account could have accessed.
    - PRINCIPLE OF LEAST PRIVILEGE ENFORCEMENT: Find over-privileged users who have more access than their role requires.
    - DATA CLASSIFICATION ALIGNMENT: Verify sensitive dataset access aligns with data security classifications.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*@fluentui/react-components
     - What it is: A UI component library from Microsoft (Fluent UI) providing
       accessible, themed React components and styling tokens.
     - Why used: This file uses layout and form primitives (Title3, Field,
       Dropdown, Option) and styling helpers (`makeStyles`, `tokens`) to keep
       the look-and-feel consistent with the rest of the application and to
       make theming/responsive spacing straightforward.
*/
import {
  makeStyles, // Function to create scoped CSS-in-JS styles for the component
  tokens, // Design tokens (spacing, colors, font weights) for consistent design
  Field, // A labeled field wrapper used for form controls
  Dropdown, // Select/dropdown UI component for choosing options
  Option, // Individual option element to be used inside Dropdown
  Text, // Component for rendering text with theming support
  SearchBox, // Input component for searching/filtering data in tables
  Spinner, // Loading indicator component shown while API calls are in progress
  Accordion, // Container component that manages collapsible accordion panels
  AccordionItem, // Wrapper for a single accordion section (can contain header and panel)
  AccordionHeader, // Clickable header text that expands/collapses the accordion panel
  AccordionPanel, // Content area that shows/hides when accordion header is clicked
  Button, // A clickable button to run the data refresh function
  Tooltip, // Tooltip shows helpful information when users hover over or focus on an element
} from "@fluentui/react-components"; // Fluent UI components and styling helpers
/* 
  ./DataGrid
     - What it is: A local, reusable data grid/table component defined in the
       project (components/ui/DataGrid.tsx). It offers a standardized way to
       render tabular data with common features (pagination, loading state,
       column definitions, copyable values).
     - Why used: The User Privileges view displays tabular privilege records,
       so it uses `DataGrid` to avoid duplicating table logic and styling.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Reusable DataGrid component for rendering tables
/*
  react
     - What it is: The core React library which provides hooks and component
       primitives for building UI. Here we only use `useState`.
     - Why used: `useState` stores interactive UI state (selected dropdown
       value) so the component can re-render when the user chooses a filter.
*/
import { useEffect, useMemo, useState } from "react"; // React hook for managing local component state (like selected dropdown)
/* 
  @/hooks/useGovernanceService
     - What it is: A project-specific custom hook that encapsulates the API
       call(s) needed to fetch governance-related data (user privileges).
     - Why used: It centralizes data fetching and caching logic so the UI
       component simply subscribes to a data source rather than calling the
       API directly.
*/
import { useGetUserPrivileges } from "@/hooks/useGovernanceService"; // Custom hook that fetches user privileges from backend

/*
  ./Highlights
    - What it is: A reusable React component that renders a collection of visually appealing
      metric cards (highlights). Each card displays a title, count/metric value, optional icon,
      and optional color styling. Cards can be interactive (clickable) to trigger drill-down
      actions or other behaviors. The component abstracts away card styling/layout logic so
      parent components focus on data preparation.
    
    - Why used: This component is critical for displaying governance summary statistics in an
      intuitive, non-technical-friendly format:
      1. VISUAL METRIC DISPLAY: Converts abstract numbers (150 principals, 100 with read access)
         into visually distinct cards that stakeholders can scan quickly. Real-world example:
         Like a bank dashboard showing "Total Deposits: $5M", "Pending Transactions: 24"
      2. ICON-ENHANCED RECOGNITION: Each metric card includes an icon (eye, pencil, people)
         making the metric type instantly recognizable without reading text. Like seeing a
         red stop sign - you understand "stop" before reading the word.
      3. INTERACTIVE DRILL-DOWN: Makes metric cards clickable so security teams can click
         "150 Principals" to expand and see the actual person/user list. Real-world: Like
         clicking "$5M Total Deposits" to drill down and see account-by-account breakdown.
      4. RESPONSIVE LAYOUT: Component handles responsive card arrangement (stack on mobile,
         grid on desktop) so parent component doesn't duplicate layout logic.
      5. CONSISTENT THEMING: Leverages Fluent UI design tokens (colors, spacing, fonts)
         ensuring governance dashboard looks professional and matches org design standards.
    
    - Usage in UserPrivileges: Displays three summary cards at top of page:
      * Card 1: Total Principals (icon: people) - total count of all users/service accounts
      * Card 2: Principals with Read Access (icon: eye) - count of users with read-only permission
      * Card 3: Principals with Write Access (icon: pencil) - count of users with modify permission
*/
import { Highlights } from "./Highlights";

/*
  ./CustomDateRange
    - What it is: A custom React component providing a date range picker interface. Users can
      select or filter data by a specific date range (e.g., "January 1 - March 31"). The
      component manages start/end date state and passes selected date range back to parent via
      callback. Supports predefined ranges (Last 30 days, Last Quarter, Custom) for quick selection.
    
    - Why used: Filtering by date range is essential for governance audits and compliance investigations:
      1. TIME-BOUNDED AUDIT QUERIES: Enables investigators to answer "Who accessed what datasets
         in Q1 2026?" or "Show me access during the data breach window (Jan 15-20)." Real-world:
         Like a bank showing you transactions from a specific month, or a security camera showing
         footage from a specific time window during an incident.
      2. COMPLIANCE REPORTING: Auditors and regulators require time-bounded reports for specific
         periods (quarterly, annual) to prove governance controls. Date range lets them generate
         "2025 Year-End Access Report" without manual date filtering.
      3. INCIDENT RESPONSE ACCELERATION: When a security incident occurs, team can filter to
         exact incident window ("2026-02-15 to 2026-02-18") to immediately see what data a
         compromised user accessed. Can mean difference between quickly isolating breach vs. weeks of investigation.
      4. PERFORMANCE OPTIMIZATION: Limiting date range reduces number of database records fetched,
         making queries faster and dashboard more responsive. Instead of loading 5 years of data
         (slow), load just "last 90 days" (fast).
      5. REAL-WORLD ANALOGY: Like selecting a date range on a credit card statement to find
         fraudulent transactions - you could view all transactions ever (overwhelming), or just
         "July 15-25" (when fraud occurred for easy analysis).
    
    - Usage in UserPrivileges: Filters the "User-wise Dataset Access Summary" table to show
      which users accessed which datasets during a specific time period. Investigators select
      date range, and data table automatically filters to show only access records within that window.
*/
import { CustomDateRange, DateRangeOption } from "./CustomDateRange";

/*
  @fluentui/react-icons
    - What it is: A comprehensive icon library from Microsoft's Fluent UI providing
      100+ professionally designed SVG icons packaged as React components. Each icon
      (People20Filled, PeopleEdit20Filled, PeopleEye20Filled, etc.) is a reusable
      React component that renders a specific visual symbol. The "Filled" suffix means
      the icon has a solid/filled appearance (not outline). The "20" refers to the icon
      size (20px by 20px).
    
    - Why used: Icons serve critical visual communication functions in this access control
      dashboard:
      1. QUICK RECOGNITION: Users can instantly recognize what type of information a card
         displays without reading text. Example: "Eye icon = read/view access" is immediate
         visual grammar that's faster than reading "Principals with Read Access".
      2. VISUAL CONSISTENCY: Fluent UI icons match the design language of the rest of the
         dashboard, ensuring a cohesive, professional appearance.
      3. ACCESSIBILITY: Fluent UI icons are designed with WCAG accessibility standards,
         work well at different sizes, and support high contrast modes for visually impaired users.
      4. PERFORMANCE: Icons as SVG React components have smaller bundle size than image files
         (PNG/JPG) and scale perfectly on any screen resolution (retina displays, mobile, desktop).
      5. REAL-WORLD ANALOGY: Like using traffic lights (red/yellow/green) on a highway to
         communicate status instantly - users understand meaning before thinking about it.
    
    - Specific icons used in this component:
      * People20Filled: Represents "Total Principals" - the default users icon
      * PeopleEye20Filled: Represents "Read Access" - shows people viewing/observing data
      * PeopleEdit20Filled: Represents "Write Access" - shows people editing/modifying data
*/
import {
  People20Filled, // Icon: Shows multiple people - used for "Total Principals" card to visually represent all users/accounts
  PeopleEdit20Filled, // Icon: Shows people with a pencil - used for "Write Access" card to indicate write/edit permissions
  PeopleEye20Filled, // Icon: Shows people with an eye - used for "Read Access" card to indicate view/read-only permissions
  LockClosedRegular, // Icon: Show lock close icon 
  ArrowSyncRegular // Icon: Show refresh/sync icon
} from "@fluentui/react-icons"; // Fluent UI icon library: SVG icons as React components for fast, accessible visual communication

/*
  ./UserPrivilegesDetailsModal
    - What it is: A specialized popup modal component (like a dialog box) that displays detailed
      drill-down information about user privileges. When users click on numbers/metrics in the parent
      tables, this modal opens and shows granular details (which specific users, datasets, access
      types, dates, privileges) in a scrollable data grid. The modal is context-aware - it displays
      different data based on what was clicked.
    
    - Why used: This component enables the drill-down investigation workflow that's critical for
      governance and security teams:
      1. SUMMARY-TO-DETAIL NAVIGATION: Parent tables show summaries ("150 users have read access"),
         clicking opens modal showing those 150 users individually. Like searching Google and clicking
         a result to see full article content instead of just the preview.
      2. COPY-ENABLED AUDIT DOCUMENTATION: Users can copy cell values (principal names, privilege
         lists, dataset names) from the modal and paste them directly into compliance reports, emails,
         or incident tickets. Real-world: Auditor clicks modal → copies "Alice, Bob, Charlie, Dave"
         → pastes in compliance report sent to external auditors.
      3. ACCESSIBILITY FOR INVESTIGATION: Investigators can expand truncated privilege lists ("SELECT,
         INSERT, UPDATE...") to see full text of long privilege lists. No need to guess what
         permissions a user has - see the complete, untruncated list.
      4. DATE-RANGE CONTEXT PRESERVATION: When parent table filtered to "Last 30 days", modal
         automatically inherits that date range and shows only records from that period. Ensures
         detail view respects parent view's filters - no confusion about time windows.
      5. FLEXIBLE DETAIL TYPES: Same modal component handles different types of drill-downs
         (userAccessPrivilegesDetails vs. userWiseDatasetAccessDetails) by checking detailsType prop.
         Reduces code duplication - one component smartly adapts to different data types.
      6. LOADING STATE FEEDBACK: While API fetches data, modal shows a spinner and "Loading..." so
         users know system is working (not frozen). Data appears automatically when API responds.
    
    - Usage in UserPrivileges: Opens when user clicks on any metric number in parent tables:
      * Click "Total Datasets" → modal shows all datasets that user has any access to
      * Click "Read Access" → modal shows only datasets with read-only access
      * Click "Write Access" → modal shows only datasets with write permissions
      * Click in date-range filtered table → modal respects that date range
      * Close modal → focus returns to parent table, modal state resets

    - Real-world analogy: Like an email client - Gmail inbox shows preview list of emails 
      (from, subject, snippets). Click an email → detailed view opens showing full content, 
      with options to copy text, expand truncated parts, search. Close email → back to inbox list.
      UserPrivilegesDetailsModal works the same way - tables are the "inbox list", modal is the 
      "detailed email view".
*/
import { UserPrivilegesDetailsModal } from "./UserPrivilegesDetailsModal";

/*
    @/components/ui/ClusterControl
    - What it is: A component that allows users to control the state of the Databricks cluster (e.g., start, stop) and displays real-time cluster events.
    - Why used: Provides users with the ability to manage the Databricks cluster directly from the KPI Configuration Management page, ensuring they can start the cluster when needed to add or manage KPI configurations, and stay informed about cluster status through real-time event streaming.
*/
import { ClusterControl } from "@/components/ui/ClusterControl";

/*
    @/lib/services/greatExpectationsService
    - What it is: A service module in our project that contains functions for making API calls to the Great Expectations backend. It handles requests related to managing KPI configurations, such as creating new configurations or fetching existing ones.
    - Why used: We use this service to submit the new KPI configuration data to the backend when the user submits the form. The manageKPIConfiguration function in this service takes the form data, sends it to the API, and returns a response that includes a run ID. This allows us to track the status of the configuration creation process and provide feedback to the user through notifications.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/*  
  @/components/ui/JobStatusToaster
    - What it is: A custom component which shows the status of the job.
    - Why used: Provides the addRunId function to track the status of rule creation jobs.
*/
import { addRunId } from "@/components/ui/JobStatusToaster";

/*  
@/hooks/useToast
- What it is: A custom hook to manage toast notifications.
- Why used: Used for displaying success, error, or informational toast messages.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import { CATALOG_NAME } from "@/constants/config";

/*  
  @/types/api
    - What it is: Type definitions for API data structures.
    - Why used: To ensure type safety and clarity when working with API data.
*/
import { HelperFunctionsJobPayload } from "@/types/api";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useUserPrivilegesStyles
 *
 * Defines scoped styles for the UserPrivileges component.
 * Ensures consistent spacing, alignment, and typography.
 */
const useUserPrivilegesStyles = makeStyles({
  // Creates and returns CSS class names used below to style the component
  titleContainer: {
    marginTop: tokens.spacingVerticalL, // Space below the header section
    marginBottom: tokens.spacingVerticalL, // Space below the header section
    alignItems: "left", // Vertically align header content
    display: "flex", // Arrange header items horizontally
    flexDirection: "column",
    gap: tokens.spacingHorizontalS, // Gap between child elements
  },
  titleContainerWithFilters: {
    marginTop: tokens.spacingVerticalL, // Space below the header section
    marginBottom: tokens.spacingVerticalS, // Space below the header section
    alignItems: "left", // Vertically align header content
    display: "flex", // Arrange header items horizontally
    flexDirection: "column",
    gap: tokens.spacingHorizontalS, // Gap between child elements
  },
  filterContainer: {
    display: "flex", // Horizontal layout for filters
    flexWrap: "wrap", // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Space between filter controls
    alignItems: "end" // vertically align items to the end
  },
  titleWithButton: {
    display: "flex",   // horizontal layout for title and button
    justifyContent: "space-between", // push title to the left and button to the right
    alignItems: "center" // vertically center the content
  },
});

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * UserPrivileges Component
 *
 * This component renders the User Privileges view within the Governance module of the Teva Data Integrity Automation Dashboard.
 * It provides a comprehensive interface for security and compliance teams to manage, review, and audit user access privileges
 * across the data ecosystem (catalogs, schemas, tables). The component includes hierarchical filters, summary statistics,
 * detailed access lists, and an audit trail of dataset access by users.
 *
 * Why this component is needed:
 * - Provides security and compliance teams with visibility into who has access to what, enabling effective access control management.
 * - Enables investigation of suspicious access patterns and identification of over-privileged accounts.
 * - Serves as a critical tool for maintaining data integrity and enforcing the principle of least privilege across the organization.
 * - Supports compliance audits by providing detailed reports on user privileges and access history.
 * - Facilitates incident response by allowing teams to quickly determine what data a compromised account could have accessed.
 *
 * Sample Input:
 * ```tsx
 * <UserPrivileges />
 * ```
 *
 * Sample Output:
 * - A dashboard view showing:
 *  - Cascading dropdown filters for Catalog → Schema → Dataset
 *  - Summary cards with total principals, read access count, write access count
 *  - An accordion that expands to show detailed principal access when summary cards are clicked
 *  - A "User Access Privileges Summary" table showing which users have access to how many datasets, with read/write breakdown
 *  - A "User-wise Dataset Access Summary" table showing which users accessed which datasets during a selected date range
 *  - Clickable counts in tables that open a modal with detailed access records for further investigation
 * - A page displaying:
 *  - Filter controls (Catalog, Schema, Dataset dropdowns)
 *  - Summary cards (Total Principals, Read Access, Write Access)
 *  - An accordion for detailed principal access
 *  - A user access privileges table with search functionality
 *  - A user-wise dataset access table with date range filtering and search functionality
 *
 * @returns JSX.Element
 * Rendered User Privileges governance view.
 */
export const UserPrivileges = () => {
  // Main React component that renders the User Privileges view and handles local UI state
  // Real-world: This is like the "access control list" section of a bank - shows who has access to what
  // ===================================================================
  // Styles
  // ===================================================================

  // Load component-specific CSS styles for layout, spacing, and alignment
  // Real-world: Like picking a color scheme and layout template for your dashboard
  const styles = useUserPrivilegesStyles();

  // Get the global toast notification function for showing success/error messages
  const { showToast } = useGlobalToast();

  const {canRead, canManage, isLoadingPermissions} = usePagePermissions("governance-user-privileges");

  // ===================================================================
  // State Management
  // ===================================================================

  // handle the state of the cluster, whether running or not
  const [isClusterRunning, setIsClusterRunning] = useState<boolean>(false);

  // State: List of unique catalog names available for filtering
  // Real-world: Like a list of store locations ("New York", "Boston", "Chicago")
  // Populated dynamically from the API data
  const [catalogOptions, setCatalogOptions] = useState<any[]>([]);

  // State: List of unique schema names available for filtering
  // Real-world: Like departments within a store ("Sales", "HR", "Finance")
  // Updates based on the selected catalog
  const [schemaOptions, setSchemaOptions] = useState<any[]>([]);

  // State: List of unique dataset names available for filtering
  // Real-world: Like a list of tables or documents within a department
  // Updates based on the selected schema
  const [datasetOptions, setDatasetOptions] = useState<any[]>([]);

  // State: Currently selected catalog name for filtering
  // Real-world: User selects "New York" - this stores that choice
  // Default is "All" meaning show everything
  const [catalogName, setCatalogName] = useState<string>("All");

  // State: Currently selected schema name for filtering
  // Real-world: User selects "Sales" department - this stores that choice
  // Default is "All" meaning show all schemas
  const [schemaName, setSchemaName] = useState<string>("All");

  // State: Currently selected dataset name for filtering
  // Real-world: User selects "Customers" table - this stores that choice
  // Default is "All" meaning show all datasets
  const [datasetName, setDatasetName] = useState<string>("All");

  // State: Search text typed by user in the User Access Privileges search box
  // Real-world: User types "john" to find all access records for John
  const [searchUserAccess, setSearchUserAccess] = useState<string>("");

  // State: Search text typed by user in the User-wise Dataset Access search box
  // Real-world: User types "sarah" to find Sarah's dataset access records
  const [searchUserWiseDatasetAccess, setSearchUserWiseDatasetAccess] =
    useState<string>("");

  // State: Date range filter for user-wise dataset access records
  // Allows filtering by when the access occurred (e.g., "Last 30 days")
  const [userDatasetAccessDateRange, setUserDatasetAccessDateRange] =
    useState<DateRangeOption>({
      label: "", // Human-friendly label for the selected range (e.g., "Last 7 days")
      value: "", // Internal value identifier for the selected range
      startDate: null, // Start timestamp of the selected range (null means not set yet)
      endDate: null, // End timestamp of the selected range (null means not set yet)
    });

  // State: Which accordion panel is currently open
  // Only one section can be expanded at a time (like a file folder)
  // Real-world: User expands "Details" section, other sections automatically collapse
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);

  // State: Which summary card was clicked (read access vs write access)
  // Stores the title and status (READ or WRITE) of the clicked card
  // Real-world: User clicked "Principals with Read Access" - this remembers that choice
  const [selectedCard, setSelectedCard] = useState<{
    title: string; // e.g., "Principals with Read Access"
    status: string; // e.g., "READ" or "WRITE"
  } | null>(null);

  // State: Whether the user privileges details modal is open (visible)
  // true = modal is shown, false = modal is hidden
  const [isUserPrivilegesDetailsOpen, setIsUserPrivilegesDetailsOpen] =
    useState(false);

  // State: What information to display inside the details modal
  // Stores title, details type, user/dataset name that was clicked on
  // Real-world: When user clicks "5 datasets", this stores which user they clicked it for
  const [selectedUserPrivilegesDetails, setSelectedUserPrivilegesDetails] =
    useState<any>({});

  // ===================================================================
  // Data Fetching
  // ===================================================================

  /**
   * Fetch multiple datasets about user privileges from the backend API.
   * Real-world: Like calling different department managers to get reports about who has access
   *
   * Each query fetches a different type of information:
   * - uniqueDatasetList: All available catalogs, schemas, and datasets (powers the dropdown filters)
   * - totalPrincipalsCount: Summary statistics (total users, users with read access, etc.)
   * - principalsAccessDetails: Detailed list of which users have which privileges
   * - userAccessPrivileges: User-to-dataset privilege mappings
   * - userWiseDatasetAccess: Dataset access by user for a date range (audit trail)
   */

  // Fetch all unique catalogs, schemas, and datasets
  // Used to populate the filter dropdown options
  const { data: uniqueDatasetList, isFetching: isUniqueDatasetListLoading } =
    useGetUserPrivileges("uniqueDatasetList");

  // Fetch count of total principals and breakdown by access type (read/write)
  // Used for the summary cards at the top
  // Filtered by selected catalog, schema, and dataset
  const {
    data: totalPrincipalsCount,
    isFetching: isTotalPrincipalsCountLoading,
  } = useGetUserPrivileges(
    "totalPrincipalsCount", // Type of data to fetch - total count of principals with access, read access, write access
    catalogName, // Filter by selected catalog (or "All" for no filter)
    schemaName, // Filter by selected schema (or "All" for no filter)
    datasetName, // Filter by selected dataset (or "All" for no filter
  );

  // Fetch detailed list of principals and their specific privileges
  // Shows in the accordion when user clicks on a summary card
  // Filtered by selected catalog, schema, dataset, and access type (if selected)
  const {
    data: principalsAccessDetails,
    isFetching: isPrincipalsAccessDetailsLoading,
  } = useGetUserPrivileges(
    "principalsAccessDetails", // Type of data to fetch - detailed list of principals and their privileges
    catalogName, // Filter by selected catalog
    schemaName, // Filter by selected schema
    datasetName, // Filter by selected dataset
    undefined, // No user/dataset name filter for this query - we want all principals for the selected scope
    undefined, // No date range filter for this query - we want all current privileges regardless of time
    undefined, // No date range filter for this query - we want all current privileges regardless of time
    selectedCard?.status, // If user clicked a summary card, filter by that access type (READ or WRITE). If no card selected, show all access types.
  );

  // Fetch user access privileges - shows which users have access to how many datasets
  // Displayed in "User Access Privileges Summary" table
  const {
    data: userAccessPrivileges,
    isFetching: isUserAccessPrivilegesLoading,
  } = useGetUserPrivileges("userAccessPrivileges");

  // Fetch user-wise dataset access records with date range filtering
  // Shows when users accessed datasets during a specific time period
  // Used for "User-wise Dataset Access Summary" table
  // Filtered by the selected date range
  const {
    data: userWiseDatasetAccess,
    isFetching: isUserWiseDatasetAccessLoading,
  } = useGetUserPrivileges(
    "userWiseDatasetAccess", // Type of data to fetch - user-wise dataset access records for audit trail
    undefined, // No catalog filter for this query - we want all access records regardless of catalog
    undefined, // No schema filter for this query - we want all access records regardless of schema
    undefined, // No dataset filter for this query - we want all access records regardless of dataset
    undefined, // No user/dataset name filter for this query - we want all access records regardless of user/dataset
    userDatasetAccessDateRange?.startDate, // Filter by start date of the selected date range (e.g., "2026-01-01")
    userDatasetAccessDateRange?.endDate, // Filter by end date of the selected date range (e.g., "2026-01-31")
  );

  // ===================================================================
  // Table Column Configuration
  // ===================================================================

  // Column definitions for the "Principals Access Details" table
  // Shows up in the accordion when user clicks on a summary card
  // Displays which principals have which permissions/operations
  const principalsAccessDetailsColumns: ColumnConfig<any>[] = [
    {
      key: "PRINCIPAL_NAME", // Database field: name of the user or service account
      label: "User / Principal / Identity Name", // Header text shown to users
      width: "auto", // Let column size automatically based on content
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "privileges", // Database field: what operations this principal can do
      label: "Privileges / Operations", // Header: "Privileges / Operations" (e.g., SELECT, INSERT, DELETE)
      width: "auto", // Automatically size the column
      copyable: true, // Allow users to copy the privilege text (useful for long lists)
      showMore: true, // If privileges list is too long, show "..." and allow user to expand it
    },
  ];

  /**
   * userAccessPrivilegesColumns
   *
   * Defines the table structure for "User Access Privileges Summary"
   * Shows each user and how many datasets they have access to (total, read-only, write)
   * Each column is clickable to open a modal with detailed access information
   *
   * Real-world: Like a summary showing "John has access to 50 datasets, read access to 30, write access to 20"
   */
  const userAccessPrivilegesColumns: ColumnConfig<any>[] = [
    {
      key: "PRINCIPAL_NAME", // Database field: user/service account name
      label: "User / Principal / Identity Name", // Column header displayed to users
      width: "25%", // Column takes up 25% of table width
      showMore: true, // If name is too long, allow expansion
      copyable: true, // Allow users to copy the name
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "total_datasets", // Database field: total number of datasets this user has access to
      label: "Total Datasets", // Column header: "Total Datasets"
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make the number clickable like a link to show details
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover (like a hyperlink)
          onClick={() =>
            // When user clicks this number, open modal showing detailed dataset access
            openUserPrivilegesDetails({
              title: "Total Datasets", // Modal title
              detailsType: "userAccessPrivilegesDetails", // Type tells modal what data to fetch
              detailsValue: row.PRINCIPAL_NAME, // Pass the user name so modal knows which user to investigate
              detailsCategory: "ALL", // Show all datasets (not just read or write)
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "datasets_with_read_access", // Database field: count of datasets user can read
      label: "Datasets with Read Access", // Column header: shows read-only access count
      width: "auto", // Automatically size
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make clickable to see which specific datasets have read access
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover
          onClick={() =>
            // When user clicks, open modal showing datasets they can read
            openUserPrivilegesDetails({
              title: "Datasets with Read Access", // Modal title
              detailsType: "userAccessPrivilegesDetails", // Type tells modal what data to fetch
              detailsValue: row.PRINCIPAL_NAME, // Which user to show details for
              detailsCategory: "READ", // Only show read-access datasets
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "datasets_with_write_access", // Database field: count of datasets user can modify
      label: "Datasets with Write Access", // Column header: shows write access count
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make clickable to view write-accessible datasets
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover (like a link)
          onClick={() =>
            // When user clicks, open modal showing datasets they can write to
            openUserPrivilegesDetails({
              title: "Datasets with Write Access", // Modal title
              detailsType: "userAccessPrivilegesDetails", // Type tells modal what data to fetch
              detailsValue: row.PRINCIPAL_NAME, // Which user to show details for
              detailsCategory: "WRITE", // Only show write-access datasets
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
  ];

  // Column definitions for "User-wise Dataset Access" table
  // Shows which users accessed which datasets during a time period
  // Each dataset count is clickable to view details
  const userWiseDatasetAccessColumns: ColumnConfig<any>[] = [
    {
      key: "EXECUTED_BY", // Database field: user who performed the access
      label: "User / Principal / Identity Name", // Column header: user's name
      width: "auto", // Automatically size based on content
      showMore: true, // Allow long names to expand
      copyable: true, // Allow users to copy the name
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "total_datasets", // Database field: total count of datasets accessed by user
      label: "Total Accessed Datasets", // Column header: "Total Accessed Datasets"
      width: "auto", // Automatically size
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make count clickable to see which datasets were accessed
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover
          onClick={() =>
            // When user clicks, open modal showing all datasets they accessed
            openUserPrivilegesDetails({
              title: "Total Accessed Datasets", // Modal title
              detailsType: "userWiseDatasetAccessDetails", // Type tells modal what data to fetch
              detailsValue: row.EXECUTED_BY, // Which user to show details for
              detailsCategory: "ALL", // Show all accessed datasets
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "datasets_with_read_access", // Database field: datasets accessed for reading
      label: "Read-Accessed Datasets", // Column header: datasets accessed in read-only mode
      width: "auto", // Automatically size
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make clickable to see read-accessed datasets
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover
          onClick={() =>
            // When user clicks, open modal showing datasets they read
            openUserPrivilegesDetails({
              title: "Read-Accessed Datasets", // Modal title
              detailsType: "userWiseDatasetAccessDetails", // Type tells modal what data to fetch
              detailsValue: row.EXECUTED_BY, // Which user to show details for
              detailsCategory: "READ", // Only show read-access records
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
    {
      key: "datasets_with_write_access", // Database field: datasets accessed for writing/modifying
      label: "Write-Accessed Datasets", // Column header: datasets accessed in write mode
      width: "auto", // Automatically size based on content
      sortable: true, // Enables sorting functionality for the column
      // Custom render: Make clickable to view write-accessed datasets
      render: (value: string, row: any, rowIndex: number) => (
        <Text
          className="cursor-pointer hover:underline" // CSS: pointer cursor and underline on hover (like a link)
          onClick={() =>
            // When user clicks, open modal showing datasets they wrote to
            openUserPrivilegesDetails({
              title: "Write-Accessed Datasets", // Modal title
              detailsType: "userWiseDatasetAccessDetails", // Type tells modal what data to fetch
              detailsValue: row.EXECUTED_BY, // Which user to show details for
              detailsCategory: "WRITE", // Only show write-access records
            })
          }
        >
          {/* Display total login count with commas (e.g., "5,000") or dash if no data */}
          {value != null ? value.toLocaleString() : "-"}
        </Text>
      ),
    },
  ];

  const principalSummaryCards = [
    {
      title: "Total Principals", // Card label: shows total count
      // Count: Extract total_principals number from API data, or show 0 if no data available
      // Real-world: \"There are 150 users/service accounts in the system\"
      count:
        totalPrincipalsCount && totalPrincipalsCount.length > 0
          ? totalPrincipalsCount[0]?.total_principals
          : 0,
      color: "brand" as "brand", // Use brand color for consistent theming
      icon: <People20Filled />, // Show people icon to visually indicate \"Users\"
    },
    {
      title: "Principals with Read Access", // Card label: shows read access count
      // Count: Extract principals_with_read_access number from API data, or show 0 if no data available
      // Real-world: \"100 users have permission to read data\"
      count:
        totalPrincipalsCount && totalPrincipalsCount.length > 0
          ? totalPrincipalsCount[0]?.principals_with_read_access
          : 0,
      color: "brand" as "brand", // Use brand color
      icon: <PeopleEye20Filled />, // Show eye icon to indicate \"read/view\"
      onClick: () =>
        // When user clicks this card, open the accordion showing detailed read-access list
        handleCardClick({
          title: "Principals with Read Access",
          status: "READ", // Filter to show only read-access principals
        }),
    },
    {
      title: "Principals with Write Access", // Card label: shows write access count
      // Count: Extract principals_with_write_access number from API data, or show 0 if no data available
      // Real-world: \"50 users have permission to modify/write data\"
      count:
        totalPrincipalsCount && totalPrincipalsCount.length > 0
          ? totalPrincipalsCount[0]?.principals_with_write_access
          : 0,
      color: "brand" as "brand", // Use brand color
      icon: <PeopleEdit20Filled />, // Show edit icon to indicate \"write/modify\"
      onClick: () =>
        // When user clicks this card, open the accordion showing detailed write-access list
        handleCardClick({
          title: "Principals with Write Access",
          status: "WRITE", // Filter to show only write-access principals
        }),
    },
  ];

  //---------------------- Populate Filter Options -------------------------//

  /**
   * This effect populates the catalog options once the uniqueDatasetList is fetched.
   * - The catalog options are extracted from the `uniqueDatasetList` array and stored in the Zustand store.
   */
  useEffect(() => {
    if (uniqueDatasetList) {
      const catalogs = [
        ...new Set(
          // Example uniqueDatasetList:
          // uniqueDatasetList = [
          //   {CATALOG_NAME: "Sales", SCHEMA_NAME: "Public", DATASET_NAME: "Orders" },
          //   {CATALOG_NAME: "Sales", SCHEMA_NAME: "Private", DATASET_NAME: "Customers" },
          //   {CATALOG_NAME: "Finance", SCHEMA_NAME: "Public", DATASET_NAME: "Revenue" }
          // ]

          // uniqueDatasetList.map(...) → ["Sales", "Sales", "Finance"]
          uniqueDatasetList.map((i: any) => i.CATALOG_NAME), // Unique catalog names
        ),
      ]
        // new Set(...) removes duplicates → ["Sales", "Finance"]
        // .sort() alphabetically → ["Finance", "Sales"]
        .sort(); // Sort the catalog names alphabetically

      // Final catalog options example:
      // ["Finance", "Sales"]
      setCatalogOptions(catalogs); // Set the catalog options in the store
    }
  }, [uniqueDatasetList, setCatalogOptions]);

  /**
   * Effect: Update schema options when catalog selection changes
   *
   * Whenever the user selects a different catalog, this effect:
   * - Gets all schemas available in that catalog
   * - Removes duplicates
   * - Sorts them alphabetically
   *
   * Real-world: Select "New York" store → shows "Sales", "HR", "Finance" departments
   */
  useEffect(() => {
    // If catalog not selected or dataset list not loaded yet
    if (!catalogName || !uniqueDatasetList) {
      setSchemaOptions([]); // Reset schema options
      return;
    }

    // When catalog changes, reset schema to "All"
    // Because schemas from old catalog aren't valid for new catalog
    setSchemaName("All");

    // Extract unique schema names from the selected catalog
    const schemas = [
      ...new Set(
        uniqueDatasetList
          // Example when catalogName = "Sales":
          // Filter returns: [{SCHEMA_NAME: "Public"}, {SCHEMA_NAME: "Private"}]
          .filter((i: any) => i.CATALOG_NAME === catalogName) // Only items from selected catalog
          // Extract just the schema names: ["Public", "Private"]
          .map((i: any) => i.SCHEMA_NAME), // Get schema name from each item
      ),
    ]
      // new Set removes duplicates (if any)
      // .sort() alphabetically: ["Private", "Public"]
      .sort(); // Sort alphabetically for easier browsing

    // Final schema options example when catalog="Sales":
    // ["Private", "Public"]
    setSchemaOptions(schemas); // Update state with sorted unique schemas
  }, [catalogName, uniqueDatasetList, setSchemaOptions]); // Re-run if catalog or dataset list changes

  /**
   * Effect: Update dataset options when schema selection changes
   *
   * Whenever the user selects a different schema, this effect:
   * - Gets all datasets available in that catalog+schema combination
   * - Removes duplicates
   * - Sorts them alphabetically
   *
   * Real-world: Select "Sales" dept in "New York" store → shows datasets like "Orders", "Invoices", "Customers"
   */
  useEffect(() => {
    // If catalog, schema, or dataset list not ready
    if (!catalogName || !schemaName || !uniqueDatasetList) {
      setDatasetOptions([]); // Reset dataset options
      return;
    }

    // When schema changes, reset dataset to "All"
    // Because datasets from old schema aren't valid for new schema
    setDatasetName("All");

    // Extract dataset names matching selected catalog AND schema
    const datasets = [
      ...new Set(
        uniqueDatasetList
          // Example when catalogName="Sales" and schemaName="Public":
          // Filter returns: [{TABLE_NAME: "Orders"}, {TABLE_NAME: "Invoices"}]
          .filter(
            (i: any) =>
              i.CATALOG_NAME === catalogName && i.SCHEMA_NAME === schemaName,
          ) // Only items matching both catalog AND schema
          // Extract just the dataset/table names: ["Orders", "Invoices"]
          .map((i: any) => i.TABLE_NAME), // Get table/dataset name from each item
      ),
    ]
      // new Set removes duplicates (if any)
      // .sort() alphabetically: ["Invoices", "Orders"]
      .sort(); // Sort alphabetically for easier browsing

    // Final dataset options example when catalog="Sales" and schema="Public":
    // ["Invoices", "Orders"]
    setDatasetOptions(datasets); // Update state with sorted unique datasets
  }, [catalogName, schemaName, uniqueDatasetList, setDatasetOptions]); // Re-run if catalog, schema, or dataset list changes


  // ===================================================================
  // Data Refresh using helper function
  // ===================================================================  

  // function to post a request to run the helper function job in databricks
  // it refreshes the data of the impacted dataset details.
  const refreshData = () => {

    // create a payload
    const payload: HelperFunctionsJobPayload = {
      CATALOG_NAME: CATALOG_NAME, // name of catalog
      FUNCTION: "load_executed_databricks_query_history", // function name
    };

    // send post request to perform refresh process
    greatExpectationsService.runHelperFunction(payload)
      .then((response) => {
        addRunId(response?.run_id);
        // Show success notification
        showToast(`Request to refresh the data has been submitted successfully with Run ID: ${response?.run_id}`, undefined, undefined, "top-end"); // show the user message
        // Close the drawer and reset the form
      }).catch((error) => {
        // Log error and show error notification
        console.error("Failed to refresh data:", error);
        // showToast("Failed to create rule.", "error", undefined, "top-end"); // show user message
      });
  };

  /**
   * Handles click on a summary card and opens the corresponding accordion panel with dataset rule types.
   * @param card - An object containing title and status for the selected summary card
   */
  /**
   * Function: Handle click on a summary card
   *
   * When user clicks on "Principals with Read Access" or "Principals with Write Access" card,
   * this function:
   * 1. Saves which card was clicked
   * 2. Opens the accordion panel to show detailed list of principals with that access level
   *
   * Real-world: Click "150 customers" → shows a detailed list of those customer names
   *
   * @param card - Object containing title and status of the clicked card
   */
  const handleCardClick = (card: { title: string; status: string }) => {
    // Set the selected card state (remembers which card the user clicked)
    setSelectedCard(card);
    // Open the accordion panel labeled "DETAILS" to show the detailed list
    setOpenAccordionKey("DETAILS");
  };

  /**
   * Function: Open user privileges details modal
   *
   * When user clicks on a number in the tables (e.g., "10 datasets"),
   * this function opens a popup modal showing detailed information about those items.
   *
   * Real-world: Click "5 datasets" → popup shows list of those 5 datasets with details
   *
   * @param details - Object containing title, type, and value to show in modal
   */
  const openUserPrivilegesDetails = (details: any) => {
    // Store what information to display in the modal
    setSelectedUserPrivilegesDetails(details);
    // Show the modal dialog
    setIsUserPrivilegesDetailsOpen(true);
  };

  /**
   * Filter user access privileges data based on search text
   * useMemo: Optimization - only recalculate when data or search text changes
   *
   * Real-world: User types "john" → table filters to show only John's access records
   * Before: ["john.smith", "jane.doe", "bob.johnson"]
   * After typing "john": ["john.smith", "bob.johnson"] (both contain "john")
   */
  const filteredUserAccessPrivileges = useMemo(() => {
    // Convert search text to lowercase for case-insensitive search
    // So "John", "john", "JOHN" all match the same way
    const searchText = searchUserAccess.toLowerCase();

    // Return only records where PRINCIPAL_NAME contains the search text
    return userAccessPrivileges?.filter(
      (userAccess: any) =>
        userAccess?.PRINCIPAL_NAME?.toLowerCase().includes(searchText), // Check if principal name contains search term
    );
  }, [userAccessPrivileges, searchUserAccess]); // Re-run if data or search changes

  /**
   * Filter user-wise dataset access data based on search text
   * useMemo: Optimization - only recalculate when data or search text changes
   *
   * Real-world: User types "sarah" → table filters to show only Sarah's access records
   */
  const filteredUserWiseDatasetAccess = useMemo(() => {
    // Convert search text to lowercase for case-insensitive search
    const searchText = searchUserWiseDatasetAccess.toLowerCase();

    // Return only records where EXECUTED_BY (user name) contains the search text
    return userWiseDatasetAccess?.filter(
      (datasetAccess: any) =>
        datasetAccess?.EXECUTED_BY?.toLowerCase().includes(searchText), // Check if user name contains search term
    );
  }, [userWiseDatasetAccess, searchUserWiseDatasetAccess]); // Re-run if data or search changes

  // ===================================================================
  // Render
  // ===================================================================

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
      window.location.href="/forbidden";
    }

  return (
    // Root container for the entire User Privileges view
    // This is the outermost HTML div wrapping everything visible on this page
    <div>
      {/* ============ Section 1: Filter Controls ============ */}
      <div className={styles.titleContainer}>
        {/* Page Title */}
        <div className={styles.titleWithButton}>
          <Text size={400} weight="semibold">
            Service Principals / Users Access Summary
          </Text>
        </div>
        {/* Filter Controls Section */}
        <div className={styles.filterContainer}>
          {/* Catalog Name Dropdown */}
          <Field label="Catalog Name">
            <Dropdown
              selectedOptions={[catalogName]} // Currently selected catalog name
              value={catalogName} // Display value in the dropdown
              appearance="filled-darker" // Visual style for the dropdown
              onOptionSelect={(_, option) =>
                // When user picks a catalog, update state and trigger schema/dataset filters to update
                setCatalogName(option?.optionValue || "All")
              }
            >
              {/* Default option: show all catalogs */}
              <Option value="All">All</Option>
              {/* Generate dropdown option for each available catalog */}
              {catalogOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Dropdown>
          </Field>

          {/* Schema Name Dropdown */}
          <Field label="Schema Name">
            <Dropdown
              selectedOptions={[schemaName]} // Currently selected schema name
              value={schemaName} // Display value in the dropdown
              appearance="filled-darker" // Visual style for the dropdown
              onOptionSelect={(_, option) =>
                // When user picks a schema, update state and trigger dataset filter to update
                setSchemaName(option?.optionValue || "All")
              }
            >
              {/* Default option: show all schemas */}
              <Option value="All">All</Option>

              {/* Generate dropdown option for each available schema (from current catalog) */}
              {schemaOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Dropdown>
          </Field>

          {/* Dataset Name Filter Dropdown - Allows user to filter by specific dataset table */}
          <Field label="Dataset Name">
            {/* Dropdown component for selecting a dataset to filter the view. Like selecting a specific table from a catalog */}
            <Dropdown
              selectedOptions={[datasetName]} // Currently selected dataset name stored in state (e.g., "Customers", "Orders", or "All")
              value={datasetName} // Display value of the dropdown showing the current selection
              appearance="filled-darker" // Fluent UI style - darker filled appearance for better visibility
              onOptionSelect={(_, option) =>
                // When user selects a different dataset, update the datasetName state variable
                // This triggers filteredUserAccessPrivileges and filteredUserWiseDatasetAccess useMemo to recalculate
                setDatasetName(option?.optionValue || "All")
              }
            >
              {/* Default "All" option - shows all datasets without filtering. Like "Show all orders regardless of type" */}
              <Option value="All">All</Option>

              {/* Generate dropdown options from available datasets fetched from API */}
              {/* Example: if datasetOptions = ["Customers", "Orders", "Products"], render three Option elements */}
              {datasetOptions.map((item) => (
                <Option key={item} value={item}>
                  {item}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>
      </div>

      {/* Summary Cards Section - Shows overview statistics for principals and dataset access */}
      {isTotalPrincipalsCountLoading ? (
        // While API is fetching the summary data (totalPrincipalsCount, read/write breakdowns), show a loading spinner
        // The spinner gives users feedback that the system is working rather than appearing frozen
        // Example: When user opens the page, this spinner appears for 1-2 seconds while server counts all principals
        <div className="flex min-h-[15vh] items-center justify-center">
          {/* Small spinner with accessible label for screen readers and visual users */}
          {/* "Loading data…" text helps non-technical users understand what the spinner represents */}
          <Spinner size="small" label="Loading data…" />
        </div>
      ) : (
        // Once data is loaded, display the summary cards showing principal counts with read/write access breakdown
        // The Highlights component renders 4-5 cards: Total Principals, Read Access, Write Access, etc.
        // Each card is clickable and triggers openUserPrivilegesDetails modal when clicked
        <Highlights data={principalSummaryCards} />
      )}

      {/* Accordion Section - Shows detailed principal access information when a summary card is clicked */}
      {selectedCard && (
        // Accordion appears only when user has clicked one of the summary cards (selectedCard !== null)
        // This is like clicking "Show Details" button which expands a hidden section
        // Example: User clicks the "5 Read Access" card → accordion appears showing details of those 5 principals
        <Accordion
          multiple={false} // Allow only one accordion panel open at a time (not all panels together - exclusive opening)
          collapsible // Allow accordion panels to collapse when clicked again (can close without opening another)
          openItems={openAccordionKey ? [openAccordionKey] : []} // Control which panel is open based on state (openAccordionKey from handleCardClick)
          onToggle={(_, { openItems }) => {
            // When user clicks accordion header to open/close, this callback fires with the new open panels list
            // Extract the first open panel key (since only one can be open due to multiple={false})
            // Example: openItems = ["DETAILS"] when user opens, openItems = [] when user closes
            const nextKey = (openItems as string[])?.[0] ?? null;
            // Update the accordion state variable to track which panel is open
            // This ensures the panel stays open when component re-renders
            setOpenAccordionKey(nextKey);
          }}
        >
          {/* Accordion Panel Item - Contains the detailed dataset rule/principal access information */}
          <AccordionItem value="DETAILS">
            {/* Accordion Header - Shows the clickable title that expands/collapses the panel */}
            <AccordionHeader>
              {/* Display the selected card title in semibold text. Example: "5 Read Access", "2 Write Access" */}
              <Text size={400} weight="semibold">
                {selectedCard.title}
              </Text>
            </AccordionHeader>

            {/* Accordion Panel - Container for the detailed data that expands when header is clicked */}
            <AccordionPanel>
              {/* DataGrid showing the detailed list of principals with their access details */}
              {/* Example: If user clicked "5 Read Access" card, this grid shows list of 5 principals with read access permissions */}
              {/* Columns are defined in principalsAccessDetailsColumns and include principal name, access type, dataset, etc. */}
              <DataGrid
                columns={principalsAccessDetailsColumns} // Column definitions for the detailed view table
                data={principalsAccessDetails ?? []} // Array of principal access detail records from API query
                loading={isPrincipalsAccessDetailsLoading} // Show loading spinner in table while API is fetching data
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* USER ACCESS PRIVILEGES SUMMARY TABLE - Shows which users have what access to which datasets */}

      {/* Table Title and Search Bar Container */}
      <div className={styles.titleContainer}>
        {/* Section heading - tells users what data is shown below */}
        <Text size={400} weight="semibold">
          User Access Privileges Summary
        </Text>

        {/* Search Box for filtering the user access privileges table by user/principal/identity name */}
        {/* Like searching in Google - type "John" and see only records with John in the name */}
        <SearchBox
          className="w-[20rem]" // Fixed width of 20rem (320px) for consistent layout alignment
          placeholder="Filter by user / principal / identity name..." // Guide text shown when search box is empty to help users understand what they can search
          value={searchUserAccess} // Current search input text from component state
          onChange={(_, data) => {
            // When user types in search box, capture the text and update searchUserAccess state
            // This triggers the filteredUserAccessPrivileges useMemo to recalculate and filter the table data
            // Example: User types "john" → state updates → table re-filters → shows only rows with "john" in any column
            setSearchUserAccess(data.value);
          }}
        />
      </div>

      {/* Data Table showing filtered user access privileges */}
      {/* Displays rows of users with their associated privileges (read/write). Clicking a row opens UserPrivilegesDetailsModal */}
      <DataGrid
        columns={userAccessPrivilegesColumns} // Array of column definitions (user name, principal, dataset, access type, etc.)
        data={filteredUserAccessPrivileges ?? []} // Filtered privilege records based on catalog/schema/dataset/search selections
        loading={isUserAccessPrivilegesLoading} // Show loading spinner in table while API is fetching privilege data
      />

      {/* USER-WISE DATASET ACCESS SUMMARY TABLE - Shows which users accessed which datasets and when */}
      <div className={styles.titleWithButton}>

        {/* Table Title, Search Bar, and Date Range Filter Container */}
        <div className={styles.titleContainerWithFilters}>
          {/* Section heading - tells users this table shows access history by user and dataset */}
          <Text size={400} weight="semibold">
            User Dataset Access Summary
          </Text>

          {/* Search box and date range filter container div */}
          <div className={styles.filterContainer}>
            {/* Date Range Picker for filtering access records by date period */}
            {/* This allows users to see "Who accessed what datasets in the last 30 days?" type queries */}
            <CustomDateRange
              selectedRange={userDatasetAccessDateRange} // Prop: currently selected date range object (startDate, endDate)
              setSelectedRange={setUserDatasetAccessDateRange} // Prop: callback function to update the selected date range when user changes it
            />

            <div>
              {/* Search Box for filtering the user-wise dataset access table by user/principal/identity name */}
              {/* Like searching email inbox - type "alice" and see only messages from/to Alice */}
              <SearchBox
                className="w-[20rem]" // Fixed width of 20rem (320px) for consistent layout alignment
                placeholder="Filter by user / principal / identity name..." // Guide text shown when empty to help users understand searchable fields
                value={searchUserWiseDatasetAccess} // Current search input text from component state
                onChange={(_, data) => {
                  // When user types in search box, capture the text and update searchUserWiseDatasetAccess state
                  // This triggers the filteredUserWiseDatasetAccess useMemo to recalculate filters
                  // Example: User types "alice" → state updates → table re-filters → shows only rows with "alice" in name columns
                  setSearchUserWiseDatasetAccess(data.value);
                }}
              />
            </div>
          </div>

        </div>

        {canManage && (
        <div className="flex gap-2">
          {/* ClusterControl component, passing the function to set cluster running state */}
          <ClusterControl
            setIsClusterRunning={setIsClusterRunning} // set it for enabling/disabling the add rule and suggest rule buttons
          />
          <Tooltip
            content={isClusterRunning ? "Click to Refresh Data" : "The Databricks cluster is down. Please start the cluster first."}
            // Conditional tooltip text based on cluster status
            // If cluster is running: Show normal instruction
            // If cluster is not running: Show warning that cluster must be started first
            relationship="label"
            // Defines how the tooltip relates to its target (as a descriptive label)
            withArrow // shows an arrow pointing to the button
          // Displays a small arrow from tooltip to button for better visual connection
          >
            <Button
              appearance="primary" // Style of the button
              // Primary appearance gives the button prominent blue styling
              icon={isClusterRunning ? <ArrowSyncRegular /> : <LockClosedRegular />} // set icon according to cluster status
              onClick={refreshData} // on clicking the button call this function
              disabled={!isClusterRunning} // disable the button if cluster not running
            >
              Refresh Data
            </Button>
          </Tooltip>
        </div>
        )}

      </div>

      {/* Data Table showing filtered user-wise dataset access records */}
      {/* Displays rows of users, datasets they accessed, and dates/times. Clicking a row opens UserPrivilegesDetailsModal with date range context */}
      <DataGrid
        columns={userWiseDatasetAccessColumns} // Array of column definitions (user name, dataset, access type, timestamp, etc.)
        data={filteredUserWiseDatasetAccess ?? []} // Filtered access records based on catalog/schema/dataset/search/date range selections
        loading={isUserWiseDatasetAccessLoading} // Show loading spinner in table while API is fetching access history data
      />

      {/* USER PRIVILEGES DETAILS MODAL - Detailed popup showing in-depth information when user clicks table rows */}
      {selectedUserPrivilegesDetails && (
        // Modal only renders when a row in either table is clicked, setting selectedUserPrivilegesDetails
        // Like clicking "View Details" on an email - opens a popup window with full email content
        <UserPrivilegesDetailsModal
          open={isUserPrivilegesDetailsOpen} // Boolean state controlling if modal is visible (true=shown, false=hidden)
          onOpenChange={setIsUserPrivilegesDetailsOpen} // Callback function to update modal visibility when user closes it
          title={selectedUserPrivilegesDetails?.title} // Modal title - name of user or principal clicked
          detailsType={selectedUserPrivilegesDetails.detailsType} // Type of details to show - distinguish between userAccessDetails vs userWiseDatasetAccessDetails
          detailsValue={selectedUserPrivilegesDetails.detailsValue} // The specific value context (e.g., "Alice", "Orders dataset", selected principal name)
          detailsCategory={selectedUserPrivilegesDetails.detailsCategory} // Category context for the details (helps modal know what kind of drill-down to show)
          startDate={
            selectedUserPrivilegesDetails?.detailsType ===
              "userWiseDatasetAccessDetails"
              ? userDatasetAccessDateRange?.startDate
              : null
          } // Pass start date only if viewing dataset access details, for filtering by date range
          endDate={
            selectedUserPrivilegesDetails?.detailsType ===
              "userWiseDatasetAccessDetails"
              ? userDatasetAccessDateRange?.endDate
              : null
          } // Pass end date only if viewing dataset access details, ensures detail modal respects user's selected date filter
        />
      )}
    </div>
  );
};
