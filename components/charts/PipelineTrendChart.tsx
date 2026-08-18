/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 December 2025

  Purpose of the script:
    This script defines the PipelineTrendChart React component used within pipeline dashboards.

  Responsibilities:
    - Renders a responsive Recharts line chart for pipeline duration trends over time.
    - Uses Fluent UI tokens for consistent theming (colors, spacing, shadows).
    - Provides a custom Fluent UI–styled tooltip for richer hover details.
    - Colors data points (dot + activeDot) based on pipeline run status.
    - Supports a configurable trend window (last N data points).
*/ // File header comment: communicates ownership, intent, and responsibilities for maintainability.

/* --------------------------------------------------------------------- */
/* CLIENT DIRECTIVE                                                      */
/* --------------------------------------------------------------------- */

"use client"; // Ensures this component runs on the client (browser) so hooks/DOM-dependent chart rendering works in Next.js App Router.

/* --------------------------------------------------------------------- */
/* IMPORTS                                                               */
/* --------------------------------------------------------------------- */

import {
  LineChart, // Recharts container component that defines a line chart plotting area.
  Line, // Recharts series component that draws the line using a chosen dataKey.
  XAxis, // Recharts X-axis component to render horizontal axis and its ticks/labels.
  YAxis, // Recharts Y-axis component to render vertical axis and its ticks/labels.
  CartesianGrid, // Recharts background grid component to improve readability of values.
  Tooltip, // Recharts tooltip component to show hover details for the active point.
  ResponsiveContainer, // Recharts wrapper that makes the chart adapt to parent container size.
} from "recharts"; // Recharts library: declarative chart components for React.

import {
  tokens, // Fluent UI design tokens used for consistent theme-driven values (colors, shadows, typography).
  Subtitle2, // Fluent UI text component for a slightly emphasized subtitle heading.
  Text, // Fluent UI text component for consistent typography in tooltip content.
  makeStyles, // Fluent UI styling helper to create scoped CSS-in-JS classes.
} from "@fluentui/react-components"; // Fluent UI component library used for styling and tooltip UI.

// Shared helper to format timestamps into human-readable strings
// - What it does: converts raw timestamp values to friendly date/time text.
// - Why used here: to display the "Start Time" column in readable format.
import { formatDateTime } from "@/lib/helper"; // Helper function to format timestamps into readable date-time strings.

/*  
  @/types/api
    - What it is: TypeScript interfaces/types describing the shape of API responses.
    - Why used: Ensures functions return typed data, improving IDE help and preventing type errors.
*/
import { PipelineTrendSchema } from "@/types/api"; // Type definition describing the shape of each pipeline trend data point.

/* --------------------------------------------------------------------- */
/* STYLES                                                                */
/* --------------------------------------------------------------------- */

const useStyles = makeStyles({
  tooltipContainer: {
    backgroundColor: tokens.colorNeutralBackground1, // Tooltip background color aligned with the app theme.
    borderRadius: tokens.borderRadiusMedium, // Rounded corners for a modern card-like tooltip.
    boxShadow: tokens.shadow16, // Shadow token to lift tooltip above chart visually.
    padding: "12px 16px", // Inner spacing to keep tooltip content readable.
    minWidth: "220px", // Minimum tooltip width to avoid cramped content.
    maxWidth: "320px", // Maximum tooltip width to prevent overly wide tooltip blocks.
  },
  header: {
    marginBottom: "8px", // Space below the tooltip header date/time line.
  },
  label: {
    color: tokens.colorNeutralForeground2, // Muted label color to distinguish label vs value.
    marginRight: "4px", // Small spacing between label text and value text.
  },
  value: {
    fontWeight: tokens.fontWeightSemibold, // Emphasizes key metric values (like duration).
  },
  statusSuccess: {
    color: tokens.colorPaletteGreenForeground1, // Green text for "Succeeded" status.
  },
  statusFailed: {
    color: tokens.colorPaletteRedForeground1, // Red text for failure or non-success status.
  },
}); // useStyles closes: provides reusable class names inside components.

/* --------------------------------------------------------------------- */
/* CUSTOM TOOLTIP COMPONENT                                              */
/* --------------------------------------------------------------------- */

export const CustomFluentTooltip = ({
  active, // Provided by Recharts Tooltip: true when tooltip should be visible.
  payload, // Provided by Recharts Tooltip: array of series data at hovered point.
  label, // Provided by Recharts Tooltip: x-axis label value for hovered point (here typically "start").
}: any) => {
  const styles = useStyles(); // Instantiates Fluent UI styles for tooltip UI.

  if (!active || !payload || payload.length === 0) {
    // If tooltip isn't active OR payload doesn't exist OR payload is empty, render nothing to avoid errors.
    return null; // Returning null prevents tooltip from showing and prevents invalid access to payload[0].
  }

  // Because you only have one line → usually payload[0]
  const data = payload[0]; // Extracts the first (and only) series data item for the hovered point.
  const value = data.value as number; // Pulls the numeric Y-value (duration) for display.
  const status = data.payload?.status ?? "Unknown"; // Reads status from the underlying data payload with fallback.
  const startTime = data.payload?.start; // Reads optional "start" timestamp (used for Started display).

  const statusClass =
    status === "Succeeded" // Checks whether the pipeline run succeeded.
      ? styles.statusSuccess // Uses green class for succeeded.
      : styles.statusFailed; // Uses red class for failed/other statuses.

  return (
    <div className={styles.tooltipContainer}>
      {/* Outer tooltip container styled using Fluent UI tokens for consistent theme look. */}

      <Subtitle2 className={styles.header}>
        {/* Tooltip header shows the formatted x-axis label (usually start time). */}
        {formatDateTime(label as string)}
        {/* Converts raw label to a user-friendly date/time string. */}
      </Subtitle2>

      <div className="mt-2.5 flex flex-col gap-1.5">
        {/* Column layout for tooltip rows with spacing between each row. */}

        <div>
          {/* Row 1: Duration */}
          <Text size={200} className={styles.label}>
            {/* Label for duration value */}
            Duration:
            {/* Static label text */}
          </Text>
          <Text size={200} className={styles.value}>
            {/* Value for duration, styled bolder */}
            {value} min
            {/* Displays duration number and appends minutes unit */}
          </Text>
        </div>

        <div>
          {/* Row 2: Status */}
          <Text size={200} className={styles.label}>
            {/* Label for status value */}
            Status:
            {/* Static label text */}
          </Text>
          <Text size={200} className={statusClass}>
            {/* Status value styled by success/failure class */}
            {status}
            {/* Displays "Succeeded"/"Failed"/etc. */}
          </Text>
        </div>

        {startTime && (
          // Conditional Row 3: Started time displayed only if a startTime exists in the payload.
          <div>
            {/* Row container for started time */}
            <Text size={200} className={styles.label}>
              {/* Label for started time */}
              Started:
              {/* Static label text */}
            </Text>
            <Text size={200}>
              {/* Started time value */}
              {formatDateTime(startTime)}
              {/* Formats the startTime timestamp for display */}
            </Text>
          </div>
        )}
      </div>
    </div>
  ); // Tooltip JSX closes.
}; // CustomFluentTooltip component closes.

/* --------------------------------------------------------------------- */
/* PROPS TYPE                                                            */
/* --------------------------------------------------------------------- */

interface PipelineTrendChartProps {
  data: PipelineTrendSchema[]; // Array of pipeline trend points (must include fields used by chart like start/duration/status).
  trendWindow: number; // Controls how many most recent points are shown (slice last N).
} // PipelineTrendChartProps interface closes.

/* --------------------------------------------------------------------- */
/* MAIN CHART COMPONENT                                                  */
/* --------------------------------------------------------------------- */

export default function PipelineTrendChart({
  data, // Incoming full dataset of trend points.
  trendWindow, // Number of most recent points to plot on the chart.
}: PipelineTrendChartProps) {
  const filteredData = data.slice(-trendWindow); // Keeps only the last N points (trend window) while preserving order.

  // Custom dot renderer to color based on status
  const customDot = (props: any) => {
    // Recharts calls this for each point to render a custom SVG dot.
    const { cx, cy, payload } = props; // Extracts coordinates and the full data payload for the point.
    const status = payload?.status || ""; // Reads status with empty fallback to avoid undefined checks.

    const strokeColor =
      status === "Succeeded" // If the run succeeded...
        ? tokens.colorPaletteGreenBorder2 // Use green token for the dot border.
        : tokens.colorPaletteRedBorder2; // Otherwise use red token (failed/other).

    return (
      <circle
        key={cx + cy} // Key uses coordinates to keep React rendering stable across updates.
        cx={cx} // X position of dot on chart coordinate system.
        cy={cy} // Y position of dot on chart coordinate system.
        r={5} // Radius of dot circle.
        strokeWidth={2} // Thickness of dot border stroke.
        stroke={strokeColor} // Border color derived from status.
        fill="#fff" // White fill to create an outlined dot style.
      />
    ); // SVG dot closes.
  }; // customDot closes.

  // Custom active dot (on hover) - keeps the correct color (especially red for failed)
  const customActiveDot = (props: any) => {
    // Recharts calls this when a point is active/hovered.
    const { cx, cy, payload } = props; // Extracts active dot coordinates and payload.
    const status = payload?.status || ""; // Reads status to keep hover color consistent.

    const strokeColor =
      status === "Succeeded" // If succeeded...
        ? tokens.colorPaletteGreenBorder2 // Green hover dot.
        : tokens.colorPaletteRedBorder2; // Red hover dot.

    // The parameters(props) of below circle tag from rechart package can't changed as it's provided by package only.
    return (
      <circle
        cx={cx} // X position remains identical to the data point.
        cy={cy} // Y position remains identical to the data point.
        r={6} // Slightly larger radius to indicate active state.
        strokeWidth={2} // Keeps border thickness consistent.
        stroke={strokeColor} // Border color derived from status.
        fill={strokeColor} // Filled dot on hover for stronger emphasis.
      />
    ); // Active SVG dot closes.
  }; // customActiveDot closes.

  return (
    <div className="bg-neutral-background-3 mt-3 h-100 w-full border border-neutral-background-3 rounded-lg shadow-md">
      {/* Outer container provides a card-like chart background/border/shadow. */}

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        {/* ResponsiveContainer ensures the chart scales to the container's available width/height. */}

        <LineChart
          data={filteredData} // Uses the sliced trend-window dataset.
          margin={{ top: 30, right: 20, left: 20, bottom: 40 }} // Adds padding so axis labels/ticks don’t overlap edges.
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* Dashed background grid improves readibility across x/y scale. */}

          <XAxis
            dataKey="start" // X values come from "start" timestamp field on each data point.
            domain={["auto", "auto"]} // Allows Recharts to compute x-domain automatically.
            tickFormatter={(start) => formatDateTime(start)} // Formats ticks as readable date/time.
            tick={{
              fill: tokens.colorNeutralForeground2, // Tick text color (secondary neutral).
              fontSize: 12, // Smaller tick font size for dense time labels.
              fontWeight: 500, // Medium weight for readability.
            }}
            label={{
              value: "Pipeline Run Datetime", // X-axis label text.
              position: "insideBottom", // Puts label inside chart area near bottom.
              offset: -20, // Moves label upward relative to the bottom.
              style: {
                fill: tokens.colorNeutralForeground1, // Label text uses stronger neutral for emphasis.
                fontSize: 16, // Larger font for axis label than ticks.
                fontWeight: 500, // Medium weight label.
              },
            }}
          />
          {/* XAxis closes. */}

          <YAxis
            tick={{
              fill: tokens.colorNeutralForeground1, // Y tick color for better visibility.
              fontSize: 12, // Tick font size consistent with X ticks.
              fontWeight: 500, // Medium weight tick text.
            }}
            label={{
              value: "Duration (min)", // Y-axis label text including unit.
              angle: -90, // Rotates label vertically.
              dx: -25, // Moves label left for better alignment.
              position: "middle", // Centers label along the Y axis.
              style: {
                fill: tokens.colorNeutralForeground1, // Label color for emphasis.
                fontSize: 16, // Larger than tick font size.
                fontWeight: 500, // Medium weight.
              },
            }}
          />
          {/* YAxis closes. */}

          <Tooltip
            content={<CustomFluentTooltip />} // Replaces default tooltip with Fluent UI styled tooltip component.
            cursor={{ fill: "transparent" }} // Makes hover cursor overlay invisible/transparent.
          />
          {/* Tooltip closes. */}

          <Line
            type="monotone" // Smooth line interpolation.
            dataKey="duration" // Y values come from "duration" field.
            stroke={tokens.colorNeutralForeground2} // Line stroke color.
            strokeWidth={2} // Line thickness.
            dot={customDot} // Uses status-colored outline dots.
            activeDot={customActiveDot} // Uses status-colored filled dot for hover/active state.
            // Now respects status color on hover
          />
          {/* Line series closes. */}
        </LineChart>
        {/* LineChart closes. */}
      </ResponsiveContainer>
      {/* ResponsiveContainer closes. */}
    </div>
  ); // JSX return closes.
} // PipelineTrendChart component closes.
