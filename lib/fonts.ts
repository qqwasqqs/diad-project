/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script:  
    This script is for configuring and importing two Google Fonts—Open Sans and Noto Sans—for the Teva Data Integrity Automation Dashboard.
    - It enhances the readability and accessibility of the application by using Open Sans and Noto Sans fonts.
    - The fonts provide support for multiple languages, ensuring global accessibility.
    - It allows multiple font weights to be used, improving design flexibility.
    - The fonts are globally available in the application through CSS variables, ensuring consistency across the dashboard.
    - It optimizes font loading performance with the "swap" display property, improving user experience during page load.
*/

import { Open_Sans, Noto_Sans } from "next/font/google";

// -----------------------------------------------
// 1. Open Sans Font (Google – Self-hosted)
// -----------------------------------------------

/**
 * Configures and imports the Open Sans font with specified subsets, weights, and display properties.
 * 
 * The Open Sans font is used across the application for better readability.
 * The variable option makes the font available in the CSS variables for flexible use.
 * The `display` property ensures the font swaps efficiently during page load.
 * The font weights range from 300 (light) to 700 (bold).
 * 
 * @returns An object representing the Open Sans font configuration with variable and CSS properties.
 */
const openSansFont = Open_Sans({
  subsets: ["latin", "latin-ext"], // Subsets of Latin script
  variable: "--font-open-sans", // CSS variable to apply the font globally
  display: "swap", // Font-display strategy for performance
  weight: ["300", "400", "500", "600", "700"], // Font weights to support
});

// -----------------------------------------------
// 2. Noto Sans Font (Wide Language Support)
// -----------------------------------------------

/**
 * Configures and imports the Noto Sans font with extensive language support.
 * 
 * Noto Sans provides support for multiple languages, making it ideal for diverse audiences.
 * The subsets include Latin, Cyrillic, Greek, Vietnamese, and others to ensure global accessibility.
 * The variable option allows the font to be applied globally through CSS.
 * Similar to Open Sans, the `display` property ensures efficient font loading.
 * 
 * @returns An object representing the Noto Sans font configuration with variable and CSS properties.
 */
const notoSansFont = Noto_Sans({
  subsets: [
    "latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "vietnamese",
  ], // Extended subsets for global language support
  variable: "--font-noto-sans", // CSS variable for global font usage
  display: "swap", // Font-display strategy for performance
  weight: ["300", "400", "500", "600", "700"], // Font weights to support
});

// -----------------------------------------------
// Exporting Fonts for Global Use in the Application
// -----------------------------------------------

/**
 * Export the font configurations for Open Sans and Noto Sans to be applied globally in the layout.
 * 
 * By exporting these font configurations, they can be used across multiple pages in the app to ensure
 * consistent typography styling. The fonts are applied as CSS variables, allowing them to be referenced
 * dynamically in stylesheets.
 */
export { openSansFont, notoSansFont };

