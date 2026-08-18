/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script represents the overview component of the Teva Data Integrity Automation Dashboard.
    - It renders the overview of dataset details, failed rule categories, metadata, and impacted datasets.
    - Displays data in various sections including dataset highlights, failure results by rule category, and metadata.
    - Makes use of data fetching hooks and stores from Zustand to maintain dataset filters and loading state.
    - Utilizes reusable components like `DataGrid`, `DonutChart`, and `Help` for displaying data and visualizations.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/hooks/useQualityDashboard
    - What it is: A custom React hook for fetching quality dashboard overview data.
    - Why used: To retrieve the necessary data for populating the overview component.
*/
import { useGetOverview } from "@/hooks/useQualityDashboard"; // Custom hook for fetching quality dashboard overview data
/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To access the currently applied dataset path and filter values.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Zustand store for dataset filter state

/* 
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { DataGrid, ColumnConfig } from "./DataGrid"; // Data grid component for rendering tabular data

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import { Spinner, tokens, Text, Button, makeStyles, Tooltip } from "@fluentui/react-components"; // Fluent UI components for UI elements

/*  
  @/components/charts/DonutChart
    - What it is: A reusable DonutChart component for visualizing data in a donut chart format.
    - Why used: Displays the distribution of failed results by rule category in a visual manner.
*/
import { DonutChart } from "../charts/DonutChart"; // Donut chart component for rule category failures visualization

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "./Help"; // Help component for providing additional information

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { LockClosedRegular, ArrowSyncRegular } from "@fluentui/react-icons";

/*  
  @/types/api
    - What it is: Type definitions for API data structures.
    - Why used: To ensure type safety and clarity when working with API data.
*/
import { HelperFunctionsJobPayload, RuleCategory } from "@/types/api"; // RuleCategory type for categorizing failed rules

/*
    @/components/ui/ClusterControl
    - What it is: A component that allows users to control the state of the Databricks cluster (e.g., start, stop) and displays real-time cluster events.
    - Why used: Provides users with the ability to manage the Databricks cluster directly from the KPI Configuration Management page, ensuring they can start the cluster when needed to add or manage KPI configurations, and stay informed about cluster status through real-time event streaming.
*/
import { ClusterControl } from "./ClusterControl";

/*
    @/lib/services/greatExpectationsService
    - What it is: A service module in our project that contains functions for making API calls to the Great Expectations backend. It handles requests related to managing KPI configurations, such as creating new configurations or fetching existing ones.
    - Why used: We use this service to submit the new KPI configuration data to the backend when the user submits the form. The manageKPIConfiguration function in this service takes the form data, sends it to the API, and returns a response that includes a run ID. This allows us to track the status of the configuration creation process and provide feedback to the user through notifications.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/*  
  @/components/ui/JobStatusToaster
    - What it is: A custom component which shows the status of the job.
    - Why used: Provides the addRunId function to track the status of rule creation jobs.
*/
import { addRunId } from "./JobStatusToaster";

/*  
@/hooks/useToast
- What it is: A custom hook to manage toast notifications.
- Why used: Used for displaying success, error, or informational toast messages.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
// Importing useState hook to manage component state (like search text, dialog visibility)
import { useState } from "react";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

//---------------------- Styles -------------------------//
/**
 * useStyles - Custom hook for generating component-specific styles using Fluent UI's `makeStyles`.
 *
 * @returns Styles object that contains custom styles for the component.
 */
const useStyles = makeStyles({
  sectionTitle: {
    display: "flex", // Align items horizontally
    alignItems: "center", // Vertically center align
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS, // Horizontal gap between elements
    marginTop: tokens.spacingVerticalL, // Top margin
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font weight
    color: tokens.colorNeutralForeground1, // Text color from Fluent UI token
  },
});

//---------------------- Overview Component -------------------------//
/**
 * Overview Component
 *
 * This component fetches and displays an overview of the dataset, including key highlights, failed rule categories,
 * dataset metadata, and impacted entities. It utilizes `useGetOverview` for fetching data and Zustand store
 * for managing dataset filter state.
 *
 * @returns JSX.Element - The component representing the overview section of the dashboard.
 */
export const Overview = () => {
  const styles = useStyles(); // Generate custom styles for the component

  // Get the global toast notification function for showing success/error messages
  const { showToast } = useGlobalToast();

  // handle the state of the cluster. If running then state it as true else false
  const [isClusterRunning, setIsClusterRunning] = useState<boolean>(false);

  const { overviewData, isFetching } = useGetOverview(); // Fetch overview data with loading state
  const datasetPath = useDQDDetailedViewFiltersStore((state) =>
    state.appliedDatasetPath()
  ); // Get current applied dataset path(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly")
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore(); // Get applied filters from Zustand store
  const donutData = overviewData?.failedRulePercentage ?? []; // Extract donut chart data, default to empty array if undefined

  const { canRead, hasPermission, isLoadingPermissions } = usePagePermissions("data-quality-dashboard-detailed-view");
  const canManageCluster = hasPermission("data-quality-dashboard-detailed-view-cluster:manage");

  // Columns configuration for dataset metadata table
  const datasetMetadataColumns: ColumnConfig<any>[] = [
    { key: "col_name", label: "Column Name", width: "auto", sortable: true },
    { key: "data_type", label: "Data Type", width: "auto", sortable: true },
    { key: "comment", label: "Comment", width: "auto" },
  ];

  // Columns configuration for impacted entities table
  const datasetsImpactedColumns: ColumnConfig<any>[] = [
    {
      key: "IMPACTED_ENTITY_NAME",
      label: "Impacted Entity Name",
      width: "60%",
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "IMPACTED_ENTITY_TYPE",
      label: "Impacted Entity Type",
      width: "auto",
      sortable: true, // Enables sorting functionality for the column
    },
  ];

  // Mapping for rule categories to colors
  const categoryColorMap: Record<RuleCategory, string> = {
    data_drift: tokens.colorNeutralStroke1,
    data_profiling: tokens.colorNeutralStroke2,
    metadata: tokens.colorNeutralStroke3,
  };

  // Mapping for rule categories to labels
  const categoryLabelMap: Record<RuleCategory, string> = {
    data_drift: "Data Drift",
    data_profiling: "Data Profiling",
    metadata: "Metadata",
  };

  // Preparing data for DonutChart component (Failed results categorized by rule type)
  const failedByCategory = donutData.map(
    (item: { RULE_CATEGORY: RuleCategory; failed_rule_percentage: any }) => ({
      name: categoryLabelMap[item.RULE_CATEGORY], // Category name (e.g., Data Drift)
      value: item.failed_rule_percentage ? item.failed_rule_percentage : 0, // Percentage of failed rules
      color: categoryColorMap[item.RULE_CATEGORY], // Category color
    })
  );

  // function to post a request to run the helper function job in databricks
  // it refreshes the data of the impacted dataset details.
  const refreshData = () => {

    // create payload to send to the backend
    const payload: HelperFunctionsJobPayload = {
      CATALOG_NAME: appliedCatalog, // catalog name of selected dataset
      FUNCTION: "get_dataset_impact_analysis", // function name
      SCHEMA_NAME: appliedSchema, // schema name of dataset
      DATASET_NAME: appliedDataset // name of dataset
    };

    // send post request to perform the refresh process
    greatExpectationsService.runHelperFunction(payload)
      .then((response) => {
        // shows the status of the process whether running, completed, succeeded or failed
        addRunId(response?.run_id);
        // Show success notification
        showToast(`Request to refresh the data has been submitted successfully with Run ID: ${response?.run_id}`, undefined, undefined, "top-end"); // show the user message
        // Close the drawer and reset the form
      }).catch((error) => {
        // Log error and show error notification
        console.error("Failed to refresh data:", error);
        // showToast("Failed to create rule.", "error", undefined, "top-end"); // show user message
      });
  };

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
    <div>
      {/* Highlights section(1/3 of the width) and Failed Results by Rule Category(i.e DonutChart) section(2/3 of the with)  */}
      <div className="flex gap-4">
        {/* Highlights Stats */}
        <div className="w-1/2 bg-neutral-background-3 border border-gray-200 rounded-lg p-4 shadow-md space-y-2">
          {/* Highlights Title */}
          <Text size={400} weight="semibold">
            Highlights
          </Text>
          {/* Show loading spinner if data is being fetched */}
          {isFetching ? (
            <div className="flex min-h-[15vh] items-center justify-center">
              {/* Loading spinner while data is being fetched */}
              <Spinner size="small" label="Loading dataset…" />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {/* Container for dataset overview details with top margin and vertical spacing */}

              {/* Total row count display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for total rows */}
                <div className="text-xs font-bold">Total Row:</div>

                {/* Value for total rows, formatted with commas; fallback to "-" if unavailable */}
                <div className="text-xs font-bold">
                  {overviewData?.overview?.row_count?.toLocaleString() ?? "-"}
                </div>
              </div>

              {/* Total column count display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for total columns */}
                <div className="text-xs font-bold">Total Columns:</div>

                {/* Value for total columns, formatted with commas; fallback to "-" if unavailable */}
                <div className="text-xs font-bold">
                  {overviewData?.overview?.column_count?.toLocaleString() ??
                    "-"}
                </div>
              </div>

              {/* Catalog name display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for catalog name */}
                <div className="text-xs font-bold">Catalog Name:</div>

                {/* Selected catalog name; fallback to "-" if not set */}
                <div className="text-xs">{appliedCatalog ?? "-"}</div>
              </div>

              {/* Schema name display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for schema name */}
                <div className="text-xs font-bold">Schema Name:</div>

                {/* Selected schema name; fallback to "-" if not set */}
                <div className="text-xs">{appliedSchema ?? "-"}</div>
              </div>

              {/* Dataset name display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for dataset name */}
                <div className="text-xs font-bold">Dataset Name:</div>

                {/* Selected dataset name; fallback to "-" if not set */}
                <div className="text-xs">{appliedDataset ?? "-"}</div>
              </div>

              {/* Primary key information display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for primary key */}
                <div className="text-xs font-bold">Primary Key:</div>

                {/*  Display key columns if available and non-empty; otherwise show "Unspecified" */}
                <div className="text-xs">
                  {overviewData?.overview?.key_columns &&
                    overviewData?.overview?.key_columns?.length > 0
                    ? overviewData?.overview?.key_columns
                    : "Unspecified"}
                </div>
              </div>

              {/* Schema owner information display */}
              <div className="flex items-center gap-2 text-neutral-foreground-2">
                {/* Label for schema owner */}
                <div className="text-xs font-bold">Schema Owner:</div>

                {/* Schema owner name; fallback to "-" if unavailable */}
                <div className="text-xs">
                  {overviewData?.overview?.schema_owner ?? "-"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Failed Results by Rule Category */}
        <div className="w-1/2 flex gap-4 flex-col items-center bg-neutral-background-3 border border-gray-200 rounded-lg p-4 shadow-md">
          {/* Donut Chart title */}
          <Text size={400} weight="semibold">
            Failed Results by Rule Category
          </Text>
          {/* Show loading spinner if data is being fetched */}
          {isFetching ? (
            <div className="flex min-h-[15vh] items-center justify-center">
              {/* Loading spinner while data is being fetched */}
              <Spinner size="small" label="Loading dataset…" />
            </div>
          ) : (
            <DonutChart points={failedByCategory} />
          )}
        </div>
      </div>

      {/* Dataset Metadata Section */}
      <div className={styles.sectionTitle}>
        <div className="flex gap-2">
          {/* Table title */}
          <Text size={400} weight="semibold">
            Dataset Metadata
            <span className="ml-1 text-sm text-neutral-foreground-2">
              ({datasetPath})
            </span>
          </Text>
          {/* Help icon for table explanation */}
          <Help info="This table displays the metadata details for the selected dataset, including column names, data types, and any associated comments. Use this view to understand the dataset structure and validate schema information." />
        </div>
      </div>
      <DataGrid
        columns={datasetMetadataColumns} // Columns configuration for the table
        data={overviewData?.overview?.table_metadata || []} // Data for the table
        loading={isFetching} // Loading state while data is being fetched
      />

      {/* Datasets Impacted Section */}
      <div className={styles.sectionTitle}>
        <div className="flex gap-2">
          {/* Table title */}
          <Text size={400} weight="semibold">
            Datasets Impacted
            <span className="ml-1 text-sm text-neutral-foreground-2">
              ({datasetPath})
            </span>
          </Text>
          {/* Help icon for table explanation */}
          <Help info="This table lists all impacted entities associated with the selected dataset. Each row displays the impacted entity name and its type, such as Databricks user, external system, or job." />
        </div>

        {canManageCluster && (
        <div className="flex gap-2">
          {/* ClusterControl component, passing the function to set cluster running state */}
          <ClusterControl
            setIsClusterRunning={setIsClusterRunning} // set it for enabling/disabling the add rule and suggest rule buttons
          />
          <Tooltip
            content={isClusterRunning ? "Click to Refresh Data" : "The Databricks cluster is down. Please start the cluster first."}
            // Conditional tooltip text based on cluster status
            // If cluster is running: Show normal instruction
            // If cluster is not running: Show warning that cluster must be started first
            relationship="label"
            // Defines how the tooltip relates to its target (as a descriptive label)
            withArrow // shows an arrow pointing to the button
          // Displays a small arrow from tooltip to button for better visual connection
          >
            <Button
              appearance="primary" // Style of the button
              // Primary appearance gives the button prominent blue styling
              icon={isClusterRunning ? <ArrowSyncRegular /> : <LockClosedRegular />} // set icon according to cluster status
              onClick={refreshData}
              disabled={!isClusterRunning}
            >
              Refresh Data
            </Button>
          </Tooltip>
        </div>
        )}
      </div>
      <DataGrid
        columns={datasetsImpactedColumns} // Columns configuration for the table
        data={overviewData?.impactedEntities || []} // Data for the table
        size="small" // Small size for compact display
        loading={isFetching} // Loading state while data is being fetched
      />
    </div>
  );
};
