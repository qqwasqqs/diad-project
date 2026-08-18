/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script is for the layout page of the Data Quality Dashboard (Summary View).
    - The layout wraps the dashboard's summary view page and renders the breadcrumb navigation.
    - It includes the `DashboardBreadcrumb` component to show the navigation hierarchy.
    - It renders the children elements inside the layout, allowing for dynamic content based on the selected view.
    - It imports and applies the breadcrumb functionality, ensuring users can easily navigate back to the dashboard.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/* 
  @/ components/ui/DashboardBreadcrumb:
    - What it is: This component is responsible for rendering the breadcrumb navigation at the top of the dashboard pages.
    - Why used: It helps users understand their current location within the application and provides links to navigate back to previous sections.
*/
import { DashboardBreadcrumb } from "@/components/ui/DashboardBreadcrumb"; // Importing the DashboardBreadcrumb component to display breadcrumb navigation.

/*  
  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the base route for the Data Quality dashboard for breadcrumb navigation.
*/
import { DATA_QUALITY_DASHBOARD_ROUTE } from "@/constants/routes"; // Importing the route constant for Data Quality Dashboard.


//---------------------- Layout Component -------------------------//

/**
 * Layout Component
 * This component serves as the layout for the Data Quality Dashboard summary view.
 * It provides the breadcrumb navigation at the top and renders the dynamic content passed as `children`.
 * 
 * Why this is needed:
 * - Ensures users can navigate through the dashboard and view related information.
 * - Provides a consistent layout structure across different views.
 * - Supports dynamic rendering of content based on the specific summary view being shown.
 * 
 * @param children - React node elements representing the content to be rendered inside the layout.
 * @returns JSX.Element - The JSX markup for rendering the page structure, including the breadcrumb and child content.
 * 
 * Sample Input:
 *  children = <SummaryDashboardPage />
 *
 * Sample Output:
 *  <Breadcrumb />
 *  <SummaryDashboardPage />
 */
export default function DataQualityDashboardSummaryLayout({
  children, // The dynamic content passed as `children` to be displayed within this layout.
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      {/* DashboardBreadcrumb is used to show the navigation trail leading back to the Data Quality Dashboard */}
      <DashboardBreadcrumb rootRoute={`${DATA_QUALITY_DASHBOARD_ROUTE}/`} />
      {/* Render the children content dynamically */}
      {children}
    </div>
  );
}