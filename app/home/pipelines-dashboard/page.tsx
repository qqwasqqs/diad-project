/*
Project Name : Teva Data Integrity
Business Owner, Team : Keerthi Pusuloori
Script Author, Team : Parthesh Patel
Date: 20 February 2026

Purpose of the script:
This script represents the Pipelines Monitoring Dashboard page.
- Shows how many data pipelines exist and their current execution status.
- Highlights how many pipelines succeeded or failed.
- Allows users to search pipelines by name.
- Displays detailed execution information in a tabular format.
- Enables drill-down navigation to Data Quality details when a pipeline fails.

Business Value:
- Helps leadership and operations teams monitor pipeline health at a glance.
- Reduces manual effort to identify failed pipelines.
- Enables faster root-cause analysis by linking pipeline failures to datasets.
*/

//---------------------- Client Component Directive ----------------------//
// This directive tells Next.js that this page must run in the browser
// because it uses interactive features like clicks, search, and state.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
@fluentui/react-components

Why used:
Provides standardized UI components (titles, text, spinners, badges, popovers)
to maintain consistency across the Teva Data Integrity application.
*/
import {
  Title3, // Fluent UI Title3 component for rendering third-level titles
  makeStyles, // Fluent UI hook for creating custom styles
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography
  Spinner, // Fluent UI Spinner component for displaying loading indicators
  SearchBox, // Fluent UI SearchBox component for displaying Search box
  Badge, // Fluent UI badge component for highlighting some important data
  Popover, // Fluent UI Popover component for displaying a popover component
  PopoverTrigger, // Fluent UI Popover trigger to trigger the Popover component
  PopoverSurface, // Fluent UI Popover Surface for displaying the popover
  shorthands, // Fluent UI shorthands to mimic properties of CSS in FluentUI components
  Text, // Fluent UI Text component for highlighting specific texts
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
    - What it is: A package of Fluent UI SVG icons packaged as React
      components (Checkmark, Error, Info, etc.).
    - Why used: The icons visually explain card meaning (success, error,
      edit) making the UI faster to scan for users.
*/
import { Database20Filled } from "@fluentui/react-icons"; // Icons used for visual indicators

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
import { Help } from "@/components/ui/Help"; // Importing the Help component for additional information tooltips

/*  
  @/components/ui/Highlights
    - What it is: A reusable component to display the pipelines dashboard summary cards.
    - Why used: Displays high-level pipeline run summary such as Total, Succeeded, and Failed pipelines.
*/
import { Highlights } from "@/components/ui/Highlights"; // Highlights component for displaying summary cards

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState } from "react";

/*
@/components/ui/AdfPipelines

Why used:
Displays additional detailed pipeline visuals and summaries.
*/
import { AdfPipelines } from "@/components/ui/AdfPipelines";

/*
@/components/ui/DataGrid

Why used:
Reusable table component to display pipeline execution details.
*/
import { DataGrid, ColumnConfig } from "@/components/ui/DataGrid";

/*
@/hooks/usePipelineDashboard
- What it is: Custom React hooks for fetching data related to the pipeline run logs.
Why used:
Custom hooks that fetch pipeline execution data and summary statistics
from backend services or APIs.
*/
import {
  useGetPipelineHighlights,
  useGetFilteredPipelineData,
} from "@/hooks/usePipelineDashboard";

// Shared helper to format timestamps into human-readable strings
// - What it does: converts raw timestamp values to friendly date/time text.
// - Why used here: to display the "timestamp" column and "lastUpdate" in readable format.
import { formatDateTime } from "@/lib/helper"; // Helper function to format date and time for display

/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To drill down and go to quality dashboard detailed view to get more details about the failed pipeline run.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore";

/*
  next/link
    - What it is: Next.js Link component for client-side navigation between pages.
    - Why used: Wraps the logo so clicking it navigates to the executive dashboard without a full page reload.
*/
import Link from "next/link";

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
  @/components/ui/FailedPipelineDetailsDialog
    - What it is: A component which opens a dialog and displays details about failed pipeline runs
    - Why used here: When we click on failure_type value of failed pipeline run, we can see the details of why it failed,
      how many times it failed and all the details of failed runs of that pipeline.
 */
import FailedPipelineDetailsDialog from "@/components/ui/FailedPipelineDetailsDialog";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

// ---------------------------------------------------------------------
// STYLING CONFIGURATION
// ---------------------------------------------------------------------

/**
 * `useStyles`
 *
 * Centralized styling hook for this page.
 * Defines layout, spacing, typography, and interaction styles
 * to ensure visual consistency across the component.
 *
 * These styles are applied using Fluent UI's `makeStyles`
 * and leverage design tokens for theme alignment.
 */
const useStyles = makeStyles({
  root: {
    // Root container styling
    // Adds top spacing to separate content from surrounding layout
  },

  header: {
    // Header container styles
    // Uses flex layout to align title and actions horizontally
    display: "flex", // Enables horizontal layout
    flexDirection: "column",
    gap: tokens.spacingHorizontalS, // Space between header elements
  },
  filterContainer: {
    display: "flex", // Horizontal filter layout
    flexWrap: "wrap", // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Spacing between filters
  },
  title: {
    // Main page title styles
    fontWeight: tokens.fontWeightBold, // Emphasizes the title
    color: tokens.colorNeutralForeground1, // Primary neutral text color
    marginBottom: tokens.spacingVerticalS, // Space below the title
  },

  sectionTitle: {
    // Section header styles
    // Used for labeling different content sections
    display: "flex", // Allows icon and text alignment
    alignItems: "center", // Vertically centers section title content
    gap: tokens.spacingHorizontalS, // Space between icon and text
    // marginTop: tokens.spacingVerticalXL, // Small top margin for separation
    fontWeight: tokens.fontWeightSemibold, // Semi-bold for visual hierarchy
  },

  container: {
    // Main content container styles
    // Adds bottom spacing to prevent content from touching page edges
    paddingBottom: tokens.spacingVerticalXL,
  },

  popoverSurface: {
    // Popover surface styling
    // Controls the width and internal spacing of popover content
    maxWidth: "450px", // Prevents overly wide popovers
    minWidth: "350px", // Ensures readable minimum width
    // Container for scrollable list content
    maxHeight: "300px", // Restricts height to avoid overflow
    overflowY: "auto", // Enables vertical scrolling when content exceeds height
    ...shorthands.padding(
      tokens.spacingVerticalXL,
      tokens.spacingHorizontalXL
    ), // Consistent inner padding
  },

  popoverListUl: {
    // Unordered list styling inside popover
    listStyleType: "disc", // Standard bullet points
    paddingLeft: "1rem", // Aligns bullets properly
    margin: 0, // Removes default margin
    textAlign: "left", // Ensures text alignment consistency
  },

  popoverListLi: {
    // Individual list item styles
    color: tokens.colorNeutralForeground2, // Secondary neutral text color
    textDecorationLine: "underline", // Indicates clickable or interactive items
    fontSize: tokens.fontSizeBase200, // Sets font size to the dataset
    paddingBottom: "4px", // Slight spacing between list items

    ":hover": {
      // Hover interaction feedback
      color: tokens.colorNeutralForeground3Hover, // Subtle hover highlight
    },
  },
});


// ---------------------------------------------------------------------
// COMPONENT DEFINITION
// ---------------------------------------------------------------------

/**
 * PipelinesDashboard Component
 *
 * High-level overview:
 * - Fetches pipeline data and statistics
 * - Displays Pipeline summary cards
 * - Shows pipeline execution table
 * - Enables search and drill-down navigation
 *  @returns JSX.Element - The rendered content for the Pipeline Dashboard.
 */
export default function PipelinesDashboard() {
  const styles = useStyles(); // Hook to apply styles to the component

  const {canRead, isLoadingPermissions} = usePagePermissions("pipelines-dashboard");

  const [selectedCard, setSelectedCard] = useState<any>({ status: "Succeeded" }); // Hook to track the selected card and display the filtered pipeline logs.

  // store the selected failedPipelineName and triggerId to pass it down to other components to get more details
  const [selectedFailedPipeline, setSelectedFailedPipeline] = useState<{ failedPipelineName: string, failedTriggerId: string | null } | null>(null);

  // set the state of dialog whether opened or closed
  const [isFailedPipelineDetailsDialogOpen, setIsFailedPipelineDetailsDialogOpen] = useState<boolean>(false);

  // set the date range of the page
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeOption>({
      label: "", // Display label for the selected range
      value: "", // Internal value used for selection
      startDate: null, // Start date for filtering
      endDate: null, // End date for filtering
    });

  // call the custom hook to get the summary of the pipeline run logs within the selected time range.
  // returns: highlights of pipeline logs.
  /*        {
              total_pipeline_runs: 10000,
              succeeded_runs: 8000
              failed_runs: 2000
            }
   * 
   */
  const { highlightsData, isFetchingHighlights } = useGetPipelineHighlights(
    selectedDateRange.startDate,
    selectedDateRange.endDate
  ); // Get the pipeline summary card data using this hook from the backend

  const [searchQuery, setSearchQuery] = useState<string>(""); // Hook to store the search query string and filter the data accordingly.

  /**
   * call the custom hook to get the statuswise latest pipeline logs within the selcted time range.
   * returns: array of pipeline logs
   *    {
    "pipelineData": [
        {
            "PIPELINE_NAME": "DEV-PL_RND_PV_Case_Processing_Data_Load","TRIGGER_ID": "ab3e099d-2a3c-46de-a53b-7d372bc16de0","START_TIME": "2026-03-26T10:13:05.0000000Z","END_TIME": "2026-03-26T10:18:03.0000000Z","DURATION_IN_MINUTES": "4.97","STATUS": "Failed","L2_BU": "Pharmacovigilance","MOST_FREQUENT_FAILURE_TYPE": "UserErrorFileNotFound","MOST_FREQUENT_FAILURE_REASON": "The specified file does not exist at the given path."
        },
        {
            "PIPELINE_NAME": "DEV-PL_SCITARA_DB_QLIK","TRIGGER_ID": "68891737-d751-47e4-b711-b64ef85b9903","START_TIME": "2026-03-26T10:11:24.0000000Z","END_TIME": "2026-03-26T10:13:16.0000000Z","DURATION_IN_MINUTES": "1.87","STATUS": "Failed","L2_BU": "{\"type\":\"string\"}","MOST_FREQUENT_FAILURE_TYPE": "Unknown Error","MOST_FREQUENT_FAILURE_REASON": "Errors that don't fit into common categories and may need further review."
        },
                    ]
        }
   */
  const { filteredData, isFetchingFilteredData } = useGetFilteredPipelineData(
    selectedCard.status,
    selectedDateRange.startDate,
    selectedDateRange.endDate
  ); // Custom hook to fetch filtered pipeline logs (succeeded/failed)

  // Access the filter store
  const {
    setCatalog, // used to set catalog name to the one selected in the popover
    setSchema, // used toset schema name to the one selected in the popover
    setDataset, // used to set dataset name to the one selected in the popover
    applyFilters, // apply the filter in the data quality dashboard
  } = useDQDDetailedViewFiltersStore(); // custom hook store for dataset filter

  // This function runs when a user clicks on a dataset name in the UI popover
  const handleDatasetClick = (item: any) => {

    // Store the selected catalog name so the system knows which catalog to work with
    setCatalog(item.catalog_name);

    // Store the selected schema name to narrow down the data structure
    setSchema(item.schema_name);

    // Store the selected dataset name so the correct dataset is displayed
    setDataset(item.dataset_name);

    // Immediately apply all selected filters so the page refreshes with the chosen data
    applyFilters();
  };

  // This array defines the summary cards shown at the top of the ADF Pipelines dashboard
  const adfPipelinesHighlight = [

    // Configuration for the "Total Pipelines" summary card
    {
      // Title text shown on the summary card
      title: "Total Pipelines",

      // Number displayed on the card, defaulting to 0 if data is missing
      count: highlightsData?.pipelineHighlights?.total_pipelines ?? 0,

      // Info text for the card
      info: "This represents the total number of pipelines that have been triggered within the selected date range, across all users or processes. It includes both successful and failed pipeline runs.",

      // Action triggered when the user clicks the card (shows all pipelines)
      onClick: () => handleCardClick({ status: "All" }),

      // The Fluent UI Database Icon for the Total Pipelines card
      icon: <Database20Filled />,
    },

    // Configuration for the "Succeeded Pipelines" summary card
    {
      // Title text shown on the summary card
      title: "Succeeded Pipelines",

      // Number of pipelines that completed successfully
      count: highlightsData?.pipelineHighlights?.succeeded_pipelines ?? 0,

      // Info text for the card
      info: "This represents the number of pipelines that successfully completed within the selected date range, across all users or processes.",

      // Percentage of successful pipelines shown as a string (e.g., "85%")
      percentage: (highlightsData?.pipelineHighlights?.succeeded_pipelines_percentage ?? 0) + "%",

      // Action triggered when the card is clicked (filters to successful pipelines only)
      onClick: () => handleCardClick({ status: "Succeeded" }),
    },

    // Configuration for the "Failed Pipelines" summary card
    {
      // Title text shown on the summary card
      title: "Failed Pipelines",

      // Number of pipelines that failed during execution
      count: highlightsData?.pipelineHighlights?.failed_pipelines ?? 0,

      // Info text for the card
      info: "This represents the number of pipelines that failed to complete within the selected date range, across all users or processes.",

      // Percentage of failed pipelines shown as a string (e.g., "15%")
      percentage: (highlightsData?.pipelineHighlights?.failed_pipelines_percentage ?? 0) + "%",

      // Action triggered when the card is clicked (filters to failed pipelines only)
      onClick: () => handleCardClick({ status: "Failed" }),
    }
  ];

  // Column configuration for the pipeline runs logs.
  const adfColumns: ColumnConfig<any>[] = [
    {
      key: "PIPELINE_NAME", // Pipeline Name column
      label: "Pipeline Name", // label for pipeline name column
      width: "25%", // width of column
      showMore: true, // Enable show more for long pipeline names
      copyable: true, // It will show a copy button to copy the pipeline name
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "TRIGGER_ID", // Run Id column
      label: "Triggered By", // label for run id
      width: "15%", // width of column
      showMore: true, // Enable show more for long runid's
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "START_TIME", // start time of pipeline timestamp column
      label: "Start Time", // label for timestamp
      width: "9%", // width of column
      showMore: true, // Enable show more for long text
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"), // Format timestamp
    },
    {
      key: "DURATION_IN_MINUTES", // Column to show duration of pipeline run in minutes
      label: "Duration", // label for duration
      width: "7%", // width of column
      showMore: true, // Enable show more for long text
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => `${value} min`, // adding "min" after values 
    },
    {
      key: "STATUS", // Column to display outcome of pipeline run; whether succeeded or failed
      label: "Status", // Label for status
      width: "8%", // width of column
      sortable: true, // Enables sorting functionality for the column
      // render is used here to highlight the status of pipeline run. Also, to create a popover,
      // which displays the dataset_name(s) due to which pipeline failed.
      // The dataset_names are clickable which leads to data quality dashboard to check more details about the failed dataset.
      render: (value, row, index) => {
        // stores whether pipeline failed or passed
        const isFailed = value === "Failed";

        // transform dataset_name value into usable array of string so that the user can navigate to DQD.
        // DATASET_NAME is split into array from comma "," and removed whitespaces if present.

        // For ex: DATASET_NAME has values: "dset_dev.us_schema_mng.value_trak_monthly, dset_dev.us_schema_mng.value_trak_weekly"
        // After below transformation it becomes : ["dset_dev.us_schema_mng.value_trak_monthly", "dset_dev.us_schema_mng.value_trak_weekly"]
        const Datasets: string[] = (row?.DATASET_NAME?.split(',').map((name: string) => name.trim())) || "";

        // Now each element in the Datasets are is split from point "."
        // Wherever there is  a "." in the array value, it is getting split into two values.
        // Finally getting catalog_name, schema_name, and dataset_name. Or null if there is an error.
        // Example: Datasets has: ["dset_dev.us_schema_mng.value_trak_monthly", "dset_dev.us_schema_mng.value_trak_weekly"]
        // parts will have: [["dset_dev", "us_schema_mng","value_trak_monthly"],["dset_dev","us_schema_mng","value_trak_weekly"]]
        // And in the end:
        // datasetObjects will be [{catalog_name: "dset_dev", schema_name:"us_schema_mng",dataset_name: "value_trak_monthly"},{catalog_name: "dset_dev", schema_name: "us_schema_mng", dataset_name: "value_trak_weekly"}]
        const datasetObjects = Array.isArray(Datasets) ? Datasets.map((dataset) => {
          const parts = dataset.split('.'); // Split the string by '.'

          // Ensure the dataset is in the correct format (catalog_name.schema_name.dataset_name)
          if (parts.length === 3) {
            const [catalog_name, schema_name, dataset_name] = parts;
            return { catalog_name, schema_name, dataset_name };
          } else {
            return null; // Return null or handle this error as needed
          }
        }).filter(item => item !== null) : []; // Filter out any invalid dataset names (if needed)

        // Badge is used to highlight the status of the pipeline
        const badge = (
          <Badge
            appearance="filled" // Filled from inside the badge element
            color={isFailed ? "danger" : "brand"} // color is selected based on the status. "danger" if failed, "brand" if passed
            className="cursor-pointer transition-colors hover:opacity-80" // on hover add cursor, make it a little lighter when hovering
          >
            {value}
          </Badge> // value of the status. Succeeded/ Failed
        );
        return (
          <Popover trapFocus>
            {/* container that appears when suer interacts */}
            <PopoverTrigger disableButtonEnhancement>
              {badge}
              {/* Clicking the badge opens the popover */}
            </PopoverTrigger>

            <PopoverSurface className={styles.popoverSurface}>
              <div className="flex flex-col items-start">

                {/* Check if datasets exist for this pipeline */}
                {datasetObjects.length > 0 ? (
                  <div>
                    <div className="pb-3">
                      <Text>Click on a Dataset Name to view more details:</Text>
                    </div>
                    <ul className={styles.popoverListUl}>
                      {/* Show a list of datasets if available */}

                      {datasetObjects.map((item, idx) => (

                        // Each dataset is displayed as a clickable list item
                        <li
                          key={idx} // Unique key for React rendering
                          className={styles.popoverListLi}
                        >
                          <Link
                            href={"/home/data-quality-dashboard/detailed-view"} // Navigate to detailed view
                            onClick={() => handleDatasetClick(item)} // Apply filters based on dataset clicked
                          >
                            {/* Display dataset in readable catalog.schema.dataset format */}
                            {item?.catalog_name}.{item?.schema_name}.{item?.dataset_name}
                          </Link>
                        </li>

                      ))}
                    </ul>
                  </div>

                ) : (

                  // Show a message if no datasets are associated with this pipeline
                  <Text
                    size={300}
                    className="text-neutral-foreground-2 mx-auto"
                  >
                    No datasets found.
                  </Text>

                )}
              </div>
            </PopoverSurface>
          </Popover>
        );
      },
    },
    {
      key: "MOST_FREQUENT_FAILURE_TYPE", // most frequesnt failure type key
      label: "Most Frequent Failure Type", // label for the key
      width: "10%", // column width
      showMore: true, // should show more
      sortable: true, // Enables sorting functionality for the column
      render: (value, row, index) => {
        return (
          <Text
            size={200}                                      // Smaller text size for table cells
            className="cursor-pointer hover:underline"      // Pointer cursor and underline on hover to indicate interactivity
            onClick={() =>
              openFailedPipelineDetails(row.PIPELINE_NAME, row.TRIGGER_ID)        // Open the dataset drill-down dialog on click
            }
          >
            {value}
          </Text>
        )
      }
    },
    {
      // Unique identifier for the error message column
      key: "MOST_FREQUENT_FAILURE_REASON",
      // Column header text shown to users
      label: "Most Frequent Failure Reason",
      // Width allocation for the error message column
      width: "26%",
      // Allows long error messages to be expandable instead of truncated
      showMore: true
    }
  ];

  const topFiveLongestRunning: ColumnConfig<any>[] = [
    {
      key: "pipelineName", // pipeline name column
      label: "Pipeline Name", // label for it
      width: "25%", // width of column
      copyable: true, // whether show copy button to copy the data
      showMore: true, // whether show more to display some data until show more is clicked
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "triggerId", // trigger id column
      label: "Triggered By", // label for trigger id
      width: "auto", // width of column
      showMore: true, // whether show more to display some data until show more is clicked
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "durationInMinutes", // duration column
      label: "Duration", // label for duration
      width: "12%", // width od column
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => `${value} min`, // adding "min" after values 
    },
    {
      key: "start", // start time column
      label: "Start Time", // label for start time
      width: "18%", // width of column
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"), // Format timestamp
    },
    {
      key: "end", // end time column
      label: "End Time", // label for end time
      width: "18%", // width of column
      sortable: true, // Enables sorting functionality for the column
      getValue: (value, row, index) => (value ? formatDateTime(value) : "-"), // Format timestamp
    },
    {
      key: "status", // status column
      label: "Status", // label for status
      width: "9%", // width of column
      sortable: true, // Enables sorting functionality for the column
    }
  ]

  // for top 5 shortest running pipeline logs, we don't require status column so remove them from above and reuse the same definition
  const topFiveShortestRunning = topFiveLongestRunning.slice(0, -1);

  // This function runs when the user clicks on a summary card in the dashboard (e.g., "Total Pipelines", "Succeeded Pipelines")
  const handleCardClick = (item: any) => {
    // Store the selected card's information in the state to highlight or filter data accordingly
    setSelectedCard(item);
  };

  // function to set the name of selected pipeline and also open the dialog which shows more details of failed pipeline
  const openFailedPipelineDetails = (pipelineName: string, triggerId: string | null) => {
    setSelectedFailedPipeline({ failedPipelineName: pipelineName, failedTriggerId: triggerId });
    setIsFailedPipelineDetailsDialogOpen(true);
  }

  // Filter the base pipeline data based on the search query entered by the user
  /**
   * Example structure of filteredPipelineData (after search filter applied)
   * filteredPipelineData = [
   *   {PIPELINE_NAME: "Pipeline 1",STATUS: "Succeeded",LAST_RUN: "2026-01-10",DURATION: "5m",
   *      other pipeline details...
   *    },
   * ]; 
   * 
   * if the search query was "Pipeline 1", it would only show this pipeline
   */
  const filteredPipelineData = searchQuery.trim() === ""
    // If the search query is empty (the user hasn't typed anything), show the full pipeline data
    ? (filteredData ? filteredData?.pipelineData : [])
    : (filteredData ? filteredData?.pipelineData : []).filter((pipeline: any) => {
      // Otherwise, filter the pipeline data by matching pipeline names or TRIGGER_ID (case-insensitive)
      const keyworld = searchQuery.toLowerCase().replace(/[\s_]/g, "");
      return pipeline.PIPELINE_NAME?.toLowerCase().replace(/[\s_]/g, "").includes(keyworld) ||
        pipeline.TRIGGER_ID?.toLowerCase().includes(keyworld)
    });

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
    // Outer wrapper div for the entire page's content
    <div className={styles.root}>

      {/* Header section with title */}
      <div className={styles.header}>
        {/* Page title, “Pipelines Monitoring” */}
        <Title3 className={styles.title}>Pipelines Monitoring</Title3>
        <div className="flex">
          <CustomDateRange
            selectedRange={selectedDateRange} // Currently selected date range
            setSelectedRange={setSelectedDateRange} // Handler to update selected date range
            oneDayRangeRequired={true} // if one day range is required
          />
        </div>
      </div>

      {/* Main content area */}
      <div>
        <div className={styles.container}>

          {/* Check if data is still loading */}
          {isFetchingHighlights ? (
            // Display a loading spinner while fetching the pipeline highlights
            <div className="flex min-h-[15vh] items-center justify-center">
              <Spinner size="small" label="Loading data…" />
            </div>
          ) : (
            // Once data is loaded, display the pipeline highlights section
            <Highlights data={adfPipelinesHighlight} />
          )}

          <div className="w-full flex flex-col gap-2 mt-4">
            {/* Section title with help text below */}
            <div className={styles.sectionTitle}>
              {/* Display the status title (e.g., "Total Pipelines", "Succeeded Pipelines") */}
              <Text size={400} weight="semibold">
                {selectedCard.status === "All" ? "Total" : selectedCard.status} Pipelines
              </Text>

              {/* Help tooltip explaining what this section is about */}
              <Help
                info="This table summarizes total, succeeded, and failed pipelines, displaying details such as pipeline name, triggered by, start time, duration, status, and most frequent failure type & reason for failed pipelines. Select any of the cards above to filter the list below and monitor pipeline health. Click on the status badge in each row to view the list of datasets that failed during pipeline execution and navigate to the Data Quality Dashboard Detailed View page to investigate dataset issues. Use this view to quickly identify pipelines requiring attention and ensure smooth operations."
              />
            </div>
            {/* Search box allowing the user to filter pipelines by name */}
            <SearchBox
              placeholder="Filter by pipeline name or triggered by..." // Text prompt inside the search box
              value={searchQuery} // Bind the input field to the searchQuery state
              onChange={(_, data) => setSearchQuery(data.value ?? "")} // Update search query state on user input
              className="w-[20rem]" // Full-width input box
            />
          </div>

          {/* Data grid to display filtered pipeline data in a table format */}
          <DataGrid
            columns={adfColumns} // Columns definition for the data grid
            data={filteredPipelineData} // Data to be shown in the table, based on search and selected filters
            loading={isFetchingFilteredData} // Show loading spinner if data is still being fetched
          />

          <div className="mt-5">
            <Text size={400} weight="semibold">
              Top 5 Longest Running Pipelines
            </Text>
          </div>
          {/* table to display the top 5 longest running pipeline using datagrid component  */}
          <DataGrid
            columns={topFiveLongestRunning} // passing column definitions
            data={highlightsData ? highlightsData?.longestRunningResults : []} // pass data fetched using custom hook
            loading={isFetchingHighlights} // loading state handler
          />

          <div className="mt-5">
            <Text size={400} weight="semibold">
              Top 5 Shortest Running Succeeded Pipelines
            </Text>
          </div>
          {/* table to display the top 5 shortest running succeeded pipelines using datagrid component  */}
          <DataGrid
            columns={topFiveShortestRunning} // column definition
            data={highlightsData ? highlightsData?.shortestRunningResults : []} // data fetched from backed
            loading={isFetchingHighlights} // loading state
          />

        </div>

        {/* Additional section below the data grid to display ADF pipeline data */}
        <AdfPipelines
          selectedDateRange={selectedDateRange}
        />

      </div>

      {/* Failed pipeline dialog box which opens when we click on most frequent failure type */}
      <FailedPipelineDetailsDialog
        isFailedPipelineDetailsDialogOpen={isFailedPipelineDetailsDialogOpen} // variable that stores state of dialog
        setIsFailedPipelineDetailsDialogOpen={setIsFailedPipelineDetailsDialogOpen} // sets the state of dialog
        selectedFailedPipeline={selectedFailedPipeline} // selected pipeline name and trigger id
        setSelectedFailedPipeline={setSelectedFailedPipeline} // set the selected pipeline name
        selectedDateRange={selectedDateRange} // selected date range
      />
    </div>
  );
}    