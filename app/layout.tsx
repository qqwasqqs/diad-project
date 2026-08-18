/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script is for the root layout page of the Teva Data Integrity Automation Dashboard. 
    - The layout wraps the entire application and defines global HTML structure, meta data, and layout components.
    - It sets the meta data for the page title and description.
    - It imports and applies a custom layout (`AppLayout`) that encapsulates all page content.
    - The layout supports both custom fonts and global styling, ensuring a consistent look and feel across all pages.
    - It serves as the wrapper for all child pages (content rendered inside the layout).
*/

//---------------------- Imports and Types -------------------------//
import type { Metadata } from "next"; // Importing the type for metadata in Next.js 16
import "@/styles/globals.css"; // Importing global CSS styles
import AppLayout from "@/layouts/AppLayout"; // Importing the layout component to wrap the child content

// Metadata for the page
// Provides SEO(Search engine optimization)-friendly meta data such as title and description for the page
export const metadata: Metadata = {
  title: "Teva - Data Integrity Automation Dashboard", // Page title displayed on the browser tab
  description:
    "A centralized dashboard for monitoring and automating data integrity processes at Teva.", // Description for SEO and social sharing
};

/**
 * RootLayout Component
 * This component serves as the root layout for the application, which wraps the children elements inside a consistent layout structure.
 * It is responsible for rendering the overall page structure, applying global styles, and providing the layout for the application.
 * 
 * @param children - React node elements that will be rendered inside this layout component.
 * @returns JSX.Element - The JSX markup for rendering the page structure, including the layout and children.
 */
export default function RootLayout({
  children, // The content of the current page passed as `children`
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The <html> element defines the language of the document (English in this case) for SEO and accessibility.
    <html lang="en">
      <body>
        {/* AppLayout is used to wrap the content and provides a consistent structure/layout */}
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
