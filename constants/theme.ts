/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the global Fluent UI theme configuration used across
    the Teva Data Integrity Automation Dashboard.

    - It defines the Teva brand color ramp required by Fluent UI v9.
    - It generates a light theme using Fluent UI’s theming utilities.
    - It customizes neutral foreground, background, and stroke tokens.
    - It ensures consistent branding, accessibility, and UI styling
      across all pages and components.
*/

//---------------------- Imports and Types -------------------------//

// Importing Fluent UI theming utilities and types
import {
  createLightTheme, // Utility to generate a Fluent UI light theme
  BrandVariants,    // Type definition for brand color ramps
  Theme,            // Type definition for Fluent UI theme object
} from "@fluentui/react-components";

//---------------------- Brand Color Configuration -------------------------//

/**
 * Teva Brand Color Ramp
 * This object defines the Teva brand color scale required by Fluent UI v9.
 * 
 * Why this is needed:
 * - Fluent UI requires a full brand color ramp to generate accessible themes.
 * - These values are used to automatically derive multiple UI color tokens.
 * - Ensures consistent branding across all components.
 */
const tevaBrandColorRamp: BrandVariants = {
  10: "#020401",  // Darkest brand shade
  20: "#0F1C0F",
  30: "#142F17",
  40: "#163D1C",
  50: "#184B21",
  60: "#185A25",
  70: "#17692A",
  80: "#15792F",
  90: "#108934",
  100: "#069939", // Primary brand color
  110: "#2EA749",
  120: "#55B462",
  130: "#74C07B",
  140: "#90CD93",
  150: "#ABD9AC",
  160: "#C5E5C6", // Lightest brand shade
};

//---------------------- Theme Definition -------------------------//

/**
 * Teva Light Theme
 * This object defines the complete Fluent UI theme used by the application.
 * 
 * Why this theme is needed:
 * - Provides a centralized styling configuration.
 * - Ensures consistent colors, contrast, and accessibility.
 * - Allows Fluent UI components to automatically consume theme tokens.
 */
export const tevaLightTheme: Theme = {
  // ---- Brand Colors ----------------------------------------------------
  // Generates default brand-based tokens using the Teva brand color ramp
  ...createLightTheme(tevaBrandColorRamp),

  // ---- Neutral Foreground Colors --------------------------------------
  // Used for text, icons, and foreground elements
  colorNeutralForeground1: "#00A03B",           // Primary text color
  colorNeutralForeground2: "#00567A",           // Secondary text color
  colorNeutralForeground3: "#ffffff",           // Inverted/contrast text
  colorNeutralForeground4: "#00567A",           // Supporting text color
  colorNeutralForegroundDisabled: "#c8c6c4",   // Disabled text color
  colorNeutralForeground1Hover: "#00A03B",      // Hover state for primary text
  colorNeutralForeground2Hover: "#00A03B",      // Hover state for secondary text
  colorNeutralForeground3Hover: "#AFCb37",      // Hover state for inverted text
  colorNeutralStroke1Hover: "#00A03B",          // Hover state for strokes

  // ---- Neutral Background Colors --------------------------------------
  // Used for page, card, and container backgrounds
  colorNeutralBackground1: "#ffffff",           // Primary background
  colorNeutralBackground2: "#3c7e79",           // Secondary background
  colorNeutralBackground3: "#f6f6f6",           // Tertiary background
  colorNeutralBackground4: "#00A03B",           // Brand background
  colorNeutralBackground5: "#eeeeee",           // Subtle background
  colorNeutralBackground6: "#d0d0d0",           // Disabled background
  colorNeutralBackground4Hover: "#008F35",      // Hover state for brand background

  // ---- Compound Brand Colors ------------------------------------------
  // Used for compound components such as buttons and badges
  colorCompoundBrandForeground1: "#ffffff",     // Foreground on brand surfaces

  // ---- Neutral Stroke Colors ------------------------------------------
  // Used for borders, dividers, and outlines
  colorNeutralStroke1: "#3c7e79",                // Primary border color
  colorNeutralStroke2: "#00567A",                // Secondary border color
  colorNeutralStroke3: "#AA198d",                // Accent border color
  colorNeutralStrokeAccessible: "#605e5c",       // High-contrast accessible border
};
