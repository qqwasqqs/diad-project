/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 21 January 2026 
  Purpose of the script: 
    This script provides a service layer for interacting with Databricks jobs and configurations.
    - Determining which Databricks workspace and notebook job should run based on the type of data rule (Data Quality, Data Drift, KPI checks, etc.).
    - Securely retrieving sensitive configuration values (like server URLs and job IDs) from Azure Key Vault in production, while using environment variables during local development.
    - Handling secure authentication using Azure Active Directory tokens before making any request to Databricks.
    - Triggering Databricks jobs with the correct parameters.
    - Checking job status, cluster status, and cluster activity events.
    - Starting clusters when needed.

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  axios
    - What it is: A popular HTTP client library for JavaScript/TypeScript
      used to make network requests (GET/POST/etc.) from the browser or Node.
    - Why used here: We create a single `axios` instance configured with
      headers and interceptors so all API calls in the app share consistent
      behavior (JSON headers, logging, error handling, correlation IDs).
*/
import axios from "axios";
// axios is a tool that lets our system talk to other systems over the internet
// Think of it like a courier that delivers our request letters and brings back responses

/*
  @/lib/azure/ADToken
    - What it is:
        A local module that implements the authentication logic to retrieve a Databricks
        access token depending on runtime environment (local vs Azure).

    - Why used:
        To securely authenticate Databricks SQL connections by acquiring:
          - AAD access token via Service Principal (local development)
          - Databricks token / PAT via Managed Identity (Azure production runtime)
*/
import { getDatabricksAADToken } from "@/lib/azure/ADToken";
// This function gets a secure login token from Azure Active Directory
// Similar to getting a temporary access badge to enter a secure office

/*
  @/lib/azure/keyvault
    - What it is:
        A local module that contains helper functions to securely retrieve
        secrets from Azure Key Vault (e.g., getSecret).

    - Why used:
        To avoid hardcoding sensitive configuration (such as Event Hub namespace
        and name) and instead load them securely from Key Vault at runtime.
*/
import { getSecret } from "@/lib/azure/keyvault";
// This function retrieves secrets from Azure Key Vault
// Like opening a company vault to fetch a password or key securely

/**
 * Configuration map for environment-specific settings.
 * Maps logical config keys to their local environment variable names
 * and Azure Key Vault secret names for production deployments.
 *
 * @example
 * CONFIG_MAP['DATABRICKS_HOST'].local => 'DATABRICKS_SERVER_HOSTNAME' (env var)
 * CONFIG_MAP['DATABRICKS_HOST'].nonLocal => 'kv-data-integrity-adb-server-hostname' (Key Vault)
 */
const CONFIG_MAP: Record<string, { local: string; nonLocal: string }> = {
  // Databricks workspace hostname/server URL configuration
  DATABRICKS_HOST: {
    local: "DATABRICKS_SERVER_HOSTNAME", // Local dev env variable name
    nonLocal: "kv-data-integrity-adb-server-hostname", // Azure Key Vault secret name
  },
  // Job ID for Data Quality rule execution notebooks
  DATABRICKS_DQ_JOB_ID: {
    local: "DATABRICKS_DQ_NOTEBOOK_JOB_ID", // Local env variable for DQ job
    nonLocal: "kv-data-integrity-adb-dq-notebook-job-id", // Key Vault secret for DQ job
  },
  // Job ID for Data Drift detection notebooks
  DATABRICKS_DRIFT_JOB_ID: {
    local: "DATABRICKS_DRIFT_NOTEBOOK_JOB_ID", // Local env variable for Drift job
    nonLocal: "kv-data-integrity-adb-drift-notebook-job-id", // Key Vault secret for Drift job
  },
  // Job ID for KPI (Key Performance Indicator) check notebooks
  DATABRICKS_KPI_JOB_ID: {
    local: "DATABRICKS_KPI_NOTEBOOK_JOB_ID", // Local env variable for KPI job
    nonLocal: "kv-data-integrity-adb-kpi-notebook-job-id", // Key Vault secret for KPI job
  },
  // Databricks cluster identifier for job execution
  DATABRICKS_CLUSTER_ID: {
    local: "DATABRICKS_CLUSTER_ID", // Local env variable for cluster ID
    nonLocal: "kv-data-integrity-adb-cluster-id", // Key Vault secret for cluster ID
  },
  // Job Id to run helper functions job 
  DATABRICKS_HELPER_FUNCTIONS_JOB_ID: {
    local: "DATABRICKS_HELPER_FUNCTIONS_NOTEBOOK_JOB_ID", //Local env variable for job
    nonLocal: "kv-data-integrity-adb-functions-notebook-job-id" // Key Vault secret
  },
};

/**
 * Retrieves configuration values from either local environment variables or Azure Key Vault
 * based on the runtime environment (local development vs. production Azure).
 *
 * @param {string} key - The logical configuration key (e.g., 'DATABRICKS_HOST')
 * @returns {Promise<string>} The configuration value from env var or Key Vault
 * @throws {Error} If the configuration value is missing or not found
 *
 * @example
 * // Local environment - reads from process.env.DATABRICKS_SERVER_HOSTNAME
 * const host = await getConfigValue('DATABRICKS_HOST');
 *
 * @example
 * // Production environment - retrieves from Azure Key Vault secret
 * const jobId = await getConfigValue('DATABRICKS_DQ_JOB_ID');
 */
async function getConfigValue(key: string): Promise<string> {
  // Get the current runtime environment from ENVIRONMENT variable
  const environment = process.env.ENVIRONMENT;
  // Determine if running in local development mode (vs production Azure)
  const isLocal = environment === "local";
  // Select the appropriate config name based on environment (env var name or Key Vault secret name)
  const configName = isLocal ? CONFIG_MAP[key].local : CONFIG_MAP[key].nonLocal;

  // Retrieve the value from either process.env (local) or Azure Key Vault (production)
  const value = isLocal ? process.env[configName] : await getSecret(configName);

  // Validate that the configuration value exists; throw error if missing
  if (!value) {
    throw new Error(
      `Missing config value for ${key} (${configName}) in ${isLocal ? "local" : "nonLocal"} environment`,
    );
  }

  // Return the successfully retrieved configuration value
  return value;
}

/**
 * Databricks notebook service providing methods to interact with Databricks jobs,
 * clusters, and their status/events. Handles authentication, job triggering,
 * cluster management, and monitoring.
 */
export const databricksNotebookService = {
  /**
   * Loads the Databricks notebook configuration (base URL and job ID) based on the rule category.
   * Determines which Databricks job should execute based on the data quality rule type.
   *
   * @param {string} ruleCategory - Type of data rule: 'data_drift', 'KPI', or default 'data_quality'
   * @returns {Promise<Object>} Object containing { baseUrl, jobId } for Databricks API calls
   * @throws {Error} If configuration values cannot be retrieved
   *
   * @example
   * const config = await databricksNotebookService.loadDatabricksNotebookConfiguration('data_drift');
   * console.log(config); // { baseUrl: 'adb-1234567890.azuredatabricks.net', jobId: '987654' }
   */
  async loadDatabricksNotebookConfiguration(
    ruleCategory: string,
  ): Promise<any> {
    // Log that configuration loading has started for debugging purposes
    console.debug("Loading Databricks notebook configuration...");

    // Retrieve the Databricks workspace hostname/server URL from config
    const baseUrl = await getConfigValue("DATABRICKS_HOST");

    // Initialize jobId variable to store the appropriate job identifier
    let jobId: string;
    // Determine which Databricks job ID to use based on the rule category
    switch (ruleCategory) {
      // For data drift detection rules, use the drift-specific job ID
      case "data_drift":
        jobId = await getConfigValue("DATABRICKS_DRIFT_JOB_ID");
        break;
      // For KPI checks, use the KPI-specific job ID
      case "KPI":
        jobId = await getConfigValue("DATABRICKS_KPI_JOB_ID");
        break;
      // For helper function, use the specific job id
      case "helper_function":
        jobId = await getConfigValue("DATABRICKS_HELPER_FUNCTIONS_JOB_ID");
        break;
      // For all other cases (data quality checks), use the default DQ job ID
      default:
        jobId = await getConfigValue("DATABRICKS_DQ_JOB_ID");
    }

    // Log successful configuration loading for audit/debugging
    console.debug("Databricks configuration loaded successfully.");
    // Return the configuration object with base URL and job ID needed for API calls
    return { baseUrl, jobId };
  },

  /**
   * Triggers a Databricks notebook job execution with the provided payload parameters.
   * Authenticates via Azure AD, retrieves job configuration, and submits a run-now request.
   *
   * @param {any} payload - Job parameters including RULE_CATEGORY and other config data
   * @returns {Promise<any>} Response from Databricks API containing run_id and job details
   * @throws {Error} If job triggering fails due to auth, config, or API errors
   *
   * @example
   * const result = await databricksNotebookService.triggerDatabricksJob({
   *   RULE_CATEGORY: 'data_drift',
   *   TABLE_NAME: 'customer_data',
   *   THRESHOLD: '0.05'
   * });
   * console.log(result.run_id); // '123456789'
   */
  async triggerDatabricksJob(payload: any): Promise<any> {
    // Log the start of job triggering operation for debugging
    console.debug("Triggering Databricks job...");

    try {
      // Acquire an Azure AD bearer token for Databricks API authentication
      const accessToken = await getDatabricksAADToken();
      // Prepare HTTP headers with authentication token and content type
      const headers = {
        Authorization: `Bearer ${accessToken}`, // Azure AD token for secure API access
        "Content-Type": "application/json", // Specify JSON request format
      };

      // Load the appropriate Databricks notebook configuration based on rule type
      const { baseUrl, jobId } = await this.loadDatabricksNotebookConfiguration(
        payload?.RULE_CATEGORY,
      );

      // Construct the Databricks API endpoint URL for triggering an immediate job run
      const runNowApiUrl = `https://${baseUrl}/api/2.2/jobs/run-now`;

      // Build the request payload with job ID and parameters
      const data = {
        job_id: jobId, // Databricks notebook job ID to execute
        job_parameters: payload, // Pass the incoming payload as job parameters to Databricks
      };

      // Log the job payload for debugging and audit trail purposes
      console.log("Databricks notebook job payload:", data);

      // Make the HTTP POST request to Databricks API to trigger the job
      const response = await axios.post(runNowApiUrl, data, { headers });
      // Log successful job trigger for monitoring and audit purposes
      console.info("Databricks job triggered successfully.");

      // Return the API response containing run_id and other job details
      return response.data;
    } catch (error) {
      // Log the error details for troubleshooting and debugging
      console.error("Error triggering Databricks job:", error);
      // Throw a wrapped error with context-specific message for caller handling
      throw new Error(`Failed to trigger the Databricks job: ${error}`);
    }
  },

  /**
   * Fetches the current status and details of a Databricks job run by its run ID.
   * Queries Databricks API for job execution progress, state, and outcome.
   *
   * @param {string} accessToken - Azure AD bearer token for API authentication
   * @param {string} runId - The unique identifier of the Databricks job run to check
   * @returns {Promise<any>} Job run details including state, result, and execution info
   * @throws {Error} If the API call fails or run ID is invalid
   *
   * @example
   * const token = await getDatabricksAADToken();
   * const status = await databricksNotebookService.getDatabricksJobStatus(token, '123456789');
   * console.log(status.state); // 'RUNNING' | 'SUCCESS' | 'FAILED'
   */
  async getDatabricksJobStatus(
    accessToken: string,
    runId: string,
  ): Promise<any> {
    // Log the start of status fetch operation for debugging
    console.debug("Fetching Databricks job status...");

    try {
      // Prepare HTTP headers with authentication token and content type
      const headers = {
        Authorization: `Bearer ${accessToken}`, // Azure AD token for secure API access
        "Content-Type": "application/json", // Specify JSON response format
      };

      // Retrieve the Databricks workspace hostname from configuration
      const baseUrl = await getConfigValue("DATABRICKS_HOST");

      // Construct the Databricks API endpoint URL for retrieving job run status
      const runNowApiUrl = `https://${baseUrl}/api/2.2/jobs/runs/get`;

      // Make the HTTP GET request with run_id as query parameter to fetch job status
      const response = await axios.get(runNowApiUrl, {
        headers,
        params: { run_id: runId },
      });
      // Log successful status fetch for monitoring and audit purposes
      console.info("Databricks job status fetched successfully.");

      // Return the API response containing full job run details
      return response.data;
    } catch (error) {
      // Log the error details for troubleshooting
      console.error("Error fetching Databricks job status:", error);
      // Throw a wrapped error with context-specific message for caller handling
      throw new Error(`Failed to fetch Databricks job status: ${error}`);
    }
  },

  /**
   * Retrieves the current operational status of the Databricks cluster.
   * Checks if cluster is running, terminated, or in a transitional state.
   *
   * @returns {Promise<any>} Cluster details including state, node count, creation time, etc.
   * @throws {Error} If cluster ID cannot be retrieved or API call fails
   *
   * @example
   * const clusterStatus = await databricksNotebookService.getDatabricksClusterStatus();
   * console.log(clusterStatus.state); // 'RUNNING' | 'PENDING' | 'TERMINATING'
   */
  async getDatabricksClusterStatus(): Promise<any> {
    // Log the start of cluster status fetch operation for debugging
    console.debug("Fetching Databricks cluster status...");

    try {
      // Acquire an Azure AD bearer token for Databricks API authentication
      const accessToken = await getDatabricksAADToken();
      // Prepare HTTP headers with authentication token and content type
      const headers = {
        Authorization: `Bearer ${accessToken}`, // Azure AD token for secure API access
        "Content-Type": "application/json", // Specify JSON response format
      };

      // Retrieve the Databricks workspace hostname from configuration
      const baseUrl = await getConfigValue("DATABRICKS_HOST");
      // Retrieve the cluster ID to check status for
      const clusterId = await getConfigValue("DATABRICKS_CLUSTER_ID");

      // Construct the Databricks API endpoint URL for cluster status
      const runNowApiUrl = `https://${baseUrl}/api/2.1/clusters/get`;

      // Make the HTTP GET request with cluster_id to fetch current cluster status
      const response = await axios.get(runNowApiUrl, {
        headers,
        params: { cluster_id: clusterId },
      });
      // Log successful status fetch for monitoring and audit purposes
      console.info("Databricks cluster status fetched successfully.");

      // Return the API response containing full cluster details and state
      return response.data;
    } catch (error) {
      // Log the error details for troubleshooting
      console.error("Error fetching Databricks cluster status:", error);
      // Throw a wrapped error with context-specific message for caller handling
      throw new Error(`Failed to fetch Databricks cluster status: ${error}`);
    }
  },

  /**
   * Starts the Databricks cluster if it is currently in a stopped/terminated state.
   * Initiates cluster provisioning and allows jobs to execute on it.
   *
   * @returns {Promise<any>} API response confirming cluster start request
   * @throws {Error} If cluster ID cannot be retrieved or start request fails
   *
   * @example
   * const result = await databricksNotebookService.startDatabricksCluster();
   * console.log(result); // { cluster_id: 'abc-123-def-456' }
   */
  async startDatabricksCluster(): Promise<any> {
    // Log the start of cluster startup operation for debugging
    console.debug("Starting Databricks cluster...");

    try {
      // Acquire an Azure AD bearer token for Databricks API authentication
      const accessToken = await getDatabricksAADToken();
      // Prepare HTTP headers with authentication token and content type
      const headers = {
        Authorization: `Bearer ${accessToken}`, // Azure AD token for secure API access
        "Content-Type": "application/json", // Specify JSON request format
      };

      // Retrieve the Databricks workspace hostname from configuration
      const baseUrl = await getConfigValue("DATABRICKS_HOST");
      // Retrieve the cluster ID to start
      const clusterId = await getConfigValue("DATABRICKS_CLUSTER_ID");

      // Construct the Databricks API endpoint URL for cluster start operation
      const runNowApiUrl = `https://${baseUrl}/api/2.1/clusters/start`;

      // Build the request payload with the cluster ID to start
      const data = {
        cluster_id: clusterId, // Databricks cluster identifier to start
      };

      // Make the HTTP POST request to Databricks API to initiate cluster startup
      const response = await axios.post(runNowApiUrl, data, { headers });
      // Log successful cluster start request for monitoring and audit purposes
      console.info("Databricks cluster started successfully.");

      // Return the API response confirming cluster start request
      return response.data;
    } catch (error) {
      // Log the error details for troubleshooting
      console.error("Error starting Databricks cluster:", error);
      // Throw a wrapped error with context-specific message for caller handling
      throw new Error(`Failed to start Databricks cluster: ${error}`);
    }
  },

  /**
   * Retrieves cluster activity events within a time range with pagination support.
   * Fetches events like cluster start, termination, autoscaling, failures, etc.
   *
   * @param {string} accessToken - Azure AD bearer token for API authentication
   * @param {number} startTime - Timestamp in milliseconds to start fetching events from
   * @param {string} pageToken - Pagination token for retrieving subsequent event pages
   * @returns {Promise<any>} Event list with next_page_token for pagination
   * @throws {Error} If API call fails or parameters are invalid
   *
   * @example
   * const token = await getDatabricksAADToken();
   * const now = Date.now();
   * const events = await databricksNotebookService.getDatabricksClusterEvents(
   *   token,
   *   now - 3600000, // Last 1 hour
   *   '' // First page
   * );
   * console.log(events.events); // Array of cluster events
   */
  async getDatabricksClusterEvents(
    accessToken: string,
    startTime: number,
    pageToken: string,
  ): Promise<any> {
    // Log the start of events fetch operation for debugging
    console.debug("Fetching Databricks cluster events...");

    try {
      // Prepare HTTP headers with authentication token and content type
      const headers = {
        Authorization: `Bearer ${accessToken}`, // Azure AD token for secure API access
        "Content-Type": "application/json", // Specify JSON request format
      };

      // Retrieve the Databricks workspace hostname from configuration
      const baseUrl = await getConfigValue("DATABRICKS_HOST");
      // Retrieve the cluster ID to fetch events for
      const clusterId = await getConfigValue("DATABRICKS_CLUSTER_ID");

      // Construct the Databricks API endpoint URL for cluster events
      const runNowApiUrl = `https://${baseUrl}/api/2.1/clusters/events`;

      // Build the request payload with filters and pagination parameters
      const data = {
        cluster_id: clusterId, // Cluster ID to fetch events for
        start_time: startTime, // Timestamp in milliseconds to start from
        order: "ASC", // Return events in ascending time order (oldest first)
        page_size: 50, // Number of events to return per API call
        page_token: pageToken, // Token for pagination (empty string for first page)
      };

      // Make the HTTP POST request to Databricks API to fetch cluster events
      const response = await axios.post(runNowApiUrl, data, { headers });
      // Log successful events fetch for monitoring purposes
      console.info("Databricks cluster events fetched successfully.");

      // Return the API response containing event list and pagination token
      return response.data;
    } catch (error) {
      // Log the error details for troubleshooting
      console.error("Error fetching Databricks cluster events:", error);
      // Throw a wrapped error with context-specific message for caller handling
      throw new Error(`Failed to fetch Databricks cluster events: ${error}`);
    }
  },
};
