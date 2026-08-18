/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026 
  Purpose of the script: 
    This script represents the Data Refresh page for monitoring dataset refresh health and trends.
    - It displays overall dataset refresh statistics via summary cards (refreshed vs. unrefreshed).
    - Provides a date range filter to scope refresh data to a specific time window.
    - Renders an accordion-based trend chart for unrefreshed datasets when a card is clicked.
    - Opens a non-modal dialog with a detailed DataGrid when a chart data point is clicked.
    - Delegates per-business-unit refresh breakdowns to the BusinessUnitDataRefresh child component.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, dialog, accordion, and styling
      utilities for consistent UI across the dashboard.
*/
import {
    Title3,         // Fluent UI Title3 component for rendering third-level titles
    Text,           // Fluent UI Text component for displaying text with various styles
    makeStyles,     // Fluent UI hook for creating custom styles
    tokens,         // Fluent UI design tokens for consistent spacing, colors, and typography
    Spinner,        // Fluent UI Spinner component for displaying loading indicators
    Dialog,         // Fluent UI Dialog component for modal/non-modal overlay windows
    DialogSurface,  // Fluent UI DialogSurface component for the dialog's outer container/backdrop
    DialogBody,     // Fluent UI DialogBody component wrapping title and content
    DialogTitle,    // Fluent UI DialogTitle component for the dialog heading area
    DialogContent,  // Fluent UI DialogContent component for the dialog's scrollable body
    Accordion,      // Fluent UI Accordion component for collapsible content sections
    AccordionItem,  // Fluent UI AccordionItem component for individual accordion panels
    AccordionHeader,// Fluent UI AccordionHeader component for accordion panel headers
    AccordionPanel, // Fluent UI AccordionPanel component for accordion panel content
    Button,         // Fluent UI Button component for dialog box cancel button
    Tooltip,        // Tooltip shows helpful information when users hover over or focus on an element
} from "@fluentui/react-components";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Dismiss24Filled, LockClosedRegular, ArrowSyncRegular } from "@fluentui/react-icons"; // Fluent UI icon for close action

/*  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders the unrefreshed dataset detail table inside the dialog,
      with pagination and column configuration support.
    - Example: <DataGrid columns={cols} data={rows} loading={false} />
*/
import {
    DataGrid,       // Custom DataGrid component for rendering tabular data
    ColumnConfig    // TypeScript type/interface for defining column shape and rendering
} from "@/components/ui/DataGrid";

/*
  @/components/ui/CustomDateRange
    - What it is: `CustomDateRange` is a small UI that lets users pick predefined ranges or a custom start/end.
    - Why used here: we need a date filter for scoping dataset refresh statistics 
      to a specific time window (e.g., last 7 days, last 30 days, or a custom range).
    - `DateRangeOption` is the TypeScript type that describes the shape of the selected range object,
      including label, value, startDate, and endDate.
    - Example: <CustomDateRange selectedRange={selectedDateRange} setSelectedRange={setSelectedDateRange} oneDayRangeRequired={true} />
*/
import { CustomDateRange, DateRangeOption } from "@/components/ui/CustomDateRange";

/*
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and side effects.
    - `useState` stores component-local state and triggers re-renders when updated.
      Used here to remember selected date range, dialog open/close state, accordion open key,
      trend visibility flag, and the dataset details payload for the dialog.
    - `useEffect` runs side effects after render.
      Used here to automatically open the dialog whenever overallUnrefreshedDatasetDetails is set.
    - Example: const [isOpen, setIsOpen] = useState<boolean>(false);
*/
import { useEffect, useState } from "react";

/*  
  @/components/ui/DataRefreshStats
    - What it is: A reusable component to display dataset refresh statistics.
    - Why used: Shows KPI cards for refreshed vs. unrefreshed dataset counts and
      last refresh timestamp; supports a click handler to open the trend accordion.
    - Example: <DataRefreshStats refreshed={80} unrefreshed={20} total={100} lastUpdate="2025-11-10 10:00" handleCardClick={fn} valueForClick="TREND" />
*/
import { DataRefreshStats } from "@/components/ui/DataRefreshStats";

/*  
  @/hooks/useDataRefresh
    - What it is: Custom React hooks for fetching dataset refresh data from the API.
    - `useGetDataRefresh` – fetches overall refreshed/unrefreshed dataset counts
      and last refresh timestamp for a given date range.
    - `useGetDataRefreshTrendDetails` – fetches the time-series trend data for 
      unrefreshed datasets across all business units for a given date range.
    - Why used here: To drive both the KPI summary cards and the trend chart without
      manually managing fetch/loading/error state.
    - Example: const { data, isFetching } = useGetDataRefresh(startDate, endDate);
*/
import { useGetDataRefresh, useGetDataRefreshTrendDetails } from "@/hooks/useDataRefresh";

/*
  @/lib/helper
    - What it is: Shared helper utilities for common formatting tasks.
    - `formatDateTime` converts raw ISO/UTC timestamp strings into human-readable
      date-time text (e.g., "2025-11-10 09:45 AM").
    - Why used here: to display the "date" column inside the dialog DataGrid
      and the "lastUpdate" prop of DataRefreshStats in a friendly format.
    - Example: formatDateTime("2025-11-10T09:45:00Z") → "10 Nov 2025, 09:45 AM"
*/
import { formatDateTime } from "@/lib/helper";

/*  
  @/components/charts/DataRefreshTrendChart
    - What it is: A chart component that renders a time-series line/bar chart for unrefreshed datasets.
    - Why used: Visualises the trend of unrefreshed datasets over the selected date range
      and allows users to click on individual data points to drill into dataset details.
    - Example: <DataRefreshTrendChart data={trendData} isLoading={false} setDataOnDotClick={fn} yAxisLabel="Count" xAxisLabel="Date" />
*/
import DataRefreshTrendChart from "@/components/charts/DataRefreshTrendChart";

/*  
  @/components/ui/BusinessUnitDataRefresh
    - What it is: A child component that displays dataset refresh breakdown per business unit.
    - Why used: Delegates per-unit refresh statistics rendering to a dedicated component,
      keeping this page component focused on overall/aggregate refresh data.
    - Example: <BusinessUnitDataRefresh selectedDateRange={selectedDateRange} />
*/
import BusinessUnitDataRefresh from "@/components/ui/BusinessUnitDataRefresh";

/*
    @/components/ui/ClusterControl
    - What it is: A component that allows users to control the state of the Databricks cluster (e.g., start, stop) and displays real-time cluster events.
    - Why used: Provides users with the ability to manage the Databricks cluster directly from the KPI Configuration Management page, ensuring they can start the cluster when needed to add or manage KPI configurations, and stay informed about cluster status through real-time event streaming.
*/
import { ClusterControl } from "@/components/ui/ClusterControl";

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
import { addRunId } from "@/components/ui/JobStatusToaster";

/*  
@/hooks/useToast
- What it is: A custom hook to manage toast notifications.
- Why used: Used for displaying success, error, or informational toast messages.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import { CATALOG_NAME } from "@/constants/config";

/*  
  @/types/api
    - What it is: Type definitions for API data structures.
    - Why used: To ensure type safety and clarity when working with API data.
*/
import { HelperFunctionsJobPayload } from "@/types/api";
import { usePagePermissions } from "@/hooks/hasPagePermissions";
import { useRouter } from "@/node_modules/next/navigation";

//---------------------- Styling -------------------------//

/**
 * `useStyles` function is used to define and return custom styles for the component.
 *
 * It defines styles for various sections, ensuring consistent spacing, typography, and alignment.
 * This function is used within the component to apply styles to specific elements.
 */
const useStyles = makeStyles({
    title: {
        fontWeight: tokens.fontWeightBold,          // Making the title bold
        color: tokens.colorNeutralForeground1,      // Setting the title color to neutral
        marginBottom: tokens.spacingVerticalS,      // Adding space below the title
    },
    subtitle: {
        fontSize: tokens.fontSizeBase500,           // Larger font size for section subtitles
        fontWeight: tokens.fontWeightSemibold,      // Semi-bold weight for visual hierarchy
        color: tokens.colorNeutralForeground1,      // Neutral foreground color for the subtitle
    },
    header: {
        marginBottom: tokens.spacingVerticalS,    // Space below the header section
        display: "flex",                            // Horizontal layout for title and filters
        flexDirection: "column",
        gap: tokens.spacingHorizontalS,             // Gap between child elements
    },
    filterContainer: {
        display: "flex",        // Arrange filters horizontally
        flexWrap: "wrap",       // Wrap filters on smaller screens
        gap: tokens.spacingHorizontalM, // Space between individual filter controls
    },
    dialogHeader: {
        alignItems: "center",                       // Vertically center header content
        display: "flex",                            // Horizontal layout for title and filters
        justifyContent: "space-between",            // Push title to the left and filters to the right
    },
    dialogContainer: {
        padding: "12px",
        width: "1080px",         // Fixed width for the dialog surface
        maxWidth: "1280px",      // Maximum width cap to prevent overflow on large screens
        maxHeight: "550px",      // Maximum height cap to keep the dialog within the viewport
    },
    dialogContent: {
        gap: "0",
        maxHeight: "400px"      // Constrain dialog content area so it does not overflow the dialog surface
    },
    titleWithButton: {
        display: "flex",   // horizontal layout for title and button
        justifyContent: "space-between", // push title to the left and button to the right
        alignItems: "center" // vertically center the content
    },
})

//---------------------- Component -------------------------//

/**
 * `DataRefresh` Component
 *
 * This component is responsible for rendering the Overall Dataset Refresh view.
 * It displays aggregate refresh KPI cards, a collapsible trend chart accordion,
 * a drill-down dialog for unrefreshed dataset details, and a per-business-unit
 * refresh breakdown via the BusinessUnitDataRefresh child component.
 *
 * It uses custom hooks to fetch the required data, a date range filter to scope
 * the data, and dynamically updates the UI based on user interactions such as
 * card clicks and chart dot clicks.
 *
 * @returns JSX.Element - The rendered content for the Overall Dataset Refresh page.
 */
export default function DataRefresh() {
    const styles = useStyles(); // Hook to apply styles to the component

    // Get the global toast notification function for showing success/error messages
    const { showToast } = useGlobalToast();

    /*
      Permission checks
      -----------------
      canRead:     "data-refresh:read"
                   Gates the whole page — if false after loading, show ForbiddenAccessDialog.

      hasPermission("data-refresh-cluster:manage"):
                   Gates ClusterControl + "Update Timeliness Check" button.
                   If false, both components are hidden entirely (not just disabled).

      isLoadingPermissions:
                   True while /me is in-flight. We show a full-page spinner during
                   this time to avoid flashing the forbidden dialog prematurely.
    */
    const { canRead, hasPermission, isLoadingPermissions } = usePagePermissions("data-refresh");
    const canManageCluster = hasPermission("data-refresh-cluster:manage");
               

    // handle the state of the cluster, whether running or not
    const [isClusterRunning, setIsClusterRunning] = useState<boolean>(false);

    /**
     * showTrendForAllUnrefreshedData
     *
     * Boolean flag that controls whether the "Trend of Unrefreshed Datasets" accordion
     * is rendered at all. Set to true when the user clicks a KPI card that supports drill-down.
     * - Default: false (accordion hidden until a card is clicked)
     * - Example: clicking the "Unrefreshed Datasets" card calls handleCardClick → sets this to true.
     */
    const [showTrendForAllUnrefreshedData, setShowTrendForAllUnrefreshedData] = useState<boolean>(false);

    /**
     * isOverallUnrefreshedDatasetDetailDialogOpen
     *
     * Boolean flag that controls the open/close state of the non-modal dialog
     * displaying granular unrefreshed dataset details for a selected chart data point.
     * - Default: false (dialog is closed)
     * - Set to true automatically via useEffect when overallUnrefreshedDatasetDetails is populated.
     */
    const [isOverallUnrefreshedDatasetDetailDialogOpen, setIsOverallUnrefreshedDatasetDetailDialogOpen] = useState<boolean>(false);

    /**
     * overallUnrefreshedDatasetDetails
     *
     * Stores the payload received when a user clicks a data point on the trend chart.
     * The payload contains:
     *   - `bucket_label`: human-readable label for the selected date bucket (e.g., "2025-11-05")
     *   - `dataset_details`: array of dataset objects to be rendered in the dialog DataGrid.
     * - Default: null (no data point selected, dialog will not open)
     * - Example shape: { bucket_label: "2025-11-05", dataset_details: [{ dataset_name: "Sales", ... }] }
     */
    const [overallUnrefreshedDatasetDetails, setOverallUnrefreshedDatasetDetails] = useState<any>(null);

    /**
     * openAccordionKeyForAllBusinessUnit
     *
     * Stores the value key of the currently open accordion panel.
     * Only one panel can be open at a time (controlled accordion).
     * - Default: null (all panels collapsed)
     * - Set to "TREND" when the user clicks the KPI card, and toggled back to null on collapse.
     * - Example: setOpenAccordionKeyForAllBusinessUnit("TREND") opens the trend panel.
     */
    const [openAccordionKeyForAllBusinessUnit, setOpenAccordionKeyForAllBusinessUnit] = useState<string | null>(null);

    /**
     * selectedDateRange
     *
     * Stores the currently selected date range used to filter dataset refresh records.
     * The object shape follows the `DateRangeOption` interface:
     *   - `label`: Human-friendly label for the selected range (e.g., "Last 7 days")
     *   - `value`: Internal value identifier for the selected range (e.g., "last_7_days")
     *   - `startDate`: Start timestamp of the selected range (null means not set yet)
     *   - `endDate`: End timestamp of the selected range (null means not set yet)
     * - Default: empty/null values (no range selected on initial render)
     * - Example: { label: "Last 7 days", value: "last_7_days", startDate: "2025-11-03", endDate: "2025-11-10" }
     */
    const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>({
        label: "",       // Human-friendly label for the selected range (e.g., "Last 7 days")
        value: "",       // Internal value identifier for the selected range
        startDate: null, // Start timestamp of the selected range (null means not set yet)
        endDate: null,   // End timestamp of the selected range (null means not set yet)
    });

    /**
     * useGetDataRefresh hook
     *
     * Fetches overall dataset refresh statistics for the selected date range.
     * Returns:
     *   - `data`: object containing `refreshed_datasets`, `unrefreshed_datasets`,
     *     and `last_refresh_timestamp` fields.
     *   - `isFetching`: boolean indicating whether the request is in-flight.
     * The hook is re-invoked automatically whenever startDate or endDate changes.
     * - Example: const { data, isFetching } = useGetDataRefresh("2025-11-03", "2025-11-10");
     */
    const { data: datasetRefreshData, isFetching: isDatasetRefreshLoading } = useGetDataRefresh(
        selectedDateRange.startDate!, // Start date of the selected range (non-null asserted after user selects a range)
        selectedDateRange.endDate!,   // End date of the selected range (non-null asserted after user selects a range)
    );

    /**
     * useGetDataRefreshTrendDetails hook
     *
     * Fetches time-series trend data for unrefreshed datasets across all business units
     * for the selected date range.
     * Returns:
     *   - `data`: array of trend data points, each containing a date bucket and unrefreshed count.
     *   - `isFetching`: boolean indicating whether the request is in-flight.
     * The hook is re-invoked automatically whenever startDate or endDate changes.
     * - Example: const { data, isFetching } = useGetDataRefreshTrendDetails("2025-11-03", "2025-11-10");
     */
    const { data: allBusinessUnitDataRefreshTrendData, isFetching: isFetchingAllBusinessUnitDataRefreshTrendData } = useGetDataRefreshTrendDetails(
        selectedDateRange.startDate!, // Start date of the selected range
        selectedDateRange.endDate!,   // End date of the selected range
    )

    // Column configuration for the unrefreshed dataset details DataGrid rendered inside the dialog.
    // Each entry defines the column key (matching the data object field), display label, width,
    // and optional render/getValue overrides for custom formatting.
    const overallUnrefreshedDatasetDetailColumns: ColumnConfig<any>[] = [
        {
            key: "dataset_name",     // Field key in the dataset detail object
            label: "Dataset Name",   // Column header displayed in the grid
            width: "auto",          // Let the grid calculate width based on content
            sortable: true,         // Enables sorting functionality for the column
        },
        {
            key: "date",                     // Field key for the dataset's refresh date
            label: "Date",                  // Column header displayed in the grid
            width: "12%",                   // Fixed percentage width for the date column
            sortable: true,                 // Enables sorting functionality for the column
            // getValue transforms the raw ISO timestamp into a human-readable string before display.
            // Returns "-" if the value is falsy (null/undefined/empty).
            // Example: "2025-11-10T09:45:00Z" → "10 Nov 2025, 09:45 AM"
            getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
        },
        {
            key: "DERIVED_FROM",     // Field key indicating the data source the dataset is derived from
            label: "Derived From",  // Column header displayed in the grid
            width: "auto",           // Fixed percentage width for this column
            sortable: true,         // Enables sorting functionality for the column
        },
        {
            key: "ALERT_TYPE",       // Field key for the type of alert associated with the unrefreshed dataset
            label: "Alert Type",    // Column header displayed in the grid
            width: "10%",           // Fixed percentage width – alert type values are short strings
            sortable: true,         // Enables sorting functionality for the column
        },
        {
            key: "DETAILS",          // Field key for the detailed alert/issue description text
            label: "Details",       // Column header displayed in the grid
            width: "35%",           // Wider column to accommodate longer description text
            showMore: true,          // Enables a "Show more / Show less" toggle for truncated long text
        }
    ]

    /**
     * useEffect – Auto-open dialog when dataset details are populated.
     *
     * Watches `overallUnrefreshedDatasetDetails` for changes.
     * When a user clicks a data point on the trend chart, `setOverallUnrefreshedDatasetDetails`
     * is called with the clicked point's payload. This effect responds to that change and
     * opens the detail dialog, ensuring the dialog only opens after data is available.
     *
     * Dependency: [overallUnrefreshedDatasetDetails]
     * - Example: dot click sets details → effect fires → dialog opens with that data.
     */
    useEffect(() => {
        if (overallUnrefreshedDatasetDetails !== null) {
            setIsOverallUnrefreshedDatasetDetailDialogOpen(true); // Open the dialog once detail data is ready
        }
    }, [overallUnrefreshedDatasetDetails])

    /**
     * `handleCardClick` function
     *
     * Triggered when the user clicks a KPI card in the DataRefreshStats component
     * that supports drill-down (e.g., the "Unrefreshed Datasets" card).
     * It opens the specified accordion panel and makes the trend accordion section visible.
     *
     * @param value - The accordion item value to open (e.g., "TREND").
     * - Example: handleCardClick("TREND") → opens the "Trend of Unrefreshed Datasets" accordion panel.
     */
    const handleCardClick = (value: string) => {
        setOpenAccordionKeyForAllBusinessUnit(value); // Set the accordion panel to open
        setShowTrendForAllUnrefreshedData(true);      // Make the accordion section visible
    }

    // ===================================================================
    // Data Refresh using helper function
    // ===================================================================  

    // function to post a request to run the helper function job in databricks
    // it refreshes the data of the impacted dataset details.
    const refreshData = () => {

        // create a payload
        const payload: HelperFunctionsJobPayload = {
            CATALOG_NAME: CATALOG_NAME, // name of catalog
            FUNCTION: "add_missing_datasets_timeliness", // name of function
        };

        // send post request to perfomr refresh process
        greatExpectationsService.runHelperFunction(payload)
            .then((response) => {
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

    /**
     * `handleDiscardForAllBusinessUnitSummary` function
     *
     * Triggered when the detail dialog is closed (either by the user clicking outside
     * or via the dialog's onOpenChange callback). It closes the dialog and resets
     * the dataset details state back to null so the effect does not re-trigger.
     *
     * - Example: user closes dialog → dialog hides → overallUnrefreshedDatasetDetails resets to null.
     */
    const handleDiscardForAllBusinessUnitSummary = () => {
        setIsOverallUnrefreshedDatasetDetailDialogOpen(false); // Close the dialog
        setOverallUnrefreshedDatasetDetails(null);             // Clear the detail data to reset state
    }


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
        <div>
            {/* Page Header: displays the section subtitle on the left and the date range filter on the right */}
            <div className={styles.header}>
                {/* Section subtitle for the overall dataset refresh view */}
                <div className={styles.titleWithButton}>
                    <Title3 className={styles.title}>Overall Dataset Refresh</Title3>

                    {canManageCluster && (
                    <div className="flex gap-2">
                        {/* ClusterControl component, passing the function to set cluster running state */}
                        <ClusterControl
                            setIsClusterRunning={setIsClusterRunning} // set it for enabling/disabling the add rule and suggest rule buttons
                        />
                        <Tooltip
                            content={isClusterRunning ? "Click to Update Timeliness Check" : "The Databricks cluster is down. Please start the cluster first."}
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
                                onClick={refreshData} // on clicking the button call this function
                                disabled={!isClusterRunning} // disable the button if cluster not running
                            >
                                Update Timeliness Check
                            </Button>
                        </Tooltip>
                    </div>
                    )}
                </div>

                <div className={styles.filterContainer}>
                    {/* Date Range Filter component: lets user choose predefined or custom date ranges
                        to scope the refresh statistics displayed on this page.
                        - `selectedRange`: the currently active date range state object
                        - `setSelectedRange`: updater function passed down so the child can change the range
                        - `oneDayRangeRequired`: enables single-day range selection in the picker
                    */}
                    <CustomDateRange
                        selectedRange={selectedDateRange}       // Prop: currently selected date range object
                        setSelectedRange={setSelectedDateRange} // Prop: function to update the selected range
                        oneDayRangeRequired={true}              // Prop: enables single-day range selection
                        selectSevenDaysAsDefault={true}
                    />
                </div>
            </div>

            {/* DataRefreshStats section: shows KPI cards for refreshed/unrefreshed dataset counts.
                Displays a spinner while data is loading; renders the stats component once data arrives. */}
            {isDatasetRefreshLoading ? (
                // Centered loading spinner shown while the refresh stats API call is in-flight
                <div className="flex min-h-[15vh] items-center justify-center">
                    <Spinner size="small" label="Loading data…" />
                </div>
            ) :
                (
                    // DataRefreshStats component displaying dataset refresh KPI cards
                    // - `refreshed`: count of datasets successfully refreshed in the selected period
                    // - `unrefreshed`: count of datasets that were NOT refreshed in the selected period
                    // - `total`: sum of refreshed and unrefreshed counts
                    // - `lastUpdate`: formatted timestamp of the most recent refresh run
                    // - `handleCardClick`: callback passed to the component so clicking the unrefreshed card opens the trend accordion
                    // - `valueForClick`: the accordion item key that handleCardClick will open (i.e., "TREND")
                    <DataRefreshStats
                        refreshed={datasetRefreshData?.refreshed_datasets ?? 0}     // Number of refreshed datasets (default 0 if undefined)
                        unrefreshed={datasetRefreshData?.unrefreshed_datasets ?? 0} // Number of unrefreshed datasets (default 0 if undefined)
                        total={
                            (datasetRefreshData?.refreshed_datasets ?? 0) +
                            (datasetRefreshData?.unrefreshed_datasets ?? 0)
                        }                                                            // Total datasets count derived from sum
                        lastUpdate={
                            datasetRefreshData?.last_refresh_timestamp
                                ? formatDateTime(datasetRefreshData.last_refresh_timestamp) // Format timestamp if available
                                : undefined                                                  // Pass undefined if no timestamp exists yet
                        }
                        handleCardClick={handleCardClick}   // Callback to open the trend accordion when a card is clicked
                        valueForClick={"TREND"}             // Accordion value key that handleCardClick will open
                    />
                )
            }

            {/* Trend Accordion: conditionally rendered only after the user clicks a KPI card.
                Displays a collapsible panel containing the DataRefreshTrendChart.
                Only one panel can be open at a time (multiple={false}).
                The open panel is controlled via openAccordionKeyForAllBusinessUnit state. */}
            {showTrendForAllUnrefreshedData && (
                <Accordion
                    multiple={false}    // Allow only one panel open at a time
                    collapsible         // Allow the currently open panel to be collapsed by clicking its header
                    openItems={openAccordionKeyForAllBusinessUnit ? [openAccordionKeyForAllBusinessUnit] : []} // Control which panel is open
                    onToggle={(_, { openItems }) => {
                        // Update open accordion key based on user interaction.
                        // If all panels collapse, openItems will be empty → nextKey becomes null.
                        const nextKey = (openItems as string[])?.[0] ?? null;
                        setOpenAccordionKeyForAllBusinessUnit(nextKey); // Sync state with accordion's open state
                    }}
                >
                    {/* Accordion item for the unrefreshed datasets trend chart */}
                    <AccordionItem value="TREND">
                        {/* Accordion header: displays the panel title */}
                        <AccordionHeader>
                            <Text size={400} weight="semibold">
                                Trend of Unrefreshed Datasets
                            </Text>
                        </AccordionHeader>

                        {/* Accordion panel: contains the trend chart component
                            - `data`: array of trend data points; falls back to [] if data is not an array
                            - `isLoading`: pass-through loading flag to show spinner inside the chart
                            - `setDataOnDotClick`: when user clicks a dot on the chart, this setter
                               stores the dot's data payload → triggers useEffect → opens the dialog
                            - `yAxisLabel`: label for the vertical axis of the chart
                            - `xAxisLabel`: label for the horizontal axis of the chart
                        */}
                        <AccordionPanel>
                            <DataRefreshTrendChart
                                data={Array.isArray(allBusinessUnitDataRefreshTrendData) ? allBusinessUnitDataRefreshTrendData : []} // Safe fallback to empty array
                                isLoading={isFetchingAllBusinessUnitDataRefreshTrendData}    // Show loading indicator inside chart while fetching
                                setDataOnDotClick={setOverallUnrefreshedDatasetDetails}     // Populate detail state on chart dot click
                                yAxisLabel={"Unrefreshed Dataset Count"}                    // Vertical axis label
                                xAxisLabel={"Execution Date"}                               // Horizontal axis label
                            />
                        </AccordionPanel>
                    </AccordionItem>
                </Accordion>
            )}

            {/* BusinessUnitDataRefresh: child component rendering per-business-unit refresh breakdowns.
                Receives the selected date range so it can fetch and display unit-specific data
                scoped to the same time window as the overall stats above. */}
            <BusinessUnitDataRefresh
                selectedDateRange={selectedDateRange} // Pass the active date range down to scope the child's data fetch
            />

            {/* Non-modal Dialog: opens when the user clicks a data point on the trend chart.
                Displays a DataGrid with granular unrefreshed dataset details for the selected date bucket.
                - `open`: controlled by isOverallUnrefreshedDatasetDetailDialogOpen state
                - `onOpenChange`: fires when the dialog requests a state change (e.g., user clicks outside);
                   delegates to handleDiscardForAllBusinessUnitSummary to close and reset state
                - `modalType="non-modal"`: allows interaction with the page behind the dialog
            */}
            <Dialog
                open={isOverallUnrefreshedDatasetDetailDialogOpen}
                onOpenChange={(_, { open: isOpen }) => handleDiscardForAllBusinessUnitSummary()} // Close dialog and reset detail state on any close event
                modalType="modal" // Non-modal: user can interact with content behind the dialog
            >
                {/* DialogSurface: the visual container of the dialog with fixed dimensions */}
                <DialogSurface className={styles.dialogContainer}>
                    <DialogBody>
                        {/* DialogTitle: header area of the dialog showing the bucket label for context */}
                        <DialogTitle
                            action={
                                <Button
                                    appearance="subtle"
                                    icon={<Dismiss24Filled />}
                                    aria-label="Close"
                                    onClick={() => handleDiscardForAllBusinessUnitSummary()}
                                />
                            }
                        >
                            <div className={styles.dialogHeader}>
                                {/* Display the bucket label (e.g., date) of the selected trend data point */}
                                <Text className={styles.subtitle}>
                                    Unrefreshed Dataset Details ({overallUnrefreshedDatasetDetails?.bucket_label})
                                </Text>
                            </div>
                        </DialogTitle>

                        {/* DialogContent: scrollable body area containing the detail DataGrid */}
                        <DialogContent>
                            <div className={styles.dialogContent}>
                                {/* Render the DataGrid only when detail data is available (not null).
                                    - `columns`: column definitions for the unrefreshed dataset detail table
                                    - `data`: the dataset_details array from the selected chart dot payload
                                    - `loading`: true only when details are null (guards against rendering with empty data)
                                */}
                                {overallUnrefreshedDatasetDetails !== null && (
                                    <DataGrid
                                        columns={overallUnrefreshedDatasetDetailColumns}            // Column definitions for the detail table
                                        data={overallUnrefreshedDatasetDetails?.dataset_details}    // Row data from the selected chart data point
                                        loading={overallUnrefreshedDatasetDetails === null}           // Show loading state if details are not yet available
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    )
}