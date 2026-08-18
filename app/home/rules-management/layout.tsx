/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026 
  Purpose of the script: 
    This script is for the layout page of the Rules Management.
    - The layout wraps the rules management and it's lifecycle pages and renders the breadcrumb navigation.
    - It includes the `DashboardBreadcrumb` component to show the navigation hierarchy.
    - It renders the children elements inside the layout, allowing for dynamic content based on the selected view.
    - It imports and applies the breadcrumb functionality, ensuring users can easily navigate back to the main page.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/* 
  @/ components/ui/DashboardBreadcrumb:
    - What it is: This component is responsible for rendering the breadcrumb navigation at the top of the rules management pages.
    - Why used: It helps users understand their current location within the application and provides links to navigate back to previous sections.
*/
import { DashboardBreadcrumb } from "@/components/ui/DashboardBreadcrumb"; // Importing the DashboardBreadcrumb component to display breadcrumb navigation.

/*  
  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the base route for the Rules Management for breadcrumb navigation.
*/
import { RULES_MANAGEMENT_ROUTE } from "@/constants/routes"; // Importing the route constant for Rules Management.


//---------------------- Layout Component -------------------------//

/**
 * Layout Component
 * This component serves as the layout for the Rules Management Pages.
 * It provides the breadcrumb navigation at the top and renders the dynamic content passed as `children`.
 * 
 * Why this is needed:
 * - Ensures users can navigate through the rules management pages and view related information.
 * - Provides a consistent layout structure across different pages.
 * - Supports dynamic rendering of content based on the specific view being shown.
 * 
 * @param children - React node elements representing the content to be rendered inside the layout.
 * @returns JSX.Element - The JSX markup for rendering the page structure, including the breadcrumb and child content.
 * 
 * Sample Input:
 *  children = <RuleManagementPage />
 *
 * Sample Output:
 *  <Breadcrumb />
 *  <RuleManagementPage />
 */
export default function RuleManagementLayout({
  children, // The dynamic content passed as `children` to be displayed within this layout.
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      {/* DashboardBreadcrumb is used to show the navigation trail leading back to the Rules Management Page */}
      <DashboardBreadcrumb rootRoute={RULES_MANAGEMENT_ROUTE} />
      {/* Render the children content dynamically */}
      {children}
    </div>
  );
}