/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 January 2026

  Purpose of the script:
    This script defines the Register Dataset Dialog of the Rules Management page of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides a Dialog Box for registering new dataset for data integrity rule configuration.
    - Uses react form in the UI, store input fields and transforms it into required structure 
    - Sends the data to databricks for dataset registration using backend service.
*/

// ---------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
// Importing the Button component to create clickable buttons for actions like submit and cancel
import {
  Button,        // Triggers user actions such as submit, cancel, or confirm
  Dialog,        // Controls modal dialog behavior and open/close state
  DialogSurface, // Defines the visible container and layout of the dialog
  DialogTitle,   // Displays the dialog heading or title
  DialogBody,    // Wraps the main content area of the dialog
  DialogContent, // Holds form elements or descriptive content inside the dialog
  DialogActions, // Groups action buttons at the bottom of the dialog
  Field,         // Provides labels, validation, and accessibility for form inputs
  Input,         // Accepts user text input
  Dropdown,      // Allows selection of a value from a list
  Option,        // Represents an individual selectable item in a Dropdown
  Caption1,      // Displays small helper or secondary text
  Text,          // Renders styled text with consistent typography
  Spinner,       // Creates Spinner loader for the submit button
} from "@fluentui/react-components"; // Fluent UI components and styling utilities

/*  
  @/lib/services/greatExpectationsService
    - What it is: A service module for interacting with the backend APIs related to rule management.
    - Why used: Provides methods for creating and updating rules for datasets.
*/
// Importing the service that handles API calls to the backend for dataset registration
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
// Importing FC (Functional Component) type for TypeScript type checking of React components
// Importing useState hook to manage component state like loading status
import { FC, useState } from "react";

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for copy buttons and status indicators.
*/
// Importing icons to display visual elements in the UI
import {
  TableAddRegular, // Add a new table or table-related item
  Info16Regular,   // Small informational icon (16px)
} from "@fluentui/react-icons";

/*  
  react-hook-form
    - What it is: A library for managing form state and validation in React.
    - Why used: Helps manage form inputs and validation in dataset registration.
*/
// Importing useForm to manage the entire form state, validation, and submission
// Importing Controller to wrap controlled components like Dropdown
import { useForm, Controller } from "react-hook-form";

/*  
  @hookform/resolvers/zod
    - What it is: A resolver library for integrating Zod validation with React Hook Form.
    - Why used: Provides schema-based validation for the dataset registration form.
*/
// Importing zodResolver to connect Zod validation schema with React Hook Form
import { zodResolver } from "@hookform/resolvers/zod";

/*  
  @/constants/schema
    - What it is: A module containing schemas for data validation using Zod.
    - Why used: Provides validation schema for dataset registration form data.
*/
// Importing the TypeScript type definition for the form data structure
// Importing the Zod schema that defines validation rules for the registration form
import { RegisterDatasetFormData, registerDatasetSchema } from "@/constants/schema";

/*  
  @/hooks/useToast
    - What it is: A custom hook to manage toast notifications.
    - Why used: Used for displaying success, error, or informational toast messages.
*/
// Importing the custom hook to display toast notifications to users
import { useGlobalToast } from "@/hooks/useToast";

/*  
  @/hooks/useQualityDashboard
    - What it is: A custom hook that fetches business unit names for display.
    - Why used: Used to populate the business unit dropdown in dataset registration.
*/
// Importing the custom hook that fetches the list of business units from the API
import { useGetBusinessUnitNames } from "@/hooks/useQualityDashboard";

/**
 * @/components/ui/JobStatusToaster
 *  - What it is: A custom component which shows the status of the notebook job run.
 *  - Why used: Provide live status of the notebook job run which adds/updates rules.
 */
// Importing the function to add a run ID to track the job status
import { addRunId } from "@/components/ui/JobStatusToaster";

/*
  @/types/rule
    - What it is: // TypeScript type defined for rule management.
    - Why used:  Used for the expected structure of data returned by the API.
*/
// Importing the TypeScript type that defines the structure of a dataset registration object
import { RegisterDataset } from "@/types/rule";


// Defining the possible dataset types for this view
// - The dataset types are used to filter or customize views based on dataset category
// Creating an array of dataset types that users can select from the dropdown
// Example: When user selects "TABLE", fields for catalog and schema will be shown
const datasetTypes = ["TABLE", "VIEW", "FILE"] as const;
// The `as const` ensures that the values are treated as literal types ("TABLE", "VIEW", "FILE") instead of generic strings


/**
 * Determines whether to display the catalog and schema fields based on the selected dataset type.
 * - For "FILE" dataset type, these fields are not required.
 * - For other dataset types (e.g., "TABLE" and "VIEW"), the fields should be displayed.
 * 
 * @param datasetType The type of the dataset (either "FILE", "TABLE", or "VIEW")
 * @returns A boolean indicating whether to show catalog and schema fields
 */
// This function decides if catalog and schema fields should be visible in the form
// Example: If datasetType = "FILE", it returns false (hide fields)
// Example: If datasetType = "TABLE", it returns true (show fields)
const showCatalogAndSchemaField = (datasetType: string) => {
  if (datasetType === "FILE") return false; // Do not show for "FILE" dataset type
  // If the dataset type is "FILE", return false because files don't need catalog/schema information
  return true; // Show for "TABLE" and "VIEW" dataset types
  // For "TABLE" and "VIEW" types, return true to show the catalog and schema input fields
}

/**
 * Get the appropriate label for the dataset field based on the selected dataset type.
 * - For "TABLE", the field label will be "Table Name"
 * - For "VIEW", the field label will be "View Name"
 * - For "FILE", the field label will be "File Path"
 * 
 * @param datasetType The type of the dataset (either "FILE", "TABLE", or "VIEW")
 * @returns The label for the dataset field (e.g., "Table Name", "View Name", or "File Path")
 */
// This function determines what label to display for the dataset name field based on the selected type
// Example: If datasetType = "TABLE", it returns "Table Name"
// Example: If datasetType = "FILE", it returns "File Path"
const getDatasetFieldLabel = (datasetType: string) => {
  return datasetType === "FILE"
    // Check if the dataset type is "FILE"
    ? "File Path" // Label for "FILE" dataset type
    // If it's a file, return "File Path" as the label
    : datasetType === "VIEW"
      // Otherwise, check if the dataset type is "VIEW"
      ? "View Name" // Label for "VIEW" dataset type
      // If it's a view, return "View Name" as the label
      : "Table Name"; // Label for "TABLE" dataset type
      // If it's neither FILE nor VIEW, it must be TABLE, so return "Table Name"
}

/**
 * Interface defining the props for the RegisterDatasetDialog component.
 * These props control the dialog's behavior and provide necessary data for dataset registration.
 */
// Defining the TypeScript interface that specifies what props this component expects
interface RegisterDatasetDialogProps {
  open: boolean;
  // A boolean prop that controls whether the dialog is visible (true) or hidden (false)
  setIsRegisterOpen: (open: boolean) => void; // Callback to open/close drawer
  // A function prop that allows the parent component to control the dialog's open/close state
}

// Defining the main functional component for the Register Dataset Dialog
// FC<RegisterDatasetDialogProps> means this is a Functional Component that accepts RegisterDatasetDialogProps as props
export const RegisterDatasetDialog: FC<RegisterDatasetDialogProps> = ({
  open,
  // Destructuring the 'open' prop which controls dialog visibility
  setIsRegisterOpen
  // Destructuring the 'setIsRegisterOpen' function to update dialog state
}) => {

  /**
   * Initialize React Hook Form with Zod resolver for schema-based validation.
   * - `useForm` hook is used to manage form state and validation logic.
   * - Zod resolver is applied for schema-based validation using `registerDatasetSchema`.
   */
  // Setting up the form management system with validation rules
  const {
    register, // Register form input fields for tracking values and validation
    // 'register' function connects input fields to the form state
    // Example: {...register("catalogName")} tracks the catalog name input
    handleSubmit, // Handle form submission and trigger validation
    // 'handleSubmit' wraps the submit function to validate form before calling it
    formState: { errors }, // Manage form state: errors and submission state
    // 'errors' object contains all validation errors for each field
    // Example: errors.businessUnit?.message contains the error message for business unit field
    reset, // Reset form values to their default state
    // 'reset' function clears all form fields back to default values
    control, // Control object for managing complex input components
    // 'control' is needed for Controller component to manage Dropdown fields
    watch // Watch specific form field values in real-time
    // 'watch' function allows monitoring specific field values as they change
    // Example: watch("datasetType") returns the current value of datasetType field
  } = useForm<RegisterDatasetFormData>({
    // Initializing useForm hook with RegisterDatasetFormData type for TypeScript
    resolver: zodResolver(registerDatasetSchema), // Integrates Zod validation schema
    // Connecting the Zod validation schema to validate form inputs
    defaultValues: {
      // Setting initial values for all form fields when the component loads
      businessUnit: "", // Default value for the business unit input
      // Business unit starts as empty string, user must select one
      datasetType: "", // Default value for the dataset type (TABLE, VIEW, FILE)
      // Dataset type starts as empty string, user must select one
      catalogName: "", // Default value for the catalog name input
      // Catalog name starts as empty string
      schemaName: "", // Default value for the schema name input
      // Schema name starts as empty string
      datasetName: "", // Default value for the dataset name input
      // Dataset name starts as empty string
    },
    mode: "onBlur", // Validation triggers when the input field loses focus (onBlur)
    // Validation only runs when user clicks outside a field, not on every keystroke
  });

  // Fetching business unit names from an API using a custom hook
  // - `businessUnitNames`: Array containing the names of all business units
  const { businessUnitNames } = useGetBusinessUnitNames(); // Hook to fetch business unit names from an API
  // This hook makes an API call and returns an array of business units to populate the dropdown
  // Example: businessUnitNames might be [{L1_BUSINESS_UNIT: "Sales"}, {L1_BUSINESS_UNIT: "Marketing"}]

  // Hook to show toast notifications
  // - `showToast`: Function to trigger toast notifications for success, error, or info messages
  const { showToast } = useGlobalToast();
  // This hook provides a function to display popup notifications to the user
  // Example: showToast("Success!", ...) displays a success message

  /**
   * `isLoading` indicates the current state of the API call for registering the dataset.
   * When `isLoading` is `true`, it means the API request is in progress, and the application is waiting for a response.
   * When `isLoading` is `false`, the API call has either completed or not yet started.
   * 
   * This state is commonly used to control UI elements such as loading spinners, 
   * disable buttons to prevent multiple submissions, or show a loading message.
   */
  const [isLoading, setIsLoading] = useState(false);
  // Creating a state variable to track if the form submission API call is in progress
  // Initially set to false because no API call is happening when component first loads
  // When true, the submit button shows a spinner and is disabled

  /**
* `datasetType` holds the value of the selected dataset type from the form.
* - It is watched using `watch()` to get the current value of the dataset type field.
*/
  const datasetType = watch("datasetType");
  // Watching the datasetType field to get its current value in real-time
  // This allows the form to show/hide fields based on the selected dataset type
  // Example: When user selects "FILE", catalog and schema fields will be hidden

  /**
   * Handles validated form submission and triggers dataset registration.
   * - This function is invoked when the form is submitted successfully with valid data.
   * - It constructs the dataset object from the form data and calls the `registerDataQualityDataset` method from the `greatExpectationsService`.
   * - After the submission, it shows a success toast message, resets the form, and closes the registration modal.
   *
   * @param data The form data containing dataset registration details (business unit, dataset type, catalog, schema, and dataset name)
   */
  // Defining the async function that runs when user clicks "Register Dataset" button
  const handleRegisterSubmit = async (
    data: RegisterDatasetFormData // Form data of type `RegisterDatasetFormData`
    // The 'data' parameter contains all validated form field values
    // Example: data = {businessUnit: "Sales", datasetType: "TABLE", catalogName: "main", ...}
  ) => {
    // Create a dataset object using the data submitted from the form
    // Building the dataset object in the format expected by the backend API
    const dataset: RegisterDataset = {
      businessUnit: data.businessUnit, // Business unit from the form input
      // Extracting the business unit value from the validated form data
      datasetType: data.datasetType,   // Dataset type from the form input (e.g., "TABLE", "VIEW", "FILE")
      // Extracting the dataset type value (TABLE, VIEW, or FILE)
      catalogName: data.catalogName,   // Catalog name from the form input
      // Extracting the catalog name (only filled if dataset type is TABLE or VIEW)
      schemaName: data.schemaName,     // Schema name from the form input
      // Extracting the schema name (only filled if dataset type is TABLE or VIEW)
      datasetName: data.datasetName,   // Dataset name from the form input
      // Extracting the dataset name (could be table name, view name, or file path)
    }

    // Set `isLoading` to `true` to indicate that the API request is in progress.
    // This typically triggers UI elements such as loading spinners or disables 
    // buttons to prevent multiple submissions while the API call is being made.
    setIsLoading(true);
    // Setting loading state to true to show spinner and disable the submit button
    // This prevents users from clicking submit multiple times

    // Call the `registerDataQualityDataset` method from the `greatExpectationsService` to register the dataset
    // Making an API call to the backend service to register the new dataset
    greatExpectationsService.registerDataQualityDataset(dataset)
      .then((response) => {
        // This code runs if the API call succeeds
        addRunId(response?.run_id);
        // Adding the run ID to the job status tracker so user can monitor the registration progress
        // The run_id is used to track the background job that processes the dataset registration
        // On successful registration, log the response and show a success toast notification
        showToast(`Dataset registration request submitted successfully with Run ID: ${response?.run_id}`, undefined, undefined, "top-end"); // Show a success message to the user
        // Displaying a success notification with the run ID so user knows the request was submitted
        // The toast appears in the top-end corner of the screen
        handleCancel(); // resets the form fields and closes the registration modal without submitting any data
        // Calling handleCancel to close the dialog, reset the form, and reset loading state
      })
      .catch((error) => {
        // This code runs if the API call fails
        // If the registration fails, log the error and show a failure toast notification
        console.error("Failed to register dataset:", error); // Log the error (for debugging)
        // Logging the error to the browser console for developers to debug
        // Set `isLoading` to `false` to indicate that the API request is done.
        setIsLoading(false);
        // Resetting loading state to false so the submit button is enabled again
        // This allows user to try submitting again after fixing any issues
      });
  };

  /**
   * Handles the cancellation of the dataset registration process.
   * - This function is invoked when the user cancels the registration form.
   * - It resets the form fields and closes the registration modal without submitting any data.
   * - it resets the API calling state to initial values
   */
  // Defining the function that runs when user clicks the "Cancel" button
  const handleCancel = () => {
    reset(); // Reset the form fields to their initial values
    // Clearing all form fields back to empty strings (default values)
    setIsRegisterOpen(false); // Close the registration form modal
    // Calling the parent component's function to hide the dialog
    setIsLoading(false) // Reset the API calling state to initial values
    // Setting loading state back to false in case it was true during submission
  }

  return (
    <>
      {/* Form to register a new dataset */}
      {/* Creating the HTML form element that wraps all input fields */}
      <form onSubmit={handleSubmit(handleRegisterSubmit)} noValidate id="dataset-register-form">
        {/* onSubmit: When form is submitted, handleSubmit validates and calls handleRegisterSubmit */}
        {/* noValidate: Disables browser's default HTML5 validation, using React Hook Form validation instead */}
        {/* id: Unique identifier for the form, used to link the submit button to this form */}
        
        {/* Dialog for registering a new dataset */}
        {/* Creating the modal dialog component that overlays the main screen */}
        <Dialog
          open={open} // Dialog visibility state
          // Controlling whether the dialog is visible based on the 'open' prop
          onOpenChange={(_, data) => {
            // This function runs whenever the dialog's open state changes (user closes it)
            setIsRegisterOpen(data.open); // Set dialog open/close state
            // Updating the parent component's state with the new open/close value
            if (!data.open) reset(); // Reset form when closing dialog
            // If dialog is being closed (data.open is false), clear all form fields
          }}
        >
          <DialogSurface aria-describedby="register-dataset-description">
            {/* DialogSurface creates the visible white box/container for the dialog */}
            {/* aria-describedby links this surface to the description for accessibility/screen readers */}
            <DialogBody>
              {/* DialogBody wraps all the content inside the dialog */}
              {/* Dialog title */}
              {/* Displaying the main heading of the dialog */}
              <DialogTitle>Register Enterprise Dataset</DialogTitle>
              {/* DialogTitle shows "Register Enterprise Dataset" as the dialog heading */}
  
              <DialogContent id="register-dataset-description">
                {/* DialogContent holds the main form content and inputs */}
                {/* id links back to aria-describedby for accessibility */}
                {/* Information message about default rule applied */}
                {/* Creating an informational banner to notify users about automatic rule application */}
                <div className="flex justify-between items-center p-2 mt-1 mb-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  {/* This div creates a blue information box with padding, margin, rounded corners, and border */}
                  {/* flex: Makes children align horizontally */}
                  {/* justify-between: Spaces children apart */}
                  {/* items-center: Vertically centers children */}
                  {/* p-2: Adds padding on all sides */}
                  {/* mt-1 mb-4: Adds margin top and bottom */}
                  {/* bg-blue-50/50: Light blue background with 50% opacity */}
                  {/* rounded-lg: Rounds the corners */}
                  {/* border border-blue-100: Adds a blue border */}
                  <div className="flex items-center gap-2">
                    {/* Inner div to arrange the icon and text horizontally with spacing */}
                    {/* flex: Makes children align horizontally */}
                    {/* items-center: Vertically centers the icon with text */}
                    {/* gap-2: Adds space between icon and text */}
                    <Info16Regular /> {/* Information icon */}
                    {/* Displaying a small information icon (16px size) */}
                    <div className="flex flex-col gap-2">
                      {/* Div to stack text elements vertically */}
                      {/* flex flex-col: Arranges children vertically */}
                      {/* gap-2: Adds vertical spacing between text elements */}
                      <Text size={300} weight="bold">
                        {/* Text component with size 300 (medium) and bold font weight */}
                        Automatic Default Rule {/* Title for default rule */}
                        {/* Displaying the heading for the information message */}
                      </Text>
                      <Text size={200} weight="semibold" className="text-neutral-foreground-2">
                        {/* Text component with size 200 (small), semibold weight, and neutral color */}
                        The below rule will be automatically applied to the dataset upon registration. {/* Rule description */}
                        {/* Explaining that a default rule will be applied automatically */}
                      </Text>
                      {/* display default Rule category */}
                      {/* Showing the category of the default rule */}
                      <Caption1 className="text-neutral-foreground-2">
                        {/* Caption1 creates small text with neutral color */}
                        Rule Category: <b>Metadata</b>
                        {/* Displaying "Rule Category: Metadata" with "Metadata" in bold */}
                      </Caption1>
                      {/* display default Rule type  */}
                      {/* Showing the type of the default rule */}
                      <Caption1 className="text-neutral-foreground-2">
                        {/* Caption1 creates small text with neutral color */}
                        Rule Type: <b>Volume</b>
                        {/* Displaying "Rule Type: Volume" with "Volume" in bold */}
                      </Caption1>
                      {/* display default rule name  */}
                      {/* Showing the name of the default rule */}
                      <Caption1 className="text-neutral-foreground-2">
                        {/* Caption1 creates small text with neutral color */}
                        Rule Name: <b>volume_check</b>
                        {/* Displaying "Rule Name: volume_check" with "volume_check" in bold */}
                      </Caption1>
                    </div>
                  </div>
                </div>
  
                <div className="flex flex-col gap-3">
                  {/* Creating a container to stack all form fields vertically with spacing */}
                  {/* flex flex-col: Arranges form fields vertically */}
                  {/* gap-3: Adds vertical spacing between form fields */}
                  {/* L1 Business Unit dropdown */}
                  {/* Creating the business unit selection dropdown */}
                  <Controller
                    // Controller wraps controlled components (like Dropdown) to integrate with React Hook Form
                    name="businessUnit" // Form field name
                    // The name "businessUnit" identifies this field in the form state
                    control={control} // React Hook Form control
                    // Passing the control object from useForm to manage this field
                    render={({ field }) => (
                      // render function receives field object with value, onChange, etc.
                      // This function returns the actual UI component
                      <Field
                        // Field component provides label, validation message, and styling
                        label="L1 Business Unit" // Label for the dropdown
                        // Displaying "L1 Business Unit" as the label above the dropdown
                        validationState={errors.businessUnit ? "error" : "none"} // Validation state (error if invalid)
                        // If there's an error for businessUnit, show error styling, otherwise show normal
                        validationMessage={errors.businessUnit?.message} // Error message for invalid field
                        // Displaying the validation error message if businessUnit is invalid
                        required
                        // Marking this field as required (shows asterisk in label)
                      >
                        <Dropdown
                          // Dropdown component for selecting from a list of options
                          placeholder="Select a business unit." // Placeholder for dropdown
                          // Text shown when no option is selected
                          value={field.value || ""} // Current value of the dropdown
                          // Displaying the currently selected value, or empty string if none selected
                          onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Update form field value on selection
                          // When user selects an option, update the form field with the selected value
                          // field.onChange updates the form state with the new value
                        >
                          {/* Map over businessUnitNames and render options */}
                          {/* Looping through the array of business units to create dropdown options */}
                          {(businessUnitNames || []).map((unit: any, idx: number) => (
                            // Using map to create an Option component for each business unit
                            // || [] ensures we have an empty array if businessUnitNames is null/undefined
                            // unit: the current business unit object in the iteration
                            // idx: the index number of the current item
                            <Option key={idx} value={unit.L1_BUSINESS_UNIT}>
                              {unit.L1_BUSINESS_UNIT}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    )}
                  />
  
                  {/* Dataset Type dropdown */}
                  {/* Creating the dataset type selection dropdown */}
                  <Controller
                    // Controller wraps the Dropdown to integrate with React Hook Form 
                    name="datasetType" // Form field name
                    // The name "datasetType" identifies this field in the form state
                    control={control}
                    // Passing the control object from useForm to manage this field
                    render={({ field }) => (
                      // render function receives field object with value, onChange, etc.
                      <Field
                        // Field component provides label and validation
                        label="Dataset Type" // Label for the dropdown
                        // Displaying "Dataset Type" as the label above the dropdown
                        validationState={errors.datasetType ? "error" : "none"} // Validation state (error if invalid)
                        // If there's an error for datasetType, show error styling
                        validationMessage={errors.datasetType?.message} // Error message for invalid field
                        // Displaying the validation error message if datasetType is invalid
                        required
                        // Marking this field as required
                      >
                        {/* Dropdown component for selecting dataset type */}
                        <Dropdown
                          value={field.value || ""} // Current value of the dropdown
                          // Displaying the currently selected dataset type value
                          placeholder="Select a dataset type." // Placeholder for dropdown
                          // Text shown when no option is selected
                          onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Update form field value on selection
                          // When user selects an option, update the form field with the selected value
                        >
                          {/* Map over datasetTypes and render options */}
                          {/* Looping through the datasetTypes array to create dropdown options */}
                          {datasetTypes.map((type) => (
                            // Creating an Option for each dataset type (TABLE, VIEW, FILE)
                            // key: Using the type itself as unique identifier 
                            // value: The value stored when this option is selected
                            <Option key={type} value={type}>
                              {type}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    )}
                  />
  
                  {/* Conditionally render Catalog and Schema fields based on dataset type */}
                  {/* Only showing additional fields if a dataset type has been selected */}
                  {datasetType && (
                    // If datasetType has a value (not empty), render the following content
                    // Example: If user selected "TABLE", this block will render
                    <>
                      {/* Conditionally render Catalog and Schema fields if applicable 
                        Example:
                            Sample Input: datasetType = "TABLE"
                            Sample Output: true
                      */}
                      {/* Checking if catalog and schema fields should be shown based on dataset type */}
                      {showCatalogAndSchemaField(datasetType) && (
                        // If function returns true (for TABLE or VIEW), render catalog and schema fields
                        // If function returns false (for FILE), skip these fields
                        <>
                          {/* Catalog Name input field */}
                          {/* Creating the input field for catalog name */}
                          <Field
                            // Field component provides label and validation
                            label="Catalog Name" // Label for catalog field
                            // Displaying "Catalog Name" as the label above the input
                            required // Make the input field to be compulsarily filled by the user.
                            // Marking this field as required (shows asterisk in label)
                            validationMessage={errors.catalogName?.message} // Error message for catalog field
                            // Displaying the validation error message if catalogName is invalid
                          >
                            <Input
                              // Input component for text entry
                              placeholder="Enter a catalog name" // Placeholder for input
                              // Text shown in the input field when it's empty
                              {...register("catalogName")} // Register input field with React Hook Form
                              // Connecting this input to React Hook Form with the name "catalogName"
                              // This allows the form to track its value and validate it
                            />
                          </Field>
  
                          {/* Schema Name input field */}
                          {/* Creating the input field for schema name */}
                          <Field
                            //Field component provides label and validation
                            label="Schema Name" // Label for schema field
                            // Displaying "Schema Name" as the label above the input
                            required // Make the input field to be compulsarily filled by the user.
                            // Marking this field as required
                            validationMessage={errors.schemaName?.message} // Error message for schema field
                            // Displaying the validation error message if schemaName is invalid
                          >
                            <Input
                              // Input component for text entry
                              placeholder="Enter a schema name" // Placeholder for input
                              // Text shown in the input field when it's empty
                              {...register("schemaName")} // Register input field with React Hook Form
                              // Connecting this input to React Hook Form with the name "schemaName"
                            />
                          </Field>
                        </>
                      )}
  
                      {/* Dataset Name input field */}
                      {/* Creating the input field for dataset name (shown for all dataset types) */}
                      <Field
                        // Field component provides label and validation
                        label={getDatasetFieldLabel(datasetType)} // Label based on dataset type
                        // Using the helper function to get the appropriate label
                        // Example: If datasetType is "TABLE", label will be "Table Name"
                        // Example: If datasetType is "FILE", label will be "File Path"
                        required
                        // Marking this field as required
                        validationMessage={errors.datasetName?.message} // Error message for dataset name field
                        // Displaying the validation error message if datasetName is invalid
                      >
                        <Input
                          // Input component for text entry 
                          placeholder={`Enter a ${getDatasetFieldLabel(datasetType).toLocaleLowerCase()}`} // Dynamic placeholder based on dataset type
                          // Creating a dynamic placeholder text
                          // Example: If label is "Table Name", placeholder becomes "Enter a table name"
                          // toLocaleLowerCase() converts "Table Name" to "table name" for the placeholder
                          {...register("datasetName")} // Register dataset name input field with React Hook Form
                          // Connecting this input to React Hook Form with the name "datasetName"
                        />
                      </Field>
                    </>
                  )}
                </div>
              </DialogContent>
  
              {/* Dialog actions (buttons) */}
              {/* Creating the footer section with action buttons */}
              <DialogActions>
                {/* DialogActions groups the action buttons at the bottom of the dialog */}
                <div className="flex gap-4 mt-5">
                  {/* Creating a container to arrange buttons horizontally with spacing */}
                  {/* flex: Arranges buttons horizontally */}
                  {/* gap-4: Adds spacing between buttons */}
                  {/* mt-5: Adds margin on top to separate from form content */}
                  {/* Cancel button to close the dialog */}
                  {/* Creating the cancel button */}
                  <Button appearance="secondary" onClick={handleCancel}>
                    {/* Button with secondary styling (outlined/grey) */}
                    {/* onClick: When clicked, calls handleCancel to close dialog and reset form */}
                    Cancel
                    {/* Button text */}
                  </Button>
  
                  {/* Submit button to register the dataset */}
                  {/* Creating the submit button */}
                  <Button
                    // Primary button for the main action 
                    appearance="primary"
                    // Using primary styling (filled/blue) to indicate main action
                    icon={isLoading ? <Spinner size="tiny" /> : <TableAddRegular />}
                    // If loading, show spinner icon; otherwise show table add icon
                    // This gives visual feedback that submission is in progress
                    type="submit" // Submit form on click
                    // Setting type to "submit" makes this button submit the form when clicked
                    form="dataset-register-form"
                    // Linking this button to the form with id "dataset-register-form"
                    // This allows the button to submit the form even though it's outside the form element
                    disabled={isLoading} // Disable button when form is submitting
                    // When isLoading is true, button becomes disabled to prevent double submission
                    // Button is grayed out and can't be clicked while API call is in progress
                  >
                    Register Dataset
                    {/* Button text */}
                  </Button>
                </div>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </form>
    </>
  )  
}