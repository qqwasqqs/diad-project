/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2026
  Purpose of the file:
    This file contains Zod validation schemas and inferred TypeScript types
    used across the Data Integrity application.

    - Defines validation rules for:
        1. Dataset registration
        2. Rule configuration
        3. KPI configuration
    - Implements cross-field and conditional validation using Zod's superRefine
    - Exposes inferred TypeScript types for strong typing across UI and APIs
*/

/* ----------------------------- DEPENDENCY IMPORTS ----------------------------- */

/**
 * Zod is used for:
 *  - Runtime validation of form/API payloads
 *  - Generating inferred TypeScript types from schemas
 */
import { z } from "zod";

/* ----------------------------- REGISTER DATASET VALIDATION SCHEMA ----------------------------- */

/**
 * Zod schema for validating dataset registration input.
 *
 * Example (TABLE):
 * {
 *   businessUnit: "Commercial",
 *   datasetType: "TABLE",
 *   catalogName: "dset_dev",
 *   schemaName: "sales",
 *   datasetName: "orders"
 * }
 *
 * Example (FILE):
 * {
 *   businessUnit: "SupplyChain",
 *   datasetType: "FILE",
 *   datasetName: "/mnt/raw/inventory.csv"
 * }
 *
 * Rules:
 *  - TABLE / VIEW → catalogName + schemaName are mandatory
 *  - FILE → only datasetName (file path) is mandatory
 */
export const registerDatasetSchema = z.object({
  /**
   * L1 business unit owning the dataset
   * Example: "Commercial", "Finance", "SupplyChain"
   */
  businessUnit: z
    .string()
    .min(1, "L1 Business Unit is required"),

  /**
   * Dataset type selector
   * Expected values (controlled by UI):
   *  - TABLE
   *  - VIEW
   *  - FILE
   */
  datasetType: z
    .string()
    .min(1, "Dataset Type is required"),

  /**
   * Databricks catalog name
   * Required only for TABLE / VIEW
   * Example: "dset_dev"
   */
  catalogName: z
    .string()
    .optional(),

  /**
   * Databricks schema name
   * Required only for TABLE / VIEW
   * Example: "data_integrity"
   */
  schemaName: z
    .string()
    .optional(),

  /**
   * Dataset identifier:
   *  - TABLE  → table name (e.g., "orders")
   *  - VIEW   → view name (e.g., "orders_vw")
   *  - FILE   → file path (e.g., "/mnt/raw/data.csv")
   */
  datasetName: z
    .string()
    .min(1, "Table/View/File Name is required"),
})
  .superRefine((data, ctx) => {
    /**
     * Conditional validation based on datasetType
     */

    // TABLE / VIEW validations
    if (data.datasetType === "TABLE" || data.datasetType === "VIEW") {
      if (!data.catalogName?.trim()) {
        ctx.addIssue({ code: "custom", message: "Catalog Name required", path: ["catalogName"] });
      }
      if (!data.schemaName?.trim()) {
        ctx.addIssue({ code: "custom", message: "Schema Name required", path: ["schemaName"] });
      }
      if (!data.datasetName?.trim()) {
        ctx.addIssue({ code: "custom", message: "Table/View Name required", path: ["datasetName"] });
      }
    }

    // FILE validations
    if (data.datasetType === "FILE") {
      if (!data.datasetName?.trim()) {
        ctx.addIssue({ code: "custom", message: "File Path required", path: ["datasetName"] });
      }
    }
  });

/* ----------------------------- ADD RULE VALIDATION SCHEMA ----------------------------- */

/**
 * Zod schema for validating rule configuration.
 *
 * Example (Completeness – column level):
 * {
 *   ruleCategory: "data_profiling",
 *   ruleType: "completeness",
 *   ruleName: "completeness_check",
 *   datasetType: "TABLE",
 *   targetColumn: "customer_id",
 *   ruleValue: "NULL,EMPTY",
 *   receiverAlertEmail: "dq-alerts@teva.com",
 *   runFrequency: "Daily"
 * }
 *
 * Example (Data Drift):
 * {
 *   ruleCategory: "data_drift",
 *   ruleType: "psi",
 *   ruleName: "psi_numerical",
 *   datasetType: "TABLE",
 *   targetColumn: "Enter Selective Columns",
 *   selectColumns: "sales,quantity",
 *   receiverAlertId: "DRIFT_SALES_001",
 *   runFrequency: "Weekly"
 * }
 */
export const addRuleSchema = z
  .object({
    /**
     * High-level rule category
     */
    ruleCategory: z.string().min(1, "Rule Category required"),

    /**
     * Rule type within the category
     * Example: completeness, freshness, validity, psi
     */
    ruleType: z.string().min(1, "Rule Type required"),

    /**
     * Specific rule name or implementation identifier
     * Example: completeness_check, range_check, format_check
     */
    ruleName: z.string().min(1, "Rule Name required"),

    /**
     * Dataset type associated with the rule
     * Example: TABLE, VIEW, FILE
     */
    datasetType: z.string().optional(),

    /**
     * Column on which the rule is applied
     * Required for most TABLE / VIEW rules
     */
    targetColumn: z.string().optional(),

    /**
     * Rule-specific value
     * Examples:
     *  - "NULL,EMPTY"
     *  - "YYYY-MM-DD"
     *  - "True"
     */
    ruleValue: z.string().optional(),

    /**
     * Pattern or format used for validation
     * Examples:
     *  - Regex
     *  - Sample value
     *  - Date format
     */
    dataPattern: z.string().optional(),

    /**
     * Flag indicating whether the target column is a date column
     */
    isDateColumn: z.enum(["True", "False"]).optional(),

    /**
     * Used when user selects "Enter Selective Columns"
     * Example: "col1,col2,col3"
     */
    selectColumns: z.string().optional(),

    /**
     * Alert email for metadata and profiling rules
     */
    receiverAlertEmail: z.string().optional(),

    /**
     * Alert identifier for data drift rules
     */
    receiverAlertId: z.string().optional(),

    /**
     * Rule execution frequency
     * Example: Daily, Weekly, Monthly
     */
    runFrequency: z.string(),

    /**
     * Optional warning threshold
     */
    ruleWarningThreshold: z.string().optional(),

    /**
     * Optional critical threshold
     */
    ruleCriticalThreshold: z.string().optional(),

    /**
     * Baseline value for comparison (mainly for drift rules)
     */
    baselineValue: z.string().optional()
  })
  .superRefine((data, ctx) => {
    /**
     * Cross-field conditional validation logic
     * driven by category, rule type, and dataset type.
     */

    const { ruleCategory, ruleType, ruleName, ruleValue, datasetType } = data;
    const isFileType = datasetType === "FILE";

    /* -------- Metadata Rules -------- */
    if (ruleCategory === "metadata") {
      if (["freshness"].includes(ruleType) || (ruleType === "timeliness" && datasetType!=="TABLE")) {
        if (!isFileType && !data.targetColumn?.trim())
          ctx.addIssue({ code: "custom", message: "Date Column required", path: ["targetColumn"] });
        if (!data.ruleValue?.trim())
          ctx.addIssue({ code: "custom", message: "Date Format required", path: ["ruleValue"] });
      }

      /* -------- Data Profiling Rules -------- */
    } else if (ruleCategory === "data_profiling") {

      if (ruleType === "completeness") {
        if (["completeness_check", "dataset_completeness_check"].includes(ruleName)) {
          if (!isFileType && !data.targetColumn?.trim())
            ctx.addIssue({ code: "custom", message: "Column Name required", path: ["targetColumn"] });
        }
      }

      if ((ruleType === "uniqueness" && !ruleName.includes("row_level")) || ruleType === "numeric") {
        if (!isFileType && !data.targetColumn?.trim())
          ctx.addIssue({ code: "custom", message: "Column Name required", path: ["targetColumn"] });
      }

      if (ruleType === "validity" && ruleName === "range_check") {
        if (!isFileType && !data.targetColumn?.trim())
          ctx.addIssue({ code: "custom", message: "Column Name required", path: ["targetColumn"] });
        if (data.ruleValue === "True" && !data.dataPattern?.trim())
          ctx.addIssue({ code: "custom", message: "Date Format required", path: ["dataPattern"] });
      }

      if (ruleType === "format" && ruleName === "format_check") {
        if (!isFileType && !data.targetColumn?.trim())
          ctx.addIssue({ code: "custom", message: "Column Name required", path: ["targetColumn"] });
        if (["Date Format", "Sample Value", "Custom Pattern"].includes(ruleValue ?? "")) {
          if (!data.dataPattern?.trim())
            ctx.addIssue({
              code: "custom",
              message: `${ruleValue} value required`,
              path: ["dataPattern"],
            });
        }
      }

      if (ruleType === "consistency") {
        if (!isFileType && !data.targetColumn?.trim())
          ctx.addIssue({ code: "custom", message: "Column Name required", path: ["targetColumn"] });
        if (!data.ruleValue?.trim())
          ctx.addIssue({ code: "custom", message: "Valid values required", path: ["ruleValue"] });
      }

      /* -------- Data Drift Rules -------- */
    } else if (ruleCategory === "data_drift") {

      if (!data.targetColumn?.trim())
        ctx.addIssue({ code: "custom", message: "Target Column selection required", path: ["targetColumn"] });

      if (data.targetColumn === "Enter Selective Columns" && !data.selectColumns?.trim()) {
        ctx.addIssue({ code: "custom", message: "Select at least one column", path: ["selectColumns"] });
      }
    }

    /* -------- Receiver Validation -------- */
    if (ruleCategory === "data_drift") {
      if (!data.receiverAlertId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Receiver Alert ID required",
          path: ["receiverAlertId"]
        });
      }
    } else {
      if (!data.receiverAlertEmail?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Receiver Alert Email required",
          path: ["receiverAlertEmail"]
        });
      }
    }

    /* -------- Run Frequency -------- */
    if (!data.runFrequency?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Run Frequency required",
        path: ["runFrequency"]
      });
    }
  });

/**
 * Schema for validating the update request to modify a rule.
 * This schema defines the structure of the update request, ensuring the `selectColumn` and `updatedValue` are strings.
 */
export const ruleUpdateSchema = z
  .object({
    selectColumn: z.string(), // `selectColumn` must be a string representing the column being updated.
    updatedValue: z.string().optional(), // `updatedValue` must be a string representing the new value for the column.
  })

/* ----------------------------- ADD KPI CONFIG VALIDATION SCHEMA ----------------------------- */

/**
 * Zod schema for validating KPI configuration.
 *
 * Example (Automatic threshold):
 * {
 *   brand: "Oncology",
 *   kpi: "Sales Growth",
 *   source: "sales_fact",
 *   vendor: "Internal",
 *   dataDomain: "Sales",
 *   kpiUniqueIdentifier: "ONC_SALES_GROWTH",
 *   kpiUniqueIdentifierValue: "AUSTEDO BID TD",
 *   kpiFormat: "Percentage",
 *   calculationMethod: "YoY Growth",
 *   thresholdDerivationType: "Automatic",
 *   thresholdDerivationMethod: "StdDeviation",
 *   thresholdLookbackValue: "90",
 *   receiverAlertEmail: "kpi-alerts@teva.com",
 *   runFrequency: "Monthly"
 * }
 *
 * Example (Manual threshold):
 * {
 *   thresholdDerivationType: "Manual",
 *   alertThreshold: "5"
 * }
 */
export const addKPIConfigSchema = z.object({
  brand: z.string().min(1, "Brand Name is required"),
  kpi: z.string().min(1, "KPI Name is required"),
  source: z.string().min(1, "Data Source is required"),
  vendor: z.string().min(1, "Data Vendor is required"),
  catalogName: z.string().min(1, "Catalog Name is required"),
  schemaName: z.string().min(1, "Schema Name is required"),
  datasetName: z.string().min(1, "Dataset Name is required"),
  dataDomain: z.string().min(1, "Data Domain is required"),
  kpiUniqueIdentifier: z.string().min(1, "KPI Unique Identifier is required"),
  kpiUniqueIdentifierValue: z.string().min(1, "KPI Unique Identifier Value is required"),
  kpiFormat: z.string().min(1, "KPI Format is required"),
  calculationMethod: z.string().min(1, "Calculation Method is required"),
  thresholdDerivationType: z.string().min(1, "Threshold Derivation Type is required"),
  thresholdDerivationMethod: z.string().optional(),
  alertThreshold: z.string().optional(),
  thresholdLookbackValue: z.string().optional(),
  receiverAlertEmail: z.string().min(1, "Receiver Alert Email is required"),
  runFrequency: z.string().min(1, "Frequency is required"),
}).superRefine((data, ctx) => {

  /**
   * Threshold derivation validation:
   *  - Automatic → method + lookback required
   *  - Manual    → alertThreshold required
   */

  if (data.thresholdDerivationType === 'Automatic') {
    if (!data.thresholdDerivationMethod)
      ctx.addIssue({ code: "custom", message: "Threshold Derivation Method is required", path: ["thresholdDerivationMethod"] });
    if (!data.thresholdDerivationMethod?.trim())
      ctx.addIssue({ code: "custom", message: "Threshold Lookback Value is required", path: ["thresholdLookbackValue"] });
  } else if (data.thresholdDerivationType === 'Manual') {
    if (!data.alertThreshold?.trim())
      ctx.addIssue({ code: "custom", message: "Alert Threshold is required", path: ["alertThreshold"] });
  }
});

/* ----------------------------- INFERRED TYPES ----------------------------- */

/**
 * Type inferred from registerDatasetSchema
 * Used by dataset registration forms and APIs
 */
export type RegisterDatasetFormData = z.infer<typeof registerDatasetSchema>;

/**
 * Type inferred from addRuleSchema
 * Represents a validated rule configuration payload
 */
export type AddRuleFormData = z.infer<typeof addRuleSchema>;

/**
 * Type inferred from addKPIConfigSchema
 * Represents a validated KPI configuration payload
 */
export type AddKPIConfigFormData = z.infer<typeof addKPIConfigSchema>;


/**
 * Type definition for the inferred values from the `ruleUpdateSchema`.
 * This type is used to ensure that the data passed for updating a rule conforms to the schema.
 *
 * @type {RuleUpdateValues}
 */
export type RuleUpdateValues = z.infer<typeof ruleUpdateSchema>; // Infer the type from the schema for better type safety.