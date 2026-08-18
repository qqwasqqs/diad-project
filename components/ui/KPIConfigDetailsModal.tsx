/**
 * Project Name: Teva Data Integrity Dashboard
 * Business Owner: Keerthi Pusuloori
 * Author: Radhe Raman Tiwari
 * Date: 27 January 2026
 * Purpose of the script:
 *   Displays detailed information about a KPI (Key Performance Indicator) configuration
 *    - in a modal dialog. Allows users to view all KPI parameters and edit certain fields
 *    - when Databricks cluster is running. Shows validation thresholds, alert settings,
 *    - calculation methods, and ownership/audit information.
 *    - Provides a comprehensive view of the KPI configuration for monitoring and management purposes.
 *    - Enables users to make updates to KPI parameters in a controlled way, with backend validation and job tracking.
 *    - Ensures that users have all necessary information about the KPI in one place, improving usability and efficiency.
 *    - Helps maintain data integrity by restricting edits to when the cluster is running and providing clear feedback on changes.
 *    - Supports the overall goal of the dashboard to monitor and manage data quality KPIs effectively.
 *
 * Real-World Example:
 *   Like a detailed product specification sheet that users can read, with ability to
 *   edit certain specifications when the system is in the right state.
 */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: We use it for consistent styling and built-in accessibility features. It offers components like Dialog for modals, 
        Button for actions, Text for typography, and Badge for status indicators, which we leverage to build our KPIConfigDetailsModal 
        with a professional look and feel.
*/
import {
  Dialog, // Modal dialog container that overlays on top of page content
  DialogSurface, // Background surface of the dialog with styling
  DialogBody, // Container for dialog content with proper spacing
  DialogTitle, // Header area of dialog showing title and action buttons
  DialogContent, // Main content area where details are displayed
  Button, // Interactive button component for actions (Edit, Save, Cancel, etc.)
  Text, // Text display component for labels, values, and headings
  Badge, // Small label showing status or category (e.g., "Enabled", "Brand Name")
  makeStyles, // Hook that creates styled CSS classes using Fluent design tokens
  tokens, // Design system tokens for colors, spacing, fonts, and borders
  Field, // Form field wrapper providing label and validation error display
  Dropdown, // Dropdown select component for choosing from multiple options
  Option, // Individual option within a Dropdown component
  Textarea, // Multi-line text input for editing paragraph-length values
  Tooltip, // Hover tooltip showing helpful information or disabled reasons
} from "@fluentui/react-components";
// Professional UI library by Microsoft that provides pre-built, accessible components
// Used to create consistent, enterprise-grade user interfaces matching modern design standards

/*
  @fluentui/react-icons
    - What it is: A library of SVG icons that match Fluent design standards.
    - Why used: We use it to add visual indicators for actions (like closing the modal) and information (like timestamps) throughout the UI. The icons help users quickly understand the purpose of buttons and the type of information being displayed, enhancing usability and aesthetics.
*/
import {
  Dismiss24Filled, // X icon for closing the modal (24px size, filled style)
  Calendar16Regular, // Calendar icon for date fields (16px size, regular outline style)
  Person16Regular, // Person icon for owner/user fields (16px size, regular outline style)
  History16Regular, // History/clock icon for updated timestamp (16px size, regular outline style)
} from "@fluentui/react-icons";
// Icon library that provides SVG icons matching Fluent design standards
// Used to add visual indicators for actions and information throughout the UI

/*
  @fluentui/react-components - Types
    - What it is: TypeScript type definitions for Fluent UI components and event data.
    - Why used: We import specific types to ensure our component's props and event handlers are correctly typed, improving code quality and developer experience. For example, DialogOpenChangeData type helps us define the shape of the data received when the dialog's open state changes, ensuring we handle it correctly in our onOpenChange callback.
*/
import type { DialogOpenChangeData } from "@fluentui/react-components"; // Type for dialog open/close event data

/*
  @/lib/helper
    - What it is: A local utility module containing helper functions for formatting and data manipulation.
    - Why used: We import the formatDateTime function to convert raw date/time values from the KPI configuration into human-readable strings for display in the modal. This ensures that timestamps are shown in a consistent and user-friendly format, enhancing the readability of audit information like "Last Updated".
*/
import { formatDateTime } from "@/lib/helper";
// Formats date/time objects into readable strings (e.g., "Jan 27, 2026 at 3:45 PM")

/*
  React Core Hooks
    - What they are: Built-in React hooks for managing component state and lifecycle.
    - Why used: We use useState to manage local state within the KPIConfigDetailsModal component, such as whether the user is currently editing a field (isEditing), which field is selected for editing (selectColumn), and the value being edited (updatedValue). The FC type is used to define our component as a Functional Component with typed props, improving code clarity and type safety.
*/
import { useState, FC } from "react";
// REACT CORE HOOKS - React hooks for component state and functionality
// useState: manages component state; FC: TypeScript type for functional components

// CUSTOM HOOKS - Application-specific hooks for toast notifications
/**
 * useGlobalToast Hook
 *
 * What it does: Provides access to a `showToast()` function for displaying brief notifications
 *
 * Why it's used: To show success/error messages to users after actions like saving KPI config changes
 *                The messages appear as toast notifications (temporary popup messages) at screen edges
 *
 * Real-world analogy: Like a notification badge that pops up to confirm an action or warn about an error
 */
import { useGlobalToast } from "@/hooks/useToast";

// GREAT EXPECTATIONS SERVICE - API client for KPI configuration management
/**
 * greatExpectationsService
 *
 * What it does: Provides API functions to communicate with backend Great Expectations service
 *
 * Why it's used: To send KPI configuration updates to the backend database/API
 *                The service handles validation, data transformation, and error handling
 *
 * Methods used in this file:
 *   - manageKPIConfiguration(): Sends updated KPI parameter values to backend for persistence
 *
 * Real-world analogy: Like a postal service that delivers configuration change requests to the backend
 */
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

// JOB STATUS TOASTER - For tracking long-running operations
/**
 * addRunId Function
 *
 * What it does: Registers a notebook job run ID for tracking in the JobStatusToaster component
 *
 * Why it's used: When saving KPI config changes, the backend returns a run_id. This function
 *                adds that ID to the global list of running jobs so users can see progress
 *                in the JobStatusToaster component (floating notification showing job status)
 *
 * Real-world analogy: Like getting a receipt number after submitting a request so you can track it
 */
import { addRunId } from "./JobStatusToaster";

/* --------------------------------------------------------------- */
/* Styles                                                          */
/* --------------------------------------------------------------- */

/**
 * useStyles Hook
 *
 * Creates reusable CSS classes for the modal and its sections
 * Uses Fluent design tokens (colors, spacing, fonts) for consistent brand styling
 * Tokens are automatically available in light/dark mode and respect accessibility settings
 *
 * makeStyles() is a Fluent UI pattern that creates scoped CSS classes (like BEM in CSS-in-JS)
 * This prevents style conflicts and keeps styling logic close to component code
 */
const useStyles = makeStyles({
  // SURFACE CLASS - Main modal dialog container
  surface: {
    maxWidth: "90vw", // Maximum width is 90% of viewport width
    width: "100%", // Takes full available width up to maxWidth
  },

  // TITLE WRAPPER CLASS - Header section containing KPI name and status badges
  titleWrapper: {
    display: "flex", // Use flexbox layout
    alignItems: "center", // Vertically center all items
    gap: tokens.spacingHorizontalS, // Add small horizontal spacing between items (name, brand badge, status badge)
  },

  // HEADER ACTIONS CLASS - Action buttons in top-right of modal (Edit/Cancel, Close)
  headerActions: {
    display: "flex", // Use flexbox to arrange buttons horizontally
    gap: tokens.spacingHorizontalS, // Add spacing between buttons
  },

  // GRID CLASS - Main content area displaying KPI configuration details
  grid: {
    display: "grid", // Use CSS Grid layout
    gridTemplateColumns: "repeat(3, 1fr)", // 3 equal columns (responsive: 3 columns for details like KPI Name, Format, Domain)
    gap: tokens.spacingHorizontalL, // Large horizontal gap between grid items
    marginTop: tokens.spacingVerticalS, // Small margin above the grid
  },

  // LABEL CLASS - Text styling for field labels (e.g., "KPI Format", "Alert Threshold")
  label: {
    color: tokens.colorNeutralForeground1, // Primary text color (dark in light theme, light in dark theme)
    fontSize: tokens.fontSizeBase300, // Medium font size for labels
    fontWeight: tokens.fontWeightMedium, // Semi-bold weight for emphasis
    marginBottom: "2px", // Small space between label and value
  },

  // VALUE CLASS - Text styling for field values (the actual KPI configuration data)
  value: {
    color: tokens.colorNeutralForeground2, // Secondary text color (slightly lighter than label)
    fontSize: tokens.fontSizeBase200, // Slightly smaller than label
    fontWeight: tokens.fontWeightRegular, // Regular weight (not bold)
    wordBreak: "break-word", // Break long words to prevent horizontal scrolling
  },

  // EDIT SECTION CLASS - Right panel shown when "Edit Configuration" is clicked
  editSection: {
    width: "35rem", // Fixed width panel for edit form
    display: "flex", // Flex layout to stack form elements vertically
    flexDirection: "column", // Stack items vertically (top to bottom)
    gap: tokens.spacingVerticalL, // Large vertical spacing between form fields
    padding: tokens.spacingVerticalL, // Inner padding around all sides
    borderRadius: tokens.borderRadiusMedium, // Slightly rounded corners for modern look
    border: `1px solid ${tokens.colorNeutralStroke1}`, // Light gray border to define the panel
  },
});

// ════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS - TypeScript interfaces for component props
// ════════════════════════════════════════════════════════════════════════════

interface KPIConfigDetailsModalProps {
  // The complete KPI configuration object containing all parameters like name, brand, thresholds, etc.
  // This object has properties like KPI_NAME, BRAND, THRESHOLD_LOOKBACK_VALUE, ALERT_THRESHOLD, etc.
  kpiConfig: Record<string, any>;

  // Boolean flag controlling whether the modal is visible or hidden
  // true = modal is shown; false = modal is hidden
  open: boolean;

  // Whether Databricks cluster is currently running
  // Used to enable/disable the "Edit Configuration" button
  // If cluster is down, editing is disabled to prevent issues (cluster needed for validation)
  isClusterRunning: boolean;

  // Callback function called when user tries to open/close the modal
  // Parent component uses this to update its modal visibility state
  // Real-world: Like a phone call button that lets the other person know you're calling
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * KPIConfigDetailsModal Component
 *
 * Displays a modal dialog showing all details of a KPI configuration
 * Includes capability to edit certain parameters when cluster is running
 *
 * Component Type: FC (Functional Component) with TypeScript props
 *
 * Props:
 *  - kpiConfig: The KPI configuration object containing all parameters to display
 *  - open: Controls whether the modal is visible or hidden
 *  - isClusterRunning: Determines if the "Edit Configuration" button is enabled
 *  - onOpenChange is called with true when user tries to open the modal, and false when they try to close it (e.g., clicking backdrop or close button)
 *
 * @returns JSX element representing the KPI configuration details modal dialog
 */
export const KPIConfigDetailsModal: FC<KPIConfigDetailsModalProps> = ({
  kpiConfig, // KPI data to display
  open, // Whether modal is visible
  isClusterRunning, // Whether editing is allowed
  onOpenChange, // Function to close modal
  canManage
}) => {
  // ──── COMPONENT SETUP ──────────────────────────────────────────────────

  // Get styled CSS classes created by useStyles hook
  // styles.surface, styles.grid, styles.label, styles.value, etc. are CSS class objects
  const styles = useStyles();

  // Get toast notification function from custom hook
  // showToast() displays temporary popup notifications to confirm actions or show errors
  const { showToast } = useGlobalToast();

  // ──── DERIVED STATE ────────────────────────────────────────────────────

  // Convert ENABLED field to boolean (handles both true/false and "true"/"false" strings)
  // Used to show "Enabled" or "Disabled" badge with appropriate color
  const isEnabled = kpiConfig.ENABLED === true || kpiConfig.ENABLED === "true";
  // ──── COMPONENT STATE ─────────────────────────────────────────────────

  /**
   * isEditing State
   *
   * Purpose: Controls whether the edit panel is shown on the right side of the modal
   *
   * Values:
   *   - false: User is viewing KPI details in read-only mode (default)
   *   - true: User clicked "Edit Configuration" and edit panel is now visible
   *
   * Controls: Which buttons show in header (Edit vs Cancel) and visibility of edit form
   * Real-world: Like switching between "View" and "Edit" mode on a document
   */
  const [isEditing, setIsEditing] = useState(false);

  /**
   * selectColumn State
   *
   * Purpose: Tracks which KPI parameter field the user selected to edit
   *
   * Values:
   *   - undefined: No field selected yet
   *   - "KPI_FORMAT", "CALCULATION_METHOD", etc.: The name of selected editable field
   *
   * Used to: Populate textarea with current value of that field
   * Real-world: Like highlighting which form field you want to edit on an invoice
   */
  const [selectColumn, setSelectColumn] = useState<string | undefined>(
    undefined,
  );

  /**
   * updatedValue State
   *
   * Purpose: Stores the new value user is typing into the edit textarea
   *
   * Values:
   *   - "": Empty string when no field or text is entered
   *   - Any string: The text user is editing
   *
   * Used to: Display in textarea and send to backend when saving
   * Real-world: Like the text you're typing in a note that hasn't been saved yet
   */
  const [updatedValue, setUpdatedValue] = useState<string>("");

  // ──── CONFIGURATION ────────────────────────────────────────────────────

  /**
   * editableFields Array
   *
   * Definition: List of KPI configuration field names that users are allowed to edit
   *
   * Purpose: Determines which fields appear in the edit dropdown
   *          (Not all fields are editable for data integrity and consistency reasons)
   *
   * Current editable fields:
   *   - KPI_FORMAT: How the KPI value is displayed (e.g., "Percentage", "Count")
   *   - CALCULATION_METHOD: Formula or method to calculate the KPI
   *   - THRESHOLD_DERIVATION_TYPE: Whether threshold is automatic or manual
   *   - THRESHOLD_DERIVATION_METHOD: How to automatically calculate threshold (e.g., "95th percentile")
   *   - THRESHOLD_DERIVATION_FORMULA: The actual formula for calculating threshold
   *   - THRESHOLD_LOOKBACK_VALUE: Number of days/records to use for threshold calculation
   *   - ALERT_THRESHOLD: The manual threshold value for triggering alerts
   *   - ALERT_THRESHOLD_UNIT: Unit of measurement (e.g., "percent", "count")
   *   - RUN_FREQUENCY: How often KPI quality checks run (e.g., "Daily", "Weekly")
   *
   * Note: Cannot edit KPI_NAME, BRAND, data location fields because these define the core KPI identity
   * Note to developers: Add new editable fields here to allow users to edit them
   */
  const editableFields = [
    "KPI_UNIQUE_IDENTIFIER_VALUE", // Unique identifier for the KPI value type or metric (e.g., "Percentage", "Count")
    "KPI_FORMAT", // How the KPI value is displayed (e.g., "Percentage", "Count")
    "CALCULATION_METHOD", // Formula or method to calculate the KPI
    "THRESHOLD_DERIVATION_TYPE", // Whether threshold is automatic or manual
    "THRESHOLD_DERIVATION_METHOD", // How to automatically calculate threshold (e.g., "95th percentile")
    "THRESHOLD_DERIVATION_FORMULA", // The actual formula for calculating threshold
    "THRESHOLD_LOOKBACK_VALUE", // Number of days/records to use for threshold calculation
    "ALERT_THRESHOLD", // The manual threshold value for triggering alerts
    "ALERT_THRESHOLD_UNIT", // Unit of measurement (e.g., "percent", "count")
    "RUN_FREQUENCY", // How often KPI quality checks run (e.g., "Daily", "Weekly")
    "ENABLED", // The status of the KPI configuration (whether it is enabled or disabled).
  ];

  // ──── UTILITY FUNCTIONS ────────────────────────────────────────────────

  /**
   * resetEditForm Function
   *
   * Purpose: Clear the edit form back to empty state
   *
   * Called when:
   *   - User clicks "Cancel" button
   *   - Successfully saved a change
   *
   * Actions:
   *   - setSelectColumn(undefined): No field selected
   *   - setUpdatedValue(""): Clear the text input
   *
   * Real-world: Like clearing fields on a form after submission so it's ready for the next change
   */
  const resetEditForm = () => {
    // Clear the selected field dropdown
    setSelectColumn(undefined);

    // Clear the input textarea
    setUpdatedValue("");
  };

  // ──── EVENT HANDLERS ───────────────────────────────────────────────────

  /**
   * handleSave Function
   *
   * Purpose: Save the edited KPI parameter value to the backend database
   *
   * Triggered when: User clicks "Update Parameter" button in edit form
   *
   * Process:
   *   1. Validate: Check that field selected and value entered
   *   2. Build payload: Object with configId, field name, and new value
   *   3. Call API: Send to greatExpectationsService.manageKPIConfiguration()
   *   4. On success:
   *      - Register the background job ID so users can track its progress
   *      - Show success toast notification with run ID
   *      - Close the edit form and modal
   *      - Parent component re-fetches latest KPI data
   *   5. On error: Log error to console (user won't see error toast in current implementation)
   *
   * Real-world: Like submitting a form to update your profile on a website
   */
  const handleSave = () => {
    // Early exit: Don't save if field not selected or value is empty
    if (!selectColumn || updatedValue === "") return;

    // Build the request payload with KPI config ID and the field/value to update
    // This object is sent to backend to update the database
    const payload = {
      configId: kpiConfig.CONFIG_ID, // Which KPI configuration to update (database ID)
      selectColumn: selectColumn, // Which field to update (e.g., "ALERT_THRESHOLD")
      updatedValue: updatedValue, // The new value for that field
    };

    // Call API to update KPI configuration
    // Service handles HTTP request, error handling, and response parsing
    greatExpectationsService
      .manageKPIConfiguration(payload)
      .then((response: any) => {
        // Success case: Update was submitted to backend successfully

        // Register the background job ID so JobStatusToaster tracks its progress
        // This allows users to see "Job X is processing..." notifications
        addRunId(response?.run_id);

        // Show success toast notification in top-right corner
        // Shows the run ID so user can reference it if needed
        showToast(
          `Request to update KPI configuration parameter has been submitted successfully with Run ID: ${response?.run_id}`,
          undefined, // No icon override (uses default)
          undefined, // No intent override (uses default success intent)
          "top-end", // Position: top-right corner
        );

        // Close edit form and modal
        handleCancel(); // Reset form and exit edit mode
        onOpenChange(false); // Close the modal
      })
      .catch((error: any) => {
        // Error case: Something failed (network, validation, etc.)
        // Current implementation logs error but doesn't show error toast to user
        // Could be improved to show error toast with helpful message
        console.error("Failed to update KPI configuration parameter:", error);
      });
  };

  /**
   * handleCancel Function
   *
   * Purpose: Exit edit mode without saving and clear the edit form
   *
   * Triggered when: User clicks "Cancel" button
   *
   * Actions:
   *   1. setIsEditing(false): Hide edit form, show "Edit Configuration" button again
   *   2. resetEditForm(): Clear field selection and textarea value
   *
   * Real-world: Like clicking "Discard Changes" on a form to go back to viewing
   */
  const handleCancel = () => {
    // Exit edit mode: Hide the edit panel on the right side
    setIsEditing(false);

    // Clear the edit form fields back to empty state
    resetEditForm();
  };

  // ════════════════════════════════════════════════════════════════════════════
  // COMPONENT RENDER - Return JSX to display the modal
  // ════════════════════════════════════════════════════════════════════════════

  return (
    // DIALOG WRAPPER - Overall modal container
    // modalType="modal": Makes this a blocking modal (user must close before interacting with page)
    // open: Controls visibility based on parent component's open state
    // onOpenChange: Called when user tries to open/close (e.g., clicking backdrop)
    <Dialog
      modalType="modal" // This makes the dialog block interaction with the rest of the page until it's closed
      open={open} // Controlled by parent component to show/hide the modal
      onOpenChange={
        (_, data: DialogOpenChangeData) => onOpenChange(!!data.open) // Convert event data to boolean and call parent callback
      }
    >
      {/* MODAL SURFACE - Styled background container with rounded corners and shadow */}
      {/* aria-describedby points to the body content for accessibility (screen readers) */}
      <DialogSurface
        className={styles.surface}
        aria-describedby="kpi-detail-body"
      >
        {/* DIALOG BODY - Layout container for title and content */}
        <DialogBody>
          {/* DIALOG TITLE SECTION - Header with KPI name, badges, and action buttons */}
          <DialogTitle
            action={
              // Action buttons in top-right: "Cancel" if editing, "Edit Configuration" if viewing
              canManage ? (
              <div className={styles.headerActions}>
                {isEditing ? (
                  // CANCEL BUTTON (shown only when in edit mode)
                  // Secondary appearance: less prominent, white background
                  // Calls handleCancel to exit edit mode without saving
                  <Button appearance="secondary" onClick={handleCancel}>
                    Cancel
                  </Button>
                ) : (
                  // EDIT CONFIGURATION BUTTON (shown when viewing, not editing)
                  // Wrapped in Tooltip to explain why it's disabled if cluster is down
                  <Tooltip
                    content={
                      isClusterRunning
                        ? "Click to edit configuration" // Enabled state message
                        : "The Databricks cluster is down. Please start the cluster first." // Disabled state message
                    }
                    relationship="label" // Accessibility: Tooltip is a label for the button
                    withArrow // Shows an arrow pointing to the button for clarity
                  >
                    {/* EDIT CONFIGURATION BUTTON */}
                    {/* Secondary appearance: less prominent style */}
                    {/* disabled={!isClusterRunning}: Button is disabled (grayed out) when cluster is not running */}
                    {/* onClick={...}: Clicking button sets isEditing to true to show the edit form */}
                    <Button
                      appearance="secondary" // Less visually prominent than primary buttons, with white background
                      onClick={() => setIsEditing(true)} // Enter edit mode when clicked
                      disabled={!isClusterRunning} // Disable button if cluster is not running to prevent editing when validation can't occur
                    >
                      Edit Configuration
                    </Button>
                  </Tooltip>
                )}

                {/* CLOSE BUTTON - X icon to close the modal */}
                {/* appearance="subtle": Minimal styling, no background */}
                {/* icon: Shows X icon (Dismiss24Filled) */}
                {/* aria-label: Describes button purpose for screen readers */}
                {/* onClick: Calls onOpenChange(false) to tell parent to close modal */}
                <Button
                  appearance="subtle" // Minimal styling for icon-only button
                  icon={<Dismiss24Filled />} // X icon from Fluent UI icons
                  aria-label="Close" // Accessibility label for screen readers
                  onClick={() => onOpenChange(false)} // Close the modal when clicked
                />
              </div>
              ) : <></>
            }
          >
            {/* TITLE SECTION - Shows KPI name, brand, and enabled/disabled status */}
            <div className={styles.titleWrapper}>
              {/* KPI NAME - Bold, large text showing the KPI identifier */}
              {/* Example: "Monthly Sales Target" */}
              <Text weight="bold" size={600}>
                {kpiConfig.KPI_NAME}
              </Text>

              {/* BRAND BADGE - Shows which business brand this KPI belongs to */}
              {/* appearance="outline": Light border style, unobtrusive */}
              {/* color="brand": Uses brand color from design tokens */}
              {/* Example: "Pharmaceutical Division" */}
              <Badge appearance="outline" color="brand">
                {kpiConfig.BRAND}
              </Badge>

              {/* STATUS BADGE - Shows if KPI monitoring is enabled or disabled */}
              {/* appearance="filled": Solid background for clear visibility */}
              {/* color: Green (success) if enabled, Red (severe) if disabled */}
              {/* Example: Green "Enabled" or Red "Disabled" */}
              <Badge
                color={isEnabled ? "success" : "severe"} // Green for enabled, Red for disabled
                appearance="filled" // Solid background to make status clear and prominent
              >
                {isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </DialogTitle>

          {/* MAIN CONTENT AREA - Displays KPI details and edit form (if editing) */}
          {/* id="kpi-detail-body": Referenced by aria-describedby for accessibility */}
          <DialogContent id="kpi-detail-body">
            {/* Flex container creates two-column layout: details on left, edit form on right (if editing) */}
            {/* gap-4: Space between the two columns */}
            <div className="flex gap-4">
              {/* LEFT COLUMN - 3-column grid of KPI configuration details */}
              {/* LEFT COLUMN - 3-column grid displaying all KPI configuration parameters */}
              <div className={styles.grid}>
                {/* ──────────────────────────────────────── */}
                {/*    FIELD: Catalog / Schema / Dataset     */}
                {/* ──────────────────────────────────────── */}
                {/* Location in data warehouse where KPI source table is stored */}
                {/* Format: catalog.schema.table (hierarchical structure like folders) */}
                {/* Example: "teva_analytics.sales_data.monthly_sales" */}
                <div>
                  {/* LABEL: Field name displayed in bold/medium weight */}
                  <div className={styles.label}>Catalog / Schema / Dataset</div>
                  {/* VALUE: Concatenated database location path */}
                  <div className={styles.value}>
                    {/* CATALOG_NAME: Top-level database catalog */}
                    {kpiConfig.CATALOG_NAME}.
                    {/* SCHEMA_NAME: Schema within the catalog */}
                    {kpiConfig.SCHEMA_NAME}.
                    {/* DATASET_NAME: Table/dataset name within the schema */}
                    {kpiConfig.DATASET_NAME}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*   FIELD: KPI Unique Identifier           */}
                {/* ──────────────────────────────────────── */}
                {/* Column name that uniquely identifies each KPI record and its specific value */}
                {/* Example: If column is "PRODUCT_ID", value might be "12345" for a specific product */}
                <div>
                  {/* LABEL: Field name for the unique identifier */}
                  <div className={styles.label}>KPI Unique Identifier</div>
                  {/* VALUE: Shows identifier column name = actual value for this KPI */}
                  <div className={styles.value}>
                    {/* KPI_UNIQUE_IDENTIFIER: Column name (e.g., "PRODUCT_ID") */}
                    {kpiConfig.KPI_UNIQUE_IDENTIFIER ?? "—"}
                    {/* Separator: Equals sign between column name and value */}
                    {" = "}
                    {/* KPI_UNIQUE_IDENTIFIER_VALUE: Actual value for this KPI (e.g., "12345") */}
                    {kpiConfig.KPI_UNIQUE_IDENTIFIER_VALUE ?? "—"}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*  FIELD: Data Domain / Source / Vendor    */}
                {/* ──────────────────────────────────────── */}
                {/* Business area • External data provider • Vendor name */}
                {/* Example: "Sales • Salesforce • Salesforce Inc." */}
                <div>
                  {/* LABEL: Field name for data origin information */}
                  <div className={styles.label}>
                    Data Domain / Source / Vendor
                  </div>
                  {/* VALUE: Three-part combination with bullet separators */}
                  <div className={styles.value}>
                    {/* DATA_DOMAIN: Business domain (e.g., "Sales", "Marketing", "Operations") */}
                    {kpiConfig.DATA_DOMAIN}
                    {/* SEPARATOR: Bullet point between domain and source */}
                    {" • "}
                    {/* DATA_SOURCE: Where data originates (e.g., "Salesforce", "SAP", "Database") */}
                    {kpiConfig.DATA_SOURCE}
                    {/* SEPARATOR: Bullet point between source and vendor */}
                    {" • "}
                    {/* DATA_VENDOR: Third-party vendor name (e.g., "Salesforce Inc.", "Oracle Corp") */}
                    {kpiConfig.DATA_VENDOR}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*     FIELD: Calculation Method            */}
                {/* ──────────────────────────────────────── */}
                {/* How the KPI value is mathematically calculated from raw data */}
                {/* Example: "SUM of daily sales" or "AVERAGE adjusted for returned items" */}
                <div>
                  {/* LABEL: Field name for calculation approach */}
                  <div className={styles.label}>Calculation Method</div>
                  {/* VALUE: Text description of calculation formula/method */}
                  <div className={styles.value}>
                    {/* CALCULATION_METHOD: Editable field containing the KPI calculation logic */}
                    {kpiConfig.CALCULATION_METHOD}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*      FIELD: Target Column                */}
                {/* ──────────────────────────────────────── */}
                {/* Database column name that contains the KPI values to monitor */}
                {/* Example: "TOTAL_SALES" or "CUSTOMER_COUNT" */}
                <div>
                  {/* LABEL: Field name for the target data column */}
                  <div className={styles.label}>Target Column</div>
                  {/* VALUE: Name of the database column being monitored */}
                  <div className={styles.value}>
                    {/* TARGET_COLUMN: Column name in source table */}
                    {kpiConfig.TARGET_COLUMN}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*       FIELD: KPI Format                  */}
                {/* ──────────────────────────────────────── */}
                {/* How KPI values are displayed/formatted in the UI and reports */}
                {/* Example: "Percentage" for 75.5%, "Count" for 1000000, "Currency" for $50000 */}
                <div>
                  {/* LABEL: Field name for value formatting style */}
                  <div className={styles.label}>KPI Format</div>
                  {/* VALUE: Format type used for display (editable field) */}
                  <div className={styles.value}>
                    {/* KPI_FORMAT: Editable field - defines how to format/display KPI values */}
                    {kpiConfig.KPI_FORMAT}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*  FIELD: Threshold Derivation Type       */}
                {/* ──────────────────────────────────────── */}
                {/* Whether alert threshold is automatically calculated or manually entered */}
                {/* Values: "Automatic" (uses historical data) or "Manual" (user-specified) */}
                <div>
                  {/* LABEL: Field name for threshold derivation approach */}
                  <div className={styles.label}>Threshold Derivation Type</div>
                  {/* VALUE: Type of threshold calculation method (editable field) */}
                  <div className={styles.value}>
                    {/* THRESHOLD_DERIVATION_TYPE: Editable field - "Automatic" or "Manual" */}
                    {kpiConfig.THRESHOLD_DERIVATION_TYPE}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*  FIELD: Threshold Derivation Method     */}
                {/* ──────────────────────────────────────── */}
                {/* If "Automatic": Statistical method for calculating threshold from history */}
                {/* Example: "95th percentile" means use 95th percentile of past 90 days data */}
                <div>
                  {/* LABEL: Field name for the calculation method */}
                  <div className={styles.label}>
                    Threshold Derivation Method
                  </div>
                  {/* VALUE: Method name used for automatic threshold calculation (editable field) */}
                  <div className={styles.value}>
                    {/* THRESHOLD_DERIVATION_METHOD: Editable field - method name (e.g., "95th percentile") */}
                    {kpiConfig.THRESHOLD_DERIVATION_METHOD}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*  FIELD: Threshold Derivation Formula    */}
                {/* ──────────────────────────────────────── */}
                {/* If "Automatic": The statistical formula/script used to compute the threshold */}
                {/* Example: "PERCENTILE_CONT(0.95)" or "MEAN - 2*STDDEV" */}
                <div>
                  {/* LABEL: Field name for the mathematical formula */}
                  <div className={styles.label}>
                    Threshold Derivation Formula
                  </div>
                  {/* VALUE: Actual formula/code for threshold calculation (editable field) */}
                  <div className={styles.value}>
                    {/* THRESHOLD_DERIVATION_FORMULA: Editable field - SQL/Python formula for threshold */}
                    {kpiConfig.THRESHOLD_DERIVATION_FORMULA}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*   FIELD: Threshold Lookback Value       */}
                {/* ──────────────────────────────────────── */}
                {/* Number of historical days/records to use when calculating automatic threshold */}
                {/* Example: "90" means use past 90 days of data for threshold calculation */}
                <div>
                  {/* LABEL: Field name for lookback period */}
                  <div className={styles.label}>Threshold Lookback Value</div>
                  {/* VALUE: Number of days/records for historical data window (editable field) */}
                  <div className={styles.value}>
                    {/* THRESHOLD_LOOKBACK_VALUE: Editable field - numeric value for lookback period */}
                    {kpiConfig.THRESHOLD_LOOKBACK_VALUE}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*      FIELD: Alert Threshold             */}
                {/* ──────────────────────────────────────── */}
                {/* The threshold value that triggers an alert when KPI breaches it */}
                {/* Used in "Manual" mode or as override for "Automatic" threshold */}
                <div>
                  {/* LABEL: Field name for alert threshold */}
                  <div className={styles.label}>Alert Threshold</div>
                  {/* VALUE: Threshold value that triggers alerts (editable field) */}
                  <div className={styles.value}>
                    {/* ALERT_THRESHOLD: Editable field - numeric threshold value for alerting */}
                    {kpiConfig.ALERT_THRESHOLD}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*   FIELD: Alert Threshold Unit           */}
                {/* ──────────────────────────────────────── */}
                {/* Unit of measurement for the alert threshold value */}
                {/* Example: "percent" for percentage, "count" for absolute numbers, "dollars" for currency */}
                <div>
                  {/* LABEL: Field name for measurement unit */}
                  <div className={styles.label}>Alert Threshold Unit</div>
                  {/* VALUE: Unit type for the threshold (editable field) */}
                  <div className={styles.value}>
                    {/* ALERT_THRESHOLD_UNIT: Editable field - unit (e.g., "percent", "count", "dollars") */}
                    {kpiConfig.ALERT_THRESHOLD_UNIT}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*      FIELD: Validation Type             */}
                {/* ──────────────────────────────────────── */}
                {/* Type of data validation applied to the KPI values */}
                {/* Example: "Range Check", "Null Check", "Pattern Match" */}
                <div>
                  {/* LABEL: Field name for validation type */}
                  <div className={styles.label}>Validation Type</div>
                  {/* VALUE: Type of validation rule applied to KPI data */}
                  <div className={styles.value}>
                    {/* VALIDATION_TYPE: Type of validation (e.g., "Range Check", "Null Check") */}
                    {kpiConfig.VALIDATION_TYPE}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*    FIELD: Receiver Alert ID              */}
                {/* ──────────────────────────────────────── */}
                {/* External system ID for routing alerts to notification providers */}
                {/* Example: Alert ID in ServiceNow, PagerDuty, or email distribution list */}
                <div>
                  {/* LABEL: Field name for alert receiver */}
                  <div className={styles.label}>Receiver Alert ID</div>
                  {/* VALUE: ID used to route alerts to external systems */}
                  <div className={styles.value}>
                    {/* RECEIVER_ALERT_ID: Alert routing ID (shows "-" if not set) */}
                    {kpiConfig.RECEIVER_ALERT_ID ?? "-"}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*       FIELD: Run Frequency               */}
                {/* ──────────────────────────────────────── */}
                {/* How often the KPI quality validation checks are executed */}
                {/* Example: "Daily" (runs every day), "Weekly" (runs every Sunday), "Hourly" */}
                <div>
                  {/* LABEL: Field name for execution frequency */}
                  <div className={styles.label}>Run Frequency</div>
                  {/* VALUE: Frequency schedule for KPI validation (editable field) */}
                  <div className={styles.value}>
                    {/* RUN_FREQUENCY: Editable field - how often checks run (e.g., "Daily", "Weekly") */}
                    {kpiConfig.RUN_FREQUENCY}
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*        FIELD: Owner                      */}
                {/* ──────────────────────────────────────── */}
                {/* Email address of the person responsible for this KPI */}
                {/* Used for routing alerts and ownership tracking */}
                <div className="flex items-center gap-2">
                  {/* ICON: Person icon to visually indicate this is a user field */}
                  <Person16Regular />
                  {/* FIELD CONTAINER: Wrapper for label and value */}
                  <div>
                    {/* LABEL: Field name for ownership */}
                    <div className={styles.label}>Owner</div>
                    {/* VALUE: Email address of the KPI owner */}
                    <div className={styles.value}>
                      {/* OWNER_EMAIL: Contact email for person responsible for this KPI */}
                      {kpiConfig.OWNER_EMAIL}
                    </div>
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*       FIELD: Created By                  */}
                {/* ──────────────────────────────────────── */}
                {/* Email address of the person who originally created this KPI configuration */}
                {/* Audit trail information for tracking changes */}
                <div className="flex items-center gap-2">
                  {/* ICON: Person icon to visually indicate this is a user field */}
                  <Person16Regular />
                  {/* FIELD CONTAINER: Wrapper for label and value */}
                  <div>
                    {/* LABEL: Field name for creator */}
                    <div className={styles.label}>Created By</div>
                    {/* VALUE: Email address of the original creator */}
                    <div className={styles.value}>
                      {/* CREATED_BY: User who first created this KPI configuration */}
                      {kpiConfig.CREATED_BY}
                    </div>
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*       FIELD: Created At                  */}
                {/* ──────────────────────────────────────── */}
                {/* Date and time when this KPI configuration was originally created */}
                {/* Used for audit trail and understanding configuration history */}
                <div className="flex items-center gap-2">
                  {/* ICON: Calendar icon to visually indicate this is a date/time field */}
                  <Calendar16Regular />
                  {/* FIELD CONTAINER: Wrapper for label and value */}
                  <div>
                    {/* LABEL: Field name for creation timestamp */}
                    <div className={styles.label}>Created At</div>
                    {/* VALUE: Formatted date/time of creation */}
                    <div className={styles.value}>
                      {/* CREATED_AT: Timestamp formatted using formatDateTime helper function */}
                      {formatDateTime(kpiConfig.CREATED_AT)}
                    </div>
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*      FIELD: Last Updated                 */}
                {/* ──────────────────────────────────────── */}
                {/* Date and time of the most recent modification to this KPI configuration */}
                {/* Shows when configuration parameters were last changed */}
                <div className="flex items-center gap-2">
                  {/* ICON: Calendar icon to visually indicate this is a date/time field */}
                  <Calendar16Regular />
                  {/* FIELD CONTAINER: Wrapper for label and value */}
                  <div>
                    {/* LABEL: Field name for last update timestamp */}
                    <div className={styles.label}>Last Updated</div>
                    {/* VALUE: Formatted date/time of most recent change */}
                    <div className={styles.value}>
                      {/* UPDATED_AT: Timestamp formatted using formatDateTime helper function */}
                      {formatDateTime(kpiConfig.UPDATED_AT)}
                    </div>
                  </div>
                </div>

                {/* ──────────────────────────────────────── */}
                {/*      FIELD: Updated By                   */}
                {/* ──────────────────────────────────────── */}
                {/* Email address of the person who most recently modified this KPI */}
                {/* Audit trail for tracking who made the latest changes */}
                <div className="flex items-center gap-2">
                  {/* ICON: History icon to visually indicate this is audit/change information */}
                  <History16Regular />
                  {/* FIELD CONTAINER: Wrapper for label and value */}
                  <div>
                    {/* LABEL: Field name for last modifier */}
                    <div className={styles.label}>Updated By</div>
                    {/* VALUE: Email address of the person who last updated */}
                    <div className={styles.value}>
                      {/* UPDATED_BY: User who most recently modified this KPI configuration */}
                      {kpiConfig.UPDATED_BY}
                    </div>
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────── */}
              {/*          Edit Section (conditional)        */}
              {/* ──────────────────────────────────────── */}

              {/* RIGHT COLUMN - Edit panel shown when user clicks "Edit Configuration" */}
              {/* Appears next to the details grid on the right side when isEditing is true */}
              {isEditing && (
                // EDIT SECTION CONTAINER - Styled panel with border and padding
                // className={styles.editSection}: Applies fixed width, flex column layout, spacing, and border styling
                <div className={styles.editSection}>
                  {/* SECTION TITLE - "Edit KPI Configuration" heading */}
                  {/* weight="semibold": Medium-bold font weight for section header */}
                  {/* size={500}: Medium-large text size for visual hierarchy */}
                  <Text weight="semibold" size={500}>
                    Edit KPI Configuration
                  </Text>

                  {/* PARAMETER SELECTION FIELD - Dropdown to choose which field to edit */}
                  {/* Field component wraps dropdown with label and required indicator */}
                  {/* label: "Select KPI Configuration Parameter" shown above dropdown */}
                  {/* required: Shows asterisk (*) to indicate this field must be filled */}
                  <Field label="Select KPI Configuration Parameter" required>
                    {/* DROPDOWN COMPONENT - Select list for choosing editable parameters */}
                    {/* placeholder="Select a parameter": Gray text shown when nothing selected */}
                    {/* value={selectColumn ?? ""}: Controlled component - shows currently selected field name or empty string */}
                    {/* onOptionSelect: Called when user selects an option from the dropdown */}
                    <Dropdown
                      placeholder="Select a parameter" // Helper text shown in dropdown when no option is selected to prompt user to choose
                      value={selectColumn ?? ""} // Shows the currently selected field name in the dropdown; if selectColumn is undefined, shows empty string
                      onOptionSelect={(_, data) => {
                        // Extract the selected field name from dropdown option
                        // data.optionValue contains the field name (e.g., "ALERT_THRESHOLD")
                        const parameter = data.optionValue ?? "";

                        // Update selectColumn state with the selected field name
                        // This highlights which field user selected in the dropdown
                        setSelectColumn(parameter);

                        // Pre-populate the textarea with current value of selected field
                        // kpiConfig[parameter] gets the existing value from the KPI object
                        // ?? "" provides empty string if field doesn't exist (fallback)
                        setUpdatedValue(kpiConfig[parameter] ?? "");
                      }}
                    >
                      {/* DROPDOWN OPTIONS - Map editable fields array to Option components */}
                      {/* Only fields in editableFields array are available for editing */}
                      {editableFields.map((field) => (
                        // OPTION ELEMENT - Single selectable item in dropdown
                        // key={field}: React key for list rendering (must be unique)
                        // value={field}: The value sent to onOptionSelect when clicked
                        <Option key={field} value={field}>
                          {/* OPTION LABEL - Field name displayed to user (e.g., "ALERT_THRESHOLD") */}
                          {field}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>

                  {/* VALUE INPUT FIELD - Textarea for editing the selected parameter's value */}
                  {/* Field component wraps textarea with label and required indicator */}
                  {/* label: "Update Selected Parameter Value" shown above textarea */}
                  {/* required: Shows asterisk (*) to indicate user must enter a value */}
                  <Field label="Update Selected Parameter Value" required>
                    {/* TEXTAREA COMPONENT - Multi-line text input for editing parameter value */}
                    {/* value={updatedValue}: Controlled component showing current edited text */}
                    {/* onChange: Called when user types in the textarea */}
                    {/* placeholder: Helper text shown when textarea is empty */}
                    {/* resize="vertical": User can resize textarea height by dragging bottom edge */}
                    {/* size="medium": Standard textarea size from Fluent design system */}
                    {/* className="h-20": CSS class to set fixed height (20 units = ~5 lines of text) */}
                    <Textarea
                      value={updatedValue} // Shows the current text user has entered for the selected parameter
                      onChange={(_, data) => {
                        // Update updatedValue state with the new text user typed
                        // data.value contains the current textarea text
                        setUpdatedValue(data.value);
                      }}
                      placeholder="Enter selected parameter new value" // Helper text shown when textarea is empty to guide user on what to do
                      resize="vertical" // Allow user to resize the textarea vertically if they need more space for longer values
                      size="medium" // Use medium size from Fluent UI for standard input height and padding
                      className="h-20" // Tailwind CSS class to set fixed height of the textarea to 20 units (approximately 5 lines of text) for better usability when editing longer values
                    />
                  </Field>

                  {/* BUTTON GROUP - Action buttons to Cancel or Save changes */}
                  {/* className="flex gap-2": Flexbox layout with small space between buttons */}
                  <div className="flex gap-2">
                    {/* CANCEL BUTTON - Discard changes and exit edit mode */}
                    {/* appearance="secondary": Less prominent white background style */}
                    {/* onClick={handleCancel}: Calls function to exit edit mode and clear form */}
                    <Button appearance="secondary" onClick={handleCancel}>
                      Cancel
                    </Button>

                    {/* UPDATE PARAMETER BUTTON - Save the edited value to backend */}
                    {/* appearance="primary": Prominent blue background to draw attention */}
                    {/* onClick={handleSave}: Calls function to send updated value to backend API */}
                    {/* disabled: Button is grayed out and non-clickable in these conditions: */}
                    {/*   1. !selectColumn: No field selected in dropdown yet */}
                    {/*   2. updatedValue === "": User hasn't entered any new value */}
                    {/*   3. updatedValue === (kpiConfig[selectColumn!] ?? ""): New value is same as current value (no change) */}
                    {/* This prevents saving when no change made or required fields empty */}
                    <Button
                      appearance="primary"
                      onClick={handleSave}
                      disabled={
                        // Disable if no field is selected
                        !selectColumn ||
                        // Disable if value textarea is empty
                        updatedValue === "" ||
                        // Disable if new value equals current value (nothing changed)
                        // selectColumn! (non-null assertion) tells TypeScript selectColumn is defined at this point
                        updatedValue === (kpiConfig[selectColumn!] ?? "")
                      }
                    >
                      Update Parameter
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
