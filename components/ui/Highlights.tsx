/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the Highlights component used in the
    Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Displays summary highlight cards with counts and optional percentages.
    - Supports multiple visual layouts (executive dashboard vs standard).
    - Uses color-coded cards to represent success, error, and neutral states.
    - Optionally supports clickable cards for navigation or drill-down actions.
    - Enhances usability with tooltips for additional context.

  Typical Usage Example:
    <Highlights
      layout="executiveDashboard"
      data={[
        { title: "Updated", count: 120, percentage: "80%" },
        { title: "Successful", count: 100 },
        { title: "Failed", count: 20, info: "Requires investigation" }
      ]}
    />
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Badge, // Small visual element for displaying counts
  Card, // Container component for each highlight item
  makeStyles, // Styling hook for defining component-specific styles
  mergeClasses, // Utility for combining multiple CSS classes
  tokens, // Design tokens for consistent spacing, colors, etc.
  Text, // Text component for rendering titles
  Tooltip, // Component for showing additional info on hover
} from "@fluentui/react-components"; // Fluent UI components and styling helpers

/*
  @fluentui/react-icons
    - What it is: A package of Fluent UI SVG icons packaged as React
      components (Checkmark, Error, Info, etc.).
    - Why used: The icons visually explain card meaning (success, error,
      edit) making the UI faster to scan for users.
*/
import {
  CheckmarkCircle20Filled, // Icon indicating success state
  Edit20Filled, // Icon indicating edit/update action
  ErrorCircle20Filled, // Icon indicating error state
  Info16Regular, // Icon for displaying additional information
} from "@fluentui/react-icons"; // Icons used for visual indicators
/*
  react (FC)
    - What it is: The core React library. `FC` is a TypeScript type for
      functional components.
    - Why used: Provides the typing and runtime needed for the component.
*/
import { FC } from "react"; // React functional component type

//---------------------- Styles -------------------------//

/**
 * useHighlightStyles
 *
 * Centralized Fluent UI styles for the Highlights component.
 * Defines layout, spacing, colors, hover states, and visual hierarchy.
 */
const useHighlightStyles = makeStyles({
  // Root grid container holding all highlight cards
  root: {
    display: "grid", // Use CSS grid to arrange cards horizontally
    gridTemplateColumns: "repeat(3, 1fr)", // Three equal-width columns by default
    gap: tokens.spacingHorizontalL, // Space between grid items
    marginTop: tokens.spacingVerticalXL, // Space above the group of cards
    width: "100%", // Make the grid full-width of its container
    height: "90%", // Give the grid most of the parent's height
  },
  // Base card styling shared across all variants
  card: {
    padding: tokens.spacingVerticalL, // Inner padding for content
    borderRadius: tokens.borderRadiusLarge, // Rounded corners
    backgroundColor: tokens.colorNeutralBackground3, // Subtle background color
    boxShadow: tokens.shadow4, // Slight elevation effect
    display: "flex", // Use flexbox to center content within the card
    flexDirection: "column", // Stack elements vertically (badge on top, title below)
    alignItems: "center", // Center horizontally
    justifyContent: "center", // Center vertically
    textAlign: "center", // Center text inside
    width: "100%", // Fill available column width
    height: "100%", // Fill available row height
  },
  // Larger card variant (used in executive dashboard)
  cardLarge: {
    padding: tokens.spacingVerticalXXXL, // Extra padding for executive layout
    minHeight: "140px", // Ensure large cards have a minimum height
  },
  // Normal card variant (default layout)
  cardNormal: {
    padding: tokens.spacingVerticalL, // Standard padding for normal cards
    minHeight: "100px", // Standard minimum height
  },
  // Left-border and color for success state
  cardSuccess: {
    borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}`, // Green accent for success
    color: tokens.colorPaletteGreenBorder2, // Use green color for text/icon accent
    ":hover": {
      color: tokens.colorPaletteGreenBorder2, // Keep accent color on hover
    },
  },
  // Left-border and color for error state
  cardError: {
    borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}`, // Red accent for errors
    color: tokens.colorPaletteRedBorder2, // Use red color for text/icon accent
    ":hover": {
      color: tokens.colorPaletteRedBorder2, // Keep accent color on hover
    },
  },
  // Neutral / brand card styling
  cardBrand: {
    borderLeft: `4px solid ${tokens.colorNeutralForeground2}`, // Neutral/brand accent
    color: tokens.colorNeutralForeground2, // Use brand color for text/icon accent
    ":hover": {
      color: tokens.colorNeutralForeground2, // Keep accent color on hover
    },
  },
  // Row containing title text and optional info icon
  titleRow: {
    display: "flex", // Row layout for title and optional icon
    alignItems: "center", // Vertically center title and icon
    gap: tokens.spacingHorizontalXS, // Small gap between title and icon
  },
  // Badge background colors
  badgeSuccess: {
    backgroundColor: tokens.colorPaletteGreenBorder2, // Badge color for success
  },
  badgeError: {
    backgroundColor: tokens.colorPaletteRedBorder2, // Badge color for error
  },
  badgeBrand: {
    backgroundColor: tokens.colorNeutralForeground2, // Badge color for neutral/brand
  },
  // Hover styles for clickable cards
  cardClickable: {
    cursor: "pointer", // Show pointer when card is clickable
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3Hover, // Slightly different bg on hover
      boxShadow: tokens.shadow8, // Stronger shadow on hover to indicate interactivity
    },
  },
});

//---------------------- Types -------------------------//

/**
 * HighlightItem
 *
 * Represents a single highlight card configuration.
 */
interface HighlightItem {
  title?: string; // Optional card title displayed below the badge
  count: number; // Primary numeric value displayed in the badge
  percentage?: string; // Optional percentage value appended to count
  info?: string; // Optional tooltip text for additional context
  icon?: any; // Optional Fluent UI icon component to display alongside the badge.
  color?: "brand" | "success" | "error"; // Optional semantic badge color: "brand" (default theme), "success" (positive state), "error" (negative state)
  onClick?: () => void; // Optional click handler for drill-down/navigation
}

/**
 * HighlightsProps
 *
 * Props accepted by the Highlights component.
 */
interface HighlightsProps {
  data: HighlightItem[]; // Array of highlight items to be rendered
  layout?: "executiveDashboard" | "vertical"; // Determines card sizing/layout
}

//---------------------- Component -------------------------//

/**
 * Highlights Component
 *
 * Renders a set of visually distinct summary cards used to
 * highlight key metrics in the dashboard.
 *
 * Why this component is needed:
 * - Provides at-a-glance visibility of key KPIs.
 * - Standardizes summary UI across multiple dashboard pages.
 * - Supports interactivity for deeper navigation when needed.
 *
 * @param data - Array of highlight configurations
 * @param layout - Determines visual density of cards
 *
 * Sample Input:
 *  data = [{ title: "Success", count: 100 }]
 *  layout = "executiveDashboard"
 *
 * Sample Output:
 *  A large success card displaying "100 Success"
 */
export const Highlights: FC<HighlightsProps> = ({
  data,
  layout = "vertical", // Default to standard layout
}) => {
  // Initialize component styles
  const styles = useHighlightStyles();

  // Determines whether cards should render in large size
  const isExecutiveLayout = layout === "executiveDashboard";

  // Predefined icon and color mapping for each card position
  const summaryCardConfig = [
    { icon: <Edit20Filled />, color: "brand" },
    { icon: <CheckmarkCircle20Filled />, color: "success" },
    { icon: <ErrorCircle20Filled />, color: "error" },
  ] as const;

  /**
   * Resolves card container classes based on color and clickability.
   */
  const getCardClasses = (color: string, clickable: boolean) =>
    mergeClasses(
      styles.card,
      clickable && styles.cardClickable,
      color === "success" && styles.cardSuccess,
      color === "error" && styles.cardError,
      color === "brand" && styles.cardBrand
    );

  /**
   * Resolves badge background class based on card color.
   */
  const getBadgeClass = (color: string) =>
    color === "success"
      ? styles.badgeSuccess
      : color === "error"
        ? styles.badgeError
        : styles.badgeBrand;

  return (
    // Container grid for highlight cards - arranges each highlight card in a grid
    <div className={styles.root}>
      {summaryCardConfig.map((config, index) => {
        // Current highlight item data
        const item = data[index];
        // Determine if the card should be clickable based on presence of onClick handler
        const isClickable = Boolean(item?.onClick);

        return (
          // Card wrapper for a single highlight item
          <Card
            // React list key: unique identifier for this card in the list
            key={index}
            // Combined CSS classes: base card, color accent, clickable state, and size
            className={mergeClasses(
              getCardClasses(item?.color ?? config.color, isClickable),
              isExecutiveLayout ? styles.cardLarge : styles.cardNormal
            )}
            // onClick handler: only attached when the item provides an onClick function (makes the card interactive)
            onClick={isClickable ? item.onClick : undefined}
          >
            {/* Badge: large visual element displaying the numeric count (and optional percentage) */}
            <Badge
              // Visual style: 'filled' makes the badge a solid block for emphasis
              appearance="filled"
              // Badge background class selects color based on the card type (success/error/brand)
              // Falls back to `config.color` if `item.color` is not provided.
              className={getBadgeClass(item?.color ?? config.color)}
              // Size: 'extra-large' makes the numeric badge big and easy to read
              size="extra-large"
              // Icon displayed inside the badge to quickly communicate meaning. 
              // Falls back to `config.icon` if `item.icon` is not provided.
              icon={item?.icon ?? config.icon}
            >
              {/* Formatted value: shows the count with commas and an optional percentage in parentheses, or an em-dash when missing */}
              {item
                ? `${item.count?.toLocaleString()}${item?.percentage ? ` (${item.percentage})` : ""
                }`
                : "—"}
            </Badge>

            {/* Title row: optional short label under the badge and an info icon for extra context */}
            {(item?.title || item?.info) && (
              <div className={styles.titleRow}>
                {/* Title label shown below the badge, if provided */}
                {item?.title && (
                  <Text
                    /* Font size for the title label (300 is a Fluent UI token for small-medium size) */
                    size={300}
                    /* Font weight for emphasis; 'medium' makes the title stand out */
                    weight="medium"
                  >
                    {item.title}
                  </Text>
                )}

                {/* Tooltip icon: when hovered shows the `info` text for deeper explanation */}
                {item?.info && (
                  <Tooltip
                    /* The text to show in the tooltip when the user hovers or focuses the icon */
                    content={item.info}
                    /* Accessibility: indicates this tooltip provides a description */
                    relationship="description"
                    /* Adds a small arrow pointing from the tooltip to the icon for clarity */
                    withArrow
                  >
                    {/* Small info icon the user can hover to reveal the tooltip */}
                    <Info16Regular />
                  </Tooltip>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
