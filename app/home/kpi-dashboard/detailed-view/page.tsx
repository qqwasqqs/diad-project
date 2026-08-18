/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script renders the detailed view of KPI metrics within the Teva Data Integrity Automation Dashboard.
    - Displays KPI data based on applied filters (e.g., Brand, KPI, Vendor).
    - Uses a table to show detailed information such as result values, validation statuses, and threshold alerts.
    - Includes a filter UI for users to select KPI parameters and apply them.
    - Shows a loading state and empty state when no data is available or filters aren't applied.

    - The component relies on hooks to fetch data and state management to track applied filters.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid";
// Reusable table and column configuration components for displaying KPI data

/*  
  @/components/ui/KPIDetailedViewFilters
    - What it is: A filter component specifically for the KPI Detailed View.
    - Why used: Provides UI controls for users to select Brand, KPI, and Vendor filters.
*/
import { KPIDetailedViewFilters } from "@/components/ui/KPIDetailedViewFilters";
// Filter component to select Brand, KPI, and Vendor for displaying relevant data

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "@/components/ui/Help";
// Help component to provide tooltips or informational popups

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Text, // Typography component for text
  makeStyles, // Styling hook for custom component styles
  tokens, // Fluent UI design tokens (colors, spacing, fonts)
  Title3, // Typography component for large titles
  Spinner,
} from "@fluentui/react-components";

/*  
  @/hooks/useKpiDashboard
    - What it is: A custom React hook for fetching KPI dashboard data.
    - Why used: Retrieves detailed KPI metrics for developers based on applied filters.
*/
import { useGetDeveloperKPIDetails } from "@/hooks/useKpiDashboard";
// Custom hook to fetch developer-specific KPI details from an API

/*  
  @/store/kpiDetailedViewFiltersStore
    - What it is: A Zustand store module for managing KPI Detailed View filter state.
    - Why used: Accesses the current state of applied filters to determine data visibility.
*/
import { useKPIDetailedViewFilterStore } from "@/store/kpiDetailedViewFiltersStore";
// Custom hook to manage and access the current state of applied filters

/*  
  @fluentui/react-icons
    - What it is: Fluent UI's icon library.
    - Why used: Provides icons for UI elements, such as the info icon in the empty state.
*/
import { Info16Filled } from "@fluentui/react-icons";
import { usePagePermissions } from "@/hooks/hasPagePermissions";
// Icon component for displaying an info icon (used in empty state)

//---------------------- Styles -------------------------//

/**
 * useKPIDetailedViewStyles
 *
 * Custom styling hook for the KPI Detailed View component.
 * It controls the layout and visual design of the various sections.
 */
const useKPIDetailedViewStyles = makeStyles({
  root: {
    // The root container of the detailed KPI view page
    // Can add padding or margins here if needed in future styling
  },
  header: {
    // Header style with title and gap between elements
    marginBottom: tokens.spacingVerticalXXL, // Space below the header
    display: "flex", // Flexbox for horizontal alignment
    alignItems: "center", // Vertically center items
    gap: tokens.spacingHorizontalS, // Spacing between title and help icon
  },
  title: {
    // Title of the detailed view page
    fontWeight: tokens.fontWeightBold, // Bold font for emphasis
    color: tokens.colorNeutralForeground1, // Primary text color
    marginBottom: tokens.spacingVerticalS, // Spacing below the title
  },
  sectionTitle: {
    // Section title for KPI quality execution results
    display: "flex", // Flexbox for horizontal alignment
    alignItems: "center", // Vertically center items
    gap: tokens.spacingHorizontalS, // Spacing between title and help icon
    marginTop: tokens.spacingVerticalL, // Spacing above the section title
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section titles
    color: tokens.colorNeutralForeground1, // Primary text color
  },
  emptyState: {
    // Empty state layout when no filters are selected
    display: "flex", // Flexbox for centering content
    flexDirection: "column", // Vertical stacking of items
    alignItems: "center", // Horizontally center items
    justifyContent: "center", // Vertically center items
    minHeight: "60vh", // Minimum height to center content in viewport
    textAlign: "center", // Center-align text
    color: tokens.colorNeutralForeground2, // Secondary text color
  },
  emptyIcon: {
    // Icon style in the empty state
    marginBottom: tokens.spacingVerticalL, // Space below the icon
    opacity: 0.6, // Slightly faded icon for visual effect
  },
});

//---------------------- Component -------------------------//

/**
 * KPIDetailedView Component
 *
 * This component renders the detailed KPI metrics and includes filter options for users to view specific KPI data.
 * It includes:
 * - A filter section to select Brand, KPI, and Vendor.
 * - A table to show dataset-level KPI information, such as result values and statuses.
 * - An empty state message when no data is available or filters haven't been applied.
 *
 * Why this is needed:
 * - Allows users to explore the quality of KPIs in detail for a specific brand and vendor.
 * - Ensures that KPI data is always filtered by the user's selections, providing a focused view of the information.
 *
 * Sample Input:
 *  Filters applied: Brand → KPI → Vendor
 *
 * Sample Output:
 *  - A table displaying detailed KPI data such as result values, statuses, run frequency, etc.
 *  - An empty state message when no filters are applied.
 */
export default function KPIDetailedView() {
  // Apply custom styles to the component
  const styles = useKPIDetailedViewStyles();

  const {canRead, isLoadingPermissions} = usePagePermissions("kpi-dashboard-detailed-view");  

  // Fetch developer-specific KPI data using the custom hook
  const { developerKPIDetails, isFetching } = useGetDeveloperKPIDetails();

  // Check whether filters have been applied using the store hook
  const canShowData = useKPIDetailedViewFilterStore((state) =>
    state.hasAppliedFilters()
  );

  //---------------------- Table Columns -------------------------//

  /**
   * columns
   *
   * Defines the columns for the DataGrid table that will display the KPI data.
   * - Each column has a key, label, width, and optionally the "showMore" flag to allow expanding content.
   */
  const columns: ColumnConfig<any>[] = [
    { key: "CATALOG_NAME", label: "Catalog Name", width: "8%", sortable: true },
    { key: "SCHEMA_NAME", label: "Schema Name", width: "auto", sortable: true },
    { key: "DATASET_NAME", label: "Dataset Name", width: "auto", sortable: true },
    { key: "DATA_SOURCE", label: "Data Source", width: "auto", sortable: true },
    { key: "TARGET_COLUMN", label: "Target Column", width: "auto", sortable: true },
    { key: "RESULT_VALUE", label: "Result Value", width: "5%", sortable: true },
    { key: "RESULT_STATUS", label: "Result Status", width: "5%", sortable: true },
    {
      key: "KPI_UNIQUE_IDENTIFIER",
      label: "KPI Unique Identifier",
      width: "7%",
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "KPI_UNIQUE_IDENTIFIER_VALUE",
      label: "KPI Unique Identifier Value",
      width: "auto",
      sortable: true, // Enables sorting functionality for the column
    },
    { key: "RUN_FREQUENCY", label: "Run Frequency", width: "6%", sortable: true },
    {
      key: "ALERT_THRESHOLD",
      label: "Alert Threshold",
      width: "12%",
      showMore: true,
      sortable: true, // Enables sorting functionality for the column
    },
    { key: "KPI_DETAILS", label: "KPI Details", width: "18%", showMore: true },
  ];

  //---------------------- Render the Component -------------------------//

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
    <div className={styles.root}>
      {/* Header Section */}
      <div className={styles.header}>
        <Title3 className={styles.title}>Detailed View</Title3>
        {/* Title for the detailed KPI view page */}
      </div>

      {/* Filters Section */}
      {/* The filter component allows users to select Brand, KPI, and Vendor */}
      <KPIDetailedViewFilters />

      {/* Conditional Rendering for Data Display */}
      {canShowData ? (
        <div className="detailed kpi data">
          {/* Section Title */}
          <div className={styles.sectionTitle}>
            {/* Title text for the KPI quality execution results section */}
            <Text size={400} weight="semibold">
              KPI Quality Execution Results
            </Text>
            {/* Help component provides extra context and instructions for the data */}
            <Help info="This section displays detailed KPI execution results based on the selected filters (Brand, KPI, and Vendor). It includes dataset-level information, result values, alert thresholds, and validation status to help identify data quality issues and ensure KPI accuracy." />
          </div>

          {/* Data Table for KPI Results */}
          {/* DataGrid component renders the table with KPI data, handling the loading state */}
          <DataGrid
            columns={columns} // Column definitions for the table
            data={developerKPIDetails || []} // Data to be displayed in the table
            loading={isFetching} // Loading state while data is being fetched
          />
        </div>
      ) : (
        //  Empty State
        <div className={styles.emptyState}>
          {/* Display icon when no filters are applied */}
          <Info16Filled fontSize={48} className={styles.emptyIcon} />
          {/* Empty state title */}
          <Text size={500} weight="semibold" block>
            No KPI filters selected
          </Text>
          {/* Text message instructs the user to apply filters */}
          <Text size={300} className="mt-4 max-w-md text-center!">
            Please select a <strong>Brand → KPI → Vendor</strong> using the
            filters above and click <strong>Apply</strong> to explore KPI
            quality insights.
          </Text>
        </div>
      )}
    </div>
  );
}
