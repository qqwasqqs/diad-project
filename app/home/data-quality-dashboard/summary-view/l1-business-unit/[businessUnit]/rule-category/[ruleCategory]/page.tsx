/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script is responsible for rendering the detailed view of a specific rule category within a business unit
    in the Data Quality Dashboard. It includes multiple sections, such as:
    - Highlights summary of datasets.
    - Failure chart showing the number of failed datasets grouped by rule.
    - Tables that display failed datasets by rule, top failed datasets, and datasets by rule types.
    - Modals for viewing dataset details.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------- Imports and Types -------------------------//

/*  @/components/charts/FailureChart  
    - What it is: A reusable FailureChart component for visualizing rule name failures.
    - Why used: Renders the BarChart chart for rule names vs failures datasets in the business unit summary.
*/
import { FailureChart } from "@/components/charts/FailureChart"; // Failure chart visualization

/* @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid"; // Custom DataGrid component

/*  
  ./DatasetDetailsModal
    - What it is: A modal component for displaying detailed dataset information.
    - Why used: Provides a detailed view of dataset information when a user selects a dataset.
*/
import { DatasetDetailsModal } from "@/components/ui/DatasetDetailsModal"; // Modal to show dataset details

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
import { Help } from "@/components/ui/Help"; // Tooltip/Help component

/*  
  @/components/ui/Highlights
    - What it is: A reusable component to display a rule category summary cards.
    - Why used: Renders the high-level a rule category highlights in a card format.
*/
import { Highlights } from "@/components/ui/Highlights"; // Highlight cards for dataset summary

/*  
  @/constants/routes
    - What it is: A module containing route constants for navigation.
    - Why used: Provides a constant for the Data Quality Dashboard summary view route.
*/
import { DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes"; // Constant route for the dashboard

/*  @/hooks/useQualityDashboard 
    - What it is: Custom hooks for fetching data related to the quality dashboard.
    - Why used: Provides data fetching capabilities for rule categories, summaries, and dataset rule types.
*/
import {
  useGetBusinessUnitDatasetRuleTypes,
  useGetRuleCategories,
  useGetRuleCategorySummary,
} from "@/hooks/useQualityDashboard"; // Custom hooks to fetch quality dashboard data

/*  
  @/lib/helper
    - What it is: Local helper functions for data formatting and URL parameter handling.
    - Why used: Provides utility functions for decoding route parameters and formatting date/time.
*/
import {
  decodeRouteParam,
  formatRouteParam,
} from "@/lib/helper"; // Helper functions for formatting and decoding route params

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Text,
  makeStyles,
  tokens,
  Title3,
  Dropdown,
  Option,
  Spinner,
  Button,
  Field,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from "@fluentui/react-components"; // Fluent UI components for styling and UI elements

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Checkmark16Filled, Copy16Regular } from "@fluentui/react-icons"; // Fluent UI icons for copy buttons

/*  
  next/navigation
    - What it is: Next.js navigation utilities for client-side routing.
    - Why used: Enables programmatic navigation between Data Quality dashboard pages.
*/
import { useRouter } from "next/navigation"; // Next.js router for navigation

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for async parameter resolution, managing component state and side effects.
*/
import React, { useEffect, useState } from "react"; // React hooks for state and effects

/*  
  @/hooks/useToast
    - What it is: Custom hook for displaying toast notifications.
    - Why used: Displays the "Copied to clipboard!" message to the user as a toast notification.
*/
import { useGlobalToast } from "@/hooks/useToast"; // Custom hook for showing toast notifications
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------- Styles -------------------------//

/**
 * useStyles
 * Defines custom styles for the RuleCategory page using Fluent UI's `makeStyles`.
 * This ensures consistent spacing, layout, and design across the component.
 *
 * @returns Object - Styles used within the component for various UI elements
 */
const useStyles = makeStyles({
  root: {
    paddingTop: tokens.spacingHorizontalM, // Top padding for the root container
  },
  header: {
    display: "flex", // Flexbox layout for header
    flexDirection: "column",
    alignItems: "left", // Vertically center align items
    marginBottom: tokens.spacingVerticalXXL, // Bottom margin for header
  },    
  filterContainer: {
    display: "flex",        // Arrange filters horizontally
    flexWrap: "wrap",       // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Space between individual filter controls
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Bold title text
    color: tokens.colorNeutralForeground1, // Neutral color for text
    marginBottom: tokens.spacingVerticalS, // Spacing below the title
  },
  sectionTitle: {
    display: "flex", // Flex layout for section title
    alignItems: "center", // Center items vertically
    gap: tokens.spacingHorizontalS, // Horizontal spacing between items
    marginTop: tokens.spacingVerticalL, // Margin at the top of the section
    fontWeight: tokens.fontWeightSemibold, // Semi-bold text style
    color: tokens.colorNeutralForeground1, // Neutral color for section title text
  },
});

/**
 * Props interface for RuleCategory component
 */
interface RuleCategoryProps {
  // Route parameters containing business unit and rule category
  params: Promise<{ businessUnit: string; ruleCategory: string }>;
}

// ---------------------- RuleCategory Component -------------------------//

/**
 * RuleCategory Component
 * Displays detailed information about a specific rule category within a business unit.
 * The component includes sections like:
 * - Summary cards highlighting dataset stats (verified datasets, datasets needing attention, etc.).
 * - Data charts visualizing rule-wise failed datasets.
 * - Tables showing datasets by rule, top failed datasets, and dataset rule types.
 * - Modals to show detailed dataset information when a dataset is clicked.
 *
 * @param {RuleCategoryProps} props - Props passed to the component, containing route parameters.
 * @returns JSX.Element - The rendered UI component, including tables, charts, and modals.
 */
export default function RuleCategory({ params }: RuleCategoryProps) {
  // Extract business unit and rule category from route parameters using React's `use()` for async resolution
  const { businessUnit, ruleCategory } = React.use(params);

  // Hooks to get all rule categories for a business unit
  const { ruleCategories } = useGetRuleCategories(businessUnit);
  // Get summary data for the selected rule category
  const { ruleCategorySummary, isFetching } = useGetRuleCategorySummary(
    businessUnit,
    ruleCategory
  ); // Get rule category summary data
  const [selectedCard, setSelectedCard] = useState<{
    title: string; // Title of the selected card
    status: string; // Status associated with the selected card (e.g., 'FAILED', 'PASSED', etc.)
  } | null>(null); // Selected card to display in accordion
  const { datasetRuleTypes, isFetching: isLoadingDatasetRules } =
    useGetBusinessUnitDatasetRuleTypes(
      businessUnit, // Business unit parameter
      selectedCard?.status ?? "", // Status from selected card or empty string
      ruleCategory // Rule category parameter
    ); // Get dataset rule types for selected rule category

  // Router and toast notification setup
  const router = useRouter();
  // Using styles defined above
  const styles = useStyles();
  // Toast notification setup
  const { showToast } = useGlobalToast();

  const {canRead, isLoadingPermissions} = usePagePermissions("data-quality-dashboard-summary-view");

  // State variables for handling UI interactions
  const [selectedRuleDisplay, setSelectedRuleDisplay] = useState<string>(""); // Selected rule category for display in dropdown
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null); // Tracks which row was copied in the rule-wise dataset table
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({}); // Tracks expanded rows in rule-wise dataset table
  const [copiedDatasetRowIndex, setCopiedDatasetRowIndex] = useState<
    number | null
  >(null); // Tracks which dataset row was copied
  const [expandedDatasetRows, setExpandedDatasetRows] = useState<
    Record<number, boolean>
  >({}); // Tracks expanded rows in dataset rule types table
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null); // Tracks the open state of the accordion
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false); // Tracks if the dataset modal is open
  const [selectedDatasetDetails, setSelectedDatasetDetails] =
    useState<any>(null); // Data to pass to dataset details modal

  // Effect to decode and set the rule category display name
  useEffect(() => {
    // Decode and set the rule category display name when route param changes
    if (ruleCategory) {
      // Decode the route parameter for rule category
      setSelectedRuleDisplay(decodeRouteParam(ruleCategory));
    }
  }, [ruleCategory]);

  // Define color palette for chart data points
  const chartColors = [
    tokens.colorNeutralStroke1, // Neutral stroke color
    tokens.colorNeutralStroke2, // Secondary neutral stroke color
    tokens.colorNeutralStroke3, // Tertiary neutral stroke color
  ];

  // Prepare chart data for failure chart visualization
  const chartPoints =
    ruleCategorySummary?.rulewiseFailedDatasets?.map(
      (rule: any, index: number) => ({
        x: rule.RULE_NAME, // Rule name for x-axis
        y: rule.distinct_dataset_count, // Number of failed datasets for y-axis
        color: chartColors[index % chartColors.length], // Assign color from palette
      })
    ) || []; // Default to empty array if no data

  // Configuration for the summary cards
  const summaryCards = [
    {
      title: "Total Validated Datasets", // Title of the summary card
      count: ruleCategorySummary?.highlights?.validated_datasets ?? 0, // Count of validated datasets
      percentage:
        ruleCategorySummary?.highlights?.validated_datasets_percentage!, // Percentage of validated datasets
      info: "Total number of datasets that have been validated for selected business unit and rule category.", // Info tooltip text
      // Click handler to open detailed refresh statistics
      // onClick: () =>
      //   handleCardClick({ title: "Dataset Refresh", status: "TOTAL" }),
    },
    {
      title: "Successfully Validated Datasets", // Title of the summary card
      count: ruleCategorySummary?.highlights?.passed_datasets ?? 0, // Count of passed datasets
      percentage: ruleCategorySummary?.highlights?.passed_datasets_percentage!, // Percentage of passed datasets
      info: "Datasets that are successfully validated and considered trusted for use within the selected business unit and rule category. Click this card to view the list of datasets verified across different rule types.", // Info tooltip text
      // Click handler to open passed datasets details
      onClick: () =>
        handleCardClick({
          title: "Successfully Validated Datasets", // Title for the passed datasets card
          status: "PASSED", // Status for passed datasets
        }),
    },
    {
      title: "Datasets Needing Attention", // Title of the summary card
      count: ruleCategorySummary?.highlights?.failed_datasets ?? 0, // Count of failed datasets
      percentage: ruleCategorySummary?.highlights?.failed_datasets_percentage!, // Percentage of failed datasets
      info: "Datasets that failed verification checks or contain issues requiring review for the selected business unit and rule category. Click this card to view the list of datasets that failed across different rule types.", // Info tooltip text
      // Click handler to open failed datasets details
      onClick: () =>
        handleCardClick({
          title: "Datasets Needing Attention", // Title for the failed datasets card
          status: "FAILED", // Status for failed datasets
        }),
    },
  ];

  /**
   * Handles a click on a summary card and updates the selected card for detailed data.
   * This action opens the corresponding accordion section to show detailed dataset information.
   */
  const handleCardClick = (card: { title: string; status: string }) => {
    // Update the selected card state
    setSelectedCard(card);
    // Open accordion section to show detailed data
    setOpenAccordionKey("DETAILS");
  };

  /**
   * Copies a dataset or rule type value to the clipboard and shows a success toast.
   * It also updates the copied index to provide visual feedback for the user.
   *
   * @param {string} text - The text to copy to clipboard
   * @param {number} rowIndex - The index of the row that was copied
   * @param {React.Dispatch<React.SetStateAction<number | null>>} setCopiedIndex - State setter to update the copied row index
   */
  const copyToClipboard = async (
    text: string,
    rowIndex: number,
    setCopiedIndex: React.Dispatch<React.SetStateAction<number | null>>
  ) => {
    // Attempt to copy the text to clipboard
    try {
      await navigator.clipboard.writeText(text); // Copy text to clipboard
      setCopiedIndex(rowIndex); // Update the copied row index
      showToast("Copied to clipboard!"); // Show success toast
      setTimeout(() => setCopiedIndex(null), 1500); // Clear copied index after 1.5 seconds
    } catch {
      showToast("Copy failed", "error"); // Show error toast if copy fails
    }
  };

  /**
   * Toggles the expansion state of a specific row to show more or fewer datasets.
   *
   * @param {number} index - The index of the row to toggle
   * @param {Record<number, boolean>} expandedState - The current expanded state of rows
   * @param {React.Dispatch<React.SetStateAction<Record<number, boolean>>>} setExpandedState - State setter to update expanded rows
   */
  const toggleRowExpansion = (
    index: number,
    expandedState: Record<number, boolean>,
    setExpandedState: React.Dispatch<
      React.SetStateAction<Record<number, boolean>>
    >
  ) => {
    // Toggle the expansion state of the row at the given index
    setExpandedState((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  /**
   * Handles a click on a dataset name, which opens the dataset details modal.
   *
   * @param {Object} details - Details of the dataset to display in the modal
   */
  const handleDatasetClick = (details: {
    dataset: string;
    ruleName?: string;
    ruleType?: string;
    ruleStatus: string;
  }) => {
    setSelectedDatasetDetails(details); // Set dataset details for modal
    setIsDatasetModalOpen(true); // Open the dataset details modal
  };

  /**
   * Handles the selection of a rule category from the dropdown.
   * This action updates the URL to reflect the selected rule category.
   *
   * @param {any} _ - Event object (not used)
   * @param {any} data - The selected option's data, including the rule category value
   */
  const handleRuleSelect = (_: any, data: any) => {
    // Update URL to reflect the selected rule category
    const selectedValue = data.optionValue || "";
    // Update URL to reflect the selected rule category
    if (selectedValue) {
      // Update URL to reflect the selected rule category
      router.replace(
        `${DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE}/l1-business-unit/${businessUnit}/rule-category/${selectedValue}`
      );
    }
  };

  // ---------------------- Columns Configuration -------------------------//

  // Column configuration for Rule-wise Failed Datasets table
  const rulewiseColumns: ColumnConfig<any>[] = [
    { key: "RULE_NAME", label: "Rule Name", width: "25%", sortable: true },
    { key: "distinct_dataset_count", label: "Dataset Count", width: "15%", sortable: true },
    {
      key: "unique_dataset_names",
      label: "Dataset Names",
      width: "auto",
      sortable: true, // Enables sorting functionality for the column
      render: (value: string, row: any, globalIndex: number) => {
        // Split the dataset names by comma
        const datasets = value.split(",");
        // Check if the current row is expanded
        const isExpanded = expandedRows[globalIndex];

        return (
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <Button
              appearance="subtle" // Subtle button appearance
              size="small" // Small button size
              icon={
                copiedRowIndex === globalIndex ? (
                  <Checkmark16Filled /> // Success icon if copied
                ) : (
                  <Copy16Regular /> // Copy icon otherwise
                )
              } // Icon changes based on copy state
              onClick={() =>
                copyToClipboard(value, globalIndex, setCopiedRowIndex)
              } // Copy handler
              aria-label="Copy rule types to clipboard" // Accessibility label
            />

            <div className="flex items-center gap-1">
              {/* Rule types list (truncated or full) */}
              <div className="max-h-20 overflow-y-auto!">
                {(isExpanded ? datasets : datasets.slice(0, 3)).map(
                  // Render datasets conditionally based on expansion state.
                  // - When `isExpanded` is true, display all datasets.
                  // - When `isExpanded` is false, display only the first 3 datasets.
                  //
                  // Example:
                  //   datasets = ["npa_extended_insights_monthly", "valuetrak_852_monthly", "cdw_call_plan", "valuetrak_857_weekly"]
                  //
                  //   isExpanded = false → ["npa_extended_insights_monthly, "valuetrak_852_monthly, "cdw_call_plan"]
                  //   isExpanded = true  → ["npa_extended_insights_monthly, "valuetrak_852_monthly, "cdw_call_plan", "valuetrak_857_weekly"]
                  (dataset: string, idx: number) => (
                    // Full list when expanded
                    <Text
                      key={idx} // Unique key for each rule type
                      size={200} // Text size
                      className="cursor-pointer hover:underline inline mr-1" // Styling for hover effect
                      onClick={() =>
                        handleDatasetClick({
                          dataset, // Pass dataset name
                          ruleName: row.RULE_NAME, // Pass rule name
                          ruleStatus: "FAILED", // Pass selected card status
                        })
                      }
                    >
                      {/* Dataset text */}
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
                        1 && ","}
                    </Text>
                  )
                )}
                {!isExpanded && datasets.length > 3 && "..."}
              </div>

              {datasets.length > 3 && (
                // Button to show more/less rule types
                <Button
                  appearance="subtle" // Subtle button appearance
                  size="small" // Small button size
                  onClick={() =>
                    toggleRowExpansion(
                      globalIndex, // Row index to toggle
                      expandedRows, // Current expanded state
                      setExpandedRows // State setter
                    )
                  } // Toggle handler
                >
                  {/* Button text */}
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  // Column configuration for Dataset Rule Types table (inside accordion)
  const datasetRuleTypeColumns: ColumnConfig<any>[] = [
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
      render: (value: string, row: any, globalIndex: number) => {
        // Split the rule types into an array
        const ruleTypes = value.split(",");
        // Check if the current row is expanded
        const isExpanded = expandedDatasetRows[globalIndex];

        return (
          // Container for rule types with copy and show more/less functionality
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <Button
              appearance="subtle" // Subtle button appearance
              size="small" // Small button size
              icon={
                copiedDatasetRowIndex === globalIndex ? (
                  <Checkmark16Filled /> // Success icon if copied
                ) : (
                  <Copy16Regular /> // Copy icon otherwise
                )
              } // Icon changes based on copy state
              onClick={() =>
                copyToClipboard(value, globalIndex, setCopiedDatasetRowIndex)
              } // Copy handler
              aria-label="Copy rule types to clipboard" // Accessibility label
            />

            <div className="flex items-center gap-1">
              {/* Rule types list (truncated or full) */}
              <div className="max-h-20 overflow-y-auto!">
                {(isExpanded ? ruleTypes : ruleTypes.slice(0, 3)).map(
                  // Conditionally display rule types based on expansion state.
                  // - If `isExpanded` is true, render all rule types.
                  // - If `isExpanded` is false, render only the first 3 rule types.
                  //
                  // Example:
                  //   ruleTypes = ["timeliness", "format", "freshness", "volume"]
                  //
                  //   isExpanded = false → ["timeliness", "format", "freshness"]
                  //   isExpanded = true  → ["timeliness", "format", "freshness", "volume"]
                  (ruleType: string, idx: number) => (
                    // Full list when expanded
                    <Text
                      key={idx} // Unique key for each rule type
                      size={200} // Text size
                      className="cursor-pointer hover:underline inline mr-1" // Styling for hover effect
                      onClick={() =>
                        handleDatasetClick({
                          dataset: row.dataset_name, // Pass dataset name
                          ruleType, // Pass rule type
                          ruleStatus: selectedCard?.status || "", // Pass selected card status
                        })
                      }
                    >
                      {/* Rule type text */}
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
                        1 && ","}
                    </Text>
                  )
                )}
                {!isExpanded && ruleTypes.length > 3 && "..."}
              </div>

              {ruleTypes.length > 3 && (
                // Button to show more/less rule types
                <Button
                  appearance="subtle" // Subtle button appearance
                  size="small" // Small button size
                  onClick={() =>
                    toggleRowExpansion(
                      globalIndex, // Row index to toggle
                      expandedDatasetRows, // Current expanded state
                      setExpandedDatasetRows // State setter
                    )
                  } // Toggle handler
                >
                  {/* Button text */}
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  // Column configuration for Top 5 Failed Datasets table
  const topFailedDatasetsColumns: ColumnConfig<any>[] = [
    { key: "DATASET_NAME", label: "Dataset Name", width: "20%", sortable: true },
    { key: "SCHEMA_NAME", label: "Schema Name", width: "15%", sortable: true },
    { key: "CATALOG_NAME", label: "Catalog Name", width: "12%", sortable: true },
    { key: "failed_rules_count", label: "Rule Count", width: "10%", sortable: true },
    {
      key: "failed_rule_names", // Unique key for the column
      label: "Rule Names", // Column header label
      width: "auto", // Width allocation
      copyable: true, // Enable copy to clipboard
      showMore: true, // Enable show more/less functionality
      sortable: true, // Enables sorting functionality for the column
    },
  ];

  // ---------------------- Loading State -------------------------//

  // Show loading spinner while fetching data
  if (isFetching) {
    // Centered spinner with background
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        {/* Loading spinner while data is being fetched */}
        <Spinner size="large" label="Loading dataset…" />
      </div>
    );
  }

  // ---------------------- Return JSX -------------------------//

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
      {/* Page Header */}
      <div className={styles.header}>
        {/* Page Title */}
        <Title3 className={styles.title}>
          {formatRouteParam(ruleCategory)}
          {/* Displays the formatted rule category */}
        </Title3>

        <div className={styles.filterContainer}>
        {/* Dropdown for selecting rule category */}
        <Field label="Rule Category">
          <Dropdown
            selectedOptions={[selectedRuleDisplay]} // Sets the selected rule Category
            value={formatRouteParam(selectedRuleDisplay)} // Bound to the selected rule Category state
            appearance="filled-darker" // Styling appearance of the dropdown
            onOptionSelect={handleRuleSelect} // Event handler for selection change
          >
            {/* Map through the fetched rule categories and display options */}
            {(ruleCategories || []).map((rule: any, idx: number) => (
              <Option key={idx} value={rule.RULE_CATEGORY}>
                {formatRouteParam(rule.RULE_CATEGORY)}
              </Option>
            ))}
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* Summary Highlights cards */}
      <Highlights data={summaryCards} />

      {/* Accordion: Detailed dataset list for selected card */}
      {selectedCard && (
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
              {/* DataGrid for displaying dataset refresh or rule data */}
              <DataGrid
                columns={
                      datasetRuleTypeColumns // Columns for dataset rule types
                }
                data={
                  datasetRuleTypes ?? [] // Data for dataset rule types
                }
                loading={isLoadingDatasetRules} // Loading state for data fetching
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* Failure Datasets Chart Section */}
      <div className={styles.sectionTitle}>
        {/* Chart title */}
        <Text size={400} weight="semibold">
          Data Integrity Exceptions by Rule Name
        </Text>
        {/* Help icon for chart explanation */}
        <Help info="Displays the number of failed datasets grouped by rule name for the selected business unit and rule category. Each rule name represents a specific type of data quality check—such as timeliness_check, uniqueness_check, or normality_check—that did not meet the required standards. Use this chart to identify which rule names have the most exceptions and prioritize corrective actions." />
      </div>
      {/* Failure Chart */}
      <FailureChart
        points={chartPoints} // Data points for the chart
        yAxisTitle="Failed Datasets Count" // Y-axis title
        xAxisTitle="Rule Name" // X-axis title
      />

      {/* Rule-wise Failed Datasets Table */}
      <div className={styles.sectionTitle}>
        {/* Table title */}
        <Text size={400} weight="semibold">
          Failed Dataset Details by Rule
        </Text>
        {/* Help icon for table explanation */}
        <Help info="This table provides a detailed list of datasets that failed data integrity checks within the selected business unit and rule category. Each row includes the rule name, dataset count, and dataset names. By clicking on a dataset name, you can view detailed information explaining why the dataset failed for the corresponding rule name." />
      </div>
      <DataGrid
        columns={rulewiseColumns} // Columns configuration for the table
        data={ruleCategorySummary?.rulewiseFailedDatasets || []} // Data for the table
        size="small" // Small size for compact display
      />

      {/* Dataset Details Modal */}
      {selectedDatasetDetails && (
        // Dataset details modal for in-depth information
        <DatasetDetailsModal
          open={isDatasetModalOpen} // Modal open state
          onOpenChange={setIsDatasetModalOpen} // Handler for modal open state change
          datasetName={selectedDatasetDetails.dataset} // Selected dataset name
          businessUnit={businessUnit} // Business unit identifier
          ruleCategory={ruleCategory} // Selected rule category
          ruleType={selectedDatasetDetails.ruleType} // Selected rule type
          ruleName={selectedDatasetDetails.ruleName} // Selected rule name
          ruleStatus={selectedDatasetDetails.ruleStatus} // Selected rule status
        />
      )}

      {/* Top 5 Failed Datasets Table */}
      <div className={styles.sectionTitle}>
        {/* Table title */}
        <Text size={400} weight="semibold">
          Top 5 Datasets with Highest Number of Failures
        </Text>
        {/* Help icon for table explanation */}
        <Help info="This table displays the top five datasets within the selected business unit and rule category that have the highest number of data integrity failures. Each row includes the dataset name, schema name, rule count, and rule names." />
      </div>
      <DataGrid
        columns={topFailedDatasetsColumns} // Column configuration for top failed datasets
        data={ruleCategorySummary?.topFiveFailedDatasets || []} // Data for top failed datasets
        size="small" // Small size for compact display
      />
    </div>
  );
}
