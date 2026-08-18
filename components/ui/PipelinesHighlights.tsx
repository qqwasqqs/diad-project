/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the PipelineHighlights component used in the
    Pipeline section of the Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Displays pipeline-level summary cards (total, success, error).
    - Uses color-coded visual indicators for quick status recognition.
    - Shows counts with optional percentages inside large badges.
    - Optionally supports click interactions for drill-down navigation.
    - Provides tooltips for contextual explanations when needed.

  Typical Usage Example:
    <PipelinesHighlights
      data={[
        { title: "Total Pipelines", count: 25 },
        { title: "Successful", count: 20, percentage: "80%" },
        { title: "Failed", count: 5, info: "Investigate failed pipelines" }
      ]}
    />
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
    - What it is: Fluent UI React component library by Microsoft.
    - Why used: Provides accessible, theme-consistent UI elements
      such as Cards, Badges, Text, Tooltips, and styling utilities.
*/
import {
  Badge,        // Displays numeric values prominently
  Card,         // Container for each pipeline summary card
  makeStyles,   // Hook to define component-scoped styles
  mergeClasses, // Utility to merge multiple CSS class names
  tokens,       // Fluent UI design tokens (spacing, colors, shadows)
  Text,         // Text component for titles/labels
  Tooltip,      // Hover-based contextual information
} from "@fluentui/react-components";

/*
  @fluentui/react-icons
    - What it is: Fluent UI icon set exposed as React components.
    - Why used: Icons quickly communicate the meaning of each card
      (database, success, error, etc.).
*/
import {
  CheckmarkCircle20Filled, // Indicates successful pipelines
  Database20Filled,       // Indicates total pipelines / data source
  Edit20Filled,           // (Imported but not used here; kept for parity/future)
  ErrorCircle20Filled,    // Indicates failed pipelines
  Info16Regular,          // Info icon used with tooltips
  Hourglass20Filled       // (Imported but not used; potential future state)
} from "@fluentui/react-icons";

/*
  react (FC)
    - What it is: Core React library.
    - Why used: FC provides typing for functional React components.
*/
import { FC } from "react";

// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------

/**
 * useStyles
 *
 * Centralized Fluent UI styles for the PipelineHighlights component.
 * Defines layout grid, card appearance, color states, and hover behavior.
 */
const useStyles = makeStyles({
  // Root container holding all pipeline highlight cards
  root: {
    display: "grid",                         // CSS grid for horizontal layout
    gridTemplateColumns: "repeat(3, 1fr)",   // Exactly three equal-width columns
    gap: tokens.spacingHorizontalL,          // Space between cards
    marginTop: tokens.spacingVerticalXL,     // Space above the cards
  },

  // Base card styling shared across all pipeline cards
  card: {
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalS}`, // Inner spacing
    borderRadius: tokens.borderRadiusLarge,   // Rounded corners
    backgroundColor: tokens.colorNeutralBackground3, // Neutral background
    boxShadow: tokens.shadow4,                // Subtle elevation
    display: "flex",
    flexDirection: "column",                  // Stack badge above title
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  // Success state styling (green accent)
  cardSuccess: {
    borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}`,
    color: tokens.colorPaletteGreenBorder2,
  },

  // Error state styling (red accent)
  cardError: {
    borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}`,
    color: tokens.colorPaletteRedBorder2,
  },

  // Neutral / brand styling
  cardBrand: {
    borderLeft: `4px solid ${tokens.colorNeutralForeground2}`,
    color: tokens.colorNeutralForeground2,
  },

  // Row containing title text and optional info icon
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },

  // Badge background colors mapped to card state
  badgeSuccess: {
    backgroundColor: tokens.colorPaletteGreenBorder2,
  },
  badgeError: {
    backgroundColor: tokens.colorPaletteRedBorder2,
  },
  badgeBrand: {
    backgroundColor: tokens.colorNeutralForeground2,
  },

  // Hover behavior for clickable cards
  cardClickable: {
    cursor: "pointer",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground3Hover,
      boxShadow: tokens.shadow8,
    },
  },
});

// ---------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------

/**
 * PipelinesHighlight
 *
 * Represents configuration for a single pipeline summary card.
 */
interface PipelinesHighlight {
  title?: string;        // Optional label shown below the badge
  count: number;         // Primary numeric value displayed in badge
  percentage?: string;  // Optional percentage value
  info?: string;        // Tooltip text for additional context
  onClick?: () => void; // Optional click handler for drill-down
}

/**
 * PipelinesHighlightsProps
 *
 * Props accepted by the PipelinesHighlights component.
 */
interface PipelinesHighlightsProps {
  data: PipelinesHighlight[]; // Array of pipeline summary data
}

// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * PipelinesHighlights Component
 *
 * Renders a set of summary cards showing pipeline-level metrics.
 *
 * Why this component is needed:
 * - Gives a quick overview of pipeline health.
 * - Helps users immediately identify failures or success rates.
 * - Maintains visual consistency with other dashboard highlight components.
 *
 * @param data - Array of pipeline highlight configurations
 *
 * Sample Input:
 *  data = [
 *    { title: "Total Pipelines", count: 10 },
 *    { title: "Successful", count: 8, percentage: "80%" },
 *    { title: "Failed", count: 2 }
 *  ]
 */
export const PipelinesHighlights: FC<PipelinesHighlightsProps> = ({ data }) => {
  // Initialize Fluent UI styles
  const styles = useStyles();

  // Predefined icon and color mapping (data provides only values)
  const summaryCards = [
    {
      icon: <Database20Filled />,
      color: "brand",
    },
    {
      icon: <CheckmarkCircle20Filled />,
      color: "success",
    },
    {
      icon: <ErrorCircle20Filled />,
      color: "error",
    },
  ];

  /**
   * Returns merged CSS classes for a card based on
   * its color variant and clickability.
   */
  const getCardClass = (color: string, isClickable: boolean) =>
    mergeClasses(
      styles.card,
      isClickable && styles.cardClickable,
      color === "success" && styles.cardSuccess,
      color === "error" && styles.cardError,
      color === "brand" && styles.cardBrand
    );

  /**
   * Resolves badge background class based on card color.
   */
  const badgeClass = (color: string) =>
    color === "success"
      ? styles.badgeSuccess
      : color === "error"
      ? styles.badgeError
      : styles.badgeBrand;

  return (
    // Root grid container for all pipeline highlight cards
    <div className={styles.root}>
      {summaryCards.map((card, i) => {
        // Corresponding data item for this card
        const item = data[i];

        // Determines whether the card should be interactive
        const isClickable = !!item?.onClick;

        return (
          // Card wrapper for a single pipeline metric
          <Card
            key={i}
            className={getCardClass(card.color, isClickable)}
            onClick={isClickable ? item.onClick : undefined}
          >
            {/* Badge displaying count and optional percentage */}
            <Badge
              appearance="filled"
              className={badgeClass(card.color)}
              size="extra-large"
              icon={card.icon}
            >
              {item
                ? `${item.count?.toLocaleString()}${
                    item.percentage ? ` (${item.percentage})` : ""
                  }`
                : "–"}
            </Badge>

            {/* Title row with optional tooltip */}
            {(item?.title || item?.info) && (
              <div className={styles.titleRow}>
                {item?.title && (
                  <Text size={300} weight="medium">
                    {item.title}
                  </Text>
                )}

                {item?.info && (
                  <Tooltip
                    content={item.info}
                    relationship="description"
                    withArrow
                  >
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
