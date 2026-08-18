/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script renders the "Business Unit Data Health" section of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Fetches dataset health metrics for a selected business unit.
    - Allows filtering data using a custom date range selector.
    - Displays dataset health information in a reusable DataGrid.
    - Highlights dataset run status (success / failure) visually.
    - Provides contextual help to explain dataset health metrics.

    This component is designed to be reusable, readable, and scalable
    for enterprise-grade dashboard implementations.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data quality dashboard metrics.
    - Why used: Provides dataset health data for the selected business unit and date range.
*/
import { useGetBusinessUnitHealth } from "@/hooks/useQualityDashboard";
// Custom hook used to fetch dataset health data from the backend API

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  makeStyles,
  tokens,
  Text,
} from "@fluentui/react-components";
// Fluent UI components and tokens for styling and typography

/*
  react
    - What it is: React library for building user interfaces. `FC` is a TypeScript type for
      functional components.
    - Why used: Provides hook to managing selected date range state and the typing and runtime needed for the component.
*/
import { FC, useState } from "react";
// React core utilities for functional components and state management

/*
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders the brand-wise KPI summary table with pagination support.
*/
import { ColumnConfig, DataGrid } from "./DataGrid";
// Reusable DataGrid component and its column configuration type

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
import { Help } from "./Help";
// Help tooltip component for displaying contextual information

// Custom date range selector component and its TypeScript type
// - What it does: `CustomDateRange` is a small UI that lets users pick predefined ranges or a custom start/end.
// - Why used here: we need a date filter for login activity investigations.
import { CustomDateRange, DateRangeOption } from "./CustomDateRange";
// Date range selector component and its associated type

/* --------------------------------------------------------------- */
/* Styles                                                          */
/* --------------------------------------------------------------- */
/**
 * `useStyles`
 * Defines all reusable styles for the Business Unit Data Health component.
 * Uses Fluent UI design tokens to maintain consistency across the application.
 */
const useStyles = makeStyles({
  header: {
    display: "flex", // Arranges header elements horizontally
    flexDirection: "column",
    alignItems: "left", // Vertically aligns header items
    marginBottom: tokens.spacingVerticalL, // Adds spacing below header
  },
  filterContainer: {
    display: "flex", // Horizontal filter layout
    flexWrap: "wrap", // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Spacing between filters
    paddingTop: tokens.spacingVerticalL
  },
  sectionTitle: {
    display: "flex", // Horizontal alignment of title and help icon
    alignItems: "center", // Vertical centering
    gap: tokens.spacingHorizontalS, // Space between title and help icon
    fontWeight: tokens.fontWeightSemibold, // Emphasized section title
    color: tokens.colorNeutralForeground1, // Primary text color
  },
  success: {
    color: tokens.colorPaletteGreenBorder2, // Green color for successful runs
  },
  failed: {
    color: tokens.colorPaletteRedBorder2, // Red color for failed runs
  },
});

/* --------------------------------------------------------------- */
/* Props Interface                                                 */
/* --------------------------------------------------------------- */
/**
 * `BusinessUnitDataHealthProps`
 * Defines the props required by the BusinessUnitDataHealth component.
 */
interface BusinessUnitDataHealthProps {
  /**
   * `businessUnit`
   * Represents the selected L1 Business Unit used to fetch dataset health data.
   * Example: "Manufacturing", "Supply Chain"
   */
  businessUnit: string;
}

/* --------------------------------------------------------------- */
/* Component                                                       */
/* --------------------------------------------------------------- */
/**
 * BusinessUnitDataHealth Component
 *
 * This component displays dataset health metrics for a selected business unit.
 * It includes:
 * - A header with title, help tooltip, and date range selector.
 * - A DataGrid that lists dataset-level run statistics.
 *
 * Why this component is needed:
 * - Provides visibility into dataset execution health.
 * - Helps identify failing datasets quickly.
 * - Enables time-based analysis using date filters.
 *
 * @param businessUnit - Selected business unit identifier
 *
 * Sample Input:
 * ```ts
 * businessUnit = "Manufacturing"
 * ```
 *
 * Sample Output:
 * - Renders a table showing dataset health metrics
 * - Displays run counts and last run status
 */
export const BusinessUnitDataHealth: FC<BusinessUnitDataHealthProps> = ({
  businessUnit,
}) => {
  // Initialize styles
  const styles = useStyles();

  /* --------------------------------------------------------------- */
  /* State                                                          */
  /* --------------------------------------------------------------- */
  /**
   * `selectedDateRange`
   * Stores the currently selected date range used for filtering dataset health data.
   */
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeOption>({
      label: "", // Display label for the selected range
      value: "", // Internal value used for selection
      startDate: null, // Start date for filtering
      endDate: null, // End date for filtering
    });

  /* --------------------------------------------------------------- */
  /* Data Fetching                                                  */
  /* --------------------------------------------------------------- */
  /**
   * Fetches dataset health data for the selected business unit
   * and date range using a custom hook.
   */
  const { businessDatasetUnitHealth, isFetching } =
    useGetBusinessUnitHealth(
      businessUnit, // Business unit filter
      selectedDateRange.startDate!, // Start date filter
      selectedDateRange.endDate! // End date filter
    );

  /* --------------------------------------------------------------- */
  /* DataGrid Column Configuration for Data Health                   */
  /* --------------------------------------------------------------- */
  /**
   * `datasetHealthColumns`
   * Defines the structure, labels, and rendering logic for each DataGrid column.
   */
  const datasetHealthColumns: ColumnConfig<any>[] = [
    {
      key: "CATALOG_NAME", // Unique key for the column
      label: "Catalog Name", // Column header label
      width: "12%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "SCHEMA_NAME", // Unique key for the column
      label: "Schema Name", // Column header label
      width: "20%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "DATASET_NAME", // Unique key for the column
      label: "Dataset Name", // Column header label
      width: "22%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "PERCENT_PASSED_RUNS", // Unique key for the column
      label: "Percent Passed Runs", // Column header label
      width: "12%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      /**
       * Custom renderer to emphasize pass percentage.
       */
      render: (value) => <span className="font-bold">{value}</span>,
    },
    {
      key: "RUN_DETAILS", // Unique key for the column
      label: "Run Details", // Column header label
      width: "20%", // Width allocation
      /**
       * Custom renderer to display run statistics and last run status.
       */
      render: (_, row) => {
        // Destructure relevant fields from the data row
        const { LAST_RUN_STATUS, successful_runs, TOTAL_RUNS } = row;
        // Determine if the last run was successful
        const isLastRunSuccessful = LAST_RUN_STATUS === "Succeeded";

        return (
          // Render run details in a structured way
          <div className="flex flex-col gap-1 text-sm">
            {/* Run statistics */}
            <span>
              Total Runs: <strong>{TOTAL_RUNS}</strong>
            </span>
            {/* Succeeded runs */}
            <span>
              Succeeded Runs: <strong>{successful_runs}</strong>
            </span>
            {/* Failed runs */}
            <span
              className={
                isLastRunSuccessful ? styles.success : styles.failed
              }
            >
              Last Run: <strong>{LAST_RUN_STATUS}</strong>
            </span>
          </div>
        );
      },
    },
  ];

  /* --------------------------------------------------------------- */
  /* Render                                                         */
  /* --------------------------------------------------------------- */
  return (
    // Root container for Business Unit Data Health component
    <div>
      {/* ---------- Header Section ---------- */}
      <div className={styles.header}>
        {/* Section Title + Help Tooltip */}
        <div className={styles.sectionTitle}>
          <Text size={400} weight="semibold">
            Dataset Health Summary
          </Text>
          <Help
            info="This table provides a summary of dataset health for the selected business unit within the chosen date range. Each row displays the catalog name, schema name, dataset name, percent of passed runs, and detailed run information including total runs, succeeded runs, and failed runs. Use this view to monitor dataset performance over time and identify datasets that require attention."
          />
        </div>

        <div className={styles.filterContainer}>
        {/* Date Range Selector */}
        <CustomDateRange
          selectedRange={selectedDateRange} // Currently selected date range
          setSelectedRange={setSelectedDateRange} // Handler to update selected date range
        />
        </div>
      </div>

      {/* ---------- DataGrid Section ---------- */}
      <DataGrid
        columns={datasetHealthColumns} // Column definitions
        data={businessDatasetUnitHealth || []} // Dataset health data
        loading={isFetching} // Loading indicator
      />
    </div>
  );
};
