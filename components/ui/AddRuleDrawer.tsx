/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 January 2026

  Purpose of the script:
    This script defines the AddRuleDrawer component of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides a drawer UI for creating new data quality rules.
    - Manages form state and validation for rule creation.
    - Handles dynamic field rendering based on rule category, type, and name.
    - Submits rule creation requests to the backend API.
    - Provides contextual help and validation feedback to users.
*/

// ---------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks (FC, useEffect, useMemo, useState) for managing component state and lifecycle.
*/
import { FC, useEffect, useMemo, useState } from "react";

/*  
  react-hook-form
    - What it is: A library for managing form state and validation in React.
    - Why used: Helps manage form inputs, validation, and form submission in the rule creation drawer.
*/
import { useForm, Controller } from "react-hook-form";

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides drawer, form fields, dropdowns, inputs, buttons, and other UI components for the rule creation form.
*/
import {
    OverlayDrawer,      // Displays a slide-in drawer overlay for secondary workflows
    DrawerHeader,       // Wraps the top header section of the drawer
    DrawerHeaderTitle,  // Displays the title text in the drawer header
    DrawerBody,         // Contains the main content area of the drawer
    DrawerFooter,       // Holds action buttons or footer content
    Field,              // Provides labels, validation, and accessibility for form controls
    Dropdown,           // Allows selection of a value from a list
    Option,             // Represents an individual selectable item in a Dropdown
    Input,              // Accepts single-line user text input
    Text,               // Renders styled text with consistent typography
    Button,             // Triggers user actions such as submit or cancel
    Spinner,            // Indicates loading or in-progress state
  } from "@fluentui/react-components";
  

/*  
  @fluentui/react-icons
    - What it is: Fluent UI icon library providing SVG icons as React components.
    - Why used: Provides icons for informational messages, dismiss button, and add button.
*/
import {
    InfoRegular,     // Informational message or help indicator
    DismissRegular,  // Close or dismiss action
    AddRegular,      // Add or create new item
} from "@fluentui/react-icons";  

/*  
  @hookform/resolvers/zod
    - What it is: A resolver library for integrating Zod validation with React Hook Form.
    - Why used: Provides schema-based validation for the rule creation form.
*/
import { zodResolver } from "@hookform/resolvers/zod";

/*  
  @/constants/schema
    - What it is: Schema definitions for form validation.
    - Why used: Imports the addRuleSchema for validating rule creation form data and AddRuleFormData type.
*/
import { addRuleSchema, AddRuleFormData } from "@/constants/schema";

/*  
  @/hooks/useToast
    - What it is: A custom hook to manage toast notifications.
    - Why used: Used for displaying success, error, or informational toast messages after rule creation.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*  
  @/hooks/useGreatExpectations
    - What it is: A custom hook that fetches configured alerts for rule management.
    - Why used: Fetches the list of receiver alert emails available for assignment to rules.
*/
import { useGetDataQualityConfiguredAlerts } from "@/hooks/useGreatExpectations";

/*  
  @/types/rule
    - What it is: TypeScript type definitions for rule management.
    - Why used: Imports NewRule type to ensure the payload structure matches API expectations.
*/
import { NewRule } from "@/types/rule";

/*  
  react/jsx-runtime
    - What it is: JSX runtime types from React.
    - Why used: Imports JSX type for type-safe JSX element returns.
*/
import { JSX } from "react/jsx-runtime";

/*  
  @/lib/services/greatExpectationsService
    - What it is: A service module for interacting with the backend APIs related to rule management.
    - Why used: Provides methods for creating rules via the manageDataQualityRule function.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/* 
  @/constants/rule
  - What it is: Constants file containing rule configuration options.
  - Why used: Imports mappings for rule types, names, categories, frequencies, and additional fields
             to populate dropdowns and control conditional field rendering.
*/
import {
    ruleTypeMapping, // Maps high-level rule categories to supported rule types
    metadataRuleNameMapping, // Maps metadata rule types to their corresponding backend rule identifiers
    dataProfilingRuleNameMapping, // Maps data profiling rule types to one or more backend rule names
    dataDriftRuleNameMapping, // Maps data drift rule categories to backend statistical rule identifiers
    dataDriftTargetColumns, // Defines available options for selecting target columns in data drift rule configuration UI
    runFrequencies, // Supported scheduling frequencies for rule execution
    additionalFields, // Defines additional configuration fields required for specific rules
} from "@/constants/rule";

/*
   @/lib/ruleFormHelper
   - What it is: File containing form fields rendering functions. 
   - Why used: It helps in validation and conditional rendering of form fields according to requirement of different rules.
 */
import {
    getColumnsForDataDrift, // sets the select column dropdown value according to selceted data drift rule.
    getAdditionalFieldLabel, // for file type datasets additional input fields are required which are displayed using this function.
    shouldShowDataPattern, // If data pattern input field is required for a rule or not is checked using this function.
    shouldShowRuleValue, // If rule value input field is required for a rule or not is checked using this function.
    multipleColumnsSelected, // If multiple target columns can be selected for a rule or not is checked by this function.
    shouldShowTargetColumn, // If target column input field is required for a rule or not is checked using this function.
    getDataPatternLabel, // Provides label for data pattern input field according to selected rule.
    getTargetColumnLabel, // Provides label for target column input field according to selected rule.
    getRuleValueLabel // Provides label for rule value input field according to selected rule.
} from "@/lib/ruleFormHelper"

/*  
  @/components/ui/JobStatusToaster
    - What it is: A custom component which shows the status of the job.
    - Why used: Provides the addRunId function to track the status of rule creation jobs.
*/
import { addRunId } from "./JobStatusToaster";


// ---------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------

/**
 * Type alias for rule ruleCategory keys.
 * Ensures that only valid keys from ruleTypeMapping are used as categories.
 */
type Category = keyof typeof ruleTypeMapping;

// Component Props Interface

/**
 * Interface defining the props for the AddRuleDrawer component.
 * These props control the drawer's behavior and provide necessary data for rule creation.
 */
interface AddRuleDrawerProps {
    open: boolean; // Controls whether the drawer is visible
    businessUnit: string; // The business unit context for the rule
    catalogName: string; // The catalog name (for database datasets)
    schemaName: string; // The schema name (for database datasets)
    datasetName: string; // The name of the dataset for which the rule is being created
    datasetType: string; // The type of dataset ("FILE" or database type)
    columns: any[]; // Array of available columns in the dataset with their metadata
    onOpenChange: (open: boolean) => void; // Callback to open/close drawer
}

// ---------------------------------------------------------------------
// Component: AddRuleDrawer
// ---------------------------------------------------------------------

/**
 * `AddRuleDrawer` Component
 * 
 * This component renders a side drawer that allows users to create new data quality rules.
 * It provides a dynamic form that adapts based on the selected rule ruleCategory, type, and name,
 * showing only relevant fields for each rule configuration.
 * 
 * Key Features:
 * - Dynamic form field rendering based on rule selection
 * - Form validation using Zod schema
 * - Integration with backend API for rule creation
 * - Support for multiple rule categories: metadata, data_profiling, and data_drift
 * - Contextual help and field labels
 * - Alert configuration and execution scheduling
 * 
 * @param {AddRuleDrawerProps} props - The component props containing dataset context and control functions.
 * @returns {JSX.Element} - The rendered drawer component with rule creation form.
 */
export const AddRuleDrawer: FC<AddRuleDrawerProps> = ({
    open, // handles drawer opening and closing state
    businessUnit, // business unit of dataset
    catalogName, // catalog to which the dataset belongs
    schemaName, // schema to which the dataset belongs
    datasetName, // name of the dataset
    datasetType, // type of dataset
    columns, // column names of the dataset
    onOpenChange // sets the state of the drawer opening and closing
}) => {

    // ------------------- Hooks and State Management ------------------- //

    // Get the global toast notification function for showing success/error messages
    const { showToast } = useGlobalToast();

    // Fetch configured alerts for the receiver alert email dropdown
    const { alerts, isFetchingAlerts } = useGetDataQualityConfiguredAlerts()

    // Local state to track the selected date format option in custom format fields
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

    // State to track whether rule submission is in progress
    // - `isLoading`: Boolean flag indicating if rules are currently being submitted to backend
    // - Set to true when "Add Rules" button is clicked, false when submission completes
    // - Used to disable the submit button during processing to prevent duplicate submissions
    // - Example: When true, "Add Rules" button shows disabled state during API calls
    const [isLoading, setIsLoading] = useState(false);

    // Define the initial values of the fields in the form.
    const defaultAddFormValues = {
        ruleCategory: "", // set default value of ruleCategory to ""
        ruleType: "", // set default value of ruleType to ""
        ruleName: "", // set default value of ruleName to ""
        runFrequency: "", // set default value of ruleFrequency to ""
        ruleValue: "", // set default value of ruleValue to ""
        ruleWarningThreshold: "", // set default value of ruleWarningThreshold to ""
        ruleCriticalThreshold: "", // set default value of ruleCriticalThreshold to ""
        baselineValue: "", // set default value of baselineValue to ""
        datasetType: datasetType, // set default value of datasetType to dataset type of the selected dataset
    }

    // Initialize the form with validation schema and default values
    const form = useForm<AddRuleFormData>({
        resolver: zodResolver(addRuleSchema), // Use Zod schema for validation
        shouldUnregister: false, // Keep field values even when fields are unmounted
        // set default values for input fields in the form
        defaultValues: defaultAddFormValues, // set to default values
        mode: "onChange", // Validate on every change
    });

    // Destructure form methods for easier access
    const { watch, control, setValue, resetField, handleSubmit, reset } = form;

    // -------------- Form Field Watching -------------- 

    // Watch form fields to enable dynamic field rendering based on selections
    const ruleCategory = watch("ruleCategory") as Category; // Current rule Category
    const ruleType = watch("ruleType"); // Current rule type
    const ruleName = watch("ruleName"); // Current rule name
    const formatType = watch("ruleValue"); // Current format type (for format checks)
    const targetColumn = watch("targetColumn"); // Current target column selection
    const isDateColumn = watch("ruleValue"); // Whether the column is a date column (for range checks)
    
    // Define available rule categories based on dataset type
    // FILE datasets don't support data_drift rules
    const ruleCategories = datasetType==="FILE" ?
                            ["metadata", "data_profiling"] // for file type datasets
                            :
                            ["metadata", "data_profiling", "data_drift"]; // for table and view type datasets

    // ---------------- Dynamic Options Computation ---------------- 

    // Compute available rule types based on selected ruleCategory
    // Uses useMemo to avoid unnecessary recalculations
    const ruleTypes = useMemo(() => {
        return ruleTypeMapping[ruleCategory] ?? [];
    }, [ruleCategory]); // recompute the ruleTypes whenever value of ruleCategory changes.

    // Compute available rule names based on selected ruleCategory and type
    // Different categories have different name mappings
    // For example,
    // If selected ruleCategory is metadata, then return metadataRuleNameMapping
    const names = useMemo(() => {
        return ruleCategory === "metadata"
            ? metadataRuleNameMapping[ruleType as keyof typeof metadataRuleNameMapping] ?? []
            : ruleCategory === "data_profiling"
                ? dataProfilingRuleNameMapping[ruleType as keyof typeof dataProfilingRuleNameMapping] ?? []
                : dataDriftRuleNameMapping[ruleType as keyof typeof dataDriftRuleNameMapping] ?? [];


    }, [ruleCategory, ruleType]); // If ruleCategory or ruleType gets changed then rerun this.

    // Effect to sync dataset type prop changes with form state
    // Only updates if the value actually changed to avoid infinite loops
    useEffect(() => {
        // Only set if it's different to avoid unnecessary re-renders
        if (form.getValues("datasetType") !== datasetType) {
            setValue("datasetType", datasetType, { // set the value of datasetType
                shouldValidate: false, // set shouldValidate to false to disable validation every time we set value of datasetType
                shouldDirty: false // set shouldDirty to false for initially setting the value of datasetType
            });
        }
    }, [datasetType, setValue, form]); // recompute whenever any of the value of these variables changes.

    // Effect to reset dependent fields when ruleCategory changes
    // This ensures the form doesn't have invalid combinations of values
    useEffect(() => {
        setValue("ruleType", ""); // set value to "" to reset the field
        setValue("ruleName", ""); // set value to "" to reset the field
    }, [ruleCategory, setValue, ruleTypes]); // perform this whenever value of these variables changes

    // Effect to reset rule name when type changes
    // Prevents invalid type-name combinations
    useEffect(() => {
        setValue("ruleName", ""); // set value to "" to reset the field
    }, [ruleType, setValue, names]); // perform this whenever value of these variables changes

    // Effect to reset all conditional fields when rule name changes
    // This ensures a clean slate for each new rule configuration
    useEffect(() => {
        resetField("targetColumn"); // reset the value of the field
        resetField("ruleValue"); // reset the value of the field
        resetField("dataPattern"); // reset the value of the field
        resetField("isDateColumn"); // reset the value of the field
        resetField("ruleWarningThreshold"); // reset the value of the field
        resetField("ruleCriticalThreshold"); // reset the value of the field
        resetField("baselineValue"); // reset the value of the field
        resetField("receiverAlertEmail"); // reset the value of the field
        resetField("receiverAlertId") // reset the value of the field
    }, [ruleName, resetField]); // perform this whenever the values of these variables changes

    // Form Submission Handler

    /**
     * Handles form submission by constructing the payload and sending it to the backend API.
     * On success, it shows a toast notification and closes the drawer.
     * On failure, it logs the error and shows an error toast.
     *
     * @param {AddRuleFormData} data - The validated form data from react-hook-form.
     */
    const onSubmit = (data: AddRuleFormData) => {
        // Construct the payload with all necessary fields required in databricks for rule creation
        // For Example,
        /**
         * payload = {
         *  businessUnit: "RND",
            datasetType: "TABLE",
            catalogName: "dset_dev",
            schemaName: "us_datalake_mng",
            datasetName: "valuetrak_852_monthly",
            ruleCategory: "metadata",
            ruleType: "volume",
            ruleName: "volume_check",
            targetColumn: "",
            ruleValue: "",
            dataPattern: "",
            runFrequency: "Daily",
            receiverAlertEmail: "jon.doe@tevapharm.com",
            receiverAlertId: "",
            selectColumns: "",
            ruleWarningThreshold: "",
            ruleCriticalThreshold: "",
            baselineValue: "",
           }
         */
        const payload: NewRule = {
            businessUnit: businessUnit, // business unit of the dataset on which rule is applied. 
            datasetType: datasetType, // type of the dataset on which rule is applied
            catalogName: catalogName, // catalog name of the dataset on which rule is applied
            schemaName: schemaName, // schema name of the dataset on which rule is applied
            datasetName: datasetName, // the dataset name on which rule is applied
            ruleCategory: data.ruleCategory, // category of rule applied
            ruleType: data.ruleType, // type of the rule applied
            ruleName: data.ruleName, // name of the rule applied
            targetColumn: data.targetColumn, // target column for data quality rule
            ruleValue: data.ruleValue, // rule value of the rule
            dataPattern: data.dataPattern, // data pattern for the rule
            runFrequency: data.runFrequency, // run frequency for the rule
            receiverAlertEmail: data.receiverAlertEmail, // receiver alert email for data quality rule
            receiverAlertId: data.receiverAlertId, // receiver alert id for data drift rule
            selectColumns: data.selectColumns, // columns selected for data drift rules
            ruleWarningThreshold: data.ruleWarningThreshold ? Number(data.ruleWarningThreshold) : undefined, // rule warning threshold for the rule
            ruleCriticalThreshold: data.ruleCriticalThreshold ? Number(data.ruleCriticalThreshold) : undefined, // rule critical threshold for the rule
            baselineValue: data.baselineValue ? Number(data.baselineValue) : undefined, // baseline value for the rule
        };

        // Log the form data to console for debugging
        console.log("Add rule form payload: ", payload)
      
        // Call the backend service to create the rule
        greatExpectationsService.manageDataQualityRule(payload)
        .then((response) => {
            // Add the run ID to the job status toaster for tracking
            addRunId(response?.run_id);
            // Show success notification
            showToast(`Request to create rule has been submitted successfully with Run ID: ${response?.run_id}`, undefined, undefined, "top-end"); // show the user message
            // Close the drawer and reset the form
            handleDiscard(); // to reset the form and close the drawer
          }).catch((error) => {
            // Log error and show error notification
            console.error("Failed to create rule:", error);
            setIsLoading(false);
            // showToast("Failed to create rule.", "error", undefined, "top-end"); // show user message
          });
    };

    // --------------- Drawer Control Functions ---------------

    /**
     * Handles discarding the form by resetting all fields to their default values
     * and closing the drawer. This is called when the user clicks "Discard" or closes the drawer.
     */
    const handleDiscard = () => {
        reset(defaultAddFormValues); // Reset form to default values
        setIsLoading(false); // Stop the loading state
        onOpenChange(false); // Close the drawer
    }

    /**
     * Filters available columns based on the current rule configuration.
     * Different rule types require different column data types.
     * 
     * - Metadata rules: Only TIMESTAMP columns
     * - Data drift rules: Filtered based on rule type (numeric, categorical, etc.)
     * - Other rules: All columns
     */
    const filterTargetColumns = ruleCategory==="metadata" // check if rule category is metadata
                                ? // if yes then perform the below actions
                                columns?.filter((column:any) => // filter columns with data type as timestamp or date
                                column.data_type.toLowerCase()==="timestamp" || column.data_type.toLowerCase()==="date") // compare datatype value of each column in columns list with timestamp and date
                                .map((column:any) => 
                                column.column_name // map only the column names to filterTargetColumns variable
                                )
                                : // if not metadata then
                                ruleCategory==="data_drift" // check if rule category is data_drift
                                ?// if yes then perform the below actions
                                getColumnsForDataDrift(columns, ruleName, ruleType) // call the function which gets the columns for data drift rules
                                .map((column:any) => column.column_name) // map only the column name to filterTargetColumns
                                : // if not data_drift then
                                columns?.map((column:any) => column.column_name) // map only the column names to filterTargetColumns variable

    /**
     * Renders a custom date format field with preset options and a custom input option.
     * This is used for rules that require date format specification.
     *
     * @param {any} field - The field object from react-hook-form Controller.
     * @returns {JSX.Element} - The rendered date format field(s).
     */
    const renderCustomDateFormatField = (field: any): JSX.Element => {
        // Predefined date format options
        const DateOptions = ["Custom Date Format","yyyy-MM-dd","MM/dd/yyyy","dd-MM-yyyy","dd/MM/yyyy"];

        return (
            <>
                {/* Dropdown for selecting date format */}
                <Field 
                 id="dateFormat"
                 label="Date Format"
                > 
                    {/* Date format dropdown component */}
                    <Dropdown
                        placeholder="Select a date format" // Placeholder text when no selection is made
                        value={selectedFormat ?? DateOptions[0]} // Default to the first option or the selected option
                        onOptionSelect={(_, date) => { // Handle option selection
                            setSelectedFormat(date.optionValue as string); // Update selectedFormat state with the chosen value
        
                            // If the selected option is not "Custom Date Format", set the field value directly
                            if (date.optionValue !== "Custom Date Format") {
                                field.onChange(date.optionValue); // Update the form field with selected date format
                            } else {
                                // If custom date format is selected, clear the field value
                                field.onChange(""); 
                            }
                        }}
                        disabled={!targetColumn} 
                    >
                        {/* Map the options from DateOptions array */}
                        {DateOptions.map(format => (
                            // Display each date format option
                            <Option key={format} value={format}>
                                {format}
                            </Option>
                        ))}
                    </Dropdown>
                </Field>
        
                {/* Show custom input field when "Custom Date Format" is selected */}
                {selectedFormat === "Custom Date Format" && (
                    <Field
                    id="customDateFormat"
                        label="Custom Date Format" // Label for the custom date input
                        validationMessage={form.formState.errors.ruleValue?.message} // Show validation error message if any
                        required // Mark field as required
                    >
                        <Input
                            {...field} // Spread form input handler for binding input value and onChange
                            placeholder="Enter date format (e.g. yyyyMMdd)" // Placeholder for custom input
                            value={field.value ?? ""} // Display current value of the input or default to empty string
                        />
                    </Field>
                )}
            </>
        );
    }

    return (
        <form noValidate id="rule-form"> 
        {/* Form tag with no validation */}
                {/* Overlay drawer component from Fluent UI */}
                <OverlayDrawer
                    open={open} // Control if the drawer is open or closed
                    onOpenChange={(_, { open }) => { // Handle drawer open/close changes
                        // Reset form fields when drawer is closed
                        if (open === false) {
                            reset(defaultAddFormValues); // reset form values to default
                        }
                        onOpenChange(open); // Call the onOpenChange callback with the updated drawer state
                    }}
                    position="end" // Position the drawer to open from the right
                    size="medium" // Set drawer size to medium
                >
        
                    {/* Drawer Header */}
                    <DrawerHeader>
                        {/* Component to add title to drawer */}
                        <DrawerHeaderTitle
                            action={ 
                                // Close button in the drawer header
                                <Button
                                    appearance="subtle" // Subtle button style
                                    aria-label="Close" // Accessibility label
                                    icon={<DismissRegular />} // Close icon for button
                                    onClick={handleDiscard} // Action to discard and close
                                />
                            }
                        >
                            Create Data Integrity Rule {/* Title of the drawer */}
                        </DrawerHeaderTitle>
                    </DrawerHeader>
        
                    {/* Drawer Body - Main Form Content */}
                    <DrawerBody>
                        <div className="flex flex-col gap-5 py-4">
                            
                            {/* Informational banner explaining the purpose of rules */}
                            <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2">
                                    <InfoRegular /> {/* Info icon */}
                                    <div className="flex flex-col">
                                        <Text size={200} weight="semibold" >
                                            Monitor Your Data Integrity {/* Title in the informational banner */}
                                        </Text>
                                        <Text size={100} className="text-neutral-foreground-2">
                                            Set up automated rules to validate your data and receive alerts when thresholds are breached or inconsistencies are detected.
                                            {/* Description of what the rules do */}
                                        </Text>
                                    </div>
                                </div>
                            </div>
        
                            {/* Main form content */}
                            <div className="flex flex-col gap-4">
                                
                                {/* Section header for rule parameters */}
                                <Text weight="semibold" size={400}>
                                    Data Integrity Rule Parameters {/* Title for rule parameters section */}
                                </Text>
        
                                {/* Grid layout for form fields - 2 columns */}
                                <div className="grid grid-cols-2 gap-4">
                                    
                                    {/* Rule Category Dropdown */}
                                    <Controller
                                        control={control} // Bind control for react-hook-form
                                        name="ruleCategory" // Name of the field in form state
                                        render={({ field }) => (
                                            <Field
                                                id="ruleCategory"
                                                label="Rule Category" // Label for the dropdown
                                                validationMessage={form.formState.errors.ruleCategory?.message} // Display validation error message
                                                validationState={form.formState.errors.ruleCategory ? "error" : "none"} // Set validation state based on error presence
                                                required // Mark as required field
                                            >
                                                <Dropdown
                                                    {...field} // Spread form field handlers (e.g., onChange, value)
                                                    onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle selection
                                                    value={field.value} // Bind current value of the dropdown
                                                    placeholder="Select a rule category" // Placeholder text
                                                >
                                                    {/* Map through ruleCategories to create options */}
                                                    {ruleCategories.map((category) => (
                                                        // Display category option 
                                                        <Option key={category} value={category}>
                                                            {category}
                                                        </Option>
                                                    ))}
                                                </Dropdown>
                                            </Field>
                                        )}
                                    />
        
                                    {/* Rule Type Dropdown */}
                                    <Controller
                                        control={control} // Bind control for react-hook-form
                                        name="ruleType" // Name of the field in form state
                                        render={({ field }) => (
                                            <Field
                                                id="ruleType"
                                                label="Rule Type" // Label for the dropdown
                                                validationMessage={form.formState.errors.ruleType?.message} // Display validation error message
                                                validationState={form.formState.errors.ruleType ? "error" : "none"} // Set validation state based on error presence
                                                required // Mark as required field
                                            >
                                                <Dropdown
                                                    {...field} // Spread form field handlers (e.g., onChange, value)
                                                    onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle selection
                                                    value={field.value} // Bind current value of the dropdown
                                                    placeholder="Select a rule type" // Placeholder text
                                                    disabled={(ruleTypes as any).length === 0} // Disable dropdown if there are no rule types available
                                                >
                                                    {/* Map through ruleTypes to create options */}
                                                    {ruleTypes.map((type) => (
                                                        // Display type option
                                                        <Option key={type} value={type}>
                                                            {type}
                                                        </Option>
                                                    ))}
                                                </Dropdown>
                                            </Field>
                                        )}
                                    />
        
                                {/* Rule Name Dropdown */}
                                <Controller
                                    control={control} // React Hook Form control object to handle form state
                                    name="ruleName" // The name of the form field, used for form state management
                                    render={({ field }) => ( // Render the dropdown field using provided field props
                                        <Field
                                            id="ruleName"
                                            label="Rule Name" // Label for the dropdown field
                                            validationMessage={form.formState.errors.ruleName?.message} // Display error message if any
                                            validationState={form.formState.errors.ruleName ? "error" : "none"} // Set validation state to error if there is an error
                                            required // Mark this field as required
                                        >
                                            <Dropdown
                                                {...field} // Spread form field handlers (e.g., onChange, value)
                                                onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle option selection and update the field value
                                                value={field.value} // Set current value of the dropdown field
                                                placeholder="Select a rule name" // Placeholder when no option is selected
                                                disabled={names.length === 0} // Disable dropdown if there are no available names
                                            >
                                                {names.map((name) => ( // Map through the names array and create options
                                                    <Option key={name} value={name}> 
                                                        {name}  
                                                        {/* Display name for each dropdown option */}
                                                    </Option>
                                                ))}
                                            </Dropdown>
                                        </Field>
                                    )}
                                />

                                {/* Conditional Fields Based on Rule Selection */}

                                {/* Target Column for Data Drift - First Level Selection */}
                                {/* Shows options: "All Columns" or "Enter Selective Columns" */}
                                {ruleCategory === "data_drift" && ( // Only render if the rule category is "data_drift"
                                    <Controller
                                        control={control} // React Hook Form control object to handle form state
                                        name="targetColumn" // Field name for target column
                                        render={({ field }) => ( // Render the field using provided field props
                                            <Field
                                                id="targetColumn"
                                                label="Target Column" // Label for the dropdown field
                                                validationMessage={form.formState.errors.targetColumn?.message} // Display error message if any
                                                validationState={form.formState.errors.targetColumn ? "error" : "none"} // Set validation state to error if there is an error
                                                required // Mark this field as required
                                            >
                                                <Dropdown
                                                    {...field} // Spread form field handlers (e.g., onChange, value)
                                                    onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle option selection and update the field value
                                                    value={field.value ?? ""} // Set current value of the dropdown or default to empty string
                                                    placeholder="Select a target column" // Placeholder when no option is selected
                                                    disabled={ruleName === ""} // Disable dropdown until a rule name is selected
                                                >
                                                    {dataDriftTargetColumns.map((column) => ( // Map through available target columns for data drift
                                                        <Option key={column} value={column}> 
                                                            {column} 
                                                            {/* Display column name for each dropdown option */}
                                                        </Option>
                                                    ))}
                                                </Dropdown>
                                            </Field>
                                        )}
                                    />
                                )}

                                {/* Target Column Selection - Second Level (Specific Columns) */}
                                {/* Shows when shouldShowTargetColumn returns true */}
                                {/* Can be single or multi-select based on rule configuration */}
                                {shouldShowTargetColumn(datasetType, ruleCategory, ruleType, ruleName, targetColumn) && ( // Only render if shouldShowTargetColumn returns true
                                    <Controller
                                        control={control} // React Hook Form control object to handle form state
                                        name={ruleCategory === "data_drift" ? "selectColumns" : "targetColumn"} // Dynamically change the field name based on the rule category
                                        rules={ !(ruleName==="timeliness_check" && datasetType==="TABLE") ? {required:true} : {}}
                                        render={({ field }) => ( // Render the field using provided field props
                                            <Field
                                                id="selectColumn"
                                                label={getTargetColumnLabel(ruleCategory)} // Label based on rule category and other parameters
                                                validationMessage={form.formState.errors.targetColumn?.message} // Display error message if any
                                                validationState={form.formState.errors.targetColumn ? "error" : "none"} // Set validation state to error if there is an error
                                                required={!(ruleName==="timeliness_check" && datasetType==="TABLE")}
                                            >
                                                <Dropdown
                                                    multiselect={multipleColumnsSelected(ruleCategory, ruleName, targetColumn)} // Enable multi-select if applicable
                                                    placeholder="Select Column(s)" // Placeholder when no columns are selected
                                                    value={field.value ?? ""} // Set the current value of the dropdown or default to empty string
                                                    selectedOptions={field.value ? field.value.split(", ") : []} // Parse comma-separated values for multi-select
                                                    onOptionSelect={(_, data) => { // Handle option selection and update field value
                                                        const selected = data.selectedOptions; // Get selected options array
                                                        field.onChange(selected.join(", ")); // Join selected values with commas and update field value
                                                    }}
                                                >
                                                    {filterTargetColumns.map((column: string) => ( // Map through available filtered columns
                                                        <Option key={column} value={column}>
                                                            {column} 
                                                            {/* Display column name for each dropdown option */}
                                                        </Option>
                                                    ))}
                                                </Dropdown>
                                            </Field>
                                        )}
                                    />
                                )}

                                {/* Rule Value Field - Conditional Rendering Based on Rule Type */}
                                {/* This field has different inputs for different rule types */}
                                {shouldShowRuleValue(ruleCategory, ruleType) && ( // Only render if rule value should be shown based on category and type
                                    <Controller
                                        control={control} // React Hook Form control object to handle form state
                                        name="ruleValue" // Field name for rule value
                                        render={({ field }) => { // Render the field using provided field props
                                            /* ---------------- DATA PROFILING – FORMAT CHECK ---------------- */
                                            /* Shows dropdown with format type options (Email, Mobile, Date Format, etc.) */
                                            if (ruleName === "format_check") { // Only render this if rule name is "format_check"
                                                const formatOptions = ["Email", "Mobile", "Date Format", "Sample Value", "Custom Format"]; // Available format options

                                                return (
                                                    <>
                                                        <Field id="formatType" label="Format Type" required> {/* Label for format type dropdown */}
                                                            <Dropdown
                                                                value={field.value ?? formatOptions[0]} // Default to the first option if no value is selected
                                                                onOptionSelect={(_, data) => { // Handle option selection and update the field value
                                                                    field.onChange(data.optionValue); // set the value as selected option
                                                                }}
                                                                placeholder="Select a format type" // Placeholder text
                                                            >
                                                                {formatOptions.map((option) => ( // Map through format options and create dropdown options
                                                                    // Display format option
                                                                    <Option key={option} value={option}>
                                                                        {option}
                                                                    </Option>
                                                                ))}
                                                            </Dropdown>
                                                        </Field>
                                                    </>
                                                );
                                            }

                                            /* ---------------- METADATA – TIMELINESS/FRESHNESS CHECK ---------------- */
                                            /* Shows custom date format selector for date-based rules */
                                            if (ruleName === "timeliness_check" || ruleName === "freshness_check") { // Render custom date format field for these rules
                                                return renderCustomDateFormatField(field) // Call custom function to render date format field
                                            }

                                            /* ---------------- DATA PROFILING – RANGE CHECK (Date Column Flag) ---------------- */
                                            /* Asks whether the range check is for dates or numbers */
                                            if (ruleCategory === "data_profiling" && ruleType === "validity" && ruleName === "range_check") { // Render for range check rule
                                                return (
                                                    <Field id="isItDateColumn" label="Is this a Date Column?" required> {/* Label for range check date column question */}
                                                        <Dropdown
                                                            {...field} // Spread form field handlers (e.g., onChange, value)
                                                            value={field.value ?? "False"} // Default to "False" if no value is selected
                                                            onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle option selection and update field value
                                                            placeholder="Select an option" // Placeholder text
                                                        >
                                                            <Option value="False">No - Numeric range</Option> {/* Option for numeric range */}
                                                            <Option value="True">Yes - Date range</Option> {/* Option for date range */}
                                                        </Dropdown>
                                                    </Field>
                                                );
                                            }

                                            /* ---------------- DEFAULT INPUT ---------------- */
                                            /* For all other cases, show a simple text input */
                                            return (
                                                <Field
                                                    id="ruleValueInput"
                                                    label={getRuleValueLabel(ruleCategory, ruleType, ruleName)} // Dynamic label based on rule category, type, and name
                                                    validationMessage={form.formState.errors.ruleValue?.message} // Display error message if any
                                                    required={ruleType!=="completeness"} // Mark field as required
                                                >
                                                    <Input
                                                        {...field} // Spread form field handlers (e.g., onChange, value)
                                                        value={field.value ?? ""} // Display the current value or default to empty string
                                                        placeholder="Enter a value" // Placeholder text for the input field
                                                    />
                                                </Field>
                                            );
                                        }}
                                    />
                                )}

                                {/* Data Pattern Field - Conditional Based on Format Type or Date Column */}
                                {/* Shows additional pattern/format input for specific rule configurations */}
                                {shouldShowDataPattern(ruleCategory, ruleType, ruleName, formatType, isDateColumn) && ( // Conditionally render the data pattern field if shouldShowDataPattern returns true
                                    <Controller
                                        control={control} // React Hook Form control to bind the form state
                                        name="dataPattern" // Name of the form field for data pattern
                                        render={({ field }) => { // Render the field with provided props
                                            // If it's a date column or date format, show date format selector
                                            if (isDateColumn === "True" || formatType === "Date Format") {
                                                return renderCustomDateFormatField(field) // Render custom date format selector for date-related fields
                                            }
                                            // Otherwise, show a simple text input for the pattern
                                            else {
                                                return (
                                                    <Field
                                                        id="dataPattern"
                                                        label={getDataPatternLabel(ruleCategory, ruleType, ruleName, formatType)} // Dynamic label for the data pattern field
                                                        validationMessage={form.formState.errors.dataPattern?.message} // Display validation error if any
                                                        required // Mark field as required
                                                    >
                                                        <Input {...field} placeholder="Enter a value" value={field.value ?? ""} /> 
                                                        {/* Standard input field for data pattern */}
                                                    </Field>
                                                )
                                            }
                                        }}
                                    />
                                )}

                            {/* Additional Fields for FILE Dataset Types */}
                            {/* Shows warning threshold, critical threshold, or baseline value fields */}
                            {/* These are defined in the additionalFields constant based on rule name */}
                            {datasetType === "FILE" && additionalFields[ruleName] && ( // Render additional fields only if datasetType is "FILE" and additionalFields are defined for the rule name
                                additionalFields[ruleName].map((inputField: any) => { // Iterate over additionalFields for the specific rule name
                                    return (
                                        <Controller
                                            key={inputField} // Use field name as key for unique identification
                                            control={control} // React Hook Form control to bind the form state
                                            name={inputField} // Name of the form field for additional field
                                            render={({ field }) => ( // Render the input field for the additional field
                                                <Field
                                                    id="additionalFields"
                                                    label={getAdditionalFieldLabel(inputField)} // Get label for the additional field based on the field name
                                                    validationMessage={form.formState.errors[inputField as keyof AddRuleFormData]?.message} // Display error message if any
                                                    validationState={form.formState.errors[inputField as keyof AddRuleFormData] ? "error" : "none"} // Set validation state based on error presence
                                                    required // Mark field as required
                                                >
                                                    <Input {...field} placeholder="Enter a value" value={field.value ?? ""} />  
                                                    {/* Standard input field for additional field */}
                                                </Field>
                                            )}
                                        />
                                    )
                                })
                            )}
                            </div>

                            {/* Alert & Execution Settings Section */}
                            <Text weight="semibold" size={400}>
                                Alert & Execution Settings {/* Title for the Alert & Execution Settings section */}
                            </Text>

                            <div className="grid grid-cols-2 gap-4">

                                {/* Receiver Alert Email Dropdown */}
                                {/* Shows configured alert distribution lists */}
                                {/* For data_drift, uses receiverAlertId; for others, uses receiverAlertEmail */}
                                <Controller
                                    control={control} // React Hook Form control to bind the form state
                                    name={ruleCategory === "data_drift" ? "receiverAlertId" : "receiverAlertEmail"} // Dynamic field name based on rule category (either receiverAlertId or receiverAlertEmail)
                                    render={({ field }) => (
                                        <Field
                                            id="receiverAlertEmail"
                                            label="Receiver Alert Email" // Label for the receiver alert email field
                                            validationMessage={form.formState.errors.receiverAlertEmail?.message} // Display validation error if any
                                            validationState={form.formState.errors.receiverAlertEmail ? "error" : "none"} // Set validation state to error if there is an error
                                            required // Mark the field as required
                                        >
                                            <Dropdown
                                                {...field} // Spread form handlers like onChange and value
                                                onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle option selection and update field value
                                                value={field.value ?? ""} // Bind the selected value or default to empty string
                                                placeholder="Select a receiver alert email" // Placeholder text
                                            >
                                                {/* Show loading spinner while fetching alerts */}
                                                {isFetchingAlerts ? <Spinner size="tiny" label="Loading..." labelPosition="after" /> // Show spinner if alerts are still being fetched
                                                    :
                                                    (
                                                        // Map alerts to dropdown options
                                                        (alerts || [])?.map((item) => (
                                                            // Display distribution list name
                                                            <Option key={item.RECEIVER_ALERT_ID} value={ruleCategory === "data_drift" ? item.RECEIVER_ALERT_ID : item.DISTRIBUTION_LIST}>
                                                                {item.DISTRIBUTION_LIST}
                                                            </Option>
                                                        ))
                                                    )}
                                            </Dropdown>
                                        </Field>
                                    )}
                                />

                                {/* Run Frequency Dropdown */}
                                {/* Determines how often the rule should be executed */}
                                <Controller
                                    control={control} // React Hook Form control to bind the form state
                                    name="runFrequency" // Name of the field for run frequency
                                    render={({ field }) => (
                                        <Field
                                            id="runFrequency"
                                            label="Run Frequency" // Label for the run frequency dropdown
                                            validationMessage={form.formState.errors.runFrequency?.message} // Display validation error if any
                                            validationState={form.formState.errors.runFrequency ? "error" : "none"} // Set validation state to error if there is an error
                                            required // Mark the field as required
                                        >
                                            <Dropdown
                                                {...field} // Spread form handlers like onChange and value
                                                onOptionSelect={(_, data) => field.onChange(data.optionValue)} // Handle option selection and update field value
                                                value={field.value} // Bind the selected value
                                                placeholder="Select a run frequency" // Placeholder text
                                            >
                                                {runFrequencies.map((frequency) => ( // Map through run frequencies to create dropdown options
                                                    // Display frequency option
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

                {/* Drawer Footer - Action Buttons */}
                <DrawerFooter>
                    <div className="flex justify-end gap-4">
                        {/* Discard button - resets and closes the drawer */}
                        <Button
                            appearance="secondary" // Secondary style for the button
                            onClick={handleDiscard} // Call handleDiscard function on click
                        >
                            Discard {/* Button text */}
                        </Button>
                        {/* Create Rule button - validates and submits the form */}
                        <Button
                            appearance="primary" // Primary style for the button
                            icon={isLoading ? <Spinner size="tiny" /> : <AddRegular />} // Plus/add icon to visually indicate adding action
                            disabled={
                                isLoading // Disable during submission to prevent duplicate API calls
                            }
                            type="submit" // Form submission trigger
                            onClick={async (create) => { // Handle button click to submit the form
                                create.preventDefault(); // Prevent default behavior (e.g., page refresh)
                                setIsLoading(true);
                                // call the submit handler function
                                handleSubmit(
                                    (data) => {
                                        onSubmit(data)
                                    },
                                    (errors) => {
                                        setIsLoading(false);
                                    }
                                    )(); // Trigger form submission with onSubmit function
                            }}
                        >
                            Create Rule {/* Button text */}
                        </Button>
                    </div>
                </DrawerFooter>

                </OverlayDrawer>

                </form>
);
}