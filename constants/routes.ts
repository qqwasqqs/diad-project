/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script centralizes all application route constants used across the
    Teva Data Integrity Automation Dashboard.
    
    - It avoids hard-coded route strings throughout the application.
    - It improves maintainability by providing a single source of truth for routing.
    - It enables safer refactoring and better readability.
    - It ensures consistency across navigation, redirects, and access control logic.
*/

//---------------------- Authentication Routes ----------------------//

// Route for user login page
// Used as the entry point for unauthenticated users
export const LOGIN_ROUTE = "/auth/login";

// Route used to log out the authenticated user via platform auth (e.g., Azure Easy Auth)
export const LOGOUT_ROUTE = "/.auth/logout";

//---------------------- Home Routes ----------------------//

// Base home route
// Acts as the landing container for all dashboards after login
export const HOME_ROUTE = "/home";

// Route for my profile page
// Displays logged-in user/my profile details
export const MY_PROFILE_ROUTE = "/home/my-profile";


//---------------------- Executive Dashboard Routes ----------------------//

// Route for Executive Dashboard
// Displays high-level KPIs and executive insights
export const EXECUTIVE_DASHBOARD_ROUTE = "/home/executive-dashboard";

//---------------------- Data Quality Dashboard Routes ----------------------//

// Base route for Data Quality Dashboard
// Parent route for all Data Quality related views
export const DATA_QUALITY_DASHBOARD_ROUTE = "/home/data-quality-dashboard";

// Route for Data Quality Dashboard - Summary View
// Displays overall highlights, metrics, and L1 business unit summaries
export const DATA_QUALITY_DASHBOARD_SUMMARY_VIEW_ROUTE =
  "/home/data-quality-dashboard/summary-view";

// Route for Data Quality Dashboard - Detailed View
// Displays granular dataset-level and validation details
export const DATA_QUALITY_DASHBOARD_DETAILED_VIEW_ROUTE =
  "/home/data-quality-dashboard/detailed-view";

//---------------------- KPI Dashboard Routes ----------------------//

// Base route for KPI Dashboard
// Parent route for KPI-related analytics
export const KPI_DASHBOARD_ROUTE = "/home/kpi-dashboard";

// Route for KPI Dashboard - Summary View
// Displays aggregated KPI metrics
export const KPI_DASHBOARD_SUMMARY_VIEW_ROUTE =
  "/home/kpi-dashboard/summary-view";

// Route for KPI Dashboard - Detailed View
// Displays detailed KPI breakdowns and drill-down analytics
export const KPI_DASHBOARD_DETAILED_VIEW_ROUTE =
  "/home/kpi-dashboard/detailed-view";

//---------------------- Pipelines Dashboard Routes ----------------------//

// Route for Pipelines Dashboard
// Displays pipeline execution status, failures, and monitoring details
export const PIPELINES_DASHBOARD_ROUTE = "/home/pipelines-dashboard";

//---------------------- Rules Management Routes ----------------------//

// Route for Rules Management
// Used for creating, editing, and managing data quality rules
export const RULES_MANAGEMENT_ROUTE = "/home/rules-management";

//---------------------- KPI Config Management Routes ----------------------//

// Route for KPI Config Management
// Used for creating, editing, and managing KPIs configuration
export const KPI_CONFIG_MANAGEMENT_ROUTE = "/home/kpi-config-management";

//---------------------- Governance Routes ----------------------//

// Route for Governance
// Used for Login Activity, Configuration Update History, and User Privileges
export const GOVERNANCE_ROUTE = "/home/governance";

//---------------------- Data Refresh Routes ----------------------//

// Route for Data Refresh
// Used to check the refresh history and freshness of the overall data.
export const DATA_REFRESH_ROUTE = "/home/data-refresh";

//---------------------- Role Management Routes ----------------------//

// Route for Roles Management
// Used to provide roles and permissions to users and groups.
export const ROLES_MANAGEMENT_ROUTE = "/home/roles-management";

export const TECH_TEAM_DASHBOARD_ROUTE = "/home/tech-team-dashboard";


