/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026

  Purpose of the script:
    - A component which displays failedPipelinesGrid in the pipelines dashboard.
    - used at multiple places with slight changes only.
*/

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

/*  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders the business-unit dataset refresh table inside the accordion panel,
      and the drill-down dataset detail table inside the dialog.
    - `ColumnConfig` is the TypeScript type for defining each column's key, label, width,
      and optional render/getValue overrides.
    - Example: <DataGrid columns={cols} data={rows} loading={false} />
*/
import { DataGrid, ColumnConfig } from "./DataGrid";


// define the props required by this component which can be received by the component which calls this component
interface FailedPipelinesGridProps {
    data: any;
    isFetching: boolean;
}



// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * FailedPipelineDetailsGrid
 * 
 * @description
 * Displays a data grid showing failed pipeline logs
 * 
 * @param {FailedPipelinesGridProps} props
 * 
 * @returns JSX.Element
 * 
 */
export default function FailedPipelinesGrid({data, isFetching}: FailedPipelinesGridProps) {

    // column definition for failed pipelines datagrid
    const selectedPipelineDetails: ColumnConfig<any>[] = [
        {
          key: "TRIGGER_ID",
          label: "Triggered By",
          width: "12%",
          showMore: true,
          sortable: true, // Enables sorting functionality for the column
        },
        {
          key: "RUN_ID", // Run Id column
          label: "Run ID", // label for run id
          width: "auto", // width of column
          showMore: true, // Enable show more for long runid's
          sortable: true, // Enables sorting functionality for the column
        },
        {
          key: "START_TIME", // start time of pipeline timestamp column
          label: "Start Time", // label for timestamp
          width: "12%", // width of column
          sortable: true, // Enables sorting functionality for the column
          getValue: (value, row, index) => (value ? formatDateTime(value) : "-"), // Format timestamp
        },
        {
          key: "DURATION_IN_MINUTES", // Column to show duration of pipeline run in minutes
          label: "Duration", // label for duration
          width: "8%", // width of column
          sortable: true, // Enables sorting functionality for the column
          getValue: (value, row, index) => `${value} min`, // adding "min" after values 
        },
        {
          key: "FAILURE_TYPE",
          label: "Failure Type",
          width: "8%",
          sortable: true, // Enables sorting functionality for the column
        },
        {
          key: "ERROR_MESSAGE", // Column to display outcome of pipeline run; whether succeeded or failed
          label: "Error Message", // Label for status
          width: "auto", // width of column
          showMore: true, // Enable show more for longError Messages
        }
      ]

    return (
            <DataGrid
                columns={selectedPipelineDetails}// Columns definition for the data grid
                data={data ? data : []} // Data to be shown in the table, based on search and selected filters
                loading={isFetching} // Show loading spinner if data is still being fetched
              />
    )
}