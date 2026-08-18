/**
 * Project Name: Teva Data Integrity
 * Business Owner, Team: Keerthi Pusuloori
 * Script Author, Team: Radhe Raman Tiwari
 * Date: 02 February 2026
 *
 * Purpose of the script:
 *   A reusable dropdown/search field component for forms. Unlike a simple dropdown
 *   that only lets you pick from fixed options, this allows users to either:
 *   1. Type and filter through predefined options (like searching Google)
 *   2. Type a custom value that's not in the list (like creating a new email contact)
 *
 *   It integrates seamlessly with react-hook-form (form state management library)
 *   and Zod (form validation library).
 *   Key features:
 *   - Controlled component: The form controls its value, not the component itself
 *     (this allows the form to track changes, validation, and submission)
 *  - Shows validation errors and required field indicators
 *  - Provides callbacks for when options are selected (for triggering side effects)
 *  - Highly customizable via props for both the field container and the combobox itself
 *
 *  Use cases:
 *   Real-world example: Like a Google search box that shows suggestions as you type
 *   but also lets you search for anything, even things not in the suggestion list.
 *
 */

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  react
   - What is it: A JavaScript library for building user interfaces, developed by Facebook.
   - Why we use it: It allows us to create reusable UI components and manage complex state in a predictable way. We use React hooks like useState and useEffect to handle component state and side effects.
 */
import { useEffect, useState } from "react";
// - useEffect: Hook to sync data when external values change (e.g., when form updates from outside)
// - useState: Hook to manage local component state (e.g., tracking what user types in search box)

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: We use it for consistent styling and built-in accessibility features.
        It offers components like Combobox for dropdowns and Field for form layout, which we leverage to build our FormCombobox.
 */
import {
  Combobox, // Interactive dropdown with search/filter capability (type-ahead search box)
  ComboboxProps, // TypeScript type defining all possible props for Combobox component
  Option, // Individual selectable item in the combobox dropdown list
  Field, // Container component that wraps form inputs with label and error message
  FieldProps, // TypeScript type defining all possible props for Field component
} from "@fluentui/react-components";
// Microsoft's Fluent Design System components - professional UI building blocks

/*
   react-hook-form
    - What it is: A library for managing form state and validation in React applications.
    - Why we use it: It provides a simple and efficient way to handle form data, validation, and submission. We use the Controller component to connect our custom FormCombobox to the form's state management, allowing us to track its value and validation status seamlessly.
*/
import { Controller, useFormContext } from "react-hook-form";
// - Controller: A wrapper that connects individual form fields to react-hook-form's central form state
//   (this allows the form to track, save, and validate the field's value)
//   Real-world: Like a form handler that knows about all the fields and their values
// - useFormContext: Hook that gives us access to the main form's state and functions
//   (allows us to read validation errors and notify the form when this field changes)

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FormComboboxProps: Defines all the options that can be passed to FormCombobox component
 * This is like a recipe's ingredient list - specifies what can be customized
 */
export type FormComboboxProps = {
  // Field identifier - used to connect this field to form's validation and data (e.g., "businessUnit", "category")
  // Must be unique across the form
  name: string;

  // Display label showing above the combobox (e.g., "Select Department")
  // Optional - if not provided, no label is shown
  label?: string;

  // Placeholder text shown inside empty combobox (e.g., "Select or type...")
  // This hint text disappears when user starts typing
  placeholder?: string;

  // Array of options/choices user can select from (e.g., ["Option1", "Option2", "Option3"])
  // These will appear in the dropdown and can be searched/filtered
  options: string[];

  // Whether this field must have a value (true = user must select something)
  // Default is true (field is required)
  required?: boolean;

  // Callback function fired when user selects an option (used for side effects)
  // Example: refresh other fields based on selected value
  // Optional - component works fine without this
  onOptionSelect?: (value: string) => void;

  // Additional styling/configuration props to pass to the Field component
  // Allows parent components to customize appearance/behavior without modifying this component
  fieldProps?: Partial<FieldProps>;

  // Additional styling/configuration props to pass to the Combobox component
  // Allows parent components to customize dropdown appearance/behavior
  comboboxProps?: Partial<ComboboxProps>;
};

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * Reusable Combobox component that integrates with react-hook-form + Zod
 * Supports both:
 *   - Selecting from predefined options (dropdown filtering)
 *   - Entering custom freeform values (type anything)
 *
 * This is a "controlled component" - the form controls its state, not the component
 * Benefits: form automatically tracks value for submission, validation, etc.
 */
export function FormCombobox({
  name, // Unique identifier for this field in the form (e.g., "department")
  label, // Text label shown above the field (e.g., "Select Department")
  placeholder = "Select or type...", // Hint text shown in empty field (default if not provided)
  options, // Array of options user can choose from (e.g., ["HR", "Finance", "Engineering"])
  required = true, // Whether this field is required (default true)
  onOptionSelect, // Optional callback when user selects an option (e.g., to trigger side effects)
  fieldProps, // Additional props to customize the Field component (spread into Field)
  comboboxProps, // Additional props to customize the Combobox component (spread into Combobox)
}: FormComboboxProps) {
  // Get access to the form's state management and error tracking
  // control: object that manages this field's value
  // errors: object containing validation error messages for all fields
  const {
    control,
    formState: { errors },
  } = useFormContext();

  // Extract the error message for THIS field (if any)
  // If field has no errors, errorMessage will be undefined
  // Example error message: "This field is required" or "Invalid email format"
  const errorMessage = errors[name]?.message as string | undefined;

  // ────── NORMALIZE OPTIONS ──────────────────────────────────────────────
  // Convert the simple string array into objects with {value, label} structure
  // This is an internal transformation for easier handling
  // Input: ["Apple", "Banana", "Orange"]
  // Output: [{value: "Apple", label: "Apple"}, {value: "Banana", label: "Banana"}, ...]
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  // ────── RETURN FORM FIELD WITH CONTROLLER ──────────────────────────────
  // Controller: Connects this field to react-hook-form's form state
  // This makes the form automatically track changes, validation, and submission
  return (
    <Controller
      name={name} // Connect to form field with this name
      control={control} // Use this form's state management
      render={({ field: { value, onChange, onBlur, ref } }) => {
        // field props provided by Controller:
        // - value: current value from form state
        // - onChange: function to notify form when value changes
        // - onBlur: function to notify form when field loses focus
        // - ref: reference to DOM element

        // ────── LOCAL SEARCH STATE ────────────────────────────────

        // Local state for search text (what user is typing in the box)
        // Separate from form state because we need to filter options as user types
        // Before user selects something, this may contain partial/incomplete text
        const [searchText, setSearchText] = useState<string>(value ?? "");
        // Note: ?? (nullish coalescing) means "use empty string if value is null/undefined"

        // ────── SYNC SEARCH TEXT WHEN FORM VALUE CHANGES ──────────

        // useEffect: Keep local searchText in sync with form's value
        // This handles cases where form value changes externally (e.g., user goes back/forward)
        // Real-world: Like updating your search box when navigating to a different context
        useEffect(() => {
          setSearchText(value ?? ""); // Update search box to match form value
        }, [value]); // Only run this when 'value' changes

        // ────── FILTER OPTIONS BASED ON SEARCH ────────────────────

        // Find all options that match what user typed
        // Converts both search text and labels to lowercase for case-insensitive search
        // Example: user types "app", matches "Apple" but not "Banana"
        const matchingOptions = normalizedOptions.filter((opt) =>
          opt.label.toLowerCase().includes(searchText.toLowerCase()),
        );

        // ────── DETERMINE IF CUSTOM OPTION SHOULD BE SHOWN ────────

        // Show "Add custom value" option when:
        // - searchText is not empty (user typed something)
        // - No matching options exist (searched value isn't in list)
        // This lets users create custom values not in the predefined list
        // Real-world: Typing "NewDept" when it's not in the department list shows "Add 'NewDept'"
        const showCustomOption =
          !!searchText && // Convert to boolean (true if not empty)
          matchingOptions.length < 1; // No matching predefined options

        // The custom value that user can create (what they typed)
        const customValue = searchText;

        // ────── RENDER THE FIELD ──────────────────────────────────

        return (
          /* Field: Container component that wraps the combobox */
          /* Adds label, error message display, and validation styling */
          <Field
            label={label} /* Display label text above the field */
            validationMessage={
              errorMessage
            } /* Show error text below field if validation fails */
            validationState={
              errorMessage ? "error" : "none"
            } /* Show red border if error exists, normal otherwise */
            required={required} /* Show asterisk (*) if field is required */
            {...fieldProps} /* Any additional Field props passed from parent (spread) */
          >
            {/* Combobox: The interactive dropdown/search component */}
            <Combobox
              value={searchText} /* Current search text shown in input field */
              onChange={(event) => {
                // Called when user types in the combobox
                // event.target.value is what user typed

                // Trim whitespace from typed value (remove leading/trailing spaces)
                // Example: "  Apple  " becomes "Apple"
                const newValue = event.target.value.trim();

                // Update local searchText state (used for filtering options)
                setSearchText(newValue);

                // Tell the form about the new value
                // This updates form state so form knows current field value
                onChange(newValue);
              }}
              onOptionSelect={(_, data) => {
                // Called when user clicks an option or selects from list
                // data contains info about selected option

                // Get selected value (optionValue if available, otherwise optionText)
                // Fallback to empty string if neither exists
                const selectedValue = data.optionValue ?? data.optionText ?? "";

                // Update search text to show selected value
                setSearchText(selectedValue);

                // Update form state with selected value
                onChange(selectedValue);

                // Call optional callback if parent provided one
                // Used for triggering side effects (e.g., refreshing related fields)
                onOptionSelect?.(selectedValue);

                // Optional: Uncomment to mark field as touched immediately
                // onBlur(); // This would trigger validation right away
              }}
              freeform /* Allow entering custom values not in the option list */
              placeholder={placeholder} /* Hint text shown in empty field */
              onBlur={onBlur} /* Notify form when user leaves the field */
              ref={ref} /* Reference to the DOM element */
              {...comboboxProps} /* Any additional Combobox props from parent (spread) */
            >
              {/* ──── CUSTOM OPTION (if applicable) ──── */}

              {/* Show "Add [value]" option when user typed something not in the list */}
              {/* This lets users create/use custom values */}
              {showCustomOption && (
                /* Option component representing the custom value user can create */
                <Option value={customValue} text={customValue}>
                  {/* Display text: "Add "typed value"" in gray */}
                  {/* Example: Add "Marketing" if user typed "Marketing" */}
                  Add{" "}
                  <span className="text-neutral-foreground-2 font-semibold">
                    "{customValue}"
                  </span>
                </Option>
              )}

              {/* ──── PREDEFINED OPTIONS ──── */}

              {/* Loop through filtered matching options and display each as a selectable item */}
              {matchingOptions.map((option) => (
                /* Option: Individual selectable item in the dropdown */
                /* key: React's identifier for list items (helps React track changes) */
                <Option
                  key={option.value} /* Unique identifier used by React */
                  value={option.value} /* Value sent to form when selected */
                  text={option.label} /* Text used for filtering/searching */
                >
                  {/* Display text shown in dropdown */}
                  {option.label}
                </Option>
              ))}
            </Combobox>
          </Field>
        );
      }}
    />
  );
}
