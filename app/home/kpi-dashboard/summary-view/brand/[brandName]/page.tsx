/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script renders the Brand-level KPI Summary View
    within the KPI Dashboard of the Teva Data Integrity Automation Dashboard.

    - Displays KPI highlights for a selected brand.
    - Allows switching between brands using a dropdown.
    - Shows vendor-wise KPI details.
    - Supports drill-down into status-based KPI details via accordion.
    - Fetches data dynamically using custom dashboard hooks.
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
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid";
// Reusable table component and column configuration type

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the KPI summary page.
*/
import { Help } from "@/components/ui/Help";
// Tooltip component for contextual help messages

/*  
  @/components/ui/Highlights
    - What it is: A reusable component to display KPI summary cards.
    - Why used: Renders the high-level KPI highlights in a card format.
*/
import { Highlights } from "@/components/ui/Highlights";
// Component used to display KPI summary cards

/*  
  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the path to the KPI dashboard summary view for navigation.
*/
import { KPI_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes";
// Route constant for KPI dashboard navigation

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Text, // Typography component for text
  Title3, // Typography component for page titles
  Spinner, // Loading spinner component
  Dropdown, // Dropdown component for selection
  Option, // Dropdown option component
  Field, // Wrapper for form fields
  Accordion, // Accordion container
  AccordionItem, // Individual accordion item
  AccordionHeader, // Accordion header
  AccordionPanel, // Accordion content panel
  makeStyles, // Styling hook
  tokens, // Design tokens (colors, spacing, fonts)
  OptionOnSelectData, // Dropdown selection event type
} from "@fluentui/react-components";

/*  
  next/navigation
    - What it is: Next.js navigation utilities for client-side routing.
    - Why used: Enables programmatic navigation between KPI dashboard pages.
*/
import { useRouter } from "next/navigation";
// Next.js router for client-side navigation

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for state management and async parameter resolution.
*/
import { use, useState } from "react";
// React hooks for async params resolution and state management

/*  
  @/hooks/useKpiDashboard
    - What it is: Custom React hook for fetching KPI dashboard data.
    - Why used: Retrieves KPI summary metrics from the backend API.
*/
import {
  useGetKPIDetailsForBrand,
  useGetKPIVendorDetailsForBrandAndVendor,
  useGetStatusWiseKPIDetails,
} from "@/hooks/useKpiDashboard";
import { usePagePermissions } from "@/hooks/hasPagePermissions";
// Custom hooks for fetching KPI-related data

//---------------------- Styles -------------------------//

/**
 * useKPIBrandStyles
 *
 * Centralized styling for the KPI Brand Summary View.
 * Ensures consistent spacing, layout, and typography.
 */
const useKPIBrandStyles = makeStyles({
  root: {
    // Top padding for the page container
    paddingTop: tokens.spacingHorizontalM,
  },
  header: {
    // Header layout with title and brand selector
    marginBottom: tokens.spacingVerticalXL, // Spacing below header
    display: "flex", // Flexbox layout for alignment
    flexDirection: "column",
    alignItems: "left", // Vertically center items
    gap: tokens.spacingHorizontalS, // Horizontal gap between items
  },
  filterContainerForTitle: {
    display: "flex",        // Arrange filters horizontally
    flexWrap: "wrap",       // Wrap filters on smaller screens
    gap: tokens.spacingHorizontalM, // Space between individual filter controls
  },
  title: {
    // Styling for the brand name heading
    fontWeight: tokens.fontWeightBold, // Bold font weight
    color: tokens.colorNeutralForeground1, // Primary text color
    marginBottom: tokens.spacingVerticalS, // Spacing below title
  },
  filterContainer: {
    // Layout for vendor filter section
    display: "flex", // Flexbox layout for alignment
    flexDirection: "column",
    alignItems: "left", // Vertically center items
    marginTop: tokens.spacingVerticalL, // Spacing above filterContainer
    marginBottom: tokens.spacingVerticalL, // Spacing below filterContainer
  },
  sectionTitle: {
    // Section heading with help icon
    display: "flex", // Flexbox layout for alignment
    alignItems: "center", // Vertically center items
    gap: tokens.spacingHorizontalS, // Gap between title and help icon
    marginTop: tokens.spacingVerticalL, // Spacing above the section title
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section titles
    color: tokens.colorNeutralForeground1, // Primary text color
  },
  sectionTitleInline: {
    // Inline section title (used with filters)
    display: "flex", // Flexbox layout for alignment
    alignItems: "center", // Vertically center items
    gap: tokens.spacingHorizontalS, // Gap between title and help icon
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section titles
    color: tokens.colorNeutralForeground1, // Primary text color
  },
});

//---------------------- Types -------------------------//

/**
 * KPIBrandProps
 *
 * Props received by the KPI Brand page from Next.js routing.
 */
interface KPIBrandProps {
  params: Promise<{ brandName: string }>; // Async route params containing brand name
}

//---------------------- Page Component -------------------------//

/**
 * KPIBrand
 *
 * Renders brand-specific KPI details and analytics.
 *
 * Why this is needed:
 * - Enables monitoring KPI health at brand level.
 * - Provides vendor-wise KPI visibility.
 * - Allows drill-down by KPI status.
 *
 * Sample Input:
 *  brandName = "BrandA"
 *
 * Sample Output:
 *  - KPI summary cards
 *  - Vendor-wise KPI tables
 *  - Status-based KPI drill-down
 */
export default function KPIBrand({ params }: KPIBrandProps) {
  // Resolve async route parameters
  const { brandName } = use(params);

  const {canRead, isLoadingPermissions} = usePagePermissions("kpi-dashboard-summary-view");

  // Initialize Next.js router for navigation
  const router = useRouter();

  // Load page-specific styles
  const styles = useKPIBrandStyles();

  //---------------------- State -------------------------//

  // Stores selected data vendor filter value
  const [selectedVendor, setSelectedVendor] = useState<string>("All");

  // Stores selected KPI summary card for drill-down with status (PASSED / FAILED)
  const [selectedHighlightCard, setSelectedHighlightCard] = useState<{
    title: string;
    status: string;
  } | null>(null);

  // Controls which accordion panel is open
  const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);

  //---------------------- Data Fetching -------------------------//

  // Fetch overall KPI details for the selected brand
  const { brandKPIDetails, isFetching } = useGetKPIDetailsForBrand(brandName);

  // Fetch vendor-wise KPI details
  const { vendorData, isFetchingVendor } =
    useGetKPIVendorDetailsForBrandAndVendor(brandName, selectedVendor);

  // Fetch KPI details based on selected status (PASSED / FAILED)
  const { statusWiseKPIDetails, isFetching: isStatusWiseKPIFetching } =
    useGetStatusWiseKPIDetails(brandName, selectedHighlightCard?.status!);

  //---------------------- Column Definitions -------------------------//

  // Columns for a brand drill-down status-wise KPI details table
  const statusWiseKPIColumns: ColumnConfig<any>[] = [
    { key: "KPI_NAME", label: "KPI Name", width: "10%", sortable: true },
    { key: "DATA_SOURCE", label: "Data Source", width: "8%", sortable: true },
    { key: "DATA_VENDOR", label: "Data Vendor", width: "8%", sortable: true },
    { key: "LATEST_VALUE", label: "Latest Value", width: "12%", sortable: true },
    { key: "PREVIOUS_VALUE", label: "Previous Value", width: "12%", sortable: true },
    { key: "RESULT_VALUE", label: "Result Value", width: "8%", sortable: true },
    { key: "ALERT_THRESHOLD", label: "Alert Threshold", width: "12%", sortable: true },
    {
      key: "BRIEF_DESCRIPTION",
      label: "Description",
      width: "20%",
      showMore: true,
    },
  ];

  // Columns for a brand drill-down Data Vendor table
  const dataVendorColumns: ColumnConfig<any>[] = [
    { key: "KPI_NAME", label: "KPI Name", width: "8%", sortable: true },
    { key: "DATA_SOURCE", label: "Data Source", width: "8%", sortable: true },
    { key: "DATA_VENDOR", label: "Data Vendor", width: "7%", sortable: true },
    { key: "LATEST_VALUE", label: "Latest Value", width: "10%", sortable: true },
    { key: "PREVIOUS_VALUE", label: "Previous Value", width: "10%", sortable: true },
    { key: "RESULT_VALUE", label: "Result Value", width: "8%", sortable: true },
    { key: "ALERT_THRESHOLD", label: "Alert Threshold", width: "12%", sortable: true },
    {
      key: "KPI_UNIQUE_IDENTIFIER",
      label: "KPI Unique Identifier",
      width: "8%",
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "KPI_UNIQUE_IDENTIFIER_VALUE",
      label: "KPI Unique Identifier Value",
      width: "10%",
      showMore: true,
    },
    { key: "RUN_FREQUENCY", label: "Run Frequency", width: "7%", sortable: true },
    { key: "RESULT_STATUS", label: "Result Status", width: "7%", sortable: true },
  ];

  //---------------------- Highlight Cards -------------------------//

  // KPI summary highlight cards
  const highlightCards = [
    {
      title: "Total Evaluated KPIs", // Card title text
      count: brandKPIDetails?.highlights?.validated_kpis ?? 0, // Evaluated KPIs count
      percentage: brandKPIDetails?.highlights?.validated_kpis_percentage,
    },
    {
      title: "Successfully Validated KPIs", // Card title text
      count: brandKPIDetails?.highlights?.passed_kpis ?? 0, // Passed KPIs count
      percentage: brandKPIDetails?.highlights?.passed_kpis_percentage, // Passed KPI percentage
      onClick: () =>
        handleHighlightCardClick("Successfully Validated KPIs", "PASSED"), // Click handler for PASSED KPIs
    },
    {
      title: "KPIs at Risk", // Card title text
      count: brandKPIDetails?.highlights?.failed_kpis ?? 0, // Failed KPIs count
      percentage: brandKPIDetails?.highlights?.failed_kpis_percentage, // Failed KPI percentage
      onClick: () => handleHighlightCardClick("KPIs at Risk", "FAILED"), // Click handler for FAILED KPIs
    },
  ];

  //---------------------- Handlers -------------------------//

  /**
   * handleHighlightCardClick
   *
   * Opens accordion and loads KPI details based on status (PASSED / FAILED).
   */
  function handleHighlightCardClick(title: string, status: string): void {
    // Set selected card and open accordion for drill-down
    setSelectedHighlightCard({ title, status });
    // Open the accordion panel
    setOpenAccordionKey("DETAILS");
  }

  /**
   * handleBrandChange
   *
   * Navigates to another brand page.
   */
  function handleBrandChange(_: unknown, data: OptionOnSelectData): void {
    // Handle brand selection change from dropdown
    const selectedBrand = data.optionValue;
    // Navigate to the selected brand's KPI page
    if (selectedBrand) {
      router.replace(
        `${KPI_DASHBOARD_SUMMARY_VIEW_ROUTE}/brand/${selectedBrand}`
      );
    }
  }

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

  //---------------------- Render -------------------------//

  return (
    // Root container for the KPI Summary page
    <div className={styles.root}>
      {/* Page Header */}
      <div className={styles.header}>
        {/* Main page title */}
        <Title3 className={styles.title}>{brandName}</Title3>

        <div className={styles.filterContainerForTitle}>
        {/* Brand selection dropdown */}
        <Field label="Brand">
          <Dropdown
            selectedOptions={[brandName]} // Currently selected brand
            value={brandName} // Dropdown value
            appearance="filled-darker" // Darker filled style
            onOptionSelect={handleBrandChange} // Handle brand change
          >
            {/* Dropdown options for available brands */}
            {(brandKPIDetails?.brands ?? []).map(
              (brand: any, index: number) => (
                // Dropdown option for each brand
                <Option key={index} value={brand.BRAND}>
                  {brand.BRAND}
                </Option>
              )
            )}
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* KPI Highlights Cards Section */}
      <Highlights data={highlightCards} />

      {/* Drill-down Accordion */}
      {selectedHighlightCard && (
        // Accordion for status-wise KPI details
        <Accordion
          multiple={false} // Allow only one panel open at a time
          collapsible // Allow panels to be collapsible
          openItems={openAccordionKey ? [openAccordionKey] : []} // Control open panel
          onToggle={(_, { openItems }) => {
            // Update open accordion key based on user interaction
            const nextKey = (openItems as string[])?.[0] ?? null;
            // Handle accordion toggle
            setOpenAccordionKey(nextKey);
          }}
        >
          {/* Accordion item for detailed KPI information */}
          <AccordionItem value="DETAILS">
            {/* Accordion header with title */}
            <AccordionHeader>
              <Text size={400} weight="semibold">
                {selectedHighlightCard.title}
              </Text>
            </AccordionHeader>
            {/* Accordion panel containing the detailed KPI data grid */}
            <AccordionPanel>
              {/* DataGrid for status-wise KPI details */}
              <DataGrid
                columns={statusWiseKPIColumns} // Column definitions
                data={statusWiseKPIDetails ?? []} // Data for the table
                loading={isStatusWiseKPIFetching} // Loading state
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {/* Vendor-wise KPI Section */}
      <div className={styles.filterContainer}>
        {/* Section title and help text */}
        <div className={styles.sectionTitleInline}>
          {/* Section title */}
          <Text size={400} weight="semibold">
            Data Vendor KPI Details
          </Text>
          {/* Help text for the section */}
          <Help info="This section displays detailed KPI metrics grouped by data vendor. It includes the latest and previous values, calculated result values, alert thresholds, and status indicators to help monitor data integrity and vendor performance. Use the Data Vendor filter to narrow down results for specific vendors." />
        </div>

        <div className={styles.filterContainerForTitle}>
        {/* Data Vendor filter dropdown */}
        <Field label="Data Vendor">
          <Dropdown
            selectedOptions={[selectedVendor]} // Currently selected vendor
            value={selectedVendor} // Dropdown value
            appearance="filled-darker" // Darker filled style
            onOptionSelect={(_, option) =>
              // Update selected vendor on change
              setSelectedVendor(option?.optionValue ?? "All")
            }
          >
            {/* Dropdown options for available data vendors */}
            <Option value="All">All</Option>
            {/* Option for each data vendor */}
            {(brandKPIDetails?.dataVendors ?? []).map(
              (vendor: any, index: number) => (
                <Option key={index} value={vendor.DATA_VENDOR}>
                  {vendor.DATA_VENDOR}
                </Option>
              )
            )}
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* Vendor-wise KPI Table */}
      <DataGrid
        columns={dataVendorColumns} // Table column definitions
        data={vendorData ?? []} // Data for the table
        loading={isFetchingVendor} // Loading state
      />
    </div>
  );
}
