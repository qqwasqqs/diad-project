/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script defines the layout for the Home section of the
    Teva Data Integrity Automation Dashboard.

    - It wraps all `/home` routes with a dedicated HomeLayout.
    - It provides section-specific meta data for SEO(Search engine optimization) and browser context.
    - It ensures a consistent structure for all Home-related pages.
    - It acts as an intermediate layout between the RootLayout
      and individual Home pages.
*/

//---------------------- Imports and Types -------------------------//

// Importing the Metadata type from Next.js for page-level SEO(Search engine optimization) configuration
import type { Metadata } from "next";

// Importing the HomeLayout component that defines the Home section structure
import HomeLayout from "@/layouts/HomeLayout";

//---------------------- Page Metadata -------------------------//

/**
 * metadata
 * Defines SEO(Search engine optimization)-friendly metadata for the Home section of the application.
 *
 * Why this is needed:
 * - Sets the browser tab title for all Home pages.
 * - Improves discoverability and accessibility.
 * - Provides a consistent description for the Home dashboard section.
 */
export const metadata: Metadata = {
  title: "Teva - Data Integrity Automation Dashboard Home", // Title shown in the browser tab
  description:
    "A centralized dashboard for monitoring and automating data integrity processes at Teva.", // Meta description for SEO
};

//---------------------- Home Layout Component -------------------------//

/**
 * HomeSectionLayout Component
 * This component serves as the layout wrapper for all routes under `/home`.
 *
 * Why this component is needed:
 * - Applies a dedicated HomeLayout to all Home pages.
 * - Avoids repeating layout logic across individual Home pages.
 * - Ensures consistent navigation, spacing, and structure.
 *
 * @param children - React node elements representing the Home page content.
 * @returns JSX.Element - The HomeLayout wrapping the rendered child content.
 */
export default function HomeSectionLayout({
  children, // The content of the current Home page passed as `children`
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Wrapping Home page content with the HomeLayout component
    <HomeLayout>
      {children}
    </HomeLayout>
  );
}
