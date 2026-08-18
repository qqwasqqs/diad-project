/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script renders the KPI filter options for the Teva Data Integrity Automation Dashboard.
    - It provides dropdowns for selecting a Brand, KPI, and Vendor.
    - The options for KPI and Vendor are dynamically populated based on the selected Brand and KPI.
    - Allows users to apply or reset filters to view the desired data.
    - The component uses hooks and state management to handle the filter values and logic.
*/

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
  Text, // Text component from Fluent UI to display titles and labels
  makeStyles, // Custom styling hook to generate dynamic CSS styles for the component
  tokens, // Fluent UI design tokens (for consistent styling, colors, spacing, etc.)
  Dropdown, // Dropdown component for selection of options
  Field, // Field component to label inputs and group them with specific styles
  Option, // Option component to represent each item in the dropdown
  Button, // Button component for applying and resetting filters
} from "@fluentui/react-components";

/*
  @/store/kpiDetailedViewFiltersStore
    - What it is: A Zustand store module to manage the state of KPI detailed view filters.  
    - Why used: This store centralizes the filter state management, making it easier
      to access and update filter values across the component.
*/
import { useKPIDetailedViewFilterStore } from "@/store/kpiDetailedViewFiltersStore";
// Custom hook to manage and access the filter store for Brand, KPI, and Vendor states.

/*  
  @/hooks/useKpiDashboard
    - What it is: A custom React hook to fetch KPI filter data from the backend API.
    - Why used: This hook abstracts the logic for data fetching, making it reusable
      and keeping the component clean and focused on rendering.
*/
import { useGetKPIFilters } from "@/hooks/useKpiDashboard";
// Custom hook to fetch KPI filter data (Brand, KPI, Vendor) from the backend.

/*
  react
    - What it is: React is a JavaScript library for building user interfaces,
      particularly single-page applications where data changes over time.
*/
import { useEffect } from "react";
// useEffect hook for managing side effects like populating options based on state changes.

//---------------------- Styles -------------------------//

/**
 * useKPIDetailedViewFiltersStyles
 *
 * Custom hook to define styles for the KPI filters section.
 * The styles help with the layout of the filters, buttons, and field elements.
 */
const useStyles = makeStyles({
  root: {
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXXL}`, // Adds padding around the filters container
    boxShadow: tokens.shadow4, // Adds shadow to give a raised appearance
    borderRadius: tokens.borderRadiusLarge, // Rounds the corners of the container
  },
  filter: {
    display: "flex", // Flexbox for arranging items
    flexWrap: "wrap", // Wraps the items onto multiple lines when needed
    gap: tokens.spacingHorizontalL, // Spacing between filter fields
    marginTop: tokens.spacingVerticalL, // Adds margin at the top
    marginBottom: tokens.spacingVerticalL, // Adds margin at the bottom
    alignItems: "end", // Aligns items to the bottom
  },
});

//---------------------- Component -------------------------//

/**
 * KPIDetailedViewFilters Component
 *
 * This component renders the filter options for the KPI dashboard. It allows users to filter KPI data based on:
 * - Brand
 * - KPI
 * - Vendor
 *
 * The filter options for KPI and Vendor are dynamically populated based on the selected Brand and KPI.
 * - The component uses state management (via `useKPIDetailedViewFilterStore`) to track the selected filters.
 * - Filters can be applied or reset using the respective buttons.
 *
 * Sample Input:
 *   - Brand: "Brand A"
 *   - KPI: "KPI 1"
 *   - Vendor: "Vendor X"
 *
 * Sample Output:
 *   - Dynamically populated dropdowns for KPI and Vendor based on the selected Brand.
 *   - The Apply button applies the selected filters and updates the data.
 *   - The Reset button resets the filters to the previously applied values.
 */
export function KPIDetailedViewFilters() {
  const styles = useStyles(); // Apply custom styles to the component
  // Fetch filter data (brand, kpi, vendor) from the backend.
  const { filtersData, isFetching } = useGetKPIFilters();

  // Destructure filter states and actions from the custom filter store.
  const {
    brand, // Selected brand
    kpi, // Selected KPI
    vendor, // Selected vendor
    brandOptions, // Available options for Brand
    kpiOptions, // Available options for KPI based on selected brand
    vendorOptions, // Available options for Vendor based on selected brand and KPI

    setBrand, // Action to update the selected brand
    setKpi, // Action to update the selected KPI
    setVendor, // Action to update the selected vendor

    setBrandOptions, // Action to set the available brand options
    setKpiOptions, // Action to set the available KPI options
    setVendorOptions, // Action to set the available vendor options

    applyFilters, // Action to apply the selected filters
    resetToApplied, // Action to reset filters to previously applied values
    hasChanges, // Check if any changes were made to the filters
    hasAppliedFilters, // Check if filters have been applied previously
    isApplyEnabled, // Check if the Apply button should be enabled
  } = useKPIDetailedViewFilterStore();

  /* -----------------------------
     Populate Brand Options
  ------------------------------ */
  useEffect(() => {
    // Example filtersData:
    // [
    //   { BRAND: "Nike", KPI_NAME: "Sales", DATA_VENDOR: "VendorA" },
    //   { BRAND: "Adidas", KPI_NAME: "Revenue", DATA_VENDOR: "VendorB" },
    //   { BRAND: "Nike", KPI_NAME: "Profit", DATA_VENDOR: "VendorC" }
    // ]

    if (Array.isArray(filtersData)) {
      const brands = [
        ...new Set(
          // Example:
          // filtersData.map(...) → ["Nike", "Adidas", "Nike"]
          filtersData.map((item: any) => item.BRAND)
        ),
      ]
        // new Set(...) removes duplicates → ["Nike", "Adidas"]
        // .sort() alphabetically → ["Adidas", "Nike"]
        .sort(); // Extract unique brands and sort them alphabetically

      // Final brandOptions example:
      // ["Adidas", "Nike"]
      setBrandOptions(brands); // Set the options for the Brand dropdown
    }
  }, [filtersData, setBrandOptions]); // Re-run when data changes

  /* -----------------------------
      Populate KPI Options (depends on brand)
  ------------------------------ */
  useEffect(() => {
    // Example selected brand:
    // brand = "Nike"

    if (!brand || !filtersData) {
      setKpiOptions([]); // Clear KPI options if no brand is selected
      return;
    }

    // Filter KPI options based on the selected brand
    const kpis = [
      ...new Set(
        filtersData
          // Example when brand = "Nike":
          // [
          //   { BRAND: "Nike", KPI_NAME: "Sales" },
          //   { BRAND: "Nike", KPI_NAME: "Profit" }
          // ]
          .filter((item: any) => item.BRAND === brand)
          // .map(...) → ["Sales", "Profit"]
          .map((item: any) => item.KPI_NAME)
      ),
    ]
      // new Set removes duplicates
      // .sort() → ["Profit", "Sales"]
      .sort() as string[]; // Extract unique KPIs and sort them alphabetically

    // Final kpiOptions example:
    // ["Profit", "Sales"]
    setKpiOptions(kpis); // Set the options for the KPI dropdown
  }, [brand, filtersData, setKpiOptions]); // Re-run when the brand or data changes

  /* -----------------------------
      Populate Vendor Options (depends on brand + kpi)
  ------------------------------ */
  useEffect(() => {
    // Example selected values:
    // brand = "Nike"
    // kpi   = "Sales"

    if (!brand || !kpi || !filtersData) {
      setVendorOptions([]); // Clear Vendor options if no brand or KPI is selected
      return;
    }

    // Filter vendor options based on selected brand and KPI
    const vendors = [
      ...new Set(
        filtersData
          // Example when brand = "Nike" and kpi = "Sales":
          // [
          //   { DATA_VENDOR: "VendorA" },
          //   { DATA_VENDOR: "VendorD" }
          // ]
          .filter(
            (item: any) =>
              item.BRAND === brand && item.KPI_NAME === kpi
          )
          // .map(...) → ["VendorA", "VendorD"]
          .map((item: any) => item.DATA_VENDOR)
      ),
    ]
      // new Set removes duplicates
      // .sort() → ["VendorA", "VendorD"]
      .sort() as string[]; // Extract unique vendors and sort them alphabetically

    // Final vendorOptions example:
    // ["VendorA", "VendorD"]
    setVendorOptions(vendors); // Set the options for the Vendor dropdown
  }, [brand, kpi, filtersData, setVendorOptions]); // Re-run when brand, kpi, or data changes

  /* -----------------------------
      Apply + Reset Handlers
  ------------------------------ */
  const handleApply = () => {
    applyFilters(); // Apply the selected filters to update the data
    console.log("KPI Filters Applied:", { brand, kpi, vendor }); // Log the applied filters for debugging
  };

  const handleReset = () => {
    resetToApplied(); // Reset filters to previously applied values
  };

  return (
    <div className={styles.root}>
      {/* Title for the filters section */}
      <Text size={400} weight="semibold">
        Select KPI Filters
      </Text>

      {/* Filters Section */}
      <div className={styles.filter}>
        {/* Brand Dropdown */}
        <Field label="Brand Name" required>
          <Dropdown
            placeholder="Select Brand" // Filter placeholder text
            value={brand || ""} // Dropdown value
            selectedOptions={brand ? [brand] : []} // Currently selected brand
            appearance="filled-darker" // Darker filled style
            disabled={isFetching} // Disable if fetching data or no options available
            onOptionSelect={(_, dropdown) => setBrand(dropdown.optionValue ?? "")} // Update brand on selection
          >
            {/* All Dropdown options */}
            <Option key={"All"} value={"All"}>
              All
            </Option>
            {/* Dropdown options for available brands */}
            {brandOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* KPI Dropdown */}
        <Field label="KPI Name" required>
          <Dropdown
            placeholder="Select KPI" // Filter placeholder text
            value={kpi || ""} // Dropdown value
            selectedOptions={kpi ? [kpi] : []} // Currently selected KPI
            appearance="filled-darker" // Darker filled style
            disabled={!brand} // Disable if no brand or KPI options available
            onOptionSelect={(_, dropdown) => setKpi(dropdown.optionValue ?? "")} // Update KPI on selection
          >
            {/* All Dropdown options */}
            <Option key={"All"} value={"All"}>
              All
            </Option>
            {/* Dropdown options for available KPIs */}
            {kpiOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Vendor Dropdown */}
        <Field label="Data Vendor" required>
          <Dropdown
            placeholder="Select Vendor" // Filter placeholder text
            value={vendor || ""} // Dropdown value
            selectedOptions={vendor ? [vendor] : []} // Currently selected vendor
            appearance="filled-darker" // Darker filled style
            disabled={!kpi} // Disable if no KPI or Vendor options available
            onOptionSelect={(_, dropdown) => setVendor(dropdown.optionValue ?? "")} // Update Vendor on selection
          >
            {/* All Dropdown options */}
            <Option key={"All"} value={"All"}>
              All
            </Option>
            {/* Dropdown options for available vendors */}
            {vendorOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Apply and Reset Buttons */}
        <div className="flex gap-3">
          <Button
            appearance="primary" // Button appearance
            onClick={handleApply} // Calls the function to apply selected filters
            disabled={!isApplyEnabled() || !hasChanges()} // Disable if the apply button shouldn't be enabled
          >
            Apply
          </Button>

          <Button
            appearance="secondary" // Button appearance
            onClick={handleReset} // Calls the function to reset applied filters
            disabled={!hasAppliedFilters() || !hasChanges()} // Disable if no filters are applied or no changes
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
