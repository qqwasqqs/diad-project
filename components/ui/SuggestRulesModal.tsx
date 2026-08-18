/* 
 Project Name : Teva Data Integrity
 Business Owner, Team : Keerthi Pusuloori
 Script Author, Team : Radhe Raman Tiwari
 Date: 20 January 2026

 Purpose of the script:
 This script defines the Suggest Rules Modal component for the Data Quality
 Management Dashboard.

 Responsibilities:
 - Displays AI-generated data quality rule suggestions based on dataset schema analysis.
 - Allows users to review, select, and customize suggested rules before applying them.
 - Supports adding multiple rules with custom values and run frequencies.
 - Integrates with Great Expectations service for rule management.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
 react
 - What it is: The core React library which provides hooks and component
 primitives for building UI.
 - Why used: Provides FC (Function Component) type, useEffect for side effects,
 useMemo for performance optimization, and useState for managing local state
 (selections, form inputs, etc.).
*/
import { FC, useEffect, useMemo, useState } from "react";

/*
 @fluentui/react-components
 - What it is: A UI component library from Microsoft (Fluent UI) providing
 accessible, themed React components and styling tokens.
 - Why used: This component uses dialog primitives (Dialog, DialogSurface,
 DialogBody, DialogTitle, DialogContent, DialogActions) for the modal interface,
 form controls (Checkbox, Dropdown, Textarea, Field), display components
 (Text, Badge, Caption1, Button), and styling helpers (makeStyles, shorthands,
 tokens) to ensure consistent theming and responsive design throughout the
 suggestion interface.
*/
import {
  makeStyles, // Function to create scoped CSS-in-JS styles for the component
  shorthands, // Utility for CSS shorthand properties (padding, margin, border, etc.)
  tokens, // Design tokens (colors, spacing, border radius) for consistent theming
  Text, // Text component for displaying labels and content
  Button, // Button component for triggering actions (Apply, Discard)
  Badge, // Small label component for displaying rule categories and types
  Dialog, // Modal dialog wrapper component
  DialogSurface, // Dialog container surface for content layout
  DialogTitle, // Dialog header title component
  DialogBody, // Main dialog content area wrapper
  DialogActions, // Dialog footer section containing action buttons
  DialogContent, // Scrollable content area within dialog body
  Checkbox, // Checkbox input for selecting/deselecting rules
  Caption1, // Small text component for secondary information (column names)
  Field, // Form field wrapper with label for form controls
  Dropdown, // Dropdown select component for choosing run frequency
  Option, // Individual option element used inside Dropdown
  Textarea, // Multi-line text input for rule value expressions
  Spinner, // Loading spinner component for indicating async operations
  SearchBox, // Search input component for filtering rules
} from "@fluentui/react-components";

/*
 @fluentui/react-icons
 - What it is: Icon library from Fluent UI providing consistent iconography.
 - Why used: Provides visual indicators for different UI elements:
 - AddSquareRegular: Indicates the "Add Rules" action
 - ColumnRegular: Represents column-level rules
*/
import { AddSquareRegular, ColumnRegular } from "@fluentui/react-icons";

/*
 @/hooks/useGreatExpectations
 - What it is: A project-specific custom hook that encapsulates the API
 call needed to fetch suggested data quality rules from the backend.
 - Why used: It centralizes the data fetching logic by calling the SQL query
 (that analyzes dataset schema and suggests appropriate validation rules)
 and returns the results in a consumable format. This separates data
 fetching concerns from UI rendering logic.
*/
import { useSuggestDataQualityRules } from "@/hooks/useGreatExpectations";

/*
 @/constants/schema
 - What it is: Type definitions for form data structures used throughout
 the application.
 - Why used: Provides the AddRuleFormData interface which defines the shape
 of data needed to create a new rule, ensuring type safety when submitting
 rule configurations to the backend.
*/
import { AddRuleFormData } from "@/constants/schema";

/*
 @/types/rule
 - What it is: Type definitions for rule-related data structures.
 - Why used: Provides the NewRule interface which defines the complete payload
 structure required by the API when creating a new data quality rule,
 including all metadata and configuration fields.
*/
import { NewRule } from "@/types/rule";

/*
 @/lib/services/greatExpectationsService
 - What it is: Service layer that handles API communication with the
 Great Expectations backend for rule management.
 - Why used: Provides the manageDataQualityRule method to submit new rules
 to the backend, abstracting away HTTP request details and providing a
 clean interface for rule creation operations.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/*
 @/hooks/useToast
 - What it is: A project-specific custom hook for displaying toast
 notifications to users.
 - Why used: Provides the showToast function to display success/error messages
 after rule creation attempts, giving users immediate feedback about the
 outcome of their actions.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
 ./JobStatusToaster
 - What it is: A local component/utility for tracking job execution status.
 - Why used: Provides the addRunId function to register and track async job
 executions (rule creation operations) so users can monitor their progress
 in real-time through the job status toaster UI.
*/
import { addRunId } from "./JobStatusToaster";

/*
 @/lib/ruleFormHelper
 - What it is: Utility library containing helper functions for rule form logic.
 - Why used: Provides the shouldShowRuleValue function which determines whether
 a specific rule type requires a user-provided value input field. Different
 rules have different requirements - some need custom expressions, others don't.
 Example: "completeness_check" needs a value, but "volume_check" may not.
*/
import { shouldShowRuleValue } from "@/lib/ruleFormHelper";

/*
 @/constants/rule
 - What it is: Central constants file containing rule-related configuration.
 - Why used: Provides the runFrequencies array which defines all available
 scheduling options (Daily, Hourly, Weekly, etc.) for data quality rules.
 Centralizing this ensures consistency across the application.
*/
import { runFrequencies } from "@/constants/rule";

// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------

/**
 * useStyles
 *
 * Defines scoped CSS-in-JS styles for the SuggestRulesModal component.
 * Uses Fluent UI's makeStyles to create component-specific styling that
 * ensures consistent spacing, layout, colors, and interactive states.
 *
 * Style purposes:
 * - textareaField: Controls dimensions of the multi-line text input
 * - suggestionGrid: Layouts the list of rule suggestion cards vertically
 * - suggestionCard: Defines the appearance and interactive states of each rule card
 * - selectedSuggestion: Highlights selected cards with brand colors
 * - ruleHeaderRow: Aligns checkbox, name, and badges in the card header
 */
const useStyles = makeStyles({
  // Style for the textarea input field
  // Ensures the text input takes full available width and has minimum comfortable height
  // Example: When user enters "column_value IS NOT NULL", the textarea expands to show full text
  textareaField: {
    width: "100%", // Takes full width of parent container for maximum input space
    minHeight: "60px", // Minimum height to show at least 3-4 lines of text comfortably
  },

  // Style for the container holding all suggestion cards
  // Creates a vertical stack layout with consistent spacing between cards
  // Example: The scrollable list showing all 15 suggested rules like "completeness_check", "volume_check", etc.
  suggestionGrid: {
    display: "flex", // Enables flexbox layout for flexible positioning
    flexDirection: "column", // Stacks rule cards vertically (top to bottom)
    gap: "16px", // 16px spacing between each rule card for visual separation and readability
    ...shorthands.padding("4px"), // Small padding around the entire grid to prevent edge clipping on scroll
  },

  // Style for individual rule suggestion cards
  // Defines the clickable card appearance with hover states and proper spacing
  // Example: Each card displaying a rule like "completeness_check" with its category badges and input fields
  suggestionCard: {
    display: "flex", // Enables flexbox layout for internal content arrangement
    flexDirection: "column", // Stacks card content (header, fields, footer) vertically
    gap: "12px", // 12px spacing between internal card sections (header, column name, frequency, rule value)
    cursor: "pointer", // Changes cursor to hand pointer to indicate the card is clickable/interactive
    ...shorthands.padding("16px"), // Comfortable padding inside the card (16px all around) for content breathing room
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke1), // Light 1px border to define card boundaries and separate from background
    ...shorthands.borderRadius(tokens.borderRadiusMedium), // Rounded corners (medium radius) for modern card design aesthetic
    backgroundColor: tokens.colorNeutralBackground1, // White/light background for card surface (contrasts with page background)
    transition: "background-color 0.2s", // Smooth 0.2 second color transition for hover effect (prevents jarring color change)
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover, // Slightly darker background on hover for interactive feedback to user
    },
  },

  // Additional style applied to selected suggestion cards
  // Visually distinguishes selected cards using brand colors (blue theme)
  // Example: When user clicks the "completeness_check" card, it gets highlighted with blue border and background
  selectedSuggestion: {
    ...shorthands.borderColor(tokens.colorBrandStroke1), // Blue brand color border to clearly indicate selection state
    backgroundColor: tokens.colorBrandBackground2, // Light blue background for selected state (more prominent than hover)
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover, // Slightly darker blue on hover when card is already selected
    },
  },

  // Style for the top row of each rule card
  // Aligns checkbox, rule name text, and category badges horizontally
  // Example: The row containing checkbox + "completeness_check" + "data_profiling" badge + "completeness" badge
  ruleHeaderRow: {
    display: "flex", // Enables flexbox layout for horizontal arrangement
    alignItems: "center", // Vertically centers all items (checkbox, text, badges) in the row for visual alignment
    gap: "12px", // 12px spacing between checkbox, text, and badges for visual separation and readability
  },
});

// ---------------------------------------------------------------------
// TYPE DEFINITIONS
// ---------------------------------------------------------------------

/**
 * SuggestRulesModalProps
 *
 * TypeScript interface defining the props (inputs) required by the SuggestRulesModal component.
 * These props control what dataset the suggestions are for, dialog visibility, and provide
 * context for rule creation.
 *
 * Props explained:
 * - open: Controls whether the modal dialog is visible or hidden
 * - businessUnit: Business unit/department context (e.g., "Sales", "Marketing", "Finance")
 * - catalogName: Database catalog name (e.g., "main", "hive_metastore")
 * - schemaName: Database schema/database name (e.g., "sales_db", "customer_schema")
 * - datasetName: Table/dataset name (e.g., "customer_orders", "product_inventory")
 * - datasetType: Type classification (e.g., "table", "view", "materialized_view")
 * - onOpenChange: Callback function to control dialog open/close state from parent component
 */
interface SuggestRulesModalProps {
  open: boolean; // Whether the dialog is currently visible (true) or hidden (false)
  businessUnit: string; // Business unit/department for categorization and reporting (e.g., "Sales", "Finance")
  catalogName: string; // Database catalog name used to identify the data source (e.g., "main")
  schemaName: string; // Database schema/database name for organizing tables (e.g., "sales_db")
  datasetName: string; // Specific table/dataset name being analyzed for rule suggestions (e.g., "customer_orders")
  datasetType: string; // Type of dataset (helps contextualize suggestions, e.g., "table", "view")
  onOpenChange: (open: boolean) => void; // Function to notify parent component when dialog should open/close
}

/**
 * RuleCategory
 *
 * Type definition for the two main categories of data quality rules.
 * This categorization helps organize rules and determine their scope.
 *
 * Categories:
 * - "metadata": Rules about the dataset as a whole (volume, freshness, schema structure)
 *   Example: "volume_check" verifies the table has expected number of rows
 * - "data_profiling": Rules about data quality characteristics (completeness, uniqueness, validity)
 *   Example: "completeness_check" verifies a column has no null values
 */
type RuleCategory = "metadata" | "data_profiling";

/**
 * UISuggestedRule
 *
 * Interface defining the UI-friendly representation of a suggested rule.
 * This flattens the nested API response structure into a simple, displayable format.
 *
 * The API returns rules in a nested map structure like:
 * {key_name: "orders", value_map: {metadata: {volume: ["volume_check"]}}}
 *
 * This interface transforms it to a flat structure:
 * {ruleName: "volume_check", category: "metadata", ruleType: "volume", targetColumn: null}
 *
 * Fields explained:
 * - ruleName: The specific validation rule identifier (e.g., "completeness_check", "volume_check")
 * - category: High-level category grouping (metadata or data_profiling)
 * - ruleType: Sub-category within the category (e.g., "completeness", "uniqueness", "volume")
 * - targetColumn: Column name if this is a column-level rule, null/undefined if dataset-level rule
 *
 * Examples:
 * 1. Dataset-level metadata rule:
 *    {ruleName: "volume_check", category: "metadata", ruleType: "volume", targetColumn: undefined}
 * 2. Column-level profiling rule:
 *    {ruleName: "completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "customer_id"}
 */
interface UISuggestedRule {
  ruleName: string; // Name of the validation rule (e.g., "completeness_check", "uniqueness_check")
  category: RuleCategory; // Category: "metadata" (dataset-level) or "data_profiling" (quality checks)
  ruleType: string; // Type within category (e.g., "completeness", "uniqueness", "volume", "freshness")
  targetColumn: string | null | undefined; // Column name if column-specific rule, null or undefined if applies to entire dataset
}

// ---------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------

/**
 * SuggestRulesModal
 *
 * Main component for displaying and managing AI-generated data quality rule suggestions.
 * This modal dialog shows suggested rules based on dataset schema analysis and allows
 * users to review, select, customize, and apply multiple rules at once.
 *
 * Component workflow:
 * 1. Opens when parent sets open=true
 * 2. Fetches suggested rules from backend via useSuggestDataQualityRules hook
 * 3. Transforms nested API response into flat, displayable rule list
 * 4. User can search/filter rules using the search box
 * 5. User selects rules, enters rule values (if required), chooses run frequencies
 * 6. On "Add Rules", submits each selected rule to backend asynchronously
 * 7. Shows success/error toast with run ID for tracking and closes dialog
 *
 * Features:
 * - Interactive rule selection with checkboxes
 * - Search/filter functionality for finding specific rules
 * - Conditional rule value inputs (only shown when required for specific rule types)
 * - Configurable run frequency per rule
 * - Visual distinction between selected/unselected rules
 * - Category and type badges for quick identification
 * - Column name display for column-level rules
 * - Loading and empty states
 * - Validation to prevent selection of incomplete rules
 * - Bulk add functionality with job tracking
 *
 * Example use case:
 * User opens suggestions for "customer_orders" table. The component displays:
 * - 1 dataset-level rule: "volume_check"
 * - 9 column-level rules: "completeness_check" for customer_id, order_date, etc.
 * User searches for "completeness", selects 3 completeness rules, enters conditions,
 * sets frequencies, clicks "Add 3 Rules", and the rules are created with tracking IDs.
 */
export const SuggestRulesModal: FC<SuggestRulesModalProps> = ({
  open, // Dialog visibility state from parent component (true = show modal, false = hide)
  businessUnit, // Current business unit context for rule creation (e.g., "Sales", "Marketing")
  datasetType, // Type of dataset being analyzed (e.g., "table", "view")
  catalogName, // Catalog name for rule creation payload (e.g., "main", "hive_metastore")
  schemaName, // Schema name for rule creation payload (e.g., "sales_db")
  datasetName, // Table name for rule creation payload (e.g., "customer_orders")
  onOpenChange, // Callback function to notify parent component of dialog state changes
}) => {
  // Get scoped CSS styles from the makeStyles hook defined above
  // These styles will be applied to various UI elements in the component
  const styles = useStyles();

  // Get toast notification function for displaying user feedback messages
  // Used to show success messages (with run ID) or error messages after rule creation attempts
  const { showToast } = useGlobalToast();

  // Fetch suggested rules from the backend using custom hook
  // This hook internally calls the SQL query that:
  // 1. Analyzes the dataset schema (columns, data types)
  // 2. Classifies columns (numeric, datetime, string, ID)
  // 3. Suggests appropriate validation rules for each column and the dataset
  // Returns:
  // - suggestedRules: Array of objects like [{key_name: "orders", value_map: {...}}, {key_name: "customer_id", value_map: {...}}]
  // - isFetchingSuggestedRules: Boolean indicating if the API call is currently in progress
  const { suggestedRules, isFetchingSuggestedRules } = useSuggestDataQualityRules(
    catalogName, // e.g., "main" - identifies the catalog for the SQL query
    schemaName, // e.g., "sales_db" - identifies the schema/database for the SQL query
    datasetName // e.g., "customer_orders" - identifies the specific table to analyze
  );

  // Transform the nested API response into a flat array of UI-friendly rule objects
  // useMemo ensures this expensive transformation only runs when suggestedRules changes (performance optimization)
  //
  // Input format (from SQL query):
  // [
  //   {key_name: "orders", value_map: {metadata: {volume: ["volume_check"], freshness: ["freshness_check"]}, data_profiling: {completeness: ["dataset_completeness_check"]}}},
  //   {key_name: "order_id", value_map: {data_profiling: {completeness: ["completeness_check", "row_level_completeness_check"], uniqueness: ["uniqueness_check"]}}},
  //   {key_name: "customer_name", value_map: {data_profiling: {completeness: ["completeness_check"], consistency: ["consistency_check"]}}}
  // ]
  //
  // Output format (for UI display):
  // [
  //   {ruleName: "volume_check", category: "metadata", ruleType: "volume", targetColumn: undefined},
  //   {ruleName: "freshness_check", category: "metadata", ruleType: "freshness", targetColumn: undefined},
  //   {ruleName: "dataset_completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: undefined},
  //   {ruleName: "completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "order_id"},
  //   {ruleName: "row_level_completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "order_id"},
  //   {ruleName: "uniqueness_check", category: "data_profiling", ruleType: "uniqueness", targetColumn: "order_id"},
  //   {ruleName: "completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "customer_name"},
  //   {ruleName: "consistency_check", category: "data_profiling", ruleType: "consistency", targetColumn: "customer_name"}
  // ]
  const uiRules: UISuggestedRule[] = useMemo(() => {
    // Return empty array if no suggestions have been loaded yet (initial state or error)
    if (!suggestedRules) return [];

    // Array to collect all flattened rules across all items in the API response
    const items: UISuggestedRule[] = [];

    // Loop through each item in the API response
    // Typically: 1 item for the dataset itself + 1 item per column
    // Example: For a table with 9 columns, this loops 10 times (1 dataset + 9 columns)
    suggestedRules.forEach((item: any, index: number) => {
      const keyName = item.key_name; // Either the dataset name (index 0) or a column name (index > 0)
      const valueMap = item.value_map || {}; // Contains nested rule categories and arrays of rule names

      // Process Metadata rules (can be dataset-level or column-level depending on index)
      // Metadata rules assess dataset-level characteristics like volume, freshness, timeliness
      // Example categories: volume (row count checks), freshness (data recency), timeliness (SLA), format (schema validation)
      // Example extraction: {metadata: {volume: ["volume_check"]}} → {ruleName: "volume_check", category: "metadata", ruleType: "volume", targetColumn: undefined}
      if (valueMap?.metadata) {
        // Loop through each metadata category (volume, freshness, timeliness, format)
        // Object.entries converts the metadata object into [key, value] pairs for iteration
        Object.entries(valueMap.metadata).forEach(([ruleType, ruleNames]) => {
          // ruleType example: "volume"
          // ruleNames example: ["volume_check"]
          if (Array.isArray(ruleNames)) {
            // Cast ruleNames to string array and iterate through each rule name
            (ruleNames as string[]).forEach((ruleName) =>
              items.push({
                ruleName, // e.g., "volume_check", "freshness_check"
                category: "metadata", // Always "metadata" for dataset-level metadata rules
                ruleType, // e.g., "volume", "freshness", "timeliness", "format"
                targetColumn: index === 0 ? undefined : keyName, // undefined if dataset-level (index 0), otherwise column name (e.g., "customer_id")
              })
            );
          }
        });
      }

      // Process data profiling rules (can be dataset-level or column-level depending on index)
      // Data profiling rules assess data quality characteristics
      // Example categories: completeness (null checks), uniqueness (duplicate checks), validity (range checks),
      //                     consistency (pattern checks), numeric (statistical checks)
      // 
      // For index 0: Dataset-level profiling rules (e.g., dataset_completeness_check)
      // For index > 0: Column-level profiling rules (e.g., completeness_check on customer_id column)
      //
      // Example extraction from column "customer_id":
      // {data_profiling: {completeness: ["completeness_check"], uniqueness: ["uniqueness_check"]}}
      // → {ruleName: "completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "customer_id"}
      // → {ruleName: "uniqueness_check", category: "data_profiling", ruleType: "uniqueness", targetColumn: "customer_id"}
      if (valueMap?.data_profiling) {
        // Loop through each data profiling category (completeness, uniqueness, validity, consistency, numeric)
        // Object.entries converts the data_profiling object into [key, value] pairs for iteration
        Object.entries(valueMap.data_profiling).forEach(([ruleType, ruleNames]) => {
          // ruleType example: "completeness", "uniqueness", "validity"
          // ruleNames example: ["completeness_check", "row_level_completeness_check"]
          if (Array.isArray(ruleNames)) {
            // Cast ruleNames to string array and iterate through each rule name
            (ruleNames as string[]).forEach((ruleName) =>
              items.push({
                ruleName, // e.g., "completeness_check", "uniqueness_check"
                category: "data_profiling", // Always "data_profiling" for quality profiling rules
                ruleType, // e.g., "completeness", "uniqueness", "validity", "consistency", "numeric"
                targetColumn: index === 0 ? undefined : keyName, // undefined if dataset-level (index 0), otherwise column name (e.g., "customer_id")
              })
            );
          }
        });
      }
    });

    // Return the flattened array of all rules for display in the UI
    // This array is now easy to map over and render as individual cards
    return items;
  }, [suggestedRules]); // Only re-run this transformation when suggestedRules data changes

  // Track which suggestion cards the user has selected via checkboxes
  // Uses a Set data structure for O(1) lookup performance when checking if an index is selected
  // Set stores rule indices (numbers), not the rules themselves
  // Example: Set(0, 3, 5, 7) means the rules at array indices 0, 3, 5, and 7 are currently selected
  // IMPORTANT: Starts with empty Set() - no rules are pre-selected, user must explicitly choose
  const [selectedSuggestionIndices, setSelectedSuggestionIndices] =
    useState<Set<number>>(new Set());

  // Track the rule value (validation expression/condition) entered by the user for each rule
  // This is a key-value object where:
  // - Key: Rule index (number) in the uiRules array
  // - Value: User's custom input string (the validation logic/expression)
  // Example: {0: "column_value IS NOT NULL", 3: "length(column) > 0 AND length(column) <= 100", 5: "column_value > 0"}
  // These values populate the textarea under "Rule Value" section for each rule card
  // Note: Only rules that require custom values (determined by shouldShowRuleValue) will have entries here
  const [ruleValues, setRuleValues] = useState<Record<number, string>>({});

  // Track the run frequency selected by the user for each rule via dropdown
  // This is a key-value object where:
  // - Key: Rule index (number) in the uiRules array
  // - Value: Selected frequency string from runFrequencies array
  // Example: {0: "Daily", 3: "Weekly", 5: "Monthly"}
  // These values determine how often each rule's validation check will execute
  const [frequencies, setFrequencies] = useState<Record<number, string>>({});

  // State to track the search input value for filtering rules
  // - `search`: Stores the current value of the search field (SearchBox component)
  // - Users can type to filter rules by category, ruleType, ruleName, or targetColumn
  // - Example: User types "completeness" to show only completeness-related rules
  const [search, setSearch] = useState("");

  // Rule value errors keyed by index
  const [ruleValueErrors, setRuleValueErrors] = useState<Record<number, string>>({});

  // State to track whether rule submission is in progress
  // - `isLoading`: Boolean flag indicating if rules are currently being submitted to backend
  // - Set to true when "Add Rules" button is clicked, false when submission completes
  // - Used to disable the submit button during processing to prevent duplicate submissions
  // - Example: When true, "Add Rules" button shows disabled state during API calls
  const [isLoading, setIsLoading] = useState(false);

  // Effect hook that runs when the dialog opens or when the uiRules data changes
  // Purpose: Reset all user selections and inputs to provide a clean slate each time the dialog opens
  // This prevents stale data from previous dialog sessions from persisting
  //
  // Example scenario:
  // 1. User opens dialog, selects 3 rules, enters values, searches for "completeness", then closes dialog without applying
  // 2. User reopens dialog → this effect runs and clears all previous selections and search
  // 3. Dialog now shows all rules unselected with empty inputs and no search filter, ready for fresh user interaction
  useEffect(() => {
    // Don't perform any cleanup if dialog is currently closed (optimization - no need to reset if not visible)
    if (!open) return;

    // Reset rule selections - clear the Set to deselect all checkboxes
    // All rule cards will appear unselected with unchecked checkboxes
    setSelectedSuggestionIndices(new Set());
    
    // Clear all rule value inputs - reset to empty object
    // All textarea fields under "Rule Value" will be empty
    setRuleValues({});
    
    // Clear all frequency selections - reset to empty object
    // All "Run Frequency" dropdowns will show placeholder "Select a run frequency"
    setFrequencies({});
    // Clear all the Rule Value fields errors.
    setRuleValueErrors({});
  }, [open, uiRules]); // Re-run this effect whenever dialog opens (open becomes true) or when rules data changes

  // Function to toggle the selection state of a rule card
  // When user clicks on a card or its checkbox, this function adds or removes the card's index from the selected set
  //
  // Example flow:
  // 1. User clicks card at index 3 (currently unselected)
  //    → toggleSuggestionSelection(3) called
  //    → newSet doesn't have 3, so add it: newSet.add(3)
  //    → Card becomes selected, checkbox becomes checked, card gets blue highlighting
  // 2. User clicks same card again (now selected)
  //    → toggleSuggestionSelection(3) called
  //    → newSet has 3, so remove it: newSet.delete(3)
  //    → Card becomes unselected, checkbox becomes unchecked, highlighting removed
  const toggleSuggestionSelection = (index: number) => {
    // Create a copy of the current selection set to avoid directly mutating React state
    // React requires immutability for proper re-rendering and state tracking
    const newSet = new Set(selectedSuggestionIndices);
    
    // Check if this index is already in the set (card is currently selected)
    if (newSet.has(index)) newSet.delete(index); // Remove from set (deselect the card)
    else newSet.add(index); // Add to set (select the card)
    
    // Update React state with the new selection set, triggering a re-render
    // This will update all UI elements that depend on selection state (checkboxes, styling, button text)
    setSelectedSuggestionIndices(newSet);
  };

  // Function that executes when user clicks the "Add X Rules" button
  // This is the main submission handler that processes all selected rules and sends them to the backend asynchronously
  //
  // Workflow:
  // 1. Set loading state to true (disables button, shows processing state)
  // 2. Collect all selected rule indices from the Set
  // 3. For each selected index, gather the rule data and user's custom inputs (value + frequency)
  // 4. Submit each configured rule to the backend API (async operations)
  // 5. Track each submission with a run ID for monitoring
  // 6. Close the dialog and reset loading state
  //
  // Example scenario:
  // User selected 3 rules (indices 0, 5, 8):
  // - Rule 0: "volume_check", value: (none required), frequency: "Daily"
  // - Rule 5: "completeness_check" on "customer_id", value: "IS NOT NULL", frequency: "Hourly"
  // - Rule 8: "range_check" on "order_date", value: "BETWEEN '2023-01-01' AND '2026-12-31'", frequency: "Weekly"
  // This function will submit all 3 rules to the backend and provide tracking IDs
  const handleApplySuggestions = () => {
    // Array to collect all selected rules with their user configurations
    const selectedRules: any[] = [];
    const errors: Record<number, string> = {};

    // Convert Set to Array and loop through each selected rule index
    // Example: Set(0, 5, 8) → Array [0, 5, 8] → process rules at indices 0, 5, and 8
    Array.from(selectedSuggestionIndices).forEach((index) => {
      // Get the base rule object at this index from the flattened uiRules array
      // Create a shallow copy to avoid mutating the original rule object
      // Example: uiRules[5] = {ruleName: "completeness_check", category: "data_profiling", ruleType: "completeness", targetColumn: "customer_id"}
      const selectedRule: any = { ...uiRules[index] };
      
      // Attach the user's custom rule value (validation expression) to the rule object
      // Gets the value from the ruleValues state object using the index as key
      // Example: ruleValues[5] = "IS NOT NULL" → selectedRule.ruleValue = "IS NOT NULL"
      selectedRule.ruleValue = ruleValues[index];
      
      // Attach the user's selected run frequency to the rule object
      // Gets the value from the frequencies state object using the index as key
      // Example: frequencies[5] = "Hourly" → selectedRule.runFrequency = "Hourly"
      selectedRule.runFrequency = frequencies[index];
      
      // Add this fully configured rule to the collection for submission
      selectedRules.push(selectedRule);

      const rule = uiRules[index];
      const needsRuleValue = shouldShowRuleValue(rule.category, rule.ruleType);
      const value = ruleValues[index]?.trim();

      if (needsRuleValue && !value) {
        errors[index] = "Rule value is required";
      }
    });

    // If validation errors exist → show them and stop
    if (Object.keys(errors).length > 0) {
      setRuleValueErrors(errors);
      showToast("Please provide a rule value for all selected rules.", "error", undefined, "top-end");
      return;
    }

    // Set loading flag to true to indicate submission is in progress
    // This will disable the "Add Rules" button to prevent duplicate submissions
    setIsLoading(true);
    // Clear errors before submit
    setRuleValueErrors({});

    // Submit each configured rule to the backend via the onSubmit function
    // Each rule is submitted as a separate async API call (not batched)
    // Using forEach with async to allow parallel submissions (faster than sequential)
    // Example: 3 selected rules → 3 separate async API calls happening concurrently
    selectedRules.forEach(async (rule: any) => {
      await onSubmit({
        ruleCategory: rule.category, // "metadata" or "data_profiling"
        ruleType: rule.ruleType, // "completeness", "uniqueness", "volume", etc.
        ruleName: rule.ruleName, // "completeness_check", "volume_check", etc.
        targetColumn: rule.targetColumn, // Column name (e.g., "customer_id") or undefined for dataset-level
        ruleValue: rule.ruleValue, // User's custom validation expression (or undefined if not required)
        runFrequency: rule.runFrequency, // "Daily", "Weekly", "Hourly", etc.
      });
    });

    // Log for debugging purposes - helps track how many rules were added and their configurations
    console.log(`Added ${selectedRules.length} rules to selectedRule`, selectedRules, uiRules);
    
    // Close the dialog and reset loading state after successfully processing all rule submissions
    handleDiscard();
  };

  // Function to submit a single configured rule to the backend API
  // This constructs the complete payload with all required fields and makes the async HTTP POST request
  // Also handles success/error feedback to the user via toast notifications
  //
  // Purpose: Creates a new data quality rule in the Great Expectations system
  //
  // Example call:
  // onSubmit({
  //   ruleCategory: "data_profiling",
  //   ruleType: "completeness",
  //   ruleName: "completeness_check",
  //   targetColumn: "customer_id",
  //   ruleValue: "IS NOT NULL",
  //   runFrequency: "Daily"
  // })
  const onSubmit = async (data: AddRuleFormData) => {
    // Build the complete API payload object with all required fields
    // Combines form data (from parameter) with component props to create full context
    //
    // Example payload structure:
    // {
    //   businessUnit: "Sales",
    //   datasetType: "table",
    //   catalogName: "main",
    //   schemaName: "sales_db",
    //   datasetName: "customer_orders",
    //   ruleCategory: "data_profiling",
    //   ruleType: "completeness",
    //   ruleName: "completeness_check",
    //   targetColumn: "customer_id",
    //   ruleValue: "IS NOT NULL",
    //   runFrequency: "Daily"
    // }
    const payload: NewRule = {
      businessUnit, // Business unit context from props (e.g., "Sales", "Marketing", "Finance")
      datasetType, // Dataset type from props (e.g., "table", "view")
      catalogName, // Database catalog identifier from props (e.g., "main", "hive_metastore")
      schemaName, // Database schema/database name from props (e.g., "sales_db")
      datasetName, // Table/dataset name from props (e.g., "customer_orders")
      ruleCategory: data.ruleCategory, // "metadata" or "data_profiling" from form data
      ruleType: data.ruleType, // Sub-category from form data (e.g., "completeness", "volume")
      ruleName: data.ruleName, // Specific rule identifier from form data (e.g., "completeness_check")
      targetColumn: data.targetColumn, // Column name from form data or undefined for dataset-level rules
      ruleValue: data.ruleValue, // User's validation expression/condition from form data
      runFrequency: data.runFrequency, // Execution schedule from form data (e.g., "Daily", "Weekly")
    };

    // Log the complete payload for debugging and audit purposes
    // Helps track what data is being sent to the backend
    console.log("Suggest Rules payload ", payload);

    // Wrap API call in try-catch to handle both success and error cases
    try {
      // Make asynchronous API call to create the rule in the backend
      // Uses the Great Expectations service to submit the rule configuration
      // Response contains a run_id for tracking the job execution
      const response: any = await greatExpectationsService.manageDataQualityRule(payload);
      
      // Register the run ID with the job status toaster for real-time tracking
      // This allows users to monitor the progress of rule creation in the UI
      // Example: addRunId("run_abc123") adds this job to the tracking system
      addRunId(response?.run_id);
      
      // API call succeeded - rule was created successfully
      // Show success notification with run ID to inform user and provide tracking reference
      // Position: "top-end" displays toast in top-right corner
      // Example: "Request to create rule has been submitted successfully with Run ID: run_abc123"
      showToast(
        `Request to create rule has been submitted successfully with Run ID: ${response?.run_id}`,
        undefined, // Use default toast type (success)
        undefined, // Use default duration
        "top-end" // Position toast at top-right of screen
      );
    } catch (error) {
      // API call failed - rule creation encountered an error
      // Log error details to console for debugging and troubleshooting
      console.error("Failed to create rule:", error);
    }
  };

  // Function to close the dialog and reset loading state
  // Called when user clicks "Discard All" button, closes dialog via X button, or after successful rule submission
  //
  // Purpose: Provides a clean way to exit the modal
  // - Resets loading state (in case dialog was closed during submission)
  // - Notifies parent component to hide the dialog
  // - All user selections and inputs will be reset on next open due to useEffect
  const handleDiscard = () => {
    // Reset loading flag to false in case dialog is closed during submission
    // Ensures button returns to enabled state for next time dialog opens
    setIsLoading(false);
    
    // Notify parent component to hide the dialog by setting open state to false
    // This triggers the dialog to animate closed and become hidden
    onOpenChange(false);
  }

  /**
   * Filters the UI suggested rules based on the search query.
   * 
   * Uses useMemo for performance optimization - only recomputes when dependencies change.
   * 
   * Filtering logic:
   * - Converts search text to lowercase for case-insensitive matching
   * - A rule is included if the search text matches any of the following fields:
   *   - `category` (e.g., "metadata", "data_profiling")
   *   - `ruleType` (e.g., "completeness", "uniqueness", "volume")
   *   - `ruleName` (e.g., "completeness_check", "volume_check")
   *   - `targetColumn` (e.g., "customer_id", "order_date")
   * 
   * Side effects when search changes:
   * - Clears all frequency selections (user needs to reconfigure after filtering)
   * - Clears all rule value inputs (prevents mismatched data)
   * - Clears all rule selections (prevents selecting hidden rules)
   * 
   * Example:
   * - User types "completeness" → shows only rules with "completeness" in category, type, name, or column
   * - User types "customer_id" → shows only rules that target the customer_id column
   * - User types "" (empty) → shows all rules (no filtering)
   */
  const filteredRules = useMemo(() => {
    // Convert search input to lowercase for case-insensitive comparison
    // Example: "COMPLETENESS" becomes "completeness" for matching
    const searchText = search.toLowerCase();
    
    // Clear all frequency selections when filter changes
    // Prevents user from having frequencies set for rules that are now hidden by the filter
    setFrequencies({});
    
    // Clear all rule value inputs when filter changes
    // Prevents user from having values set for rules that are now hidden by the filter
    setRuleValues({});
    
    // Clear all rule selections when filter changes
    // Prevents user from having invisible rules selected (confusing state)
    setSelectedSuggestionIndices(new Set());

    // Filter the uiRules array based on search text matching
    // Returns new array containing only rules that match the search criteria
    return uiRules?.filter(
      (rule: UISuggestedRule) =>
        rule.category.toLowerCase().includes(searchText) || // Match against category (e.g., "metadata", "data_profiling")
        rule.ruleType.toLowerCase().includes(searchText) || // Match against rule type (e.g., "completeness", "uniqueness")
        rule.ruleName.toLowerCase().includes(searchText) || // Match against rule name (e.g., "completeness_check")
        rule.targetColumn?.toLowerCase().includes(searchText) // Match against target column name (e.g., "customer_id")
    );
  }, [uiRules, search]); // Recompute filtered rules when uiRules data changes or search text changes

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  // Render the modal dialog UI with all suggested rules, search functionality, and controls
  return (
    <>
    <Dialog
      open={open}  // Control dialog visibility - true shows modal, false hides it
      onOpenChange={(_, { open: isOpen }) => onOpenChange(isOpen)}  // Handle dialog close events (X button, Esc key, backdrop click)
    >
      {/* Dialog container surface - provides the white modal background and proper z-index layering */}
      <DialogSurface >
        <DialogBody>
          {/* Dialog header section with title and search box */}
          {/* The action prop in DialogTitle allows placing custom components in the header (search box) */}
          <DialogTitle
            action={
              // SearchBox component for filtering/searching through suggested rules
              // Placed in header for easy access and visibility
              <SearchBox
                className="w-[18rem]" // Fixed width of 18rem (288px) for consistent layout
                placeholder="Filter by name, type, or column…" // Hint text shown when empty to guide users
                value={search} // Controlled input - value from search state
                onChange={(_, data) => {
                  setSearch(data.value); // Update the search state when user types, triggering filteredRules recalculation
                }}
              />
            }
          >Rule Suggestions</DialogTitle>

          {/* Main scrollable content area containing all rule cards and different UI states */}
          <DialogContent>
            <div className="flex flex-col gap-2 mt-2">
              {/* LOADING STATE: Show loading text while fetching rules from backend */}
              {/* Displayed during the initial API call to fetch suggested rules */}
              {/* Example: "Loading suggested rules..." appears for 1-2 seconds while SQL query executes */}
              {isFetchingSuggestedRules && (
                <Text size={200} weight="semibold" align="center" className="text-neutral-foreground-2 mt-2 mb-4">
                  Loading suggested rules...
                </Text>
              )}

              {/* EMPTY STATE: Show message if no suggestions match the current filter or no rules available */}
              {/* Occurs when:
                   1. The SQL query returns an empty array (no rules suggested for this dataset)
                   2. User's search filter excludes all rules (e.g., searching for "xyz" when no rules match)
              */}
              {/* Example: "No suggested rules available." when table has no analyzable columns */}
              {!isFetchingSuggestedRules && filteredRules.length === 0 && (
                <Text size={200} weight="semibold" align="center" className="text-neutral-foreground-2 mt-2 mb-4">No suggested rules available.</Text>
              )}

            {/* LOADED STATE: Display the grid of suggested rule cards when data is available */}
            {/* This is the main UI shown when rules have been successfully fetched and transformed */}
            {/* Example: Shows 15 rule cards if the query returned suggestions for 1 dataset + 9 columns with multiple rules each */}
            {/* The filtering happens visually by hiding non-matching cards via the map logic */}
            {!isFetchingSuggestedRules && filteredRules.length > 0 && (
              <div className={styles.suggestionGrid}>
                {/* Loop through each rule in the full uiRules array and render an interactive card */}
                {/* Each card represents one suggested data quality rule that can be selected and configured */}
                {filteredRules.map((rule, idx) => {
                  // Check if this rule card is currently selected by the user
                  // Used to apply selected styling and control checkbox state
                  const isSelected = selectedSuggestionIndices.has(idx);
                  return (
                    <div
                      key={idx} // Unique React key using array index (stable since uiRules doesn't reorder)
                      className={`${styles.suggestionCard} ${
                        isSelected ? styles.selectedSuggestion : ""
                      }`} // Apply selected styling (blue border/background) if this card is selected
                      onClick={() => {
                        // Toggle selection state when user clicks the card (if validation passes)
                        toggleSuggestionSelection(idx);
                      }}
                    >
                      {/* CARD HEADER: Checkbox, rule name, and category/type badges */}
                      {/* Example: [✓] completeness_check [data_profiling] [completeness] */}
                      <div className={styles.ruleHeaderRow}>
                        {/* Checkbox for explicit selection control */}
                        {/* Checked state is controlled by whether this card's index is in selectedSuggestionIndices Set */}
                        <Checkbox
                          checked={isSelected} // true if index is in Set, false otherwise
                          onChange={(event) => {
                            event.stopPropagation(); // Prevent triggering the card's onClick when clicking checkbox directly
                            // Toggle selection state when checkbox is clicked (if validation passes)
                            toggleSuggestionSelection(idx);
                          }}
                        />
                        
                        {/* Display the rule name as the primary identifier in semi-bold text */}
                        {/* Example: "completeness_check", "volume_check", "uniqueness_check" */}
                        <Text weight="semibold">{rule.ruleName}</Text>
                        
                        {/* Category badge - filled appearance with default color */}
                        {/* Shows high-level grouping: "metadata" or "data_profiling" */}
                        {/* Helps users quickly understand the rule's scope (dataset-level vs data quality) */}
                        <Badge appearance="filled">{rule.category}</Badge>
                        
                        {/* Rule type badge - outline appearance for visual contrast */}
                        {/* Shows specific type like "completeness", "uniqueness", "volume", etc. */}
                        {/* Provides more granular classification than category alone */}
                        <Badge appearance="outline">{rule.ruleType}</Badge>
                      </div>

                      {/* COLUMN NAME DISPLAY: Show target column if this is a column-level rule */}
                      {/* Only rendered if targetColumn exists (column-level rules) */}
                      {/* Example: "Column Name: customer_id" for a completeness check on customer_id column */}
                      {/* For dataset-level rules (targetColumn is undefined), this entire section is not rendered */}
                      {rule?.targetColumn && (
                        <Caption1>
                          <ColumnRegular /> Column Name: {rule.targetColumn}
                        </Caption1>
                      )}

                      {/* RUN FREQUENCY FIELD: Dropdown for selecting how often the rule should execute */}
                      {/* All rules have this field - it's always displayed regardless of rule type */}
                      {/* Example: User selects "Daily" to run this rule every day */}
                      <Field label="Run Frequency" onClick={(event) => event.stopPropagation()}>
                        <Dropdown
                          selectedOptions={
                            // Array of currently selected options (Fluent UI requirement)
                            // Either contains the selected frequency or is empty array if none selected
                            frequencies[idx] ? [frequencies[idx]] : []
                          }
                          placeholder="Select a run frequency" // Shown when no frequency is selected
                          onOptionSelect={(_, data) => {
                            // Handle frequency selection from dropdown
                            // Safety check: ensure an option value was actually selected
                            if (!data.optionValue) return;
                            
                            // Update frequency in state when user selects an option
                            // Uses functional setState to merge with existing frequencies
                            setFrequencies((prev) => ({
                              ...prev, // Keep all other rules' frequencies unchanged
                              [idx]: data.optionValue as string, // Update only this rule's frequency at index idx
                            }));
                          }}
                          onClick={(event) => event.stopPropagation()} // Prevent card selection when clicking inside dropdown
                        >
                          {/* Render each available frequency as a dropdown option */}
                          {/* Options from imported constant: "Daily", "Hourly", "Weekly", "Monthly", "Quarterly", "Yearly" */}
                          {runFrequencies.map((frequency) => (
                            <Option key={frequency} value={frequency}>
                              {frequency}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>

                      {/* RULE VALUE FIELD: Conditional textarea for custom validation expression */}
                      {/* Only shown if this specific rule type requires a custom value input */}
                      {/* Determined by shouldShowRuleValue helper function based on category + ruleType */}
                      {/* Example: "completeness_check" shows this field, "volume_check" might not */}
                      {shouldShowRuleValue(rule.category, rule.ruleType) && (
                        <Field 
                          label="Rule Value"
                          required
                          validationState={ruleValueErrors[idx] ? "error" : "none"}
                          validationMessage={ruleValueErrors[idx]}
                          onClick={(event) => event.stopPropagation()} // Prevent card selection when clicking inside textarea
                        > {/* Label explicitly states this is required */}
                          <Textarea
                            className={styles.textareaField} // Apply styles for width and min-height
                            value={ruleValues[idx] ?? ""} // Get current value from state, default to empty string if not set
                            onChange={(_, data) => {
                              // Update rule value in state when user types
                              // Uses functional setState to merge with existing values
                              setRuleValues((prev) => ({
                                ...prev, // Keep all other rules' values unchanged
                                [idx]: data.value, // Update only this rule's value at index idx
                              }));

                              // Clear error as user types
                              if (ruleValueErrors[idx]) {
                                setRuleValueErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy[idx];
                                  return copy;
                                });
                              }
                            }}
                            onClick={(event) => event.stopPropagation()} // Prevent card selection when clicking inside textarea
                            resize="vertical" // Allow user to resize textarea vertically for longer expressions
                          />
                        </Field>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </DialogContent>

          {/* DIALOG FOOTER: Action buttons for user to discard or apply rules */}
          <DialogActions>
            {/* Discard button - closes dialog without creating any rules */}
            {/* All user selections, inputs, and search filters are abandoned */}
            {/* Secondary appearance = less prominent styling than primary button */}
            <Button appearance="secondary" onClick={handleDiscard}>
              Discard All
            </Button>

            {/* Apply button - submits all selected rules to backend */}
            {/* Button is disabled in multiple scenarios to prevent invalid submissions:
                 1. isLoading = true: Rules are currently being submitted (prevents double-submission)
                 2. selectedSuggestionIndices.size === 0: No rules are selected (nothing to submit)
                 3. Any selected rule with required value has empty value: Incomplete data (validation check)
            */}
            {/* Button text dynamically shows count: "Add 3 Rules" or "Add 1 Rule" based on selection */}
            {/* Icon provides visual indicator of the "add" action */}
            <Button
              appearance="primary" // Primary appearance = prominent blue styling for main action
              icon={isLoading ? <Spinner size="tiny" /> : <AddSquareRegular />} // Plus/add icon to visually indicate adding action
              disabled={
                isLoading || // Disable during submission to prevent duplicate API calls
                selectedSuggestionIndices.size === 0 // Disable if nothing selected (no work to do)
              }
              onClick={handleApplySuggestions} // Trigger rule submission workflow when clicked
            >
              Add {selectedSuggestionIndices.size}{" "} {/* Show number of selected rules */}
              {selectedSuggestionIndices.size === 1 ? "Rule" : "Rules"} {/* Proper singular/plural grammar */}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
    </>
  );
};