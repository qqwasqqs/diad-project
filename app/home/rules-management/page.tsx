/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 January 2026

  Purpose of the script:
    This script defines the Rules Management page of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides a UI for configuring and managing data integrity rules.
    - Allows users to define dataset-level validation rules.
    - Explains rule configuration purpose using contextual help.
    - Acts as an entry point for creating, updating, and maintaining rules.

    This page is a client component because:
    - It uses interactive UI elements.
    - It relies on client-side hooks and form state management.
*/

//---------------------- Client Component Directive ----------------------//

// Ensures that this component uses client-side rendering (CSR)
// This directive tells Next.js to render this component on the client side (browser) instead of server side
// It's needed because this component uses interactive features like state, event handlers, and user input
"use client";

// ---------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
// Importing a custom Help component that shows tooltip information when users hover over or click on a help icon
import { Help } from "@/components/ui/Help"; // Tooltip-based help component for user guidance

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
// Importing Button component to create clickable action buttons
import {
  Button,       // Clickable action trigger
  makeStyles,   // Creates scoped component styles
  // makeStyles is a function that creates CSS classes specific to this component
  // It helps organize styles and prevents CSS conflicts with other components
  SearchBox,    // Search input with built-in UX
  // SearchBox is a pre-built search input field with search icon and clear button
  Title3,       // Section or page heading text style
  // Title3 is a text component styled for section headings (specific size and weight)
  tokens,       // Fluent design tokens (colors, spacing, etc.)
  // tokens is an object containing design system values like colors, spacing, and font sizes
  // Example: tokens.colorNeutralForeground1 gives a standard text color
  Text,         // Standard text component
  // Text is a generic component for displaying text with consistent styling
  Tooltip,      // Contextual hint on hover or focus
  Spinner,
  // Tooltip shows helpful information when users hover over or focus on an element
} from "@fluentui/react-components"; // Fluent UI styling and typography utilities

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
// Importing useState hook to manage component state (like search text, dialog visibility)
// Importing useMemo hook to optimize performance by memoizing computed values
import { useState, useMemo } from "react";

/*
  @/types/rule
    - What it is: // TypeScript type defined for rule management.
    - Why used:  Used for the expected structure of data returned by the API.
*/
// Importing the TypeScript type that defines the structure of a Dataset object
// This ensures type safety when working with dataset data
import { Dataset } from "@/types/rule";

/*  
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
// Importing ColumnConfig type to define the structure of table columns
// Importing DataGrid component to display datasets in a table format with features like pagination
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
// Importing icons to display visual elements in buttons and UI
import {
  TableAddRegular,    // Add a new table or table-related item
  // Icon showing a table with a plus sign, used for "Register Dataset" button
  SettingsRegular,    // Settings or configuration access
  // Icon showing a gear/cog, used for "Manage" button to configure rules
  LockClosedRegular,  // Locked or restricted state indicator
  // Icon showing a closed lock, used when cluster is down and actions are disabled
} from "@fluentui/react-icons";

/*  
  next/link
    - What it is: Next.js Link component for client-side navigation.
    - Why used: Enables navigation to manage rules of each dataset.
*/
// Importing Link component for navigation between pages without full page reload
// Link provides faster navigation and better user experience
import Link from "next/link";

/*  
  @/constants/routes
    - What it is: A module containing route constants for navigation.
    - Why used: Provides a constant for the manage configured rules view route.
*/
// Importing the route constant that defines the base path for rules management pages
// Using constants instead of hardcoded strings prevents typos and makes routes easier to update
import { RULES_MANAGEMENT_ROUTE } from "@/constants/routes";

/*  
  @/hooks/useGreatExpectations
    - What it is: A custom hook that fetches registered datasets for rule management.
    - Why used: Fetches the datasets for managing rules in the system.
*/
// Importing the custom hook that fetches the list of registered datasets from the API
// This hook handles the API call and returns the data along with loading state
import { useGetDataQualityRegistedDatasets } from "@/hooks/useGreatExpectations";

/**
 * @/components/ui/ClusterControl
 *  - What it is: A custom component which shows the event stream of Databricks cluster.
 *  - Why used: Provide live stream of the Databricks cluster events.
 */
// Importing a component that displays cluster status and allows users to start/stop the cluster
import { ClusterControl } from "@/components/ui/ClusterControl";

/*
  @/components/ui/RegisterDatasetDialog
    - What it is: Custom component which shows a dialog to register dataset.
    - Why used:  Used to register a new dataset for rule configuration.
*/
// Importing the dialog component that allows users to register new datasets
// This component shows a modal form for entering dataset information
import { RegisterDatasetDialog } from "@/components/ui/RegisterDatasetDialog";
import { usePagePermissions } from "@/hooks/hasPagePermissions";


// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useRulesManagementStyles
 *
 * Defines component-scoped styles using Fluent UI's makeStyles.
 * Centralizes layout, spacing, and visual consistency.
 */
// Creating a custom hook that generates CSS class names for styling this component
// makeStyles ensures these styles are scoped to this component and don't affect other parts of the app
const useRulesManagementStyles = makeStyles({
  /**
   * Header section style
   * - Provides spacing below the page header
   * - Aligns header content (title, actions) horizontally with spacing
   */
  // Defining styles for the header section at the top of the page
  header: {
    display: "flex", // Enables flexible box layout for header
    // Using flexbox to arrange header children (title and action buttons) horizontally
    justifyContent: "space-between", // Distributes space between header items
    // Pushes the title to the left and action buttons to the right with space between
    alignItems: "center", // Vertically centers header items
    // Ensures the title and buttons are aligned at the same vertical height
    marginBottom: tokens.spacingVerticalXXL, // Space between header and content
    // Adds large vertical spacing below the header to separate it from the content
  },

  /**
   * Search box style
   * - Provides specific width for the search box component
   */
  // Defining styles for the search box input field
  searchBox: {
    width: "19rem", // Defines a fixed width for the search box
    // Sets the search box to 19rem (approximately 304 pixels) wide for consistent sizing
  },

  /**
   * Page title style
   * - Emphasizes primary page heading
   * - Gives the title bold and prominent visual styling
   */
  // Defining styles for the main page title "Rules Management"
  title: {
    fontWeight: tokens.fontWeightBold, // Makes title visually prominent with bold font
    // Using bold font weight to make the title stand out
    color: tokens.colorNeutralForeground1, // Primary text color (dark/neutral)
    // Using the standard text color from the design system
    marginBottom: tokens.spacingVerticalS, // Small spacing below title
    // Adds a small gap between the title and the description text below it
  },

  /**
   * Section title style
   * - Used for labeling major sections within the page
   * - Aligns title text and help icon horizontally
   */
  // Defining styles for section headings like "Registered Enterprise Datasets"
  sectionTitle: {
    display: "flex", // Enables horizontal layout for the title and icon
    // Using flexbox to arrange the section title text and help icon horizontally
    alignItems: "center", // Vertically centers the text and help icon
    // Ensures the text and icon are aligned at the same vertical height
    gap: tokens.spacingHorizontalS, // Space between section title and help icon
    // Adds small horizontal spacing between the title text and help icon
    fontWeight: tokens.fontWeightSemibold, // Slight emphasis for section labels with semi-bold font
    // Using semi-bold font to make section titles noticeable but less prominent than the page title
    color: tokens.colorNeutralForeground1, // Consistent text color across sections
    // Using the same text color as other text for consistency
    marginBottom: tokens.spacingVerticalS, // Small spacing below title
  },

  /**
   * Message container style
   * - Wraps messages in a flex container with vertical layout
   * - Adds spacing between each message
   */
  // Defining styles for containers that hold multiple messages or notifications
  messageContainer: {
    display: "flex", // Enables flexible box layout
    // Using flexbox to arrange messages
    flexDirection: "column", // Aligns child elements vertically
    // Stacking messages vertically (one on top of another)
    gap: "10px", // Adds consistent vertical spacing between messages
    // Adds 10 pixels of space between each message
  },
});

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * RulesManagement Component
 *
 * This component renders the Rules Management page, which allows
 * users to configure and manage data integrity rules.
 *
 * Why this component is needed:
 * - Centralizes rule configuration in one place.
 * - Enables consistent and governed data validation.
 * - Acts as the foundation for enforcing data integrity standards.
 *
 * Sample Input:
 * ```tsx
 * <RulesManagement />
 * ```
 *
 * Sample Output:
 * - Page with a title "Rules Management"
 * - Section explaining rule configuration
 * - Interactive rule configuration form
 *
 * @returns JSX.Element
 * A fully styled Rules Management page.
 */
// Defining the main functional component for the Rules Management page
// This component doesn't take any props - it's a standalone page component
export default function RulesManagement() {
  // -------------------------------------------------------------------
  // Hooks
  // -------------------------------------------------------------------

  /**
   * styles
   * Stores generated class names from Fluent UI makeStyles.
   * Required to apply consistent styling across the component.
   */
  // Calling the custom styles hook to get the CSS class names
  // These class names will be used in className attributes throughout the component
  const styles = useRulesManagementStyles();

  const {canRead, hasPermission, isLoadingPermissions} = usePagePermissions("rules-management");
  const canRegisterDataset = hasPermission("rules-management-register-dataset-cluster:manage");
  const canManageDatasetRules = hasPermission("rules-management-manage-rules:read");

  // Fetching registered datasets from the API using a custom hook
  // - `registeredDatasets`: Contains the list of datasets that have been registered
  // - `isFetchingRegisteredDatasets`: Indicates the loading state while fetching the datasets
  // Calling the custom hook that fetches the list of all registered datasets from the backend
  const { registeredDatasets, isFetchingRegisteredDatasets } = useGetDataQualityRegistedDatasets();
  // registeredDatasets: Array of dataset objects containing information like business unit, catalog, schema, etc.
  // Example: [{L1_BUSINESS_UNIT: "Sales", CATALOG_NAME: "main", SCHEMA_NAME: "customer_data", ...}, ...]
  // isFetchingRegisteredDatasets: Boolean that is true while the API call is in progress, false when complete

  // State to track the search input value
  // - `search`: Stores the current value of the search field for filtering datasets
  // Creating a state variable to store the text entered in the search box
  const [search, setSearch] = useState("");
  // search: String containing the current search query (empty string initially)
  // setSearch: Function to update the search value when user types
  // Example: If user types "sales", search will be "sales"

  // State to track status of the cluster
  // - `isClusterRunning` : Boolean value indicating whether cluster is running or not
  // Creating a state variable to track if the Databricks cluster is running or stopped
  const [isClusterRunning, setIsClusterRunning] = useState(false);
  // isClusterRunning: Boolean that is true when cluster is running, false when stopped
  // setIsClusterRunning: Function to update the cluster status
  // Initially set to false assuming cluster is not running

  // State to manage the visibility of the registration form
  // - `isRegisterOpen`: Boolean value indicating whether the registration form is open or closed
  // Creating a state variable to control whether the Register Dataset dialog is visible
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  // isRegisterOpen: Boolean that is true when dialog is visible, false when hidden
  // setIsRegisterOpen: Function to show/hide the dialog
  // Initially set to false so the dialog is hidden when page loads


  // Configuration for the columns in the DataGrid displaying data health information
  // Each column is configured with a key, label, width, and optional custom render logic
  // Defining the structure of columns that will appear in the datasets table
  // Each object in this array represents one column with its properties
  const registeredDatasetsColumns: ColumnConfig<any>[] = [
    // Column for L1 Business Unit
    // - `key`: Unique identifier for the column in the dataset
    // - `label`: Display label shown at the top of the column
    // - `width`: Defines the width of the column (fixed percentage or auto)
    // Defining the first column which displays the Level 1 Business Unit name
    {
      key: "L1_BUSINESS_UNIT",
      // The property name in the dataset object to display in this column
      // Example: Will show the value from row.L1_BUSINESS_UNIT
      label: "L1 Business Unit",
      // The text shown in the column header at the top of the table
      width: "12%",
      // This column takes up 12% of the table width
      sortable: true, // Enables sorting functionality for the column
    },

    // Column for Catalog Name
    // Defining the second column which displays the catalog name
    {
      key: "CATALOG_NAME",
      // The property name in the dataset object for catalog
      label: "Catalog Name",
      // The text shown in the column header
      width: "10%",
      // This column takes up 10% of the table width
      sortable: true, // Enables sorting functionality for the column
    },

    // Column for Schema Name
    // Defining the third column which displays the schema name
    {
      key: "SCHEMA_NAME",
      // The property name in the dataset object for schema
      label: "Schema Name",
      // The text shown in the column header
      width: "auto", // Automatically adjusts width based on content
      // This column width adjusts automatically based on available space and content
      sortable: true, // Enables sorting functionality for the column
    },

    // Column for Dataset Name
    // Defining the fourth column which displays the dataset name (table name, view name, or file path)
    {
      key: "DATASET_NAME",
      // The property name in the dataset object for dataset name
      label: "Dataset Name",
      // The text shown in the column header
      width: "auto", // Automatically adjusts width based on content
      // This column width adjusts automatically based on available space
      sortable: true, // Enables sorting functionality for the column
    },

    // Column for Dataset Type
    // Defining the fifth column which displays the type of dataset (TABLE, VIEW, or FILE)
    {
      key: "DATASET_TYPE",
      // The property name in the dataset object for dataset type
      label: "Dataset Type",
      // The text shown in the column header
      width: "10%",
      // This column takes up 10% of the table width
      sortable: true, // Enables sorting functionality for the column
    },

    // Column showing the total number of rules associated with each dataset
    // Defining the sixth column which displays how many rules are configured for each dataset
    {
      key: "rule_count",
      // The property name in the dataset object for rule count
      label: "Total Rules",
      // The text shown in the column header
      width: "8%",
      // This column takes up 8% of the table width
      sortable: true, // Enables sorting functionality for the column
    },
    
  ];

  const registeredDatasetsColumnsWithManageColumn: ColumnConfig<any>[] = canManageDatasetRules ? [
    ...registeredDatasetsColumns,
    // Column for the Action button that triggers the navigation to manage rules for a dataset
    // - Custom rendering logic to dynamically generate the URL based on the dataset type
    // Defining the last column which contains a "Manage" button for each dataset
    {
      key: "action",
      // A special key for action buttons (not mapped to data property)
      label: "Action",
      // The text shown in the column header
      width: "12%",
      // This column takes up 12% of the table width
      render: (value, row, index) => {
        // Custom function to render the content of this column
        // value: The value for this cell (not used here since it's an action button)
        // row: The entire dataset object for this row
        // index: The row number in the table

        // Determine the URL for managing the dataset based on its type (FILE, TABLE, or VIEW)
        /**
         * Sample Input: 
         *      row = {
                      "L1_BUSINESS_UNIT": "US Commercial",
                      "CATALOG_NAME": "",
                      "SCHEMA_NAME": "",
                      "DATASET_NAME": "abfss://cdw@stvywiudapnaceunodev.dfs.core.windows.net/source_data/monthly/SHS_Payer_Spine_20251202.txt.gz",
                      "DATASET_TYPE": "FILE",
                      "rule_count": 1
                  },
         */
        // Constructing the URL for the manage rules page based on dataset type
        const url = row.DATASET_TYPE === "FILE"
          // Checking if the dataset type is FILE
          ? `${RULES_MANAGEMENT_ROUTE}/${row.L1_BUSINESS_UNIT}?datasetName=${row.DATASET_NAME}` // For FILE, use a simplified URL format
          // For FILE type: /rules-management/US-Commercial?datasetName=path/to/file.txt
          // Files use query parameter because the file path might contain special characters
          : `${RULES_MANAGEMENT_ROUTE}/${row.L1_BUSINESS_UNIT}/${row.CATALOG_NAME}/${row.SCHEMA_NAME}/${row.DATASET_NAME}`; // For TABLE and VIEW, include catalog and schema names in the URL
        // For TABLE/VIEW type: /rules-management/US-Commercial/main/customer_data/users_table
        // Tables and views use path parameters because they have structured catalog/schema/table names

        // Return the button wrapped in a Link component that redirects the user to the manage rules page
        // Creating a clickable link with a button inside
        return (
          <Link href={url}> {/* Link to manage rules */}
            {/* Link component enables navigation to the URL we constructed above */}
            <Button size="small" appearance="subtle" icon={<SettingsRegular />}> {/* Button with a settings icon */}
              {/* Button with small size, subtle styling (not prominently colored) */}
              {/* icon prop displays the settings gear icon before the button text */}
              Manage {/* Button text */}
              {/* Text displayed on the button */}
            </Button>
          </Link>
        );
      },
    },
  ]
  : registeredDatasetsColumns;

  /**
   * Filters the registered datasets based on the search query.
   * - `useMemo` is used to memoize the filtered dataset results to optimize performance.
   * - The filtering logic checks if any of the dataset fields (name, schema, or catalog) include the search text.
     Example: 

  */
  // Using useMemo to filter the datasets based on the search query
  // useMemo prevents unnecessary re-filtering when other state changes
  const filteredDatasets = useMemo(() => {
    // This function runs only when registeredDatasets or search changes
    return registeredDatasets?.filter(
      // Using the filter method to create a new array with only matching datasets
      // The ? (optional chaining) prevents errors if registeredDatasets is null/undefined
      (d: Dataset) =>
        // For each dataset 'd' in the array, check if it matches the search query
        d.DATASET_NAME.toLowerCase().includes(search.toLowerCase()) || // Check if dataset name matches the search
        // Converting both dataset name and search to lowercase for case-insensitive matching
        // Example: "Sales_Data" matches search "sales"
        d.SCHEMA_NAME.toLowerCase().includes(search.toLowerCase()) || // Check if schema name matches the search
        // Checking if the schema name contains the search text
        d.CATALOG_NAME.toLowerCase().includes(search.toLowerCase()) // Check if catalog name matches the search
      // Checking if the catalog name contains the search text
      // The || (OR) operator means if ANY of these fields match, the dataset is included
    );
  }, [registeredDatasets, search]); // Recompute whenever `registeredDatasets` or `search` changes
  // Dependency array: Re-run the filtering only when registeredDatasets or search changes
  // This optimization prevents filtering on every render, improving performance

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
    // Returning the JSX that renders the Rules Management page
    <div>
      {/* Main container div for the entire page content */}
      {/* Header Section */}
      {/* Creating the header section with title and action buttons */}
      <div className={styles.header}>
        {/* Applying the header styles we defined earlier (flex layout, spacing, etc.) */}
        <div>
          {/* Container for the title and description on the left side of header */}
          {/* Title and Description for the page */}
          {/* Displaying the main page title */}
          <Title3 className={styles.title}>Rules Management</Title3>
          {/* Title3 component with "Rules Management" text, styled with bold font and margin */}
          <div className="text-neutral-foreground-2 text-sm mt-1">
            {/* Subtitle/description with neutral color, small text size, and top margin */}
            Manage data quality rules across enterprise datasets
            {/* Description text explaining the purpose of this page */}
          </div>
        </div>
        {canRegisterDataset && (
        <div className="flex gap-4">
          {/* Container for action buttons on the right side of header */}
          {/* flex: Arranges children (search box, cluster control, register button) horizontally */}
          {/* gap-4: Adds spacing between each element */}

          {/* ClusterControl component, passing the function to set cluster running state */}
          {/* Rendering the cluster control component that shows cluster status and controls */}
          <ClusterControl
            setIsClusterRunning={setIsClusterRunning}
          // Passing our state setter function so ClusterControl can update cluster status
          // When cluster starts/stops, this function will be called to update our state
          />

          {/* Button to open the dialog for registering a new dataset */}
          {/* Wrapping the register button in a tooltip to show helpful information */}
          <Tooltip
            content={isClusterRunning ? "Click to Register Dataset" : "The Databricks cluster is down. Please start the cluster first."}
            // Conditional tooltip text based on cluster status
            // If cluster is running: Show normal instruction
            // If cluster is not running: Show warning that cluster must be started first
            relationship="label"
            // Defines how the tooltip relates to its target (as a descriptive label)
            withArrow // shows an arrow pointing to the button
          // Displays a small arrow from tooltip to button for better visual connection
          >
            {/* button to toggle register dataset dialog  */}
            {/* Creating the Register Dataset button */}
            <Button
              appearance="primary" // Style of the button
              // Primary appearance gives the button prominent blue styling
              icon={isClusterRunning ? <TableAddRegular /> : <LockClosedRegular />} // set icon according to cluster status
              // Conditional icon: Shows table-add icon when cluster is running, lock icon when cluster is down
              onClick={() => setIsRegisterOpen(true)} // Open the Register Dataset dialog
              // When button is clicked, set isRegisterOpen to true to show the dialog
              disabled={!isClusterRunning} // disable it if cluster is not running
            // Button is disabled (grayed out and not clickable) when cluster is not running
            // !isClusterRunning means "NOT cluster running" - if false, button is disabled
            >
              Register Dataset
              {/* Button text */}
            </Button>
          </Tooltip>
        </div>
        )}
      </div>

      {/* Section for displaying a summary of registered datasets */}
      {/* Creating the section title above the datasets table */}
      <div className={styles.sectionTitle}>
        {/* Applying the sectionTitle styles (flex layout, gap, semi-bold font) */}
        {/* Title of the section */}
        {/* Displaying the section heading text */}
        <Text size={400} weight="semibold">
          {/* Text component with size 400 (medium-large) and semi-bold weight */}
          Registered Enterprise Datasets
          {/* Section title text */}
        </Text>
        {/* Help icon with additional description of the section */}
        {/* Adding a help icon that shows detailed information about this section */}
        <Help info="This table provides an overview of all registered datasets across each Level 1 Business Unit, allowing you to view the catalog, schema, and dataset name at a glance. It also shows the dataset type and the total number of data quality rules applied, helping you quickly understand where rules are already configured and where additional attention may be needed. Click Manage to view, add, or update data quality rules for a specific dataset." />
        {/* Help component displays an info icon with a detailed tooltip explaining the table's purpose */}
      </div>

      {/* Search Box for filtering datasets */}
      {/* Creating the search input field */}
      <SearchBox
        className={styles.searchBox} // set style of the searchBox
        // Applying the searchBox styles we defined (width: 19rem)
        placeholder="Filter by catalog, schema or dataset..."
        // Placeholder text shown when search box is empty
        value={search} // value of searchBox
        // Controlling the search box value with our search state variable
        // This makes it a controlled component - React manages its value
        onChange={(_, data) => {
          // Function that runs when user types in the search box
          // First parameter (_) is the event object (not used, so named with underscore)
          // Second parameter (data) contains the new value
          setSearch(data.value); // Update the search state on change
          // Updating the search state with the new typed value
          // This will trigger re-filtering of the datasets
        }}
      />

      {/* DataGrid to display the summary of registered datasets */}
      {/* Rendering the data table that shows all registered datasets */}
      <DataGrid
        columns={registeredDatasetsColumnsWithManageColumn} // Columns to be displayed in the grid
        // Passing the column configuration array we defined earlier
        // This determines what columns appear and how they're formatted
        data={filteredDatasets ?? []} // Data to populate the table
        // Passing the filtered datasets array as the table data
        // ?? [] means if filteredDatasets is null/undefined, use empty array instead
        // This prevents errors when data hasn't loaded yet
        loading={isFetchingRegisteredDatasets} // Loading state
        // Passing the loading state from our API hook
        // When true, DataGrid shows loading skeleton rows
        defaultPageSize={10} // Number of rows per page
        // Setting pagination to show 10 datasets per page
        // Users can navigate between pages if there are more than 10 datasets
        loadingRows={5} // Number of rows to show while loading
      // While loading, show 5 skeleton rows as placeholder
      />

      {/* Define register dataset component ni the page  */}
      {/* Rendering the Register Dataset dialog component */}
      <RegisterDatasetDialog
        open={isRegisterOpen} // state variable storing the value whether dialogbox is open or not
        // Passing the open state to control dialog visibility
        // When true, dialog is visible; when false, dialog is hidden
        setIsRegisterOpen={(open) => setIsRegisterOpen(open)} // set state if the dialog is open or not
      // Passing a callback function so the dialog can close itself
      // When user clicks cancel or closes the dialog, this function updates our state
      // The arrow function receives the new open value and passes it to setIsRegisterOpen
      />
    </div>
  );
}