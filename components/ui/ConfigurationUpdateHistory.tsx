/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script is responsible for rendering the
    "Configuration Table Update History" section within
    the Governance module of the Teva Data Integrity
    Automation Dashboard.

    Key Responsibilities:
    - Displays an audit trail of configuration Table changes.
    - Allows filtering by operation type, updated user, and date range.
    - Visually highlights change types and activation status.
    - Supports compliance, governance, and audit use cases.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

// `@fluentui/react-components` (Fluent UI)
// - What it does: a set of accessible, themeable React UI components and styling utilities from Microsoft.
// - Why used here: provides layout utilities (`makeStyles`, `tokens`) and small UI pieces (`Title3`, `Badge`, `Field`, `Dropdown`, `Option`) used to build the header and filters.
"use client";
import {
  makeStyles,
  tokens,
  Title3,
  Badge,
  Field,
  Dropdown,
  Option,
  Text,
  Dialog, // Component: Main dialog/modal wrapper that creates the popup window
  DialogSurface, // Component: The outer container/frame of the dialog with styling and positioning
  DialogBody, // Component: Container for dialog content (title, body, actions)
  DialogTitle, // Component: Header section of dialog that displays the title and close button
  DialogContent, // Component: Main content area of dialog where data and interactive elements are placed
  Button, // Component: Reusable button component for user interactions (clickable elements)
  Tooltip, // Tooltip shows helpful information when users hover over or focus on an element
  Spinner,
} from "@fluentui/react-components";

// Local reusable data grid abstraction
// - What it does: `DataGrid` renders tabular data with common features (pagination, loading skeletons, column configs).
// - Why used here: to display the configuration update audit records consistently across the app.
import { ColumnConfig, DataGrid } from "./DataGrid";

// Fluent UI icons
// - What they do: small SVG icon components used to visually indicate status.
// - Why used here: `CheckmarkCircleRegular` and `DismissCircleRegular` show active vs inactive state.
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  Dismiss24Filled,
  LockClosedRegular,
  ArrowSyncRegular
} from "@fluentui/react-icons";

// API hooks for governance data
// - What they do: encapsulate fetching and caching logic configuration updates history from the backend.
// - Why used here: provide the data needed to populate filters and table rows.
import {
  useGetUpdateHistory,
} from "@/hooks/useGovernanceService";

// Custom date range selector and its type
// - What it does: provides UI and types for selecting date ranges (preset or custom start/end).
// - Why used here: used as the date filter for audit records.
import { CustomDateRange, DateRangeOption } from "./CustomDateRange";

// React core hook for local component state
// - What it does: `useState` holds component-local values and triggers re-renders when changed.
// - Why used here: to remember filter selections made by the user.
import { useState } from "react";

// Shared helper to format timestamps into human-readable strings
// - What it does: converts raw timestamp values to friendly date/time text.
// - Why used here: to display the "Updated At", "Valid From", and "Valid To" columns in readable format.
import { formatDateTime } from "@/lib/helper";

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
 * useConfigurationUpdateHistoryStyles
 *
 * Defines component-level styles for layout, spacing,
 * and typography to ensure UI consistency.
 */
const useConfigurationUpdateHistoryStyles = makeStyles({
  root: {
    // Root wrapper for the configuration update history page
  },
  header: {
    marginBottom: tokens.spacingVerticalXXL, // Space below header section
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Emphasized page title
    color: tokens.colorNeutralForeground1, // Standard foreground color
  },
  filterContainer: {
    display: "flex", // Horizontal filter layout
    flexWrap: "wrap", // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Spacing between filters
  },
  surface: {
    maxWidth: "85vw", // Max width: 80% of the viewport width for large screens
  },

  // Restricts content height to enable scrolling for large datasets
  content: {
    maxHeight: "80vh", // Max height: 80% of the viewport height to prevent overflow and enable scrolling
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
 * ConfigurationUpdateHistory Component
 *
 * Displays a detailed audit log of all configuration
 * changes made within the system.
 *
 * Why this component is needed:
 * - Provides transparency into system configuration changes.
 * - Supports audit, compliance, and governance workflows.
 * - Enables administrators to track who changed what and when.
 *
 * Sample Input:
 * ```tsx
 * <ConfigurationUpdateHistory />
 * ```
 *
 * Sample Output:
 * - A filterable, paginated table showing:
 *   - Changed column name and value
 *   - Operation type (INSERT / UPDATE / DELETE)
 *   - Updated timestamp and user
 *   - Active status and validity period
 *
 * @returns JSX.Element
 * Rendered configuration update history view.
 */
export const ConfigurationUpdateHistory = () => {
  // -------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------

  // Retrieve scoped styles for this component by calling the `useConfigurationUpdateHistoryStyles` hook.
  // Analogy: this selects the CSS rules the component will apply to its HTML elements.
  const styles = useConfigurationUpdateHistoryStyles();

  // Get the global toast notification function for showing success/error messages
  const { showToast } = useGlobalToast();

  const {canRead, hasPermission, isLoadingPermissions} = usePagePermissions("governance-configuration-update-history");
  const canManageCluster = hasPermission("governance-configuration-update-history-cluster:manage");
  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  /**
   * selectedDateRange
   *
   * Stores the user-selected date range used
   * to filter configuration update records.
   */
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>({
    label: "", // Friendly name for the selected range (e.g., "Last 30 days")
    value: "", // Internal identifier for the selected range
    startDate: null, // Start timestamp for filtering (null means not set)
    endDate: null, // End timestamp for filtering (null means not set)
  });

  // handle the state of the cluster, whether running or not
  const [isClusterRunning, setIsClusterRunning] = useState<boolean>(false);

  const [selectedTable, setSelectedTable] =
    useState<string>("data_quality_config_mng");

  /**
   * selectedUpdatedByEmail
   *
   * Stores which updater's email the table should be filtered by.
   * Default "All" means no filter applied (show all updaters).
   */
  const [selectedUpdatedByEmail, setSelectedUpdatedByEmail] =
    useState<string>("All");

  /**
   * selectedOperationType
   *
   * Stores the chosen operation type (INSERT/UPDATE/DELETE) for filtering.
   * Default "All" means display all operation types.
   */
  const [selectedOperationType, setSelectedOperationType] =
    useState<string>("All");


  // State for update history details modal (whether it is open)
  const [isUpdateHistroyDetailsOpen, setIsUpdateHistroyDetailsOpen] =
    useState(false);
  // State for selected user privileges details to show in the modal
  const [selectedUpdateHistroyDetails, setSelectedUpdateHistroyDetails] =
    useState<any>({});

  // -------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------

  /**
   * OPERATION_FILTER_OPTIONS
   *
   * List of supported configuration change operations
   * displayed in the Operation filter dropdown.
   */
  const OPERATION_FILTER_OPTIONS: string[] = ["INSERT", "UPDATE", "DELETE"];

  // Explanation: `OPERATION_FILTER_OPTIONS` lists allowed operation types for the dropdown.
  // These are the human-facing strings that appear in the Operation filter.

  // -------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------

  /**
   * updateUserEmails
   *
   * Fetch the list of distinct emails that performed configuration updates.
   * It may be undefined while loading.
   */
  const { data: updateUserEmails } = useGetUpdateHistory("listDistinctUsers", selectedTable);

  /**
   * configurationUpdateHistoryQuery
   *
   * Fetch configuration update history records filtered by selected criteria.
   * Destructure the hook return into `configurationUpdateHistoryData` (the rows)
   * and `isConfigurationUpdateHistoryLoading` (boolean for loading state).
   * Note: `startDate!` and `endDate!` use non-null assertion because the hook expects values; ensure the UI prevents calling with null in practice.
   */

  const {
    data: configurationUpdateHistoryData,
    isFetching: isConfigurationUpdateHistoryLoading,
  } = useGetUpdateHistory(
    "updateHistory",
    selectedTable,
    selectedUpdatedByEmail,
    selectedOperationType,
    selectedDateRange.startDate!,
    selectedDateRange.endDate!
  );

  const {
    data: updateHistoryDetails,
    isFetching: isUpdateHistoryDetailsLoading,
  } = useGetUpdateHistory(
    "updateHistoryDetails",
    selectedTable,
    selectedUpdatedByEmail,
    undefined,
    undefined,
    undefined,
    selectedUpdateHistroyDetails?.configId,
    selectedUpdateHistroyDetails?.columnName,
  );

  // -------------------------------------------------------------------
  // Data Grid Column Definitions
  // -------------------------------------------------------------------

  /**
   * configurationUpdateColumns
   *
   * Defines the column configuration for the
   * Configuration Update History data grid.
   */
  const configurationUpdateColumns: ColumnConfig<any>[] = [
    {
      key: "CONFIG_ID", // Unique key for the column
      label: "Config ID", // Header text shown to users for this column
      width: "9%", // Relative column width
      showMore: true, // Allow expanding long values to view the full text
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "RULE_NAME", // Unique key for the column
      label: "Rule/KPI Name", // Header text shown to users for this column
      width: "7%", // Relative column width
      showMore: true, // Allow expanding long values to view the full text
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "DATASET_NAME", // Unique key for the column
      label: "Dataset Name", // Header text shown to users for this column
      width: "11%", // Relative column width
      showMore: true, // Allow expanding long values to view the full text
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "COLUMN_NAME", // Unique key for the column
      label: "Column Name", // Header text shown to users for this column
      width: "8%", // Relative column width
      sortable: true, // Enables sorting functionality for the column
      // Custom render function: Instead of showing raw number, make it clickable like a link
      // Real-world: Like clicking "View Details" to get more information
      render: (value: number, row: any, rowIndex: number) => (
        <Text
          size={200} // Text size
          className="cursor-pointer hover:underline" // CSS classes: make cursor a pointer and underline on hover (like a hyperlink)
          onClick={() =>
            // When user clicks this number, open a details modal showing which workspaces they accessed
            openUpdateHistoryDetails({
              configId: row.CONFIG_ID,
              columnName: row.COLUMN_NAME,
            })
          }
        >
          {value ?? "-"}
        </Text>
      ),
    },
    {
      key: "COLUMN_VALUE", // Unique key for the column
      label: "Column Value", // The new/changed value for the configuration column
      width: "5%", // Width allocation
      showMore: true, // Allow expanding long values
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "OPERATION", // Unique key for the column
      label: "Operation", // The type of change: INSERT / UPDATE / DELETE
      width: "5%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      // `render` returns a JSX element for custom cell rendering.
      // Here we render a colored `Badge` to visually distinguish different operation types.
      render: (value, row, index) => (
        <Badge
          appearance="filled"
          color={
            value === "DELETE"
              ? "danger"
              : value === "UPDATE"
                ? "warning"
                : "brand"
          }
        >
          {value}
        </Badge>
      ), // Visual distinction by operation type
    },
    {
      key: "UPDATED_AT", // Unique key for the column
      label: "Updated At", // Timestamp when the change was made
      width: "7%", // Width allocation
      showMore: true, // Allow expanding long text
      sortable: true, // Enables sorting functionality for the column
      // `getValue` transforms the raw value for display; format the timestamp or show '-' when missing
      getValue: (value: string) => (value ? formatDateTime(value) : "-"),
    },
    {
      key: "UPDATED_BY", // Unique key for the column
      label: "Updated By", // Who performed the change (email/user)
      width: "10%", // Width allocation
      showMore: true, // Allow expanding long names/emails
      sortable: true, // Enables sorting functionality for the column
    },
  ];

  const UpdateHistoryColumns: ColumnConfig<any>[] = [
    {
      key: "COLUMN_VALUE", // Unique key for the column
      label: "Column Value", // The new/changed value for the configuration column
      width: "10%", // Width allocation
      showMore: true, // Allow expanding long values
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "OPERATION", // Unique key for the column
      label: "Operation", // The type of change: INSERT / UPDATE / DELETE
      width: "8%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      // `render` returns a JSX element for custom cell rendering.
      // Here we render a colored `Badge` to visually distinguish different operation types.
      render: (value, row, index) => (
        <Badge
          appearance="filled"
          color={
            value === "DELETE"
              ? "danger"
              : value === "UPDATE"
                ? "warning"
                : "brand"
          }
        >
          {value}
        </Badge>
      ), // Visual distinction by operation type
    },
    {
      key: "UPDATED_AT", // Unique key for the column
      label: "Updated At", // Timestamp when the change was made
      width: "12%", // Width allocation
      showMore: true, // Allow expanding long values
      sortable: true, // Enables sorting functionality for the column
      // `getValue` transforms the raw value for display; format the timestamp or show '-' when missing
      getValue: (value: string) => (value ? formatDateTime(value) : "-"),
    },
    {
      key: "UPDATED_BY", // Unique key for the column
      label: "Updated By", // Who performed the change (email/user)
      width: "17%", // Width allocation
      showMore: true, // Allow expanding long names/emails
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "IS_ACTIVE", // Unique key for the column
      label: "Active", // Whether the configuration is currently active
      width: "4%", // Width allocation
      // Render a green check icon when active, red dismiss icon when inactive
      render: (value, row, index) =>
        value === "true" ? (
          <CheckmarkCircleRegular fontSize={18} color="green" />
        ) : (
          <DismissCircleRegular fontSize={18} color="red" />
        ), // Active/inactive indicator
    },
    {
      key: "VALID_FROM", // Unique key for the column
      label: "Valid From", // Start of the validity period for the configuration value
      width: "12%", // Width allocation
      showMore: true, // Allow expanding long values
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
    },
    {
      key: "VALID_TO", // Unique key for the column
      label: "Valid To", // End of the validity period for the configuration value
      width: "12%", // Width allocation
      showMore: true, // Allow expanding long values
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
    },
    {
      key: "COMMIT_VERSION", // Unique key for the column
      label: "Commit Version", // Header text shown to users for this column
      width: "10%", // Relative column width
      sortable: true, // Enables sorting functionality for the column
    },
  ];


  // ===================================================================
  // Data Refresh using helper function
  // ===================================================================  
  
  // function to post a request to run the helper function job in databricks
  // it refreshes the data of the impacted dataset details.
  const refreshData = () => {
    // create a payload
    const payload: HelperFunctionsJobPayload = {
      CATALOG_NAME: CATALOG_NAME,
      FUNCTION: selectedTable,
    };

    // send post request to perfomr refresh process
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

  // Function to open the details modal with specific information
  // Real-world: Like clicking on a store in Google Maps and a popup appears with more info
  const openUpdateHistoryDetails = (details: any) => {
    // Store which details were clicked so the modal knows what to display
    // Think of it as: "I clicked on user John's 'Workspaces', so remember that for the modal"
    setSelectedUpdateHistroyDetails(details);
    // Signal to the modal component to become visible (open it)
    setIsUpdateHistroyDetailsOpen(true);
  };

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
    // Root container for the configuration update history page
    <div className={styles.root}>
      {/* Header row: title on the left, filters on the right */}
      <div className={styles.header}>
        {/* Page Title: visible heading for the page */}
        <div className={styles.titleWithButton}>
          <Title3 className={styles.title}>Configuration Update History</Title3>
          {canManageCluster && (
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

      </div>

      {/* Filter Controls container holds the dropdowns and date selector */}
      <div className={styles.filterContainer}>
        {/* Table Filter: dropdown listing tables where updates are made */}
        <Field label="Table">
          <Dropdown
            selectedOptions={[selectedTable]} // currently selected operation option
            value={selectedTable} // displayed value in the control
            appearance="filled-darker" // visual style variant
            onOptionSelect={(_, option) => {
              // Update the selected operation when user picks a value
              setSelectedTable(option?.optionValue || "data_quality_config_mng");
              setSelectedUpdatedByEmail("All");
            }}
          >
            <Option value="data_quality_config_mng">data_quality_config_mng</Option>
            <Option value="data_drift_config_mng">data_drift_config_mng</Option>
            <Option value="kpi_quality_config_mng">kpi_quality_config_mng</Option>
          </Dropdown>
        </Field>

        {/* Updated By Filter: dropdown listing users who made updates */}
        <Field label="Updated By">
          <Dropdown
            selectedOptions={[selectedUpdatedByEmail]} // selected email filter
            value={selectedUpdatedByEmail} // shown in the control
            appearance="filled-darker"
            onOptionSelect={(_, option) =>
              // Update the selected updater email state
              setSelectedUpdatedByEmail(option?.optionValue || "All")
            }
          >
            {/* Option to show updates by all users */}
            <Option value="All">All</Option>

            {/* Dynamically render one option per email returned from the API */}
            {(updateUserEmails || []).map((item: any, index: number) => (
              <Option key={index} value={item.UPDATED_BY}>
                {item.UPDATED_BY}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Operation Filter: choose INSERT/UPDATE/DELETE or All */}
        <Field label="Operation">
          <Dropdown
            selectedOptions={[selectedOperationType]} // currently selected operation option
            value={selectedOperationType} // displayed value in the control
            appearance="filled-darker" // visual style variant
            onOptionSelect={(_, option) =>
              // Update the selected operation when user picks a value
              setSelectedOperationType(option?.optionValue || "All")
            }
          >
            {/* Default option to show all operations */}
            <Option value="All">All</Option>

            {/* Render one option per operation type defined in our constant */}
            {OPERATION_FILTER_OPTIONS.map(
              (operation: string, index: number) => (
                <Option key={index} value={operation}>
                  {operation}
                </Option>
              )
            )}
          </Dropdown>
        </Field>

        {/* Date Range Filter: custom component to pick the date window to filter by */}
        <CustomDateRange
          selectedRange={selectedDateRange} // current selected date range
          setSelectedRange={setSelectedDateRange} // function to update the selected range
        />
      </div>

      {/* Main table: the DataGrid receives columns, data, and loading state */}
      <DataGrid
        columns={configurationUpdateColumns} // array describing each table column and formatting
        data={configurationUpdateHistoryData || []} // pass audit rows or empty array while undefined
        loading={isConfigurationUpdateHistoryLoading} // tell DataGrid to show a loading state while data fetching
        loadingRows={5} // number of placeholder Skeleton rows to show during data loading
        defaultPageSize={25} // how many rows to show per page initially
      />

      <Dialog
        open={isUpdateHistroyDetailsOpen} // Is the dialog visible? true = show, false = hide
        onOpenChange={(_, { open: isOpen }) => setIsUpdateHistroyDetailsOpen(isOpen)} // When user closes dialog, call parent function to hide it
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
                  onClick={() => setIsUpdateHistroyDetailsOpen(false)} // When clicked, close the dialog
                />
              }
            >
              {/* Title line 1: The context of what's being shown */}
              {/* Example: "Total Logins", "Workspaces Accessed", "john@company.com" */}
              Update History

              {/* Title line 2: The detail value (smaller text, gray color) */}
              {/* Real-world: Shows "(john@company.com)" under the title for context */}
              <span className="text-sm text-neutral-foreground-2">
                ({selectedUpdateHistroyDetails?.configId} - {selectedUpdateHistroyDetails?.columnName})
              </span>
            </DialogTitle>

            {/* ============ Modal Content Section ============ */}
            <DialogContent className={styles.content}>
              {/* Data Table: displays the detailed login activity records */}
              {/* Real-world: Think of it as a spreadsheet showing login events */}
              <DataGrid
                columns={UpdateHistoryColumns} // Column definitions: tells table what columns to display (User/Workspace, Service, Action, Time)
                data={updateHistoryDetails || []} // Table rows: filtered login data; empty list if no data
                loading={isUpdateHistoryDetailsLoading} // Loading flag: show spinner while fetching from server
              />
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
