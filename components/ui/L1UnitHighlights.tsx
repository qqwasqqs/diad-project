/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script defines the `L1UnitHighlights` component for rendering a set of summary cards on the Teva Data Integrity Dashboard.
    - It displays various high-level statistics for Level 1 Business Units (L1), such as total datasets, verified datasets, etc.
    - The component includes interactive cards with icons, counts, percentages, and optional hoverable info tooltips.
    - Each card can be clickable, depending on the presence of an `onClick` handler.
    - The cards are color-coded to represent different states (success, error, brand).
    - It uses Fluent UI's `Card`, `Badge`, `Tooltip`, and icons for visual components.
*/

//---------------------- Imports and Types -------------------------//

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Badge, // Badge component to display counts and labels
  Card, // Card component for the individual summary card layout
  makeStyles, // Fluent UI hook for custom styles
  mergeClasses, // Utility to merge multiple class names conditionally
  tokens, // Fluent UI tokens for consistent styling
  Text, // Fluent UI Text component for typography
  Tooltip, // Tooltip component for displaying additional info
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
    - What it is: A package of Fluent UI SVG icons packaged as React
      components (Checkmark, Error, Info, etc.).
    - Why used: The icons visually explain card meaning (success, error,
      edit) making the UI faster to scan for users.
*/
import {
  CheckmarkCircle20Filled, // Icon representing success
  Database20Filled, // Icon representing database or datasets
  Edit20Filled, // Icon representing editable items
  ErrorCircle20Filled, // Icon representing error
  Info16Regular, // Icon for additional information
} from "@fluentui/react-icons";

import { FC } from "react"; // Importing FC type for functional component typing

//---------------------- Styles -------------------------//

/**
 * `useStyles` hook
 *
 * This hook defines custom styles using Fluent UI's `makeStyles`. It is used to style the layout of the summary cards,
 * including how the cards are displayed, how their borders and background colors change on hover, and the badge styles.
 *
 * @returns Object - Contains styles for various elements including cards, badges, and layout
 */
const useStyles = makeStyles({
  root: {
    display: "grid", // Use CSS grid to arrange cards horizontally
    gridTemplateColumns: "repeat(4, 1fr)", // Forces exactly 4 columns for card layout
    gap: tokens.spacingHorizontalL, // Horizontal gap between cards
    marginTop: tokens.spacingVerticalXL, // Vertical margin at the top
  },
  card: {
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalS}`, // Padding inside each card
    borderRadius: tokens.borderRadiusLarge, // Rounded corners for the card
    backgroundColor: tokens.colorNeutralBackground3, // Card background color
    boxShadow: tokens.shadow4, // Card shadow for depth effect
    display: "flex",
    flexDirection: "column", // Align content vertically within the card
    alignItems: "center", // Center the content horizontally
    justifyContent: "center", // Center content vertically
    textAlign: "center", // Center text inside the card
  },
  cardSuccess: {
    borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}`, // Green border for success cards
    color: tokens.colorPaletteGreenBorder2, // Green color for text and icon
    ":hover": {
      color: tokens.colorPaletteGreenBorder2, // Hover effect for success card
    },
  },
  cardError: {
    borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}`, // Red border for error cards
    color: tokens.colorPaletteRedBorder2, // Red color for text and icon
    ":hover": {
      color: tokens.colorPaletteRedBorder2, // Hover effect for error card
    },
  },
  cardBrand: {
    borderLeft: `4px solid ${tokens.colorNeutralForeground2}`, // Brand-colored border
    color: tokens.colorNeutralForeground2, // Neutral color for brand cards
    ":hover": {
      color: tokens.colorNeutralForeground2, // Hover effect for brand card
    },
  },
  titleRow: {
    display: "flex",
    alignItems: "center", // Align title and icon horizontally
    gap: tokens.spacingHorizontalXS, // Small gap between title and icon
  },
  badgeSuccess: {
    backgroundColor: tokens.colorPaletteGreenBorder2, // Green background for success badge
  },
  badgeError: {
    backgroundColor: tokens.colorPaletteRedBorder2, // Red background for error badge
  },
  badgeBrand: {
    backgroundColor: tokens.colorNeutralForeground2, // Brand background for neutral badge
  },
  cardClickable: {
    cursor: "pointer", // Change cursor to pointer on hover for clickable cards
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3Hover, // Hover effect for clickable cards
      boxShadow: tokens.shadow8, // Enhanced shadow on hover
    },
  },
});

//---------------------- Type Definitions -------------------------//

/**
 * `L1UnitHighlight` Interface
 *
 * Defines the structure of each summary card data object for Level 1 Business Units.
 * Each card contains a title, count, optional percentage, optional info text, and an optional click handler.
 */
interface L1UnitHighlight {
  title?: string; // Title of the card (optional)
  count: number; // The number that should be displayed on the card
  percentage?: string; // Percentage (optional), displayed alongside count
  info?: string; // Optional additional information displayed as a tooltip
  onClick?: () => void; // Optional click handler for interactive cards
}

/**
 * `L1UnitHighlightsProps` Interface
 *
 * Defines the props passed to the `L1UnitHighlights` component. It contains an array of `L1UnitHighlight` objects.
 */
interface L1UnitHighlightsProps {
  data: L1UnitHighlight[]; // Array of summary card data objects
  layout?: string;
}

//---------------------- Component -------------------------//

/**
 * `L1UnitHighlights` Component
 *
 * This component renders a set of summary cards for Level 1 Business Units. Each card displays statistics such as count and percentage,
 * with an optional hoverable tooltip for more information. Cards are color-coded based on their status (success, error, or brand).
 * Some cards may be clickable, which triggers a callback passed in the `onClick` handler.
 *
 * @param data - Array of `L1UnitHighlight` objects representing the summary cards to be rendered.
 *
 * @returns JSX.Element - The JSX markup to render the summary cards.
 */
export const L1UnitHighlights: FC<L1UnitHighlightsProps> = ({ data, layout }) => {
  const styles = useStyles(); // Custom styles hook

  let spacing = ""
  if(layout === "executiveDashboard"){
    spacing = "w-full h-full"
  }

  // Predefined icons and colors for each card
  const summaryCards = [
    {
      icon: <Database20Filled />, // Icon for the "Total Datasets" card
      color: "brand", // Default color for database-related cards
    },
    {
      icon: <Edit20Filled />, // Icon for the "Verified Datasets" card
      color: "brand", // Default color for editing-related cards
    },
    {
      icon: <CheckmarkCircle20Filled />, // Icon for the "Verified & Trusted" card
      color: "success", // Success color for verified datasets
    },
    {
      icon: <ErrorCircle20Filled />, // Icon for the "Datasets Needing Attention" card
      color: "error", // Error color for failing datasets
    },
  ];

  /**
   * `getCardClass` function
   *
   * This function determines the correct CSS classes to apply to each card based on its color and whether it's clickable.
   *
   * @param color - The color of the card (success, error, brand)
   * @param isClickable - Boolean indicating if the card is clickable
   *
   * @returns string - The class names to be applied to the card
   */
  const getCardClass = (color: string, isClickable: boolean) =>
    mergeClasses(
      styles.card, // Base card styles
      isClickable && styles.cardClickable, // Apply clickable styles if card is clickable
      color === "success" && styles.cardSuccess, // Success card styles
      color === "error" && styles.cardError, // Error card styles
      color === "brand" && styles.cardBrand // Brand card styles
    );

  /**
   * `badgeClass` function
   *
   * This function determines the correct class for the badge based on the card color.
   *
   * @param color - The color of the card (success, error, brand)
   *
   * @returns string - The class name for the badge
   */
  const badgeClass = (color: string) =>
    color === "success"
      ? styles.badgeSuccess // Green badge for success
      : color === "error"
      ? styles.badgeError // Red badge for error
      : styles.badgeBrand; // Neutral badge for brand

  return (
    // Container grid for highlight cards - arranges each highlight card in a grid
    <div className={styles.root + spacing}>
      {summaryCards.map((card, index) => {
        const item = data[index]; // Get corresponding data for each card
        const isClickable = !!item?.onClick; // Check if the card is clickable

        return (
          // Card wrapper for a single highlight item
          <Card
            // React list key: unique identifier for this card in the list
            key={index}
            // Combined CSS classes: base card, color accent, clickable state, and size
            className={getCardClass(card.color, isClickable)} // Apply dynamic styles based on the card color and clickability
            onClick={isClickable ? item.onClick : undefined} // Add click handler if defined
          >
            <Badge
              // Visual style: 'filled' makes the badge a solid block for emphasis
              appearance="filled"
              // Badge background class selects color based on the card type (success/error/brand)
              className={badgeClass(card.color)} // Apply badge styles
              // Size: 'extra-large' makes the numeric badge big and easy to read
              size="extra-large"
              // Icon displayed inside the badge to quickly communicate meaning
              icon={card.icon}
            >
              {/* Formatted value: shows the count with commas and an optional percentage in parentheses, or an em-dash when missing */}
              {item
                ? `${item.count?.toLocaleString()}${
                    item.percentage ? " (" + item.percentage + ")" : ""
                  }`
                : "–"}
            </Badge>

            {/* Display title and info if available */}
            {(item.title || item.info) && (
              <div className={styles.titleRow}>
                {/* Title label shown below the badge, if provided */}
                {item.title && (
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
