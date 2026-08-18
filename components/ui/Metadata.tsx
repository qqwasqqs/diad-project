/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script represents the `Metadata` component for the Teva Data Integrity Automation Dashboard.
    - This component is responsible for displaying detailed metadata information related to dataset rules.
    - It interacts with hooks to fetch rule data and metadata, displays highlights and rule details in tabular form.
    - The user can filter the rules based on their result status (Passed or Failed).
    - It uses Fluent UI components for dropdowns, spinners, and tables to ensure a consistent UI.
*/

//---------------------- Imports and Types -------------------------//

/*  
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data related to the Data Quality Dashboard.
    - Why used: To retrieve Metadata Summary data and dataset rule details for display.
*/
import { useGetMetadata, useGetRuleDetails } from "@/hooks/useQualityDashboard"; // Hooks to fetch metadata and rules

/*  
  "@/lib/helper"
    - What it is: Local helper functions for converting text into titlecase.
    - Why used: Simplifies conversion of result status into titlecase.
*/
import { toTitleCase } from "@/lib/helper"; // Helper function to convert text to title case

/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To access the currently applied dataset path and filter values.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Store to get applied dataset filters
/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Text, // Fluent UI Text component for displaying text with various styles
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography
  makeStyles, // Fluent UI hook for creating custom styles
  Dropdown, // Dropdown component for selection of options
  Field, // Field component to label inputs and group them with specific styles
  Option, // Option component to represent each item in the dropdown
  Spinner, // Fluent UI Spinner component for displaying loading indicators 
} from "@fluentui/react-components"; // Fluent UI components

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState } from "react"; // React hook for state management

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Data grid components for rendering tables

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "./Help"; // Component to display help text

//---------------------- Styles -------------------------//
const useStyles = makeStyles({
  header: {
    display: "flex", // Align items horizontally
    flexDirection: "column",
    alignItems: "left", // Vertically center align
    marginTop: tokens.spacingVerticalL, // Vertical margin for the header section
  },
  filterContainer: {
    display: "flex",        // Arrange filters horizontally
    flexWrap: "wrap",       // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Space between individual filter controls
    marginTop: tokens.spacingVerticalL // margin between title and dropdown
  },
  sectionTitle: {
    display: "flex", // Align items horizontally
    alignItems: "center", // Vertically center align
    gap: tokens.spacingHorizontalS, // Horizontal gap between title and icons
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font weight for section title
    color: tokens.colorNeutralForeground1, // Default text color
  },
});

//---------------------- Metadata Component -------------------------//

/**
 * Metadata Component
 * This component displays the metadata details for the dataset. It fetches the rule details based on the selected result status (Failed or Passed).
 * It also displays highlights and the detailed rule table with configurable columns.
 *
 * @returns JSX.Element - The component that renders highlights and rule details in a table format.
 *
 * Example Input:
 * - Status: 'FAILED' or 'PASSED' (selected from the dropdown)
 * - Data fetched from `useGetMetadata()` and `useGetRules()`.
 *
 * Example Output:
 * A section displaying dataset highlights and a table of rules with columns like Rule Name, Target Column, and Result Status.
 */
export const Metadata = () => {
  // Using styles for the component layout
  const styles = useStyles();

  // State for the result status filter (Failed or Passed)
  const [status, setStatus] = useState("FAILED");

  // Fetching metadata result and rule data using hooks
  const { metadata, isFetching: isLoadingMetadata } = useGetMetadata();
  const { ruleDetails, isFetching: isLoadingRules } = useGetRuleDetails(
    "metadata",
    status
  );

  // Retrieving dataset path(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly") from the global store for context
  const datasetPath = useDQDDetailedViewFiltersStore((state) =>
    state.appliedDatasetPath()
  ); // Access dataset path from store(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly")

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
      // Custom function to display brief rule details from JSON
      getValue: (value, row, index) => {
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

  // Color coding for the rule result status
  const colorCode: Record<number, string> = {
    0: "text-gray-500", // Default for neutral items
    1: "text-red-600", // Failed rule
    2: "text-gray-700", // Passed rule
  };

  return (
    <div>
      {/* Highlights Section */}
      <div className="bg-neutral-background-3 border border-gray-200 rounded-lg p-4 shadow-md">
        {/* Highlights Title */}
        <Text size={500} weight="bold" block>
          Highlights
        </Text>
        {/* Conditional loading state for metadata */}
        {isLoadingMetadata ? (
          <div className="flex h-[15vh] items-center justify-center">
            {/* Loading spinner while data is being fetched */}
            <Spinner size="small" label="Loading dataset…" />
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {/* Render each highlight key-value pair */}
            {(metadata || []).map((item, idx) => (
              // Sample Example: item = { "KEY": "Freshness (Last Refresh Date)", "VALUE": "2025-12-01T00:00:00 (Derived From:  Month)"}
              <div key={idx} className="flex justify-between gap-2">
                {/* Sample Example: KEY = "Freshness (Last Refresh Date)" */}
                <Text weight="semibold">{item.KEY}:</Text> 
                {/* Sample Example: VALUE = "2025-12-01T00:00:00 (Derived From:  Month)" */}
                <Text title={item.VALUE} className={`${colorCode[idx]} font-medium`} truncate wrap={false}>
                  {item.VALUE}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Wise Rule Details Table Section */}
      <div className={styles.header}>
        <div className={styles.sectionTitle}>
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
        {/* Dropdown to filter rules by result status (Passed/Failed) */}
        <Field label="Result Status">
          <Dropdown
            selectedOptions={[status]} // Currently selected status
            value={status} // Dropdown value
            appearance="filled-darker" // Styling appearance of the dropdown
            onOptionSelect={
              (_, option) => setStatus(option?.optionValue || "FAILED") // Update status on selection
            }
          >
            <Option value="PASSED">PASSED</Option>
            <Option value="FAILED">FAILED</Option>
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* DataGrid for displaying the rule details */}
      <DataGrid
        columns={ruleDetailsColumns} // Columns configuration for the table
        data={ruleDetails || []} // Display rule details or empty array if not loaded
        size="small" // Small size for compact display
        loading={isLoadingRules} // Loading state for the rule table
      />
    </div>
  );
};
