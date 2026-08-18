/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026 
  Purpose of the script: 
    This script represents the Business Unit-wise Dataset Refresh view — a child component 
    consumed by the main DataRefresh page.
    - It displays a business unit dropdown filter so users can scope refresh stats to one L1 unit.
    - It renders KPI cards (refreshed vs. unrefreshed counts and last refresh timestamp) for the selected unit.
    - It provides a collapsible accordion containing a trend chart and a detailed dataset DataGrid.
    - It opens a non-modal dialog showing a dataset-level trend chart and drill-down DataGrid
      when the user clicks on a specific dataset name inside the accordion DataGrid.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, dropdown, field, loading spinner, dialog, accordion,
      and styling utilities for a consistent dashboard UI.
*/
import { 
    Text,           // Fluent UI Text component for displaying text with various styles
    makeStyles,     // Fluent UI hook for creating custom styles
    tokens,         // Fluent UI design tokens for consistent spacing, colors, and typography
    Field,          // Fluent UI Field component for wrapping form controls with a label
    Dropdown,       // Fluent UI Dropdown component for single-select option lists
    Option,         // Fluent UI Option component representing an individual dropdown item
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
    Button          // Fluent UI Button component for Dialog box cancel button
} from "@fluentui/react-components";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
import { Dismiss24Filled } from "@fluentui/react-icons"; // Fluent UI icon for close action

/*
  @/components/ui/CustomDateRange
    - What it is: Custom date range selector component and its TypeScript type.
    - `DateRangeOption` is the TypeScript type that describes the shape of the selected range object,
      including label, value, startDate, and endDate.
    - Why used here: This component receives `selectedDateRange` as a prop (passed down from the
      parent DataRefresh page) to keep the business-unit refresh data scoped to the same
      date window as the overall stats.
    - Example shape: { label: "Last 7 days", value: "last_7_days", startDate: "2025-11-03", endDate: "2025-11-10" }
*/
import { DateRangeOption } from "@/components/ui/CustomDateRange";

/*  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders the business-unit dataset refresh table inside the accordion panel,
      and the drill-down dataset detail table inside the dialog.
    - `ColumnConfig` is the TypeScript type for defining each column's key, label, width,
      and optional render/getValue overrides.
    - Example: <DataGrid columns={cols} data={rows} loading={false} />
*/
import { 
    DataGrid,       // Custom DataGrid component for rendering tabular data
    ColumnConfig    // TypeScript type/interface for defining column shape and rendering
} from "@/components/ui/DataGrid";

/*  
  @/components/charts/DataRefreshTrendChart
    - What it is: A chart component that renders a time-series line chart for unrefreshed datasets.
    - Why used: Used twice in this component — once inside the accordion to show the business-unit-wise
      unrefreshed trend, and once inside the dialog to show the dataset-level trend when a user
      clicks a specific dataset name.
    - Example: <DataRefreshTrendChart data={trendData} isLoading={false} setDataOnDotClick={fn} yAxisLabel="Count" xAxisLabel="Date" />
*/
import DataRefreshTrendChart from "@/components/charts/DataRefreshTrendChart";

/*  
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data related to the Data Quality Dashboard.
    - `useGetBusinessUnitNames` – fetches the list of available L1 Business Unit names
      used to populate the dropdown filter.
    - Why used here: To dynamically drive the dropdown options rather than hard-coding unit names.
    - Example: const { businessUnitNames } = useGetBusinessUnitNames();
      // businessUnitNames → [{ L1_BUSINESS_UNIT: "Finance" }, { L1_BUSINESS_UNIT: "Supply Chain" }]
*/
import { useGetBusinessUnitNames } from "@/hooks/useQualityDashboard";

/*
  @/lib/helper
    - What it is: Shared helper utilities for common formatting tasks.
    - `formatDateTime` converts raw ISO/UTC timestamp strings into human-readable
      date-time text (e.g., "2025-11-10 09:45 AM").
    - Why used here: to format the "timestamp" and "date" columns in the DataGrids
      and the "lastUpdate" prop of DataRefreshStats.
    - Example: formatDateTime("2025-11-10T09:45:00Z") → "10 Nov 2025, 09:45 AM"
*/
import { formatDateTime } from "@/lib/helper";

/*
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and side effects.
    - `useState` stores component-local state and triggers re-renders when updated.
      Used here to track selected business unit, dialog open/close state, accordion open key,
      trend visibility flag, dataset name for drill-down, and dataset detail payload for the dialog.
    - `useEffect` runs side effects after render.
      Used here to automatically select the first business unit from the dropdown
      once the list of unit names is fetched from the API.
    - Example: const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string | undefined>(undefined);
*/
import { useEffect, useState } from "react";

/*  
  @/hooks/useDataRefresh
    - What it is: Custom React hooks for fetching dataset refresh data from the API.
    - `useGetDataRefresh` – fetches refreshed/unrefreshed dataset counts and last refresh 
      timestamp for a given date range and optional business unit filter.
    - `useGetDataRefreshTrendDetails` – fetches the time-series trend data for unrefreshed
      datasets for a given date range, business unit, and optionally a specific dataset name.
    - Why used here: Called twice for trend data — once at the business-unit level (all datasets
      within the selected unit) and once at the dataset level (drill-down for a single dataset).
    - Example: const { data, isFetching } = useGetDataRefresh(startDate, endDate, "Finance");
*/
import { useGetDataRefresh, useGetDataRefreshTrendDetails } from "@/hooks/useDataRefresh";

/*  
  @/components/ui/DataRefreshStats
    - What it is: A reusable component to display dataset refresh KPI cards.
    - Why used: Shows refreshed vs. unrefreshed counts and last refresh timestamp
      for the currently selected business unit; supports a click handler to open the trend accordion.
    - Example: <DataRefreshStats refreshed={80} unrefreshed={20} total={100} lastUpdate="2025-11-10 10:00" handleCardClick={fn} valueForClick="BU-TREND" />
*/
import { DataRefreshStats } from "@/components/ui/DataRefreshStats";

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
        fontSize: tokens.fontSizeBase400,           // Larger font size for section subtitles
        fontWeight: tokens.fontWeightSemibold,      // Semi-bold weight for visual hierarchy
        color: tokens.colorNeutralForeground1,      // Neutral foreground color for the subtitle
    },
    header: {
        marginTop: tokens.spacingVerticalM,         // Space above the header section
        marginBottom: tokens.spacingVerticalXXL,    // Space below the header section
        alignItems: "left",                       // Vertically center header content
        display: "flex",                            // Horizontal layout for title and filters
        flexDirection: "column",
        // justifyContent: "space-between",            // Push title to the left and filters to the right
        gap: tokens.spacingHorizontalL,             // Gap between child elements
    },
    filterContainer: {
        display: "flex",        // Arrange filters horizontally
        flexWrap: "wrap",       // Wrap filters on smaller screens
        gap: tokens.spacingHorizontalM, // Space between individual filter controls
    },
    dialogContainer: {
        padding: "12px",
        width:"1080px",         // Fixed width for the dialog surface
        maxWidth:"1280px",      // Maximum width cap to prevent overflow on large screens
        maxHeight:"550px",      // Maximum height cap to keep the dialog within the viewport
    },
    dialogContent: {
        maxHeight: "400px"      // Constrain dialog content area so it does not overflow the dialog surface
    }
})

//---------------------- Props Interface -------------------------//

/**
 * `BusinessUnitDataRefreshProps` interface
 *
 * Defines the props accepted by the BusinessUnitDataRefresh component.
 *
 * @property selectedDateRange - The currently active date range from the parent DataRefresh page,
 *   used to scope all API calls in this component to the same time window.
 *   Shape follows the `DateRangeOption` type: { label, value, startDate, endDate }.
 * - Example: { label: "Last 7 days", value: "last_7_days", startDate: "2025-11-03", endDate: "2025-11-10" }
 */
interface BusinessUnitDataRefreshProps {
    selectedDateRange: DateRangeOption;
}

//---------------------- Component -------------------------//

/**
 * `BusinessUnitDataRefresh` Component
 *
 * A child component rendered by the main DataRefresh page. It handles all business-unit-scoped
 * dataset refresh interactions:
 *   - A dropdown to select the active L1 Business Unit.
 *   - KPI cards showing refreshed/unrefreshed counts for the selected unit.
 *   - A collapsible accordion with a trend chart and a dataset-level DataGrid.
 *   - A non-modal dialog showing a per-dataset trend chart and drill-down detail DataGrid
 *     when the user clicks a dataset name in the accordion DataGrid.
 *
 * @param selectedDateRange - Date range passed down from the parent to scope all data fetches.
 * @returns JSX.Element - The rendered business-unit-wise dataset refresh view.
 */
export default function BusinessUnitDataRefresh({
    selectedDateRange
}: BusinessUnitDataRefreshProps) {
    const styles = useStyles(); // Hook to apply styles to the component

    /**
     * useGetBusinessUnitNames hook
     *
     * Fetches the list of L1 Business Unit name objects from the API.
     * Returns an array of objects shaped as: [{ L1_BUSINESS_UNIT: "Finance" }, ...]
     * Used to populate the dropdown options and to auto-select the first unit on load.
     */
    const { businessUnitNames } = useGetBusinessUnitNames();

    /**
     * showTrendForBusinessUnitWiseUnrefreshedData
     *
     * Boolean flag that controls whether the "Business-wise Dataset Trend" accordion
     * section is rendered at all. Set to true when the user clicks a KPI card.
     * - Default: false (accordion hidden until a card is clicked)
     * - Example: clicking the "Unrefreshed Datasets" card → calls handleCardClickForBusinessUnit → sets this to true.
     */
    const [ showTrendForBusinessUnitWiseUnrefreshedData, setShowTrendForBusinessUnitWiseUnrefreshedData] = useState<boolean>(false);

    /**
     * isUnrefreshedDatasetDetailDialogOpen
     *
     * Boolean flag that controls the open/close state of the non-modal dialog
     * displaying a dataset-level trend chart and detail DataGrid.
     * - Default: false (dialog is closed)
     * - Set to true when the user clicks a dataset name in the accordion DataGrid via openUnrefreshedDatasetDetails.
     */
    const [ isUnrefreshedDatasetDetailDialogOpen, setIsUnrefreshedDatasetDetailDialogOpen ] = useState<boolean>(false);

    /**
     * unrefreshedDatasetDetails
     *
     * Stores the payload received when a user clicks a data point on the dataset-level trend chart
     * inside the dialog. The payload contains:
     *   - `dataset_details`: array of detail objects to be rendered in the dialog's detail DataGrid.
     * - Default: null (no data point selected)
     * - Example shape: { dataset_details: [{ date: "2025-11-05", DERIVED_FROM: "SAP", ... }] }
     */
    const [ unrefreshedDatasetDetails, setUnrefreshedDatasetDetails ] = useState<any>(null);

    /**
     * openAccordionKeyForBusinessUnitwiseTrend
     *
     * Stores the value key of the currently open accordion panel (controlled accordion).
     * Only one panel can be open at a time.
     * - Default: null (all panels collapsed)
     * - Set to "BU-TREND" when the user clicks a KPI card; toggled back to null on collapse.
     * - Example: setOpenAccordionKeyForBusinessUnitwiseTrend("BU-TREND") → opens the trend panel.
     */
    const [ openAccordionKeyForBusinessUnitwiseTrend, setOpenAccordionKeyForBusinessUnitwiseTrend ] = useState<string | null>(null);

    /**
     * selectedBusinessUnit
     *
     * Stores the name of the currently selected L1 Business Unit from the dropdown.
     * Drives the API calls for both refresh stats and trend data in this component.
     * - Default: undefined (no unit selected until businessUnitNames loads)
     * - Auto-set to the first unit name once businessUnitNames is fetched (see useEffect below).
     * - Example: "Finance" | "Supply Chain" | undefined
     */
    const [ selectedBusinessUnit, setSelectedBusinessUnit ] = useState<string|undefined>(undefined);

    /**
     * unrefreshedDatasetName
     *
     * Stores the name of the dataset the user clicked in the accordion DataGrid.
     * Used as an additional filter parameter in `useGetDataRefreshTrendDetails` to fetch
     * the dataset-level trend data displayed inside the dialog.
     * - Default: undefined (no dataset selected)
     * - Set via openUnrefreshedDatasetDetails when a dataset name is clicked.
     * - Reset to undefined when the dialog is closed via handleDiscard.
     * - Example: "Sales_Fact_Table"
     */
    const [ unrefreshedDatasetName, setUnrefreshedDatasetName] = useState<string|undefined>(undefined);

    /**
     * useGetDataRefresh hook (business-unit scoped)
     *
     * Fetches refreshed/unrefreshed dataset counts and last refresh timestamp
     * for the selected date range AND the selected business unit.
     * Returns:
     *   - `data`: object with `refreshed_datasets`, `unrefreshed_datasets`, `last_refresh_timestamp`, and `datasets` array.
     *   - `isFetching`: boolean indicating whether the request is in-flight.
     * Re-invoked automatically when selectedDateRange or selectedBusinessUnit changes.
     * - Example: useGetDataRefresh("2025-11-03", "2025-11-10", "Finance")
     */
    const { data: businessUnitwiseDatasetRefreshData, isFetching: isLoadingBusinessUnitwiseDatasetRefreshData } = useGetDataRefresh(
        selectedDateRange.startDate!, // Start date of the selected range
        selectedDateRange.endDate!,   // End date of the selected range
        selectedBusinessUnit,         // L1 Business Unit filter to scope the data
    );

    /**
     * useGetDataRefreshTrendDetails hook (business-unit level)
     *
     * Fetches time-series trend data for unrefreshed datasets within the selected
     * business unit for the selected date range.
     * Returns:
     *   - `data`: array of trend data points for all datasets in the selected unit.
     *   - `isFetching`: boolean indicating whether the request is in-flight.
     * Used to populate the trend chart rendered inside the accordion panel.
     * - Example: useGetDataRefreshTrendDetails("2025-11-03", "2025-11-10", "Finance")
     */
    const { data: businessUnitWiseDataRefreshTrendData, isFetching: isFetchingBusinessUnitWiseDataRefreshTrendData } = useGetDataRefreshTrendDetails(
        selectedDateRange.startDate!, // Start date of the selected range
        selectedDateRange.endDate!,   // End date of the selected range
        selectedBusinessUnit          // L1 Business Unit filter
    )

    /**
     * useGetDataRefreshTrendDetails hook (dataset level)
     *
     * Fetches time-series trend data for a single specific dataset within the selected
     * business unit and date range. This is the drill-down view triggered when the user
     * clicks a dataset name in the accordion DataGrid.
     * Returns:
     *   - `data`: array of trend data points for the specific dataset.
     *   - `isFetching`: boolean indicating whether the request is in-flight.
     * Used to populate the trend chart inside the detail dialog.
     * - Example: useGetDataRefreshTrendDetails("2025-11-03", "2025-11-10", "Finance", "Sales_Fact_Table")
     */
    const { data: datasetwiseDataRefreshTrendData, isFetching: isFetchingDatasetwiseDataRefreshTrendData } = useGetDataRefreshTrendDetails(
        selectedDateRange.startDate!, // Start date of the selected range
        selectedDateRange.endDate!,   // End date of the selected range
        selectedBusinessUnit,         // L1 Business Unit filter
        unrefreshedDatasetName,       // Specific dataset name filter for drill-down
    )

    // Column configuration for the dataset refresh summary table rendered inside the accordion panel.
    // Each entry defines the column key, label, width, and optional render/getValue overrides.
    const datasetRefreshColumns: ColumnConfig<any>[] = [
        {
            key: "dataset_name",    // Field key for the dataset name in the data object
            label: "Dataset Name",  // Column header displayed in the grid
            width: "30%",           // Fixed percentage width for the dataset name column
            copyable: true,         // Enables a copy-to-clipboard icon for the cell value
            showMore: true,         // Enables a "Show more / Show less" toggle for long dataset names
            sortable: true, // Enables sorting functionality for the column
            // render overrides the default cell output with a clickable Text element.
            // Clicking the dataset name calls openUnrefreshedDatasetDetails to open the dialog
            // with the dataset-level trend chart for that specific dataset.
            // Example: clicking "Sales_Fact_Table" → opens dialog scoped to that dataset.
            render: (value: string, row: any, rowIndex: number) => {
                return (
                    <Text
                        size={200}                                      // Smaller text size for table cells
                        className="cursor-pointer hover:underline"      // Pointer cursor and underline on hover to indicate interactivity
                        onClick={() =>
                            openUnrefreshedDatasetDetails(value)        // Open the dataset drill-down dialog on click
                        }
                    >
                        {value}
                    </Text>
                )
            }
        },
        {
            key: "timestamp",   // Field key for the dataset's last refresh timestamp
            label: "Timestamp", // Column header displayed in the grid
            width: "auto",      // Let the grid calculate width based on content
            sortable: true, // Enables sorting functionality for the column
            // getValue transforms the raw ISO timestamp into a human-readable string before display.
            // Returns "-" if the value is falsy (null/undefined/empty).
            // Example: "2025-11-10T09:45:00Z" → "10 Nov 2025, 09:45 AM"
            getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
        },
        {
            key: "refresh_status",  // Field key for the dataset's current refresh status
            label: "Status",        // Column header displayed in the grid
            width: "12%",          // Let the grid calculate width based on content
            sortable: true, // Enables sorting functionality for the column
        },
        {
            key:"DETAILS",      // Field key for the detailed alert/issue description text
            label: "Details",   // Column header displayed in the grid
            width: "45%",       // Fixed percentage width to accommodate longer description text
            showMore: true,      // Enables a "Show more / Show less" toggle for truncated long text
        }
    ];

    // Column configuration for the unrefreshed dataset detail DataGrid rendered inside the dialog.
    // Displayed when the user clicks a dot on the dataset-level trend chart.
    const unrefreshedDatasetDetailColumns: ColumnConfig<any>[] = [
        {
            key:"date",         // Field key for the execution date of the unrefreshed run
            label: "Date",      // Column header displayed in the grid
            width: "18%",       // Fixed percentage width for the date column
            sortable: true,     // Enables sorting functionality for the column
            // getValue transforms the raw ISO timestamp into a human-readable string.
            // Returns "-" if the value is falsy.
            // Example: "2025-11-10T09:45:00Z" → "10 Nov 2025, 09:45 AM"
            getValue: (value, row, index) => (value ? formatDateTime(value) : "-"),
        },
        {
            key:"DERIVED_FROM",     // Field key indicating the data source the dataset is derived from
            label: "Derived From",  // Column header displayed in the grid
            width: "25%",           // Fixed percentage width for this column
            sortable: true,         // Enables sorting functionality for the column
        },
        {
            key:"ALERT_TYPE",       // Field key for the type of alert associated with the unrefreshed run
            label: "Alert Type",    // Column header displayed in the grid
            width: "12%",           // Fixed percentage width — alert type values are short strings
            sortable: true,         // Enables sorting functionality for the column
        },
        {
            key:"DETAILS",      // Field key for the detailed alert/issue description text
            label: "Details",   // Column header displayed in the grid
            width: "auto",      // Let the grid expand to fill remaining space
            showMore:true,      // Enables a "Show more / Show less" toggle for truncated long text
        }
    ];

    /**
     * useEffect – Auto-select the first business unit when the dropdown options load.
     *
     * Watches `businessUnitNames` for changes. Once the API returns the list of unit names,
     * this effect fires and sets `selectedBusinessUnit` to the first unit in the list.
     * This ensures the dropdown always has a sensible default selection rather than showing blank.
     *
     * Dependency: [businessUnitNames]
     * - Example: businessUnitNames loads → effect fires → selectedBusinessUnit set to "Finance".
     */
    useEffect(()=> {
        setSelectedBusinessUnit(businessUnitNames?.[0]?.L1_BUSINESS_UNIT) // Default to the first available business unit
    },[businessUnitNames]);

    /**
     * `handleCardClickForBusinessUnit` function
     *
     * Triggered when the user clicks a KPI card in the DataRefreshStats component
     * that supports drill-down (e.g., the "Unrefreshed Datasets" card for the selected unit).
     * It opens the specified accordion panel and makes the business-unit trend accordion visible.
     *
     * @param value - The accordion item value to open (e.g., "BU-TREND").
     * - Example: handleCardClickForBusinessUnit("BU-TREND") → opens the business-unit trend panel.
     */
    const handleCardClickForBusinessUnit = (value:string) => {
        setOpenAccordionKeyForBusinessUnitwiseTrend(value);         // Set the accordion panel to open
        setShowTrendForBusinessUnitWiseUnrefreshedData(true);       // Make the accordion section visible
    }

    /**
     * `handleDiscard` function
     *
     * Triggered when the dataset-level detail dialog is closed (user clicks outside or
     * the dialog fires onOpenChange). It closes the dialog and resets all dataset-level
     * state (dataset name and detail payload) so the component returns to a clean state.
     *
     * - Example: user closes dialog → dialog hides → unrefreshedDatasetName and unrefreshedDatasetDetails reset.
     */
    const handleDiscard = () => {
        setIsUnrefreshedDatasetDetailDialogOpen(false); // Close the dialog
        setUnrefreshedDatasetName(undefined);           // Clear the dataset name filter so the hook stops fetching dataset-level data
        setUnrefreshedDatasetDetails(null);             // Clear the detail DataGrid data
    }

    /**
     * `openUnrefreshedDatasetDetails` function
     *
     * Triggered when the user clicks a dataset name cell in the accordion DataGrid.
     * It stores the clicked dataset name (which feeds the dataset-level trend hook)
     * and opens the detail dialog.
     *
     * @param datasetName - The name of the dataset that was clicked.
     * - Example: openUnrefreshedDatasetDetails("Sales_Fact_Table")
     *   → sets unrefreshedDatasetName to "Sales_Fact_Table" → triggers dataset-level trend fetch → opens dialog.
     */
    const openUnrefreshedDatasetDetails = (datasetName:string) => {
        setUnrefreshedDatasetName(datasetName);                     // Store the dataset name to scope the trend fetch
        setIsUnrefreshedDatasetDetailDialogOpen(true);              // Open the detail dialog
    }

    return(
        <div>
            {/* Page Sub-section Header: displays the subtitle on the left and the business unit dropdown on the right */}
            <div className={styles.header}>
                {/* Section subtitle for the business-unit-wise refresh view */}
                <Text className={styles.subtitle}>L1 Business Unit Dataset Refresh</Text>

                <div className={styles.filterContainer}>
                    {/* L1 Business Unit Dropdown: lets the user switch between available business units.
                        The dropdown options are dynamically populated from the businessUnitNames API response.
                        Changing the selection updates selectedBusinessUnit state, which re-scopes all API calls. */}
                    <Field label="L1 Business Unit">
                        <Dropdown
                            selectedOptions={[selectedBusinessUnit ?? ""]}     // Prop: option(s) currently selected in the dropdown
                            value={selectedBusinessUnit ?? ""}           // Prop: the value displayed in the control (empty string fallback while loading)
                            appearance="filled-darker"                   // Prop: a visual style variant for the dropdown
                            onOptionSelect={(_, option) =>
                                // Handler: update local selectedBusinessUnit state when the user picks an option
                                setSelectedBusinessUnit(option?.optionValue)
                            }
                        >
                            {/* Dynamically create one <Option> per available business unit returned from the API */}
                            {(businessUnitNames || []).map(
                                (name: any, index: number) => (
                                    // Each option uses the L1_BUSINESS_UNIT string for both the value and the label shown to the user
                                    <Option key={index} value={name.L1_BUSINESS_UNIT}>
                                        {name.L1_BUSINESS_UNIT}
                                    </Option>
                                )
                            )}
                        </Dropdown>
                    </Field>
                </div>
            </div>

            <div>
                {/* DataRefreshStats section: shows KPI cards for the selected business unit.
                    Displays a spinner while data is loading; renders the stats component once data arrives. */}
                {isLoadingBusinessUnitwiseDatasetRefreshData? (
                    // Centered loading spinner shown while the business-unit refresh stats API call is in-flight
                    <div className="flex min-h-[15vh] items-center justify-center">
                        <Spinner size="small" label="Loading data…" />
                    </div>
                ):
                (
                    // DataRefreshStats component displaying business-unit-scoped dataset refresh KPI cards.
                    // - `refreshed`: count of datasets refreshed in the selected period for the selected unit
                    // - `unrefreshed`: count of datasets NOT refreshed in the selected period for the selected unit
                    // - `total`: sum of refreshed and unrefreshed counts
                    // - `lastUpdate`: formatted timestamp of the most recent refresh run for the selected unit
                    // - `handleCardClick`: callback to open the business-unit trend accordion when a card is clicked
                    // - `valueForClick`: the accordion item key that handleCardClickForBusinessUnit will open ("BU-TREND")
                    <DataRefreshStats
                        refreshed={businessUnitwiseDatasetRefreshData?.refreshed_datasets ?? 0}     // Refreshed datasets count (default 0 if undefined)
                        unrefreshed={businessUnitwiseDatasetRefreshData?.unrefreshed_datasets ?? 0} // Unrefreshed datasets count (default 0 if undefined)
                        total={
                            (businessUnitwiseDatasetRefreshData?.refreshed_datasets ?? 0) +
                            (businessUnitwiseDatasetRefreshData?.unrefreshed_datasets ?? 0)
                        }                                                                            // Total datasets count derived from sum
                        lastUpdate={
                            businessUnitwiseDatasetRefreshData?.last_refresh_timestamp
                            ? formatDateTime(businessUnitwiseDatasetRefreshData.last_refresh_timestamp) // Format timestamp if available
                            : undefined                                                                  // Pass undefined if no timestamp exists yet
                        }
                        handleCardClick={handleCardClickForBusinessUnit}    // Callback to open the trend accordion when a card is clicked
                        valueForClick={"BU-TREND"}                          // Accordion value key that the click handler will open
                    />
                )
                }

                {/* Business-unit Trend Accordion: conditionally rendered only after the user clicks a KPI card.
                    Contains both the business-unit-level trend chart and the dataset-level summary DataGrid.
                    Only one panel can be open at a time (multiple={false}). */}
                {showTrendForBusinessUnitWiseUnrefreshedData && (
                    <Accordion
                        multiple={false}    // Allow only one panel open at a time
                        collapsible         // Allow the currently open panel to be collapsed by clicking its header
                        openItems={openAccordionKeyForBusinessUnitwiseTrend ? [openAccordionKeyForBusinessUnitwiseTrend] : []} // Control which panel is open
                        onToggle={(_, { openItems }) => {
                            // Update open accordion key based on user interaction.
                            // If all panels collapse, openItems will be empty → nextKey becomes null.
                            const nextKey = (openItems as string[])?.[0] ?? null;
                            setOpenAccordionKeyForBusinessUnitwiseTrend(nextKey); // Sync state with accordion's open state
                        }}
                    >
                        {/* Accordion item for the business-unit-wise dataset trend chart and DataGrid */}
                        <AccordionItem value="BU-TREND">
                            {/* Accordion header: displays the panel title */}
                            <AccordionHeader>
                                <Text size={400} weight="semibold">
                                    Business-wise Unrefreshed Dataset Trend
                                </Text>
                            </AccordionHeader>

                            {/* Accordion panel: contains the trend chart and the dataset summary DataGrid.
                                - Trend chart shows unrefreshed dataset count over time for the selected unit.
                                - DataGrid lists all datasets with their refresh status; clicking a name opens the dialog. */}
                            <AccordionPanel>
                                {/* Business-unit-level trend chart.
                                    - `data`: array of trend points; falls back to [] if data is not an array
                                    - `isLoading`: shows a loading skeleton inside the chart while fetching
                                    - No `setDataOnDotClick` here — dot clicks are not wired at this level
                                */}
                                <DataRefreshTrendChart 
                                    data={Array.isArray(businessUnitWiseDataRefreshTrendData) ? businessUnitWiseDataRefreshTrendData : []} // Safe fallback to empty array
                                    isLoading={isFetchingBusinessUnitWiseDataRefreshTrendData}   // Show skeleton while fetching trend data
                                    yAxisLabel={"Unrefreshed Dataset Count"}                     // Vertical axis label
                                    xAxisLabel={"Execution Date"}                                // Horizontal axis label
                                />

                                {/* DataGrid for dataset refresh details within the selected business unit.
                                    Clicking a dataset name cell opens the detail dialog via the render override in datasetRefreshColumns.
                                    - `columns`: column definitions including the clickable dataset name cell
                                    - `data`: array of dataset objects from the business-unit refresh API response
                                    - `loading`: shows loading state while the refresh data is being fetched
                                */}
                                <DataGrid
                                    columns={datasetRefreshColumns}                                         // Column definitions with clickable dataset name
                                    data={businessUnitwiseDatasetRefreshData?.datasets ?? []}               // Row data with safe empty-array fallback
                                    loading={isLoadingBusinessUnitwiseDatasetRefreshData}                   // Loading indicator for the table
                                />
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>

            {/* Non-modal Dataset Detail Dialog: opens when the user clicks a dataset name in the accordion DataGrid.
                Shows a dataset-level trend chart and, after clicking a chart dot, a detail DataGrid.
                - `open`: controlled by isUnrefreshedDatasetDetailDialogOpen state
                - `onOpenChange`: fires when the dialog requests a state change; delegates to handleDiscard
                - `modalType="non-modal"`: allows interaction with the page behind the dialog
            */}
            <Dialog
                open={isUnrefreshedDatasetDetailDialogOpen}
                onOpenChange={() => handleDiscard()}    // Close dialog and reset all dataset-level state on any close event
                modalType="modal"                   // Non-modal: user can interact with content behind the dialog
            >
                {/* DialogSurface: the visual container of the dialog with fixed dimensions */}
                <DialogSurface className={styles.dialogContainer}>
                    <DialogBody>
                        {/* DialogTitle: header area showing the name of the dataset being drilled into */}
                        <DialogTitle
                            action={
                                <Button
                                    appearance="subtle"
                                    icon={<Dismiss24Filled />}
                                    aria-label="Close"
                                    onClick={() => handleDiscard()}
                                />
                            }
                        >
                            {/* <div className={styles.header}> */}
                                {/* Display the dataset name for context; styled smaller via span */}
                                <Text className={styles.subtitle}>
                                    Unrefreshed Dataset Trend
                                    <span className="text-sm text-neutral-foreground-2">({unrefreshedDatasetName})</span>
                                </Text>
                            {/* </div> */}
                        </DialogTitle>

                        {/* DialogContent: scrollable body containing the dataset-level trend chart
                            and conditionally the dot-click detail DataGrid */}
                        <DialogContent>
                            <div className={styles.dialogContent}>
                                {/* Dataset-level trend chart.
                                    - `data`: trend points for the specific dataset; falls back to []
                                    - `isLoading`: shows skeleton while dataset-level trend data is fetching
                                    - `setDataOnDotClick`: stores the clicked dot's payload → populates unrefreshedDatasetDetails → shows detail DataGrid
                                    - `xAxisLabel` / `yAxisLabel`: axis labels for the dataset-level chart
                                */}
                                <DataRefreshTrendChart
                                    data={Array.isArray(datasetwiseDataRefreshTrendData)? datasetwiseDataRefreshTrendData: []} // Safe fallback to empty array
                                    isLoading={isFetchingDatasetwiseDataRefreshTrendData}   // Show skeleton while fetching dataset-level trend data
                                    setDataOnDotClick={setUnrefreshedDatasetDetails}        // Store dot-click payload to populate the detail DataGrid below
                                    xAxisLabel={"Execution Timestamp"}                     // Horizontal axis label for the dataset-level chart
                                    yAxisLabel={"Unrefreshed Run Count"}                   // Vertical axis label for the dataset-level chart
                                />

                                {/* Detail DataGrid: conditionally rendered only after the user clicks a dot on the chart.
                                    Shows granular detail rows for the selected execution timestamp.
                                    - `columns`: column definitions for the detail table (date, derived from, alert type, details)
                                    - `data`: the dataset_details array from the clicked dot's payload
                                    - `loading`: shows loading state when details are null (data not yet available)
                                */}
                                {unrefreshedDatasetDetails && (
                                    <DataGrid
                                        columns={unrefreshedDatasetDetailColumns}               // Column definitions for the drill-down detail table
                                        data={unrefreshedDatasetDetails?.dataset_details}       // Row data from the clicked chart dot payload
                                        loading={unrefreshedDatasetDetails===null}              // Show loading state if details payload is null
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