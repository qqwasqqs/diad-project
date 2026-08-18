/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script represents the `DataHealth` component for the Teva Data Integrity Automation Dashboard.
    - The component displays a summary of the health of datasets, including the total number of runs, status of runs, and the percentage of passed runs.
    - It allows users to filter data based on a custom date range.
    - The data is fetched using the `useGetDataHealth` hook and displayed in a data grid format.
    - The layout includes a title and a date range dropdown for filtering.
*/

// ---------------------- Imports and Types -------------------------//

import { useGetDataHealth } from "@/hooks/useQualityDashboard"; // Custom hook to fetch data health metrics

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import { makeStyles, tokens, Text } from "@fluentui/react-components"; // Fluent UI components for styling

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for type check and managing component state & lifecycle.
*/
import { FC, useState } from "react"; // React hooks

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid"; // Custom DataGrid component for displaying data

// Custom date range selector component and its TypeScript type
// - What it does: `CustomDateRange` is a small UI that lets users pick predefined ranges or a custom start/end.
// - Why used here: we need a date range filter for selected dataset health.
import { CustomDateRange, DateRangeOption } from "./CustomDateRange"; // Custom date range filter component

// ---------------------- Fluent UI and Tailwind Styles -------------------------//

/**
 * useStyles
 * This function defines the custom styles for the component using Fluent UI's `makeStyles`.
 * It provides consistent layout and styling for the header and section title.
 *
 * @returns Object - Styles for header and section title components.
 */
const useStyles = makeStyles({
  header: {
    display: "flex", // Flexbox layout for header
    flexDirection: "column",
    alignItems: "left", // Centering the header items vertically
    marginBottom: tokens.spacingVerticalL, // Add vertical spacing at the bottom
  },
  filterContainer: {
    display: "flex", // Horizontal filter layout
    flexWrap: "wrap", // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Spacing between filters
    paddingTop: tokens.spacingVerticalL
  },
  sectionTitle: {
    display: "flex", // Flexbox layout for section title
    alignItems: "center", // Center the title vertically
    gap: tokens.spacingHorizontalS, // Horizontal gap between the title and any icons or elements
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section titles
    color: tokens.colorNeutralForeground1, // Neutral foreground color for the text
  },
});

// ---------------------- DataHealth Component -------------------------//

/**
 * DataHealth Component
 * This component displays a dataset health summary, including the total number of runs, successful runs,
 * failed runs, and the percentage of passed runs. It allows users to filter the data by a custom date range.
 *
 * @returns JSX.Element - The component that renders the dataset health summary and the DataGrid.
 *
 * Example Input:
 * - `selectedRange`: The selected date range for filtering the data (start date and end date).
 * - `data`: Data fetched using the `useGetDataHealth` hook based on the selected date range.
 *
 * Example Output:
 * - A summary of dataset health metrics (Total Runs, Failed Runs, Passed Runs, etc.) displayed in a table.
 * - A dropdown for selecting a custom date range.
 */
export const DataHealth: FC = () => {
  // Using the custom styles defined above
  const styles = useStyles();

  // -------------------------------------------------------------------
  // Column definition for the DataGrid
  // -------------------------------------------------------------------
  /**
   * dataHealthColumns
   * This array defines the column configurations for the DataGrid component. Each column represents a
   * specific health metric (e.g., total runs, failed runs, passed runs) and defines the column's label
   * and width. This structure allows the `DataGrid` to render the data correctly in a tabular format.
   *
   * @type ColumnConfig<any>[]
   */
  const dataHealthColumns: ColumnConfig<any>[] = [
    { key: "L1_NAME", label: "L1 Business Unit", width: "auto", sortable: true },
    { key: "TOTAL_RUNS", label: "Total Runs", width: "auto", sortable: true },
    { key: "LAST_RUN_STATUS", label: "Last Run", width: "auto", sortable: true },
    { key: "successful_runs", label: "Succeeded Runs", width: "auto", sortable: true },
    { key: "failed_runs", label: "Failed Runs", width: "auto", sortable: true },
    { key: "PERCENT_PASSED_RUNS", label: "Percent Passed Runs", width: "auto", sortable: true },
  ];

  // -------------------------------------------------------------------
  // State for selecting the date range
  // -------------------------------------------------------------------
  /**
   * selectedRange
   * This state stores the currently selected date range for filtering the dataset health data.
   * The state contains a label, value, and the start and end dates.
   *
   * @type DateRangeOption
   */
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>({
    label: "",
    value: "",
    startDate: null,
    endDate: null,
  });

  // -------------------------------------------------------------------
  // Fetch data using the custom hook `useGetDataHealth`
  // -------------------------------------------------------------------
  /**
   * data and isFetching
   * These values are returned from the `useGetDataHealth` hook.
   * The `data` contains the dataset health information, and `isFetching` is a boolean flag indicating
   * whether the data is still being loaded.
   *
   * @type {Object} dataHealth - Dataset health information.
   * @type {boolean} isFetching - Flag indicating if data is being fetched.
   */
  const { dataHealth, isFetching } = useGetDataHealth(
    selectedRange.startDate!,
    selectedRange.endDate!
  );

  return (
    <div>
      {/* ------------------------------------------------------------- */}
      {/* Title + Date Range Dropdown */}
      {/* ------------------------------------------------------------- */}
      <div className={styles.header}>
        <div className={styles.sectionTitle}>
          <Text size={500} weight="bold">
            Dataset Health Summary
          </Text>
        </div>

        <div className={styles.filterContainer}>
        {/* Custom Date Range dropdown to select the range for filtering */}
        <CustomDateRange
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
        />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DataGrid Component for displaying health data */}
      {/* ------------------------------------------------------------- */}
      {/* Display the dataset health metrics in a tabular format */}
      <DataGrid
        columns={dataHealthColumns}
        data={dataHealth || []}
        loading={isFetching}
      />
    </div>
  );
};
