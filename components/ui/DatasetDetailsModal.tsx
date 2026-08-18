/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the Dataset Details Modal component used across
    the Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Displays detailed rule-level failure information for a dataset.
    - Fetches dataset-specific validation issues based on rule context.
    - Provides a scrollable, copy-enabled data grid for investigation.
    - Acts as a drill-down view from summary tables and charts.

    This modal is a critical investigation tool that enables users
    to understand *why* a dataset failed specific data quality checks.
*/

//---------------------- Imports -------------------------//

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for async parameter resolution, managing component state and side effects.
*/
import React from "react"; // Core React library

// Custom hook to fetch dataset-level rule failure details
import { useGetBusinessUnitDatasetDetails } from "@/hooks/useQualityDashboard";

/*  
  @/lib/helper
    - What it is: Local helper functions for data formatting and URL parameter handling.
    - Why used: Provides utility functions for formatting route parameters into readable labels.
*/
import { formatRouteParam } from "@/lib/helper"; // Helper to format route parameters into readable labels

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Button,
  tokens,
  makeStyles,
} from "@fluentui/react-components"; // Fluent UI dialog and styling components

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
 * useDatasetDetailsModalStyles
 *
 * Centralized styling for DatasetDetailsModal using Fluent UI tokens.
 * Ensures consistent spacing, typography, and responsive sizing.
 */
const useDatasetDetailsModalStyles = makeStyles({
  // Controls the maximum width of the modal dialog
  surface: {
    maxWidth: "80vw",
  },

  // Styles applied to the modal title text
  title: {
    fontWeight: tokens.fontWeightSemibold,
  },

  // Restricts content height to enable scrolling for large datasets
  content: {
    maxHeight: "80vh",
  },
});

//---------------------- Types -------------------------//

/**
 * DatasetDetailsModalProps
 *
 * Props required to render the DatasetDetailsModal component.
 */
interface DatasetDetailsModalProps {
  open: boolean; // Controls whether the modal is visible
  onOpenChange: (open: boolean) => void; // Callback to open/close modal
  datasetName: string; // Name of the dataset being inspected
  businessUnit: string; // Business unit context
  ruleStatus?: string; // Validation status (FAILED, PASSED, TOTAL)
  ruleCategory?: string; // Rule category filter
  ruleType?: string; // Specific rule type filter
  ruleName?: string; // Specific rule name filter
}

//---------------------- Component -------------------------//

/**
 * DatasetDetailsModal
 *
 * Displays detailed rule failure information for a specific dataset.
 *
 * Why this component is needed:
 * - Enables root-cause analysis of data quality failures.
 * - Provides transparency into rule-level validation results.
 * - Allows copying and expanding detailed error messages.
 *
 * Sample Input:
 *  {
 *    open: true,
 *    datasetName: "sales_orders",
 *    businessUnit: "commercial_data",
 *    ruleStatus: "FAILED",
 *    ruleCategory: "timeliness_check"
 *  }
 *
 * Sample Output:
 *  - Modal dialog titled "sales_orders"
 *  - DataGrid listing rule type, rule name, column, alert type, and details
 */
export const DatasetDetailsModal: React.FC<DatasetDetailsModalProps> = ({
  open, // Determines if the dialog is open
  onOpenChange, // Function to update dialog open state
  datasetName, // Dataset under investigation
  businessUnit, // Business unit context
  ruleStatus = "FAILED", // Default rule status filter
  ruleCategory, // Optional rule category filter
  ruleType, // Optional rule type filter
  ruleName, // Optional rule name filter
}) => {
  //---------------------- Hooks -------------------------//

  // Load component-specific styles
  const styles = useDatasetDetailsModalStyles();

  // Fetch dataset rule failure details from backend
  const { datasetDetails, isFetching: isLoading } =
    useGetBusinessUnitDatasetDetails(
      businessUnit,
      datasetName,
      ruleStatus,
      ruleCategory,
      ruleType,
      ruleName
    );

  //---------------------- Table Configuration -------------------------//

  /**
   * Column definitions for the dataset rule details DataGrid.
   * Each column represents a rule evaluation attribute.
   */
  const datasetDetailsColumns: ColumnConfig<any>[] = [
    { key: "RULE_TYPE", label: "Rule Type", width: "10%", sortable: true },
    { key: "RULE_NAME", label: "Rule Name", width: "10%", sortable: true },
    { key: "COLUMN_NAME", label: "Column Name", width: "12%", sortable: true },
    { key: "ALERT_TYPE", label: "Alert Type", width: "8%", sortable: true },
    {
      key: "DETAILS",
      label: "Details",
      width: "35%",
      copyable: true, // Enables copy-to-clipboard
      showMore: true, // Enables expand/collapse for long text
    },
  ];

  //---------------------- Helper Functions -------------------------//

  /**
   * getRuleContextLabel
   *
   * Builds a user-friendly rule context string for the modal title.
   *
   * Why this is needed:
   * - Provides clear context on which rule(s) are being inspected.
   * - Supports multiple drill-down paths (category, type, name).
   *
   * @param ruleCategory - Rule category identifier
   * @param ruleType - Rule type identifier
   * @param ruleName - Rule name identifier
   *
   * @returns Formatted display string or null
   *
   * Sample Input:
   *  ("timeliness_check", "freshness", undefined)
   *
   * Sample Output:
   *  "Timeliness Check - freshness"
   */
  const getRuleContextLabel = (
    ruleCategory?: string,
    ruleType?: string,
    ruleName?: string
  ): string | null => {
    if (ruleCategory) {
      const suffix = ruleType || ruleName;
      return `${formatRouteParam(ruleCategory)}${
        suffix ? ` - ${suffix}` : ""
      }`;
    }

    return ruleType || ruleName || null;
  };

  //---------------------- Render -------------------------//

  return (
    <Dialog
      open={open}
      onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)}
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          {/* ---------------- Modal Title ---------------- */}
          <DialogTitle
            className={styles.title}
            action={
              <Button
                appearance="subtle"
                icon={<Dismiss24Filled />}
                aria-label="Close"
                onClick={() => onOpenChange(false)}
              />
            }
          >
            {/* Dataset name displayed prominently */}
            {datasetName}

            {/* Rule context displayed as subtitle */}
            <span className="text-sm text-neutral-foreground-2">
              ({getRuleContextLabel(ruleCategory, ruleType, ruleName)})
            </span>
          </DialogTitle>

          {/* ---------------- Modal Content ---------------- */}
          <DialogContent className={styles.content}>
            <DataGrid
              columns={datasetDetailsColumns} // Table structure
              data={datasetDetails || []} // API response data
              loading={isLoading} // Loading indicator
            />
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
