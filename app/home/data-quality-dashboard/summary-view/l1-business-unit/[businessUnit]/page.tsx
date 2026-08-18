/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script represents a page component for the "Business Unit" view in the Teva Data Integrity Automation Dashboard.
    - It displays a title, dropdown for selecting the business unit, and tabs for different data views (Data Summary and Data Health).
    - The component uses Fluent UI components for layout and styling.
    - It integrates with hooks for fetching business unit names and handles URL parameter manipulation.
    
    Features:
    - Displays business unit information and allows users to select a business unit.
    - Switches between different data views using tabs.
    - Ensures responsive layout and handles routing logic.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  @/components/ui/BusinessUnitDataHealth
    - What it is: A component that displays data health metrics for a business unit.
    - Why used: Renders the Data Health tab content for the selected business unit.
*/
import { BusinessUnitDataHealth } from "@/components/ui/BusinessUnitDataHealth";
/*  @/components/ui/BusinessUnitDataSummary
    - What it is: A component that displays data summary metrics for a business unit.
    - Why used: Renders the Data Summary tab content for the selected business unit.
*/
import { BusinessUnitDataSummary } from "@/components/ui/BusinessUnitDataSummary";

/*  @/constants/routes
    - What it is: A local module defining application route constants.
    - Why used: Provides the path to the Data Quality dashboard summary view for navigation.
*/
import { DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE } from "@/constants/routes";

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  tokens, // Fluent UI design tokens for consistent spacing, colors, and typography
  makeStyles, // Fluent UI hook for creating custom style
  Title3, // Fluent UI Title3 component for rendering third-level titles
  SelectionEvents,
  OptionOnSelectData,
  TabList, // Fluent UI component for tab navigation
  Tab, // Fluent UI component for individual tabs
  Dropdown, // Dropdown component for selection of options
  Field, // Field component to label inputs and group them with specific styles
  Option, // Option component to represent each item in the dropdown
  Spinner,
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
    - Why used: Provides hooks for async parameter resolution, managing component state and side effects.
*/
import { use, useEffect, useState } from "react";

/*  
  "@/lib/helper"
    - What it is: Local helper functions for route parameter encoding/decoding.
    - Why used: Simplifies handling of URL parameters for business unit names.
*/
import { decodeRouteParam, formatRouteParam } from "@/lib/helper";

/*  
  "@/hooks/useQualityDashboard"
    - What it is: Custom hooks for fetching data related to the quality dashboard.
    - Why used: Fetches business unit names for populating the dropdown.
*/
import { useGetBusinessUnitNames } from "@/hooks/useQualityDashboard";
import { usePagePermissions } from "@/hooks/hasPagePermissions";

//---------------------- Custom Styles using Fluent UI Tokens --------------------//
/**
 * Custom styles for the Business Unit page using Fluent UI's `makeStyles`.
 * This ensures that the page has consistent layout, typography, and spacing.
 */
const useStyles = makeStyles({
  root: {
    paddingTop: tokens.spacingHorizontalM, // Adds spacing at the top of the root div
  },
  header: {
    alignItems: "left", // left align items
    display: "flex", // Flexbox layout for header
    flexDirection: "column", // Direction for the items
    marginBottom: tokens.spacingVerticalL, // Bottom margin for spacing
    gap: tokens.spacingHorizontalL,             // Gap between child elements
  },
  filterContainer: {
    display: "flex",        // Arrange filters horizontally
    flexWrap: "wrap",       // Wrap filters on smaller screens
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Bold title
    color: tokens.colorNeutralForeground1, // Neutral foreground color for text
    marginBottom: tokens.spacingVerticalS, // Vertical margin at the bottom
  },
  subtitle: {
    color: tokens.colorNeutralForeground3, // Lighter color for subtitles
  },
  sectionTitle: {
    display: "flex", // Flex layout for section title
    alignItems: "center", // Align items vertically
    gap: tokens.spacingHorizontalS, // Horizontal spacing between title and icon
    marginTop: tokens.spacingVerticalL, // Margin at the top for spacing
    fontWeight: tokens.fontWeightSemibold, // Semi-bold font for section title
    color: tokens.colorNeutralForeground1, // Neutral color for text
  },
});

//---------------------- Interface for Props -------------------------//
/**
 * `BusinessUnitProps` is the type for props that the `BusinessUnit` component expects.
 * It contains the `params` prop which includes the `businessUnit` parameter from the URL.
 */
interface BusinessUnitProps {
  params: Promise<{ businessUnit: string }>; // URL parameter containing business unit info
}

//---------------------- Main BusinessUnit Component ------------------------//
/**
 * BusinessUnit Component
 * This component renders the Business Unit page, which includes a dropdown to select the business unit
 * and tabs to view different data (Data Summary, Data Health).
 *
 * @param params - URL params containing selected business unit name(e.g., "US%20Commercial") from Data Quality Dashboard Summary View page.
 * @returns JSX.Element - The component structure, including title, dropdown, and tabs.
 */
export default function BusinessUnit({ params }: BusinessUnitProps) {

  const {canRead, isLoadingPermissions} = usePagePermissions("data-quality-dashboard-summary-view");

  const { businessUnit } = use(params); // Extracts the businessUnit value from the URL params
  const { businessUnitNames } = useGetBusinessUnitNames(); // Hook to fetch business unit names from an API
  const router = useRouter(); // Next.js router hook for routing
  const styles = useStyles(); // Hook to apply custom styles
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>(""); // State to store the currently selected businessUnit
  const [selectedTab, setSelectedTab] = useState<string>("DATA_SUMMARY"); // State to track the selected tab

  // Tab configuration for Data Summary and Data Health
  const tabs = [
    { value: "DATA_SUMMARY", label: "Data Summary" },
    { value: "DATA_HEALTH", label: "Data Health" },
  ];

  // Effect hook to update the selected businessUnit when the businessUnit prop changes
  useEffect(() => {
    if (businessUnit) setSelectedBusinessUnit(decodeRouteParam(businessUnit)); // Decodes the business unit parameter for display
  }, [businessUnit]);

  // Event handler for selecting a businessUnit from the dropdown
  const handleBusinessUnitSelect = (
    event: SelectionEvents,
    data: OptionOnSelectData
  ) => {
    const option = data?.optionValue || ""; // Extract the selected businessUnit value
    router.replace(
      `${DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE}/l1-business-unit//${option}`
    ); // Navigate to the new route
  };

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
    <div className={styles.root}>
      {/* Header Section */}
      <div className={styles.header}>
        {/* Title Section */}
        <Title3 className={styles.title}>
          {formatRouteParam(businessUnit)}
          {/* Displays the formatted business unit */}
        </Title3>

        <div className={styles.filterContainer}>
        {/* Dropdown for selecting business unit */}
        <Field label="L1 Business Unit">
          <Dropdown
            selectedOptions={[selectedBusinessUnit]} // Sets the selected businessUnit
            value={selectedBusinessUnit} // Bound to the selected businessUnit state
            appearance="filled-darker" // Styling appearance of the dropdown
            onOptionSelect={handleBusinessUnitSelect} // Event handler for selection change
          >
            {/* Map through the fetched business units and display options */}
            {(businessUnitNames || []).map((unit: any, idx: number) => (
              <Option key={idx} value={unit.L1_BUSINESS_UNIT}>
                {unit.L1_BUSINESS_UNIT}
              </Option>
            ))}
          </Dropdown>
        </Field>
        </div>
      </div>

      {/* Tabs for Data Summary and Data Health */}
      <TabList
        selectedValue={selectedTab} // Controlled component for the selected tab
        onTabSelect={(event, data) => setSelectedTab(data.value as string)} // Tab selection event handler
        appearance="subtle" // Subtle appearance for tabs
        className="mb-4 border-b border-gray-200" // Styling for tab border
      >
        {tabs.map((tab) => (
          // Render each tab dynamically from configuration
          <Tab key={tab.value} value={tab.value}>
            {tab.label}
          </Tab>
        ))}
      </TabList>

      {/* Conditionally render Business Unit Data Summary or Data Health based on selected tab */}
      {/* Render Business Unit Data Summary when the "Data Summary" tab is selected */}
      {selectedTab === "DATA_SUMMARY" && (
        <BusinessUnitDataSummary businessUnit={businessUnit} />
      )}

      {/* Render Business Unit Data Health when the "Data Health" tab is selected */}
      {selectedTab === "DATA_HEALTH" && (
        <BusinessUnitDataHealth businessUnit={businessUnit} />
      )}
    </div>
  );
}
