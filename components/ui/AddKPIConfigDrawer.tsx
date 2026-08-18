/**
 * Project Name: Teva Data Integrity
 * Business Owner, Team: Keerthi Pusuloori
 * Script Author, Team: Radhe Raman Tiwari
 * Date: 27 January 2026
 *
 * Purpose of the script:
 *   A slide-out panel (drawer) that allows users to create new KPI (Key Performance Indicator)
 *   configurations in the data quality system. Users can specify:
 *   - What KPI to track (name, format, calculation method)
 *   - Where the data comes from (catalog, schema, dataset)
 *   - How to set alert thresholds (automatic or manual)
 *   - When to run checks (frequency)
 *   - Who to notify if issues are found (alert recipients)
 *
 *  Key Features:
 *   - User-friendly form with dropdowns, inputs, and validation
 *   - Integrates with backend API to save configurations
 *   - Shows loading state while submitting
 *   - Provides helpful tips and error messages for users
 *   - Real-time form validation with Zod and react-hook-form
 *  Why it's important:
 *  - Enables users to easily set up monitoring for their data pipelines without needing technical expertise
 *
 *  Real-world example: Like a form wizard that helps you set up automated quality checks
 *   on your data pipelines (e.g., "Alert if daily sales are 20% below average")
 */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
    React
    - What it is: A JavaScript library for building user interfaces, particularly single-page applications with dynamic content.
    - Why used: We use React to create a responsive and interactive user interface for the AddKPIConfigDrawer. React's component-based architecture allows us to break down the UI into reusable pieces, manage state effectively, and provide a seamless user experience when filling out the KPI configuration form.
*/
import { FC, useState } from "react";
// Core React features needed for this component:
// - FC: Type for Functional Components (ensures component has proper typing)
// - useState: Hook to manage local component state (e.g., loading indicator)

/*
    react-hook-form
    - What it is: A popular library for managing form state and validation in React applications.
    - Why used: We use react-hook-form to handle the complex form state of our KPI configuration form. It provides an easy way to track field values, manage validation, and handle form submission. With react-hook-form, we can create a responsive and user-friendly form that gives real-time feedback on validation errors and ensures that only valid data is submitted to the backend.
*/
import { useForm, Controller, FormProvider } from "react-hook-form";
// Libraries for handling form state, validation, and data flow
// - useForm: Hook that creates and manages form state (tracks all field values, errors, validation)
// - Controller: Component that helps connect individual form fields to the form state
//   (without Controller, form wouldn't know about individual field values)
// - FormProvider: Component that makes form state available to nested components
//   (like making form info accessible to child components without passing props everywhere)

/* 
  @fluentui/react-components
    - What it is: Microsoft's Fluent UI React component library, providing pre-built, accessible UI components.
    - Why used: We use it for consistent styling and built-in accessibility features. It offers components like OverlayDrawer for the side panel, Field for form layout, Dropdown for select lists, and Button for actions, which we leverage to build our AddKPIConfigDrawer with a professional look and feel.
*/
import {
  OverlayDrawer, // Side panel that slides in (like a sidebar that appears when needed)
  DrawerHeader, // Top section of drawer with title
  DrawerHeaderTitle, // Title text in the drawer header
  DrawerBody, // Main content area of the drawer
  DrawerFooter, // Bottom section with action buttons (Submit/Cancel)
  Field, // Wrapper for form inputs that adds label + error message display
  Dropdown, // Dropdown select list (shows options when clicked)
  Option, // Single selectable item in a dropdown
  Input, // Text input field for typing
  Text, // Styled text component for displaying information
  Button, // Interactive button for user actions
  Spinner, // Loading animation shown while waiting
  InfoLabel, // A label with additional info, often used to provide instructions or extra context
  LabelProps, // The props used to define the behavior and appearance of the label component
} from "@fluentui/react-components";
// Microsoft's Fluent Design System - professional UI building blocks

/*
    @fluentui/react-icons
    - What it is: A collection of SVG icons provided by Microsoft as part of the Fluent UI design system.
    - Why used: We use these icons to provide visual feedback and enhance the user interface. For example, we use the DismissRegular icon for the close button, the AddRegular icon for the submit button, and the InfoRegular icon in the informational banner. These icons help users quickly understand the purpose of buttons and sections, improving usability and aesthetics.
*/
import {
  DismissRegular, // "X" icon - for closing/dismissing
  AddRegular, // "+" icon - for creating/adding new items
  InfoRegular, // "i" icon - for informational messages
} from "@fluentui/react-icons";
// SVG icons from Microsoft's icon library for visual feedback

/*
    @/components/ui/JobStatusToaster
    - What it is: A custom component in our project that displays real-time notifications about the status of Databrick notebook jobs (like API calls to create KPI configurations).
    - Why used: We use the addRunId function from JobStatusToaster to track the progress of the API request that creates the KPI configuration. When we submit the form, we call addRunId with the run ID returned from the API, which allows the JobStatusToaster to show real-time updates on whether the job is running, succeeded, or failed. This provides users with immediate feedback on their action and improves the overall user experience.
*/
import { addRunId } from "@/components/ui/JobStatusToaster";
// Helper for showing notifications and tracking job runs:
// This function tracks background job runs so the JobStatusToaster can display progress

/**
  @/hooks/useToast
    - Purpose: Provides a function to display brief notification messages to users
    - What it does: Shows temporary toast notifications (like "Success!" or error messages)
    - Why used: To confirm when KPI configuration is submitted, or show error messages
    - Real-world: Like a notification banner that appears briefly in the corner of your screen
 */
import { useGlobalToast } from "@/hooks/useToast";

/*
  @hookform/resolvers/zod
    - What it is: A package that connects the Zod validation library to react-hook-form.
    - Why used: We use Zod to define a schema for our form data, specifying what fields are required and what formats they should have. 
        The zodResolver function from this package allows us to integrate that Zod schema with react-hook-form's validation system. 
        This means that when users fill out the form, their input is automatically checked against the rules we defined in the Zod schema,
        providing real-time validation feedback and ensuring that only valid data can be submitted.
*/
import { zodResolver } from "@hookform/resolvers/zod";
// This connects Zod validation library to react-hook-form
// (ensures form values match the required schema)

/*
    @/constants/schema
    - What it is: A file in our project that defines the data structure and validation rules for the KPI configuration form using Zod.
    - Why used: We use the AddKPIConfigFormData type to define what fields our form has and their types (e.g., string, number).
*/
import { AddKPIConfigFormData, addKPIConfigSchema } from "@/constants/schema";
// AddKPIConfigFormData: TypeScript type defining what fields the form has
// addKPIConfigSchema: Zod schema that validates each field (e.g., "email must be valid")

/*
    @/constants/rule
    - What it is: A file in our project that contains predefined lists of options for various form fields, such as data domains, threshold derivation types, methods, and run frequencies.
    - Why used: We use these constants to populate the dropdown options in our form. For example, the dataDomains array provides a list of valid business domains (like "Sales", "Finance") that users can select from when configuring their KPI. This ensures consistency and prevents users from entering invalid values.
*/
import {
  dataDomains,
  thresholdDerivationTypes,
  thresholdDerivationMethods,
  runFrequencies,
} from "@/constants/rule";
// Predefined option lists for dropdowns
// These are arrays of valid choices for different form fields
// Example: runFrequencies might be ["Daily", "Weekly", "Monthly"]

/*
    @/hooks/useGreatExpectations
    - What it is: A custom React hook in our project that fetches data related to Great Expectations, a data quality tool we use. Specifically, it retrieves the list of alert recipients (email distribution lists) that users can select when configuring their KPI alerts.
    - Why used: We use this hook to populate the "Receiver Alert Email" dropdown in our form with real data from the backend. This allows users to select from existing email distribution lists when setting up their KPI alerts, ensuring that notifications are sent to the correct recipients when data quality issues are detected.
*/
import { useGetKPIConfiguredAlerts } from "@/hooks/useGreatExpectations";
// Service for API calls and custom React hooks:
// This hook fetches list of alert recipients (email distribution lists)

/*
    @/lib/services/greatExpectationsService
    - What it is: A service module in our project that contains functions for making API calls to the Great Expectations backend. It handles requests related to managing KPI configurations, such as creating new configurations or fetching existing ones.
    - Why used: We use this service to submit the new KPI configuration data to the backend when the user submits the form. The manageKPIConfiguration function in this service takes the form data, sends it to the API, and returns a response that includes a run ID. This allows us to track the status of the configuration creation process and provide feedback to the user through notifications.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";
// Service that handles API calls to Great Expectations (data quality tool)
// Used to submit the KPI configuration to the backend

/*
    @/components/ui/FormCombobox
    - What it is: A custom reusable component in our project that combines a dropdown select list with the ability to type and search for options. It integrates with react-hook-form for form state management and validation.
    - Why used: We use the FormCombobox component for several fields in our form where users need to select from a list of options but also have the flexibility to type and filter those options. For example, the "Brand Name" field uses FormCombobox to allow users to either select from existing brands or type in a new one. This enhances the user experience by making it easier to find and select options, especially when there are many choices.
*/
import { FormCombobox } from "./FormCombobox";
// Reusable searchable dropdown component (lets users type to filter options)

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Props for the AddKPIConfigDrawer component
 * Defines what information parent component must pass to this component
 */
interface AddKPIConfigDrawerProps {
  // Whether the drawer is visible or hidden (true = visible, false = hidden)
  open: boolean;

  // Object containing filter/dropdown options for all form fields
  // Example: { BRANDS: ["Brand1", "Brand2"], DATA_SOURCES: ["Source1", "Source2"] }
  // This data populates all the dropdown and combobox options
  filtersData: Record<string, any>;

  // Callback function called when user opens/closes the drawer
  // Parent component uses this to update its state about drawer visibility
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * AddKPIConfigDrawer Component
 * A side panel for creating new KPI (Key Performance Indicator) configurations
 * Allows users to specify what to monitor, where to find the data, and how to alert
 * Integrates with backend API to save configurations and provides real-time feedback
 * Real-world example: Like a form wizard that helps you set up automated quality checks on your data pipelines (e.g., "Alert if daily sales are 20% below average")
 *
 * Props:
 * - open: controls whether the drawer is visible
 * - filtersData: provides dropdown options for form fields (e.g., brands, data sources)
 * - onOpenChange: callback to notify parent when drawer is opened/closed
 *
 * @returns JSX element representing the drawer with the KPI configuration form
 */
export const AddKPIConfigDrawer: FC<AddKPIConfigDrawerProps> = ({
  open, // Whether drawer should be visible
  filtersData, // Dropdown options for form fields
  onOpenChange, // Callback when user opens/closes drawer
}) => {
  // ──── HOOKS & STATE MANAGEMENT ────────────────────────────────────────

  // Get toast notification function to show success/error messages
  const { showToast } = useGlobalToast();

  // Fetch list of alert recipients (email distribution lists) from API
  const { alerts } = useGetKPIConfiguredAlerts();

  /**
   * isLoading State
   *
   * Purpose: Tracks whether the KPI configuration API request is in progress
   *
   * Values:
   *   - true: API call is in progress, form is being submitted
   *   - false: API call has completed or not yet started
   *
   * Used to:
   *   - Show loading spinner on submit button
   *   - Disable submit button to prevent duplicate submissions
   *   - Show user that their request is being processed
   *
   * Real-world: Like a status indicator that shows "Please wait, saving..." while data is being sent
   */
  const [isLoading, setIsLoading] = useState(false);

  // ──── FORM SETUP & INITIALIZATION ──────────────────────────────────────

  // Initialize form with validation schema
  // useForm creates form state, handles validation, tracks field values and errors
  // resolver: zodResolver connects our Zod validation schema to the form
  // mode: "onChange" validates fields whenever user changes them (not just on submit)
  const form = useForm<AddKPIConfigFormData>({
    resolver: zodResolver(addKPIConfigSchema), // Validate against Zod schema
    defaultValues: {
      // Initial empty values for all form fields
      brand: "", // Brand name (selected from dropdown or typed)
      kpi: "", // KPI name (text input)
      source: "", // Data source (selected from dropdown)
      vendor: "", // Data vendor/supplier name (text input)
      catalogName: "", // Database catalog name (selected from dropdown)
      schemaName: "", // Database schema name (text input)
      datasetName: "", // Table/dataset name (text input)
      dataDomain: "", // Business domain (selected from dropdown)
      kpiUniqueIdentifier: "", // Unique column identifier for the KPI (selected from dropdown)
      kpiUniqueIdentifierValue: "", // Unique column identifier Value for the KPI (text input)
      kpiFormat: "", // Format type (e.g., "Percentage", "Count") (selected from dropdown)
      calculationMethod: "", // How to calculate KPI (e.g., "SUM of values") (selected from dropdown)
      thresholdDerivationType: "", // "Automatic" or "Manual" (selected from dropdown)
      thresholdDerivationMethod: "", // Method for automatic threshold (e.g., "Mean", "Median") (selected from dropdown, shown only if automatic)
      alertThreshold: "", // Alert value (if manual threshold type is selected) (text input, shown only if manual)
      thresholdLookbackValue: "", // Number of days/periods to look back when calculating automatic threshold (text input, shown only if automatic)
      runFrequency: "", // How often to check the KPI (e.g., "Daily", "Weekly") (selected from dropdown)
      receiverAlertEmail: "", // Email distribution list to send alerts to (selected from dropdown)
    },
    mode: "onChange", // Validate as user types (real-time feedback)
  });

  // Extract useful functions and values from the form
  // watch: lets us monitor specific field value changes in real time
  // control: object needed to connect individual form fields using Controller
  // handleSubmit: function that validates the entire form and calls onSubmit if valid
  // reset: function to clear all form fields (used in discard)
  const { watch, control, handleSubmit, reset } = form;

  // Watch the thresholdDerivationType field to show/hide conditional fields
  // When user selects "Automatic" vs "Manual", different fields appear
  // Real-world: Like selecting "Other" in a survey reveals follow-up question
  const thresholdDerivationType = watch("thresholdDerivationType");

  // ──── FORM SUBMISSION HANDLER ──────────────────────────────────────────

  /**
   * onSubmit Handler
   * Called when user clicks "Create Configuration" button
   * Validates all form fields and sends data to the API
   */
  const onSubmit = (data: AddKPIConfigFormData) => {
    // Build the payload object to send to the API
    // This transforms form data into the structure the backend expects
    const payload = {
      brand: data.brand, // Selected brand(e.g., "Brand A")
      kpi: data.kpi, // KPI name user entered(e.g., "Daily Sales Volume")
      source: data.source, // Data source selected(e.g., "Redshift", "BigQuery")
      vendor: data.vendor, // Data vendor/supplier name(e.g., "In-house", "Third-party")
      catalogName: data.catalogName, // Database catalog name( e.g., "dset_dev")
      schemaName: data.schemaName, // Database schema name(e.g., "sales_data")
      datasetName: data.datasetName, // Table/dataset name(e.g., "daily_sales")
      dataDomain: data.dataDomain, // Business domain (e.g., "Sales", "Finance")
      kpiFormat: data.kpiFormat, // Format type (e.g., "Percentage", "Count")
      calculationMethod: data.calculationMethod, // How to calculate KPI (e.g., "SUM of values")
      kpiUniqueIdentifier: data.kpiUniqueIdentifier, // Unique column identifier
      kpiUniqueIdentifierValue: data.kpiUniqueIdentifierValue, // Unique column identifier Value
      alertThreshold: data.alertThreshold, // Alert value (if manual mode)
      thresholdDerivationType: data.thresholdDerivationType, // "Automatic" or "Manual"
      thresholdDerivationMethod: data.thresholdDerivationMethod, // Method if automatic
      thresholdLookbackValue: data.thresholdLookbackValue, // Number of days/periods to look back
      runFrequency: data.runFrequency, // How often to check (Daily/Weekly/etc)
      receiverAlertEmail: data.receiverAlertEmail, // Email list to send alerts to
    };

    // Show loading state to prevent duplicate submissions
    setIsLoading(true);

    // Call the API to create the KPI configuration
    // greatExpectationsService is a service that handles API calls
    greatExpectationsService
      .manageKPIConfiguration(payload)
      .then((response: any) => {
        // If API call succeeds:

        // Track this job run so JobStatusToaster shows progress
        addRunId(response?.run_id);

        // Show success toast message with the run ID
        showToast(
          `KPI configuration request submitted successfully with Run ID: ${response?.run_id}`,
          undefined,
          undefined,
          "top-end",
        );

        // Close the drawer and reset the form
        handleDiscard();
      })
      .catch((error: any) => {
        // If API call fails:

        // Log error for debugging
        console.error("Failed to submit KPI configuration request:", error);

        // Stop showing loading state so user can try again
        setIsLoading(false);
      });
  };

  // ──── CONDITIONAL FIELD VISIBILITY HELPERS ────────────────────────────

  /**
   * Determines if automatic threshold fields should be shown
   * Shows "Derivation Method" and "Lookback Value" when user selects "Automatic"
   * These fields don't make sense for "Manual" threshold type
   */
  const shouldShowThresholdAutomaticFields = (
    thresholdDerivationType: string,
  ) => {
    // Show automatic threshold fields only if user selected "Automatic"
    return thresholdDerivationType === "Automatic";
  };

  /**
   * Determines if manual threshold field should be shown
   * Shows "Alert Threshold" input when user selects "Manual"
   * For manual mode, user manually specifies the threshold value
   */
  const shouldShowAlertThreshold = (thresholdDerivationType: string) => {
    // Show alert threshold input only if user selected "Manual"
    return thresholdDerivationType === "Manual";
  };

  // ──── FORM RESET & CLEANUP ────────────────────────────────────────────

  /**
   * handleDiscard Function
   * Called when user clicks "Discard" button or closes drawer
   * Clears form, stops loading, and closes the drawer
   */
  const handleDiscard = () => {
    reset(); // Clear all form fields (reset to empty)
    setIsLoading(false); // Stop showing loading spinner
    onOpenChange(false); // Close the drawer by notifying parent
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // JSX RENDER (HTML/COMPONENTS)
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    /* FormProvider makes form state available to all nested form components */
    /* Without this, child components wouldn't have access to form methods */
    <FormProvider {...form}>
      {/* Main form element */}
      {/* onSubmit: calls handleSubmit wrapper which validates then calls onSubmit */}
      {/* noValidate: disable HTML5 validation (we use Zod instead) */}
      {/* id="kpi-config-form": referenced by submit button to associate it with this form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate id="kpi-config-form">
        {/* Side panel drawer that slides in from the right */}
        {/* open: controls visibility */}
        {/* onOpenChange: callback when user opens/closes drawer */}
        {/* position="end": slides in from right side */}
        {/* size="medium": medium width (not too narrow, not full screen) */}
        <OverlayDrawer
          open={open} // Controlled by parent component state
          onOpenChange={(_, { open }) => onOpenChange(open)} // Notify parent when drawer is opened/closed
          position="end" // Slide in from the right side of the screen
          size="medium" // Medium width (not too narrow, not full screen)
        >
          {/* Drawer Header - Top section with title and close button */}
          <DrawerHeader>
            <DrawerHeaderTitle
              action={
                // Close button - small X icon in top right
                <Button
                  appearance="subtle" // Low-prominence button style
                  aria-label="Close" // Accessibility label for screen readers
                  icon={<DismissRegular />} // X icon
                  onClick={handleDiscard} // Close drawer and reset form
                />
              }
            >
              Create KPI Configuration
            </DrawerHeaderTitle>
          </DrawerHeader>

          {/* Drawer Body - Main content area with form fields */}
          <DrawerBody>
            <div className="flex flex-col gap-5 py-4">
              {/* INFO BANNER - Helpful guidance for the user */}
              {/* Light blue background to distinguish it from main form */}
              <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  {/* Info icon on the left */}
                  <InfoRegular />
                  <div className="flex flex-col">
                    {/* Banner title */}
                    <Text size={200} weight="semibold">
                      KPI Configuration Tips
                    </Text>
                    {/* Banner description text */}
                    <Text size={100} className="text-neutral-foreground-2">
                      Please ensure that the dataset details (including Catalog
                      Name, Schema Name, and Dataset Name) provided below are
                      relevant to KPI data for accurate configuration.
                    </Text>
                  </div>
                </div>
              </div>

              {/* KPI PARAMETERS SECTION */}
              {/* Container for basic KPI information */}
              <div className="flex flex-col gap-4">
                {/* Section heading */}
                <Text weight="semibold" size={400}>
                  KPI Parameters
                </Text>

                {/* Grid layout: 2 columns, auto-wrapping */}
                {/* Each form field takes one cell */}
                <div className="grid grid-cols-2 gap-4">
                  {/* BRAND FIELD */}
                  {/* FormCombobox allows selecting from predefined list OR typing custom value */}
                  <FormCombobox
                    name="brand" // Form field name (matches form state)
                    label="Brand Name" // Label shown above the field
                    placeholder="Select a brand name" // Placeholder text when no selection is made
                    options={filtersData?.BRANDS ?? []} // Fallback to empty array if no data
                  />
                  {/* KPI NAME FIELD */}
                  {/* Controller connects this field to form state */}
                  {/* render function creates the UI for this field */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="kpi" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="KPI Name" // Label shown above the input
                        validationMessage={form.formState.errors.kpi?.message} // Show error if any
                        validationState={
                          form.formState.errors.kpi ? "error" : "none"
                        } // Red border if error
                        required
                      >
                        <Input {...field} placeholder="Enter a KPI name" />
                      </Field>
                    )}
                  />
                  {/* DATA SOURCE FIELD */}
                  <FormCombobox
                    name="source" // Form field name (matches form state)
                    label="Data Source" // Label shown above the field
                    placeholder="Select a data source" // Placeholder text when no selection is made
                    options={filtersData?.DATA_SOURCES ?? []}
                  />
                  {/* DATA VENDOR FIELD */}
                  {/* Which company/vendor provides this data */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="vendor" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Data Vendor" // Label shown above the input
                        validationMessage={
                          form.formState.errors.vendor?.message // Show error message if validation fails
                        }
                        validationState={
                          form.formState.errors.vendor ? "error" : "none" // Red border if there's an error
                        }
                        required // This field is required, user must fill it out before submitting
                      >
                        <Input {...field} placeholder="Enter a data vendor" />
                      </Field>
                    )}
                  />
                  {/* CATALOG NAME FIELD */}
                  {/* Database catalog (like a folder that contains schemas) */}
                  <FormCombobox
                    name="catalogName" // Form field name (matches form state)
                    label="Catalog Name" // Label shown above the field
                    placeholder="Select a catalog name" // Placeholder text when no selection is made
                    options={filtersData?.CATALOG_NAMES ?? []} // Dropdown options for catalog names from filtersData, fallback to empty array if not available
                  />
                  {/* SCHEMA NAME FIELD */}
                  {/* Database schema (like a subfolder containing tables) */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="schemaName" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Schema Name" // Label shown above the input
                        validationMessage={
                          form.formState.errors.schemaName?.message // Show error message if validation fails
                        }
                        validationState={
                          form.formState.errors.schemaName ? "error" : "none" // Red border if there's an error
                        }
                        required // This field is required, user must fill it out before submitting
                      >
                        <Input {...field} placeholder="Enter a schema name" />
                      </Field>
                    )}
                  />
                  {/* DATASET NAME FIELD */}
                  {/* The actual table name containing the KPI data */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="datasetName" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Dataset Name" // Label shown above the input
                        validationMessage={
                          form.formState.errors.datasetName?.message // Show error message if validation fails
                        }
                        validationState={
                          form.formState.errors.datasetName ? "error" : "none" // Red border if there's an error
                        }
                        required // This field is required, user must fill it out before submitting
                      >
                        <Input {...field} placeholder="Enter a dataset name" />
                      </Field>
                    )}
                  />
                  {/* DATA DOMAIN FIELD */}
                  {/* Business domain (e.g., "Sales", "Finance", "Operations") */}
                  <FormCombobox
                    name="dataDomain" // Form field name (matches form state)
                    label="Data Domain" // Label shown above the field
                    placeholder="Select a Data Domain" // Placeholder text when no selection is made
                    options={dataDomains ?? []} // Dropdown options with predefined domain options, fallback to empty array if not available
                  />
                  {/* // KPI UNIQUE IDENTIFIER FIELD // Column name that uniquely
                  identifies each KPI record */}
                  <FormCombobox
                    name="kpiUniqueIdentifier" // Form field name (matches form state)
                    label="KPI Unique Identifier" // Label shown above the field
                    placeholder="Select a KPI unique identifier" // Placeholder text when no selection is made
                    options={filtersData?.KPI_UNIQUE_IDENTIFIERS ?? []} // Dropdown options for unique identifiers from filtersData, fallback to empty array if not available
                  />
                  {/* // KPI UNIQUE IDENTIFIER VALUE FIELD // Column name value that uniquely
                  identifies each KPI record */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="kpiUniqueIdentifierValue" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label={{
                          // Setting children to a render function allows you to replace the entire slot.
                          // The first param is the component for the slot (Label), which we're ignoring to use InfoLabel instead.
                          // The second param are the props for the slot, which need to be passed to the InfoLabel.
                          children: (_: unknown, slotProps: LabelProps) => (
                            <InfoLabel {...slotProps} info="Enter one or more KPI unique identifier values, separated by semi-colons(;) (e.g., AUSTEDO;AJOVY;UZEDY)">
                              KPI Unique Identifier Value(s)
                              {/* Label shown above the input */}
                            </InfoLabel>
                          ),
                        }}
                        validationMessage={
                          form.formState.errors.kpiUniqueIdentifierValue?.message // Show error message if validation fails
                        }
                        validationState={
                          // If there's an error with kpiUniqueIdentifierValue, show red border and error message
                          form.formState.errors.kpiUniqueIdentifierValue
                            ? "error"
                            : "none"
                        }
                        required // This field is required, user must fill it out before submitting
                      >
                        <Input
                          {...field} // Connect input to form state
                          placeholder="Enter values, separated by semi-colons (e.g., AJOVY;UZEDY)" // Placeholder text to guide user on what to enter (e.g., "AUSTEDO XR HD")
                        />
                      </Field>
                    )}
                  />
                  {/* // KPI FORMAT FIELD // Format type (e.g., "Percentage",  "Count", "Decimal") */}
                  <FormCombobox
                    name="kpiFormat" // Form field name (matches form state)
                    label="KPI Format" // Label shown above the field
                    placeholder="Select a KPI format" // Placeholder text when no selection is made
                    options={filtersData?.KPI_FORMATS ?? []} // Dropdown options for KPI formats from filtersData, fallback to empty array if not available
                  />
                  {/* // CALCULATION METHOD FIELD // How the KPI should be */}
                  {/* calculated (e.g., "SUM of daily values", "Average of orders") */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="calculationMethod" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Calculation Method" // Label shown above the input
                        validationMessage={
                          form.formState.errors.calculationMethod?.message // Show error message if validation fails
                        }
                        validationState={
                          // If there's an error with calculationMethod, show red border and error message
                          form.formState.errors.calculationMethod
                            ? "error"
                            : "none"
                        }
                        required // This field is required, user must fill it out before submitting
                      >
                        <Input
                          {...field} // Connect input to form state
                          placeholder="Describe how KPIs are calculated" // Placeholder text to guide user on what to enter (e.g., "SUM of daily values")
                        />
                      </Field>
                    )}
                  />
                  {/* // THRESHOLD DERIVATION TYPE FIELD // "Automatic" = system */}
                  {/* calculates threshold, "Manual" = user specifies threshold */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="thresholdDerivationType" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Threshold Derivation Type" // Label shown above the dropdown
                        validationMessage={
                          form.formState.errors.thresholdDerivationType?.message // Show error message if validation fails
                        }
                        validationState={
                          // If there's an error with thresholdDerivationType, show red border and error message
                          form.formState.errors.thresholdDerivationType
                            ? "error"
                            : "none"
                        }
                        required // This field is required, user must select either "Automatic" or "Manual"
                      >
                        <Dropdown
                          {...field} // Connect dropdown to form state
                          onOptionSelect={
                            (_, option) => field.onChange(option.optionValue) // Update form state when user selects an option
                          }
                          value={field.value} // Set current value of dropdown from form state
                          placeholder="Select a derivation type" // Placeholder text when no selection is made
                        >
                          {thresholdDerivationTypes.map((item) => (
                            // Each option corresponds to a threshold derivation type (e.g., "Automatic", "Manual")
                            <Option key={item} value={item}>
                              {item}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    )}
                  />
                  {/* // THRESHOLD DERIVATION METHOD FIELD (shown only if */}
                  {/* "Automatic" selected) // How to automatically calculate the */}
                  {/* threshold (e.g., "95th percentile", "Standard deviation") */}
                  {shouldShowThresholdAutomaticFields(
                    thresholdDerivationType,
                  ) && (
                    <Controller
                      control={control} // Form control object from useForm
                      name="thresholdDerivationMethod" // Form field name (matches form state)
                      render={({ field }) => (
                        <Field
                          label="Threshold Derivation Method" // Label shown above the dropdown
                          validationMessage={
                            form.formState.errors.thresholdDerivationMethod
                              ?.message // Show error message if validation fails
                          }
                          validationState={
                            // If there's an error with thresholdDerivationMethod, show red border and error message
                            form.formState.errors.thresholdDerivationMethod
                              ? "error"
                              : "none"
                          }
                          required // This field is required if thresholdDerivationType is "Automatic", user must select a method for automatic threshold calculation
                        >
                          <Dropdown
                            {...field} // Connect dropdown to form state
                            onOptionSelect={
                              (_, option) => field.onChange(option.optionValue) // Update form state when user selects an option
                            }
                            value={field.value} // Set current value of dropdown from form state
                            placeholder="Select a derivation method" // Placeholder text when no selection is made
                          >
                            {thresholdDerivationMethods.map((item) => (
                              // Each option corresponds to a method for automatically deriving the threshold (e.g., "95th percentile", "Standard deviation")
                              <Option key={item} value={item}>
                                {item}
                              </Option>
                            ))}
                          </Dropdown>
                        </Field>
                      )}
                    />
                  )}
                  {/* // THRESHOLD LOOKBACK VALUE FIELD (shown only if "Automatic" */}
                  {/* selected) // Number of days/periods to use when calculating */}
                  {/* automatic threshold // Example: "90 days" to look at last 90 */}
                  {/* days of data */}
                  {shouldShowThresholdAutomaticFields(
                    thresholdDerivationType,
                  ) && (
                    <Controller
                      control={control} // Form control object from useForm
                      name="thresholdLookbackValue" // Form field name (matches form state)
                      render={({ field }) => (
                        <Field
                          label="Threshold Lookback Value" // Label shown above the input
                          validationMessage={
                            form.formState.errors.thresholdLookbackValue
                              ?.message // Show error message if validation fails
                          }
                          validationState={
                            // If there's an error with thresholdLookbackValue, show red border and error message
                            form.formState.errors.thresholdLookbackValue
                              ? "error"
                              : "none"
                          }
                          required // This field is required if thresholdDerivationType is "Automatic", user must specify how far back to look when calculating the threshold
                        >
                          <Input
                            {...field} // Connect input to form state
                            placeholder="Enter a lookback value" // Placeholder text to guide user on what to enter (e.g., "90 days")
                          />
                        </Field>
                      )}
                    />
                  )}
                  {/* // ALERT THRESHOLD FIELD (shown only if "Manual" selected) // */}
                  {/* The specific threshold value user specifies manually // */}
                  {/* Example: "100000" for sales threshold */}
                  {shouldShowAlertThreshold(thresholdDerivationType) && (
                    <Controller
                      control={control} // Form control object from useForm
                      name="alertThreshold" // Form field name (matches form state)
                      render={({ field }) => (
                        <Field
                          label="Alert Threshold" // Label shown above the input
                          validationMessage={
                            form.formState.errors.alertThreshold?.message // Show error message if validation fails
                          }
                          validationState={
                            // If there's an error with alertThreshold, show red border and error message
                            form.formState.errors.alertThreshold
                              ? "error"
                              : "none"
                          }
                          required // This field is required if thresholdDerivationType is "Manual", user must specify the alert threshold value
                        >
                          <Input
                            {...field} // Connect input to form state
                            placeholder="Enter a alert threshold" // Placeholder text to guide user on what to enter (e.g., "100000")
                          />
                        </Field>
                      )}
                    />
                  )}
                </div>

                {/* ALERT & EXECUTION SETTINGS SECTION */}
                {/* Settings for when and how to run quality checks and who gets notified */}
                <Text weight="semibold" size={400}>
                  Alert & Execution Settings
                </Text>

                {/* Grid layout: 2 columns for alert and execution fields */}
                <div className="grid grid-cols-2 gap-4">
                  {/* RECEIVER ALERT EMAIL FIELD */}
                  {/* Email distribution list that receives alerts when KPI threshold is breached */}
                  {/* Example: alerts sent to "sales-team@company.com" when sales KPI drops below threshold */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="receiverAlertEmail" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Receiver Alert Email" // Label shown above the dropdown
                        validationMessage={
                          form.formState.errors.receiverAlertEmail?.message // Show error message if validation fails
                        }
                        validationState={
                          // If there's an error with receiverAlertEmail, show red border and error message
                          form.formState.errors.receiverAlertEmail
                            ? "error"
                            : "none"
                        }
                        required // This field is required, user must select an email distribution list to receive alerts
                      >
                        {/* Dropdown shows available distribution lists loaded from useGetKPIConfiguredAlerts hook */}
                        {/* Each option is a distribution list like "sales-alerts" or "operations-team" */}
                        <Dropdown
                          {...field} // Connect dropdown to form state
                          onOptionSelect={
                            (_, option) => field.onChange(option.optionValue) // Update form state when user selects an option
                          } // Update form when selection changes
                          value={field.value} // Set current value of dropdown from form state
                          placeholder="Select a receiver alert email" // Placeholder text when no selection is made
                        >
                          {/* Map each alert's distribution list as a selectable option */}
                          {(alerts || [])?.map((item) => (
                            // Each option corresponds to an email distribution list that can receive alerts (e.g., "
                            <Option
                              key={item.RECEIVER_ALERT_ID} // Unique key for React list rendering, using alert ID
                              value={item.DISTRIBUTION_LIST} // The value that gets stored in form state when this option is selected
                            >
                              {item.DISTRIBUTION_LIST}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    )}
                  />

                  {/* RUN FREQUENCY FIELD */}
                  {/* How often KPI quality checks should run (e.g., "Daily", "Weekly", "Monthly") */}
                  {/* Example: Run daily at 6 AM to check if sales KPI meets target */}
                  <Controller
                    control={control} // Form control object from useForm
                    name="runFrequency" // Form field name (matches form state)
                    render={({ field }) => (
                      <Field
                        label="Run Frequency" // Label shown above the dropdown
                        validationMessage={
                          form.formState.errors.runFrequency?.message
                          // Show error message if validation fails
                        }
                        validationState={
                          form.formState.errors.runFrequency ? "error" : "none"
                          // If there's an error with runFrequency, show red border and error message
                        }
                        required // This field is required, user must select how often the KPI checks should run
                      >
                        {/* Dropdown with predefined run frequency options */}
                        {/* Options typically include: Daily, Weekly, Bi-weekly, Monthly */}
                        <Dropdown
                          {...field} // Connect dropdown to form state
                          onOptionSelect={
                            (_, option) => field.onChange(option.optionValue)
                            // Update form state when user selects an option, this will set the run frequency for the KPI checks (e.g., "Daily")
                          } // Update form state
                          value={field.value} // Set current value of dropdown from form state
                          placeholder="Select a run frequency" // Placeholder text when no selection is made
                        >
                          {/* Map each frequency option to a dropdown Option */}
                          {runFrequencies.map((frequency) => (
                            // Each option corresponds to a frequency at which the KPI checks should run (e.g., "Daily", "Weekly", "Monthly")
                            <Option key={frequency} value={frequency}>
                              {frequency}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    )}
                  />
                </div>
              </div>
            </div>
          </DrawerBody>

          {/* FOOTER SECTION WITH ACTION BUTTONS */}
          {/* Contains buttons to save or discard the KPI configuration */}
          <DrawerFooter>
            {/* Flex container: align buttons to right, add gap between them */}
            <div className="flex justify-end gap-4">
              {/* DISCARD BUTTON */}
              {/* Secondary appearance (less prominent) - discards form without saving */}
              {/* Calls handleDiscard to reset form state and close drawer */}
              <Button
                appearance="secondary" // Less prominent button style for discard action
                onClick={handleDiscard} // Handler clears form and closes drawer
              >
                Discard
              </Button>

              {/* CREATE CONFIGURATION BUTTON */}
              {/* Primary appearance (prominent) - submits the form to create new KPI config */}
              {/* Shows spinning loader icon while API call is in progress */}
              {/* Disabled when isLoading is true to prevent duplicate submissions */}
              {/* form="kpi-config-form" connects button to the form above (native HTML attribute) */}
              <Button
                appearance="primary"
                type="submit" // Submits the form automatically
                form="kpi-config-form" // References form by its id attribute
                icon={isLoading ? <Spinner size="tiny" /> : <AddRegular />} // Show spinner during loading, plus icon otherwise
                disabled={isLoading} // Prevent clicking while API call is in progress
              >
                Create Configuration
              </Button>
            </div>
          </DrawerFooter>
        </OverlayDrawer>
        {/* End of overlay drawer that slides in from the right side */}
      </form>
      {/* End of form with id="kpi-config-form" that collects all KPI configuration data */}
      {/* End of FormProvider context - wraps entire form to make form state available to all Controller fields */}
    </FormProvider>
  );
};
