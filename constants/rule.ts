/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026

  Purpose of the script:
    This file acts as a centralized repository for all rule-related
    constant mappings and configuration metadata used across the
    Teva Data Integrity Automation Dashboard.

    - It defines relationships between rule categories, rule types,
      and their corresponding backend rule names.
    - It avoids hard-coded strings across UI components, services,
      and configuration screens.
    - It ensures consistency between frontend rule selection
      and backend rule execution.
    - It simplifies maintenance, extensibility, and future onboarding
      of new rule types or configurations.
*/

//---------------------- Rule Type to Category Mapping ----------------------//

// Maps high-level rule categories to supported rule types
// Used to drive rule-type dropdowns and conditional UI rendering
export const ruleTypeMapping = {
    // Metadata-related rule types
    // Typically focused on dataset-level characteristics
    metadata: [
        "volume",
        "freshness",
        "timeliness",
        "format"
    ] as const,

    // Data Profiling rule types
    // Used for column-level and dataset-level data quality validation
    data_profiling: [
        "completeness",
        "uniqueness",
        "validity",
        "consistency",
        "format",
        "numeric",
    ] as const,

    // Data Drift rule types
    // Used for statistical analysis and drift detection over time
    data_drift: [
        "statistical_analysis_numerical",
        "statistical_analysis_categorical",
        "outlier_detection",
        "normality_test",
        "drift_detection"
    ] as const
};

//---------------------- Metadata Rule Name Mapping ----------------------//

// Maps metadata rule types to their corresponding backend rule identifiers
// Used while constructing rule payloads for execution and persistence
export const metadataRuleNameMapping = {
    volume: ["volume_check"],
    freshness: ["freshness_check"],
    timeliness: ["timeliness_check"],
    format: ["schema_extraction", "schema_validation"],
};

//---------------------- Data Profiling Rule Name Mapping ----------------------//

// Maps data profiling rule types to one or more backend rule names
// Enables support for dataset-level and row-level validations
export const dataProfilingRuleNameMapping = {
    completeness: [
        "completeness_check",
        "dataset_completeness_check",
        "row_level_completeness_check",
    ],
    uniqueness: [
        "uniqueness_check",
        "dataset_uniqueness_check",
        "row_level_uniqueness_check",
    ],
    validity: [
        "range_check"
    ],
    consistency: [
        "consistency_check",
        "cross_table_consistency_check"
    ],
    format: [
        "format_check"
    ],
    numeric: [
        "min_value_check", 
        "max_value_check", 
        "mean_value_check"
    ],
};

//---------------------- Data Drift Rule Name Mapping ----------------------//

// Maps data drift rule categories to backend statistical rule identifiers
// Used for defining drift detection logic and trend analysis
export const dataDriftRuleNameMapping = {
    statistical_analysis_numerical: [
        "median_check", 
        "stddev_check", 
        "variance_check", 
        "quartile1_check", 
        "quartile3_check"
    ],
    statistical_analysis_categorical: [
        "mode_check"
    ],
    outlier_detection: [
        "outlier_check"
    ],
    normality_test: [
        "normality_check"
    ],
    drift_detection: [
        "drift_check_kl_numeric", 
        "drift_check_psi_numeric", 
        "drift_check_kl_categorical", 
        "drift_check_psi_categorical"
    ],
};

//---------------------- Data Drift Target Column Options ----------------------//

// Defines available options for selecting target columns
// in data drift rule configuration UI
export const dataDriftTargetColumns = [
    "Select All",
    "Enter Selective Columns"
];

//---------------------- Additional Rule Configuration Fields ----------------------//

// Defines additional configuration fields required for specific rules
// Used to dynamically render form inputs based on selected rule
export const additionalFields: any = {
    "completeness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "dataset_completeness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "row_level_completeness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "consistency_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "cross_table_consistency_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "uniqueness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "dataset_uniqueness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "row_level_uniqueness_check": ["ruleWarningThreshold", "ruleCriticalThreshold"],
    "max_value_check": ["ruleWarningThreshold", "ruleCriticalThreshold", "baselineValue"],
    "mean_value_check": ["ruleWarningThreshold", "ruleCriticalThreshold", "baselineValue"],
    "min_value_check": ["ruleWarningThreshold", "ruleCriticalThreshold", "baselineValue"],
    "range_check": ["ruleWarningThreshold", "ruleCriticalThreshold", "baselineValue"],
    "volume_check": ["ruleWarningThreshold", "ruleCriticalThreshold", "baselineValue"]
};

//---------------------- Rule Execution Frequencies ----------------------//

// Supported scheduling frequencies for rule execution
// Used in rule configuration and scheduler integration
export const runFrequencies = [
    "Daily",
    "Hourly",
    "Weekly",
    "Monthly",
    "Quaterly",
    "Yearly",
] as const;

//---------------------- Rule Parameter Options ----------------------//

// List of supported rule parameters
// Used for parameter selection, validation, and payload generation
export const ruleParameterOptions = [
    'PIPELINE_NAME',
    "RULE_WARNING_THRESHOLD",    
    "RULE_CRITICAL_THRESHOLD",   
    "THRESHOLD_UNIT",            
    "THRESHOLD_LOOKBACK_VALUE",  
    "THRESHOLD_LOOKBACK_UNIT",   
    "THRESHOLD_DERIVATION_TYPE", 
    "RULE_VALUE",                
    "BASELINE_VALUE",            
    "BASELINE_LOOKBACK_VALUE",   
    "BASELINE_LOOKBACK_UNIT",    
    "BASELINE_DERIVATION_TYPE",  
    "ALERT_FLAG",                
    "RECEIVER_ALERT_ID",         
    "ENABLED",                   
    "RUN_FREQUENCY",             
] as const;

//---------------------- KPI Config Management Constants ----------------------//

// List of supported data domains for KPI configuration
// Used to categorize KPIs across business functions
export const dataDomains = [
    "Wholesaler Shipments", 
    "Speciality Pharmacy Solutions", 
    "Financials", 
    "Fill & Adherence Performance", 
    "Performance/Market Insights"
];

// Defines supported unique identifiers for KPI aggregation
// Used for grouping and dimensional analysis
export const kpiUniqueIdentifiers = [
    "None", 
    "Product", 
    "Product_Sum", 
    "Customer_Name", 
    "Market_Name", 
    "Pharmacy_Name"
];

// Defines how KPI thresholds are derived
// Used in KPI rule configuration logic
export const thresholdDerivationTypes = [
    "Automatic", 
    "Manual"
];

// Defines supported derivation methods for KPI thresholds
// Used when calculating expected KPI ranges
export const thresholdDerivationMethods = [
    "Range", 
    "Min", 
    "Max", 
    "Average"
];
