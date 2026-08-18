/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026
  Purpose of the script: 
    This script contains helper functions used for manipulating and formatting add rule form,
    update rule form, and suggest rule, according to field requirements by each rule.
*/

//---------------------- Imports -------------------------//

// No imports needed in this helper file. All functions are written in pure TypeScript.


//---------------------- Rule Form Helper Functions -------------------------//

/**
 * Determines the appropriate label for the "Rule Value" field based on the rule's ruleCategory, type, and name.
 * This function provides context-specific labels to guide users on what value to enter.
 *
 * @param {string} ruleCategory - The rule ruleCategory (e.g., "metadata", "data_profiling").
 * @param {string} ruleType - The rule type (e.g., "completeness", "freshness").
 * @param {string} ruleName - The rule name (e.g., "schema_extraction", "freshness_check").
 * @returns {string} - The contextual label for the rule value field.
 *
 * Sample Input:
 * ruleCategory = "metadata", ruleType = "freshness", ruleName = "freshness_check"
 * Sample Output:
 * "Date Format (yyyy-MM-dd etc.)"
 */
export function getRuleValueLabel(ruleCategory: string, ruleType: string, ruleName: string): string {
    // For metadata ruleCategory rules
    if (ruleCategory === "metadata") {
        // Schema extraction requires primary key columns
        if (ruleName === "schema_extraction") return "Primary Key Columns (comma separated)";
        // Schema validation requires the dataset schema definition
        if (ruleName === "schema_validation") return "Dataset Schema";
        // Freshness and timeliness checks require date format specification
        if (["freshness", "timeliness"].includes(ruleType)) return "Date Format (yyyy-MM-dd etc.)";
    }
    // For data profiling ruleCategory rules
    if (ruleCategory === "data_profiling") {
        // Completeness checks require specification of invalid values
        if (ruleType === "completeness") return "Invalid Value(s)";
        // Consistency checks require valid consistency values
        if (ruleType === "consistency") return "Valid Consistency Value(s)";
        // Format checks require format type specification
        if (ruleType === "format") return "Format Type";
    }
    // Default label for all other cases
    return "Value";
}

/**
 * Determines the appropriate label for the "Target Column" field based on the rule's ruleCategory, type, and name.
 * This function provides context-specific labels for column selection fields.
 *
 * @param {string} ruleCategory - The rule ruleCategory (e.g., "metadata", "data_profiling", "data_drift").
 * @returns {string} - The contextual label for the target column field.
 *
 * Sample Input:
 * ruleCategory = "metadata"
 * Sample Output:
 * "Date Column Name"
 */
export function getTargetColumnLabel(ruleCategory: string): string {
    // Metadata rules target date columns
    if (ruleCategory === "metadata") return "Date Column Name";
    // Data drift rules can target multiple columns
    if (ruleCategory === "data_drift") return "Select Multiple Columns"
    // Default label for single column selection
    return "Column Name";
}

/**
 * Determines the appropriate label for the "Data Pattern" field based on rule details and selected format.
 * This function is primarily used for format validation rules where pattern specification is required.
 *
 * @param {string} ruleCategory - The rule ruleCategory.
 * @param {string} ruleType - The rule type.
 * @param {string} ruleName - The rule name.
 * @param {string} [ruleValue] - The selected rule value (format type).
 * @returns {string} - The contextual label for the data pattern field.
 *
 * Sample Input:
 * ruleCategory = "data_profiling", ruleType = "format", ruleName = "format_check", ruleValue = "Date Format"
 * Sample Output:
 * "Date Format (e.g. yyyy-MM-dd)"
 */
export function getDataPatternLabel(ruleCategory: string, ruleType: string, ruleName: string, ruleValue?: string): string {
    // For data profiling format checks, provide specific labels based on format type
    if (ruleCategory === "data_profiling" && ruleType === "format" && ruleName === "format_check") {
        if (ruleValue === "Date Format") return "Date Format (e.g. yyyy-MM-dd)";
        if (ruleValue === "Sample Value") return "Sample Value(s) for Pattern Inference";
        if (ruleValue === "Custom Pattern") return "Custom Pattern / Regex";
    }
    // Default label for pattern/format specification
    return "Pattern / Format";
}

/**
 * Determines whether the "Target Column" field should be displayed based on dataset type and rule configuration.
 * This function controls the conditional rendering of the target column field in the form.
 *
 * @param {string} datasetType - The type of dataset ("FILE" or other types like tables).
 * @param {string} ruleCategory - The rule ruleCategory.
 * @param {string} ruleType - The rule type.
 * @param {string} ruleName - The rule name.
 * @param {any} targetColumn - The currently selected target column option.
 * @returns {boolean} - True if the target column field should be shown, false otherwise.
 *
 * Sample Input:
 * datasetType = "TABLE", ruleCategory = "data_profiling", ruleType = "completeness", ruleName = "column_completeness_check", targetColumn = null
 * Sample Output:
 * true
 */
export function shouldShowTargetColumn(datasetType: string, ruleCategory: string, ruleType: string, ruleName: string, targetColumn: any): boolean {
    // FILE datasets don't have column-level rules, so never show target column
    if (datasetType === "FILE") return false;
    
    // For metadata ruleCategory, show only for freshness and timeliness rules
    if (ruleCategory === "metadata") return ["freshness", "timeliness"].includes(ruleType);
    
    // For data profiling ruleCategory, show based on specific rule types and names
    if (ruleCategory === "data_profiling") {
        // Completeness rules except row-level checks need target column
        if (ruleType === "completeness" && ruleName !== "row_level_completeness_check") return true;
        // Uniqueness rules except row-level checks need target column
        if (ruleType === "uniqueness" && !ruleName.includes("row_level")) return true;
        // Validity, numeric, format, and consistency rules need target column
        if (ruleType === "validity") return true;
        if (ruleType === "numeric") return true;
        if (ruleType === "format") return true;
        if (ruleType === "consistency") return true;
    }
    
    // For data drift ruleCategory, show when selective columns option is chosen
    if (ruleCategory === "data_drift" && targetColumn === "Enter Selective Columns") return true;
    
    // Default to not showing the field
    return false;
}

/**
 * Determines whether multiple columns can be selected for the current rule configuration.
 * This function controls whether the column dropdown should allow multiselect.
 *
 * @param {string} ruleCategory - The rule ruleCategory.
 * @param {string} ruleName - The rule name.
 * @param {any} targetColumn - The currently selected target column option.
 * @returns {boolean} - True if multiple columns can be selected, false otherwise.
 *
 * Sample Input:
 * ruleCategory = "data_profiling", ruleName = "dataset_uniqueness_check", targetColumn = null
 * Sample Output:
 * true
 */
export function multipleColumnsSelected(ruleCategory: string, ruleName: string, targetColumn: any):boolean {
    // Dataset-level uniqueness and completeness checks can span multiple columns
    if (ruleName === "dataset_uniqueness_check" || ruleName === "dataset_completeness_check") {
        return true;
    }
    // Data drift rules with selective columns can target multiple columns
    if (ruleCategory === "data_drift" && targetColumn === "Enter Selective Columns") {
        return true;
    }
    // Default to single column selection
    return false;
}

/**
 * Determines whether the "Rule Value" field should be displayed based on rule configuration.
 * This function controls the conditional rendering of the rule value field in the form.
 *
 * @param {string} ruleCategory - The rule ruleCategory.
 * @param {string} ruleType - The rule type.
 * @returns {boolean} - True if the rule value field should be shown, false otherwise.
 *
 * Sample Input:
 * ruleCategory = "metadata", ruleType = "schema", ruleName = "schema_extraction"
 * Sample Output:
 * true
 */
export function shouldShowRuleValue(ruleCategory: string, ruleType: string): boolean {
    // For metadata ruleCategory rules
    if (ruleCategory === "metadata") {
        // Freshness and timeliness checks require date format values
        if (["freshness", "timeliness", "format"].includes(ruleType)) return true;
    }
    // For data profiling ruleCategory rules
    if (ruleCategory === "data_profiling") {
        // Completeness, consistency, validity, and format rules require values
        if (["completeness", "consistency", "format", "validity"].includes(ruleType)) return true;
    }
    // Default to not showing the field
    return false;
}

/**
 * Determines whether the "Data Pattern" field should be displayed based on rule configuration.
 * This function controls the conditional rendering of the data pattern field for specific rule types.
 *
 * @param {string} ruleCategory - The rule ruleCategory.
 * @param {string} ruleType - The rule type.
 * @param {string} ruleName - The rule name.
 * @param {any} ruleValue - The currently selected rule value.
 * @param {any} dateColumn - Whether the column is a date column.
 * @returns {boolean} - True if the data pattern field should be shown, false otherwise.
 *
 * Sample Input:
 * ruleCategory = "data_profiling", ruleType = "format", ruleName = "format_check", ruleValue = "Date Format", dateColumn = null
 * Sample Output:
 * true
 */
export function shouldShowDataPattern(
    ruleCategory: string,
    ruleType: string,
    ruleName: string,
    ruleValue: any,
    dateColumn: any,
): boolean {
    // Only applicable to data profiling rules
    if (ruleCategory === "data_profiling") {
        // Range checks on date columns need date format pattern
        if (ruleName === "range_check" && dateColumn === "True") return true;
        // Format checks with specific format types need pattern specification
        if (ruleType === "format" && ruleName === "format_check") {
            return ["Date Format", "Sample Value", "Custom Format"].includes(ruleValue);
        }
    }
    // Default to not showing the field
    return false;
}

/**
 * Returns the display label for additional input fields based on the field name.
 * These fields are used for threshold and baseline configuration in certain rules.
 *
 * @param {string} inputField - The name of the additional input field.
 * @returns {string} - The user-friendly label for the field.
 *
 * Sample Input:
 * inputField = "ruleWarningThreshold"
 * Sample Output:
 * "Rule Warning Threshold"
 */
export function getAdditionalFieldLabel(inputField: string):string {
    return inputField === "ruleWarningThreshold" ?
        "Rule Warning Threshold"
        : inputField === "ruleCriticalThreshold" ?
            "Rule Critical Threshold"
            : "Baseline Value"
}

/**
 * Filters the available columns based on rule type and name for data drift rules.
 * Different drift detection algorithms require different column data types.
 *
 * @param {any} columns - The array of all available columns with their data types.
 * @param {string} ruleName - The name of the rule being configured.
 * @param {string} ruleType - The type of the rule being configured.
 * @returns {any[]} - The filtered array of columns applicable to the rule.
 *
 * Sample Input:
 * columns = [{column_name: "age", data_type: "INT"}, {column_name: "name", data_type: "STRING"}],
 * ruleName = "drift_check_kl_numeric",
 * ruleType = "statistical_analysis_numerical"
 * Sample Output:
 * [{column_name: "age", data_type: "INT"}]
 */
export function getColumnsForDataDrift(
    columns:any, 
    ruleName:string, 
    ruleType: string
    ) :any {

    // Numerical statistical analysis and outlier detection require numeric columns
    if (
        ["statistical_analysis_numerical", "outlier_detection"].includes(ruleType) 
        || 
        ["drift_check_kl_numeric", "drift_check_psi_numeric"].includes(ruleName)
    ) {
        return columns.filter((column:any) => 
            ["TINYINT", "SMALLINT", "INT", "LONG", "INTEGER", "BIGINT", "FLOAT", "DOUBLE"].includes(column.data_type)
        )
    }
    // Categorical analysis requires string columns
    else if (
        (["drift_check_kl_categorical", "drift_check_psi_categorical"].includes(ruleName))
        ||
        (ruleType==="statistical_analysis_categorical")
    ) {
        return columns.filter((column:any) => 
            column.data_type==="STRING"
        )
    }
    // Normality tests require floating-point columns
    else if (
        ruleType==="normality_test"
        ) {
        return columns.filter((column:any) => 
            ["FLOAT", "DOUBLE", "DECIMAL"].includes(column.data_type)
        )
    }

    // Default: return all columns
    return columns
}