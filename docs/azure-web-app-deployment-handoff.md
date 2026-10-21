# Azure Web App Deployment Handoff

## Purpose

This document describes how to build and deploy the Data Integrity Automation Dashboard to Azure App Service (Azure Web App).

The application is a Node.js/Next.js application. It is not a Python application and does not use `requirements.txt`, `pip`, Flask, FastAPI, Gunicorn, or Uvicorn. The existing `OpenAI_container_template.yaml` pipeline template is therefore not compatible with this application unless it is replaced or adapted for a Node.js/Next.js Azure Web App deployment.

## Application runtime

- Application type: Next.js App Router application with server-side API routes
- Next.js: 16.2.4
- React: 19.2.5
- Package manager: npm
- Dependency lock file: `package-lock.json`
- Recommended App Service operating system: Linux
- Recommended Node.js runtime: Node.js 20 LTS or a newer version supported by Next.js 16
- Default application port: provided by Azure through the `PORT` environment variable
- Startup command: `npm run start`
- This is not a static website. The deployment must run the Next.js Node.js server.

## Source branch and pipeline trigger

The deployment pipeline should trigger when changes are merged into `master`.

The current pipeline YAML needs to be reviewed before use:

- It currently includes `master`, `dev`, and `main` as triggers.
- Our development branch is named `develop`, not `dev`.
- The current variable group condition applies only to `dev`.
- The current job uses `OpenAI_container_template.yaml`, which appears to target a different Python/container application.

For the requested deployment flow, the production/deployment pipeline should use `master` as its trigger. If a separate development deployment is required later, it should be configured explicitly for `develop` with its own Azure Web App and variable group.

## Build steps

Run these commands from the repository root:

```bash
npm ci
npm run build
```

`npm ci` should be used in the pipeline because the repository contains `package-lock.json`. It provides a clean, repeatable dependency installation.

The build output is created in `.next/`.

## Deployment and startup

Deploy the built Next.js application to an Azure Web App configured for the Node.js runtime.

The deployed package must contain everything needed by `npm run start`, including:

- `.next/`
- `public/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- production runtime dependencies

There are two acceptable pipeline approaches:

1. Build and package the application on a Linux pipeline agent, install/prune production dependencies, and deploy the prepared artifact.
2. Deploy the source package and let Azure App Service/Oryx install dependencies and build it during deployment.

The first approach gives the pipeline more control and makes build failures visible before deployment. Because `@databricks/sql` uses the native `lz4` dependency, dependency installation and artifact creation should occur on Linux when deploying to a Linux Web App.

The App Service startup command should be:

```bash
npm run start
```

Do not configure a Python startup command such as Gunicorn or Uvicorn.

## Azure Web App configuration

The Azure Web App should have:

- A Linux Node.js runtime compatible with Next.js 16
- App Service Authentication (Easy Auth) enabled with Azure Entra ID
- A system-assigned or approved user-assigned Managed Identity enabled
- HTTPS-only enabled
- Application logging enabled
- A deployment health/smoke-test step

The application uses Easy Auth headers to identify authenticated users. The authentication configuration must pass the authenticated principal headers to the application.

## App Service application settings

Configure these non-secret settings in Azure Web App Application Settings:

| Setting | Required value or purpose |
|---|---|
| `ENVIRONMENT` | A non-local value, for example `production` |
| `NEXT_PUBLIC_ENVIRONMENT` | Public environment label if required by the UI, for example `production` |
| `NEXT_PUBLIC_LOCAL_DESIGN_MODE` | `false` |
| `KEY_VAULT_URL` | URL of the environment's Azure Key Vault |
| `RBAC_CACHE_TTL_MS` | Optional; defaults to `60000` |
| `DASHBOARD_DATA_SOURCE` | Optional; omit or set to `splunk` for the hosted integration |

Do not set `ENVIRONMENT=local` in Azure. Local mode changes authentication and causes the application to expect local Service Principal credentials.

Any `NEXT_PUBLIC_*` value is included in browser-accessible code and must never contain a secret.

## Managed Identity and permissions

In a non-local environment, the application uses Azure Managed Identity through `DefaultAzureCredential`. The Web App identity needs the following access:

- Azure Key Vault: permission to read the required secrets
- Azure Event Hubs: permission to send events
- Azure Databricks: permissions needed for SQL warehouse queries, clusters, jobs, catalogs, schemas, tables, and RBAC/audit tables
- Microsoft Graph: required group-directory read permissions, with admin consent, if Azure AD group import is enabled
- Network access to the Databricks and Splunk-related endpoints used by the application

The App Service identity, rather than a developer's local Service Principal credentials, should be used in Azure.

## Key Vault secrets

The application expects the following secret names in the target Key Vault:

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

The secret values must be entered through an approved secure process. They must not be committed to source control, copied into pipeline YAML, posted in Teams, or included in deployment artifacts.

## Files that must not be used for this deployment

- The Python `requirements.txt` from the Value Access/OpenAI application
- Python package installation commands
- Flask, FastAPI, Quart, Gunicorn, or Uvicorn startup commands
- The current OpenAI container pipeline template unless DevOps confirms it has been changed to support this Node.js Azure Web App
- A developer's local `.env` file

The repository's `.env.example` can be used as a reference for setting names because it contains placeholders rather than real credentials.

## Recommended pipeline stages

1. Trigger on an update to `master`.
2. Check out the repository.
3. Select the agreed Node.js runtime.
4. Run `npm ci`.
5. Run `npm run build`.
6. Prepare the Azure Web App deployment artifact.
7. Deploy the artifact to the target Azure Web App.
8. Start or restart the application with `npm run start`.
9. Run smoke tests.
10. Retain build and deployment logs.

The pipeline should fail immediately if dependency installation, compilation, packaging, deployment, or smoke testing fails.

## Minimum smoke tests

After deployment, verify:

- The Web App starts successfully and remains healthy.
- The root URL responds and redirects into the dashboard.
- Azure Entra ID sign-in works through App Service Authentication.
- `/.auth/me` returns the authenticated user's claims.
- `/api/me` resolves the user and RBAC permissions.
- The application can read secrets from Key Vault using Managed Identity.
- Databricks SQL queries and required job/cluster operations work.
- Splunk-backed endpoints respond.
- Event Hub logging succeeds.
- No secrets appear in build or deployment logs.

## Information needed from DevOps

Please confirm:

1. The Azure Web App name, resource group, subscription, region, and deployment slot.
2. Whether the Web App uses a system-assigned or user-assigned Managed Identity.
3. The Node.js runtime version selected for the Web App and pipeline.
4. Whether the pipeline will deploy a prebuilt artifact or use App Service/Oryx to build during deployment.
5. The Azure DevOps variable group to use for `master`.
6. How Key Vault secrets and non-secret App Service settings will be provisioned.
7. Whether Easy Auth and the required identity permissions are included in the DevOps scope.
8. Who will run and approve the post-deployment smoke tests.

