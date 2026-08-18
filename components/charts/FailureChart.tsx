/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the FailureChart component used in the
    Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Visualizes failed dataset counts using a bar chart.
    - Highlights failure severity using color-coded bars.
    - Provides interactive tooltips for detailed inspection.
    - Helps users quickly identify rules or categories
      with the highest number of data integrity failures.

    This component is used in analytical views where
    failure distribution and prioritization are required.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/* 
  recharts:
  - what it is: A composable charting library built on React components.  
  - why it's used: It provides a simple and flexible way to create various types of charts, 
    including bar charts, with built-in responsiveness and interactivity.
*/
import {
  BarChart, // The chart container for bar charts
  Bar, // The bar component to render the bars in the chart
  XAxis, // X-axis component for horizontal axis
  YAxis, // Y-axis component for vertical axis
  CartesianGrid, // Grid lines for better readability
  Tooltip, // Tooltip to show data on hover
  ResponsiveContainer, // Ensures that the chart is responsive and adjusts to screen size
  Cell, // Used for rendering each bar with custom colors
  LabelList, // Adds labels to the bars
} from "recharts"; // Recharts components used to build the bar chart visualization

/*
  @fluentui/react-components
    - What it is: Fluent UI's modern React component set (buttons, dialogs,
      dropdowns, fields) and styling helpers (`makeStyles`, `tokens`).
    - Why used: Provides accessible, themed UI building blocks used throughout the dashboard.
*/
import { Text, tokens } from "@fluentui/react-components";
// Fluent UI text component and design tokens for consistent styling

//---------------------- Types -------------------------//

/**
 * FailureChartDataPoint
 *
 * Represents a single bar in the failure chart.
 */
interface FailureChartDataPoint {
  x: string; // X-axis label (rule name or category)
  y: number; // Numeric value (failed dataset count)
  color?: string; // Optional bar color
}

/**
 * FailureChartProps
 *
 * Props required by the FailureChart component.
 */
interface FailureChartProps {
  points: FailureChartDataPoint[]; // Data points to render in the chart
  yAxisTitle?: string; // Optional Y-axis label
  xAxisTitle?: string; // Optional X-axis label
}

//---------------------- Tooltip Component -------------------------//

/**
 * CustomFailureTooltip
 *
 * Renders a styled tooltip when hovering over a bar.
 *
 * Why this is needed:
 * - Displays readable, contextual information on hover.
 * - Maintains visual consistency with Fluent UI styling.
 *
 * Sample Input:
 *  payload = [{ payload: { category: "Timeliness", count: 12, fill: "#d13438" }}]
 *
 * Sample Output:
 *  Tooltip displaying:
 *    Timeliness : 12
 */
const CustomFailureTooltip = ({ active, payload }: any) => {
  // Do not render tooltip if inactive or data is missing
  if (!active || !payload || !payload[0]) return null;

  // Extract values from the hovered bar payload
  const { category, count, fill } = payload[0].payload;

  return (
    // Styled tooltip container
    <div
      className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
      style={{ minWidth: 160 }}
    >
      {/* Category label */}
      <div
        className="flex gap-1 justify-between items-center"
        style={{ color: fill }}
      >
        {/* Category label */}
        <Text weight="medium">{category}:</Text>

        {/* Failure count */}
        <Text weight="bold">{count}</Text>
      </div>
    </div>
  );
};

//---------------------- Main Component -------------------------//

/**
 * FailureChart Component
 *
 * Displays a bar chart representing failed dataset counts.
 *
 * Why this component is needed:
 * - Provides a visual breakdown of data integrity failures.
 * - Helps identify high-risk rules or categories.
 * - Enables prioritization of remediation efforts.
 *
 * Sample Input:
 *  points = [
 *    { x: "Timeliness Check", y: 15, color: "#d13438" },
 *    { x: "Uniqueness Check", y: 6, color: "#ca5010" }
 *  ]
 *
 * Sample Output:
 *  - Bar chart sorted by failure count (descending)
 *  - Colored bars with labels and tooltips
 */
export const FailureChart = ({
  points, // Raw data points passed from parent component
  yAxisTitle = "Failed Datasets Count", // Default Y-axis label
  xAxisTitle = "Rule Category", // Default X-axis label
}: FailureChartProps) => {
  //---------------------- Data Preparation -------------------------//

  /**
   * Transform input points into Recharts-compatible format
   * and sort them by failure count in descending order.
   */
  const chartData = points
    .map((point) => ({
      category: point.x, // X-axis category
      count: point.y, // Y-axis value
      fill: point.color, // Bar color
    }))
    .sort((a, b) => b.count - a.count); // Sort by highest failures first

  //---------------------- Render -------------------------//

  return (
    <div className="bg-neutral-background-3 mt-3 h-100 w-full border border-neutral-background-3 rounded-lg shadow-md">
      {/* Responsive wrapper ensures chart scales with container */}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData} // Data for the bar chart
          margin={{ top: 50, right: 24, left: 24, bottom: 50 }} // Chart margins
        >
          {/* Background grid for visual clarity */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {/* ---------------- X Axis ---------------- */}
          <XAxis
            dataKey="category" // X-axis data key
            tick={({ x, y, payload }) => {
              // Match label color to its bar color
              const barColor = chartData.find(
                (d) => d.category === payload.value
              )?.fill;

              return (
                // Render X-axis label with custom color
                <text
                  x={x} // X position of the label
                  y={+y + 10} // Y position of the label (slightly below the axis)
                  textAnchor="middle" // Center align the text
                  fill={barColor || "#374151"} // Use bar color or default gray
                  fontSize={14} // Font size for readability
                >
                  {payload.value}
                </text>
              );
            }}
            label={{
              value: xAxisTitle, // X-axis title
              position: "insideBottom", // Position below the axis
              offset: -20, // Offset to avoid overlap
              style: {
                fill: tokens.colorNeutralForeground1, // Use Fluent UI token for color
                fontSize: 16, // Font size for title
              },
            }}
          />

          {/* ---------------- Y Axis ---------------- */}
          <YAxis
            tick={{
              fill: tokens.colorNeutralForeground1, // Use Fluent UI token for tick color
              fontSize: 16, // Font size for tick labels
            }}
            label={{
              value: yAxisTitle, // Y-axis title
              angle: -90, // Rotate title vertically
              dy: 60, // Vertical offset
              position: "insideLeft", // Position inside the left of the axis
              style: {
                fill: tokens.colorNeutralForeground1, // Use Fluent UI token for color
                fontSize: 16, // Font size for title
              },
            }}
          />

          {/* ---------------- Tooltip ---------------- */}
          <Tooltip
            content={<CustomFailureTooltip />} // Custom tooltip component
            cursor={{ fill: "transparent" }} // Transparent cursor to avoid highlighting bars
          />

          {/* ---------------- Bars ---------------- */}
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={200}>
            {/* Apply color to each bar */}
            {chartData.map((entry, index) => (
              // Render each bar with its specified color
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}

            {/* Display value labels above bars */}
            <LabelList
              dataKey="count" // Use the "count" value for labels
              position="top" // Position labels above the bars
              content={(props: any) => {
                // Custom label renderer to match bar color and style
                const { x, y, width, value, index } = props;
                // Get the color of the corresponding bar
                const barColor = chartData[index]?.fill || "#000";

                // Hide label if value is zero or undefined
                if (!value || value === 0) return null;

                return (
                  // Render the label text above the bar
                  <text
                    x={x + width / 2} // Center the label horizontally above the bar
                    y={y - 6} // Position the label slightly above the bar
                    fill={barColor} // Match label color to bar color
                    fontSize={14} // Font size for readability
                    fontWeight="bold" // Bold font for emphasis
                    textAnchor="middle" // Center align the text
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
