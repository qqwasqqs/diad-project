/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 27 January 2026

  Purpose of the script:
    This script defines the KPI Configuration Management page of the Teva Data Integrity Dashboard. 
        - It provides a user interface for managing KPI configurations, 
        - including filtering by various attributes, viewing details, and adding new configurations.
        - The page integrates with backend APIs to fetch configuration data and supports interactions such as viewing and editing KPI details.
        
    Key features:
        - Cluster control to manage Databricks cluster state and see real-time Cluster events streamed on the UI
        - Dynamic filtering of KPI configurations based on attributes like Brand, KPI Name, Data Vendor, Frequency, and Unique Identifiers
        - Data grid display of KPI configurations with pagination and loading states
        - Modal dialogs for adding new KPI configurations and viewing/editing existing configuration details
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Button, // Fluent UI Button component for rendering interactive buttons in the UI, such as the "Add KPI Configuration" button and action buttons in the data grid.
  makeStyles, // Fluent UI styling utility for creating custom styles for the component, allowing for consistent design and theming across the KPI Configuration Management page.
  Title3, // Fluent UI typography component for rendering the page title and section titles with consistent styling and hierarchy.
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography across the component, ensuring adherence to design guidelines and a cohesive look and feel.
  Field, // Fluent UI Field component for rendering labeled form fields, used in the filter section to group dropdowns with their respective labels for better accessibility and user experience.
  Dropdown, // Fluent UI Dropdown component for rendering dropdown menus in the filter section, allowing users to select filter criteria such as Brand, KPI Name, Data Vendor, etc., to dynamically filter the displayed KPI configurations in the data grid.
  Option, // Fluent UI Option component used within Dropdowns to define the selectable options for each filter criterion, enabling users to choose from available values fetched from the backend.
  Text, // Fluent UI Text component for rendering regular text elements in the UI, such as labels, descriptions, or any non-heading text content on the KPI Configuration Management page.
  Tooltip, // Fluent UI Tooltip component for providing contextual help and guidance to users when they hover over certain UI elements, such as the "Add KPI Configuration" button, to enhance usability and understanding of the page's features and actions.
  Spinner,
} from "@fluentui/react-components"; // Fluent UI styling and typography utilities

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help and guidance for users on the KPI Configuration Management page, enhancing usability and understanding of features.
*/
import { Help } from "@/components/ui/Help";
// Help component to provide tooltips or informational popups

/*  
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
// Importing ColumnConfig type to define the structure of table columns
// Importing DataGrid component to display datasets in a table format with features like pagination
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid";

/*
  @/hooks/useGreatExpectations
    - What it is: Custom React hooks for fetching KPI configuration data and filter options from the backend.
    - Why used: Encapsulates data fetching logic related to KPI configurations, allowing the component to easily retrieve necessary data while keeping the UI code clean and focused on presentation.
*/
import {
  TableAddRegular, // Icon for adding a new table entry, used in the "Add KPI Configuration" button to visually indicate the action of adding a new configuration.
  EyeRegular, // Icon representing "view" or "details", used in the Action column of the KPI configurations table to indicate that clicking the button will allow the user to view more details about a specific KPI configuration.
  LockClosedRegular, // Icon representing a locked state, used in the "Add KPI Configuration" button when the Databricks cluster is down to visually indicate that the action is currently unavailable.
} from "@fluentui/react-icons";
// Importing icons from Fluent UI for use in buttons and actions within the component

/* 
    react
    - What it is: A React hook for adding state to functional components.
    - Why used: Manages the state of various interactive elements on the KPI Configuration Management page, such as filter selections, modal open/close states, and cluster running status, enabling dynamic UI updates based on user interactions.
*/
import { useState } from "react";

/*
    @/hooks/useGreatExpectations
    - What it is: Custom React hooks for fetching KPI configuration data and filter options from the backend.
    - Why used: Encapsulates data fetching logic related to KPI configurations, allowing the component to easily retrieve necessary data while keeping the UI code clean and focused on presentation.
*/
import {
  useGetKPIConfigurationFilters, // Custom hook to fetch available filter options for KPI configurations (e.g., brands, KPIs, vendors)
  useGetKPIConfigurations, // Custom hook to fetch the list of KPI configurations based on selected filters
} from "@/hooks/useGreatExpectations";
// Importing custom hooks to fetch KPI configuration data and filter options from the backend API, enabling the component to display dynamic data based on user-selected filters.

/*
    @/components/ui/AddKPIConfigDrawer
    - What it is: A drawer component that provides a form for adding new KPI configurations.
    - Why used: Allows users to input details for a new KPI configuration in a structured format, enhancing the user experience when adding configurations.
*/
import { AddKPIConfigDrawer } from "@/components/ui/AddKPIConfigDrawer";
// Importing the AddKPIConfigDrawer component, which is a UI element that slides in from the side of the screen to provide a form for users to add new KPI configurations. This component is used to enhance the user experience by providing a dedicated space for inputting new configuration details without navigating away from the main page.

/*
    @/components/ui/ClusterControl
    - What it is: A component that allows users to control the state of the Databricks cluster (e.g., start, stop) and displays real-time cluster events.
    - Why used: Provides users with the ability to manage the Databricks cluster directly from the KPI Configuration Management page, ensuring they can start the cluster when needed to add or manage KPI configurations, and stay informed about cluster status through real-time event streaming.
*/
import { ClusterControl } from "@/components/ui/ClusterControl";
// Importing the ClusterControl component, which provides functionality for users to manage the state of the Databricks cluster (such as starting or stopping it) and displays real-time events related to the cluster. This integration allows users to ensure the cluster is running when they need to add or manage KPI configurations, and keeps them informed about the cluster's status directly from the KPI Configuration Management page.

/*
    @/components/ui/KPIConfigDetailsModal
    - What it is: A modal dialog component that displays detailed information about a specific KPI configuration and allows for editing.
    - Why used: Enables users to view and edit the details of an existing KPI configuration in a focused interface, improving the user experience when managing configurations and ensuring that all relevant information is easily accessible.
*/
import { KPIConfigDetailsModal } from "@/components/ui/KPIConfigDetailsModal";
import { usePagePermissions } from "@/hooks/hasPagePermissions";
// Importing the KPIConfigDetailsModal component, which is a modal dialog that displays detailed information about a specific KPI configuration and allows users to edit the configuration. This component enhances the user experience by providing a dedicated space for viewing and managing the details of each KPI configuration without cluttering the main page.

//---------------------- Styling -------------------------//

/**
 * useRulesManagementStyles
 * - A hook that defines and returns styles for the KPI Configuration Management page using Fluent UI's makeStyles utility.
 * - Styles are organized by component sections such as header, search box, titles, and filters to maintain a clean and consistent design.
 */
const useRulesManagementStyles = makeStyles({
  /**
   * Header section style
   * - Provides spacing below the page header
   */
  header: {
    display: "flex", // Flexbox for horizontal layout of header elements
    justifyContent: "space-between", // Space between title and action buttons
    alignItems: "center", // Vertically center items in the header
    marginBottom: tokens.spacingVerticalXXL, // Space between header and content
  },
  /**
   * Search box style
   * - Fixed width to maintain consistent layout regardless of content
   */
  searchBox: {
    width: "20rem", // Fixed width for the search box to maintain consistency
  },

  /**
   * Page title style
   * - Emphasizes primary page heading
   */
  title: {
    fontWeight: tokens.fontWeightBold, // Makes title visually prominent
    color: tokens.colorNeutralForeground1, // Primary text color
    marginBottom: tokens.spacingVerticalS, // Small spacing below title
  },

  /**
   * Section title style
   * - Used for labeling major sections within the page
   * - Aligns title text and help icon horizontally
   */
  sectionTitle: {
    display: "flex", // Enables horizontal layout
    alignItems: "center", // Vertically centers items
    gap: tokens.spacingHorizontalS, // Space between text and help icon
    fontWeight: tokens.fontWeightSemibold, // Slight emphasis for section labels
    color: tokens.colorNeutralForeground1, // Consistent text color
    marginTop: tokens.spacingVerticalXXL,
  },
  filter: {
    display: "flex", // Flexbox for arranging items
    flexWrap: "wrap", // Wraps the items onto multiple lines when needed
    gap: tokens.spacingHorizontalL, // Spacing between filter fields
    marginTop: tokens.spacingVerticalL, // Adds margin at the top
    marginBottom: tokens.spacingVerticalL, // Adds margin at the bottom
    alignItems: "end", // Aligns items to the bottom
  },
});

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * KPIConfiguration Component
 * - Main component for the KPI Configuration Management page.
 * - Manages state for filters, cluster status, and modal visibility.
 * - Fetches KPI configuration data and filter options using custom hooks.
 * - Renders the UI including header, filters, data grid, and modals for adding/viewing KPI configurations.
 *
 * Key functionalities:
 * - Cluster control to manage Databricks cluster state and see real-time Cluster events streamed on the UI
 * - Dynamic filtering of KPI configurations based on attributes like Brand, KPI Name, Data Vendor, Frequency, and Unique Identifiers
 * - Data grid display of KPI configurations with pagination and loading states
 * - Modal dialogs for adding new KPI configurations and viewing/editing existing configuration details
 * - Integrates with backend APIs to fetch and manage KPI configuration data, providing a comprehensive interface for users to oversee their KPI setups.
 * - Enhances user experience with contextual help, dynamic UI updates based on cluster status, and structured data presentation.
 *
 * Overall, this component serves as the central hub for users to manage their KPI configurations effectively within the Teva Data Integrity Dashboard.
 *
 * @returns JSX.Element - The rendered KPI Configuration Management page component.
 */
export default function KPIConfiguration() {
  // Initialize styles using the custom hook defined above
  const styles = useRulesManagementStyles();

  const {canRead, hasPermission, isLoadingPermissions} = usePagePermissions("kpi-config-management");
  const canManageKPI = hasPermission("kpi-config-management-cluster:manage");

  // Fetch filter options for KPI configurations using a custom hook
  const { filtersData } = useGetKPIConfigurationFilters();
  // State to track whether the Databricks cluster is currently running, which affects the availability of certain actions on the page (e.g., adding new KPI configurations).
  const [isClusterRunning, setIsClusterRunning] = useState(false);
  // State to control the visibility of the "Add KPI Configuration" drawer, which allows users to input details for a new KPI configuration.
  const [isAddKPIConfigOpen, setIsAddKPIConfigOpen] = useState(false);
  // State to control the visibility of the KPI Configuration Details modal, which displays detailed information about a specific KPI configuration and allows for editing.
  const [isKPIConfigDetailsOpen, setIsKPIConfigDetailsOpen] = useState(false);
  // State to hold the details of the currently selected KPI configuration when viewing or editing its details in the modal.
  const [kpiConfig, setKpiConfig] = useState<any>({});
  // State variables to hold the current filter selections for Brand, KPI Name, Data Vendor, Frequency, KPI Unique Identifier, and KPI Unique Identifier Value. These states are used to fetch and display the relevant KPI configurations based on the user's filter choices.
  // State variable to hold the selected Brand filter value, initialized to "All" to indicate that all brands are shown by default. This state is used to fetch and display KPI configurations based on the selected brand filter.
  const [brand, setBrand] = useState("All");
  // State variable to hold the selected KPI filter value, initialized to "All" to indicate that all KPIs are shown by default. This state is used to fetch and display KPI configurations based on the selected KPI filter.
  const [kpi, setKpi] = useState("All");
  // State variable to hold the selected Data Vendor filter value, initialized to "All" to indicate that all vendors are shown by default. This state is used to fetch and display KPI configurations based on the selected Data Vendor filter.
  const [vendor, setVendor] = useState("All");
  // State variable to hold the selected Frequency filter value, initialized to "All" to indicate that all frequencies are shown by default. This state is used to fetch and display KPI configurations based on the selected Frequency filter.
  const [frequency, setFrequency] = useState("All");
  // State variable to hold the selected KPI Unique Identifier filter value, initialized to "All" to indicate that all unique identifiers are shown by default. This state is used to fetch and display KPI configurations based on the selected KPI Unique Identifier filter.
  const [kpiUniqueIdentifier, setKpiUniqueIdentifier] = useState("All");
  // State variable to hold the selected KPI Unique Identifier Value filter value, initialized to "All" to indicate that all unique identifier values are shown by default. This state is used to fetch and display KPI configurations based on the selected KPI Unique Identifier Value filter.
  const [kpiUniqueIdentifierValue, setKpiUniqueIdentifierValue] =
    useState("All");
  // Fetch KPI configurations based on the current filter selections using a custom hook. The hook returns the list of KPI configurations that match the selected filters, as well as a loading state to indicate whether the data is currently being fetched.
  const { kpiConfigurations, isFetching } = useGetKPIConfigurations(
    brand, // Pass the selected Brand filter value to fetch KPI configurations based on the brand
    kpi, // Pass the selected KPI filter value to fetch KPI configurations based on the KPI name
    vendor, // Pass the selected Data Vendor filter value to fetch KPI configurations based on the data vendor
    frequency, // Pass the selected Frequency filter value to fetch KPI configurations based on the reporting frequency
    kpiUniqueIdentifier, // Pass the selected KPI Unique Identifier filter value to fetch KPI configurations based on the unique identifier
    kpiUniqueIdentifierValue, // Pass the selected KPI Unique Identifier Value filter value to fetch KPI configurations based on the unique identifier value
  );

  /**
   * kpiConfigColumns
   * - Defines the column configuration for the DataGrid that displays KPI configurations.
   * - Each column has a key, label, width, and an optional render function for custom cell rendering (e.g., action buttons).
   * - The Action column includes a button that allows users to view details of a specific KPI configuration by opening the KPIConfigDetailsModal when clicked.
   */
  const kpiConfigColumns: ColumnConfig<any>[] = [
    { key: "BRAND", label: "Brand Name", width: "auto", sortable: true },
    // Column for displaying the brand name associated with each KPI configuration, with an automatic width to accommodate varying brand name lengths.
    { key: "KPI_NAME", label: "KPI Name", width: "auto", sortable: true },
    // Column for displaying the name of the KPI associated with each configuration, with an automatic width to accommodate varying KPI name lengths.
    { key: "DATA_SOURCE", label: "Data Source", width: "auto", sortable: true },
    // Column for displaying the data source from which the KPI is derived, with an automatic width to accommodate varying data source name lengths.
    { key: "DATA_VENDOR", label: "Data Vendor", width: "10%", sortable: true },
    // Column for displaying the data vendor providing the data for the KPI, with a fixed width of 10% to maintain a consistent layout.
    { key: "RUN_FREQUENCY", label: "Frequency", width: "8%", sortable: true },
    // Column for displaying the reporting frequency of the KPI (e.g., daily, weekly), with a fixed width of 8% to maintain a consistent layout.
    {
      key: "KPI_UNIQUE_IDENTIFIER", // Column key for the unique identifier of the KPI configuration
      label: "KPI Unique Identifier", // Column label for the unique identifier of the KPI configuration
      sortable: true, // Enables sorting functionality for the column
      width: "10%", // Fixed width of 10% to maintain a consistent layout while allowing enough space for typical unique identifier values. This column helps differentiate between KPIs that may have similar names but different contexts or dimensions by displaying a unique identifier associated with each KPI configuration.
    }, // Column for displaying the unique identifier associated with the KPI, which helps differentiate between KPIs that may have similar names but different contexts or dimensions. The fixed width of 10% ensures a consistent layout while allowing enough space for typical unique identifier values.
    {
      key: "KPI_UNIQUE_IDENTIFIER_VALUE", // Column key for the value of the unique identifier associated with the KPI configuration
      label: "KPI Unique Identifier Value", // Column label for the value of the unique identifier associated with the KPI configuration
      sortable: true, // Enables sorting functionality for the column
      width: "10%", // Fixed width of 10% to maintain a consistent layout while accommodating typical unique identifier values. This column provides additional context to distinguish between different KPI configurations that may share the same unique identifier but have different values, such as different product lines, regions, or customer segments.
    }, // Column for displaying the value of the unique identifier associated with the KPI, providing additional context to distinguish between different KPI configurations. The fixed width of 10% maintains a consistent layout while accommodating typical unique identifier values.
    { key: "KPI_FORMAT", label: "KPI Format", width: "8%", sortable: true },
    // Column for displaying the format of the KPI (e.g., percentage, currency), with a fixed width of 8% to maintain a consistent layout while allowing enough space for typical format descriptions.
    {
      key: "THRESHOLD_DERIVATION_METHOD", // Column key for the method used to derive thresholds for the KPI
      label: "Threshold Derivation Method", // Column label for the method used to derive thresholds for the KPI
      sortable: true, // Enables sorting functionality for the column
      width: "10%", // Fixed width of 10% to maintain a consistent layout while providing enough space for typical method descriptions. This column helps users understand how the thresholds for the KPI are determined, whether through historical data analysis, industry benchmarks, or other methodologies, which is crucial for interpreting the KPI's performance and making informed decisions based on its values.
    }, // Column for displaying the method used to derive thresholds for the KPI (e.g., historical data analysis, industry benchmarks), with a fixed width of 10% to maintain a consistent layout while providing enough space for typical method descriptions.
    {
      key: "action", // Column key for the action buttons related to each KPI configuration
      label: "Action", // Column label for the action buttons related to each KPI configuration
      width: "10%", // Fixed width of 10% to maintain a consistent layout while providing enough space for the action buttons. This column allows users to perform actions related to each KPI configuration, such as viewing details or editing the configuration, directly from the data grid.
      render: (value, row, index) => (
        // Render a "View" button in the Action column for each row, which allows users to view details of the specific KPI configuration. When clicked, it triggers the handleManage function, passing the current row's data to open the KPIConfigDetailsModal with the relevant information.
        <Button
          size="small" // Small size for the action button to fit well within the table cell
          appearance="subtle" // Subtle appearance to differentiate action buttons from primary actions on the page, while still being noticeable for users looking to manage specific KPI configurations.
          icon={<EyeRegular />} // Eye icon to visually indicate that this button allows users to view details of the KPI configuration, enhancing the user experience by providing a clear visual cue for the button's functionality.
          onClick={() => handleManage(row)} // Click handler to manage the KPI configuration, which opens the details modal with the selected configuration's information.
        >
          {/* Label for the View button in the Action column */}
          View
        </Button>
      ),
    },
  ];

  /**
   *
   * @param kpiConfig
   * - handleManage function is called when the "View" button in the Action column of the KPI configurations table is clicked. It takes the selected KPI configuration as an argument, sets it in the state, and opens the KPIConfigDetailsModal to display the details of that specific configuration.
   * - This function allows users to view and manage the details of a specific KPI configuration by opening a modal dialog with the relevant information when they click the "View" button associated with that configuration in the data grid.
   * @returns void
   */
  const handleManage = (kpiConfig: any) => {
    // Set the selected KPI configuration in the state to be used in the KPIConfigDetailsModal
    setKpiConfig(kpiConfig);
    // Open the KPIConfigDetailsModal to display the details of the selected KPI configuration
    setIsKPIConfigDetailsOpen(true);
  };

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
    }
  
  if(!isLoadingPermissions && !canRead){
    window.location.href = "/forbidden";
  }

  return (
    <div>
      {/* Main container → Think of this as the full page wrapper (like a screen or dashboard panel) */}

      <div className={styles.header}>
        {/* Header section → Top bar of the page (like a website navbar) */}

        <div>
          {/* Left side of header → Contains title */}

          <Title3 className={styles.title}>KPI Configuration Management</Title3>
          {/* Page title → Like the heading of a report or dashboard */}
        </div>

        {canManageKPI && (
        <div className="flex gap-4">
          {/* Right side of header → Contains controls (buttons, toggles)
            "flex gap-4" means items are arranged horizontally with spacing */}

          <ClusterControl setIsClusterRunning={setIsClusterRunning} />
          {/* Cluster control component → Like turning ON/OFF a machine before using it
            Example: You cannot use a washing machine unless power is ON */}

          <Tooltip
            content={
              isClusterRunning
                ? "Click to add KPI configuration"
                : "The Databricks cluster is down. Please start the cluster first."
            } // Tooltip message → Shows helper text when user hovers over button
            relationship="label" // Accessibility → Helps screen readers understand the button
            withArrow //  Adds a small arrow to tooltip UI
          >
            {/* Button to add KPI configuration*/}
            <Button
              appearance="primary" // Makes button visually important (like a main action button)
              icon={
                // Icon changes based on cluster status → Like a traffic light indicating if you can go or not
                isClusterRunning ? <TableAddRegular /> : <LockClosedRegular />
                // If cluster is running → show "Add" icon, if not → show "Lock" icon to indicate action is unavailable
              }
              // Icon changes dynamically:
              //   - If system is ON → show "Add" icon
              //   - If OFF → show "Lock" icon
              //     Real-world: Locked door vs open door */}

              onClick={() => setIsAddKPIConfigOpen(true)}
              // When clicked → opens "Add KPI" panel
              // Example: Clicking "Add Product" in Amazon admin */}

              disabled={!isClusterRunning}
              // Button disabled if cluster is OFF
              // Example: You can't start a car if engine is off */}
            >
              Add KPI Configuration
            </Button>
          </Tooltip>
        </div>
        )}
      </div>

      <div className={styles.filter}>
        {/* Filter section → Like filters in Amazon (Brand, Price, etc.) */}

        {/* Brand Dropdown */}
        <Field label="Brand Name">
          {/* Field wrapper → Provides label + input grouping */}
          <Dropdown
            placeholder="Select Brand" // Placeholder text → What user sees before selecting
            value={brand || ""} // Current selected value
            selectedOptions={brand ? [brand] : []} // Dropdown expects array → so we wrap value in []
            appearance="filled-darker" // Styling → darker background
            disabled={filtersData?.BRANDS?.length === 0} // Disable dropdown if no data available Example: If no brands exist, you can't select
            onOptionSelect={(_, dropdown) =>
              // When user selects an option → update the brand state with the selected value
              setBrand(dropdown.optionValue ?? "")
            }
            //   When user selects → update state Example: Selecting "Nike" updates filter
          >
            <Option value="All">All</Option>
            {/* Default option → shows all data */}
            {(filtersData?.BRANDS || []).map((item) => (
              // Dynamically create options based on available brands from filtersData
              // Example: If filtersData has brands like Nike, Adidas → it creates options for each
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
            {/* Dynamically create options
              Example: Loop through brands like Nike, Adidas */}
          </Dropdown>
        </Field>

        {/* KPI Dropdown */}
        <Field label="KPI Name">
          {/* Wrapper field with label for KPI dropdown */}
          <Dropdown
            placeholder="Select KPI" // Placeholder text when nothing is selected
            value={kpi || ""} // Controlled value of dropdown (fallback to empty string)
            selectedOptions={kpi ? [kpi] : []} // Selected option must be an array
            appearance="filled-darker" // Styling variant of dropdown
            disabled={filtersData?.KPI_NAMES?.length === 0} // Disable if no KPI data available
            onOptionSelect={(_, dropdown) => setKpi(dropdown.optionValue ?? "")} // Update state when option is selected
          >
            <Option value="All">All</Option> {/* Default "All" option */}
            {/* Default option → shows all data */}
            {(filtersData?.KPI_NAMES || []).map(
              (
                item, // Loop through KPI list
              ) => (
                // Each option uses item as key and value
                // Display KPI name
                <Option key={item} value={item}>
                  {item}
                </Option>
              ),
            )}
          </Dropdown>
        </Field>

        {/* Vendor Dropdown */}
        <Field label="Data Vendor">
          {/* Label for vendor dropdown */}
          <Dropdown
            placeholder="Select Vendor" // Placeholder text
            value={vendor || ""} // Controlled value
            selectedOptions={vendor ? [vendor] : []} // Selected option array
            appearance="filled-darker" // Styling
            disabled={filtersData?.DATA_VENDORS?.length === 0} // Disable if no vendor data
            onOptionSelect={
              (_, dropdown) => setVendor(dropdown.optionValue ?? "") // Update vendor state
            }
          >
            <Option value="All">All</Option> {/* Default option */}
            {/* Default option → shows all data */}
            {(filtersData?.DATA_VENDORS || []).map(
              (
                item, // Loop vendors
              ) => (
                // Unique key and value for each vendor option
                // Display vendor for each vendor option
                <Option key={item} value={item}>
                  {item}
                </Option>
              ),
            )}
          </Dropdown>
        </Field>

        {/* KPI Unique Identifier */}
        <Field label="KPI Unique Identifier">
          {/* Label for KPI identifier */}
          <Dropdown
            placeholder="Select KPI Unique Identifier" // Placeholder
            value={kpiUniqueIdentifier || ""} // Controlled value
            selectedOptions={kpiUniqueIdentifier ? [kpiUniqueIdentifier] : []} // Selected array
            appearance="filled-darker" // Styling
            disabled={filtersData?.KPI_UNIQUE_IDENTIFIERS?.length === 0} // Disable if empty
            onOptionSelect={
              (_, dropdown) =>
                setKpiUniqueIdentifier(dropdown.optionValue ?? "") // Update identifier state
            }
          >
            <Option value="All">All</Option> {/* Default */}
            {/* Default option → shows all data */}
            {(filtersData?.KPI_UNIQUE_IDENTIFIERS || []).map(
              (
                item, // Loop identifiers
              ) => (
                // Unique key and value for each identifier option
                // Display identifier for each option
                <Option key={item} value={item}>
                  {item}
                </Option>
              ),
            )}
          </Dropdown>
        </Field>

        {/* KPI Unique Identifier Value */}
        {/* <Field label="KPI Unique Identifier Value">
          // Label
          <Dropdown
            placeholder="Select KPI Unique Identifier Value" // Placeholder
            value={kpiUniqueIdentifierValue || ""} // Controlled value
            selectedOptions={
              kpiUniqueIdentifierValue ? [kpiUniqueIdentifierValue] : [] // Selected array
            }
            appearance="filled-darker" // Styling
            disabled={filtersData?.KPI_UNIQUE_IDENTIFIER_VALUES?.length === 0} // Disable if no data
            onOptionSelect={
              (_, dropdown) =>
                setKpiUniqueIdentifierValue(dropdown.optionValue ?? "") // Update state
            }
          >
            <Option value="All">All</Option> // Default
            // Default option → shows all data
            {(filtersData?.KPI_UNIQUE_IDENTIFIER_VALUES || []).map(
              (
                item, // Loop values
              ) => (
                // Unique key and value for each identifier value option
                // Display identifier value for each option
                <Option key={item} value={item}>
                  {item}
                </Option>
              ),
            )}
          </Dropdown>
        </Field> */}

        {/* Frequency Dropdown */}
        <Field label="Frequency">
          {/* Label for frequency */}
          <Dropdown
            placeholder="Select Frequency" // Placeholder
            value={frequency || ""} // Controlled value
            selectedOptions={frequency ? [frequency] : []} // Selected array
            appearance="filled-darker" // Styling
            disabled={filtersData?.RUN_FREQUENCIES?.length === 0} // Disable if no data
            onOptionSelect={
              (_, dropdown) => setFrequency(dropdown.optionValue ?? "") // Update frequency state
            }
          >
            <Option value="All">All</Option> {/* Default */}
            {/* Default option → shows all data */}
            {(filtersData?.RUN_FREQUENCIES || []).map(
              (
                item, // Loop frequencies
              ) => (
                // Unique key and value for each frequency option
                // Display frequency for each option
                <Option key={item} value={item}>
                  {item}
                </Option>
              ),
            )}
          </Dropdown>
        </Field>
      </div>

      {/* Section Title */}
      <div className={styles.sectionTitle}>
        {/* Section header → Like "Results" section in report */}

        <Text size={400} weight="semibold">
          KPI Configurations
        </Text>
        {/* Title for table */}

        <Help info="This page displays all configured KPIs..." />
        {/* Help icon → shows explanation when hovered
          Example: Like info icon (?) in forms */}
      </div>

      {/* Data Table */}
      <DataGrid
        columns={kpiConfigColumns} // Defines columns like Excel headers
        data={kpiConfigurations ?? []} // Table data → rows of the table, defaults to empty array if no data
        loading={isFetching} // Shows loader while fetching data
        defaultPageSize={25} //  Shows 25 rows per page
        loadingRows={5} // Placeholder rows while loading
      />
      {!isLoadingPermissions && canManageKPI && (
        <>
        <AddKPIConfigDrawer
        // Add KPI Drawer 
        open={isAddKPIConfigOpen} // Controls visibility of drawer
        filtersData={filtersData ?? {}} // Pass filter data inside drawer
        onOpenChange={(open) => setIsAddKPIConfigOpen(open)}
        // Handles open/close
      />

      {/* KPI Details Modal */}
      <KPIConfigDetailsModal
        open={isKPIConfigDetailsOpen} // Controls modal visibility
        isClusterRunning={isClusterRunning} // Pass cluster status to conditionally allow edits
        onOpenChange={setIsKPIConfigDetailsOpen} //  Handles modal close
        kpiConfig={kpiConfig} // Pass selected KPI data to modal for display/editing
        canManage={canManageKPI}
        />
        </>
        )}
    </div>
  );
}
