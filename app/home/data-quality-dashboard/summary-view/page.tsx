/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script represents the Data Quality Dashboard's Summary View page for monitoring dataset health and refresh statistics.
    - It displays key dataset highlights in summary cards.
    - Provides detailed information via an accordion view when a card is clicked, such as dataset refresh statistics and data grids.
    - The layout includes a table summarizing the dataset verification status across business units.
    - It dynamically fetches data using custom hooks, handles loading states, and displays interactive UI components (e.g., DataGrid, Accordion, and RefreshStats).
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  @/components/ui/DataGrid
    - What it is: A reusable DataGrid component for displaying tabular data.
    - Why used: Renders various data tables with pagination support.
*/
import { ColumnConfig, DataGrid } from "@/components/ui/DataGrid"; // Importing custom components for displaying data in grid format

/*  
  @/components/ui/Help
    - What it is: A reusable Help tooltip component.
    - Why used: Provides contextual help information for users on the Data Integrity Results Summary page.
*/
import { Help } from "@/components/ui/Help"; // Importing the Help component for additional information tooltips

/*  
  @/components/ui/L1UnitHighlights
    - What it is: A reusable component to display KPI summary cards.
    - Why used: Renders the high-level Data Integrity highlights in a card format.
*/
import { L1UnitHighlights } from "@/components/ui/L1UnitHighlights"; // Importing the component to display highlights of datasets by business unit

/*  
  @/constants/routes
    - What it is: A module containing route constants for navigation.
    - Why used: Provides a constant for the Data Quality Dashboard summary view route.
*/
import { DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes"; // Importing constant for route management
import { usePagePermissions } from "@/hooks/hasPagePermissions";

/*  
  @/hooks/useQualityDashboard
    - What it is: Custom React hooks for fetching data related to the Data Quality Dashboard.
    - Why used: To retrieve business unit data and dataset refresh statistics for display.
*/
import {
  useGetBusinessUnits,
} from "@/hooks/useQualityDashboard"; // Importing custom hooks to fetch business unit and dataset refresh data

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Text, // Fluent UI Text component for displaying text with various styles
  makeStyles, // Fluent UI hook for creating custom styles
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography
  Title3, // Fluent UI Title3 component for rendering third-level titles
  Spinner, // Fluent UI Spinner component for displaying loading indicators
} from "@fluentui/react-components"; // Fluent UI components for various UI elements like text, accordion, spinner, etc.

/*  
  next/link
    - What it is: Next.js Link component for client-side navigation.
    - Why used: Enables navigation to detailed views for each business unit.
*/
import Link from "next/link"; // Next.js Link component for navigation between pages

//---------------------- Styling -------------------------//

/**
 * `useStyles` function is used to define and return custom styles for the component.
 *
 * It defines styles for various sections, ensuring consistent spacing, typography, and alignment.
 * This function is used within the component to apply styles to specific elements.
 */
const useStyles = makeStyles({
  root: {
    // Base container styles
  },
  header: {
    marginBottom: tokens.spacingVerticalXXL, // Adding space below the header
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Making the title bold
    color: tokens.colorNeutralForeground1, // Setting the title color to neutral
    marginBottom: tokens.spacingVerticalS, // Adding space below the title
  },
  sectionTitle: {
    display: "flex", // Using flex layout for section title
    alignItems: "center", // Vertically aligning items in the section title
    gap: tokens.spacingHorizontalS, // Horizontal spacing between title and icon
    marginTop: tokens.spacingVerticalL, // Margin at the top of the section
    fontWeight: tokens.fontWeightSemibold, // Using semi-bold font weight for section titles
    color: tokens.colorNeutralForeground1, // Color for the section title text
  },
});

//---------------------- Component -------------------------//

/**
 * `DQDSummaryView` Component
 *
 * This component is responsible for rendering the Data Quality Dashboard's summary view, showing dataset highlights,
 * business unit-level data, and detailed refresh statistics in a user-friendly format. It integrates a dynamic accordion,
 * summary cards, and data tables for business units and dataset refresh metrics.
 *
 * It uses custom hooks to fetch the required data and dynamically updates the UI based on that data.
 *
 * @returns JSX.Element - The rendered content for the Data Quality Dashboard's summary view.
 */
export default function DQDSummaryView() {
  const styles = useStyles(); // Hook to apply styles to the component
  const { businessUnitsData, isFetching } = useGetBusinessUnits(); // Fetching business unit data and loading state

  const {canRead, isLoadingPermissions} = usePagePermissions("data-quality-dashboard-summary-view");

  // const [selectedCard, setSelectedCard] = useState<{ title: string } | null>(
  //   null
  // ); // State for the selected summary card (null if no card is selected)

  // State for controlling which accordion panel is open (only one panel can be open at a time)
  // const [openAccordionKey, setOpenAccordionKey] = useState<string | null>(null);

  // Summary cards that provide high-level dataset information
  const summaryCards = [
    {
      title: "Total Datasets", // Card title text
      count: businessUnitsData?.highlights?.total_datasets!, // Total datasets count from fetched data
      info: "Total number of datasets available across all business units.", // Info text for the card
    },
    {
      title: "Total Validated Datasets", // Card title text
      count: businessUnitsData?.highlights?.validated_datasets!, // Verified datasets count from fetched data
      percentage: businessUnitsData?.highlights?.validated_datasets_percentage!, // Percentage of verified datasets
      info: "Total number of datasets that have been validated.", // Info text for the card
      // onClick: () =>
      //   handleCardClick({
      //     title: "Dataset Refresh",
      //   }), // Handle click to show detailed dataset refresh stats
    },
    {
      title: "Successfully Validated Datasets", // Card title text
      count: businessUnitsData?.highlights?.passed_datasets!, // Trusted datasets count from fetched data
      percentage: businessUnitsData?.highlights?.passed_datasets_percentage!, // Percentage of trusted datasets
      info: "Datasets that are successfully validated and considered trusted for use.", // Info text for the card
    },
    {
      title: "Datasets Needing Attention", // Card title text
      count: businessUnitsData?.highlights?.failed_datasets!, // Datasets needing attention count from fetched data
      percentage: businessUnitsData?.highlights?.failed_datasets_percentage!, // Percentage of datasets needing attention
      info: "Datasets that failed verification checks or require further review.", // Info text for the card
    },
  ];

  // Column configuration for the L1 business unit dataset summary table
  const businessUnitColumns: ColumnConfig<any>[] = [
    {
      key: "L1_BUSINESS_UNIT",
      label: "L1 Business Unit",
      width: "auto",
      sortable: true, // Enables sorting functionality for the column
      render: (value, row, index) => (
        //  Link to the detailed view for the specific L1 Business Unit
        <Link
          href={`${DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE}/l1-business-unit/${value}`}
        >
          {value}
        </Link>
      ),
    },
    {
      key: "Total_Datasets",
      label: "Total Datasets",
      width: "auto",
      sortable: true, // Enables sorting functionality for the column 
    }, // Total datasets column
    {
      key: "Validated_Datasets", // Verified datasets column
      label: "Validated Datasets", // Column label
      width: "auto", // Column width
      sortable: true, // Enables sorting functionality for the column
    },
    {
      key: "Non_Validated_Datasets", // Unverified datasets column
      label: "Unvalidated Datasets", // Column label
      width: "auto", // Column width
      sortable: true, // Enables sorting functionality for the column
    },
  ];

  //---------------------- Loading State -------------------------//

  // Display a loading spinner while data is being fetched
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

  return (
    // Root container for the Data Integrity Results Summary page
    <div className={styles.root}>
      {/* Page Header */}
      <div className={styles.header}>
        {/* Main page title */}
        <Title3 className={styles.title}>Data Integrity Results Summary</Title3>
      </div>

      {/* Data Quality Summary Cards Section */}
      <L1UnitHighlights data={summaryCards} />

      {/* L1 Business Unit Dataset Summary Table */}
      <div className={styles.sectionTitle}>
        {/* Section title and help text */}
        <Text size={400} weight="semibold">
          L1 Business Unit Datasets Count Summary
        </Text>
        {/* Help icon with tooltip */}
        <Help info="This table provides a summary of datasets for each Level 1 Business Unit, displaying the total number of datasets along with their validation status (Validated vs. Unvalidated). Use this view to monitor overall data quality and identify areas that require attention. Click on a Business Unit to drill down into a detailed view for that unit." />
      </div>

      {/* L1 Business Unit-wise Summary Table */}
      <DataGrid
        columns={businessUnitColumns} // Table column definitions
        data={businessUnitsData?.businessUnits || []} // Table row data with safe fallback
        loading={isFetching} // Loading indicator for the table
      />
    </div>
  );
}
