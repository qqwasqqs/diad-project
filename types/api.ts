/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script defines TypeScript types and interfaces for handling different aspects of the Teva Data Integrity Automation Dashboard.
    - It includes data structures for user information, quality metrics, KPI highlights, and dataset details.
    - These types help ensure that data passed through the application is correctly structured and typed, enhancing consistency and reducing errors.
    - They represent various business-related entities like datasets, rules, KPIs, and dashboards to display accurate performance metrics and quality scores.
    - The script also helps manage data from multiple sources, track user activities, and provide relevant insights into data health and quality.

*/

// The `MeResponse` type defines the structure of the user authentication data, which includes information about the user's authentication provider, user ID, claims, and optional tokens.
export type MeResponse = Array<{
  provider_name: string; // The name of the provider used for authentication (e.g., "Google", "Azure")
  user_id: string; // Unique identifier for the user (e.g., "user123")
  user_claims: Array<{ typ: string; val: string }>; // A list of user claims (attributes), like roles or permissions
  access_token?: string; // The access token (optional) for authorizing API calls
  id_token?: string; // The ID token (optional) containing information about the user
  expires_on?: string; // The expiration time of the token in ISO string format
}>;

// CurrentUserResponse is the safe response returned by GET /api/me.
// Example: the UI can show the user's name and decide what buttons to display from permissions.
export interface CurrentUserResponse {
  principal: {
    id: string; // Main EasyAuth/Azure identity id, for example an Azure object id.
    email?: string; // User email, for example "radhe@company.com".
    displayName?: string; // Friendly user name, for example "Radhe Tiwari".
    azureOid?: string; // Azure object id used to match the user with Azure AD.
    provider?: string; // Authentication provider, for example "aad" for Azure Active Directory.
    source: "easyauth" | "local-env"; // Shows whether identity came from EasyAuth or the local .env file.
    roles: string[]; // Roles supplied by EasyAuth, if any.
    claimTypes: string[]; // Names of EasyAuth claims returned without exposing token values.
  };
  user: {
    userId?: string; // Dashboard user id from dashboard_users.
    email?: string; // Email after dashboard RBAC lookup.
    displayName?: string; // Display name after dashboard RBAC lookup.
    azureOid?: string; // Azure object id after dashboard RBAC lookup.
    groups: Array<{ groupId: string; groupName?: string }>; // RBAC groups, for example "Data Stewards".
    roles: Array<{ roleId: string; roleName?: string }>; // RBAC roles, for example "DQ Viewer".
    permissions: string[]; // Effective permissions, for example ["data-quality-dashboard:read"].
    scopes: Array<{ type: string; value: string }>; // Effective scopes, for example { type: "brand", value: "US" }.
    isSuperAdmin: boolean; // True only when marked in the RBAC database configuration.
  };
}

// DashboardModule is one navigation/dashboard module the current user is allowed to see.
// Example: "Data Quality Dashboard" appears only when its required permissions match the user.
export interface DashboardModule {
  moduleId: string; // Stable module id from Databricks, for example "dq-dashboard".
  moduleSlug: string; // Route-friendly name, for example "data-quality-dashboard".
  displayName: string; // Label shown to people in the UI, for example "Data Quality Dashboard".
  iconPath?: string; // Optional icon path, for example "/icons/data-quality.svg".
  requiredPermissions: string[]; // Permissions configured for this module.
  requireAll: boolean; // true means all permissions are needed; false means any one is enough.
  sortOrder: number; // Number used to order modules in the side navigation.
  matchedPermissions: string[]; // Required permissions the current user actually has.
}

// DashboardModulesResponse is returned by GET /api/dashboard-modules.
// Example: modules contains only visible modules, while totalModules helps debugging/admin checks.
export interface DashboardModulesResponse {
  modules: DashboardModule[]; // Filtered list of modules visible to the logged-in user.
  totalModules: number; // Total active modules found in Databricks before filtering.
  visibleModules: number; // Number of modules returned after permission filtering.
}

// DataQualityHighlight is used to track and report data quality metrics for the dashboard, specifically datasets' validation and execution statistics.
export interface DataQualityHighlight {
  total_datasets: number; // The total number of datasets being tracked
  validated_datasets: number; // The number of datasets that have passed validation
  successfully_validated_datasets: number;
  failed_datasets: number; // The number of datasets that failed validation
  validated_datasets_percentage: string; // The percentage of validated datasets
  non_validated_datasets: number; // The number of datasets that haven't been validated yet
  non_validated_datasets_percentage: string; // The percentage of non-validated datasets
  total_rules_executed: number; // The total number of rules that have been executed across datasets
  failed_rules_count: number; // The number of rules that failed execution
  passed_rules_count: number; // The number of rules that passed execution
  most_failed_rule_name: string; // The name of the rule that failed the most
  most_failed_rule_type: string; // The type of the most failed rule (e.g., "format", "null check")
  overall_quality_score: number; // The overall score representing the data quality across datasets
}

// KPIExecutiveDashboardHighlight tracks key performance indicators (KPIs) for the executive dashboard, reporting how many KPIs are validated or failed.
export interface KPIExecutiveDashboardHighlight {
  total_KPIs: number; // Total number of KPIs being tracked
  validated_KPIs: number; // Number of KPIs that have passed validation
  successfully_validated_KPIs: number; // Number of KPIs that have been successfully validated
  non_validated_KPIs: number; // Number of KPIs that haven't been validated yet
  failed_KPIs: number; // Number of KPIs that failed validation
  passed_KPIs: number; // Number of KPIs that passed validation
  validated_KPIs_percentage: string; // The percentage of KPIs that are validated
  non_validated_KPIs_percentage: string; // The percentage of KPIs that aren't validated
  overall_KPIs_score: number; // The overall score representing the status of KPIs
  most_failed_KPI_brand: string; // The brand associated with the most failed KPIs
}

// ExecutiveDashboardHighlights groups both the quality and KPI highlights, providing a snapshot of overall performance.
export interface ExecutiveDashboardHighlights {
  qualityHighlights: DataQualityHighlight; // Data quality statistics for the dashboard
  kpiHighlights: KPIExecutiveDashboardHighlight; // KPI statistics for the dashboard
}

// Highlights represents high-level data metrics for the Data Quality Dashboard, focusing on dataset validation and failure rates.
export interface Highlights {
  total_datasets: number; // Total number of datasets being tracked
  total_datasets_percentage: string; // The percentage of total datasets in relation to a baseline or target
  validated_datasets: number; // The number of validated datasets
  validated_datasets_percentage: string; // The percentage of datasets that have been validated
  passed_datasets: number; // The number of datasets that passed all validation checks
  passed_datasets_percentage: string; // The percentage of datasets that passed validation
  failed_datasets: number; // The number of datasets that failed validation
  failed_datasets_percentage: string; // The percentage of datasets that failed validation
}

// BusinessUnit defines data for a specific business unit, including the number of datasets in that unit, both validated and non-validated.
export interface BusinessUnit {
  L1_BUSINESS_UNIT: string; // The name of the business unit (e.g., "Marketing", "Finance")
  Total_Datasets: number; // Total number of datasets in the business unit
  Validated_Datasets: number; // Number of validated datasets in the business unit
  Non_Validated_Datasets: number; // Number of non-validated datasets in the business unit
}

// SummaryView represents a summary of the data quality for all business units, including the high-level metrics and individual business unit performance.
export interface SummaryView {
  highlights: Highlights; // High-level data quality statistics for the entire organization
  businessUnits: BusinessUnit[]; // A list of business units and their dataset metrics
}

// BusinessUnitName captures just the name of a business unit, which can be used for filtering or referencing specific units.
export interface BusinessUnitName {
  L1_BUSINESS_UNIT: string; // The name of the business unit (e.g., "HR")
}

// RuleCategoryFailed tracks the details of rule failures by category, helping to identify problematic areas within datasets.
export interface RuleCategoryFailed {
  rule_category: string; // The category of the rule (e.g., "Data Drift", "Metadata")
  distinct_dataset_count: number; // The number of datasets that failed due to this rule category
  unique_dataset_names: string; // A list of unique dataset names that failed in this rule category
}

// BusinessUnitSummary provides detailed insights into the health of datasets within each business unit, including rule failures.
export interface BusinessUnitSummary {
  highlights: Highlights; // High-level data quality metrics for the business unit
  rulewiseFailureDatasets: RuleCategoryFailed[]; // Rule failures categorized by type for each dataset
}

// BusinessUnitHealth defines the health of datasets within a specific business unit, including the pass/fail status of each run.
export interface BusinessUnitHealth {
  CATALOG_NAME: string; // The name of the catalog in which the dataset resides
  SCHEMA_NAME: string; // The name of the schema in the catalog
  DATASET_NAME: string; // The name of the dataset (e.g., "sales_data")
  L1_NAME: string; // The level 1 business unit to which the dataset belongs
  PERCENT_PASSED_RUNS: string; // The percentage of successful validation runs for the dataset
  TOTAL_RUNS: number; // Total number of runs performed on the dataset
  successful_runs: number; // Number of successful validation runs
  failed_runs: number; // Number of failed validation runs
  LAST_RUN_STATUS: "Succeeded" | "Failed" | string; // The status of the most recent run (either "Succeeded" or "Failed")
}

// RuleCategoryName represents a single rule category for use in reports or filters.
export interface RuleCategoryName {
  RULE_CATEGORY: string; // The name of the rule category (e.g., "data_drift", "metadata")
}

// RuleNameFailed tracks failed rule instances within a specific category, helping to identify problematic rules.
export interface RuleNameFailed {
  RULE_NAME: string; // The name of the rule that failed (e.g., "null_check", "data_format")
  distinct_dataset_count: number; // The number of distinct datasets that failed this rule
  unique_dataset_names: string; // A list of dataset names that failed the rule
}

// FailedDataset contains details about a dataset that failed validation, including the specific rules that caused the failure.
export interface FailedDataset {
  CATALOG_NAME: string; // The name of the catalog in which the dataset resides
  DATASET_NAME: string; // The name of the dataset (e.g., "customer_data")
  SCHEMA_NAME: string; // The schema name within the catalog where the dataset is located
  failed_rules_count: number; // The total number of rules that failed for this dataset
  failed_rule_names: string; // A comma-separated list of rule names that failed for this dataset
}

// RuleCategorySummary provides insights into the failures for a specific rule category, including failed datasets and specific rules.
export interface RuleCategorySummary {
  highlights: Highlights; // High-level data quality metrics for the rule category
  rulewiseFailedDatasets: RuleNameFailed[]; // Detailed information about specific rules that failed within the category
  topFiveFailedDatasets: FailedDataset[]; // The top 5 datasets that failed the most within the rule category
}

// DatasetRefresh represents the status of a dataset refresh, including whether the refresh was successful.
export interface DatasetRefresh {
  L1_BUSINESS_UNIT: string; // The business unit responsible for the dataset (e.g., "Marketing")
  RULE_CATEGORY: string; // The category of rule for which the dataset is being refreshed (e.g., "data_drift")
  dataset_name: string; // The name of the dataset being refreshed (e.g., "sales_data")
  refresh_status: string; // The status of the refresh (e.g., "success", "failed")
  timestamp: string; // The timestamp when the refresh was attempted (ISO string format)
}

// DataRefresh tracks the overall status of dataset refreshes, including the number of datasets refreshed or pending.
export interface DataRefresh {
  unrefreshed_datasets: number; // The number of datasets that have not been refreshed
  refreshed_datasets: number; // The number of datasets that were successfully refreshed
  last_refresh_timestamp: string; // The timestamp of the most recent dataset refresh
  datasets: DatasetRefresh[]; // A list of individual dataset refresh statuses
}

export interface DataRefreshTrendDetails {
  date: Date; // date of the refresh run
  unrefreshed_count: number; // number of unrefreshed datasets
}

// RuleDetails provides detailed information about a specific rule applied to a dataset, including the rule's threshold, result, and alert conditions.
export interface RuleDetails {
  RULE_NAME: string; // The name of the rule (e.g., "null_check", "range_check")
  RULE_TYPE: string; // The type of the rule (e.g., "validation", "profiling")
  TARGET_COLUMN: string; // The column in the dataset that the rule is applied to (e.g., "age", "income")
  RESULT_VALUE: string; // The result value of the rule (e.g., "PASS", "FAIL")
  RESULT_STATUS: string; // The status of the rule execution (e.g., "Passed", "Failed")
  ALERT_THRESHOLD: string; // The threshold value for triggering an alert (e.g., "greater than 100")
  BASELINE_VALUE: string; // The baseline value for comparison (e.g., "mean", "previous value")
  RULE_DETAILS: string; // A detailed description of what the rule checks for
}

// DatasetRuleTypes represents the different rule types applied to each dataset, helping categorize rules for better reporting.
export interface DatasetRuleTypes {
  dataset_name: string; // The name of the dataset (e.g., "sales_data")
  RULE_TYPE: string; // The type of rule applied to the dataset (e.g., "metadata", "data_drift")
}

// DatasetDetails tracks additional details about a dataset, such as the rules applied, alert types, and rule status.
export interface DatasetDetails {
  ALERT_TYPE: string; // The type of alert triggered (e.g., "warning", "critical")
  COLUMN_NAME: string; // The column in the dataset where the issue occurred (e.g., "price")
  DETAILS: string; // A detailed description of the dataset issue (e.g., "Value exceeds threshold")
  RULE_NAME: string; // The rule that caused the issue (e.g., "outlier_check")
  RULE_TYPE: string; // The type of rule (e.g., "range_check")
}

// DQDFilter is used to filter datasets by catalog, schema, and dataset name to track specific data issues.
export interface DQDFilter {
  CATALOG_NAME: string; // The name of the catalog (e.g., "Sales", "HR")
  SCHEMA_NAME: string; // The schema name within the catalog (e.g., "customer_info")
  DATASET_NAME: string; // The dataset name to filter by (e.g., "sales_data")
}

// DatasetsImpacted tracks the impact of data issues on specific entities, such as brands or KPIs.
export interface DatasetsImpacted {
  IMPACTED_ENTITY_NAME: string; // The name of the impacted entity (e.g., "Brand A")
  IMPACTED_ENTITY_TYPE: string; // The type of entity (e.g., "Brand", "KPI")
}

// DatasetMetadata represents the metadata of a dataset column, providing details like the column name, its data type, and any comments.
export interface DatasetMetadata {
  col_name: string; // The name of the column in the dataset (e.g., "age", "transaction_date")
  comment: string; // A comment or description of the column (e.g., "Customer age")
  data_type: string; // The data type of the column (e.g., "string", "integer", "date")
}

// OverviewHighlights provides a high-level overview of dataset properties, such as the number of columns and rows, and the schema owner.
export interface OverviewHighlights {
  column_count: number; // The total number of columns in the dataset
  row_count: number; // The total number of rows in the dataset
  schema_owner: string; // The owner of the schema (e.g., "Data Team")
  key_columns: string[]; // The key columns used for identification in the dataset (e.g., ["customer_id", "order_id"])
  table_metadata: DatasetMetadata[]; // Metadata about the columns in the dataset
}

// RuleCategory defines the types of rules applied to datasets, such as "metadata", "data_drift", or "data_profiling".
export type RuleCategory = "metadata" | "data_drift" | "data_profiling";

// FailedCategory tracks the failure rate of rules by category, helping to focus attention on high-failure categories.
export interface FailedCategory {
  RULE_CATEGORY: RuleCategory; // The category of the rule (e.g., "metadata")
  failed_rule_count: number; // The number of failed rules in this category
  total_rule_count: number; // The total number of rules in this category
  failed_rule_percentage: number; // The percentage of rules in this category that failed
}

// Overview provides an overview of the dataset's health, including failed rules, impacted entities, and general statistics.
export interface Overview {
  overview: OverviewHighlights; // High-level overview of dataset properties
  impactedEntities: DatasetsImpacted[]; // A list of impacted entities due to data issues
  failedRulePercentage: FailedCategory[]; // The percentage of failed rules by category
}

// RuleCategorySummary provides a summary of rules that failed within a category, including the datasets impacted and the key rule failures.
export interface RuleCategorySummary {
  CATALOG_NAME: string; // The name of the catalog where the dataset resides
  DATASET_NAME: string; // The name of the dataset (e.g., "sales_data")
  KEY: string; // A key identifier for the dataset (e.g., "customer_id")
  SCHEMA_NAME: string; // The name of the schema where the dataset is located
  VALUE: string; // The value that caused the rule failure (e.g., "missing data", "outlier detected")
}

// DataProfileSummary tracks metrics related to the completeness, max/min values, and uniqueness of the data in each dataset column.
export interface DataProfileSummary {
  CATALOG_NAME: string; // The name of the catalog (e.g., "Sales")
  Completeness: string; // The completeness percentage of the dataset (e.g., "95%")
  DATASET_NAME: string; // The name of the dataset (e.g., "sales_data")
  Max_Value: string; // The maximum value in the dataset for the target column
  Mean_Value: string; // The mean value in the dataset for the target column
  Min_Value: string; // The minimum value in the dataset for the target column
  SCHEMA_NAME: string; // The schema where the dataset resides
  TARGET_COLUMN: string; // The specific column in the dataset being profiled (e.g., "age")
  Uniqueness: string; // The uniqueness percentage for the target column (e.g., "80%")
}

// DataProfile represents a summary of all data profiling activities, including rule summary and detailed profile information.
export interface DataProfile {
  highlights: RuleCategorySummary[]; // High-level rule category summary for data profiling
  summaries: DataProfileSummary[]; // Detailed profile data for each dataset
}

// DataDrift tracks the changes in data distribution over time, measuring whether the data has shifted significantly.
export interface DataDrift {
  CATALOG_NAME: string; // The name of the catalog where the dataset resides
  DATASET_NAME: string; // The name of the dataset (e.g., "sales_data")
  Data_Drift_KL_Div: string; // The Kullback-Leibler divergence value measuring the drift in the data
  Data_Drift_PSI: string; // The Population Stability Index (PSI) value measuring how much the distribution has changed
  Median: string; // The median value in the dataset for the target column
  Mode: string; // The mode (most frequent value) in the dataset for the target column
  Normality_Test_pValue: string; // p-value from normality tests to check if the data follows a normal distribution
  Outlier_Percentage: string; // The percentage of outliers detected in the data
  Q1: string; // The first quartile value (25th percentile) for the dataset
  Q3: string; // The third quartile value (75th percentile) for the dataset
  SCHEMA_NAME: string; // The schema where the dataset resides
  Standard_Deviation: string; // The standard deviation of the dataset for the target column
  TARGET_COLUMN: string; // The target column in the dataset being analyzed
  Variance: string; // The variance of the dataset for the target column
}

// DataHealth tracks the overall health of a dataset, including pass/fail statistics for validation runs.
export interface DataHealth {
  CATALOG_NAME: string; // The catalog name where the dataset resides
  SCHEMA_NAME: string; // The schema where the dataset resides
  DATASET_NAME: string; // The name of the dataset
  L1_NAME: string; // The business unit or top-level unit name
  PERCENT_PASSED_RUNS: string; // The percentage of successful validation runs
  TOTAL_RUNS: number; // The total number of validation runs performed
  successful_runs: number; // The number of successful validation runs
  failed_runs: number; // The number of failed validation runs
  LAST_RUN_STATUS: "Succeeded" | "Failed" | string; // The status of the most recent validation run
}


// KPI Dashbaord

// Brand represents a KPI-related entity, like a brand, and the KPIs associated with it.
export interface Brand {
  BRAND: string; // The name of the brand (e.g., "Brand A", "Brand B")
  Total_KPIs: number; // The total number of KPIs associated with the brand
  Validated_KPIs: number; // The number of KPIs that have been validated
  Non_Validated_KPIs: number; // The number of KPIs that have not been validated
  Failed_KPIs: number; // The number of KPIs that failed
}

// KPIHighlights provides high-level metrics about the KPIs, including the number and percentage of validated, failed, and passed KPIs.
export interface KPIHighlights {
  validated_kpis: number; // The number of validated KPIs
  failed_kpis: number; // The number of KPIs that failed
  passed_kpis: number; // The number of KPIs that passed
  total_kpis: number; // The total number of KPIs being tracked
  validated_kpis_percentage: string; // The percentage of KPIs that are validated
  failed_kpis_percentage: string; // The percentage of KPIs that failed
  passed_kpis_percentage: string; // The percentage of KPIs that passed
}

// KPISummaryView provides a summary of KPIs across brands, including the high-level KPI metrics and brand-specific KPI data.
export interface KPISummaryView {
  highlights: KPIHighlights; // High-level KPI metrics (validated, failed, passed KPIs)
  brands: Brand[]; // A list of brands and their associated KPIs
}

// BrandName captures just the name of a brand for use in filtering or referencing specific brands.
export interface BrandName {
  BRAND: string; // The name of the brand (e.g., "Brand A")
}

// DataVendor represents an external vendor that provides data for KPIs.
export interface DataVendor {
  DATA_VENDOR: string; // The name of the data vendor (e.g., "Vendor A", "Vendor B")
}

// KPIVendor tracks the details of a specific KPI, including the vendors and sources associated with it.
export interface KPIVendor {
  KPI_NAME: string; // The name of the KPI (e.g., "Revenue Growth")
  source_names: string; // A list of data sources that feed into the KPI (e.g., "Sales Data", "CRM Data")
  vendor_names: string; // A list of data vendors associated with the KPI (e.g., "Vendor A", "Vendor B")
}

// KPIDetailsView provides a detailed view of KPIs, including highlights, brands, and associated vendors.
export interface KPIDetailsView {
  highlights: KPIHighlights; // High-level KPI metrics
  brands: BrandName[]; // A list of brands associated with the KPIs
  dataVendors: DataVendor[]; // A list of data vendors that provide data for the KPIs
}

// KPIVendorDetails provides detailed information about a specific KPI's performance, including vendor details and KPI values.
export interface KPIVendorDetails {
  KPI_NAME: string; // The name of the KPI (e.g., "Sales Growth")
  DATA_SOURCE: string; // The source of the data (e.g., "CRM Data")
  DATA_VENDOR: string; // The data vendor providing the data (e.g., "Vendor A")
  LATEST_VALUE: string; // The latest value of the KPI (e.g., "10% Growth")
  PREVIOUS_VALUE: string; // The previous value of the KPI for comparison (e.g., "5% Growth")
  RESULT_VALUE: string; // The result value of the KPI (e.g., "PASS", "FAIL")
  RESULT_STATUS: string; // The status of the KPI result (e.g., "Succeeded", "Failed")
  ALERT_THRESHOLD: string; // The threshold value for alerting (e.g., "10% Growth")
  KPI_UNIQUE_IDENTIFIER: string; // A unique identifier for the KPI (e.g., "KPI-12345")
  KPI_UNIQUE_IDENTIFIER_VALUE: string; // The unique value associated with the identifier (e.g., "Region A")
  RUN_FREQUENCY: string; // The frequency at which the KPI is calculated or updated (e.g., "Daily", "Weekly")
}

// KPIFilter allows filtering KPIs by specific brand, data vendor, and KPI name for detailed analysis.
export interface KPIFilter {
  BRAND: string; // The name of the brand for filtering (e.g., "Brand A")
  DATA_VENDOR: string; // The name of the data vendor for filtering (e.g., "Vendor A")
  KPI_NAME: string; // The name of the KPI for filtering (e.g., "Revenue Growth")
}

// DeveloperKPIDetails provides a detailed view of a KPI for development or technical analysis, including the catalog, dataset, and column information.
export interface DeveloperKPIDetails {
  catalogName: string; // The name of the catalog containing the dataset (e.g., "Sales Data")
  schemaName: string; // The schema name within the catalog (e.g., "sales_metrics")
  datasetName: string; // The name of the dataset (e.g., "quarterly_sales")
  brand: string; // The brand associated with the KPI (e.g., "Brand A")
  dataVendor: string; // The data vendor for the KPI (e.g., "Vendor A")
  kpiName: string; // The name of the KPI (e.g., "Sales Growth")
  targetColumn: string; // The target column in the dataset used for the KPI calculation (e.g., "sales_amount")
  resultValue: string; // The result value of the KPI (e.g., "10% Growth")
  resultStatus: string; // The status of the KPI result (e.g., "Passed", "Failed")
}


// Governance

// LoginActivity tracks the details of a user's login activity, including the device used, action taken, and time of event.
export interface LoginActivity {
  Action: string; // The action performed during login (e.g., "login", "logout")
  Device: string; // The device used for the login action (e.g., "Mobile", "Desktop")
  Email: string; // The email address of the user who performed the login action
  Event_Time: string; // The time when the event occurred (in ISO format, e.g., "2025-11-10T10:00:00Z")
  IP_Address: string; // The IP address from which the login attempt was made (e.g., "192.168.0.1")
  Workspace_ID: string; // The ID of the workspace where the login event occurred (e.g., "Workspace-001")
}

// LoginEmail contains the email address of a user, typically used for searching or filtering login-related data.
export interface LoginEmail {
  Email: string; // The email address of the user (e.g., "user@example.com")
}

// Pipelines Dashboard and Executive Summary

// This provides the overview of Pipelines summary in the pipelines section of the executive dashboard. Useful for high-level view.
export interface PipelineExecutiveDashboardSchema {
  overall_pipeline_score: number, // It is the value of percentage of succeeded pipelines             
  total_pipeline_count: number, // The count of total pipelines ran in the last 24 hours.
  passed_pipeline_count: number, // The count of total successful pipelines ran in the last 24 hours.
  failed_pipeline_count: number, // The count of total failed pipelines ran in the last 24 hours.
  most_failed_pipeline_name: string // This shows which pipeline failed the most number of times within the 24 hours.
}


// This is the schema of the pipeline logs which shows the run status, pipelineRunId, duration, and the error details
export type PipelineDataSchema = {
  PIPELINE_NAME: string, // Name of Pipeline
  RUN_ID: string, // Run Id of the pipeline
  START_TIME: string, // Timestamp of Start time of pipeine
  END_TIME: string, // Timestamp of End time of pipeine
  DURATION_IN_MINUTES: string, // For how long did the pipeline run
  STATUS: string, // Whether the pipeline passed or failed.
  ERROR_MESSAGE: string, // The reason of failure of pipeline run.
}

// This is the array for of the pipeline logs schema, since the data is coming in the form of array from the backend.
export interface PipelineData {
  pipelineData: PipelineDataSchema[] // Array to store the logs
}

// This shows the run status and duration of the last 10 runs of the selected pipeline within 24 hours.
export interface PipelineTrendSchema {
  start: string, // start time of the pipeline run
  duration: number, // duration of the pipeline run
  status: string // status of the pipeline run on completion
}

// To get the data of the slected pipeline in a single Api. This ensures that the data for the trend and donut chart are structured.
export interface PipelineTrendDetails {
  trend_data: PipelineTrendSchema[]; // To get the trends data of the slected pipeline from backend
  donut_data: PipelineHighlights; // Get the donut data of the slected pipeline from backend
  failed_pipelines_data: any[]; // Get failed pipelines data of the slected pipeline from backend 
}

// The schema of data that is received in the backend from splunk
export interface RawPipelineHighlights {
  "Total Pipeline Runs": string; // total pipeline runs within the last 24 hours
  "Succeeded Pipeline Runs": string; // succeeded pipeline runs within last 24 hours
  "Failed Pipeline Runs": string; // failed pipeline runs within the last 24 hours
}

// simplifying the schema of pipeline highlights to make it easier to handle in the code.
export type PipelineHighlightsSplunk = {
  totalRuns: number; // total pipeline runs within the last 24 hours
  succeededRuns: number; // succeeded pipeline runs within last 24 hours
  failedRuns: number; // failed pipeline runs within the last 24 hours
}

export interface PipelineHighlights {
  total_pipelines: number; // The total number of pipeline runs within the last 24 hours (e.g., 100)
  total_pipelines_percentage: string; // The percentage of total pipeline runs compared to the overall pipeline activity (e.g., "85%")
  succeeded_pipelines: number; // The number of successful pipeline runs within the last 24 hours (e.g., 90)
  succeeded_pipelines_percentage: string; // The percentage of successful pipeline runs out of total runs (e.g., "90%")
  failed_pipelines: number; // The number of failed pipeline runs within the last 24 hours (e.g., 10)
  failed_pipelines_percentage: string; // The percentage of failed pipeline runs out of total runs (e.g., "10%")
}

// UpdateHistory tracks changes made to dataset columns, including the operation performed and who made the update.
export interface UpdateHistory {
  COLUMN_NAME: string; // The name of the column that was updated (e.g., "age", "price")
  COLUMN_VALUE: string; // The new value of the column after the update (e.g., "30", "100.00")
  IS_ACTIVE: string; // A flag indicating if the column is still active ("Yes" or "No")
  OPERATION: string; // The type of operation performed (e.g., "Update", "Delete", "Add")
  UPDATED_AT: string; // The date and time when the update was made (in ISO format)
  UPDATED_BY: string; // The user who made the update (e.g., "admin@example.com")
  VALID_FROM: string; // The date from which the update is valid (in ISO format)
  VALID_TO: string; // The date until which the update is valid (in ISO format)
}

// UpdateEmail captures the email address of the user who made updates to dataset columns, typically for auditing or logging purposes.
export interface UpdateEmail {
  Email: string; // The email address of the user who made the update (e.g., "user@example.com")
}

// UserPrivilege tracks the privileges assigned to a user for different objects in the dataset catalog, such as tables or schemas.
export interface UserPrivilege {
  CATALOG_NAME: string; // The name of the catalog (e.g., "Sales Data")
  OBJECT_TYPE: string; // The type of object the user has access to (e.g., "Table", "Schema")
  PRINCIPAL_NAME: string; // The name of the user or group (e.g., "user@example.com")
  PRIVILEGE: string; // The type of privilege granted (e.g., "Read", "Write", "Admin")
  SCHEMA_NAME: string; // The name of the schema within the catalog (e.g., "sales_metrics")
  TABLE_NAME: string; // The name of the table within the schema (e.g., "quarterly_sales")
}

// Payload to send from frontend to backend to run helper function to refresh the data
export interface HelperFunctionsJobPayload {
  CATALOG_NAME?: string; // catalog name required by all helper functions
  DATASET_NAME?: string; // dataset name required for impact analysis
  FUNCTION: string; // function to call in the job
  SCHEMA_NAME?: string; // schema name required for impact analysis
}

// landing page of pipelines dashboard displaying highlights, longest running and shortest running datagrids datagrids
export interface PipelineDashboard {
  longestRunningResults: any[]; // array longest running logs
  shortestRunningResults: any[]; // array of shortest running logs
  pipelineHighlights: PipelineHighlights; // pipeline highlights
}

// ============================================================================
// Roles Management
// ============================================================================

// RolesManagementTabKey is a union type listing all available tabs in the roles management interface.
// Example: user clicks on "GROUPS" tab to see all RBAC groups.
export type RolesManagementTabKey = "GROUPS" | "USERS" | "ROLES" | "PERMISSIONS" | "ADMINS"; // All possible tab identifiers in roles management UI.

// RolesManagementTab describes a single tab's metadata in the roles management interface.
// Example: { value: "GROUPS", label: "Groups", canView: true } represents the Groups tab.
export interface RolesManagementTab {
  value: RolesManagementTabKey; // Tab identifier matching one of the RolesManagementTabKey union values (e.g., "GROUPS").
  label: string; // Human-friendly tab label displayed in the UI (e.g., "Groups").
  canView: boolean; // Authorization flag: true allows the current user to view this tab, false hides it.
}

// DashboardUser represents one active or inactive user in the RBAC system.
// Example: { user_id: "u_123", email: "radhe@company.com", display_name: "Radhe Tiwari", is_active: true }.
export interface DashboardUser {
  user_id: string; // Unique identifier for the user in Databricks dashboard_users table (e.g., "u_123").
  email: string; // User's email address used for EasyAuth matching and communication (e.g., "radhe@company.com").
  display_name: string; // Friendly display name for logs, audit trails, and UI (e.g., "Radhe Tiwari").
  azure_oid?: string | null; // Azure Active Directory object id for identity federation (e.g., "cb4da94f-f146-47c6-934e-edc883ce9228").
  is_active: boolean; // Flag indicating whether the user can access the dashboard (true=active, false=disabled).
  last_login_at?: string | null; // ISO timestamp of the user's most recent successful login (e.g., "2026-01-15T10:30:00Z").
  created_at: string; // ISO timestamp when the user record was created in Databricks (e.g., "2025-11-10T14:22:33Z").
  created_by: string; // Identifier of the user/system that created this user record (email, user_id, or system name).
  updated_at: string; // ISO timestamp of the last modification to this user record (e.g., "2026-01-15T09:15:22Z").
}

// UserFormPayload describes the request body for creating or updating a user.
// Example: POST body { email: "neha@company.com", display_name: "Neha Sharma", is_active: true, created_by: "u_123" }.
export interface UserFormPayload {
  email: string; // New or updated email address for the user (e.g., "neha@company.com").
  display_name: string; // New or updated display name for the user (e.g., "Neha Sharma").
  azure_oid?: string; // Optional Azure object id to associate with this user for external system sync (e.g., GUID).
  is_active: boolean; // Flag to activate or deactivate the user account (true=active, false=inactive).
  user_id?: string; // Optional user id for updates; omit when creating new users (Databricks generates it).
}

// DashboardGroup represents one RBAC group for organizing users and assigning permissions.
// Example: { group_id: "g_456", group_name: "Data Quality Team", description: "DQ analysts and managers", is_active: true }.
export interface DashboardGroup {
  group_id: string; // Unique identifier for the group in Databricks dashboard_groups table (e.g., "g_456").
  group_name: string; // Friendly group name displayed in UI and audit logs (e.g., "Data Quality Team").
  description?: string; // Optional description of the group's purpose or scope (e.g., "Manages DQ rules and metrics").
  is_active: boolean; // Flag indicating whether the group is active and can grant permissions (true=active, false=disabled).
  created_at: string; // ISO timestamp when the group record was created (e.g., "2025-11-10T14:22:33Z").
  created_by: string; // Identifier of the user/system that created this group (email, user_id, or system name).
  updated_at: string; // ISO timestamp of the last modification to this group record (e.g., "2026-01-15T09:15:22Z").
}

// GroupFormPayload describes the request body for creating or updating a group.
// Example: POST body { group_name: "Finance Admins", description: "Finance department administrators", is_active: true }.
export interface GroupFormPayload {
  group_name: string; // New or updated group name (e.g., "Finance Admins").
  description?: string; // Optional description for the group (e.g., "Finance department administrators").
  is_active: boolean; // Flag to activate or deactivate the group (true=active, false=inactive).
  group_id?: string; // Optional group id for updates; omit when creating new groups (Databricks generates it).
}

// DashboardRole represents one role that can be assigned to users through groups.
// Example: { role_id: "r_789", role_name: "DQ Editor", description: "Can edit DQ rules", is_system: false, is_active: true }.
export interface DashboardRole {
  role_id: string; // Unique identifier for the role in Databricks dashboard_roles table (e.g., "r_789").
  role_name: string; // Friendly role name displayed in UI and permission assignments (e.g., "DQ Editor").
  description?: string; // Optional description of the role's responsibilities (e.g., "Can edit DQ rules and manage alerts").
  is_system: boolean; // Flag indicating if this is a built-in system role (true=system, false=custom).
  is_active: boolean; // Flag indicating whether the role can be assigned to users (true=active, false=disabled).
  created_at: string; // ISO timestamp when the role record was created (e.g., "2025-11-10T14:22:33Z").
  created_by: string; // Identifier of the user/system that created this role (email, user_id, or system name).
  updated_at: string; // ISO timestamp of the last modification to this role record (e.g., "2026-01-15T09:15:22Z").
}

// RoleFormPayload describes the request body for creating or updating a role.
// Example: POST body { role_name: "KPI Viewer", description: "Can view KPI dashboards only", is_active: true }.
export interface RoleFormPayload {
  role_name: string; // New or updated role name (e.g., "KPI Viewer").
  description?: string; // Optional description of the role (e.g., "Can view KPI dashboards only").
  is_active: boolean; // Flag to activate or deactivate the role (true=active, false=inactive).
  role_id?: string; // Optional role id for updates; omit when creating new roles (Databricks generates it).
}

// DashboardPermission represents one granular permission that can be assigned through roles.
// Example: { permission_id: "p_001", permission_key: "data-quality:read", category: "data_quality", description: "View DQ dashboards" }.
export interface DashboardPermission {
  permission_id: string; // Unique identifier for the permission in Databricks dashboard_permissions table (e.g., "p_001").
  permission_key: string; // Permission identifier used in RBAC checks (e.g., "data-quality:read", "kpi-config:write").
  category: string; // Permission category for UI grouping and organization (e.g., "data_quality", "governance", "roles_management").
  description?: string; // Optional description of what this permission allows (e.g., "View DQ dashboards and metrics").
  is_active: boolean; // Flag indicating whether this permission can be assigned (true=active, false=deprecated).
}

// PermissionFormPayload describes the request body for creating or updating a permission.
// Example: POST body { permission_key: "roles-management:admin", category: "roles_management", description: "Full RBAC admin access", is_active: true }.
export interface PermissionFormPayload {
  permission_key: string; // Permission identifier in resource:action format (e.g., "roles-management:admin").
  category: string; // Category for organizing permissions in UI and reports (e.g., "roles_management").
  description?: string; // Optional description of the permission's scope and impact (e.g., "Full RBAC admin access").
  is_active: boolean; // Flag to activate or deactivate the permission (true=active, false=inactive).
  permission_id?: string; // Optional permission id for updates; omit when creating new permissions (Databricks generates it).
}