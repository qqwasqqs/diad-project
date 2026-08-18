/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script represents the `DataDrift` component for the Teva Data Integrity Automation Dashboard.
    - This component displays data drift metrics and rule details for the selected dataset.
    - It provides an overview of data drift indicators such as median, standard deviation, variance, and data drift tests.
    - It also provides detailed information about rules applied to the dataset, which can be filtered by result status (Passed or Failed).
    - The layout includes two main sections: Data Drift Summary (L1 Table) and Rule Details (L2 Table).
*/

//---------------------- Imports and Types -------------------------//

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Importing custom DataGrid component and column configuration type

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  makeStyles, // Fluent UI hook for creating custom styles
  Text, // Fluent UI Text component for displaying text with various styles
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography
  Dropdown, // Dropdown component for selection of options
  Field, // Field component to label inputs and group them with specific styles
  Option, // Option component to represent each item in the dropdown
} from "@fluentui/react-components"; // Fluent UI components

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "./Help"; // Component to show help text for each section

/*  
  "@/lib/helper"
    - What it is: Local helper functions for converting text into titlecase.
    - Why used: Simplifies conversion of result status into titlecase.
*/
import { toTitleCase } from "@/lib/helper"; // Helper function to format text to title case

/*  
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data related to the Data Quality Dashboard.
    - Why used: To retrieve Data Drift Summary data and dataset rule details for display.
*/
import {
  useGetDataDrift,
  useGetRuleDetails,
} from "@/hooks/useQualityDashboard"; // Custom hooks to fetch data drift and rule data

/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To access the currently applied dataset path and filter values.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Store for accessing the applied dataset path

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState } from "react"; // React hook for managing state

//---------------------- Styles -------------------------//
/**
 * useStyles
 * This function creates custom styles using Fluent UI's `makeStyles` for consistent layout design.
 *
 * @returns Object - Styles for different components used in the layout.
 */
const useStyles = makeStyles({
  header: {
    display: "flex", // Flex layout for the header section
    flexDirection: "column",
    alignItems: "left", // Vertically center the items
    marginTop: tokens.spacingVerticalL, // Apply vertical spacing for the header
  },
  filterContainer: {
    display: "flex",        // Arrange filters horizontally
    flexWrap: "wrap",       // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Space between individual filter controls
    marginTop: tokens.spacingVerticalL // margin between title and dropdown
  },
  sectionTitle: {
    display: "flex", // Flex layout for the title section
    alignItems: "center", // Vertically align items
    gap: tokens.spacingHorizontalS, // Horizontal gap between title and icons
    marginTop: tokens.spacingVerticalL, // Vertical margin for separation
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font weight for titles
    color: tokens.colorNeutralForeground1, // Set color for text (neutral foreground)
  },
  sectionTitleInline: {
    display: "flex", // Flex layout for the rule details title section
    alignItems: "center", // Vertically align items
    gap: tokens.spacingHorizontalS, // Horizontal gap between title and icons
    fontWeight: tokens.fontWeightSemibold, // Semi-bold text
    color: tokens.colorNeutralForeground1, // Set text color to neutral foreground
  },
});

//---------------------- DataDrift Component -------------------------//

/**
 * DataDrift Component
 * This component displays data drift metrics and rule details for the selected dataset.
 * It provides a summary of data drift analysis, such as median, standard deviation, variance, quartiles, outliers,
 * and normality test p-value. It also includes detailed rule information filtered by result status (Passed or Failed).
 *
 * @returns JSX.Element - The component that renders the data drift summary table and the rule details table.
 *
 * Example Input:
 * - `status`: The selected result status filter ('FAILED' or 'PASSED').
 * - Data from `useGetDataDrift` and `useGetRules` hooks, including drift metrics and rule data.
 *
 * Example Output:
 * - A summary table displaying data drift metrics such as median, standard deviation, etc.
 * - A rule details table filtered by the selected result status.
 */
export const DataDrift = () => {
  // Using styles for layout
  const styles = useStyles();

  // State for managing the result status filter (Failed or Passed)
  const [status, setStatus] = useState("FAILED");

  // Fetching data drift metrics and rule details using hooks
  const { dataDrift, isFetching: isLoadingDrift } = useGetDataDrift(); // Fetch data drift metrics
  const { ruleDetails, isFetching: isFetchingRules } = useGetRuleDetails(
    "data_drift",
    status
  ); // Fetch rules based on result status
  // Retrieving dataset path(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly") from the global store for context
  const datasetPath = useDQDDetailedViewFiltersStore((state) =>
    state.appliedDatasetPath()
  ); // Access dataset path from store(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly")

  // Columns configuration for the data drift summary table
  const driftSummaryColumns: ColumnConfig<any>[] = [
    { key: "TARGET_COLUMN", label: "Column Name", width: "18%", sortable: true },
    { key: "Median", label: "Median", width: "5%", sortable: true },
    { key: "Standard_Deviation", label: "Standard Deviation", width: "auto", sortable: true },
    { key: "Variance", label: "Variance", width: "10%", sortable: true },
    { key: "Q1", label: "Q1", width: "4%", sortable: true },
    { key: "Q3", label: "Q3", width: "4%", sortable: true },
    { key: "Outlier_Percentage", label: "Outlier Percentage", width: "auto", sortable: true },
    {
      key: "Normality_Test_pValue",
      label: "Normality Test PValue",
      width: "12%",
      sortable: true, // Enables sorting functionality for the column
    },
    { key: "Data_Drift_KL_Div", label: "Data Drift KL Div", width: "auto", sortable: true },
    { key: "Data_Drift_PSI", label: "Data Drift PSI", width: "auto", sortable: true },
  ];

  // Columns configuration for the rule details table
  const ruleDetailsColumns: ColumnConfig<any>[] = [
    { key: "RULE_NAME", label: "Rule Name", width: "15%", sortable: true },
    { key: "RULE_TYPE", label: "Rule Type", width: "8%", sortable: true },
    { key: "TARGET_COLUMN", label: "Target Column", width: "15%", sortable: true },
    {
      key: "RESULT_VALUE",
      label: "Result Value",
      width: "10%",
      showMore: true,
      sortable: true, // Enables sorting functionality for the column
    },
    { key: "RESULT_STATUS", label: "Result Status", width: "8%", sortable: true },
    { key: "ALERT_THRESHOLD", label: "Alert Threshold", width: "10%", sortable: true },
    {
      key: "RULE_DETAILS",
      label: "Rule Details",
      width: "25%",
      showMore: true,
      // Custom logic to extract and display a brief description from the rule details
      getValue: (value) => {
        // If no value is present, return a placeholder
        if (!value) return "-";
        // Attempt to parse the JSON string and extract the brief description
        try {
          // Parse the JSON string
          const data = JSON.parse(value);
          // Return the brief description if available, otherwise return a placeholder
          return data["brief description"] ?? "-";
        } catch (e) {
          // In case of a parsing error, return a placeholder
          return "-";
        }
      },
    },
  ];

  return (
    <div>
      {/* Data Drift Summary Table */}
      <div className={styles.sectionTitle}>
        {/* Table title */}
        <Text size={400} weight="semibold">
          Data Drift Summary
        </Text>
        {/* Help icon for table explanation */}
        <Help info="This table provides a summary of data drift analysis for the selected dataset. Each row displays the column name along with statistical metrics such as median, standard deviation, variance, quartiles (Q1, Q3), outlier percentage, and normality test p-value. It also includes data drift indicators like KL Divergence and PSI. Use this view to monitor changes in data distribution over time and identify potential drift issues." />
      </div>

      {/* Display the DataGrid with data drift metrics */}
      <DataGrid
        columns={driftSummaryColumns} // Columns configuration for the table
        data={dataDrift || []} // Data for the data drift summary table
        size="small" // Small size for compact display
        loading={isLoadingDrift} // Show loading state while fetching data
      />

      {/* Status Wise Rule Details Table Section */}
      <div className={styles.header}>
        <div className={styles.sectionTitleInline}>
          {/* Table title */}
          <Text size={400} weight="semibold">
            {toTitleCase(status)} Rule Details
            <span className="ml-1 text-sm text-neutral-foreground-2">
              ({datasetPath})
            </span>
          </Text>
          {/* Help icon for table explanation */}
          <Help info="This table provides detailed information about the rules applied to the selected dataset, filtered by result status (Failed or Passed). Each row includes the rule name, rule type, target column, result value, result status, alert threshold, and rule details. Use this view to analyze which rules passed or failed and review specific reasons for failure when applicable." />
        </div>

        <div className={styles.filterContainer}>
        {/* Dropdown to filter by result status (Failed or Passed) */}
        <Field label="Result Status">
          <Dropdown
            selectedOptions={[status]} // Currently selected status
            value={status} // Dropdown value
            appearance="filled-darker" // Styling appearance of the dropdown
            onOptionSelect={(_, option) => setStatus(option?.optionValue || "")} // Update status on selection
          >
            <Option value="PASSED">PASSED</Option>
            <Option value="FAILED">FAILED</Option>
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* Display the DataGrid with rule details */}
      <DataGrid
        columns={ruleDetailsColumns} // Columns configuration for the table
        data={ruleDetails || []} // Data for the rule details table
        size="small" // Small size for compact display
        loading={isFetchingRules} // Show loading state while fetching rule data
      />
    </div>
  );
};
