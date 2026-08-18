/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script represents the `DataProfile` component for the Teva Data Integrity Automation Dashboard.
    - This component fetches and displays data profiling metrics for the selected dataset.
    - It provides an overview of column-level data quality, including completeness, uniqueness, and other statistical measures.
    - It also provides detailed rule information for the selected dataset, which can be filtered by result status (Passed or Failed).
    - The layout includes two main sections: data profiling summary and rule details, displayed in tabular form.
*/

//---------------------- Imports and Types -------------------------//

/*  
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data related to the Data Quality Dashboard.
    - Why used: To retrieve Data Profile Summary data and dataset rule details for display.
*/
import {
  useGetDataProfile,
  useGetRuleDetails,
} from "@/hooks/useQualityDashboard"; // Custom hooks to fetch data profile and rule data

/*  
  "@/lib/helper"
    - What it is: Local helper functions for converting text into titlecase.
    - Why used: Simplifies conversion of result status into titlecase.
*/
import { toTitleCase } from "@/lib/helper"; // Helper function to format text to title case

/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To access the currently applied dataset path and filter values.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Store for accessing the applied dataset path

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
  Spinner, // Fluent UI Spinner component for displaying loading indicators
  Dropdown, // Dropdown component for selection of options
  Field, // Field component to label inputs and group them with specific styles
  Option, // Option component to represent each item in the dropdown
} from "@fluentui/react-components"; // Fluent UI components

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState } from "react"; // React hook for managing state

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Custom DataGrid component for rendering tables

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "./Help"; // Component to show help text for each section

//---------------------- Styles -------------------------//
/**
 * useStyles
 * This function creates custom styles using Fluent UI's `makeStyles` for consistent layout design.
 *
 * @returns Object - Styles for different components used in the layout.
 */
const useStyles = makeStyles({
  header: {
    display: "flex", // Align header items horizontally
    flexDirection: "column",
    alignItems: "left", // Vertically align items in the header
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
    alignItems: "center", // Center align the items vertically
    gap: tokens.spacingHorizontalS, // Horizontal spacing between items
    marginTop: tokens.spacingVerticalL, // Vertical margin for separation
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font weight for titles
    color: tokens.colorNeutralForeground1, // Set color for text (neutral foreground)
  },
  sectionTitle1: {
    display: "flex", // Flex layout for another section title
    alignItems: "center", // Vertically align items
    gap: tokens.spacingHorizontalS, // Horizontal gap between title and icons
    fontWeight: tokens.fontWeightSemibold, // Semi-bold text
    color: tokens.colorNeutralForeground1, // Set text color to neutral foreground
  },
});

//---------------------- DataProfile Component -------------------------//

/**
 * DataProfile Component
 * This component displays data profiling metrics and rule details for a selected dataset.
 * It provides two main sections: data profiling summary and rule details, which can be filtered by result status (Passed or Failed).
 *
 * @returns JSX.Element - The component that renders the dataset highlights, data profiling summary table, and rule details table.
 *
 * Example Input:
 * - `status`: The selected result status filter ('FAILED' or 'PASSED').
 * - Data from `useGetDataProfile` and `useGetRules` hooks, including profiling metrics and rule data.
 *
 * Example Output:
 * - Data profiling summary table displaying columns like completeness, uniqueness, etc.
 * - Rule details table filtered by the selected result status.
 */
export const DataProfile = () => {
  // Using styles for layout
  const styles = useStyles();

  // State for managing the result status filter (Failed or Passed)
  const [status, setStatus] = useState("FAILED");

  // Fetching data profile and rule details using hooks
  const { dataProfile, isFetching: isLoadingProfile } = useGetDataProfile(); // Fetch data profiling information
  const { ruleDetails, isFetching: isFetchingRules } = useGetRuleDetails(
    "data_profiling",
    status
  ); // Fetch rules based on result status

  // Retrieving dataset path(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly") from the global store for context
  const datasetPath = useDQDDetailedViewFiltersStore((state) =>
    state.appliedDatasetPath()
  ); // Access dataset path from store(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly")

  // Columns configuration for the data profiling summary table
  const profileSummaryColumns: ColumnConfig<any>[] = [
    { key: "TARGET_COLUMN", label: "Column Name", width: "25%", sortable: true },
    { key: "Completeness", label: "Completeness (%)", width: "auto", sortable: true },
    { key: "Uniqueness", label: "Uniqueness (%)", width: "auto", sortable: true },
    { key: "Min_Value", label: "Min Value", width: "auto", sortable: true },
    { key: "Max_Value", label: "Max Value", width: "auto", sortable: true },
    { key: "Mean_Value", label: "Mean Value", width: "auto", sortable: true },
  ];

  // Columns configuration for the rule details table
  const ruleDetailsColumns: ColumnConfig<any>[] = [
    { key: "RULE_NAME", label: "Rule Name", width: "15%", sortable: true },
    { key: "RULE_TYPE", label: "Rule Type", width: "8%", sortable: true },
    { key: "TARGET_COLUMN", label: "Target Column", width: "10%", sortable: true },
    {
      key: "RESULT_VALUE",
      label: "Result Value",
      width: "15%",
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
      {/* Highlights Section */}
      <div className="bg-neutral-background-3 border border-gray-200 rounded-lg p-4 shadow-md">
        {/* Highlights Title */}
        <Text size={500} weight="bold" block>
          Highlights
        </Text>

        {/* Show loading spinner if data is being fetched */}
        {isLoadingProfile ? (
          <div className="flex h-[15vh] items-center justify-center">
            {/* Loading spinner while data is being fetched */}
            <Spinner size="small" label="Loading dataset…" />
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {/* Map through the highlights and display each key-value pair */}
            {(dataProfile?.highlights || []).map((item: any, idx: number) => (
              // Sample Example: item = { "KEY": "Completeness (%)", "VALUE": "13.5 (Mandatory Columns: NDC_Group, SAP#)"}
              <div key={idx} className="flex justify-between gap-2">
                {/* Sample Example: KEY = "Completeness (%)" */}
                <Text weight="semibold">{item.KEY}:</Text>
                {/* Sample Example: VALUE = "13.5 (Mandatory Columns: NDC_Group, SAP#)" */}
                <Text title={item.VALUE} className="text-green-600 font-medium" truncate wrap={false}>{item.VALUE}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Profiling Summary Table */}
      <div className={styles.sectionTitle}>
        {/* Table title */}
        <Text size={400} weight="semibold">
          Data Profiling Summary
        </Text>
        {/* Help icon for table explanation */}
        <Help info="This table provides a summary of data profiling metrics for the selected dataset. Each row displays the column name along with its completeness percentage, uniqueness percentage, minimum value, maximum value, and mean value. Use this view to assess data quality at the column level and identify potential issues such as missing values or lack of uniqueness." />
      </div>

      {/* Display the DataGrid with data profiling metrics */}
      <DataGrid
        columns={profileSummaryColumns} // Columns configuration for the table
        data={dataProfile?.summaries || []} // Data for the data profiling table
        size="small" // Small size for compact display
        loading={isLoadingProfile} // Show loading state while fetching data
      />

      {/* Status Wise Rule Details Table Section */}
      <div className={styles.header}>
        <div className={styles.sectionTitle1}>
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
        loading={isFetchingRules} // Show loading state while fetching data
      />
    </div>
  );
};
