# Teva Data Integrity Automation Dashboard

Last updated: 2026-06-24

This README is the primary technical guide and onboarding manual for the project. It is intended to help a new engineer understand, support, maintain, enhance, and promote the Teva Data Integrity Dashboard end-to-end.

## 1. Project Overview

The application is a `Next.js 16` App Router project that serves both:

- A browser-based dashboard UI for data quality, KPI, pipeline, governance, and data refresh monitoring
- Internal backend API routes under `app/api/*` that aggregate data from Databricks, Splunk-backed services, Azure Key Vault, Azure Event Hub, and Azure App Service authentication
- Databricks-backed role-based access control (RBAC) APIs that drive page visibility, API authorization, group scope, role, permission, and Super Admin administration

At a high level:

- Frontend pages live under `app/home/*`
- Reusable UI lives under `components/*`
- Frontend hooks live under `hooks/*`
- Frontend service wrappers live under `lib/services/*`
- Backend integrations live under `lib/azure/*`
- API route handlers live under `app/api/*`
- Shared state lives under `store/*`
- Shared constants and types live under `constants/*` and `types/*`

The app is designed as a dashboard and operations console for:

- Executive overview reporting
- Data Quality dashboard
- KPI monitoring dashboard
- Pipelines monitoring dashboard
- Governance and audit views
- Data refresh monitoring
- Great Expectations style rule and KPI configuration management
- Roles Management for dashboard users, groups, roles, permissions, scopes, Super Admins, and Azure AD group import

## 2. Tech Stack

- Framework: `next@16.2.4`
- React: `react@19.2.5`
- TypeScript: `typescript@5.9.3`
- UI library: `@fluentui/react-components`
- Styling: `Tailwind CSS v4.2.2` plus Fluent UI tokens/themes
- Client data fetching and caching: `@tanstack/react-query`
- Forms: `react-hook-form` + `zod`
- Global state: `zustand`
- Charts: `recharts`
- HTTP client: `axios`
- Azure integrations:
  - `@azure/identity`
  - `@azure/keyvault-secrets`
  - `@azure/event-hubs`
- Microsoft Graph:
  - `@microsoft/microsoft-graph-client`
- Databricks:
  - `@databricks/sql`
  - Databricks REST APIs through `axios`

## 3. Runtime Architecture

The project follows a layered architecture:

1. `page.tsx` files render screens and compose UI sections
2. Hooks in `hooks/*` call service-layer functions and manage loading/cache state with React Query
3. Service modules in `lib/services/*` call internal Next.js APIs using `lib/apiClient.ts`
4. Route handlers in `app/api/*` are protected by the RBAC authorization layer where applicable, then fetch, transform, validate, and return data
5. Route handlers call Azure, Microsoft Graph, Databricks, and RBAC helpers in `lib/azure/*` and `lib/rbac/*`
6. Databricks SQL and Databricks notebook jobs are the main data execution backends
7. Event Hub logging and `dashboard_audit_log` records are used for non-local telemetry, API access auditing, authorization decisions, and downstream monitoring

This means UI code usually should not talk directly to Databricks or Azure. New engineers should normally extend:

- `components/*`
- `hooks/*`
- `lib/services/*`
- `app/api/*`

and only touch `lib/azure/*` when they need backend integration changes.

## 4. Important Folders

### `app/`

- `app/layout.tsx`: Root layout
- `app/home/layout.tsx`: Shared layout for authenticated dashboard pages
- `app/auth/login/page.tsx`: Basic login entry page
- `app/home/*`: Feature pages
- `app/api/*`: Backend API routes
- `app/api/roles-management/*`: RBAC administration APIs for users, groups, roles, permissions, scopes, Super Admins, and Azure AD group import
- `app/api/me/route.ts`: current-user identity and effective RBAC grants
- `app/api/dashboard-modules/route.ts`: permission-filtered module/navigation API

### `components/`

- `components/layout/*`: Header and sidenav
- `components/ui/*`: All main dashboard widgets, dialogs, drawers, filters, and tables
- `components/charts/*`: Chart components

### `hooks/`

Feature-specific React Query hooks. These are the main frontend entry points for data fetching.

### `lib/services/`

Frontend service wrappers that call internal APIs. Examples:

- `executiveDashboardService.ts`
- `qualityDashboardService.ts`
- `kpiDashboardService.ts`
- `pipelineDashboardService.ts`
- `governanceService.ts`
- `dataRefreshService.ts`
- `greatExpectationsService.ts`
- `databricksNotebookService.ts`
- `rolesManagementService.ts`
- `splunkReportService.ts`
- `authService.ts`

### `lib/azure/`

Backend-only integration layer:

- `credential.ts`: chooses Service Principal locally and Managed Identity in Azure
- `keyvault.ts`: fetches secrets from Azure Key Vault
- `ADToken.ts`: gets Databricks token/PAT
- `databricksClient.ts`: Databricks SQL session and query execution
- `eventHubLogger.ts`: sends structured logs to Azure Event Hub
- `graphClient.ts`: creates a Microsoft Graph client using the shared Azure credential helper

### `lib/rbac/`

Databricks-backed authorization and audit layer used by API route handlers.

Key files:

- `authorize.ts`: wraps route handlers with authentication, permission checks, scope checks, normalized RBAC headers, and audit logging
- `identity.ts`: resolves identity from `RBAC_LOCAL_USER_IDENTIFIER` locally or Azure App Service EasyAuth headers in hosted environments
- `repository.ts`: loads dashboard users, groups, roles, permissions, scopes, and Super Admin status from Databricks
- `policies.ts`: maps API paths and HTTP methods to required permission keys and optional scope enforcement
- `permissions.ts`: implements exact, wildcard, and inherited permission matching
- `dataScope.ts`: builds scoped data grants for business APIs
- `managementScope.ts`: builds SQL filters for roles-management entity access
- `audit.ts`: writes API, authorization, and CRUD audit events to Databricks and Event Hub
- `sql.ts`: SQL formatting helpers used by RBAC routes
- `README.md`: detailed RBAC behavior reference

### `store/`

Shared state for:

- Authenticated user
- Data Quality detailed-view filters
- KPI detailed-view filters

### `constants/`

This folder is important for onboarding because it centralizes business-facing configuration, rule vocabulary, and UI branding. New engineers should read these files early before changing APIs or forms.

Key files:

- `constants/config.ts`: Databricks catalog, schema, table, tag, and Splunk index constants
- `constants/rule.ts`: rule categories, display labels, dynamic rule form metadata, KPI config dropdown values, and scheduler frequency options
- `constants/theme.ts`: Teva Fluent UI light theme and brand color ramp
- `constants/routes.ts`: route/path constants used across navigation and API wiring

#### `constants/config.ts`

This file defines the default Databricks Unity Catalog targets used by the application:

- Catalog: `dset_dev`
- Schema: `data_integrity`

It also centralizes the managed table names used by dashboard queries and rule/KPI management flows. The most important tables currently configured are:

- `data_integrity_execution_results_mng`: data quality execution output
- `kpi_quality_execution_results_mng`: KPI execution output
- `data_quality_config_audit_mng`: audit trail for data quality configuration changes
- `data_quality_config_mng`: data quality rule configuration source
- `data_drift_config_mng`: data drift configuration source
- `data_integrity_alerts_config_mng`: alert configuration for data integrity workflows
- `allowed_tables_with_tags`: allowed dataset registration and tagging reference
- `kpi_integrity_alerts_config_mng`: KPI alert configuration
- `kpi_quality_config_mng`: KPI configuration source
- `dashboard_users`: dashboard identity and profile records used by RBAC
- `dashboard_groups`: RBAC group definitions
- `dashboard_roles`: RBAC role definitions
- `dashboard_permissions`: permission catalog using `resource:action` keys
- `dashboard_user_group_role_mapping`: user/group/role assignment table
- `dashboard_role_permission_mapping`: role/permission assignment table
- `dashboard_group_scopes`: group-level business/data scope table
- `dashboard_super_admins`: database-backed Super Admin assignments
- `dashboard_modules`: permission-aware navigation/module configuration
- `dashboard_audit_log`: API, authorization, and CRUD audit log table

Other notable constants:

- `KPI_L1_TAG_NAME = "US Commercial"`: default L1 KPI business tag used by KPI flows
- `SPLUNK_EVENT_HUB_INFRA_DEV_INDEX = "event_hub_infra_dev"`: infrastructure/event index reference used by pipeline monitoring and related integrations
- `DASHBOARD_AUDIT_LOG = "dashboard_audit_log"`: audit-log target used by RBAC and operational logging

Support note:

- if a new Azure or Databricks environment uses a different catalog, schema, or managed table naming convention, this is one of the first files that must be reviewed and aligned

#### `constants/rule.ts`

This file encodes much of the business vocabulary for rules-management forms and downstream API payloads.

Rule categories are grouped into:

- `metadata`: `volume`, `freshness`, `timeliness`, `format`
- `data_profiling`: `completeness`, `uniqueness`, `validity`, `consistency`, `format`, `numeric`
- `data_drift`: `statistical_analysis_numerical`, `statistical_analysis_categorical`, `outlier_detection`, `normality_test`, `drift_detection`

It also defines the human-readable label mappings shown in the UI, for example:

- metadata labels such as Volume, Freshness, Timeliness, and Format
- profiling labels such as Completeness, Uniqueness, Validity, Consistency, Numeric Format, Max, Min, Mean, Median, and Range
- drift labels such as Categorical Distribution, Numeric Distribution, Numeric Outliers, Normality Test, and Historical Drift Check

Why this matters:

- the Rules Management UI depends on these mappings to decide which rule families and labels users can choose
- API payloads and Databricks notebook inputs depend on the exact rule identifiers remaining stable
- when adding a new rule type, engineers usually need to update this file together with form rendering and backend handling

Additional onboarding details from this file:

- target-column selectors for drift rules currently expose `Select All` and `Enter Selective Columns`
- dynamic `additionalFields` metadata drives which parameters appear for each rule type
- scheduler options are currently `Daily`, `Hourly`, `Weekly`, `Monthly`, `Quaterly`, and `Yearly`
- KPI config support values such as `dataDomains`, `kpiUniqueIdentifiers`, `thresholdDerivationTypes`, and `thresholdDerivationMethods` are also defined here

#### `constants/theme.ts`

This file creates the application light theme using Fluent UI `createLightTheme` and a Teva brand ramp.

Important details:

- the primary Teva green is centered around `#00A03B`
- the file overrides Fluent UI neutral foreground, background, and stroke tokens to keep the dashboard aligned with Teva branding
- any global restyling effort should start here before editing many individual components

For a fresher engineer, the practical rule is:

- change `theme.ts` for shared branding
- change component-level styling only for local layout or one-off UX adjustments

## 5. Main User Flows and Pages

### Executive Dashboard

Path: `/home/executive-dashboard`

Purpose:

- Shows the AI Observability executive view: performance, adoption, cost, and
  safety and risk posture

Main files:

- `app/home/executive-dashboard/page.tsx`
- `hooks/useExecutiveDashboard.ts`
- `lib/services/executiveDashboardService.ts`
- `app/api/executive-dashboard/main-view/route.ts`

### Data Quality Dashboard

Paths:

- `/home/data-quality-dashboard/summary-view`
- `/home/data-quality-dashboard/detailed-view`

Purpose:

- Summary by business unit
- Detailed exploration by catalog, schema, dataset
- Overview, metadata, data profile, data drift, and data health drill-downs

Main files:

- `app/home/data-quality-dashboard/*`
- `hooks/useQualityDashboard.ts`
- `lib/services/qualityDashboardService.ts`
- `app/api/data-quality-dashboard/*`
- `store/DQDDetailedViewFiltersStore.ts`

### KPI Dashboard

Paths:

- `/home/kpi-dashboard/summary-view`
- `/home/kpi-dashboard/detailed-view`

Purpose:

- KPI summary by brand
- Detailed KPI execution results by Brand -> KPI -> Vendor

Main files:

- `app/home/kpi-dashboard/*`
- `hooks/useKpiDashboard.ts`
- `lib/services/kpiDashboardService.ts`
- `app/api/kpi-dashboard/*`
- `store/kpiDetailedViewFiltersStore.ts`

### Pipelines Dashboard

Path: `/home/pipelines-dashboard`

Purpose:

- Shows pipeline health, longest/shortest runs, failure patterns, trend analysis, and links failed pipelines to impacted datasets

Main files:

- `app/home/pipelines-dashboard/page.tsx`
- `hooks/usePipelineDashboard.ts`
- `lib/services/pipelineDashboardService.ts`
- `lib/services/splunkReportService.ts`
- `app/api/pipelines-dashboard/*`

### Governance

Path: `/home/governance`

Purpose:

- Login activity
- Configuration update history
- User privileges

Main files:

- `app/home/governance/page.tsx`
- `hooks/useGovernanceService.ts`
- `lib/services/governanceService.ts`
- `app/api/governance/*`

### Data Refresh

Path: `/home/data-refresh`

Purpose:

- Monitor refreshed vs unrefreshed datasets
- Trend unrefreshed datasets
- Trigger helper function jobs to update timeliness checks

Main files:

- `app/home/data-refresh/page.tsx`
- `hooks/useDataRefresh.ts`
- `lib/services/dataRefreshService.ts`
- `app/api/data-refresh/*`

### Rules Management and KPI Configuration Management

Paths:

- `/home/rules-management`
- `/home/kpi-config-management`

Purpose:

- Register datasets
- Add/update data quality rules
- View suggested rules
- Start/check Databricks cluster
- Create/update KPI configurations

Main files:

- `app/home/rules-management/*`
- `app/home/kpi-config-management/page.tsx`
- `hooks/useGreatExpectations.ts`
- `lib/services/greatExpectationsService.ts`
- `app/api/great-expectations/*`

### Roles Management

Path: `/home/roles-management`

Purpose:

- Manage dashboard groups, users, roles, permissions, group scopes, and Super Admin assignments
- Import/sync Azure AD groups through Microsoft Graph into Databricks-backed dashboard group records
- Assign users to groups with roles
- Assign permissions to roles
- Restrict normal roles-management administrators to entities they can manage while allowing database-backed Super Admins to manage all RBAC records

Main files:

- `app/home/roles-management/page.tsx`
- `components/ui/DashboardGroupsTab.tsx`
- `components/ui/DashboardUsersTab.tsx`
- `components/ui/DashboardRolesTab.tsx`
- `components/ui/DashboardPermissionsTab.tsx`
- `components/ui/DashboardSuperAdminTab.tsx`
- `components/ui/ManageRolesInGroup.tsx`
- `components/ui/ManagePermissionsInRoleDialog.tsx`
- `components/ui/ManageScopeDialog.tsx`
- `hooks/useRolesManagement.ts`
- `hooks/usePermissions.ts`
- `hooks/hasPagePermissions.ts`
- `lib/services/rolesManagementService.ts`
- `lib/rbac/*`
- `app/api/roles-management/*`

Tabs and permission checks:

- Groups tab: visible with `roles-management-groups:read`
- Users tab: visible with `roles-management-users:read`
- Roles tab: visible with `roles-management-roles:read`
- Permissions tab: visible with `roles-management-permissions:read`
- Admins tab: visible with `roles-management-admins:read`

The page chooses the first allowed tab after `/api/me` resolves the current user's effective permissions.

### My Profile and Permission-Aware Navigation

Path: `/home/my-profile`

Purpose:

- Shows current-user identity and effective RBAC context returned by `/api/me`
- Supports debugging of group, role, permission, and scope visibility for the logged-in user

Navigation behavior:

- `components/layout/Sidenav.tsx` no longer relies on only static route configuration
- it calls `useDashboardModules()`, which reads `/api/dashboard-modules`
- `/api/dashboard-modules` reads active records from `dashboard_modules`
- module visibility is filtered by each module's `required_permissions`
- icons are resolved through `constants/iconMap.ts`

## 6. Authentication Model

Current authentication model is Azure App Service EasyAuth-oriented and now includes a Databricks-backed RBAC layer.

Evidence in code:

- `lib/services/authService.ts` calls `/.auth/me`
- `lib/services/authService.ts` also calls `/api/me` and `/api/dashboard-modules`
- `layouts/HomeLayout.tsx` fetches authenticated user info on load
- user details are stored in `store/userStore.ts`
- `lib/apiClient.ts` adds `x-user-id` header from browser local storage
- `hooks/usePermissions.ts` and `hooks/hasPagePermissions.ts` read `/api/me` results and expose page/feature permission checks
- `lib/rbac/authorize.ts` protects API routes with route policy, permission, optional scope, and audit checks

Implications for support:

- The app expects to run behind App Service authentication in hosted environments
- If `/.auth/me` fails in production, frontend user state will be incomplete
- If `/api/me` fails or the user is missing from `dashboard_users`, page permissions and dynamic navigation will not resolve correctly
- Many API logs and audit trails depend on `x-user-id`, normalized RBAC headers, and Databricks RBAC lookup results

### RBAC authorization flow

For protected API routes:

1. `withAuthorization` resolves the caller from `RBAC_LOCAL_USER_IDENTIFIER` in local mode or EasyAuth headers in hosted mode
2. `repository.ts` matches the caller to `dashboard_users`
3. the user's active groups, roles, permissions, group scopes, and Super Admin status are loaded from Databricks
4. `policies.ts` maps the route and HTTP method to a required permission key
5. scoped APIs also collect request scopes such as `business_unit`, `brand`, `catalog`, `schema`, `dataset`, `rule_category`, and `kpi`
6. `permissions.ts` evaluates exact permission matches, wildcard permissions, action inheritance, and scope grants
7. authorization results are logged to `dashboard_audit_log` and Event Hub where configured
8. the wrapped API route receives normalized headers such as `x-rbac-user-id`, `x-rbac-super-admin`, and serialized scope grants

Permission key pattern:

- use lowercase `resource:action` keys
- common actions are `read`, `create`, `update`, `delete`, `write`, `manage`, `admin`, and `execute`
- `admin` implies lower-level actions
- `manage` implies write/read/update/delete/execute style actions
- `write` implies create/read/update/delete
- `*` grants all permissions

Important distinction:

- dashboard data APIs can enforce business/data scopes such as brand, business unit, catalog, schema, dataset, rule category, or KPI
- roles-management APIs use entity-level management filters from `lib/rbac/managementScope.ts`; group scope values do not decide whether a user can manage RBAC records

## 7. Environment and Secret Management

### Local environment behavior

When `ENVIRONMENT=local`:

- Azure auth uses `ClientSecretCredential`
- Databricks host/path/job IDs come from environment variables
- Splunk service URL and function secret come from environment variables
- Event Hub logging is skipped in local mode
- `RBAC_LOCAL_USER_IDENTIFIER` identifies the local dashboard user for real Databricks RBAC lookup

### Local design mode (UI-only development)

When `NEXT_PUBLIC_LOCAL_DESIGN_MODE=true` (and local environment):

- API authorization is bypassed centrally in `lib/rbac/authorize.ts`
- page-level permission checks from `usePagePermissions` are treated as allowed
- `authService.fetchMe()` and `authService.fetchDashboardModules()` return local mock payloads
- this mode is intended for local page-design workflows when external systems are unavailable

What this mode does not do by default:

- it does not automatically mock every existing dashboard API
- existing legacy pages may still fail if they depend on unavailable data backends
- new pages should load static JSON from `public/mocks/new-pages/*`

### Non-local environment behavior

When `ENVIRONMENT` is not `local`:

- Azure auth uses `DefaultAzureCredential`, which is intended to resolve to Managed Identity
- Many secrets are fetched from Azure Key Vault at runtime
- Event Hub logging is enabled
- EasyAuth headers identify the user for RBAC lookup
- Microsoft Graph calls use the same Azure credential flow when importing Azure AD groups

### Environment variables used locally

Use `.env.example` as the safe template. Do not copy secret values into documentation or commit real values into source control.

- `ENVIRONMENT`
- `NEXT_PUBLIC_ENVIRONMENT`
- `NEXT_PUBLIC_LOCAL_DESIGN_MODE`
- `AZURE_AD_TENANT_ID`
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_SCOPE`
- `AZURE_AD_LOGIN_URL`
- `AZURE_AD_LOGIN_URL_VERSION`
- `KEY_VAULT_URL`
- `DATABRICKS_SERVER_HOSTNAME`
- `DATABRICKS_HTTP_PATH`
- `DATABRICKS_DQ_NOTEBOOK_JOB_ID`
- `DATABRICKS_DRIFT_NOTEBOOK_JOB_ID`
- `DATABRICKS_KPI_NOTEBOOK_JOB_ID`
- `DATABRICKS_HELPER_FUNCTIONS_NOTEBOOK_JOB_ID`
- `DATABRICKS_CLUSTER_ID`
- `SPLUNK_SERVICE_BASE_URL`
- `SPLUNK_FUNCTION_SECRET`
- `RBAC_LOCAL_USER_IDENTIFIER`
- `RBAC_CACHE_TTL_MS`

### Local environment variable meaning

The purpose of each local setting. The most important meanings are:

- `ENVIRONMENT`: controls credential mode and logging behavior; use `local` for local development
- `NEXT_PUBLIC_ENVIRONMENT`: optional public environment marker used by client-side local design mode checks
- `NEXT_PUBLIC_LOCAL_DESIGN_MODE`: enables local design mode for bypassing auth/ACL and returning mock bootstrap auth data
- `AZURE_AD_TENANT_ID`: Azure Entra tenant that owns the application registration
- `AZURE_AD_CLIENT_ID`: service principal client/application ID used for local auth flows
- `AZURE_AD_CLIENT_SECRET`: secret for the local service principal
- `AZURE_AD_SCOPE`: Azure AD resource scope requested when obtaining downstream access tokens
- `AZURE_AD_LOGIN_URL`: Azure login host, typically the Entra login endpoint
- `AZURE_AD_LOGIN_URL_VERSION`: token endpoint version segment used by the auth helper
- `KEY_VAULT_URL`: base URL of the Key Vault used for hosted secret lookup
- `DATABRICKS_SERVER_HOSTNAME`: Databricks workspace or SQL endpoint hostname
- `DATABRICKS_HTTP_PATH`: Databricks SQL warehouse or endpoint HTTP path
- `DATABRICKS_DQ_NOTEBOOK_JOB_ID`: job ID for data quality orchestration notebook runs
- `DATABRICKS_DRIFT_NOTEBOOK_JOB_ID`: job ID for data drift orchestration notebook runs
- `DATABRICKS_KPI_NOTEBOOK_JOB_ID`: job ID for KPI orchestration notebook runs
- `DATABRICKS_HELPER_FUNCTIONS_NOTEBOOK_JOB_ID`: job ID for helper/timeliness utility notebook runs
- `DATABRICKS_CLUSTER_ID`: Databricks cluster identifier used by cluster actions
- `SPLUNK_SERVICE_BASE_URL`: base URL for the Splunk-facing reporting service
- `SPLUNK_FUNCTION_SECRET`: access secret used by the Splunk-facing service
- `RBAC_LOCAL_USER_IDENTIFIER`: local-only dashboard user identifier; set it to a `dashboard_users.email`, `dashboard_users.azure_oid`, or `dashboard_users.user_id`
- `RBAC_CACHE_TTL_MS`: in-process cache duration for RBAC lookup results

### Key Vault secret names referenced by code

The following secret names are directly referenced in the current codebase and should exist in non-local environments where those integrations are used:

- `kv-data-integrity-ad-scope`
- `kv-data-integrity-adb-server-hostname`
- `kv-data-integrity-adb-http-path`
- `kv-data-integrity-adb-dq-notebook-job-id`
- `kv-data-integrity-adb-drift-notebook-job-id`
- `kv-data-integrity-adb-kpi-notebook-job-id`
- `kv-data-integrity-adb-functions-notebook-job-id`
- `kv-data-integrity-adb-cluster-id`
- `kv-data-integrity-eventhub-namespace`
- `kv-data-integrity-eventhub-name`
- `kv-data-integrity-splunk-service-base-url`
- `kv-data-integrity-splunk-function-secret`

### Managed Identity secret purpose reference

The guide also describes what each hosted secret is for. In practice:

- `kv-data-integrity-ad-scope`: downstream Azure AD scope used for token acquisition
- `kv-data-integrity-adb-server-hostname`: Databricks hostname used by SQL and job APIs
- `kv-data-integrity-adb-http-path`: Databricks SQL warehouse HTTP path
- `kv-data-integrity-adb-dq-notebook-job-id`: data quality notebook job ID
- `kv-data-integrity-adb-drift-notebook-job-id`: data drift notebook job ID
- `kv-data-integrity-adb-kpi-notebook-job-id`: KPI notebook job ID
- `kv-data-integrity-adb-functions-notebook-job-id`: helper-functions notebook job ID
- `kv-data-integrity-adb-cluster-id`: Databricks cluster ID used by cluster operations
- `kv-data-integrity-eventhub-namespace`: Event Hub namespace for operational logging
- `kv-data-integrity-eventhub-name`: Event Hub name for operational logging
- `kv-data-integrity-splunk-service-base-url`: hosted Splunk service endpoint
- `kv-data-integrity-splunk-function-secret`: hosted Splunk service secret

### Local-to-Key Vault secret mapping

This is the most practical mapping for onboarding and environment setup:

- `AZURE_AD_SCOPE` -> `kv-data-integrity-ad-scope`
- `DATABRICKS_SERVER_HOSTNAME` -> `kv-data-integrity-adb-server-hostname`
- `DATABRICKS_HTTP_PATH` -> `kv-data-integrity-adb-http-path`
- `DATABRICKS_DQ_NOTEBOOK_JOB_ID` -> `kv-data-integrity-adb-dq-notebook-job-id`
- `DATABRICKS_DRIFT_NOTEBOOK_JOB_ID` -> `kv-data-integrity-adb-drift-notebook-job-id`
- `DATABRICKS_KPI_NOTEBOOK_JOB_ID` -> `kv-data-integrity-adb-kpi-notebook-job-id`
- `DATABRICKS_HELPER_FUNCTIONS_NOTEBOOK_JOB_ID` -> `kv-data-integrity-adb-functions-notebook-job-id`
- `DATABRICKS_CLUSTER_ID` -> `kv-data-integrity-adb-cluster-id`
- `SPLUNK_SERVICE_BASE_URL` -> `kv-data-integrity-splunk-service-base-url`
- `SPLUNK_FUNCTION_SECRET` -> `kv-data-integrity-splunk-function-secret`

## 8. Databricks Integration

Databricks is used in two ways:

### Databricks SQL warehouse queries

Used for dashboard reads and metadata checks.

Core file:

- `lib/azure/databricksClient.ts`

What it does:

- resolves host and path from env or Key Vault
- gets a token via `ADToken.ts`
- opens and caches a Databricks SQL session
- executes SQL queries
- performs simple session health checks

### Databricks notebook jobs

Used for operational actions such as:

- managing data quality rules
- managing KPI configurations
- cluster start/status operations
- helper function runs

Core file:

- `lib/services/databricksNotebookService.ts`

## 9. Splunk and Pipeline Monitoring

Pipeline monitoring depends on a Splunk-facing service, likely exposed through Azure Functions.

Core files:

- `lib/services/splunkReportService.ts`
- `app/api/pipelines-dashboard/*`

This means the pipeline dashboard depends on:

- the Splunk service endpoint being reachable
- the Splunk function secret being valid
- expected saved searches and query API behavior remaining stable

## 10. Logging and Observability

Operational logging goes to Azure Event Hub in non-local environments, and RBAC audit records are also written to Databricks.

Core files:

- `lib/azure/eventHubLogger.ts`
- `lib/rbac/audit.ts`
- `lib/rbac/authorize.ts`

Typical log sources:

- API route success/failure
- API access and authorization decisions
- Roles-management CRUD actions
- Databricks connection lifecycle
- cluster state events
- notebook job trigger outcomes

Support note:

- local development will not reflect full production logging behavior because local mode intentionally skips Event Hub publishing
- RBAC audit records should be checked when investigating 401/403 behavior, missing navigation modules, failed role assignment, or denied scope access

## 11. Local Setup for a New Engineer

### Prerequisites

- Node.js compatible with Next.js 16
- npm
- Access to Azure tenant, service principal, Key Vault, Databricks, and Splunk-backed services

### Steps

1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to a local `.env` and populate approved values from secure sources
4. Set `ENVIRONMENT=local`
5. Set `RBAC_LOCAL_USER_IDENTIFIER` to an existing `dashboard_users` email, Azure OID, or user ID
6. Start the app with `npm run dev`
7. Open `http://localhost:3000`

### Recommended local validation

- `npm run lint`
- `npm run build`

There is no automated test suite in the repo right now, so lint and build are the minimum baseline checks.

## 12. Daily Development Workflow

When implementing a new feature:

1. Find the page under `app/home/*`
2. Find the corresponding hook in `hooks/*`
3. Find the service wrapper in `lib/services/*`
4. Check the permission key in `lib/rbac/policies.ts` if the feature is API-protected
5. Find or add the backend route in `app/api/*`
6. Add or update Databricks/Azure/Microsoft Graph integration only if needed
7. Verify loading, empty, forbidden, and error states in UI
8. Run lint and build before promotion

Rule of thumb:

- UI change only: usually `components/*` and maybe `page.tsx`
- New dashboard read API: `hooks/*`, `lib/services/*`, `app/api/*`, and usually `lib/rbac/policies.ts`
- New operational Azure/Databricks behavior: `app/api/*` plus `lib/azure/*` or `lib/services/databricksNotebookService.ts`
- New page or module: add or update `dashboard_modules`, permission rows, role-permission mappings, and UI route/page wiring
- New roles-management operation: update `app/api/roles-management/*`, `lib/services/rolesManagementService.ts`, `hooks/useRolesManagement.ts`, and the related tab/dialog component

## 13. Maintenance and Support Checklist

When there is a production issue, check in this order:

1. Is App Service auth working, including `/.auth/me`?
2. Does `/api/me` return the user's dashboard RBAC identity, permissions, and scopes?
3. Does `/api/dashboard-modules` return the expected navigation modules?
4. Is the app able to read required Key Vault secrets?
5. Is Managed Identity configured and authorized correctly?
6. Is Databricks SQL reachable?
7. Are RBAC tables populated and active rows present?
8. Are Databricks cluster and notebook jobs healthy?
9. Is Microsoft Graph reachable for Azure AD group import?
10. Is the Splunk service reachable and returning expected data?
11. Are Event Hub logs and `dashboard_audit_log` records being emitted?
12. Did a schema/table/column change in Databricks break a query?

Common incident categories:

- Empty dashboard tiles: usually API, SQL query, or upstream data issue
- Authenticated UI but missing user context: EasyAuth or `/.auth/me` issue
- Missing side navigation item: `/api/dashboard-modules`, `dashboard_modules`, or missing required permission
- Forbidden page/API response: missing RBAC user, inactive assignment, missing permission, missing scope, or route policy mismatch
- Rule/KPI creation not starting: Databricks cluster/job/config issue
- Roles Management lists missing rows: normal admin entity filters, inactive rows, missing group-role relationships, or missing creator visibility assumptions
- Azure AD group import fails: Microsoft Graph app permissions, credential setup, or Databricks merge failure
- Pipeline page empty: Splunk function or saved search issue
- Local works, Azure fails: usually Managed Identity or Key Vault permissions

## 14. Known Technical Risks and Gaps

New engineers should be aware of these current-state risks:

- Secrets appear to be committed in `.env`
- No automated tests are present
- No CI/CD or infrastructure-as-code is present in the repo
- Deployment process is not codified in source control
- Some route handlers build SQL dynamically; changes should be made carefully
- SSE cluster monitoring and long-running integration behavior should be tested in the target environment
- RBAC behavior depends on Databricks table correctness; inactive mappings or missing permission rows can make valid users appear unauthorized
- Microsoft Graph import requires Graph application permissions to be granted to the Azure identity used by the app

## 15. Production Promotion to a New Azure Environment

The repo does not contain Terraform, Bicep, ARM, GitHub Actions, Azure Pipelines, Docker, or App Service deployment manifests. So promotion must currently be handled as an operational runbook.

### A. Provision target Azure resources

Create or confirm:

- Azure App Service for the Next.js application
- App Service authentication using Azure Entra ID
- Managed Identity enabled on the App Service
- Azure Key Vault for secrets
- Azure Event Hub namespace and hub for operational logs
- Databricks workspace, SQL warehouse, cluster, and job definitions
- Splunk-facing Azure Function or equivalent service endpoint

### B. Grant Databricks Catalog, Schema, Dataset level access permissions to Managed Identity

Grant the App Service Managed Identity the Databricks access needed by the application, not just workspace login:

- Workspace-level access so the identity can authenticate into Databricks
- SQL Warehouse usage access required for dashboard query execution
- Catalog-level `USE CATALOG` permission on the target catalog
- Schema-level `USE SCHEMA` permission on the required schemas
- Table or view-level `SELECT` permission on the datasets queried by dashboard APIs
- Additional dataset-level permissions required for any write or notebook-driven operations if those flows depend on Unity Catalog objects
- Read/write access to RBAC management tables used by roles-management APIs
- Insert access to `dashboard_audit_log`

Minimum practical expectation for this app:

- read access to the catalog and schemas used by dashboard queries
- read access to the specific tables/views referenced in KPI, data quality, governance, and data refresh APIs
- whichever Databricks entitlements are required for cluster status, cluster events, and job run APIs

The current default code configuration in `constants/config.ts` points at:

- Catalog: `dset_dev`
- Schema: `data_integrity`

At minimum, validate access for the managed objects configured there, including the execution, config, alert, audit, dataset-tag, and KPI tables referenced by the application. If the promoted environment uses different catalog/schema/table names, update `constants/config.ts` and test all dashboard/API flows after the change.

Also validate RBAC table access for:

- `dashboard_users`
- `dashboard_groups`
- `dashboard_roles`
- `dashboard_permissions`
- `dashboard_user_group_role_mapping`
- `dashboard_role_permission_mapping`
- `dashboard_group_scopes`
- `dashboard_super_admins`
- `dashboard_modules`
- `dashboard_audit_log`

If these permissions are missing, the most common symptoms will be empty dashboard responses, SQL execution failures, and rule/KPI management API failures.

### C. Grant Azure platform permissions

Grant the App Service Managed Identity access to:

- Azure Key Vault secret read access
- Event Hub send permission
- Databricks access needed for cluster/job APIs and SQL warehouse queries
- Microsoft Graph application permissions required for Azure AD group import, such as group directory read access, with admin consent

Grant the local developer or release engineer access needed for smoke testing.

### D. Populate secrets in Key Vault

Create the following Key Vault secrets because they are referenced directly by code:

- `kv-data-integrity-ad-scope`
- `kv-data-integrity-adb-server-hostname`
- `kv-data-integrity-adb-http-path`
- `kv-data-integrity-adb-dq-notebook-job-id`
- `kv-data-integrity-adb-drift-notebook-job-id`
- `kv-data-integrity-adb-kpi-notebook-job-id`
- `kv-data-integrity-adb-functions-notebook-job-id`
- `kv-data-integrity-adb-cluster-id`
- `kv-data-integrity-eventhub-namespace`
- `kv-data-integrity-eventhub-name`
- `kv-data-integrity-splunk-service-base-url`
- `kv-data-integrity-splunk-function-secret`

If the target environment uses different naming conventions, either preserve these exact names or change the application code consistently before deployment.

### E. Configure App Service application settings

At minimum configure:

- `ENVIRONMENT` to a non-local value such as `production`
- `KEY_VAULT_URL`
- any hosted RBAC cache setting override, if `RBAC_CACHE_TTL_MS` should differ from the default

Only keep app settings that are still required directly by code in hosted mode.

### F. Deploy the application build

Current deployment sequence:

1. Install dependencies: `npm install`
2. Build application: `npm run build`
3. Start application: `npm run start`

The target hosting model must support a standard Next.js server process.

### G. Configure authentication

Because the app calls `/.auth/me`, enable App Service authentication and validate:

- login redirects work
- authenticated users can access dashboard routes
- `/.auth/me` returns expected claims
- `/api/me` returns the expected dashboard user, permissions, groups, roles, scopes, and Super Admin status

### H. Post-deployment smoke tests

Validate:

- root redirect to `/home/executive-dashboard`
- Executive Dashboard loads
- Data Quality summary and detailed pages load
- KPI summary and detailed pages load
- Pipelines page loads and returns data
- Governance page loads tabs
- Data Refresh page loads and helper action button behavior is correct
- Rules Management can read datasets
- Roles Management page shows only permitted tabs
- Roles Management users/groups/roles/permissions CRUD actions work for an authorized admin
- role-permission, user-role, group-scope, and Super Admin assignment flows work
- Azure AD group import works if enabled for the environment
- KPI Config Management can read filters and details
- cluster status and SSE event streaming work

### I. Production readiness checks

Before signoff confirm:

- no secrets are stored in repo or deployment scripts
- Managed Identity resolves successfully
- Key Vault access works from App Service
- Event Hub logs are visible downstream
- `dashboard_audit_log` receives API access, authorization, and CRUD audit events
- Databricks SQL queries work from hosted app
- Databricks job trigger APIs work from hosted app
- Microsoft Graph group import works from hosted app identity, if used
- Splunk integration responds from hosted app network path

## 16. Fast Start for a Fresher Engineer

If you are joining this project, start in this order:

1. Read this guide fully
2. Run the app locally
3. Open each main page once
4. Trace one request end-to-end:
   `page -> hook -> service -> API route -> Databricks/Azure helper`
5. Review `constants/config.ts`, `constants/routes.ts`, and `types/api.ts`
6. Review `lib/rbac/README.md` and `lib/rbac/*` to understand authorization and audit behavior
7. Review `lib/azure/*` to understand production dependencies
8. Make a small non-risky UI change first
9. Then make one small backend API change with local validation

## 17. Files a New Engineer Should Read First

- `package.json`
- `next.config.ts`
- `app/layout.tsx`
- `app/home/layout.tsx`
- `layouts/AppLayout.tsx`
- `layouts/HomeLayout.tsx`
- `lib/apiClient.ts`
- `lib/rbac/README.md`
- `lib/rbac/authorize.ts`
- `lib/rbac/policies.ts`
- `lib/rbac/repository.ts`
- `lib/rbac/managementScope.ts`
- `lib/rbac/audit.ts`
- `lib/azure/credential.ts`
- `lib/azure/keyvault.ts`
- `lib/azure/databricksClient.ts`
- `lib/azure/graphClient.ts`
- `lib/services/greatExpectationsService.ts`
- `lib/services/rolesManagementService.ts`
- `hooks/useQualityDashboard.ts`
- `hooks/useKpiDashboard.ts`
- `hooks/usePipelineDashboard.ts`
- `hooks/useRolesManagement.ts`
- `hooks/usePermissions.ts`
- `hooks/hasPagePermissions.ts`
- `types/api.ts`
- `store/DQDDetailedViewFiltersStore.ts`
- `store/kpiDetailedViewFiltersStore.ts`

## 18. Final Notes

This project is functional and reasonably structured, but it is operationally dependent on external Azure and Databricks services and currently lacks deployment automation and automated testing. A fresher engineer can become productive quickly if they understand the `page -> hook -> service -> API -> Azure/Databricks` flow and avoid changing integration code blindly.

The most important engineering priority after onboarding should be securing secrets and documenting or automating deployment properly.
