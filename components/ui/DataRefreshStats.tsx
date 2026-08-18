/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This component displays the data refresh statistics for the Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Shows the number of datasets successfully refreshed.
    - Highlights datasets needing attention.
    - Optionally displays total datasets and last update timestamp.
    - Calculates the refresh success rate dynamically.
    - Uses Fluent UI cards and badges for consistent styling and clear UX.

  Usage Example:
    <DataRefreshStats
      refreshed={120}
      unrefreshed={30}
      total={150}
      lastUpdate="12/27/2025 10:30 AM"
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
  makeStyles,
  tokens,
  Card,
  Text,
  Badge,
  mergeClasses,
} from "@fluentui/react-components";

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useStatsCardStyles
 *
 * Defines Fluent UI-based styling for the data refresh cards.
 * Includes hover effects, color coding, grid layout, and typography.
 */
const useStatsCardStyles = makeStyles({
  // Container for all three cards
  statsContainer: {
    display: "grid", // Use CSS grid to arrange cards horizontally
    gridTemplateColumns: "repeat(3, 1fr)", // Forces exactly 3 columns for card layout
    gap: tokens.spacingHorizontalL, // Space between grid items
    marginBottom: tokens.spacingVerticalXL, // Space below the group of cards
  },
  // Base card styling
  statusCard: {
    padding: tokens.spacingVerticalL, // Inner padding for content
    borderRadius: tokens.borderRadiusLarge, // Rounded corners
    backgroundColor: tokens.colorNeutralBackground3, // Subtle background color
    display: "flex", // Use flexbox to center content within the card
    flexDirection: "column", // Stack elements vertically (badge on top, title below)
    gap: "8px", // Space between items
    boxShadow: tokens.shadow4, // Slight elevation effect
    transitionDuration: "0.2s",
    transitionProperty: "box-shadow, transform",
    "&:hover": {
      boxShadow: tokens.shadow8,
      transform: "translateY(-3px)",
    },
  },
  // Header section with title and badge
  cardHeader: {
    display: "flex", // Using flex layout for card title and badge
    justifyContent: "space-between", // Space between title and badge
    alignItems: "center", // Vertically center items
  },
  // Large number styling
  bigNumber: {
    fontSize: "3.2rem", // Font-size in rem.
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for large number
    lineHeight: "1", // Line height of lagre numb number text
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
});

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

/**
 * DataRefreshStatsProps
 *
 * Props expected by the DataRefreshStats component.
 *
 * @property refreshed - Number of datasets successfully refreshed
 * @property unrefreshed - Number of datasets needing attention
 * @property total - Optional total number of datasets
 * @property lastUpdate - Optional timestamp of last update
 */
type DataRefreshStatsProps = {
  // Number of datasets successfully refreshed
  refreshed: number;
  // Number of datasets needing attention
  unrefreshed: number;
  // Optional total number of datasets
  total?: number;
  // Optional timestamp of last update
  lastUpdate?: string;

  valueForClick: string;

  handleCardClick: (data: any) => void;
};

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * DataRefreshStats Component
 *
 * Renders three cards representing:
 *  1. Successfully refreshed datasets (with success rate badge)
 *  2. Datasets needing attention (with count badge)
 *  3. Total datasets (optional, includes last update info)
 *
 * @param props - DataRefreshStatsProps
 * @returns JSX.Element - A responsive, accessible dashboard widget
 *
 * Sample Input:
 *  refreshed = 120
 *  unrefreshed = 30
 *  total = 150
 *  lastUpdate = "12/27/2025 10:30 AM"
 *
 * Sample Output:
 *  Three visually distinct cards showing refresh stats with badges and last update
 */
export function DataRefreshStats({
  refreshed,
  unrefreshed,
  total,
  lastUpdate,
  valueForClick,
  handleCardClick,
}: DataRefreshStatsProps) {
  // Use defined styles
  const styles = useStatsCardStyles();

  // Calculate success rate as percentage (0 if total undefined)
  const successRate = total ? Math.round((refreshed / total) * 100) : 0;
  const failedRate = 100 - successRate;

  return (
    //  Container for all three stats cards
    <div className={styles.statsContainer}>
      {/* Card 1: Total Datasets */}
      {total !== undefined && total !== null && (
        // Card showing total datasets and last update
        <Card className={mergeClasses(styles.statusCard, styles.cardBrand)}>
          {/* Title */}
          <Text weight="semibold" size={400}>
            Total Datasets
          </Text>
          {/* Big number display */}
          <Text className={styles.bigNumber}>{total}</Text>
          {/* Last update timestamp */}
          <Text size={200}>Last updated: {lastUpdate || "-"}</Text>
        </Card>
      )}

      {/* Card 2: Successfully Refreshed */}
      <Card className={mergeClasses(styles.statusCard, styles.cardSuccess)}>
        {/* Card header with title and success rate badge */}
        <div className={styles.cardHeader}>
          {/* Title and success rate badge */}
          <Text weight="semibold" size={400}>
            Successfully Refreshed
          </Text>
          {/*  */}
          <Badge appearance="tint" color="success" size="large">
            {successRate}%
          </Badge>
        </div>
        {/* Big number display */}
        <Text className={styles.bigNumber}>{refreshed}</Text>
        {/*  */}
        <Text size={200} weight="regular">
          datasets up to date
        </Text>
      </Card>

      {/* Card 3: Needs Attention */}
      <Card 
        className={mergeClasses(styles.statusCard, styles.cardError)}
        onClick={()=>handleCardClick(valueForClick)}
        >
        {/* Card header with title and unrefreshed count badge */}
        <div className={styles.cardHeader}>
          {/* Title and unrefreshed count badge */}
          <Text weight="semibold" size={400}>
            Needs Attention
          </Text>
          {/* Badge showing unrefreshed count */}
          <Badge appearance="tint" color="danger" size="large">
            {failedRate}%
          </Badge>
        </div>
        {/* Big number display */}
        <Text className={styles.bigNumber}>{unrefreshed}</Text>
        {/* Description text */}
        <Text size={200} weight="regular">
          datasets not refreshed
        </Text>
      </Card>

    </div>
  );
}
