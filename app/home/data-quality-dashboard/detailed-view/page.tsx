/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the detailed view page for the Data Quality (DQD) Results Explorer within the Teva Data Integrity Automation Dashboard.
    - The page allows users to explore various aspects of data quality, including Overview, Metadata, Data Profiling, Data Drift, and Data Health.
    - It includes a set of tabs for navigating between these sections.
    - The page is wrapped in a consistent layout and uses dynamic filters (applied through the `DQDDetailedViewFilters` component).
    - The content dynamically updates based on the user's filter selections and provides an empty state message when no dataset is selected.
*/

//---------------------- Client Component Directive ----------------------//
// Inform Next.js that this component should be rendered on the client
// (in the user's browser) because it uses React hooks and interactive UI.
// Ensures that this component uses client-side rendering (CSR)
"use client";

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  makeStyles, // Fluent UI hook to create custom styles
  Title3, // Fluent UI component for headers
  tokens, // Fluent UI tokens for styling
  Text, // Fluent UI text component
  TabList, // Fluent UI component for tab navigation
  Tab, // Fluent UI component for individual tabs
  Spinner,
} from "@fluentui/react-components"; // Fluent UI React component library

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { useState } from "react"; // React hook for managing state
import { Overview } from "@/components/ui/Overview"; // Component for displaying Overview content
import { DataProfile } from "@/components/ui/DataProfile"; // Component for displaying Data Profiling content
import { Metadata } from "@/components/ui/Metadata"; // Component for displaying Metadata content
import { DataDrift } from "@/components/ui/DataDrift"; // Component for displaying Data Drift content
import { DQDDetailedViewFilters } from "@/components/ui/DQDDetailedViewFilters"; // Filters component for the Data Quality Detailed View
import { DataHealth } from "@/components/ui/DataHealth"; // Component for displaying Data Health content

/*  
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store for managing the state of dataset filters in the Data Quality Detailed View.
    - Why used: To access the currently applied dataset path and filter values.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Store for managing the filters state
import { Info16Filled } from "@fluentui/react-icons"; // Fluent UI icon for empty state
import { usePagePermissions } from "@/hooks/hasPagePermissions";

//---------------------- Custom Styles -------------------------//
/**
 * `useStyles` hook is used to create custom styles using Fluent UI's `makeStyles`.
 * - Defines styles for root, header, title, and empty state.
 */
const useStyles = makeStyles({
  root: {
    // Styles for the root container of the page (not applied yet).
  },
  header: {
    marginBottom: tokens.spacingVerticalXXL, // Adds space below the header
  },
  title: {
    fontWeight: tokens.fontWeightBold, // Sets the font weight to bold
    color: tokens.colorNeutralForeground1, // Sets the title color to primary neutral color
    marginBottom: tokens.spacingVerticalS, // Adds space below the title
  },
  emptyState: {
    display: "flex",
    flexDirection: "column", // Aligns children vertically
    alignItems: "center", // Centers children horizontally
    justifyContent: "center", // Centers children vertically
    minHeight: "60vh", // Minimum height for the empty state message
    textAlign: "center", // Centers text within the container
    color: tokens.colorNeutralForeground2, // Applies a muted color to the text
  },
  emptyIcon: {
    marginBottom: tokens.spacingVerticalL, // Adds space below the icon
    opacity: 0.6, // Makes the icon slightly transparent
  },
});

//---------------------- Component: DQDDetailedView -------------------------//

/**
 * `DQDDetailedView` Component
 * This component renders the Data Quality Detailed View page.
 * - Displays a header and dynamic content based on selected filters.
 * - Includes tabs for navigating between different data quality sections: Overview, Metadata, Data Profiling, Data Drift, and Data Health.
 * - Shows an empty state when no dataset is selected, guiding the user to apply filters.
 *
 * @returns JSX.Element - The rendered component for the page.
 */
export default function DQDDetailedView() {
  // Using the `useStyles` hook to get custom styles for the component
  const styles = useStyles();

  const { canRead, isLoadingPermissions } = usePagePermissions("data-quality-dashboard-detailed-view");

  // State to track the selected tab (defaults to "OVERVIEW")
  const [selectedTab, setSelectedTab] = useState("OVERVIEW");

  // Fetching the applied dataset path(e.g., "dset_dev.us_datalake_mng.valuetrak_852_monthly") from the store (which contains the selected filters)
  const datasetPath = useDQDDetailedViewFiltersStore((state) =>
    state.appliedDatasetPath()
  );

  // Checking if any filters have been applied using the filter store
  const canShowData = useDQDDetailedViewFiltersStore((state) =>
    state.hasAppliedFilters()
  );

  // Tabs configuration - Defines the list of available tabs for navigation
  const tabs = [
    { value: "OVERVIEW", label: "Overview" },
    { value: "METADATA", label: "Metadata" },
    { value: "DATA_PROFILING", label: "Data Profiling" },
    { value: "DATA_DRIFT", label: "Data Drift" },
    { value: "DATA_HEALTH", label: "Data Health" },
  ];

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
    }

    if(!isLoadingPermissions && !canRead){
      window.location.href = "/forbidden";
    }


  return (
    <div className={styles.root}>
      {/* Header Section */}
      <div className={styles.header}>
        {/* Header content */}
        <Title3 className={styles.title}>
          Data Integrity Results Explorer
        </Title3>
      </div>

      {/* Data Quality Dashboard Detailed View Filters Section */}
      <DQDDetailedViewFilters />

      {/* Conditional Rendering: If filters are applied, show data content */}
      {canShowData ? (
        <div>
          {/* Dataset Information */}
          <div className="mt-6">
            {/* Dataset Name */}
            <Text size={400} weight="semibold" block>
              Dataset Name:
              <span className="ml-1 text-neutral-foreground-2">
                {datasetPath}
              </span>
            </Text>
            {/* Dataset Description */}
            <Text size={200}>
              Showing results from the latest run. For detailed metrics within a
              date range, go to the Data Health tab.
            </Text>
          </div>

          {/* Tab Navigation */}
          <TabList
            selectedValue={selectedTab} // The currently selected tab
            onTabSelect={(event, data) => setSelectedTab(data.value as string)} // Set the selected tab on user click
            appearance="subtle" // Subtle tab appearance
            className="my-4 border-b border-gray-200" // Styles for tab container
          >
            {tabs.map((tab) => (
              <Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tab>
            ))}
          </TabList>

          {/* Render content based on selected tab */}
          {/* Overview, Metadata, Data Profile, Data Drift, and Data Health tabs */}
          {/* Overview tab */}
          {selectedTab === "OVERVIEW" && <Overview />}
          {/* Metadata tab */}
          {selectedTab === "METADATA" && <Metadata />}
          {/* Data Profile tab */}
          {selectedTab === "DATA_PROFILING" && <DataProfile />}
          {/* Data Drift tab */}
          {selectedTab === "DATA_DRIFT" && <DataDrift />}
          {/* Data Health tab */}
          {selectedTab === "DATA_HEALTH" && <DataHealth />}
        </div>
      ) : (
        // Empty State – No dataset selected
        <div className={styles.emptyState}>
          {/* Empty state icon */}
          <Info16Filled fontSize={48} className={styles.emptyIcon} />
          {/* Empty state text */}
          <Text size={500} weight="semibold" block>
            No dataset selected
          </Text>
          {/* Empty state description */}
          <Text size={300} className="mt-4 max-w-md text-center!">
            Please select a <strong>Catalog → Schema → Dataset</strong> using
            the filters above and click <strong>Apply</strong> to explore data
            quality insights.
          </Text>
        </div>
      )}
    </div>
  );
}
