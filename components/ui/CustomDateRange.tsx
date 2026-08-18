/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script provides a reusable "CustomDateRange" component for the
    Teva Data Integrity Automation Dashboard. It enables users to filter
    data by predefined or custom date ranges.

    Key Responsibilities:
    - Provides predefined date ranges such as last 7 days, last 1 month, etc.
    - Supports custom start and end date selection via a modal dialog.
    - Ensures proper validation of start and end dates.
    - Integrates seamlessly with other dashboard components via props.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @fluentui/react-components
    - What it is: Fluent UI's modern React component set (buttons, dialogs,
      dropdowns, fields) and styling helpers (`makeStyles`, `tokens`).
    - Why used: Provides accessible, themed UI building blocks used throughout the dashboard.
*/
import {
  Dropdown,
  makeStyles,
  tokens,
  Option,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogContent,
  DialogActions,
  Field,
} from "@fluentui/react-components"; // Fluent UI components for UI and dialogs
/*
  @fluentui/react-datepicker-compat
    - What it is: A compatibility DatePicker component for Fluent UI.
    - Why used: Offers a user-friendly calendar picker for start/end dates.
*/
import { DatePicker } from "@fluentui/react-datepicker-compat"; // Fluent UI DatePicker (compat version)
/*
  react
    - What it is: The React library. `FC`, `useState`, and `useEffect` are used
      to build the component and manage its state and lifecycle.
    - Why used: Core framework for building interactive UI components.
*/
import { FC, useEffect, useState } from "react"; // React hooks for state management

// ---------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------

/**
 * useCustomDateRangeStyles
 *
 * Defines component-level styles for dialog footer
 * and date picker row alignment.
 */
const useCustomDateRangeStyles = makeStyles({
  dialogFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalM, // spacing between buttons
  },
  pickerRow: {
    display: "flex",
    gap: tokens.spacingHorizontalL, // spacing between date pickers
    alignItems: "center", // vertical alignment
  },
});

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

/**
 * DateRangeOption
 *
 * Represents a selectable date range with a label, value,
 * start date, and end date.
 */
export type DateRangeOption = {
  label: string;
  value: string;
  startDate: Date | null;
  endDate: Date | null;
};

/**
 * CustomDateRangeProps
 *
 * Props for the CustomDateRange component.
 * - selectedRange: currently selected date range.
 * - setSelectedRange: callback to update selected range.
 * - oneDayRangeRequired: add 24 Hours option in date range.
 */
interface CustomDateRangeProps {
  selectedRange: DateRangeOption;
  setSelectedRange: (dateRange: DateRangeOption) => void;
  oneDayRangeRequired?: boolean;
  selectSevenDaysAsDefault?: boolean;
}

// ---------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------

/**
 * CustomDateRange Component
 *
 * Provides a dropdown for selecting predefined or custom date ranges.
 * Opens a dialog for custom date selection.
 *
 * Sample Input:
 * ```tsx
 * <CustomDateRange selectedRange={range} setSelectedRange={setRange} />
 * ```
 *
 * Sample Output:
 * - Dropdown with options: Last 7 Days, Last 1 Month, Last 3 Months, Last 6 Months, Custom Range
 * - Dialog appears when "Custom Range" is selected, allowing start/end date selection
 */
export const CustomDateRange: FC<CustomDateRangeProps> = ({
  selectedRange,
  setSelectedRange,
  oneDayRangeRequired,
  selectSevenDaysAsDefault = false
}) => {
  // -------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------

  const styles = useCustomDateRangeStyles(); // scoped styles for the component

  // -------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------

  const today = new Date(); // today's date
  today.setHours(23, 59, 59, 999); // normalize to end-of-day

  /**
   * addMonthsBack
   * 
   * Returns a new date by subtracting `months` from `date`.
   * 
   * Sample Input:
   * const inputDate = new Date('2023-12-15');  // December 15, 2023
   * const monthsToSubtract = 3;
   * 
   * Sample Output:
   *    2023-09-15T00:00:00.000Z (September 15, 2023 at 00:00:00)
   */
  const addMonthsBack = (date: Date, monthsToSubtract: number): Date => {
    const localDate = new Date(date); // copy input date to avoid mutating caller
    localDate.setMonth(localDate.getMonth() - monthsToSubtract); // subtract the specified number of months
    localDate.setHours(0, 0, 0, 0); // normalize to start-of-day
    return localDate; // return the computed date
  };

  /**
   * addDaysBack
   * 
   * Returns a new date by subtracting `days` from `date`.
   * 
   * Sample Input:
   * const inputDate = new Date('2023-12-15');  // December 15, 2023
   * const daysToSubtract = 10;
   * 
   * Sample Output:
   *    2023-12-05T00:00:00.000Z (December 5, 2023 at 00:00:00)
   */
  const addDaysBack = (date: Date, daysToSubtract: number): Date => {
    const localDate = new Date(date); // copy input date to avoid mutating caller
    localDate.setDate(localDate.getDate() - daysToSubtract); // subtract the specified number of days
    localDate.setHours(0, 0, 0, 0); // normalize to start-of-day
    return localDate; // return computed date
  };

  /**
   * predefinedRanges
   *
   * List of commonly used date ranges for quick selection.
   */
  const baseRanges: DateRangeOption[] = [
    {
      label: "Last 7 Days",
      value: "last7Days",
      startDate: addDaysBack(today, 7),
      endDate: today,
    },
    {
      label: "Last 1 Month",
      value: "last1Month",
      startDate: addMonthsBack(today, 1),
      endDate: today,
    },
    {
      label: "Last 3 Months",
      value: "last3Months",
      startDate: addMonthsBack(today, 3),
      endDate: today,
    },
    {
      label: "Last 6 Months",
      value: "last6Months",
      startDate: addMonthsBack(today, 6),
      endDate: today,
    },
  ];
  
  // if one day date range is required then we add it to the list
  const predefinedRanges: DateRangeOption[] = oneDayRangeRequired
    ? [
        {
          label: "Last 24 Hours",
          value: "last24Hours",
          startDate: addDaysBack(today, 1),
          endDate: today,
        },
        ...baseRanges,
      ]
    : baseRanges;

  

  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  // Local state: start date chosen in the custom dialog (or null when unset)
  const [customStart, setCustomStart] = useState<Date | null>(null);

  // Local state: end date chosen in the custom dialog (or null when unset)
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  // Controls whether the custom date dialog is visible to the user
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  /**
   * handleRangeSelect
   *
   * Called when a dropdown option is selected.
   * Opens dialog for custom range or applies predefined ranges.
   */
  const handleRangeSelect = (_: any, data: { optionValue?: string }) => {
    // Called when the user picks a value from the dropdown
    const value = data.optionValue; // the selected option's value
    if (!value) return; // ignore if no value

    if (value === "custom") {
      // If 'Custom Range' chosen, open the dialog and pre-fill with last values or default value
      setCustomStart(customStart ?? addMonthsBack(today, 1)); // default to 1 month ago
      setCustomEnd(customEnd ?? today); // default to today
      setDialogOpen(true); // show dialog
    } else {
      // Otherwise, find the matching predefined range and apply it
      const range = predefinedRanges.find((predefinedRange) => predefinedRange.value === value);
      if (range) setSelectedRange(range);
    }
  };

  /**
   * applyCustomRange
   *
   * Validates and applies selected custom dates.
   */
  const applyCustomRange = () => {
    // Early return if either date is not selected
    if (!customStart || !customEnd) return;

    // Create a copy of the start date and set time to beginning of day
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);

    // Create a copy of the end date and set time to end of day
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);

    // Validate that start date is not after end date; exit if range is invalid
    if (start > end) return;

    // Update parent component with the validated custom date range
    setSelectedRange({
      label: "Custom Range",
      value: "custom",
      startDate: start,
      endDate: end,
    });

    // Close the dialog after successfully applying the custom range
    setDialogOpen(false);
  };

  /**
   * formatRangeLabel
   *
   * Formats the dropdown label for display.
   */
  const formatRangeLabel = (range: DateRangeOption): string => {
    // Check if the selected date range is not a custom range
    if (range.value !== "custom") return range.label; // Return the label for predefined ranges

    // If the range is custom but start or end date is not set, return default label
    if (!range.startDate || !range.endDate) return "Custom Range";

    // Helper function to format a date into MM/DD/YYYY string
    const formatDate = (date: Date) =>
      `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`; // Format the date

    // Return the formatted date range as a string
    return `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`;
  };

  // -------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------

  // Reset custom dates when dialog closes without applying
  useEffect(() => {
    // Check if the dialog is closed and the selected range is not custom
    if (!dialogOpen && selectedRange.value !== "custom") {
      // Reset custom start date to null when dialog is closed
      setCustomStart(null);
      // Reset custom end date to null when dialog is closed
      setCustomEnd(null);
    }
  }, [dialogOpen, selectedRange]); // Dependencies: re-run effect when dialogOpen or selectedRange changes

  // Initialize selected range to first predefined option
  useEffect(() => {
    setSelectedRange(selectSevenDaysAsDefault? predefinedRanges[1]: predefinedRanges[0]);
  }, []);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <div>
      {/* Dropdown for predefined or custom date ranges */}
      <Field label="Date Range">
        {/* which option is selected (keeps internal control selection in sync) */}
        <Dropdown
          selectedOptions={[selectedRange.value]}
          // formatted label shown when dropdown is closed
          value={formatRangeLabel(selectedRange)}
          // called when user selects an option; handles 'custom' vs presets
          onOptionSelect={handleRangeSelect}
          appearance="filled-darker"
        >
          {predefinedRanges.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {/* shown option label */}
              {opt.label}
            </Option>
          ))}
          <Option value="custom">Custom Range</Option>
        </Dropdown>
      </Field>

      {/* Dialog opened when user chooses a custom range */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(_, { open }) => setDialogOpen(open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogContent>
              <div className={styles.pickerRow}>
                <Field label="Start Date" required>
                  {/* user picks the start date; cannot be in the future */}
                  <DatePicker
                    placeholder="Start date"
                    value={customStart}
                    onSelectDate={(date) => setCustomStart(date ?? null)}
                    maxDate={today}
                    appearance="filled-darker"
                  />
                </Field>
                <Field label="End Date" required>
                  {/* user picks the end date; cannot be before start or in the future */}
                  <DatePicker
                    placeholder="End date"
                    value={customEnd}
                    onSelectDate={(date) => setCustomEnd(date ?? null)}
                    minDate={customStart ?? undefined}
                    maxDate={today}
                    appearance="filled-darker"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions className={styles.dialogFooter}>
              {/* Button to close the dialog without applying any changes */}
              <Button
                appearance="secondary"
                onClick={() => setDialogOpen(false)} // Closes the dialog
              >
                Cancel
              </Button>
              {/* Button to apply the selected custom date range */}
              <Button
                appearance="primary"
                onClick={applyCustomRange} // Calls the function to apply the custom range
                disabled={
                  // Disable button if start or end date is invalid
                  !customStart || // Check if start date is not selected
                  !customEnd || // Check if end date is not selected
                  customStart > (customEnd ?? new Date()) // Check if start date is after end date
                }
              >
                Apply
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
