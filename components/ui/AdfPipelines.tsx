/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 December 2025

  Purpose of the script:
    This script defines the AdfPipelines React component used in the Pipeline Dashboard UI.

  Responsibilities:
    - Receives ADF pipeline execution data (`adfData`) from a parent view.
    - Lets the user search/select a pipeline from a Combobox.
    - Fetches pipeline trend + donut distribution from an API hook for the selected pipeline.
    - Renders a DonutChart for status distribution (Succeeded vs Failed).
    - Renders a PipelineTrendChart for pipeline run trend over time.
    - Shows loading and “no data” states without breaking the page.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

import {
  makeStyles, // Fluent UI helper to define component-scoped CSS-in-JS styles.
  tokens, // Fluent UI design tokens (colors, spacing, font weights) for consistent theming.
  Text, // Fluent UI text/typography component.
  Option, // Fluent UI Option used inside Combobox for selectable items.
  Label, // Fluent UI Label component for accessible form labeling.
  Combobox, // Fluent UI Combobox for searchable selection UI.
  Spinner, // Fluent UI Spinner used for loading indication.
} from "@fluentui/react-components"; // Imports Fluent UI building blocks used in this component.

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for state management, typing, memoization, and side-effects.
*/
import { FC, useEffect, useState } from "react"; // React types + hooks for component typing, state, memoization, and side-effects.

/*  
  @/components/charts/DonutChart
    - What it is: A reusable DonutChart component for visualizing data in a donut chart format.
    - Why used: Displays the distribution of failed results by rule category in a visual manner.
*/
import { DonutChart } from "../charts/DonutChart"; // Custom DonutChart component to visualize succeeded/failed percentages.

/*  
  @/components/charts/PipelineTrendChart
    - What it is: A reusable PipelineTrendChart component for visualizing data in a trend chart format.
    - Why used: Displays the most recent runs of the selected pipeline by duration and start time, also showing run status.
*/
import PipelineTrendChart from "../charts/PipelineTrendChart"; // Custom PipelineTrendChart component to visualize pipeline trend data over time.

/*
  @/hooks/usePipelineDashboard
    - What it is: Custom React hooks for fetching data for visuals in UI.
    - Why used: Provides data for visualising donut chart and trend chart of selected pipeline.
*/
import { useGetPipelineNames, useGetPipelineTrendDetails } from "@/hooks/usePipelineDashboard"; // Custom data-fetching hook to get donut + trend details for a pipeline.

/*
  @/types/api
    - What it is: // TypeScript type defined for trend chart and donut chart data.
    - Why used:  Used for the expected trend data and donut data structure returned by the API.
*/
import { PipelineTrendSchema } from "@/types/api";
/*
  @/components/ui/CustomDateRange
    - `DateRangeOption` is the TypeScript type that describes the shape of the selected range object,
      including label, value, startDate, and endDate.
    - Example: <CustomDateRange selectedRange={selectedDateRange} setSelectedRange={setSelectedDateRange} oneDayRangeRequired={true} />
*/
import { DateRangeOption } from "./CustomDateRange";

/*
  @/components/ui/FailedPipelinesGrid
    - What it is: A data grid that displays failed run details of a selected pipeline
    - Why used: To display the failed pipeline details of the selected pipeline name
 */
import FailedPipelinesGrid from "./FailedPipelinesGrid";

/* --------------------------------------------------------------- */
/* Styles                                                          */
/* --------------------------------------------------------------- */
const useStyles = makeStyles({
  root: {
    // Root wrapper styles for the component layout container.
    // padding: tokens.spacingHorizontalXXL, // Example padding kept commented out (no runtime impact).
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Makes section titles visually prominent.
    color: tokens.colorNeutralForeground1, // Uses primary neutral text color from Fluent UI theme.
    marginBottom: tokens.spacingVerticalS, // Adds spacing below titles for cleaner layout.
  },
  emptyState: {
    display: "flex", // Uses flexbox for centering empty-state content.
    flexDirection: "column", // Stacks empty-state items vertically.
    alignItems: "center", // Centers empty-state items horizontally.
    justifyContent: "center", // Centers empty-state items vertically.
    minHeight: "60vh", // Ensures empty-state takes meaningful height on screen.
    textAlign: "center", // Centers text for empty-state messaging.
    color: tokens.colorNeutralForeground2, // Slightly muted foreground color for secondary text.
  },
  emptyIcon: {
    marginBottom: tokens.spacingVerticalL, // Adds spacing below an icon if used in empty-state.
    opacity: 0.6, // Makes the icon appear visually subtle.
  },
}); // End of style definitions created via Fluent UI makeStyles.

/* --------------------------------------------------------------- */
/* Props                                                           */
/* --------------------------------------------------------------- */
interface AdfPipelinesProps {
  selectedDateRange: DateRangeOption;
} // End of props interface definition.

/* --------------------------------------------------------------- */
/* Component                                                       */
/* --------------------------------------------------------------- */
export const AdfPipelines: FC<AdfPipelinesProps> = ({
  selectedDateRange // received from the parent component
}) => {
  const styles = useStyles(); // Initializes Fluent UI styles for use as className values.

  const [pipeline, setPipeline] = useState<string | null>(null); // Stores selected pipeline name; null means none selected yet.

  const { data: pipelineNames, isFetching: isFetchingPipelineNames } = useGetPipelineNames(
    selectedDateRange.startDate,
    selectedDateRange.endDate
  ); // Custom hook to fetch the pipeline names

  const { data, isFetching } = useGetPipelineTrendDetails(
    pipeline ?? "",
    selectedDateRange.startDate,
    selectedDateRange.endDate,
    null
  ); // Fetches trend/donut details for selected pipeline (empty string if none).

  const [trendData, setTrendData] = useState<PipelineTrendSchema[]>([]); // Local state for the trend chart series data.

  const [chartData, setChartData] = useState<
    { name: string; value: number; color: string }[]
  >([]); // Local state for donut chart points (name/value/color per segment).

  const [inputValue, setInputValue] = useState(""); // Tracks Combobox input text (used for search + display).

  const [filteredPipelines, setFilteredPipelines] = useState<string[]>([]);

  const hasDonutData = chartData.length > 0; // Boolean flag indicating donut chart has points to render.

  const hasTrendData = trendData && trendData.length > 0; // Boolean flag indicating trend chart has data to render.

  useEffect(() => {
    // Syncs derived UI chart states (chartData/trendData) whenever fetched API data or selected pipeline changes.
    if (!pipeline || !data || !data?.donut_data) {
      // If pipeline not selected OR API data not ready OR donut data missing, clear visuals to avoid stale charts.
      setChartData([]); // Clears donut chart points.
      setTrendData([]); // Clears trend chart data.
      return; // Stops further processing in this effect.
    }

    const donutData = [
      // Constructs donut chart segments based on API percentages.
      {
        name: "Succeeded", // Label used in donut chart legend/tooltip.
        value: Number(data?.donut_data?.succeeded_pipelines_percentage), // Converts succeeded percentage to number.
        color: tokens.colorPaletteGreenBorder2, // Uses Fluent UI green token for success.
      },
      {
        name: "Failed", // Label used in donut chart legend/tooltip.
        value: Number(data?.donut_data?.failed_pipelines_percentage), // Converts failed percentage to number.
        color: tokens.colorPaletteRedBorder2, // Uses Fluent UI red token for failure.
      },
    ]; // End of donut chart dataset creation.

    setChartData(donutData); // Saves computed donut points into state for DonutChart rendering.

    setTrendData(data?.trend_data); // Saves trend data from API into state for PipelineTrendChart rendering.
  }, [data, pipeline]); // Re-runs effect when either API response changes or selected pipeline changes.

  useEffect(() => {
    if (pipelineNames?.pipelineName && pipelineNames?.pipelineName?.length > 0) {
      const defaultSelected = pipelineNames?.pipelineName[0];
      setInputValue(defaultSelected);
      setPipeline(defaultSelected);
    }
  }, [pipelineNames])

  /*
  * Sample Output: User typed "sales"
  *    filteredPipelines = [
  *          "PL_SALES_REPORT_2025"
  *    ];
  */
  useEffect(() => {
    // Memoizes the filtered pipeline options so filtering only recomputes when inputValue or pipelines changes.
    if (!inputValue.trim()) {
      // If the user hasn't typed anything meaningful, show all pipelines.
      setFilteredPipelines(pipelineNames?.pipelineName); // Returns the full unfiltered list.
    }
    setFilteredPipelines(pipelineNames?.pipelineName.filter((pipeline: string) =>
      // Filters pipeline names by a case-insensitive substring match.
      pipeline?.toLowerCase().includes(inputValue.toLowerCase())
    ));
  }, [inputValue, pipelineNames]); // Dependencies ensure memo recalculates when user input or pipeline list changes.

  // function to set the pipeline name for filtering the combobox
  const handleOpenChange = () => {
    setFilteredPipelines(pipelineNames?.pipelineName);
  };

  return (
    <div className={styles.root}>
      {/* Root container applies component-wide layout styles. */}

      <div className="flex">
        {/* Top row container for pipeline selector. */}

        <div className="w-50%">
          {/* Column wrapper controlling width of the selector area. */}

          <Label>Select a Pipeline for trend analysis</Label>
          {/* Accessible label describing purpose of Combobox. */}

          <Combobox
            selectedOptions={[pipeline ?? ""]}
            value={inputValue} // Displays current input text in Combobox.
            onOpenChange={handleOpenChange}
            onInput={(event) =>
              // Updates inputValue whenever user types in the Combobox input field.
              setInputValue((event.target as HTMLInputElement).value) // Reads typed value and stores it.
            }
            onOptionSelect={(_, data) => {
              // Runs when the user selects an option from the dropdown list.
              setInputValue((data.optionText as string) ?? ""); // Updates displayed input text to selected option text.

              setPipeline(
                // Sets the selected pipeline value used to fetch pipeline trend details.
                data.optionText ?? null // Finds matching pipeline from list; if none, resets to null.
              );
            }}
            className="mt-1 w-full" // Tailwind classes for spacing and full-width layout.
            placeholder="Select/Search Pipeline to display Trend..." // Placeholder guidance when no input is present.
            appearance="filled-darker" // Fluent UI visual style variant for Combobox.
          >
            {(filteredPipelines || []).map((pipeline: string) => (
              // Renders a dropdown option per filtered pipeline name.
              <Option key={pipeline} value={pipeline} text={pipeline}>
                {/* Each option must have a stable key and a value for selection. */}
                {pipeline}
                {/* Visible option text shown in the dropdown list. */}
              </Option>
            ))}
          </Combobox>
        </div>
      </div>

      {isFetching ? (
        // Conditional branch 1: show a loading UI while API data is being fetched.
        <div className="flex h-[30vh] items-center justify-center bg-gray-50">
          {/* Loading container centers the spinner and provides a soft background. */}
          <Spinner size="large" label="Loading…" />
          {/* Fluent UI spinner indicates active loading state. */}
        </div>
      ) : (
        // Conditional branch 2: show charts/content when not fetching.
        <div>
          <div className="flex gap-6 pt-10">
            {/* Layout row containing donut section (1/3) and trend section (2/3). */}

            <div className="w-1/3">
              {/* Left column reserved for status distribution donut chart. */}

              {pipeline && hasDonutData ? (
                // Case A: pipeline selected AND donut data exists → render donut section.
                <div className={styles.title}>
                  {/* Wrapper uses "title" style for consistent typography and spacing. */}

                  <Text size={400} weight="semibold">
                    Status Distribution
                  </Text>
                  {/* Section heading for donut chart. */}

                  <div className="flex bg-neutral-background-3 items-center justify-center mt-3 h-100 w-full border border-neutral-background-3 rounded-lg shadow-md">
                    {/* Card-like container for donut chart with border, rounded corners, and shadow. */}
                    <DonutChart points={chartData} />
                    {/* Renders donut chart using the computed chartData points. */}
                  </div>
                </div>
              ) : pipeline ? (
                // Case B: pipeline selected BUT donut data missing → show a “no status data” message.
                <div className="flex items-center justify-center w-full h-full">
                  {/* Centers the fallback message in the donut area. */}
                  <p>Status Data not available for selected pipeline</p>
                  {/* Message for missing donut data. */}
                </div>
              ) : (
                // Case C: no pipeline selected → prompt user to select a pipeline.
                <div className="flex items-center justify-center w-full h-full">
                  {/* Centers the guidance message in the donut area. */}
                  <p className="pt-15">
                    Select a pipeline to display status distribution.
                  </p>
                  {/* Guidance text shown before user selection. */}
                </div>
              )}
            </div>

            <div className="w-2/3">
              {/* Right column reserved for pipeline trend chart. */}

              {pipeline && hasTrendData ? (
                // Case A: pipeline selected AND trend data exists → render trend section.
                <div className={styles.title}>
                  {/* Wrapper uses "title" style for consistent typography and spacing. */}

                  {/* Chart Title */}
                  <Text size={400} weight="semibold">
                    Pipeline Run Trend Over Time
                  </Text>
                  {/* Section heading for trend chart. */}

                  <PipelineTrendChart
                    data={trendData} // Provides the trend series data to PipelineTrendChart.
                    trendWindow={10} // Passes a fixed window size to control smoothing/aggregation in the chart component.
                  />
                  {/* Renders trend chart using trendData and a configured trend window. */}
                </div>
              ) : pipeline ? (
                // Case B: pipeline selected BUT trend data missing → show a “no trend data” message.
                <div className="flex items-center justify-center w-full h-full">
                  {/* Centers the fallback message in the trend area. */}
                  <p>Trend Data not available for selected pipeline</p>
                  {/* Message for missing trend data. */}
                </div>
              ) : (
                // Case C: no pipeline selected → prompt user to select a pipeline.
                <div className="flex items-center justify-center w-full h-full">
                  {/* Centers the guidance message in the trend area. */}
                  <p className="pt-15">
                    Select a pipeline to display run trend over time.
                  </p>
                  {/* Guidance text shown before user selection. */}
                </div>
              )}
            </div>
          </div>
          {pipeline && (
            <div className="mt-3">
              <Text size={400} weight="semibold">
                Failed Run Details
                <span className="ml-1 text-sm text-neutral-foreground-2">
                  ({pipeline})
                </span>
              </Text>
              <FailedPipelinesGrid
                data={data?.failed_pipelines_data} // Data to be shown in the table, based on search and selected filters
                isFetching={isFetching} // Show loading spinner if data is still being fetched
              />
            </div>)}
        </div>
      )}
    </div>
  ); // End JSX return for component UI.
}; // End AdfPipelines component definition.
