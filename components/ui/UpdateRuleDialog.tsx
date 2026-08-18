/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 January 2026

  Purpose of the script:
    This script defines the UpdateRuleDialog component of the
    Teva Data Integrity Automation Dashboard.

    Responsibilities:
    - Provides a dialogBox UI for updating configured rules of a dataset.
    - Manages form state and validation for rule updation.
    - Handles dynamic field rendering based on update column.
    - Submits rule updation requests to the backend API.
    - Provides contextual help and validation feedback to users.
*/
"use client";
// ---------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------

/*  
  react
    - What it is: React library for building user interfaces.
    - Why used: Provides hooks for managing component state and lifecycle.
*/
import { FC } from "react";

/*  
  @fluentui/react-components
    - What it is: Fluent UI's component library providing accessible UI primitives.
    - Why used: Provides typography, loading spinner, and styling utilities for consistent UI.
*/
import {
  Dialog,        // Controls modal dialog behavior and open/close state
  DialogSurface, // Defines the visible container and layout of the dialog
  DialogTitle,   // Displays the dialog heading or title
  DialogBody,    // Wraps the main content area of the dialog
  DialogActions, // Groups action buttons at the bottom of the dialog
  DialogContent, // Holds form elements or descriptive content inside the dialog
  Field,         // Provides labels, validation, and accessibility for form controls
  Dropdown,      // Allows selection of a value from a list
  Option,        // Represents an individual selectable item in a Dropdown
  Textarea,      // Accepts multi-line user text input
  Button,        // Triggers user actions such as submit or cancel
  Text,          // Renders styled text with consistent typography
  Spinner,       // Indicates loading or in-progress state
} from "@fluentui/react-components";


/*  
  @hookform/resolvers/zod
    - What it is: A resolver library for integrating Zod validation with React Hook Form.
    - Why used: Provides schema-based validation for the dataset registration form.
*/
import { zodResolver } from "@hookform/resolvers/zod";

/*  
  react-hook-form
    - What it is: A library for managing form state and validation in React.
    - Why used: Helps manage form inputs and validation in dataset registration.
*/
import { useForm, Controller } from "react-hook-form";

/*  
  @/hooks/useGreatExpectations
    - What it is: A custom hook that fetches receiver alert ids for rule management.
    - Why used: User will be able to select to whom the alerts will be sent.
*/
import { useGetDataQualityConfiguredAlerts } from "@/hooks/useGreatExpectations";

/*  
  @/lib/services/greatExpectationsService
    - What it is: A service module for interacting with the backend APIs related to rule management.
    - Why used: Provides methods for creating and updating rules for datasets.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService";

/* 
  @/constants/rule
*  - Importing constant values for rule configuration
*  - These constants define available options for rule parameters, such as run frequencies and other parameters 
*  - used in the "add rule" form, to ensure consistency across the application.
*/
import { runFrequencies, ruleParameterOptions } from "@/constants/rule";

/*  
  @/hooks/useToast
    - What it is: A custom hook to manage toast notifications.
    - Why used: Used for displaying success, error, or informational toast messages.
*/
import { useGlobalToast } from "@/hooks/useToast";

/*
   @/lib/ruleFormHelper
   - What it is: File containing form fields rendering functions. 
   - Why used: It helps in validation and conditional rendering of form fields according to requirement of different rules.
 */
import { 
  shouldShowRuleValue // If rule value input field is required for a rule or not is checked using this function.
} from "@/lib/ruleFormHelper";

/*  
  @/constants/schema
    - What it is: Schema definitions for form validation.
    - Why used: Imports the ruleUpdate for validating rule updation form data and RuleUpdateValues type.
*/
import { RuleUpdateValues, ruleUpdateSchema} from "@/constants/schema";

/*
  @/types/rule
    - What it is: // TypeScript type defined for rule management.
    - Why used:  Used for the expected structure of data returned by the API.
*/
import { NewRule, Rule } from "@/types/rule";

/*  
  @/components/ui/JobStatusToaster
    - What it is: A custom component which shows the status of the job.
    - Why used: Provides the addRunId function to track the status of rule creation jobs.
*/
import { addRunId } from "@/components/ui/JobStatusToaster";

// ---------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------


/**
 * Determines whether the dropdown should be shown based on the column to update.
 * This function checks if the provided column name is one that should trigger a dropdown.
 *
 * @param {string} columnToUpdate - The column name that is being updated.
 * @returns {boolean} - Returns `true` if the dropdown should be displayed, `false` otherwise.
 *
 * Sample Input:
 * columnToUpdate = "ENABLED"
 * Sample Output:
 * true
 */
const shouldShowDropdown = (columnToUpdate: string) => {
    // Check if the column to update is one of the specified ones that should display a dropdown.
    if (["ENABLED", "RUN_FREQUENCY", "RECEIVER_ALERT_ID", "ALERT_FLAG"].includes(columnToUpdate)) return true;
    return false; // If it's not one of the specified columns, return false (no dropdown).
  }
  
  /**
   * Determines the list of values to display in the dropdown based on the column being updated.
   * This function provides the corresponding dropdown values for each column type.
   *
   * @param {string} columnToUpdate - The column name being updated.
   * @returns {Array<string> | Array<string[]>} - Returns an array of strings that represent the dropdown values.
   * Each dropdown corresponds to a specific column.
   *
   * Sample Input:
   * columnToUpdate = "ENABLED"
   * Sample Output:
   * ["True", "False"]
   */
  const showDropdownInUpdateDialog = (columnToUpdate: string) => {
    // If the column to update is "RUN_FREQUENCY", return a predefined set of values.
    if (columnToUpdate === "RUN_FREQUENCY") return runFrequencies;
    // If the column to update is "ENABLED" or "ALERT_FLAG", return two possible values: "True" or "False".
    if (columnToUpdate === "ENABLED" || columnToUpdate === "ALERT_FLAG") {
      return ["True", "False"] as const;
    }
  }

/**
 * Interface defining the props for the UpdateRuleDialog component.
 * These props control the drawer's behavior and provide necessary data for rule updation.
 */
interface UpdateRuleDialogProps {
    open: boolean; // Controls whether the drawer is visible
    ruleToUpdate: any;
    onOpenChange: (open: boolean) => void; // Callback to open/close drawer
    setRuleToUpdate: (rule: any) => void;
}

export const UpdateRuleDialog: FC<UpdateRuleDialogProps> = ({
    open,
    ruleToUpdate,
    onOpenChange,
    setRuleToUpdate
}) => {

    // Using the `useGlobalToast` hook to manage toast notifications globally
    const { showToast } = useGlobalToast();

    // Fetching configured alerts related to the data quality for the dataset
    const { alerts, isFetchingAlerts } = useGetDataQualityConfiguredAlerts();

    // Using the `useForm` hook to manage form state and validation
    const form = useForm<RuleUpdateValues>({
        resolver: zodResolver(ruleUpdateSchema),  // Using zod schema for form validation
        defaultValues: {
        selectColumn: "",  // Default value for the column selection
        updatedValue: ""   // Default value for the updated rule value
        },
        mode: "onChange",  // Trigger validation and state updates on every form change
    });

    // Destructuring to access form-related methods and states from the form hook
    const { setValue, control, handleSubmit, reset, watch } = form;

    // Watching the "selectColumn" field to track the selected column for rule updates
    const columnToUpdate = watch("selectColumn");

    /**
     * Handles the rule update by submitting the updated rule data.
     * If the rule is valid and the update function exists, it calls the `updateRule` function
     * to send the updated rule data to the backend.
     *
     * @param {RuleUpdateValues} data - The updated values for the rule.
     */
    const handleUpdateRule = (data: RuleUpdateValues) => {
        // Check if the rule to update exists and if the update function is defined.
        if (ruleToUpdate && updateRule) {
        updateRule(ruleToUpdate || [], data); // Pass the rule and updated data to the update function.
        }
        onOpenChange(false); // Close the update dialog after submitting.
        setRuleToUpdate({}); // Reset the rule to update.
    };

    /**
     * Updates a rule by preparing a payload and calling the `manageDataQualityRule` service.
     * The payload includes the necessary information for updating the rule in the system.
     *
     * @param {Rule} rule - The rule to update.
     * @param {RuleUpdateValues} data - The updated values for the rule.
     */
    const updateRule = (rule: Rule, data: RuleUpdateValues) => {
        // Prepare the payload to send to the backend.
        const payload: NewRule = {
        configId: rule.CONFIG_ID, // Set the rule's config ID.
        selectColumn: data.selectColumn, // Set the column to update.
        updatedValue: data.updatedValue, // Set the updated value for the rule.
        datasetName: rule.DATASET_NAME, // Set the dataset name associated with the rule.
        ruleCategory: rule.RULE_CATEGORY // Set the rule category associated with the rule.
        };

        // Call the `greatExpectationsService` to send the update request.
        greatExpectationsService.manageDataQualityRule(payload).then((response) => {
        addRunId(response?.run_id); // Add the run ID from the response.
        showToast(`Request to update rule parameter has been submitted successfully with Run ID: ${response?.run_id}`, undefined, undefined, "top-end"); // Show success message after update.
        reset(); // Reset the form or state after the operation.
        }).catch((error) => {
        console.error("Failed to update rule:", error); // Log any errors that occur during the update.
        // showToast("Failed to update rule.", "error", undefined, "top-end"); // Show error message if the update fails.
        reset(); // Reset the form or state after failure.
        });
    }

    /**
     * Cancels the rule update by closing the update dialog and resetting the form state.
     * This function is triggered when the user decides not to update the rule.
     */
    const cancelUpdate = () => {
        reset(); // Reset the form or state to its initial values.
        onOpenChange(false); // Close the update dialog without making any changes.
    };

    // Filter the rule value field and show it whenever it is required, else remove it from the list.
    // If output of shouldShowRuleValue is true then rule value is required.
    const filteredRuleParameterOptions = shouldShowRuleValue(ruleToUpdate.RULE_CATEGORY, ruleToUpdate.RULE_TYPE) 
    ? ruleParameterOptions
    : ruleParameterOptions.filter((rule) => rule !== "RULE_VALUE") 

    return (
    <>
    {/* Update Rule Dialog - allows users to update rule parameters */}
    <Dialog
      open={open} // set the value of dialogbox handler
      onOpenChange={(e, data) => 
        onOpenChange(data.open)
      }
    >
      <DialogSurface>
        {/* on submitting the form the handleSubmit function is called which interacts with the backend. */}
        <form onSubmit={handleSubmit(handleUpdateRule)} noValidate id="update-rule-form">
          <DialogBody>
            {/* display the title ofthe dialogbox */}
            <DialogTitle>
              Update Rule Parameters
            </DialogTitle>
            {/* content goes in this element */}
            <DialogContent>
              <div className="flex flex-col gap-4">
                {/* Inform the user about which rule they are updating */}
                <Text>
                  You are about to update parameters of{" "}
                  <b>"{ruleToUpdate?.RULE_NAME}"</b> rule.
                </Text>

                {/* Dropdown for selecting rule parameter to update */}
                <Controller
                  control={control} // react form controller
                  name="selectColumn"
                  render={({ field }) => (
                    <Field
                      label="Select Rule Parameter"
                      validationMessage={form.formState.errors.selectColumn?.message}
                      required
                    >
                      <Dropdown
                        {...field} // react form handler
                        value={field.value} // display value of the field
                        onOptionSelect={(_, d: any) => {
                          field.onChange(d.optionValue); // set the value to selected option
                          const selectedValue = ruleToUpdate?.[d.optionValue] ?? ""; // If value is present the assign it else asign ""
                          // set the value according to selected option for handling other components of the form
                          setValue("updatedValue", selectedValue, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        // placeholder for the field
                        placeholder="Select a parameter"
                      >
                        {/* display the options for selecting the parameter to update */}
                        {filteredRuleParameterOptions.map((c) => (
                          <Option key={c} value={c}>
                            {c}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />

                {/* Display the current value of the selected parameter */}
                {form.getValues("selectColumn") && 
                <Text weight="bold" size={300}>Current Value of {form.getValues("selectColumn")}
                : <span className="text-neutral-foreground-2">
                  {/* display the value according to selected column  */}
                  {ruleToUpdate?.[form.getValues("selectColumn")] ?? 'Unspecified'}
                  </span></Text>
                }
                {/* Conditional rendering of dropdown or text area depending on the selected column */}
                <Controller
                  control={control} // react form controller
                  name="updatedValue"
                  render={({ field }) => (
                    <Field
                      label="Update Selected Parameter Value"
                      validationMessage={form.formState.errors.updatedValue?.message}
                      required
                    >
                      {/* Render dropdown for specific columns like "RECEIVER_ALERT_ID" */}
                      {shouldShowDropdown(columnToUpdate) ?
                        <Dropdown
                          {...field}
                          value={field.value}
                          onOptionSelect={(_, d) => {
                            field.onChange(d.optionValue);
                          }}
                        >
                          {/* Render dropdown options dynamically based on selected column 
                            * if dropdown can be shown instead of input field.
                            * output is an array with options of the dropdown.
                          */}
                          {showDropdownInUpdateDialog(columnToUpdate)?.map((value: string) => {
                            return (<Option key={value} value={value}>{value}</Option>)
                          })}
                          {/* Additional condition for specific "RECEIVER_ALERT_ID" case */}
                          {columnToUpdate === "RECEIVER_ALERT_ID" && (
                            // if fetching the receiver alert ids 
                            isFetchingAlerts ? <Spinner size="tiny" label="Loading..." labelPosition="after" />
                              :
                              (
                                // map the receiver alert id and email to the dropdown options 
                                (alerts || [])?.map((item) => (
                                  <Option key={item.RECEIVER_ALERT_ID} value={ruleToUpdate?.RULE_CATEGORY === "data_drift" ? item.RECEIVER_ALERT_ID : item.DISTRIBUTION_LIST}>
                                    {item.DISTRIBUTION_LIST}
                                  </Option>
                                ))
                              )
                          )}
                        </Dropdown>
                        :
                        <Textarea
                          {...field} // react form handler for input field
                          placeholder="Enter selected parameter new value"
                          size="medium" // size of the field
                          resize="vertical" // vertically resize the field if data is not fitting
                        />
                      }
                    </Field>
                  )}
                />
              </div>
            </DialogContent>
            <DialogActions>
              {/* actions performed by the form and dialog  */}
              <div className="flex gap-4 mt-5">
                {/* Cancel and submit buttons for rule update */}
                <Button
                  appearance="secondary"
                  onClick={cancelUpdate} // on click call the cancelUpdate function
                >
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  type="submit" // type of button
                  form="update-rule-form" // form name to which the button is aligned
                >
                  Update Parameter
                </Button>
              </div>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
    </>
    )
}