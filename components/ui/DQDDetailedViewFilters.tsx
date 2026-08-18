/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script handles the Data Quality Detailed View Filters in the Teva Data Integrity Automation Dashboard.
    - The filters allow users to select a catalog, schema, and dataset to view specific data quality insights.
    - It interacts with the backend API to fetch options for catalogs, schemas, and datasets based on the user's selections.
    - It applies or resets the filters based on user actions, and the selected filters are stored globally for the app's state management.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/hooks/useQualityDashboard
    - What it is: A custom React hook to fetch filter data for the Data Quality Dashboard.  
    - Why used: This hook abstracts the logic for data fetching, making it reusable
      and keeping the component clean and focused on rendering.
*/
import { useGetFilters } from "@/hooks/useQualityDashboard"; // Custom hook to fetch available filters

/*
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI component library for React, offering
      accessible, theme-aware components (Cards, Badges, Text, Tooltips) and
      styling helpers like `makeStyles` and `tokens`.
    - Why used: This component relies on these ready-made visual building
      blocks for consistent styling, accessibility, and responsiveness.
*/
import {
  Button, // Fluent UI component for button
  Dropdown, // Fluent UI component for dropdown selection
  Field, // Fluent UI component for form field wrapper
  makeStyles, // Fluent UI hook for custom styling
  Option, // Fluent UI component for options inside dropdown
  tokens, // Fluent UI tokens for consistent spacing and styling
  Text, // Fluent UI component for text
} from "@fluentui/react-components"; // Fluent UI component library

/*
  react
    - What it is: React is a JavaScript library for building user interfaces,
      particularly single-page applications where data changes over time.
*/
import { useEffect } from "react"; // React hook for side effects (e.g., data fetching, updating state)

/*
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store module to manage the state of Data Quality Detailed View filters.   
    - Why used: This store centralizes the filter state management, making it easier
      to access and update filter values across the component.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore"; // Zustand store to manage the filter state

//---------------------- Custom Styles -------------------------//
/**
 * `useStyles` hook is used to create custom styles for the filter component.
 * - Defines styles for root container, filter container, and individual filter items.
 */
const useStyles = makeStyles({
  root: {
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXXL}`, // Adds padding around the root container
    boxShadow: tokens.shadow4, // Adds a box shadow for visual separation
    borderRadius: tokens.borderRadiusLarge, // Applies a rounded border to the root container
  },
  filter: {
    display: "flex", // Uses flexbox for layout
    flexWrap: "wrap", // Allows wrapping of items when the space is insufficient
    gap: tokens.spacingHorizontalL, // Adds spacing between filter items
    marginTop: tokens.spacingVerticalL, // Adds space above the filter container
    marginBottom: tokens.spacingVerticalL, // Adds space below the filter container
    alignItems: "end", // Aligns items to the bottom of the filter container
  },
});

//---------------------- Component: DQDDetailedViewFilters -------------------------//

/**
 * `DQDDetailedViewFilters` Component
 * This component renders the filters for selecting a catalog, schema, and dataset for the Data Quality Detailed View.
 * - The filters are populated dynamically from the data fetched via `useGetFilters`.
 * - The filters interact with the Zustand store (`useDQDDetailedViewFiltersStore`) to update and apply the selected filter values.
 *
 * @returns JSX.Element - The rendered component for the filter section of the Data Quality Detailed View page.
 */
export const DQDDetailedViewFilters = () => {
  // Using the `useStyles` hook to get the custom styles for the component
  const styles = useStyles();

  // Fetching the data and fetching status from the `useGetFilters` hook
  const { data, isFetching } = useGetFilters();

  // Extracting values and functions from the `useDQDDetailedViewFiltersStore` Zustand store
  const {
    catalog, // Current selected catalog
    schema, // Current selected schema
    dataset, // Current selected dataset
    catalogOptions, // Available catalog options
    schemaOptions, // Available schema options
    datasetOptions, // Available dataset options

    setCatalog, // Function to update the selected catalog
    setSchema, // Function to update the selected schema
    setDataset, // Function to update the selected dataset
    setCatalogOptions, // Function to set the available catalog options
    setSchemaOptions, // Function to set the available schema options
    setDatasetOptions, // Function to set the available dataset options
    applyFilters, // Function to apply the selected filters
    resetToApplied, // Function to reset the filters to the last applied state
    hasChanges, // Function to check if any changes have been made to the filters
    hasAppliedFilters, // Function to check if any filters have been applied
    isApplyEnabled, // Function to check if the apply button should be enabled
  } = useDQDDetailedViewFiltersStore();

  //---------------------- Populate Filter Options -------------------------//

  /**
   * This effect populates the catalog options once the data is fetched.
   * - The catalog options are extracted from the `data` array and stored in the Zustand store.
   */
  useEffect(() => {
    if (data) {
      const catalogs = [
        ...new Set(
          // Example data:
          // data = [
          //   { CATALOG_NAME: "Sales", SCHEMA_NAME: "Public", DATASET_NAME: "Orders" },
          //   { CATALOG_NAME: "Sales", SCHEMA_NAME: "Private", DATASET_NAME: "Customers" },
          //   { CATALOG_NAME: "Finance", SCHEMA_NAME: "Public", DATASET_NAME: "Revenue" }
          // ]

          // data.map(...) → ["Sales", "Sales", "Finance"]
          data.map((i: any) => i.CATALOG_NAME) // Unique catalog names
        ),
      ]
        // new Set(...) removes duplicates → ["Sales", "Finance"]
        // .sort() alphabetically → ["Finance", "Sales"]
        .sort(); // Sort the catalog names alphabetically

      // Final catalog options example:
      // ["Finance", "Sales"]
      setCatalogOptions(catalogs); // Set the catalog options in the store
    }
  }, [data, setCatalogOptions]);

  /**
   * This effect updates the schema options based on the selected catalog.
   * - When the catalog changes, the schemas associated with that catalog are fetched.
   */
  useEffect(() => {
    if (!catalog || !data) {
      // Example: catalog = null → reset schema options
      setSchemaOptions([]); // Reset schema options if no catalog or data
      return;
    }

    const schemas = [
      ...new Set(
        data
          // Example when catalog = "Sales":
          // [
          //   { SCHEMA_NAME: "Public" },
          //   { SCHEMA_NAME: "Private" }
          // ]
          .filter((i: any) => i.CATALOG_NAME === catalog)
          // .map(...) → ["Public", "Private"]
          .map((i: any) => i.SCHEMA_NAME) // Extract schemas based on catalog
      ),
    ]
      // new Set removes duplicates
      // .sort() → ["Private", "Public"]
      .sort(); // Sort schema names alphabetically

    // Final schema options example:
    // ["Private", "Public"]
    setSchemaOptions(schemas); // Set the schema options in the store
  }, [catalog, data, setSchemaOptions]);

  /**
   * This effect updates the dataset options based on the selected schema.
   * - When the schema changes, the datasets associated with that schema are fetched.
   */
  useEffect(() => {
    if (!catalog || !schema || !data) {
      // Example: schema not selected → reset dataset options
      setDatasetOptions([]); // Reset dataset options if no catalog, schema, or data
      return;
    }

    const datasets = [
      ...new Set(
        data
          // Example when catalog = "Sales" and schema = "Public":
          // [
          //   { DATASET_NAME: "Orders" },
          //   { DATASET_NAME: "Invoices" }
          // ]
          .filter(
            (i: any) => i.CATALOG_NAME === catalog && i.SCHEMA_NAME === schema
          )
          // .map(...) → ["Orders", "Invoices"]
          .map((i: any) => i.DATASET_NAME) // Extract dataset names based on catalog and schema
      ),
    ]
      // new Set removes duplicates
      // .sort() → ["Invoices", "Orders"]
      .sort(); // Sort dataset names alphabetically

    // Final dataset options example:
    // ["Invoices", "Orders"]
    setDatasetOptions(datasets); // Set the dataset options in the store
  }, [catalog, schema, data, setDatasetOptions]);

  //---------------------- Filter Action Handlers -------------------------//

  /**
   * `handleApply` function is called when the user clicks the "Apply" button.
   * - It applies the current filter selections (catalog, schema, dataset) and triggers any necessary updates.
   */
  const handleApply = () => {
    applyFilters(); // Apply the filters to the global state
    // Trigger any refetch or data update if needed
    console.log("Filters applied:", { catalog, schema, dataset }); // Log the applied filters for debugging
  };

  /**
   * `handleReset` function is called when the user clicks the "Reset" button.
   * - It resets the filter selections to the last applied state.
   */
  const handleReset = () => {
    resetToApplied(); // Reset filters to the previously applied state
  };

  //---------------------- Render Filter UI -------------------------//

  return (
    <div className={styles.root}>
      {/* Title for the filters section */}
      <Text size={400} weight="semibold">
        Select Dataset
      </Text>

      <div className={styles.filter}>
        {/* Catalog Dropdown */}
        <Field label="Catalog Name" required>
          <Dropdown
            placeholder="Select Catalog" // Filter placeholder text
            value={catalog || ""} // Dropdown value
            selectedOptions={catalog ? [catalog] : []} // Currently selected catalog
            appearance="filled-darker" // Darker filled style
            onOptionSelect={(_, dropdown) => setCatalog(dropdown.optionValue ?? "")} // Update catalog on selection
            disabled={isFetching || catalogOptions.length === 0} // Disable if fetching or no options available
          >
            {/* Dropdown options for available catalogs */}
            {catalogOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Schema Dropdown */}
        <Field label="Schema Name" required>
          <Dropdown
            placeholder="Select Schema" // Filter placeholder text
            value={schema || ""} // Dropdown value
            selectedOptions={schema ? [schema] : []} // Currently selected schema
            appearance="filled-darker" // Darker filled style
            onOptionSelect={(_, dropdown) => setSchema(dropdown.optionValue ?? "")} // Update schema on selection
            disabled={!catalog || schemaOptions.length === 0} // Disable if no catalog selected or no schema options available
          >
            {/* Dropdown options for available schemas */}
            {schemaOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Dataset Dropdown */}
        <Field label="Dataset Name" required>
          <Dropdown
            placeholder="Select Dataset" // Filter placeholder text
            value={dataset || ""} // Dropdown value
            selectedOptions={dataset ? [dataset] : []} // Currently selected dataset
            appearance="filled-darker" // Darker filled style
            onOptionSelect={(_, dropdown) => setDataset(dropdown.optionValue ?? "")} // Update dataset on selection
            disabled={!schema || datasetOptions.length === 0} // Disable if no schema selected or no dataset options available
          >
            {/* Dropdown options for available datasets */}
            {datasetOptions.map((item) => (
              <Option key={item} value={item}>
                {item}
              </Option>
            ))}
          </Dropdown>
        </Field>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            appearance="primary" // Button appearance
            onClick={handleApply} // Calls the function to apply selected filters
            disabled={!isApplyEnabled() || !hasChanges()} // Disable if Apply is not enabled or no changes
          >
            Apply
          </Button>

          <Button
            appearance="secondary" // Button appearance
            onClick={handleReset} // Calls the function to reset applied filters
            disabled={!hasAppliedFilters() || !hasChanges()} // Disable if no filters applied or no changes
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
