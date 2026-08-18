/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 December 2025

  Purpose of the script:
    This service module handles Splunk-related API calls for the
    Teva Data Integrity dashboard.

    Key Responsibilities:
    - Fetches pipeline execution data from Splunk using saved searches.
    - Retrieves summary highlight metrics for pipeline runs.
    - Maps raw Splunk responses into strongly typed application models.
    - Ensures proper error handling and logging for debugging and traceability.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/types/api
    - What it is: Local TypeScript type definitions used across the application.
    - Why used: Provides compile-time guarantees about the structure of data
      returned from the Splunk service, ensuring type safety and consistency.
*/
import { PipelineDataSchema, PipelineHighlightsSplunk, RawPipelineHighlights } from "@/types/api";

/*
  axios
    - What it is: A promise-based HTTP client for making API requests.
    - Why used: Simplifies HTTP calls, request configuration, and response handling
      when communicating with the Splunk service endpoint.
*/
import axios from "axios";

/*
  @/lib/azure/keyvault
    - What it is:
        A local module that contains helper functions to securely retrieve
        secrets from Azure Key Vault (e.g., getSecret).

    - Why used:
        To avoid hardcoding sensitive configuration (such as Event Hub namespace
        and name) and instead load them securely from Key Vault at runtime.
*/
import { getSecret } from "@/lib/azure/keyvault"; // Utility to retrieve secrets from Azure Key Vault

/**
 * -------------------------------------------------------------
 * SPLUNK CONFIGURATION TYPES
 * -------------------------------------------------------------
 */

/**
 * Represents all configuration values required
 * to communicate with the Splunk backend service.
 */
interface SplunkConfiguration {
  /** Base URL of the Splunk service (Azure Function endpoint) */
  baseUrl: string;

  /** Function-level authentication secret */
  functionSecret: string;
}

/**
 * -------------------------------------------------------------
 * IN-MEMORY CONFIGURATION CACHE
 * -------------------------------------------------------------
 * These variables cache Splunk configuration once loaded.
 * This avoids repeated environment or Key Vault lookups
 * during the application lifecycle.
 */
let cachedSplunkBaseUrl: string | null = null;
let cachedSplunkFunctionSecret: string | null = null;

/**
 * -------------------------------------------------------------
 * loadSplunkConfiguration
 * -------------------------------------------------------------
 * Loads and validates Splunk configuration values.
 *
 * Why this function exists:
 * - Centralizes environment-based configuration loading
 * - Avoids repeated secret fetches
 * - Ensures configuration integrity before API calls
 *
 * Behavior:
 * - Returns cached values if already loaded
 * - Loads from `.env` in local environments
 * - Loads from Azure Key Vault in non-local environments
 *
 * Sample Output:
 * {
 *   baseUrl: "https://splunk-api.azurewebsites.net",
 *   functionSecret: "abc123"
 * }
 */
const loadSplunkConfiguration = async (): Promise<SplunkConfiguration> => {
  // Marks the very beginning of this function execution
  console.info("Starting loadSplunkConfiguration");

  // If configuration values were already loaded earlier,
  // we reuse them to avoid unnecessary work and network calls
  if (cachedSplunkBaseUrl && cachedSplunkFunctionSecret) {
    // Return cached configuration if available
    return {
      baseUrl: cachedSplunkBaseUrl, // Splunk Service Base URL
      functionSecret: cachedSplunkFunctionSecret, // Splunk Function Secret
    };
  }

  // Determines which environment the app is running in
  // Defaults to "unknown" if ENVIRONMENT is not set
  const runtimeEnvironment = process.env.ENVIRONMENT ?? "unknown";

  // If running locally (developer machine)
  if (runtimeEnvironment === "local") {
    /**
     * Local environment configuration:
     * Values are expected to be defined in `.env.local`
     */

    // Reads the Splunk base URL from local environment variables
    cachedSplunkBaseUrl = process.env.SPLUNK_SERVICE_BASE_URL ?? null;

    // Reads the Splunk function secret from local environment variables
    cachedSplunkFunctionSecret =
      process.env.SPLUNK_FUNCTION_SECRET ?? null;
  } else {
    /**
     * In non-local environments (DEV, QA, PROD):
     * - Secrets are securely fetched from Azure Key Vault
     * - This avoids storing sensitive values in code or config files
     */

    // Fetches the Splunk base URL from Azure Key Vault
    cachedSplunkBaseUrl = await getSecret(
      "kv-data-integrity-splunk-service-base-url"
    );

    // Fetches the Splunk function secret from Azure Key Vault
    cachedSplunkFunctionSecret = await getSecret(
      "kv-data-integrity-splunk-function-secret"
    );
  }

  // Final safety check to ensure required values exist
  if (!cachedSplunkBaseUrl || !cachedSplunkFunctionSecret) {
    // Logs detailed error information for troubleshooting
    console.error("Splunk configuration validation failed", {
      cachedSplunkBaseUrl,
      cachedSplunkFunctionSecret,
    });

    // Stops execution and reports a clear error
    throw new Error("Missing required Splunk configuration values");
  }

  // Confirms configuration is valid and ready to use
  console.info("Splunk configuration loaded successfully");

  // Returns the validated configuration object
  return {
    baseUrl: cachedSplunkBaseUrl, // Splunk Service Base URL
    functionSecret: cachedSplunkFunctionSecret, // Splunk Function Secret
  };
};

// ---------------------------------------------------------------------
// SERVICE
// ---------------------------------------------------------------------

/*
  fetchSplunkReport

// ---------------------------------------------------------------------
// SERVICE
// ---------------------------------------------------------------------

/*
  fetchSplunkReport
    - What it is: A service object that groups all Splunk-related API methods.
    - Why used: Encapsulates network calls in a single module so UI components
      and hooks can consume clean, high-level functions instead of raw HTTP logic.
*/
export const fetchSplunkReport = {

  /**
   * getReport
   *
   * Fetches detailed pipeline execution data from Splunk using a saved search.
   * This function retrieves raw pipeline records which are then used by the dashboard
   * to populate tables, charts, and other analytical views.
   *
   * @param savedSearchName - The name of the Splunk saved search to execute.
   *
   * @returns {Promise<PipelineDataSchema[]>}
   *   A promise that resolves to an array of pipeline data objects.
   *
   * Sample Input:
   *   "pipeline_execution_report"
   *
   * Sample Output:
   *   [
   *     { pipelineName: "ADF_Pipeline_1", status: "Succeeded", duration: 120 },
   *     { pipelineName: "ADF_Pipeline_2", status: "Failed", duration: 85 }
   *   ]
   */
  async getReport(savedSearchName: string): Promise<PipelineDataSchema[]> {
    // Begins a try/catch block to safely handle API errors and unexpected failures
    try {
      // Loads Splunk configuration (base URL and secret)
      const { baseUrl, functionSecret } = await loadSplunkConfiguration();

      // Calls the Splunk API endpoint using HTTP GET
      const { data } = await axios.get(`${baseUrl}/api/splunk/report`, {
        params: {
          // Function key used for authenticating with the Splunk service
          code: functionSecret,

          // Name of the saved search (Splunk Report) that Splunk should execute
          saved_search_name: savedSearchName,
        },
      });

      // Validates that the response contains a non-empty `results` array
      if (!data.results?.length) {
        // Throws an error if no results are returned from Splunk
        throw new Error("No results in Splunk report");
      }

      // Returns the results array typed as PipelineDataSchema[]
      return data.results;

    } catch (error) {
      // Logs the error to the console for debugging and operational visibility
      console.error("Error in getReport:", error);

      // Re-throws the original error so upstream callers (hooks/components)
      // can handle it appropriately (e.g., show error message, retry, etc.)
      throw error;
    }
  },

  /**
   * getHighlights
   *
   * Fetches high-level pipeline execution metrics from Splunk using a saved search.
   * This method is typically used to populate summary cards or KPI widgets in the dashboard.
   *
   * @param savedSearchName - The name of the Splunk saved search to execute.
   *
   * @returns {Promise<PipelineHighlights>}
   *   A promise that resolves to a cleaned and typed highlights object.
   *
   * Sample Input:
   *   "pipeline_highlights_report"
   *
   * Sample Output:
   *   {
   *     totalRuns: 250,
   *     succeededRuns: 230,
   *     failedRuns: 20
   *   }
   */
  async getHighlights(savedSearchName: string): Promise<PipelineHighlightsSplunk> {
    // Begins a try/catch block to safely handle API errors and unexpected failures
    try {
      // Loads Splunk configuration (base URL and secret)
      const { baseUrl, functionSecret } = await loadSplunkConfiguration();

      // Calls the Splunk API endpoint using HTTP GET
      const { data, status } = await axios.get(`${baseUrl}/api/splunk/report`, {
        params: {
          // Function key used for authenticating with the Splunk service
          code: functionSecret,

          // Name of the saved search (Splunk Report) that Splunk should execute
          saved_search_name: savedSearchName,
        },
      });

      // Checks that the HTTP response status is 200 (OK)
      if (status !== 200) {
        // Throws an error if the Splunk API responds with a non-success status code
        throw new Error(`Splunk API failed with status ${status}`);
      }

      // Validates that the response contains at least one result
      if (!data.results?.length) {
        // Throws an error if no highlight data is returned from Splunk
        throw new Error("No highlights data returned from Splunk");
      }

      // Extracts the first result entry and casts it to the raw highlights type
      const raw = data.results[0] as RawPipelineHighlights;

      // Maps the raw Splunk response into a clean, strongly typed object
      // with safe numeric conversions and default fallbacks
      return {
        // Converts total pipeline runs to a number or defaults to 0
        totalRuns: Number(raw["Total Pipeline Runs"]) || 0,

        // Converts succeeded pipeline runs to a number or defaults to 0
        succeededRuns: Number(raw["Succeeded Pipeline Runs"]) || 0,

        // Converts failed pipeline runs to a number or defaults to 0
        failedRuns: Number(raw["Failed Pipeline Runs"]) || 0,
      };

    } catch (error) {
      // Logs the error to the console for debugging and traceability
      console.error("Error in getHighlights:", error);

      // Re-throws the original error so that calling layers can handle failures
      throw error;
    }
  },

  /**
   * postSplunkQuery
   * 
   * runs the splunk query required to fetch different data in various format
   * required in the UI in pipelines dashboard page.
   * 
   * @param searchQuery - query that needs to run in splunk to get the specific data
   * @param startTime   - start time of the time range
   * @param endTime     - end time of the time range
   * @returns 
   *  Data requested by the frontend by running the queries.
   */
  async postSplunkQuery(searchQuery: string, startTime: string, endTime: string): Promise<any> {
    // Begins a try/catch block to safely handle API errors and unexpected failures
    try {
      // Loads Splunk configuration (base URL and secret)
      const { baseUrl, functionSecret } = await loadSplunkConfiguration();

      // Calls the Splunk API endpoint using HTTP GET
      const { data } = await axios.post(`${baseUrl}/api/splunk/query`,
        {
          SEARCH_QUERY: searchQuery,
          START_TIME: startTime,
          END_TIME: endTime,
        }
        , {
          params: {
            // Function key used for authenticating with the Splunk service
            code: functionSecret
          },
        });

      // Returns the results array typed as PipelineDataSchema[]
      return data;

    } catch (error) {
      // Logs the error to the console for debugging and operational visibility
      console.error("Error in Post Query:", error);

      // Re-throws the original error so upstream callers (hooks/components)
      // can handle it appropriately (e.g., show error message, retry, etc.)
      throw error;
    }
  },
};
