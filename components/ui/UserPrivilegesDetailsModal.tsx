/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 February 2026

  Purpose of the script:
    This script defines the UserPrivilegesDetailsModal component - a specialized drill-down
    investigation popup modal used across governance views (UserPrivileges, LoginActivity, etc.)
    in the Teva Data Integrity Automation Dashboard.
    
    When users click on metric counts, summary cards, or table cells in parent governance
    tables, this modal opens to show detailed information about the clicked item. It serves
    as the "zoom in" layer for granular privilege and access investigation.
    
    Real-world analogy: Like clicking a hyperlink in an email - you see a summary, click
    for details, and a detailed popup appears showing comprehensive information.

    Key Responsibilities:

    1. DRILL-DOWN MODAL DISPATCH
       - Receives data context from parent table via props (what was clicked, filter values)
       - Conditionally renders different data based on detailsType prop
       - Examples: userAccessPrivilegesDetails vs. userWiseDatasetAccessDetails
       - Real-world: "Show me all datasets this user has access to" vs. "Show me when user accessed dataset X"

    2. CONTEXT-AWARE DATA FETCHING
       - Calls useGetUserPrivileges hook with exact filter parameters from parent
       - Passes startDate/endDate inherited from parent's date range selection
       - Ensures detail view respects parent table's filter context
       - Real-world: If parent table filtered to "Last 30 days", modal only shows access in that window

    3. FLEXIBLE DETAIL DISPLAY
       - supports multiple detail types through detailsType prop parameter
       - detailsValue specifies which user/principal/dataset is being detailed
       - detailsCategory optional filter (e.g., "READ" vs. "WRITE" access)
       - Displays appropriate title and subtitle based on context
       - Real-world: Click "John" → shows "John (5 datasets)", Click "5 datasets" → shows "(5 records)"

    4. SCROLLABLE DATA GRID RENDERING
       - Render fetched data in a professional DataGrid with pagination support
       - Handles loading states - shows spinner while API call is in progress
       - Gracefully handles empty data (shows empty table with message)
       - Real-world: User clicks during data load → spinner appears → table updates when data arrives

    5. COPY-ENABLED INVESTIGATION SUPPORT
       - DataGrid columns marked as copyable allow users to copy cell values
       - Investigators can copy privilege names, dataset names, principals to paste in reports
       - Useful for compliance documentation, email communication, ticket creation
       - Real-world: Audit manager copies "Alice, Bob, Charlie" from modal → pastes in compliance report

    6. EXPANDED TEXT SUPPORT FOR LONG DATA
       - Columns support showMore property to expand truncated text
       - Privilege lists can be long ("SELECT, INSERT, UPDATE, DELETE, TRUNCATE, GRANT, REVOKE")
       - Shows "..." with expand button - user clicks "Show More" to see full text
       - Real-world: Cell shows "SELECT, INSERT, UPDATE..." → click expand → see full privilege list

    7. MODAL LIFECYCLE MANAGEMENT
       - Uses onOpenChange callback to communicate close events back to parent
       - Parent component controls visibility - modal doesn't manage its own open/closed state
       - Provides dismiss/close button (X) with accessibility labels for screen readers
       - Real-world: User clicks close button → parent table component hides modal and regains focus

    8. ACCESSIBLE POPUP DIALOG STRUCTURE
       - Built with Fluent UI Dialog components ensuring WCAG accessibility compliance
       - Manages focus trap (focus keeps within modal while open, returns to parent on close)
       - Semantic HTML structure for screen readers and keyboard navigation
       - Real-world: Blind user with screen reader can navigate modal, read title, table data, close button

    Use Cases:

    - PRIVILEGE DETAIL INVESTIGATION: Security team clicks "5 Users have Read Access" → modal shows all 5 users with read-only privileges
    - ACCESS VERIFICATION: Manager verifies John was granted correct dataset permissions during onboarding
    - COMPLIANCE AUDIT DETAIL: Auditor clicks dataset count → modal shows which specific datasets user can access
    - INCIDENT SCOPE ANALYSIS: During security incident, click compromised user → see exactly what data they could access
    - OFFBOARDING VALIDATION: HR clicks departing employee → confirm all dataset access will be revoked before account deactivation
    - PRIVILEGE ESCALATION INVESTIGATION: Security clicks over-privileged user → see all datasets they accessed vs. should have accessed
    - AUDIT TRAIL QUERIES: Click "5 accessed datasets in Q1" → modal shows which specific datasets, when, by whom
    - COPY-FOR-DOCUMENTATION: Auditor needs list of users with write access → copies from modal → pastes in audit report
*/

//---------------------- Imports -------------------------//

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides the React.FC (Functional Component) type and hooks for managing component state and side effects.
    - Real-world context: React is the framework that makes this component interactive and reactive to state changes.
*/
import React from "react"; // Core React library for building interactive web components

/*
  useGetUserPrivileges - Custom data-fetching hook
    - What it is: A custom hook that handles API calls to fetch user privilege information.
    - Why used: Centralizes data fetching logic, handles loading/error states, and manages API communication.
    - Real-world context: Like a restaurant server fetching your order details and bringing them to the table.
    - Usage: Called in component with parameters like detailsType, detailsValue, date ranges to fetch privilege data
*/
import { useGetUserPrivileges } from "@/hooks/useGovernanceService"; // Custom hook for fetching user privilege data

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  // Import statement - brings in multiple components from the Fluent UI library
  Dialog, // Dialog wrapper component - creates the modal container structure
  DialogSurface, // DialogSurface component - renders the visual modal box/panel that appears on screen
  DialogBody, // DialogBody component - container for modal content (title + body sections)
  DialogTitle, // DialogTitle component - renders the title bar at top of modal with close button support
  DialogContent, // DialogContent component - main content area inside modal where table/data displays
  Button, // Button component - used for clickable elements like close (X) button in modal
  tokens, // Design tokens object - provides Fluent UI brand colors, sizing, font weights for styling
  makeStyles, // makeStyles hook - CSS-in-JS styling function for creating scoped component styles
} from "@fluentui/react-components"; // Fluent UI React components library - Microsoft's accessible UI component collection

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

//---------------------- Styles -------------------------//

/**
 * useStyles - Custom styling hook for modal component
 *
 * Centralized styling for UserPrivilegesDetailsModal using Fluent UI's CSS-in-JS system.
 * Ensures consistent spacing, typography, and responsive sizing across the modal.
 *
 * Real-world analogy: Like a CSS stylesheet, but written in JavaScript and scoped
 * only to this component. Other components can't accidentally use these styles.
 */
const useStyles = makeStyles({
  // Controls the maximum width of the modal dialog when it opens
  // 80vw = 80% of viewport width (window width), so modal takes up 80% of screen width maximum
  // On mobile (narrow screen): modal uses 80% of available screen width
  // On desktop (wide screen): modal limited to 80% width but doesn't become overwhelming
  // Real-world example: Like setting max-width: 80% on a container in CSS to prevent it from being too wide
  surface: {
    maxWidth: "80vw",
  },

  // Styles applied to the modal title text at the top
  // fontWeightSemibold uses Fluent UI design token for "semibold" weight (bold but not too heavy)
  // Makes title text slightly bold for visual emphasis, helping users see modal title clearly
  // Fluent UI tokens ensure consistency with brand guidelines and theme
  title: {
    fontWeight: tokens.fontWeightSemibold,
  },

  // Restricts the content area height to enable scrolling for large datasets
  // 80vh = 80% of viewport height (window height on user's screen)
  // If data table has many rows, content scrolls vertically within this height constraint
  // Prevents modal from becoming taller than user's screen and pushing content below bottom edge
  // Real-world example: Like setting max-height with overflow: auto in CSS
  // User can scroll down to see more rows without modal disappearing off screen
  content: {
    maxHeight: "80vh",
  },
});

//---------------------- Types -------------------------//

/**
 * UserPrivilegesDetailsModalProps
 *
 * Props (properties/parameters) required to render the UserPrivilegesDetailsModal popup component.
 * This interface defines what information the parent component must pass to this modal.
 *
 * Think of it like ordering from a restaurant - the interface is the order form that specifies
 * what details you need to provide (customer name, dish, quantity, etc.) before the restaurant
 * can prepare and serve your order.
 */
interface UserPrivilegesDetailsModalProps {
  // Controls whether the modal popup is visible on screen (true = shown, false = hidden)
  // Like a light switch: true = on, false = off
  open: boolean;

  // Callback function to update modal visibility when user clicks close or outside the modal
  // Called whenever user wants to close the popup, allowing parent to hide it
  // Real-world example: Like clicking "X" button on a popup to dismiss it
  onOpenChange: (open: boolean) => void;

  // Title text displayed at the top of the modal popup
  // Shows what user/principal name or dataset context is being displayed in detail
  // Example: "John Smith" or "Alice Johnson" or "Customers Dataset" depending on what was clicked
  title: string;

  // Type of details being shown - indicates what kind of drill-down information to fetch
  // Example values: "userAccessDetails", "userWiseDatasetAccessDetails"
  // Helps the API know what kind of data to return (different details for different contexts)
  detailsType: string;

  // Specific value context for the drill-down request
  // Example: If user clicked on "John Smith", this would be "John Smith"
  // Used to filter data and show details specific to this value
  detailsValue?: string;

  // Category or type filter for narrowing down the results displayed
  // Example: "Read Access", "Write Access", or specific privilege type
  // Optional - if not provided, shows all categories without filtering
  detailsCategory?: string;

  // Start date for filtering records (used when showing date-range sensitive data like access history)
  // Example: User selected "Last 30 days" in parent table - this passes that start date
  // Helps ensure detail view respects parent's date filter selection
  startDate?: Date | null;

  // End date for filtering records (complements startDate for date range)
  // Example: If startDate is "March 1, 2026", endDate might be "April 1, 2026"
  // Together with startDate, ensures detail modal shows data only within selected period
  endDate?: Date | null;
}

//---------------------- Component -------------------------//

/**
 * UserPrivilegesDetailsModal Component
 *
 * A popup modal that shows detailed user privilege information in a table format.
 * When user clicks a row in a parent table (UserPrivileges or LoginActivity tables),
 * this modal opens with drill-down details specific to what they clicked.
 *
 * Real-world analogy:
 * - Parent table shows: "10 Users have Read Access"
 * - User clicks "10 Users have Read Access" cell
 * - This modal appears showing: "Name | User1 | User2 | User3..."
 *   (All 10 users listed with their specific privileges)
 */
export const UserPrivilegesDetailsModal: React.FC<
  UserPrivilegesDetailsModalProps
> = ({
  open, // Boolean indicating if modal should be visible (true=show modal, false=hide modal)
  onOpenChange, // Function to call when user closes modal, allows parent to hide it
  title, // Name/label displayed in modal title bar (e.g., "Read Access Details")
  detailsType, // Type of details being shown (different APIs/queries return different data types)
  detailsValue, // Specific value being detailed (like "John Smith" or specific principal name)
  detailsCategory, // Category to filter results (optional way to narrow down the displayed data)
  startDate, // Start date for filtering (when showing time-sensitive data like access logs)
  endDate, // End date for filtering (completes the date range with startDate)
}) => {
  //---------------------- Hooks -------------------------//

  // Load component styles using Fluent UI styling system
  // useStyles is a custom hook that returns CSS-in-JS style objects defined above
  // Example: styles.surface contains max-width and other modal styling rules
  const styles = useStyles();

  // Fetch detailed user privilege data from the backend API
  // useGetUserPrivileges is a custom hook that makes API calls to fetch specific data
  // Based on detailsType, it fetches different kinds of user privilege information
  // Example: If detailsType="userAccessDetails", fetches all privileges for that user
  // Destructure: data = array of records, isFetching = loading state (true while fetching)
  // The hook parameters: what type of details, various filters, date range for filtering
  const { data, isFetching: isLoading } = useGetUserPrivileges(
    detailsType, // Tells API what kind of data to fetch (user access vs dataset access, etc.)
    undefined, // Additional filters (not used in this call, set to undefined)
    undefined, // Additional filters (not used in this call, set to undefined)
    undefined, // Additional filters (not used in this call, set to undefined)
    detailsValue, // Filter: only fetch data for this specific user/principal name
    startDate, // Filter: only fetch records from this date onward
    endDate, // Filter: only fetch records until this date
    detailsCategory, // Filter: only fetch records matching this category (e.g., "Read Access" only)
  );

  //---------------------- Table Configuration -------------------------//

  /**
   * Column definitions for the user privileges detail DataGrid table.
   * Defines what columns appear in the table and how they behave.
   *
   * Think of this like defining columns in a spreadsheet:
   * - First column: Dataset/Table names (e.g., "Customers", "Orders", "Products")
   * - Second column: Privileges/operations allowed (e.g., "Read, Write", "Read Only")
   */
  const userPrivilegesColumns: ColumnConfig<any>[] = [
    {
      // Column identifier - matches the data property name from API response
      // Example: if API returns {name: "Alice", privileges: "Read"}, "name" matches this key
      key: "name",
      // Column header text displayed at top of table
      // Shows "Dataset / Table Name" as the column title
      label: "Dataset / Table Name",
      // Column width - "auto" means width adjusts based on content (not fixed pixel width)
      // Prevents text from being cut off
      width: "auto",
    },
    {
      // Column identifier for the privileges data from API
      // Example: if API returns {name: "Orders", privileges: "Read, Write"}, "privileges" matches this key
      key: "privileges",
      // Column header text displayed at top of table
      // Shows "Privileges / Operations" as the column title
      label: "Privileges / Operations",
      // Column width - "auto" means adjust based on content
      width: "auto",
      // copyable: true enables "copy to clipboard" functionality
      // Users can click a copy icon next to cell content and paste it elsewhere
      // Real-world example: User sees "Read, Write, Execute" and can copy that text to email
      copyable: true,
      // showMore: true enables expand/collapse for long text in cells
      // If privileges text is very long, shows "..." and "Show More" button
      // User can click to expand and see full privileges text
      // Real-world example: Cell shows "Read, Write, Execute..." (truncated)
      //                     User clicks "Show More" → "Read, Write, Execute, Modify, Delete" (full text)
      showMore: true,
    },
  ];

  //---------------------- Render -------------------------//

  return (
    // Dialog component - Fluent UI popup container
    // Provides accessible modal dialog structure with focus management
    <Dialog
      // Controls if dialog is visible (true=show, false=hidden)
      // When this changes from false→true, modal appears; true→false, modal disappears
      open={open}
      // Callback when user tries to close modal (clicks X button or clicks outside modal)
      // Calls parent's onOpenChange function with false to hide modal
      // Like pressing "Close" button - tells parent to hide this component
      onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)}
    >
      {/* DialogSurface - The visual modal container (white box that appears on screen) */}
      <DialogSurface className={styles.surface}>
        {/* DialogBody - Container for all modal content (title + content area) */}
        <DialogBody>
          {/* ============ MODAL TITLE SECTION ============ */}
          {/* Header bar at top of modal showing title and close button */}
          <DialogTitle
            // Apply styling to title text (semibold font weight from Fluent UI tokens)
            className={styles.title}
            // Right-align button (close button X) in title bar
            action={
              // Close button - appears as "X" icon in top-right of modal
              <Button
                // "subtle" appearance = minimal styling, just the icon
                // Not bold/prominent, blends into background
                appearance="subtle"
                // Icon using Fluent UI - Dismiss24Filled icon (X shape)
                icon={<Dismiss24Filled />}
                // Accessibility label for screen readers
                // Screen reader users hear "Close" when focused on this button
                aria-label="Close"
                // When user clicks this X button, close the modal
                // Calls onOpenChange(false) to tell parent to hide modal
                onClick={() => onOpenChange(false)}
              />
            }
          >
            {/* Main title text - shows what details are being displayed */}
            {/* Example: "Read Access Details" or "Alice Johnson" depending on what was clicked */}
            {title}

            {/* Subtitle showing additional context next to title */}
            {/* Smaller gray text in parentheses below main title */}
            {/* Example: "(5 records)" or "(Alice)" providing context about the modal content */}
            <span className="text-sm text-neutral-foreground-2">
              ({detailsValue})
            </span>
          </DialogTitle>

          {/* ============ MODAL CONTENT SECTION ============ */}
          {/* Main body area of modal - where the data table is displayed */}
          <DialogContent className={styles.content}>
            {/* DataGrid component - renders the detail table with user privilege records */}
            {/* Shows privileges information in a scrollable table format */}
            <DataGrid
              // columns prop: defines what columns appear in table and their behavior
              // userPrivilegesColumns specifies: Dataset Name (left), Privileges (right, copyable, expandable)
              columns={userPrivilegesColumns}
              // data prop: array of privilege records fetched from API
              // Example: [{name: "Customers", privileges: "Read"}, {name: "Orders", privileges: "Read, Write"}]
              // || [] means: if data is null/undefined, use empty array (no rows shown)
              data={data || []}
              // loading prop: shows loading spinner while API is fetching data
              // When user first opens modal, "Loading..." spinner appears until API returns data
              // Once data arrives, table rows display and spinner disappears
              loading={isLoading}
            />
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
