/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the layout for the KPI Dashboard Summary View
    within the Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Provides a consistent layout wrapper for all KPI summary pages.
    - Renders the dashboard breadcrumb at the top for navigation context.
    - Ensures all child pages inherit the same navigation structure.
    - Acts as a shared layout for all nested routes under
      `/home/kpi-dashboard/summary-view`.

    This layout improves usability by giving users clear
    navigational awareness across KPI dashboard pages.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  @/components/ui/DashboardBreadcrumb
    - What it is: A reusable breadcrumb component for dashboard navigation.
    - Why used: Displays the hierarchical navigation path for KPI dashboard pages.
*/
import { DashboardBreadcrumb } from "@/components/ui/DashboardBreadcrumb"; // Breadcrumb component used to display hierarchical navigation

/*  
  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the base route for the KPI dashboard for breadcrumb navigation.
*/
import { KPI_DASHBOARD_ROUTE } from "@/constants/routes"; // Route constant representing the base KPI dashboard path

//---------------------- Layout Component -------------------------//

/**
 * KpiDashboardSummaryLayout
 *
 * This layout component wraps all KPI dashboard summary pages.
 *
 * Why this layout is needed:
 * - Centralizes breadcrumb rendering logic.
 * - Avoids duplication of navigation UI across pages.
 * - Ensures consistent layout structure for all KPI summary routes.
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
export default function KpiDashboardSummaryLayout({
  children, // Page-specific content injected by Next.js routing
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Wrapper container for breadcrumb and page content
    <div>
      {/* DashboardBreadcrumb displays the navigation hierarchy */}
      <DashboardBreadcrumb rootRoute={`${KPI_DASHBOARD_ROUTE}/`} />

      {/* Render nested KPI summary pages */}
      {children}
    </div>
  );
}
