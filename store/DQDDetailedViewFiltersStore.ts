/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines a Zustand store for managing the filters applied in the Data Quality Detailed View.
    - It handles the state of filters, including the catalog, schema, and dataset selections.
    - The store also manages the options available for each filter (catalog, schema, dataset) and allows applying or resetting the filters.
    - It provides derived values like whether there are any changes, whether the filters have been applied, and the dataset path based on the applied filters.
    - The store integrates with the application state using Zustand for efficient state management.
*/

//---------------------- Imports -------------------------//
/*  zustand
    - What it is: A small, fast state-management library for React applications.
    - Why used: Provides a simple API to create global stores (like this user store) without the boilerplate of Redux.
*/
import { create } from "zustand"; // Zustand for state management

/*  zustand/middleware (devtools)
    - What it is: Optional middleware to integrate the store with browser devtools.
    - Why used: Makes it easier to inspect and debug store changes during development.
*/
import { devtools } from "zustand/middleware"; // Zustand middleware for enabling devtools

//---------------------- Types -------------------------//

/**
 * `DQDDetailedViewFiltersState` defines the shape of the state for the Data Quality Detailed View Filters store.
 * - Includes both current (working) filter selections and applied (persisted) filter states.
 * - Includes actions to update the state and derived values for checking changes and enabling/disabling the "Apply" button.
 */
interface DQDDetailedViewFiltersState {
  // Current selections (working copy) of filters
  catalog: string; // Current selected catalog
  schema: string; // Current selected schema
  dataset: string; // Current selected dataset

  // Last APPLIED filters (persisted until next Apply)
  appliedCatalog: string; // Last applied catalog
  appliedSchema: string; // Last applied schema
  appliedDataset: string; // Last applied dataset

  // Available filter options for each selection
  catalogOptions: string[]; // List of available catalog options
  schemaOptions: string[]; // List of available schema options
  datasetOptions: string[]; // List of available dataset options

  // Action functions to update the filters
  setCatalog: (catalog: string) => void; // Updates the catalog selection
  setSchema: (schema: string) => void; // Updates the schema selection
  setDataset: (dataset: string) => void; // Updates the dataset selection

  // Functions to update the available options for filters
  setCatalogOptions: (opts: string[]) => void; // Sets the available catalog options
  setSchemaOptions: (opts: string[]) => void; // Sets the available schema options
  setDatasetOptions: (opts: string[]) => void; // Sets the available dataset options

  // Functions to manage filter state
  applyFilters: () => void; // Applies the current filter selections
  resetToApplied: () => void; // Resets the filters to the last applied state

  // Derived values
  hasChanges: () => boolean; // Checks if any filter changes have been made
  hasAppliedFilters: () => boolean; // Checks if any filters have been applied
  isApplyEnabled: () => boolean; // Determines if the "Apply" button should be enabled
  appliedDatasetPath: () => string | null; // Constructs the dataset path based on applied filters
}

//---------------------- Initial State -------------------------//

/**
 * `initialWorkingState` defines the default (empty) state for the current filter selections.
 */
const initialWorkingState = {
  catalog: "", // Default catalog (empty until selected)
  schema: "", // Default schema (empty until selected)
  dataset: "", // Default dataset (empty until selected)
};

/**
 * `initialAppliedState` defines the default (empty) state for the applied filters.
 */
const initialAppliedState = {
  appliedCatalog: "", // Default applied catalog (empty until applied)
  appliedSchema: "", // Default applied schema (empty until applied)
  appliedDataset: "", // Default applied dataset (empty until applied)
};

//---------------------- Store Creation -------------------------//

/**
 * `useDQDDetailedViewFiltersStore` creates a Zustand store to manage the state of the Data Quality Detailed View filters.
 * - This store handles both the working (current) state of the filters and the applied state that persists until the next apply.
 * - It provides methods to set filters, apply filters, reset filters, and check if changes have been made.
 */
export const useDQDDetailedViewFiltersStore = create<DQDDetailedViewFiltersState>()(
  devtools((set, get) => ({
    // Merge initial working state and applied state
    ...initialWorkingState,
    ...initialAppliedState,

    // Available options for the filters (empty initially)
    catalogOptions: [],
    schemaOptions: [],
    datasetOptions: [],

    // Action to set the catalog filter and reset dependent filters
    setCatalog: (catalog: string) =>
      set({
        catalog,
        schema: "", // Reset schema when catalog changes
        dataset: "", // Reset dataset when schema changes
        schemaOptions: [], // Clear schema options
        datasetOptions: [], // Clear dataset options
      }),

    // Action to set the schema filter and reset dependent dataset filter
    setSchema: (schema: string) =>
      set({
        schema, // Update schema
        dataset: "", // Reset dataset when schema changes
        datasetOptions: [], // Clear dataset options
      }),

    // Action to set the dataset filter
    setDataset: (dataset: string) =>
      set({ dataset }),

    // Actions to update the available options for each filter
    setCatalogOptions: (catalogOptions: string[]) => set({ catalogOptions }),
    setSchemaOptions: (schemaOptions: string[]) => set({ schemaOptions }),
    setDatasetOptions: (datasetOptions: string[]) => set({ datasetOptions }),

    // Applies the current filter selections and stores them as applied filters
    applyFilters: () =>
      set((state) => ({
        appliedCatalog: state.catalog, // Persist current catalog
        appliedSchema: state.schema, // Persist current schema
        appliedDataset: state.dataset, // Persist current dataset
      })),

    // Resets the current filters to the last applied values
    resetToApplied: () =>
      set((state) => ({
        catalog: state.appliedCatalog, // Reset to applied catalog
        schema: state.appliedSchema, // Reset to applied schema
        dataset: state.appliedDataset, // Reset to applied dataset
      })),

    // Derived state: Checks if any filter has changed from the applied state
    hasChanges: () => {
      const state = get();
      // Returns true if any current filter differs from the applied filter
      return (
        state.catalog !== state.appliedCatalog ||
        state.schema !== state.appliedSchema ||
        state.dataset !== state.appliedDataset
      );
    },

    // Derived state: Checks if any filters have been applied
    hasAppliedFilters: () => {
      const state = get();
      // Returns true if all applied filters are set (non-empty)
      return !!(state.appliedCatalog && state.appliedSchema && state.appliedDataset);
    },

    // Derived state: Checks if the "Apply" button should be enabled
    isApplyEnabled: () => {
      const state = get();
      // Enable Apply only if all current filters are selected (non-empty)
      return !!(state.catalog && state.schema && state.dataset);
    },

    // Derived state: Constructs the dataset path based on applied filters (if available)
    // Sample Output: "dset_dev.us_datalake_mng.valuetrak_852_monthly" or "null"
    appliedDatasetPath: () => {
      const state = get();
      // Return the full dataset path separated by '.' if all applied filters are set
      if (state.appliedCatalog && state.appliedSchema && state.appliedDataset) {
        return `${state.appliedCatalog}.${state.appliedSchema}.${state.appliedDataset}`;
      }
      return null;
    },
  }))
);
