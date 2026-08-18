/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines the Zustand store (`useKPIDetailedViewFilterStore`) for managing the state of KPI filter selections.
    - The store handles the current selected filters (Brand, KPI, Vendor) as well as the last applied filters.
    - It also manages the filter options for each dropdown (Brand, KPI, Vendor) and provides utility functions for applying, resetting, and validating filters.
    - The store uses Zustand middleware for debugging (`devtools`).
*/

//---------------------- Imports -------------------------//
/*  zustand
    - What it is: A small, fast state-management library for React applications.
    - Why used: Provides a simple API to create global stores (like this user store) without the boilerplate of Redux.
*/
import { create } from "zustand"; // Zustand library to manage state

/*  zustand/middleware (devtools)
    - What it is: Optional middleware to integrate the store with browser devtools.
    - Why used: Makes it easier to inspect and debug store changes during development.
*/
import { devtools } from "zustand/middleware"; // Middleware for debugging Zustand state in dev tools

//---------------------- State Interface -------------------------//

/**
 * KpiDetailedViewFilterState Interface
 *
 * This interface defines the state structure for the KPI filter store.
 * - It includes both the working filter state (current selections) and the applied filter state (saved until the next apply).
 * - It also includes the available options for each filter (Brand, KPI, Vendor).
 * - Functions are provided to update the filter state, apply/reset filters, and check if filters are enabled.
 */
interface KpiDetailedViewFilterState {
  // Current selections (working copy)
  brand: string; // Selected Brand
  kpi: string; // Selected KPI
  vendor: string; // Selected Vendor

  // Last APPLIED filters (persisted until next Apply)
  appliedBrand: string; // Last applied Brand filter
  appliedKpi: string; // Last applied KPI filter
  appliedVendor: string; // Last applied Vendor filter

  // Filter options
  brandOptions: string[]; // Available Brand options
  kpiOptions: string[]; // Available KPI options (based on the selected Brand)
  vendorOptions: string[]; // Available Vendor options (based on the selected Brand and KPI)

  // Functions for managing state
  setBrand: (brand: string) => void; // Function to set the selected Brand
  setKpi: (kpi: string) => void; // Function to set the selected KPI
  setVendor: (vendor: string) => void; // Function to set the selected Vendor

  setBrandOptions: (opts: string[]) => void; // Function to set the Brand options
  setKpiOptions: (opts: string[]) => void; // Function to set the KPI options
  setVendorOptions: (opts: string[]) => void; // Function to set the Vendor options

  // Functions to apply, reset, or clear filters
  applyFilters: () => void; // Function to apply the selected filters
  resetToApplied: () => void; // Function to reset filters to the last applied state
  resetToNone: () => void; // Function to reset all filters to their initial state (empty)

  // Derived values for enabling buttons and checking filter status
  isApplyEnabled: () => boolean; // Returns true if filters can be applied (i.e., all are selected)
  hasChanges: () => boolean; // Returns true if any filter has been changed from its last applied value
  hasAppliedFilters: () => boolean; // Returns true if filters have been applied previously
  appliedKpiPath: () => string | null; // Returns a concatenated string of applied filters (for URL path or logs)
}

//---------------------- Initial States -------------------------//

/**
 * initialWorkingState
 * The initial state for the working (current) filter selections. All values are set to empty strings initially.
 */
const initialWorkingState = {
  brand: "", // Empty brand selection
  kpi: "", // Empty KPI selection
  vendor: "", // Empty vendor selection
};

/**
 * initialAppliedState
 * The initial state for the applied filters. All values are set to empty strings initially.
 * These represent the last filters that were applied and are persisted until the next "Apply".
 */
const initialAppliedState = {
  appliedBrand: "", // Last applied brand
  appliedKpi: "", // Last applied KPI
  appliedVendor: "", // Last applied vendor
};

//---------------------- Store Creation -------------------------//

/**
 * useKPIDetailedViewFilterStore
 * This store manages the state of KPI filter selections, including:
 * - The current selected filters (brand, KPI, vendor).
 * - The last applied filters (persisted until the next apply).
 * - The available filter options for each category (Brand, KPI, Vendor).
 * 
 * Functions to update filters, apply filters, reset to applied filters, and check filter states are included.
 * The store uses Zustand's `devtools` middleware for state debugging.
 */
export const useKPIDetailedViewFilterStore = create<KpiDetailedViewFilterState>()(
  devtools((set, get) => ({
    // Initializing state by merging the working and applied states.
    ...initialWorkingState,
    ...initialAppliedState,

    // Initial filter options (empty arrays at the start).
    brandOptions: [],
    kpiOptions: [],
    vendorOptions: [],

    // Function to set the selected brand, and reset KPI & Vendor selections.
    setBrand: (brand) =>
      set({
        brand, // Update brand
        kpi: "All", // Reset KPI selection
        vendor: "All", // Reset vendor selection
        kpiOptions: [], // Reset available KPI options
        vendorOptions: [], // Reset available vendor options
      }),

    // Function to set the selected KPI, and reset Vendor selection.
    setKpi: (kpi) =>
      set({
        kpi, // Update KPI
        vendor: "All", // Reset vendor selection
        vendorOptions: [], // Reset available vendor options
      }),

    // Function to set the selected vendor.
    setVendor: (vendor) => set({ vendor }),

    // Functions to set available options for each filter.
    setBrandOptions: (opts) => set({ brandOptions: opts }),
    setKpiOptions: (opts) => set({ kpiOptions: opts }),
    setVendorOptions: (opts) => set({ vendorOptions: opts }),

    // Function to apply the selected filters and persist them.
    applyFilters: () =>
      set((state) => ({
        appliedBrand: state.brand, // Persist selected brand
        appliedKpi: state.kpi, // Persist selected KPI
        appliedVendor: state.vendor, // Persist selected vendor
      })),

    // Function to reset filters to the last applied values.
    resetToApplied: () =>
      set((state) => ({
        brand: state.appliedBrand, // Reset to last applied brand
        kpi: state.appliedKpi, // Reset to last applied KPI
        vendor: state.appliedVendor, // Reset to last applied vendor
      })),

    // Function to reset all filters to their initial empty state.
    resetToNone: () =>
      set(() => ({
        brand: "", // Reset brand to empty
        kpi: "", // Reset KPI to empty
        vendor: "", // Reset vendor to empty
      })),

    // Function to check if the Apply button should be enabled (i.e., all filters are selected).
    isApplyEnabled: () => get().brand !== "" && get().kpi !== "" && get().vendor !== "",

    // Function to check if any filter has been changed from the last applied value.
    hasChanges: () =>
      get().brand !== get().appliedBrand ||
      get().kpi !== get().appliedKpi ||
      get().vendor !== get().appliedVendor,

    // Function to check if filters have been applied before.
    hasAppliedFilters: () =>
      get().appliedBrand !== "" && get().appliedKpi !== "" && get().appliedVendor !== "",

    // Function to return a concatenated string representing the applied filters, for example: "Brand/KPI/Vendor".
    appliedKpiPath: () => {
      const { appliedBrand, appliedKpi, appliedVendor } = get();
      // Return the full KPI path separated by '/' if all applied filters are set
      return appliedBrand && appliedKpi && appliedVendor
        ? `${appliedBrand}/${appliedKpi}/${appliedVendor}`
        : null; // Return null if any filter is empty
    },
  }))
);

