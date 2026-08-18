/*
  Project Name : Teva Data Integrity 
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script represents the `DonutChart` component for the Teva Data Integrity Automation Dashboard.
    - The component renders a responsive donut chart using the `recharts` library to display the percentage of failed rules by category.
    - It allows for dynamic rendering of data based on the points passed to it.
    - It calculates and displays percentages for each segment of the donut chart with customizable labels, tooltips, and legend.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/* 
  recharts:
  - what it is: A composable charting library built on React components.
  - why it's used: It provides a simple and flexible way to create various types of charts, 
    including pie and donut charts, with built-in responsiveness and interactivity.
*/
import {
  PieChart, // The chart container for pie-based charts
  Pie, // The pie component to render the donut chart slices
  Cell, // Used for rendering each slice of the pie with custom colors
  ResponsiveContainer, // Ensures that the chart is responsive and adjusts to screen size
  Legend, // Displays a legend for the chart
  Tooltip, // Tooltip to show data on hover
  LabelList, // Adds labels inside the pie chart slices
} from "recharts"; // Recharts library for rendering charts

import {
  Text
} from "@fluentui/react-components"

//---------------------- Type Definitions -------------------------//

/**
 * DonutChartProps Interface
 * Defines the expected structure of the `points` prop that will be passed to the DonutChart component.
 * The `points` array represents the segments of the donut chart, where each item contains:
 * - `name`: The label for the segment.
 * - `value`: The value representing the percentage of the segment.
 * - `color` (optional): Custom color for the segment.
 */
interface DonutChartProps {
  points: { name: string; value: number; color?: string }[]; // Array of points that define the chart segments
}

//---------------------- DonutChart Component -------------------------//

/**
 * DonutChart Component
 * This component renders a responsive donut chart that displays the data passed to it in the `points` prop.
 * Each segment of the donut represents a category, with its size proportional to the percentage value.
 * 
 * @param points - An array of objects that define the data for the chart.
 *   Each object contains:
 *     - `name`: Name of the category (e.g., "Data Drift")
 *     - `value`: Percentage of the category
 *     - `color` (optional): Custom color for the segment.
 * 
 * @returns JSX.Element - A ResponsiveContainer containing the pie chart with configured segments, tooltips, labels, and legend.
 * 
 * Example Input:
 * const points = [
 *   { name: 'Data Drift', value: 30, color: '#FF8042' },
 *   { name: 'Data Profiling', value: 50, color: '#00C49F' },
 *   { name: 'Metadata', value: 20, color: '#0088FE' }
 * ];
 * 
 * Example Output:
 * A donut chart with three segments, each representing the percentage of failed rules in different categories.
 */
export const DonutChart = ({ points }: DonutChartProps) => {
  // Calculate the total value of all segments to check if values are present or not
  const total = points.reduce((sum, point) => sum + point.value, 0); // Sum up all the values

  // if no data is present then show the message on UI
  if(total===0){
    return (
      <div className="flex items-center justify-center w-full h-full">
      <Text className="text-neutral-foreground-2">No Failed Rules Found</Text>
      </div>
    )
  }
  
  return (
    <ResponsiveContainer width="100%" height={180}>
    {/* Make the chart responsive to the screen size, with a fixed height of 180px */}
      <PieChart>
        {/* Pie component to render the donut chart */}
        <Pie
          data={points} // The points passed into the component, which define the segments
          cx="50%" // Position the center of the pie chart at 50% of the container's width
          cy="50%" // Position the center of the pie chart at 50% of the container's height
          innerRadius={40} // Defines the inner radius to create a "donut" effect
          outerRadius={90} // Defines the outer radius of the pie chart
          paddingAngle={2} // Adds space between pie segments
          dataKey="value" // Use the "value" field from each point as the data for the pie chart
        >
          {/* Loop through each point and create a pie segment for each one */}
          {points.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} /> // Set custom color for each segment (if provided)
          ))}
          
          {/* Display label inside each segment */}
          <LabelList
            dataKey="value" // Display the "value" of each point
            position="inside" // Place the label inside the segment
            formatter={(label: React.ReactNode) => `${Number(label)}%`} // Format the label as a percentage
            style={{
              fontSize: 14, // Set font size for the label
              fontWeight: 500, // Set font weight for the label
              fill: "#fff", // Set font color to white for contrast
            }}
          />
        </Pie>

        {/* Tooltip for displaying value when hovering over a segment */}
        <Tooltip formatter={(value) => `${value}%`} />

        {/* Legend for displaying labels of the segments on the right side */}
        <Legend
          layout="vertical" // Vertical layout for the legend
          verticalAlign="middle" // Align the legend vertically in the middle
          align="right" // Align the legend on the right side of the chart
          formatter={(value) => <span className="text-xs">{value}</span>} // Format the legend labels to be smaller
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
