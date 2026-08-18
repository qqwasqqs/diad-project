/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the KPI Summary View page of the
    Teva Data Integrity Automation Dashboard.

    - Fetches KPI summary metrics using a custom React hook.
    - Displays KPI highlights using summary cards.
    - Shows a brand-wise KPI summary table.
    - Enables drill-down navigation to brand-level KPI details.
    - Handles loading state while data is being fetched.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders the brand-wise KPI summary table with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid";
// Imports reusable DataGrid component and its column type definition

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "@/components/ui/Help";
// Imports Help tooltip component for contextual user guidance

/*  
  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the path to the KPI dashboard summary view for navigation.
*/
import { KPI_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes";
// Imports route constant used for KPI dashboard navigation

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Text, // Typography component for normal text
  Title3, // Typography component for page headings
  Spinner, // Loading spinner component
  makeStyles, // Fluent UI styling hook
  tokens, // Design tokens for spacing, colors, fonts
} from "@fluentui/react-components";

/*  
  next/link
    - What it is: Next.js Link component for client-side navigation between pages.
    - Why used: Enables navigation to brand-level KPI views from the summary table.
*/
import Link from "next/link";
// Next.js Link component for client-side navigation

/*  
  @/hooks/useKpiDashboard
    - What it is: Custom React hook for fetching KPI dashboard data.
    - Why used: Retrieves KPI summary metrics from the backend API.
*/
import { useGetKPISummary } from "@/hooks/useKpiDashboard";
// Custom hook used to fetch KPI summary data from backend

/*  
  @/components/ui/L1UnitHighlights
    - What it is: A reusable component to display KPI summary cards.
    - Why used: Renders the high-level KPI highlights in a card format.
*/
import { L1UnitHighlights } from "@/components/ui/L1UnitHighlights";
import { usePagePermissions } from "@/hooks/hasPagePermissions";
// Component used to render KPI summary cards

//---------------------- Styles -------------------------//

/**
 * useKpiSummaryViewStyles
 *
 * Defines and centralizes all styles used by the KPI Summary View.
 * Ensures consistent spacing, colors, and typography.
 */
const useKpiSummaryViewStyles = makeStyles({
  root: {
    // Root container for the KPI summary page
  },

  header: {
    // Adds vertical spacing below the page header
    marginBottom: tokens.spacingVerticalXXL,
  },

  title: {
    // Styles the main page title
    fontWeight: tokens.fontWeightBold, // Bold font for emphasis
    color: tokens.colorNeutralForeground1, // Primary text color
    marginBottom: tokens.spacingVerticalS, // Spacing below the title
  },

  sectionTitle: {
    // Layout for section title and help icon
    display: "flex", // Flexbox for horizontal alignment
    alignItems: "center", // Vertically center items
    gap: tokens.spacingHorizontalS, // Spacing between title and help icon
    marginTop: tokens.spacingVerticalL, // Spacing above the section title
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section titles
    color: tokens.colorNeutralForeground1, // Primary text color
  },
});

//---------------------- Page Component -------------------------//

/**
 * KPISummaryView
 *
 * This component renders the KPI Summary dashboard page.
 *
 * Why this is needed:
 * - Provides a high-level overview of KPI health.
 * - Allows stakeholders to monitor evaluation status.
 * - Enables drill-down into brand-level KPI insights.
 *
 * Sample Input:
 *  {
 *    highlights: {
 *      total_kpis: 120,
 *      validated_kpis: 95,
 *      passed_kpis: 80,
 *      failed_kpis: 15
 *    },
 *    brands: [...]
 *  }
 *
 * Sample Output:
 *  - KPI summary cards
 *  - Brand-wise KPI summary table
 */
export default function KPISummaryView() {
  // Initialize Fluent UI styles for this page
  const styles = useKpiSummaryViewStyles();

  const {canRead, isLoadingPermissions} = usePagePermissions("kpi-dashboard-summary-view");

  // Fetch KPI summary data and loading status using custom hook
  const { summaryData, isFetching } = useGetKPISummary();

  //---------------------- Summary Cards Data -------------------------//

  // Prepare KPI summary card data for display
  const kpiSummaryCards = [
    {
      title: "Total KPIs", // Card title text
      count: summaryData?.highlights?.total_kpis ?? 0, // Total KPIs count with safe fallback
      info: "Total number of KPIs available across all brands.", // Tooltip description
    },
    {
      title: "Evaluated KPIs", // Card title text
      count: summaryData?.highlights?.validated_kpis ?? 0, // Evaluated KPIs count
      percentage: summaryData?.highlights?.validated_kpis_percentage!, // Evaluation percentage
      info: "Total number of KPIs that have successfully evaluated.", // Tooltip description
    },
    {
      title: "Successfully Evaluated KPIs", // Card title text
      count: summaryData?.highlights?.passed_kpis ?? 0, // Passed KPIs count
      percentage: summaryData?.highlights?.passed_kpis_percentage!, // Passed KPI percentage
      info: "KPIs that are verified and considered trusted.", // Tooltip description
    },
    {
      title: "KPIs at Risk", // Card title text
      count: summaryData?.highlights?.failed_kpis ?? 0, // Failed KPIs count
      percentage: summaryData?.highlights?.failed_kpis_percentage!, // Failed KPI percentage
      info: "KPIs that failed validation checks or require further review to ensure accuracy and reliability.",
      // Tooltip description
    },
  ];

  //---------------------- Table Column Configuration -------------------------//

  // Defines columns for the brand-wise KPI summary table
  const brandSummaryColumns: ColumnConfig<any>[] = [
    {
      key: "BRAND", // Key used to access brand value from row data
      label: "Brand", // Column header label
      width: "auto", // Auto-adjust column width
      sortable: true, // Enables sorting functionality for the column
      // Custom cell renderer to enable navigation to brand details
      render: (brandName: string) => (
        <Link
          href={`${KPI_DASHBOARD_SUMMARY_VIEW_ROUTE}/brand/${brandName}`} // Navigates to brand-level KPI view
        >
          {brandName}
        </Link>
      ),
    },
    {
      key: "Total_KPIs", // Total KPIs column key
      label: "Total KPIs", // Column label
      width: "auto", // Auto-adjust column width
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "Validated_KPIs", // Evaluated KPIs column key
      label: "Evaluated KPIs", // Column label
      width: "auto", // Auto-adjust column width
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "Failed_KPIs", // Unevaluated KPIs column key
      label: "KPIs at Risk", // Column label
      width: "auto", // Auto-adjust column width
      sortable: true, // Enables sorting functionality for the column
    },
  ];

  //---------------------- Loading State -------------------------//

  // Display a loading spinner while KPI data is being fetched
  if (isFetching) {
    // Centered spinner with background
    return (
      <div className="flex h-[80vh] items-center justify-center bg-gray-50">
        {/* Loading spinner while data is being fetched */}
        <Spinner size="large" label="Loading dataset…" />
      </div>
    );
  }

  //---------------------- Render UI -------------------------//

    // ── Permission loading guard ───────────────────────────────────────
    /*
      While /me is still fetching we don't know yet whether the user has access.
      Show a full-page spinner to avoid flashing the forbidden dialog prematurely.
    */
      if (isLoadingPermissions) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
                <Spinner size="medium" label="Loading..." />
            </div>
        );
    };

    if(!isLoadingPermissions && !canRead) {
        window.location.href = "/forbidden";
    };  

  return (
    // Root container for the KPI Summary page
    <div className={styles.root}>
      {/* Page Header */}
      <div className={styles.header}>
        {/* Main page title */}
        <Title3 className={styles.title}>KPI Results Monitoring</Title3>
      </div>

      {/* KPI Summary Cards Section */}
      <L1UnitHighlights data={kpiSummaryCards} />

      {/* Brand-wise KPI Table Section Header */}
      <div className={styles.sectionTitle}>
        {/* Section title and help text */}
        <Text size={400} weight="semibold">
          Brand KPIs Count Summary
        </Text>
        {/* Help icon with tooltip */}
        <Help info="This table provides a brand-level summary of Key Performance Indicators (KPIs), including the total number of KPIs, those that have been evaluated, and those pending evaluation. Use this view to monitor data integrity and review progress across brands. Click on a brand to drill down into a detailed view for that brand." />
      </div>

      {/* Brand-wise KPI Summary Table */}
      <DataGrid
        columns={brandSummaryColumns} // Table column definitions
        data={summaryData?.brands ?? []} // Table row data with safe fallback([])
        loading={isFetching} // Loading indicator for the table
      />
    </div>
  );
}
