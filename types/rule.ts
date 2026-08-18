/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026
  Purpose of the script:
    This script defines TypeScript types and interfaces for handling dataset registration, rule configuration, and rule suggestions.
    - It includes data structures for registering datasets, creating new rules, and suggesting rule patterns for data quality checks.
    - These types help ensure that the data passed through the application is properly structured for both registering new datasets and rules, as well as suggesting rules based on data profiling.
    - They represent various aspects of data validation, including business unit association, dataset metadata, and specific rule criteria for data quality monitoring.
*/

// Dataset interface defines the structure of a dataset, including metadata like business unit, catalog, schema, dataset name, and rule count.
export interface Dataset {
  L1_BUSINESS_UNIT: string; // The high-level business unit associated with the dataset (e.g., "Finance", "Sales")
  CATALOG_NAME: string; // The catalog name to which the dataset belongs (e.g., "Catalog_1")
  SCHEMA_NAME: string; // The schema name in the dataset (e.g., "Schema_ABC")
  DATASET_NAME: string; // The name of the dataset (e.g., "Dataset_X")
  DATASET_TYPE: string; // The type of dataset (e.g., "TABLE", "VIEW", "FILE")
  rule_count: number; // The total number of rules associated with this dataset
}

// DatasetMetadata interface contains metadata for a dataset, including the total rule count, row-level rule count, and column details.
export interface DatasetMetadata {
  total_rule_count: number; // The total number of rules applied to the entire dataset
  row_rule_count: number; // The number of rules applied at the row level
  columns_details: Column[]; // A list of columns in the dataset along with their rule details
  dataset_type: string; // The type of dataset (e.g., "TABLE", "VIEW", "FILE")
}

// Column interface defines the structure for column-level information within a dataset, including column name, data type, comments, and rule count.
export interface Column {
  column_name: string; // The name of the column (e.g., "customer_id")
  data_type: string; // The data type of the column (e.g., "STRING", "INTEGER")
  comment?: string; // Optional comment describing the column (e.g., "Customer Identifier")
  rule_count: number; // The number of rules associated with this column
}

// Rule interface defines the structure for a specific rule applied to a dataset, including rule type, category, threshold values, and alert configurations.
export interface Rule {
  CONFIG_ID?: string; // Optional configuration ID for the rule
  L1_BUSINESS_UNIT: string; // The high-level business unit that owns the rule (e.g., "Finance", "HR")
  DATASET_TYPE?: "TABLE" | "VIEW" | "FILE"; // The type of dataset to which the rule applies (e.g., "TABLE")
  CATALOG_NAME: string; // The catalog name associated with the dataset
  SCHEMA_NAME: string; // The schema name associated with the dataset
  DATASET_NAME: string; // The name of the dataset to which the rule applies
  PIPELINE_NAME?: string | null; // Optional pipeline name associated with the rule
  RULE_CATEGORY: string; // The category of the rule (e.g., "data integrity", "format check")
  RULE_TYPE: string; // The type of rule (e.g., "null check", "range check")
  RULE_NAME: string; // The name of the rule (e.g., "Check Null Values")
  TARGET_COLUMN: string | null; // The target column to which the rule is applied (null if no specific column)
  RULE_WARNING_THRESHOLD?: number | null; // Optional warning threshold for the rule
  RULE_CRITICAL_THRESHOLD?: number | null; // Optional critical threshold for the rule
  THRESHOLD_UNIT?: string | null; // The unit of the threshold (e.g., "percentage", "count")
  THRESHOLD_LOOKBACK_VALUE?: number | null; // The lookback value for threshold checks (e.g., "30" for the last 30 days)
  THRESHOLD_LOOKBACK_UNIT?: string | null; // The unit for the lookback value (e.g., "days", "hours")
  THRESHOLD_DERIVATION_TYPE?: string | null; // Optional derivation type for threshold (e.g., "average", "sum")
  RULE_VALUE: string | number | null; // The value for the rule (e.g., "100", "null")
  BASELINE_VALUE?: number | null; // The baseline value for comparison (if applicable)
  BASELINE_LOOKBACK_VALUE?: number | null; // The lookback value for baseline (if applicable)
  BASELINE_LOOKBACK_UNIT?: string | null; // The unit for baseline lookback (if applicable)
  BASELINE_DERIVATION_TYPE?: string | null; // Optional derivation type for baseline (if applicable)
  ALERT_FLAG?: boolean; // Optional flag indicating whether alerts are enabled for this rule
  RECEIVER_ALERT_ID: string | null; // The receiver alert ID (e.g., "alert_12345")
  ENABLED?: boolean; // Optional flag to enable or disable the rule
  RUN_FREQUENCY: string; // The frequency at which the rule runs (e.g., "daily", "weekly")
  CREATED_BY?: string; // The user who created the rule
  CREATED_AT?: string; // The ISO timestamp when the rule was created
  UPDATED_BY?: string; // The user who last updated the rule
  UPDATED_AT?: string; // The ISO timestamp when the rule was last updated
}

// Alert interface defines the structure for alert configuration, including distribution list and alert ID.
export interface Alert {
  RECEIVER_ALERT_ID: string; // The unique identifier for the alert
  DISTRIBUTION_LIST: string; // A list of recipients who will receive the alert (e.g., "email@example.com")
}

// RegisterDataset interface is used to capture the essential information when registering a new dataset into the system.
// It includes metadata about the dataset like business unit, dataset type, catalog name, schema name, and dataset name.
export interface RegisterDataset {
  businessUnit: string; // The business unit associated with the dataset (e.g., "Finance", "Marketing")
  datasetType: string; // The type of dataset being registered (e.g., "TABLE", "VIEW", "FILE")
  catalogName?: string; // The catalog name to which the dataset belongs (e.g., "Catalog_1")
  schemaName?: string; // The schema name for the dataset (e.g., "Schema_X")
  datasetName: string; // The name of the dataset being registered (e.g., "Dataset_A")
}

// NewRule interface defines the structure for a new rule that can be added to a dataset for validation.
// It includes details like the business unit, dataset metadata, rule category, and the various rule parameters for execution.
export interface NewRule {
  configId?: string; // Optional configuration ID for the rule
  selectColumn?: string; // Optional specific column to which the rule will be applied (e.g., "customer_id")
  updatedValue?: string; // The updated value for the rule (if applicable)
  businessUnit?: string; // The business unit associated with the rule (e.g., "Finance", "Sales")
  datasetType?: string; // The type of dataset the rule is applied to (e.g., "TABLE", "VIEW")
  catalogName?: string; // The catalog name of the dataset
  schemaName?: string; // The schema name of the dataset
  datasetName?: string; // The name of the dataset
  ruleCategory?: string; // The category of the rule (e.g., "data quality", "range check")
  ruleType?: string; // The type of rule (e.g., "null check", "range check")
  ruleName?: string; // The name of the rule (e.g., "Check Null Values")
  targetColumn?: string; // The target column where the rule is applied (e.g., "age", "email")
  ruleValue?: string; // The value the rule is checking for (e.g., "null", "greater than 100")
  dataPattern?: string; // Optional pattern for data validation (e.g., "^[A-Za-z0-9]+$")
  runFrequency?: string; // The frequency at which the rule should run (e.g., "daily", "weekly")
  receiverAlertEmail?: string; // The email address that should receive alerts for this rule (optional)
  receiverAlertId?: string; // The alert ID to send the notifications to
  selectColumns?: string; // Optional columns to select in the rule (if multiple columns are involved)
  ruleWarningThreshold?: number; // The warning threshold for the rule (e.g., "10", "20%")
  ruleCriticalThreshold?: number; // The critical threshold for the rule (e.g., "30", "50%")
  baselineValue?: number; // The baseline value for comparison (if applicable)
}

// SuggestRules interface defines the structure for suggesting rules based on certain data profiling aspects.
// It includes metadata about data profiling, such as completeness, uniqueness, and format, and the associated values for these attributes.
export interface SuggestRules {
  key_name: string; // The key name for which the rule is being suggested (e.g., "email", "customer_id")
  value_map: {
    metadata?: { // Optional metadata that suggests rules based on various characteristics of the dataset
      volume?: string[]; // Optional list of possible values related to the volume of data (e.g., ["low", "medium", "high"])
      freshness?: string[]; // Optional list of values related to data freshness (e.g., ["stale", "fresh"])
      timeliness?: string[]; // Optional list of values related to data timeliness (e.g., ["on time", "delayed"])
      format?: string[]; // Optional list of values related to data format (e.g., ["valid", "invalid"])
    };
    data_profiling?: { // Optional data profiling rules that help in quality checks
      completeness?: string[]; // Optional completeness rules (e.g., ["complete", "incomplete"])
      uniqueness?: string[]; // Optional uniqueness rules (e.g., ["unique", "duplicate"])
      validity?: string[]; // Optional validity rules (e.g., ["valid", "invalid"])
      consistency?: string[]; // Optional consistency rules (e.g., ["consistent", "inconsistent"])
      format?: string[]; // Optional format rules (e.g., ["correct format", "incorrect format"])
      numeric?: string[]; // Optional numeric value rules (e.g., ["positive", "negative"])
    };
  };
}


/**
 * `KPIConfiguration` defines the structure of a KPI (Key Performance Indicator) configuration in the system.
 * This interface includes various attributes that describe how a specific KPI is calculated, validated, 
 * and monitored, as well as the necessary details for alerting, thresholds, and metadata related to the KPI.
 * It is used to configure how KPIs are tracked and validated within the system.
 */
export interface KPIConfiguration {
  CONFIG_ID: string; // Unique identifier for the KPI configuration (e.g., "kpi_12345")
  CATALOG_NAME: string; // The catalog name where the KPI dataset is stored (e.g., "main_catalog")
  SCHEMA_NAME: string; // The schema within the catalog containing the dataset (e.g., "sales_schema")
  DATASET_NAME: string; // The name of the dataset related to the KPI (e.g., "monthly_sales_data")
  BRAND: string; // The brand associated with the KPI (e.g., "BrandA")
  DATA_VENDOR: string; // The data vendor providing the dataset (e.g., "vendorX")
  DATA_SOURCE: string; // The source from which the data originates (e.g., "internal", "external")
  DATA_DOMAIN: string; // The domain of the data (e.g., "sales", "marketing")
  KPI_NAME: string; // The name of the KPI (e.g., "sales_growth")
  KPI_UNIQUE_IDENTIFIER: string | null; // An optional unique identifier for the KPI (e.g., "region")
  KPI_UNIQUE_IDENTIFIER_VALUE: string | null; // The value for the unique identifier (e.g., "north")
  OWNER_EMAIL: string; // The email of the owner responsible for the KPI configuration (e.g., "owner@example.com")
  CALCULATION_METHOD: string; // The method used to calculate the KPI (e.g., "average", "sum")
  VALIDATION_TYPE: string; // The type of validation applied to the KPI (e.g., "range_check", "unique_check")
  TARGET_COLUMN: string; // The target column in the dataset to track for the KPI (e.g., "revenue")
  KPI_FORMAT: string; // The format of the KPI value (e.g., "percentage", "currency")
  ALERT_THRESHOLD: string; // The threshold for triggering alerts when the KPI value is exceeded (e.g., "80%")
  ALERT_THRESHOLD_UNIT: string; // The unit of the threshold for the alert (e.g., "percentage", "dollars")
  THRESHOLD_LOOKBACK_VALUE: number; // The value used for historical lookback to calculate threshold violations (e.g., "3 months")
  THRESHOLD_DERIVATION_METHOD: string; // The method used to derive the threshold (e.g., "static", "dynamic")
  THRESHOLD_DERIVATION_FORMULA: string; // The formula used to derive the threshold value (e.g., "average + 10%")
  THRESHOLD_DERIVATION_TYPE: string; // The type of threshold derivation (e.g., "percent", "absolute")
  ALERT_FLAG: boolean; // Flag indicating whether alerts are enabled for this KPI (e.g., true for enabled, false for disabled)
  RECEIVER_ALERT_ID: string | null; // An optional ID representing the receiver of the alerts (e.g., "receiver_123"), or null if no alert is set
  ENABLED: boolean; // Flag to indicate if the KPI configuration is active (e.g., true for active, false for inactive)
  RUN_FREQUENCY: string; // The frequency at which the KPI should be calculated (e.g., "daily", "weekly")
  CREATED_BY: string; // The user who created the KPI configuration (e.g., "admin@example.com")
  CREATED_AT: string; // ISO 8601 format date representing when the KPI configuration was created (e.g., "2025-01-01T12:00:00Z")
  UPDATED_BY: string; // The user who last updated the KPI configuration (e.g., "manager@example.com")
  UPDATED_AT: string; // ISO 8601 format date representing when the KPI configuration was last updated (e.g., "2025-02-01T15:00:00Z")
}


/**
 * `KPIConfigurationFilters` defines the structure for filtering available KPI configurations.
 * This interface is used to retrieve or filter KPIs based on various parameters such as brand, 
 * vendor, KPI name, and frequency. It enables users to search or filter KPIs based on their metadata.
 */
export interface KPIConfigurationFilters {
  BRANDS: string[]; // A list of available brands for filtering KPIs (e.g., ["BrandA", "BrandB"])
  DATA_VENDORS: string[]; // A list of available data vendors for filtering KPIs (e.g., ["vendorX", "vendorY"])
  KPI_NAMES: string[]; // A list of available KPI names for filtering (e.g., ["sales_growth", "customer_satisfaction"])
  KPI_UNIQUE_IDENTIFIERS: string[]; // A list of available unique identifiers for filtering (e.g., ["region", "product_type"])
  KPI_UNIQUE_IDENTIFIER_VALUES: string[]; // A list of possible values for the unique identifiers (e.g., ["north", "south"])
  RUN_FREQUENCIES: string[]; // A list of available run frequencies for filtering KPIs (e.g., ["daily", "monthly"])
  CATALOG_NAMES: string[]; // A list of available catalog names for filtering KPIs (e.g., ["dset_dev", "dset_prod"])
  DATA_SOURCES: string[]; // A list of available data sources for filtering KPIs (e.g., ["Valuetrak_852", "ConcertAI"])
  KPI_FORMATS: string[]; // A list of available KPI formats for filtering KPIs (e.g., ["Decimal", "Actual"])
}
