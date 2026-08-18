/*
  Project Name: Teva Data Integrity Automation Dashboard
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script represents the Business Unit Data Summary component of the Teva Data Integrity Automation Dashboard. 
    It provides an executive-level summary of data quality for a specific business unit, including:
      - Summary cards highlighting datasets' status.
      - A failure chart to visualize rule category failures.
      - Detailed tables for failed datasets and dataset rule types.
      - Modals for displaying more detailed dataset information.
    The component fetches data from APIs, processes it, and dynamically displays it in an interactive dashboard with options for further drill-down and dataset exploration.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  @/components/charts/FailureChart  
    - What it is: A reusable FailureChart component for visualizing rule category failures.
    - Why used: Renders the BarChart chart for rule categories vs failures datasets in the business unit summary.
*/
import { FailureChart } from "@/components/charts/FailureChart"; // For rendering failure chart of rule categories

/* @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid"; // DataGrid for displaying dataset tables

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
import { Help } from "@/components/ui/Help"; // Tooltip-style help components

/*  
  @/components/ui/Highlights
    - What it is: A reusable component to display a business unit summary cards.
    - Why used: Renders the high-level a business unit highlights in a card format.
*/
import { Highlights } from "@/components/ui/Highlights"; // Highlights component for displaying summary cards

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Spinner,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Button,
  Text,
  tokens,
  makeStyles,
} from "@fluentui/react-components"; // Fluent UI components for UI elements

/*  
  next/link
    - What it is: Next.js Link component for client-side navigation.
    - Why used: Enables navigation to detailed views for each business unit.
*/
import Link from "next/link"; // For routing to specific pages within the app

/*  
  @/constants/routes
    - What it is: A module containing route constants for navigation.
    - Why used: Provides a constant for the Data Quality Dashboard summary view route.
*/
import { DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes"; // Constants for routing

/*
  react
    - What it is: React library for building user interfaces. `FC` is a TypeScript type for
      functional components.
    - Why used: Provides hook to managing selected date range state and the typing and runtime needed for the component.
*/
import { FC, useState } from "react"; // Functional component and state hooks from React

/*
  @/hooks/useQualityDashboard 
    - What it is: Custom hooks for fetching data related to the Quality Dashboard.  
    - Why used: Provides hooks to fetch business unit summary, dataset rule types, and data refresh stats.
*/
import {
  useGetBusinessUnitDatasetRuleTypes, // Hook to fetch dataset rule types
  useGetBusinessUnitSummary, // Hook to fetch business unit summary data
} from "@/hooks/useQualityDashboard"; // API Hooks for fetching data

/*  
  @/hooks/useToast
    - What it is: Custom hook for displaying toast notifications.
    - Why used: Displays the "Copied to clipboard!" message to the user as a toast notification.
*/
import { useGlobalToast } from "@/hooks/useToast"; // Toast notifications for success/error messages

/*  
  @/lib/helper
    - What it is: Local helper functions for data formatting and URL parameter handling.
    - Why used: Provides utility functions for decoding route parameters and formatting date/time.
*/
import {
  decodeRouteParam,
  formatDateTime,
  prepareRouteParam,
} from "@/lib/helper"; // Utility functions for handling data formatting and URL params

/*  
  ./DatasetDetailsModal
    - What it is: A modal component for displaying detailed dataset information.
    - Why used: Provides a detailed view of dataset information when a user selects a dataset.
*/
import { DatasetDetailsModal } from "./DatasetDetailsModal"; // Modal for displaying detailed dataset information

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Checkmark16Filled, Copy16Regular } from "@fluentui/react-icons"; // Icons for copy buttons

/*  
  ./DataRefreshStats
    - What it is: A component for displaying dataset refresh statistics.
    - Why used: Shows statistics related to dataset refresh status in the summary view.
*/
import { DataRefreshStats } from "./DataRefreshStats"; // Component for dataset refresh statistics

// ---------------------- Styles -------------------------//
/**
 * Styles for the DataSummary component using Fluent UI's makeStyles hook.
 * Provides a consistent and responsive layout for section titles and other UI elements.
 */
const useStyles = makeStyles({
  sectionTitle: {
    display: "flex", // Using flex layout for section title
    alignItems: "center", // Vertically aligning items in the section title
    gap: tokens.spacingHorizontalS, // Horizontal spacing between title and icon
    marginTop: tokens.spacingVerticalL, // Margin at the top of the section
    fontWeight: tokens.fontWeightSemibold, // Using semi-bold font weight for section titles
    color: tokens.colorNeutralForeground1, // Color for the section title text
  },
});

// ---------------------- Types -------------------------//
/**
 * Props for the DataSummary component.
 * Contains the `businessUnit` parameter for fetching the relevant data for a specific business unit.
 */
interface DataSummaryProps {
  /** The business unit identifier used for data fetching and routing */
  businessUnit: string;
}

// ---------------------- Business Unit Data Summary -------------------------//

/**
 * BusinessUnitDataSummary component provides an overview of data quality for a specific business unit.
 * It includes summary highlights, failure chart, and data tables for deeper inspection of failed datasets.
 *
 * @param businessUnit - The business unit for which the summary is displayed
 * @returns JSX.Element - The rendered component for displaying the data summary
 */
export const BusinessUnitDataSummary: FC<DataSummaryProps> = ({
  businessUnit,
}) => {
  // Apply component-specific styles
  const styles = useStyles();

  // Global Toast hook to display notifications for copy success/error feedback
  const { showToast } = useGlobalToast();

  // Fetch summary data for the business unit
  const { businessUnitSummary, isFetching } =
    useGetBusinessUnitSummary(businessUnit);

  // Fetch rule types for datasets when a highlight card is selected (PASSED/FAILED)
  const [selectedCard, setSelectedCard] = useState<{
    title: string;
    status: string;
  } | null>(null);
  const { datasetRuleTypes, isFetching: isDatasetRuleLoading } =
    useGetBusinessUnitDatasetRuleTypes(
      businessUnit,
      selectedCard?.status ?? ""
    );

  // Fetch dataset refresh statistics
  // const { data: datasetRefreshData, isFetching: isDatasetRefreshLoading } =
  //   useGetDataRefresh(decodeRouteParam(businessUnit));

  // State management for UI interactions
  // State for controlling accordion (only one panel open at a time)
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);
  // State for row copy feedback in failed datasets table
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);
  // Expanded rows state for failed datasets table
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  // State for copy feedback in rule types table
  const [copiedRuleRowIndex, setCopiedRuleRowIndex] = useState<number | null>(
    null
  );
  // Expanded rows state for rule types table
  const [expandedRuleRows, setExpandedRuleRows] = useState<
    Record<number, boolean>
  >({});

  // State for dataset details modal (whether it is open)
  const [isDatasetDetailsOpen, setIsDatasetDetailsOpen] = useState(false);
  // State for selected dataset details to show in the modal
  const [selectedDatasetDetails, setSelectedDatasetDetails] = useState<{
    dataset: string;
    ruleCategory?: string;
    ruleType?: string;
    ruleStatus: string;
  } | null>(null);

  // ---------------------- Chart Configuration -------------------------//
  /**
   * Prepares chart data points from rule-wise failure summary.
   * It uses a limited color palette cycling through neutral strokes for visual differentiation.
   */
  const chartColors = [
    tokens.colorNeutralStroke1, // Neutral color for first chart point
    tokens.colorNeutralStroke2, // Neutral color for second chart point
    tokens.colorNeutralStroke3, // Neutral color for third chart point
  ];

  // Map rule-wise failure datasets to chart points
  const chartPoints =
    businessUnitSummary?.rulewiseFailureDatasets?.map(
      (rule: any, index: number) => ({
        x: rule.rule_category, // Rule category as x-axis value
        y: rule.distinct_dataset_count, // Distinct dataset count as y-axis value
        color: chartColors[index % chartColors.length], // Cycle through chart colors
      })
    ) ?? []; // Default to empty array if no data

  // ---------------------- Summary Cards Configuration -------------------------//
  /**
   * Summary cards that display high-level data for the selected business unit, such as:
   * - Total verified datasets
   * - Verified & trusted datasets
   * - Datasets needing attention
   */
  const summaryCards = [
    {
      title: "Total Validated Datasets", // Title of the summary card
      count: businessUnitSummary?.highlights?.validated_datasets ?? 0, // Count of validated datasets
      percentage:
        businessUnitSummary?.highlights?.validated_datasets_percentage!, // Percentage of validated datasets
      info: "Total number of datasets that have been validated for selected business unit.",
      // Info tooltip text for the card
      // onClick: () =>
      //   handleCardClick({
      //     title: "Dataset Refresh",
      //     status: "TOTAL",
      //   }), // Click handler to open dataset refresh details
    },
    {
      title: "Successfully Validated Datasets", // Title of the summary card
      count: businessUnitSummary?.highlights?.passed_datasets ?? 0, // Count of passed datasets
      percentage: businessUnitSummary?.highlights?.passed_datasets_percentage!, // Percentage of passed datasets
      info: "Datasets that are successfully validated and considered trusted for use within the selected business unit. Click this card to view the list of datasets verified across different rule types.",
      // Info tooltip text for the card
      onClick: () =>
        handleCardClick({
          title: "Successfully Validated Datasets",
          status: "PASSED",
        }), // Click handler to open passed datasets details
    },
    {
      title: "Datasets Needing Attention", // Title of the summary card
      count: businessUnitSummary?.highlights?.failed_datasets ?? 0, // Count of failed datasets
      percentage: businessUnitSummary?.highlights?.failed_datasets_percentage!, // Percentage of failed datasets
      info: "Datasets that failed verification checks or contain issues requiring review for the selected business unit. Click this card to view the list of datasets that failed across different rule types.",
      // Info tooltip text for the card
      onClick: () =>
        handleCardClick({
          title: "Datasets Needing Attention",
          status: "FAILED",
        }), // Click handler to open failed datasets details
    },
  ];

  // ---------------------- Event Handlers -------------------------//
  /**
   * Handles click on a summary card and opens the corresponding accordion panel with dataset rule types.
   * @param card - An object containing title and status for the selected summary card
   */
  const handleCardClick = (card: { title: string; status: string }) => {
    // Set the selected card state to open the accordion with relevant data
    setSelectedCard(card);
    // Open the accordion panel for details
    setOpenAccordionKey("DETAILS");
  };

  /**
   * Copies text to clipboard and displays a success or error toast.
   * @param text - The text to copy to clipboard
   * @param rowIndex - The index of the row to which the copied text belongs
   * @param setter - State setter function to update the copy feedback state
   */
  const handleCopyToClipboard = async (
    text: string,
    rowIndex: number,
    setter: (index: number | null) => void
  ) => {
    // Attempt to write text to clipboard
    try {
      // Write text to clipboard
      await navigator.clipboard.writeText(text);
      // Update state to show success icon
      setter(rowIndex);
      // Show success toast notification
      showToast("Copied to clipboard!");
      // Reset the copied state after a delay
      setTimeout(() => setter(null), 1500); // Reset state after 1.5 seconds
    } catch {
      // Show error toast notification if copy fails
      showToast("Copy failed", "error");
    }
  };

  /**
   * Toggles the expanded state for a row in a table, allowing users to view more or less content.
   * @param index - The index of the row being toggled
   * @param state - The current expanded state of rows
   * @param setter - The state setter function to update expanded rows state
   */
  const toggleRowExpansion = (
    index: number,
    state: Record<number, boolean>,
    setter: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  ) => {
    // Toggle the expanded state for the specified row index
    setter((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /**
   * Opens the dataset details modal with the selected dataset information.
   * @param details - The details of the dataset to be displayed in the modal
   */
  const openDatasetDetails = (details: {
    dataset: string;
    ruleCategory?: string;
    ruleType?: string;
    ruleStatus: string;
  }) => {
    // Set the selected dataset details state
    setSelectedDatasetDetails(details);
    // Open the dataset details modal
    setIsDatasetDetailsOpen(true);
  };

  // ---------------------- Column Configurations -------------------------//
  /**
   * Column configuration for the "Failed Dataset Details" table.
   * Displays rule category, dataset count, and dataset names. Allows users to copy dataset names to clipboard.
   */
  const failedDatasetColumns: ColumnConfig<any>[] = [
    {
      key: "rule_category", // Unique key for the column
      label: "Rule Category", // Column header label
      width: "20%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      // Custom renderer to link to rule category details
      render: (value: string) => (
        // Link to navigate to rule category details
        <Link
          href={`${DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE}/l1-business-unit/${businessUnit}/rule-category/${prepareRouteParam(
            value
          )}`}
        >
          {value}
        </Link>
      ),
    },
    {
      key: "distinct_dataset_count", // Unique key for the column
      label: "Dataset Count", // Column header label
      width: "15%", // Width allocation
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "unique_dataset_names", // Unique key for the column
      label: "Dataset Names", // Column header label
      width: "auto", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      // Custom renderer to display dataset names with copy and show more/less functionality
      render: (value: string, row: any, rowIndex: number) => {
        // Split the dataset names into an array
        const datasets = value.split(",");
        // Check if the current row is expanded
        const isExpanded = expandedRows[rowIndex];

        return (
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <Button
              appearance="subtle" // Subtle button appearance
              size="small" // Small button size
              icon={
                copiedRowIndex === rowIndex ? (
                  <Checkmark16Filled />
                ) : (
                  <Copy16Regular />
                )
              } // Icon changes based on copy state
              onClick={() =>
                handleCopyToClipboard(value, rowIndex, setCopiedRowIndex)
              } // Copy handler
              aria-label="Copy dataset names to clipboard" // Accessibility label
            />

            <div className="flex items-center gap-1">
              {/* Dataset list (truncated or full) */}
              <div className="max-h-20 overflow-y-auto!">
                {isExpanded
                  ? datasets.map((dataset: string, idx: number) => (
                    // Full list when expanded
                    <Text
                      key={idx} // Unique key for each dataset
                      size={200} // Text size
                      className="cursor-pointer hover:underline" // Styling for hover effect
                      onClick={() =>
                        openDatasetDetails({
                          dataset: dataset.trim(), // Trim whitespace
                          ruleCategory: row.rule_category, // Pass rule category
                          ruleStatus: "FAILED", // Status is FAILED
                        })
                      } // Click handler to open dataset details
                    >
                      {/* Dataset name */}
                      {dataset}
                      {/* Comma separator */}
                      {idx < datasets.length - 1 && ", "}
                    </Text>
                  ))
                  : datasets
                    .slice(0, 3)
                    .map((dataset: string, idx: number) => (
                      // Truncated list when not expanded
                      <Text
                        key={idx} // Unique key for each dataset
                        size={200} // Text size
                        className="cursor-pointer hover:underline" // Styling for hover effect
                        onClick={() =>
                          openDatasetDetails({
                            dataset: dataset.trim(), // Trim whitespace
                            ruleCategory: row.rule_category, // Pass rule category
                            ruleStatus: "FAILED", // Status is FAILED
                          })
                        } // Click handler to open dataset details
                      >
                        {/* Dataset name */}
                        {dataset}
                        {/* 
                          Conditionally render a comma separator between dataset items.
                          - A comma is shown only if the current item is NOT the last visible item.
                          - The number of visible items depends on `isExpanded`:
                            - Expanded: all datasets are visible
                            - Collapsed: only the first 3 datasets are visible

                          Example:
                            datasets = ["npa_extended_insights_monthly", "valuetrak_852_monthly", "cdw_call_plan", "valuetrak_857_weekly"]

                            isExpanded = false → visible items: ["npa_extended_insights_monthly", "valuetrak_852_monthly", "cdw_call_plan"]
                              Rendered as: npa_extended_insights_monthly, valuetrak_852_monthly, cdw_call_plan

                            isExpanded = true → visible items: ["npa_extended_insights_monthly", "valuetrak_852_monthly", "cdw_call_plan", "valuetrak_857_weekly"]
                              Rendered as: npa_extended_insights_monthly, valuetrak_852_monthly, cdw_call_plan, valuetrak_857_weekly
                        */}
                        {idx <
                          (isExpanded
                            ? datasets.length
                            : Math.min(3, datasets.length)) -
                          1 && ", "}
                      </Text>
                    ))
                    .concat(
                      datasets.length > 3 ? (
                        // Ellipsis when there are more datasets
                        <Text key="3" size={200}>
                          ...
                        </Text>
                      ) : (
                        // Empty fragment when no ellipsis needed
                        <Text key="4"></Text>
                      )
                    )}
              </div>

              {/* Show more/less toggle when content is long */}
              {datasets.length > 3 && (
                // Toggle button to expand/collapse dataset list
                <Button
                  appearance="subtle" // Subtle button appearance
                  size="small" // Small button size
                  onClick={() =>
                    toggleRowExpansion(rowIndex, expandedRows, setExpandedRows)
                  } //
                >
                  {/* Toggle button text */}
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  /**
   * Column configuration for the dataset rule types table inside the accordion.
   */
  const datasetRuleColumns: ColumnConfig<any>[] = [
    {
      key: "dataset_name", // Unique key for the column
      label: "Dataset Name", // Column header label
      width: "auto", // Width allocation
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "RULE_TYPE", // Unique key for the column
      label: "Rule Types", // Column header label
      width: "auto", // Width allocation
      sortable: true, // Enables sorting functionality for the column
      // Custom renderer to display rule types with copy and show more/less functionality
      render: (value: string, row: any, rowIndex: number) => {
        // Split the rule types into an array
        const ruleTypes = value.split(",");
        // Check if the current row is expanded
        const isExpanded = expandedRuleRows[rowIndex];

        return (
          // Container for rule types with copy and show more/less functionality
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <Button
              appearance="subtle" // Subtle button appearance
              size="small" // Small button size
              icon={
                copiedRuleRowIndex === rowIndex ? (
                  <Checkmark16Filled /> // Success icon if copied
                ) : (
                  <Copy16Regular /> // Copy icon otherwise
                )
              } // Icon changes based on copy state
              onClick={() =>
                handleCopyToClipboard(value, rowIndex, setCopiedRuleRowIndex)
              } // Copy handler
              aria-label="Copy rule types to clipboard" // Accessibility label
            />

            <div className="flex items-center gap-1">
              {/* Rule types list (truncated or full) */}
              <div className="max-h-20 overflow-y-auto!">
                {isExpanded
                  ? ruleTypes.map((ruleType: string, idx: number) => (
                    // Full list when expanded
                    <Text
                      key={idx} // Unique key for each rule type
                      size={200} // Text size
                      className="cursor-pointer hover:underline" // Styling for hover effect
                      onClick={() =>
                        openDatasetDetails({
                          dataset: row.dataset_name, // Pass dataset name
                          ruleType: ruleType.trim(), // Trim whitespace
                          ruleStatus: selectedCard?.status ?? "", // Pass selected card status
                        })
                      }
                    >
                      {/* Rule type text */}
                      {ruleType}
                      {/* Comma separator */}
                      {idx < ruleTypes.length - 1 && ", "}
                    </Text>
                  ))
                  : ruleTypes
                    .slice(0, 3)
                    .map((ruleType: string, idx: number) => (
                      // Truncated list when not expanded
                      <Text
                        key={idx} // Unique key for each rule type
                        size={200} // Text size
                        className="cursor-pointer hover:underline" // Styling for hover effect
                        onClick={() =>
                          openDatasetDetails({
                            dataset: row.dataset_name, // Pass dataset name
                            ruleType: ruleType.trim(), // Trim whitespace
                            ruleStatus: selectedCard?.status ?? "", // Pass selected card status
                          })
                        } // Click handler to open dataset details
                      >
                        {/* Dataset name */}
                        {ruleType}
                        {/* 
                            Conditionally render a comma separator between rule types.
                            - A comma is shown only if the current item is NOT the last visible rule type.
                            - The number of visible rule types depends on `isExpanded`:
                              - If `isExpanded` is true, all rule types are visible.
                              - If `isExpanded` is false, only the first 3 rule types are visible.

                            Example:
                              ruleTypes = ["timeliness", "format", "freshness", "volume"]

                              isExpanded = false → rendered as:
                                timeliness, format, freshness

                              isExpanded = true → rendered as:
                                timeliness, format, freshness, volume
                          */}
                        {idx <
                          (isExpanded
                            ? ruleTypes.length
                            : Math.min(3, ruleTypes.length)) -
                          1 && ", "}
                      </Text>
                    ))
                    .concat(
                      ruleTypes.length > 3 ? (
                        // Ellipsis when there are more datasets
                        <Text key="3" size={200}>
                          ...
                        </Text>
                      ) : (
                        // Empty fragment when no ellipsis needed
                        <Text key="4"></Text>
                      )
                    )}
              </div>

              {/* Show more/less toggle when content is long */}
              {ruleTypes.length > 3 && (
                // Toggle button to expand/collapse dataset list
                <Button
                  appearance="subtle" // Subtle button appearance
                  size="small" // Small button size
                  onClick={() =>
                    toggleRowExpansion(
                      rowIndex,
                      expandedRuleRows,
                      setExpandedRuleRows
                    )
                  }
                >
                  {/* Toggle button text */}
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  /**
   * Column configuration for the dataset refresh rule types inside the accordion.
   */
  // const datasetRefreshColumns: ColumnConfig<any>[] = [
  //   {
  //     key: "dataset_name", // Unique key for the column
  //     label: "Dataset Name", // Column header label
  //     width: "50%", // Width allocation
  //     copyable: true, // Enable copy to clipboard
  //     showMore: true, // Enable show more/less functionality
  //   },
  //   {
  //     key: "timestamp", // Unique key for the column
  //     label: "Timestamp", // Column header label
  //     width: "auto", // Width allocation
  //     getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
  //   },
  //   {
  //     key: "refresh_status", // Unique key for the column
  //     label: "Status", // Column header label
  //     width: "auto", // Width allocation
  //   },
  // ];

  // ---------------------- Loading State -------------------------//
  /**
   * If the data is still being fetched, show a loading spinner.
   */
  if (isFetching) {
    // Centered spinner with background
    return (
      <div className="flex h-[50vh] items-center justify-center bg-gray-50">
        {/* Loading spinner while data is being fetched */}
        <Spinner size="large" label="Loading dataset…" />
      </div>
    );
  }

  // ---------------------- Final Rendering -------------------------//
  return (
    <div>
      {/* Highlight summary cards */}
      <Highlights data={summaryCards} />

      {/* Accordion showing detailed dataset rule types when a card is selected */}
      {selectedCard && (
        // Accordion for dataset details
        <Accordion
          multiple={false} // Allow only one panel open at a time
          collapsible // Allow panels to be collapsible
          openItems={openAccordionKey ? [openAccordionKey] : []} // Control open panel
          onToggle={(_, { openItems }) => {
            // Update open accordion key based on user interaction
            const nextKey = (openItems as string[])?.[0] ?? null;
            // Handle accordion toggle
            setOpenAccordionKey(nextKey);
          }}
        >
          {/* Accordion item for dataset details */}
          <AccordionItem value="DETAILS">
            {/* Accordion header with title */}
            <AccordionHeader>
              <Text size={400} weight="semibold">
                {selectedCard.title}
              </Text>
            </AccordionHeader>
            {/* Accordion panel containing dataset refresh stats and the detailed dataset refresh data grid */}
            <AccordionPanel>
              {/* {selectedCard?.status === "TOTAL" && (
                // Dataset refresh statistics component
                <DataRefreshStats
                  refreshed={datasetRefreshData?.refreshed_datasets ?? 0} // Number of refreshed datasets
                  unrefreshed={datasetRefreshData?.unrefreshed_datasets ?? 0} // Number of unrefreshed datasets
                  total={
                    (datasetRefreshData?.refreshed_datasets ?? 0) +
                    (datasetRefreshData?.unrefreshed_datasets ?? 0)
                  } // Total datasets
                  lastUpdate={
                    datasetRefreshData?.last_refresh_timestamp
                      ? formatDateTime(
                        datasetRefreshData.last_refresh_timestamp
                      )
                      : undefined
                  } // Last refresh timestamp formatted
                />
              )} */}
              {/* DataGrid for displaying dataset refresh or rule data */}
              <DataGrid
                columns={
                  datasetRuleColumns // Columns for dataset rule types
                }
                data={
                    datasetRuleTypes ?? [] // Data for dataset rule types
                }
                loading={isDatasetRuleLoading} // Loading state for data fetching
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* Failure Datasets Chart Section */}
      <div className={styles.sectionTitle}>
        {/* Chart title */}
        <Text size={400} weight="semibold">
          Data Integrity Exceptions by Rule Category
        </Text>
        {/* Help icon for chart explanation */}
        <Help info="Displays the number of failed datasets grouped by rule category for the selected business unit. Each rule category represents a specific type of data quality check—such as Metadata, Data Profiling, or Data Drift—that did not meet the required standards. Use this chart to identify which rule categories have the most exceptions and prioritize corrective actions." />
      </div>
      {/* Failure Chart */}
      <FailureChart
        points={chartPoints} // Data points for the chart
        yAxisTitle="Failed Datasets Count" // Y-axis title
        xAxisTitle="Rule Category" // X-axis title
      />

      {/* Failed Datasets Table Section */}
      <div className={styles.sectionTitle}>
        {/* Table title */}
        <Text size={400} weight="semibold">
          Failed Dataset Details
        </Text>
        {/* Help icon for table explanation */}
        <Help info="This table provides a detailed list of datasets that failed data integrity checks within the selected business unit. Each row includes the rule category, dataset count, and dataset names. Click on a dataset name to view detailed information explaining why the dataset failed for the corresponding rule category. Additionally, click on a rule category to drill down into a detailed view specific to that rule category." />
      </div>
      <DataGrid
        columns={failedDatasetColumns} // Columns configuration for the table
        data={businessUnitSummary?.rulewiseFailureDatasets ?? []} // Data for the table
        size="small" // Small size for compact display
      />

      {/* Dataset Details Modal */}
      {selectedDatasetDetails && (
        // Dataset details modal for in-depth information
        <DatasetDetailsModal
          open={isDatasetDetailsOpen} // Modal open state
          onOpenChange={setIsDatasetDetailsOpen} // Handler for modal open state change
          datasetName={selectedDatasetDetails.dataset} // Selected dataset name
          ruleCategory={
            selectedDatasetDetails.ruleCategory // Selected rule category
              ? prepareRouteParam(selectedDatasetDetails.ruleCategory) // Prepare route param
              : undefined // Undefined if not provided
          } // Selected rule category
          ruleType={selectedDatasetDetails.ruleType} // Selected rule type
          businessUnit={businessUnit} // Business unit identifier
          ruleStatus={selectedDatasetDetails.ruleStatus} // Selected rule status
        />
      )}
    </div>
  );
};
