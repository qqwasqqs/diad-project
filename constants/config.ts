/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This file contains the configuration constants required for connecting to and interacting with Databricks.
    - It defines the Databricks catalog name and the list of schemas included in the queries.
    - These constants are used in SQL queries for data retrieval across multiple business units and schemas.
    - This helps in abstracting and maintaining a centralized source of configuration for the Databricks connection.

*/

/* ----------------------------- DATBRICKS CONFIG CONSTANTS ----------------------------- */

/**
 * The name of the Databricks catalog that stores the data. 
 * This is used in SQL queries to reference the correct catalog when performing data operations.
 */
// DATARBRICKS_CATALOG_NAME
export const CATALOG_NAME = "dset_dev"; // Databricks Catalog Name

/**
 * The schema name within the Databricks catalog that contains data integrity related tables.
 * This schema is specifically used for storing and querying data integrity execution results and related information.
 */
// DATARBRICKS_SCHEMA_NAME
export const SCHEMA_NAME = "data_integrity";

/**
 * The name of the table that holds data integrity execution results.
 * This table is queried to retrieve information about the execution status of various data integrity checks.
 */
// DATA_INTEGRITY_EXECUTION_RESULTS_TABLE
export const DATA_INTEGRITY_EXECUTION_RESULTS_TABLE =
  "data_integrity_execution_results_mng";

/**
 * The name of the table that holds KPI quality execution results.
 * This table is queried to retrieve information about the execution status of various KPI validations.
 */
// KPI_QUALITY_EXECUTION_RESULTS_TABLE
export const KPI_QUALITY_EXECUTION_RESULTS_TABLE =
  "kpi_quality_execution_results_mng";

/**
 * The name of the table that holds data quality configuration audit logs.
 * This table is queried to retrieve information about changes made to data quality configurations.
 */
// DATA_QUALITY_CONFIG_AUDIT_TABLE
export const DATA_QUALITY_CONFIG_AUDIT_TABLE =
  "data_quality_config_audit_mng";

/**
 * The name of the table that holds data quality configuration management data.
 * This table is queried to retrieve information about data quality rule configurations.
 */
// DATA_QUALITY_CONFIG_TABLE
export const DATA_QUALITY_CONFIG_TABLE =
  "data_quality_config_mng";

/**
 * The name of the table that holds data drift configuration management data.
 * This table is queried to retrieve information about data drift rule configurations.
 */
// DATA_DRIFT_CONFIG_TABLE
export const DATA_DRIFT_CONFIG_TABLE =
  "data_drift_config_mng";

/**
 * The name of the table that holds data integrity alerts configuration management data.
 * This table is queried to retrieve information about data integrity alerts configurations.
 */
// DATA_INTEGRITY_ALERTS_CONFIG_TABLE
export const DATA_INTEGRITY_ALERTS_CONFIG_TABLE =
  "data_integrity_alerts_config_mng";

/**
 * The name of the table that holds data integrity dataset tags configuration data.
 * This table is queried to retrieve information about allowed tables with associated tags.
 */
// DATA_INTEGRITY_DATASET_TAGS_TABLE
export const DATA_INTEGRITY_DATASET_TAGS_TABLE =
  "allowed_tables_with_tags";  

/**
 * The name of the table that holds KPI alerts configuration management data.
 * This table is queried to retrieve information about KPI integrity alerts configurations.
 */
export const KPI_INTEGRITY_ALERTS_CONFIG_TABLE =
  "kpi_integrity_alerts_config_mng";

/**
 * The name of the table that holds KPI quality configuration management data.
 * This table is queried to retrieve information about KPI configurations.
 */
export const KPI_QUALITY_CONFIG_TABLE =
  "kpi_quality_config_mng";

/**
 * The name of the table that holds dashboard group definitions.
 * This table is queried to retrieve group metadata such as group name, description,
 * creation information, and active status.
 */
export const DASHBOARD_GROUPS_TABLE = "dashboard_groups";

/**
 * The name of the table that holds dashboard permissions definitions.
 * This table is queried to retrieve all available permissions that can be assigned to roles,
 * including permission keys, categories, and descriptions.
 */
export const DASHBOARD_PERMISSIONS_TABLE = "dashboard_permissions";

/**
 * The name of the table that holds dashboard role definitions.
 * This table is queried to retrieve role metadata such as role name, description,
 * system flag, and active status.
 */
export const DASHBOARD_ROLES_TABLE = "dashboard_roles";

/**
 * The name of the table that holds dashboard user identity and profile information.
 * This table is queried to match authenticated principals to dashboard user records
 * using email, Azure OID, or user ID.
 */
export const DASHBOARD_USERS_TABLE = "dashboard_users";

/**
 * The name of the table that holds scope assignments for each group.
 * This table is queried to retrieve data and resource scope restrictions
 * (e.g., brand, business_unit) that apply to group members.
 */
export const DASHBOARD_GROUP_SCOPES_TABLE = "dashboard_group_scopes";

/**
 * The name of the table that holds role-permission mappings.
 * This table is queried to retrieve which permissions are granted by each role,
 * enabling permission inheritance when users are assigned roles.
 */
export const DASHBOARD_ROLE_PERMISSION_TABLE = "dashboard_role_permission_mapping";

/**
 * The name of the table that holds Super Admin user assignments.
 * This table is queried to identify users with unrestricted access who bypass
 * normal RBAC group and role requirements.
 */
export const DASHBOARD_ADMINS_TABLE = "dashboard_super_admins";

/**
 * The name of the table that holds user-group-role associations.
 * This table is queried to retrieve users' group memberships and assigned roles,
 * forming the backbone of the RBAC permission inheritance system.
 */
export const DASHBOARD_USER_GROUP_ROLE_TABLE = "dashboard_user_group_role_mapping";

/**
 * The name of the table that holds dashboard modules/pages information.
 * This table is queried to retrieve modules/pages and the permissions required to access them,
 * dynamically rendering the side navigation panel items.
 */
export const DASHBOARD_MODULES_TABLE = "dashboard_modules";

/**
 * L1 business classification tag used for KPI-related events.
 * This tag represents the top-level business domain ("US Commercial")
 * and is sent to Event Hub logs to enable filtering, reporting,
 * and monitoring in Splunk or other observability tools.
 */
// KPI_L1_TAG_NAME
export const KPI_L1_TAG_NAME = 'US Commercial'

/**
 * Splunk index name from which the pipeline runs are being fetched.
 * This index is used in the splunk queries.
 */
export const SPLUNK_EVENT_HUB_INFRA_DEV_INDEX = "event_hub_infra_dev"

/**
 * Audit log index name used for dashboard-related logging events.
 * This constant represents the Splunk or logging index where dashboard audit
 * records are stored, queried, and monitored for traceability and analysis.
 */
// DASHBOARD_AUDIT_LOG
export const DASHBOARD_AUDIT_LOG = "dashboard_audit_log";

/* ----------------------------- CODE USAGE EXAMPLE ----------------------------- */

/**
 * The constants `DATARBRICKS_CATALOG_NAME` and `INCLUDED_SCHEMAS` can be used in SQL queries for filtering.
 * Example SQL Query:
 * 
 * const QUERY = `
 *  SELECT * FROM ${DATARBRICKS_CATALOG_NAME}.some_table
 *  WHERE schema_name IN ${INCLUDED_SCHEMAS}
 * `;
 * 
 * This ensures that the database queries are executed within the defined catalog and schema scope.
 */

