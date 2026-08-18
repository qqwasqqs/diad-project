/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 01 June 2026

  Purpose       : Simple 403 Forbidden page — shown when a user navigates to a
                  route they have no access to. Deliberately minimal; no detail
                  block, no permission keys, no RBAC specifics.

  Usage         : Place at app/forbidden/page.tsx (or app/403/page.tsx).
                  Redirect here from middleware or withAuthorization().
*/

"use client"; // Mark this component as a client-side component for interactivity and Fluent UI usage.

// Import core Fluent UI styling and theme token utilities.
import {
  makeStyles, // Hook to create scoped CSS-in-JS styles using Fluent design tokens.
  tokens, // Design system tokens for colors, spacing, shadows, typography, and responsive values.
  Text, // Fluent UI text component for semantic typography (replaces <p>, <span>, etc.).
} from "@fluentui/react-components";

// Import the LockClosed icon from Fluent UI for visual representation of access denial.
import {
  LockClosedRegular, // Lock icon in regular weight, used in the error state circle.
} from "@fluentui/react-icons";

// ─────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────

// Define all CSS-in-JS styles for the forbidden page using Fluent design tokens.
const useStyles = makeStyles({
  // Root container: full-height flex layout centered both horizontally and vertically.
  root: {
    minHeight: "100vh", // Ensure the container takes at least full viewport height.
    display: "flex", // Use flexbox for centering.
    alignItems: "center", // Vertically center the card.
    justifyContent: "center", // Horizontally center the card.
    backgroundColor: tokens.colorNeutralBackground1, // Light neutral background from Fluent design tokens.
    padding: tokens.spacingHorizontalXXL, // Extra-large horizontal padding for responsive spacing on mobile.
  },

  // Card container: column layout for icon, title, and message stacking.
  card: {
    display: "flex", // Use flexbox for vertical stacking.
    flexDirection: "column", // Stack children vertically.
    alignItems: "center", // Center all children horizontally within the card.
    textAlign: "center", // Center-align all text content.
    gap: tokens.spacingVerticalL, // Large vertical gap between icon, title, body, and actions.
    maxWidth: "400px", // Limit card width for readability on large screens.
    width: "100%", // Full width on smaller screens (responsive).
  },

  // Icon circle: circular container holding the lock icon with border and shadow.
  iconCircle: {
    width: "72px", // Fixed width for the circular container.
    height: "72px", // Fixed height to maintain perfect circle aspect ratio.
    borderRadius: "50%", // Make the container perfectly circular.
    // backgroundColor: tokens.colorNeutralBackground1, // Commented out: using border instead for minimal appearance.
    border: `1px solid ${tokens.colorNeutralStroke1}`, // Subtle border around the icon circle.
    display: "flex", // Use flexbox for centering the icon inside the circle.
    alignItems: "center", // Vertically center the icon.
    justifyContent: "center", // Horizontally center the icon.
    boxShadow: tokens.shadow16, // Elevation shadow for depth and visual hierarchy.
  },

  // Code label: styled "403 Forbidden" text with uppercase treatment.
  code: {
    fontSize: tokens.fontSizeBase100, // Small base font size for secondary information.
    fontWeight: tokens.fontWeightSemibold, // Semi-bold weight for emphasis without being too heavy.
    letterSpacing: "0.12em", // Increased letter spacing for uppercase emphasis and readability.
    textTransform: "uppercase", // Transform text to uppercase (403 FORBIDDEN).
    color: tokens.colorNeutralForeground4, // Subtle neutral color for secondary/muted text.
  },

  // Title: large, bold "Access Denied" heading with readable line height.
  title: {
    fontWeight: tokens.fontWeightSemibold, // Semi-bold weight for heading prominence.
    color: tokens.colorNeutralForeground1, // Primary text color for maximum contrast and readability.
    lineHeight: "1.3", // Compact line height for single-line headings.
    margin: 0, // Remove default heading margins to rely on card gap spacing.
  },

  // Body: descriptive message with relaxed line height for readability.
  body: {
    color: tokens.colorNeutralForeground2, // Secondary text color for body copy (slightly muted).
    lineHeight: "1.65", // Generous line height for comfortable reading of multi-line text.
    display: "block", // Treat as block element to respect line height and spacing.
  },

  // Divider: thin horizontal line separating sections for visual hierarchy.
  divider: {
    width: "32px", // Fixed width for subtle visual separator (not full-width).
    height: "1px", // Thin 1-pixel line.
    backgroundColor: tokens.colorNeutralStroke1, // Subtle neutral stroke color from design system.
  },

  // Actions container: flex layout for horizontal arrangement of buttons (if added later).
  actions: {
    display: "flex", // Use flexbox for button arrangement.
    gap: tokens.spacingHorizontalS, // Small horizontal gap between buttons.
    flexWrap: "wrap", // Allow buttons to wrap on smaller screens.
    justifyContent: "center", // Center buttons horizontally.
    marginTop: tokens.spacingVerticalXS, // Extra-small top margin to separate from divider.
  },
});

// ─────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────

// Main page component exported as default for Next.js routing.
export default function ForbiddenPage() {
  // Apply styles to the component using the makeStyles hook.
  const styles = useStyles();

  return (
    // Main semantic container for the entire page content.
    <main className={styles.root}>
      {/* Card wrapper: centered column layout for the error message and icon */}
      <div className={styles.card}>

        {/* Lock Icon Section: circular container with lock icon to visually represent access denial */}
        <div className={styles.iconCircle}>
          {/* LockClosedRegular icon from Fluent UI icons library */}
          <LockClosedRegular
            fontSize={28} // Set icon size to 28 pixels for prominence.
            style={{ color: tokens.colorNeutralForeground1 }} // Color icon using primary foreground color.
          />
        </div>

        {/* Error Code Label: displays "403 Forbidden" in uppercase with subtle styling */}
        <Text className={styles.code}>403 Forbidden</Text>

        {/* Main Heading: "Access Denied" title with semantic h1 tag and large font size */}
        <Text as="h1" size={700} className={styles.title}>
          Access Denied
        </Text>

        {/* Visual Divider: thin horizontal line for section separation and visual balance */}
        <div className={styles.divider} />

        {/* Body Message: explanatory text directing user to contact administrator */}
        <Text size={300} className={styles.body}>
          You don&apos;t have permission to view this page. Please contact your
          workspace administrator to request access.
        </Text>
        {/* Note: &apos; is HTML entity for apostrophe to avoid JSX parsing issues */}
      </div>
    </main>
  );
}