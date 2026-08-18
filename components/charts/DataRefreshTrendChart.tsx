/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 February 2026 
  Purpose of the script: 
    This script represents the DataRefreshTrendChart component — a reusable time-series line chart
    used to visualise the count of unrefreshed datasets over time.
    - It renders a Recharts LineChart inside a responsive container with styled axes and a custom tooltip.
    - Each data point on the line is an interactive dot; clicking a dot calls the setDataOnDotClick
      callback with the point's payload so parent components can drill down into the details.
    - While data is loading, it renders a Fluent UI Skeleton placeholder that matches the chart dimensions.
    - The component is used at two levels: the overall/business-unit trend view and the dataset-level
      drill-down trend view inside the detail dialog.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses browser APIs and interactive chart events.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  recharts
    - What it is: A composable charting library built on React and D3.
    - Why used: Provides the LineChart and its sub-components needed to render the
      interactive time-series trend line with axes, grid, and tooltip.
    - Components used:
        LineChart       – The root chart component that manages layout and data context.
        Line            – Renders the trend line and its data dots.
        XAxis           – Horizontal axis bound to the "date" data key.
        YAxis           – Vertical axis showing the unrefreshed dataset count.
        CartesianGrid   – Background grid lines for readability.
        Tooltip         – Hover tooltip; replaced with a custom component (see CustomTooltip).
        ResponsiveContainer – Wraps the chart so it fills its parent's width and height.
    - Example: <LineChart data={data}><Line dataKey="unrefreshed_count" /></LineChart>
*/
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography for the tooltip, design tokens for consistent colors,
      and Skeleton/SkeletonItem components for the loading placeholder state.
    - Components used:
        tokens        – Design tokens for colors, border radius, and shadow used in custom tooltip styling.
        Subtitle2     – Renders the date bucket label as a subtitle inside the tooltip.
        Text          – Renders the metric label and value inside the tooltip.
        makeStyles    – Hook for creating scoped Fluent UI styles.
        Skeleton      – Container for the loading placeholder layout.
        SkeletonItem  – Individual placeholder block within the Skeleton.
    - Example: <Skeleton><SkeletonItem style={{ height: 220, width: "100%" }} /></Skeleton>
*/
import {
  tokens,       // Fluent UI design tokens for consistent spacing, colors, border radius, and shadows
  Subtitle2,    // Fluent UI Subtitle2 component for rendering the tooltip date label
  Text,         // Fluent UI Text component for rendering metric name and value in the tooltip
  makeStyles,   // Fluent UI hook for creating custom scoped styles
  Skeleton,     // Fluent UI Skeleton container for the loading placeholder state
  SkeletonItem  // Fluent UI SkeletonItem for individual placeholder blocks within the skeleton
} from "@fluentui/react-components";

/* --------------------------------------------------------------------- */
/* STYLES                                                                  */
/* --------------------------------------------------------------------- */

/**
 * `useStyles` function is used to define and return custom styles for the component.
 *
 * Defines the visual appearance of the custom tooltip overlay shown on hover.
 * Applies Fluent UI design tokens to ensure the tooltip matches the dashboard's design system.
 */
const useStyles = makeStyles({
  tooltipContainer: {
    backgroundColor: tokens.colorNeutralBackground1,    // Neutral white/light background matching the dashboard theme
    borderRadius: tokens.borderRadiusMedium,            // Rounded corners consistent with other Fluent UI surfaces
    boxShadow: tokens.shadow16,                         // Elevated shadow to make the tooltip appear above the chart
    padding: "10px 14px",                               // Internal spacing for comfortable text layout
    minWidth: "180px",                                  // Minimum width to prevent text from wrapping too aggressively
  },
});

/* --------------------------------------------------------------------- */
/* CUSTOM TOOLTIP                                                          */
/* --------------------------------------------------------------------- */

/**
 * `CustomTooltip` Component
 *
 * A custom tooltip rendered by Recharts when the user hovers over the trend line.
 * Replaces the default Recharts tooltip with a Fluent UI styled overlay that shows:
 *   - The bucket label (e.g., the date of the hovered data point) as a subtitle.
 *   - The Y-axis metric name and its numeric value.
 *
 * Recharts passes the following props automatically when used via <Tooltip content={...}/>:
 * @param active   - Boolean; true when the tooltip is currently visible (user is hovering).
 * @param payload  - Array of data objects for the hovered point; payload[0].value is the metric value.
 * @param yAxisLabel - String passed from the parent chart component to label the metric (e.g., "Unrefreshed Dataset Count").
 *
 * @returns JSX.Element | null – The tooltip overlay, or null when not active or no data.
 *
 * Example rendered output when hovering over a data point:
 *   ─────────────────────────
 *    2025-11-05              
 *    Unrefreshed Dataset Count: 12 
 *   ─────────────────────────
 */
const CustomTooltip = ({ active, payload, yAxisLabel }: any) => {
  const styles = useStyles(); // Hook to apply tooltip container styles

  // Return nothing if the tooltip is not active or there is no payload data
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0].value;               // Numeric metric value for the hovered data point

  const bucket_label = payload[0].payload.bucket_label; // Human-readable date/bucket label from the data point object

  return (
    <div className={styles.tooltipContainer}>
      {/* Date/bucket label displayed as a subtitle at the top of the tooltip */}
      <Subtitle2>{bucket_label}</Subtitle2>

      <div style={{ marginTop: 6 }}>
        {/* Metric name and value displayed below the label */}
        <Text size={200}>
          {yAxisLabel}:{" "}
          <b>{value}</b>
        </Text>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------- */
/* TYPES                                                                   */
/* --------------------------------------------------------------------- */

/**
 * `TrendPoint` interface
 *
 * Describes the shape of a single data point in the trend chart's dataset.
 * @property date             - ISO date string for the data point's execution date (used by XAxis).
 * @property unrefreshed_count - Number of unrefreshed datasets recorded at this date (used by the Line).
 * - Example: { date: "2025-11-05", unrefreshed_count: 12 }
 */
interface TrendPoint {
  date: string;
  unrefreshed_count: number;
}

/**
 * `DataRefreshTrendProps` interface
 *
 * Describes the props accepted by the DataRefreshTrendChart component.
 * @property data             - Array of TrendPoint objects to be plotted on the line chart.
 * @property isLoading        - Boolean flag; when true, renders a skeleton placeholder instead of the chart.
 * @property setDataOnDotClick - Callback invoked when the user clicks a data dot; receives the dot's full payload object.
 *                               Optional — some usages (e.g., the business-unit accordion chart) do not wire dot clicks.
 * @property yAxisLabel       - Label string for the vertical axis (e.g., "Unrefreshed Dataset Count").
 * @property xAxisLabel       - Label string for the horizontal axis (e.g., "Execution Date").
 * - Example: <DataRefreshTrendChart data={points} isLoading={false} setDataOnDotClick={fn} yAxisLabel="Count" xAxisLabel="Date" />
 */
interface DataRefreshTrendProps {
  data: TrendPoint[];
  isLoading: boolean;
  setDataOnDotClick?: (data:any) => void;
  yAxisLabel: string;
  xAxisLabel: string;
}

/* --------------------------------------------------------------------- */
/* CHART COMPONENT                                                         */
/* --------------------------------------------------------------------- */

/**
 * `DataRefreshTrendChart` Component
 *
 * A reusable time-series line chart for visualising unrefreshed dataset counts over time.
 * Renders a responsive Recharts LineChart with:
 *   - A custom Fluent UI tooltip on hover.
 *   - Interactive dots that call setDataOnDotClick when clicked.
 *   - A Skeleton loading state while data is being fetched.
 *
 * Used in two contexts:
 *   1. Inside the DataRefresh page accordion to show overall/business-unit-level trends.
 *   2. Inside the BusinessUnitDataRefresh dialog to show dataset-level trends.
 *
 * @param data             - Array of trend data points to plot.
 * @param isLoading        - When true, renders a skeleton placeholder.
 * @param setDataOnDotClick - Callback for dot click events; parent uses this to open detail dialogs.
 * @param yAxisLabel       - Label for the Y axis.
 * @param xAxisLabel       - Label for the X axis.
 * @returns JSX.Element    - The chart or its loading skeleton.
 */
export default function DataRefreshTrendChart({
  data,
  isLoading,
  setDataOnDotClick = (data: any) => { },
  yAxisLabel,
  xAxisLabel,
}: DataRefreshTrendProps) {

  //---------------------- Loading State -------------------------//

  // Display a skeleton placeholder matching the chart dimensions while data is being fetched.
  // The skeleton prevents layout shift and signals to the user that content is on the way.
  if (isLoading) {
    return (
      <div className="bg-neutral-background-3 mt-3 h-80 w-full border border-neutral-background-3 rounded-lg shadow-md p-4">
        <Skeleton width="100%">
          {/* Main chart area placeholder — tall block representing the chart body */}
          <SkeletonItem style={{ height: 220, width: "100%" }} />
          {/* X-axis tick placeholders — short horizontal blocks representing axis labels */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <SkeletonItem style={{ height: 10, width: 40 }} />
            <SkeletonItem style={{ height: 10, width: 40 }} />
            <SkeletonItem style={{ height: 10, width: 40 }} />
          </div>
        </Skeleton>
      </div>
    );
  }

  //---------------------- Chart -------------------------//

  return (
    // Chart wrapper: fixed height container with rounded border and shadow matching the dashboard card style
    <div className="bg-neutral-background-3 mt-3 h-[350px] w-full border border-neutral-background-3 rounded-lg shadow-md">
      {/* ResponsiveContainer: makes the chart fill 100% of the wrapper's width and height */}
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, left: 10, bottom: 30 }} // Chart margins: extra bottom space for the X-axis label
        >
          {/* CartesianGrid: light dashed grid lines to help the user read values accurately */}
          <CartesianGrid strokeDasharray="3 3" />

          {/* XAxis: horizontal axis bound to the "date" field of each data point.
              - tickFormatter (commented out): could format dates to friendly strings via formatDateTime.
              - label: positioned at the bottom centre of the chart using the xAxisLabel prop.
          */}
          <XAxis
            dataKey="date"
            // tickFormatter={(date) => formatDateTime(date)} // Optional: format raw date strings on axis ticks
            tick={{
              fill: tokens.colorNeutralForeground2,  // Muted neutral color for tick labels
              fontSize: 12,                           // Smaller font size for axis ticks to avoid crowding
            }}
            label={{
              value: xAxisLabel,                  // Axis label text passed from the parent
              position: "insideBottom",            // Position the label below the tick marks
              offset: -10,                         // Pull the label slightly inward to avoid clipping
              style: {
                fill: tokens.colorNeutralForeground1,   // Darker neutral color for the axis label
                fontSize: 14,                           // Slightly larger than tick labels for visual hierarchy
              },
            }}
          />

          {/* YAxis: vertical axis showing the unrefreshed dataset count.
              - label: rotated 90° and positioned to the left of the axis ticks using the yAxisLabel prop.
          */}
          <YAxis
            tick={{
              fill: tokens.colorNeutralForeground1,  // Neutral foreground color for Y-axis tick labels
              fontSize: 12,                           // Smaller font size for axis ticks
            }}
            label={{
              value: yAxisLabel,          // Axis label text passed from the parent
              angle: -90,                 // Rotate the label to run vertically alongside the axis
              position: "outside",        // Position the label outside the chart area on the left
              dx: -20,                    // Shift the label leftward to prevent overlap with tick labels
              style: {
                fill: tokens.colorNeutralForeground1,   // Neutral foreground color for the axis label
                fontSize: 14,                           // Slightly larger than tick labels for visual hierarchy
              },
            }}
          />

          {/* Tooltip: replaced with the custom CustomTooltip component.
              Passes yAxisLabel through so the tooltip can label the metric correctly. */}
          <Tooltip content={<CustomTooltip yAxisLabel={yAxisLabel}/>} />

          {/* Line: renders the trend line connecting all data points.
              - dataKey="unrefreshed_count": binds the line to the unrefreshed_count field.
              - dot: custom circle rendered for each data point; wired to setDataOnDotClick.
              - activeDot: slightly larger circle shown when the user hovers/activates a point; also wired to click.
              Both dot and activeDot use the optional chaining (?.) on setDataOnDotClick to safely handle
              cases where no click handler is provided (e.g., the business-unit accordion chart).
          */}
          <Line
            type="monotone"                             // Smooth curve connecting data points
            dataKey="unrefreshed_count"                 // Y-axis value bound to this field in each data point
            stroke={tokens.colorPaletteRedBorder2}      // Red line color to signal unrefreshed/problem datasets
            strokeWidth={2}                             // Line thickness
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              // Standard dot rendered at each data point on the line.
              // onClick fires setDataOnDotClick with the full payload so the parent can open a detail view.
              // Example: clicking the dot for "2025-11-05" passes { date: "2025-11-05", unrefreshed_count: 12, ... }
              return (
                <circle
                  key={`dot-${payload.date}`}             // Unique key per dot to prevent React reconciliation issues
                  cx={cx}                                 // X coordinate calculated by Recharts
                  cy={cy}                                 // Y coordinate calculated by Recharts
                  r={5}                                   // Dot radius in pixels
                  fill={tokens.colorPaletteRedBorder2}    // Dot fill color matching the line color
                  stroke="white"                          // White stroke creates a clear ring around the dot
                  strokeWidth={1}                         // Thin stroke for subtle visual separation
                  style={{ cursor: "pointer" }}           // Pointer cursor signals interactivity to the user
                  onClick={() => setDataOnDotClick?.(payload)} // Optional click handler — passes full data point payload to parent
                />
              );
            }}
            activeDot={(props: any) => {
              const { cx, cy, payload } = props;
              // Active (hovered) dot — slightly larger than the standard dot to provide visual feedback.
              // Also wired to click so users can click while hovering and still trigger the drill-down.
              return (
                <circle
                  key={`active-dot-${payload.date}`}      // Unique key for the active dot
                  cx={cx}                                  // X coordinate calculated by Recharts
                  cy={cy}                                  // Y coordinate calculated by Recharts
                  r={7}                                    // Larger radius for the active/hover state
                  fill={tokens.colorPaletteRedBorder2}    // Same fill color as the standard dot and line
                  stroke="white"                          // White stroke for visual separation
                  strokeWidth={2}                         // Slightly thicker stroke on hover for emphasis
                  style={{ cursor: "pointer" }}           // Pointer cursor signals interactivity to the user
                  onClick={() => setDataOnDotClick?.(payload)} // Optional click handler — passes full data point payload to parent
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}