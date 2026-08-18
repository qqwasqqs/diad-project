/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026
  Purpose of the script: 
    This service script handles API requests for the Rules Management Page and KPI Configuration Management Page, which provides information on rules configured in datasets, 
    and monitoring the rules, along with functionality to add new rules, update the configured rules and registering new dataset.
    - The service functions include fetching details of registered datasets, metadata of selected dataset and configured rules details.
    - It uses `apiClient` for interacting with the backend APIs, structured around dataset metadata and rules.
    - This service helps retrieve data required for building the rules management section.
    - It also includes functions to manage KPI configurations and interact with Databricks cluster for rule execution.
    - The functions are designed to handle API responses and errors gracefully, providing informative logs for debugging and user feedback.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  ../apiClient
     - What it is: A module that provides a configured HTTP client for making API requests.
     - Why used: Centralizes API request logic, allowing for easier management of API calls and error handling.
*/
import apiClient from "../apiClient";

/*  
  @/types/api
    - What it is: TypeScript type definitions for the API responses used across the app.
    - Why used: Ensures functions return typed data, improving developer experience and catching type errors at compile time.
*/
import {
  Dataset,
  DatasetMetadata,
  Rule,
  Alert,
  RegisterDataset,
  NewRule,
  SuggestRules,
  KPIConfigurationFilters,
  KPIConfiguration,
} from "@/types/rule";
import { HelperFunctionsJobPayload } from "@/types/api";

// ----------------------------- CONSTANTS -----------------------------

// Base URLs for the respective API endpoint
const DATA_QUALITY_URL = "/api/great-expectations/data-quality";
const KPI_URL = "/api/great-expectations/kpi";
const CLUSTER_URL = "/api/great-expectations/cluster";

// The service responsible for handling all API interactions
// related to the Rules Management page of the application.
export const greatExpectationsService = {
  /**
   * Retrieves the list of all datasets that have been registered
   * in the rules management system.
   *
   * This endpoint is typically used to populate dataset selectors
   * or to display an overview of available datasets.
   *
   * @returns {Promise<Dataset[]>} - A promise that resolves to an array of registered datasets.
   *
   * Sample Input: None
   * Sample Output:
   * [
   *   {
   *     businessUnit: "Finance",
   *     catalogName: "CatalogA",
   *     schemaName: "Schema1",
   *     datasetName: "Transactions"
   *   }
   * ]
   */
  async getDataQualityRegistedDatasets(): Promise<Dataset[]> {
    console.info("Starting request to retrieve registered datasets..."); // Indicates API call initiation

    try {
      // Issues a GET request to fetch all datasets registered for rule configuration
      const response = await apiClient.get(
        `${DATA_QUALITY_URL}/registered-datasets`,
      );

      console.info("Registered datasets retrieved successfully."); // Confirms successful response

      return response.data; // Returns the dataset list received from the backend
    } catch (error) {
      console.error("Unable to retrieve registered datasets:", error); // Logs failure details

      throw new Error("An error occurred while loading registered datasets."); // Propagates a user-friendly error
    }
  },

  /**
   * Fetches detailed metadata for a specific dataset.
   *
   * Metadata includes structural information such as column names,
   * data types, and descriptive attributes required for rule creation.
   *
   * @param businessUnit - The business unit to which the dataset belongs.
   * @param catalogName - The catalog containing the dataset.
   * @param schemaName - The schema under the catalog.
   * @param datasetName - The dataset whose metadata is requested.
   *
   * @returns {Promise<DatasetMetadata>} - A promise resolving to dataset metadata details.
   *
   * Sample Input:
   * {
   *   businessUnit: "Finance",
   *   catalogName: "CatalogA",
   *   schemaName: "Schema1",
   *   datasetName: "Transactions"
   * }
   *
   * Sample Output:
   * {
   *   datasetName: "Transactions",
   *   columns: [
   *     { name: "amount", type: "decimal" },
   *     { name: "date", type: "date" }
   *   ]
   * }
   */
  async getDataQualityDatasetMetadata(
    businessUnit: string,
    catalogName: string | null,
    schemaName: string | null,
    datasetName: string,
  ): Promise<DatasetMetadata> {
    console.info(`Requesting metadata for dataset: ${datasetName}`); // Logs dataset context

    try {
      // Calls backend API with dataset identifiers as query parameters
      const response = await apiClient.get(
        `${DATA_QUALITY_URL}/dataset-metadata`,
        {
          params: { businessUnit, catalogName, schemaName, datasetName },
        },
      );

      console.info(`Metadata successfully loaded for dataset: ${datasetName}`); // Log the successful completion

      // API returns metadata as an array; first element contains the required object
      return response.data;
    } catch (error) {
      console.error(
        `Failed to load metadata for dataset ${datasetName}:`,
        error,
      ); // Log the error for debugging

      throw new Error(`Unable to fetch metadata for dataset ${datasetName}.`);
    } // Throw an error if something goes  wrong.
  },

  /**
   * Retrieves all rules that have been configured for a given dataset.
   *
   * This includes global and column-level rules, optionally filtered
   * by a specific target column.
   *
   * @param businessUnit - The business unit owning the dataset.
   * @param catalogName - The catalog name.
   * @param schemaName - The schema name.
   * @param datasetName - The dataset for which rules are requested.
   * @param targetColumn - (Optional) Column name to narrow down rules.
   *
   * @returns {Promise<Rule[]>} - A promise resolving to a list of configured rules.
   *
   * Sample Input:
   * {
   *   businessUnit: "Finance",
   *   catalogName: "CatalogA",
   *   schemaName: "Schema1",
   *   datasetName: "Transactions",
   *   targetColumn: "amount"
   * }
   *
   * Sample Output:
   * [
   *   { ruleName: "AmountNotNull", ruleType: "Completeness" },
   *   { ruleName: "AmountPositive", ruleType: "Validity" }
   * ]
   */
  async getDataQualityConfiguredRules(
    businessUnit: string,
    catalogName: string | null,
    schemaName: string | null,
    datasetName: string,
    targetColumn?: string,
  ): Promise<Rule[]> {
    console.info(`Loading configured rules for dataset: ${datasetName}`); // Indicates rules retrieval start

    try {
      // Requests configured rules using dataset context and optional column filter
      const response = await apiClient.get(
        `${DATA_QUALITY_URL}/configured-rules`,
        {
          params: {
            businessUnit,
            catalogName,
            schemaName,
            datasetName,
            targetColumn,
          },
        },
      );

      console.info(
        `Configured rules successfully retrieved for dataset: ${datasetName}`,
      ); // Log successful completion

      return response.data; // Returns rule configuration list
    } catch (error) {
      console.error(
        `Error while fetching configured rules for dataset ${datasetName}:`,
        error,
      ); // Log any error encountered

      throw new Error(
        `Unable to retrieve configured rules for dataset ${datasetName}.`,
      ); // Throw an error if something went wrong
    }
  },

  /**
   * Fetches all data quality alerts that are currently configured.
   *
   * These identifiers are typically used when associating rules
   * with notification or alerting mechanisms.
   *
   * @returns {Promise<Alert[]>} - A promise resolving to alert receiver IDs.
   *
   * Sample Input: None
   * Sample Output:
   * [
   *   { id: "alert-001", type: "Email" },
   *   { id: "alert-002", type: "Slack" }
   * ]
   */
  async getDataQualityConfiguredAlerts(): Promise<Alert[]> {
    console.info("Initiating request for receiver alert identifiers..."); // Logs request start

    try {
      // Sends request to retrieve all configured alert receivers
      const response = await apiClient.get(
        `${DATA_QUALITY_URL}/configured-alerts`,
      );

      console.info("Receiver alert identifiers fetched successfully."); // Log successful completion

      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      console.error("Failed to retrieve receiver alert identifiers:", error); // Log the error occured

      throw new Error(
        "An error occurred while fetching receiver alert identifiers.",
      ); // Throw an error if something goes wrong.
    }
  },

  /**
  * Register a new dataset to the rule configuration table.
  *
  * When the user wants to add a new dataset to which rules can be applied,
  * the UI uses this function to send the request to the backend.
  * 
  * @param payload - defined object which is required in the backend
  * 
  * @returns {Promise<any>} - A promise resolving to a user message.
  * 
  * Sample Input:
  *   payload = {
  *     businessUnit: "RND",
        datasetType: "TABLE"
        catalogName?: "dset_dev",
        schemaName?: "us_tables_schema",
        datasetName: "new_table"
      }
    
    Sample Output:
      A message such as "Dataset registered successfully."
  */
  async registerDataQualityDataset(payload: RegisterDataset): Promise<any> {
    console.info("Initiating request for registering new dataset..."); // Logs request start

    try {
      // send the payload to backend to register the new dataset
      const response = await apiClient.post(
        `${DATA_QUALITY_URL}/register-dataset`, // api endpoint for new dataset registration
        payload, // payload of dataset
      );

      // check if status is 200 then log the successful run
      if (response.status === 200) {
        console.info("New dataset registered successfully."); // Log successful completion
      }

      // return the response to the UI to tell the response to the user.
      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      // handle any errors
      console.error("Failed to register new dataset:", error); // Log the error occured

      throw new Error("An error occurred while registering a new dataset."); // Throw an error if something goes wrong.
    }
  },

  /**
  * Manage parameters of any configured rule of a dataset or add a new rule to the dataset.
  *
  * When the user wants to add a new rule to a dataset or update the already configured
  * rule according to the new requirements.
  * 
  * @param payload - defined object which is required in the backend
  * 
  * @returns {Promise<any>} - A promise resolving to a user message.
  * 
  * Sample Input:
  *   payload = {
            businessUnit: "RND",
            datasetType: "TABLE",
            catalogName: "dset_dev",
            schemaName: "us_datalake_mng",
            datasetName: "valuetrak_852_monthly",
            ruleCategory: "metadata",
            ruleType: "volume",
            ruleName: "volume_check",
            targetColumn: "",
            ruleValue: "",
            dataPattern: "",
            runFrequency: "Daily",
            receiverAlertEmail: "jon.doe@tevapharm.com",
            receiverAlertId: "",
            selectColumns: "",
            ruleWarningThreshold: "",
            ruleCriticalThreshold: "",
            baselineValue: "",
           }
    
    Sample Output:
      A message such as "Rule added successfully."
  */
  async manageDataQualityRule(payload: NewRule): Promise<any> {
    console.info(
      `Initiating request for adding new rule in ${payload.datasetName}...`,
    ); // Logs request start

    try {
      // await for the response from the backend by posting the request
      const response = await apiClient.post(
        `${DATA_QUALITY_URL}/manage-rule`, // endpoint to manage a rule
        payload, // payload to add or update a rule
      );

      // on successfull process of managing the rule check the status and log the success.
      if (response.status === 200) {
        console.info(
          `New rule configured successfully in ${payload.datasetName}.`,
        ); // Log successful completion
      }

      // return the response to the user
      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      // handle errors
      console.error(
        `Failed to configure new rule in ${payload.datasetName}:`, // show the dataset name for debugging error
        error,
      ); // Log the error occured

      // throw an error to alert the user
      throw new Error(
        `An error occurred while configuring new rule ${payload.datasetName}.`,
      ); // Throw an error if something goes wrong.
    }
  },

  /**
  * Fetch the data quality rules suggested for a dataset according to it's metadata.
  *
  * When the user wants suggestion for rule configuration for a specific dataset.
  * 
  * @param catalogName - catalog name of dataset
  * @param schemaName - schema name of dataset
  * @param datasetName - name of dataset
  * @returns {Promise<SuggestRules[]>} - A promise resolving to a list of suggested rules
  * 
  * Sample Input:
        catalogName: "dset_dev",
        schemaName: "us_tables_schema",
        datasetName: "new_table"
    
    Sample Output:
      suggestedRules = {
        key_name: email,
        value_map: {
          metadata: {
            freshness: ["column1", "column2"],
          };
          data_profiling: {
            uniqueness: ["column3", "column4"],
          };
        };
      }
  */
  async suggestDataQualityRules(
    catalogName: string,
    schemaName: string,
    datasetName: string,
  ): Promise<SuggestRules[]> {
    console.info(
      `Initiating request for suggesting rules for ${datasetName}...`,
    ); // Logs request start

    try {
      const response = await apiClient.get(
        `${DATA_QUALITY_URL}/suggest-rules`,
        {
          params: { catalogName, schemaName, datasetName },
        },
      );

      if (response.status === 200) {
        console.info(
          `Suggested rules fetched successfully for ${datasetName}.`,
        ); // Log successful completion
      }

      return response.data;
    } catch (error) {
      console.error(
        `Failed to fetch suggested rules for ${datasetName}:`,
        error,
      ); // Log the error occurred

      throw new Error(
        `An error occurred while fetching suggested rules for ${datasetName}.`,
      ); // Throw an error if something goes wrong.
    }
  },

  /**
  * Fetch KPI configurations for a specific brand, KPI, vendor, and frequency.
  *
  * When the user wants to view KPI configurations for a specific combination of brand, KPI, vendor, and frequency.
  * 
  * @param brand - brand name
  * @param kpi - KPI name
  * @param vendor - vendor name
  * @param frequency - frequency of KPI (e.g., daily, weekly)
  * @param kpiUniqueIdentifier - unique identifier for the KPI (e.g., "ALERT_THRESHOLD")
  * @param kpiUniqueIdentifierValue - value of the unique identifier (e.g., "90%")
  * @returns {Promise<KPIConfiguration[]>} - A promise resolving to an array of KPI configuration objects
  * 
  * Sample Input:
        brand: "Brand A",
        kpi: "KPI1",
        vendor: "Vendor X",
        frequency: "Daily"
        kpiUniqueIdentifier: "ALERT_THRESHOLD",
        kpiUniqueIdentifierValue: "90%"
    
    Sample Output:
      [
        {
          id: "12345",
          brand: "Brand A",
          kpi: "KPI1",
          vendor: "Vendor X",
          frequency: "Daily",
          description: "KPI configuration for Brand A's KPI1.",
          parameters: [
            {
              name: "parameter1",
              value: "value1"
            },
            {
              name: "parameter2", 
              value: "value2"
            }
          ],
          is_enabled: true,
          created_by: "user123",
          updated_by: null,
          created_at: new Date("2025-01-01T00:00:00Z"),
          updated_at: null
        }
      ]
  */
  async getKPIConfigurations(
    brand: string,
    kpi: string,
    vendor: string,
    frequency: string,
    kpiUniqueIdentifier: string,
    kpiUniqueIdentifierValue: string,
  ): Promise<KPIConfiguration[]> {
    // Informational log: request is starting (helps trace activity in logs)
    console.info("Fetching KPI configurations data...");

    try {
      // Call the API client to perform an HTTP GET to the highlights endpoint
      // Real-world analogy: asking a backend service for a summary report
      const response = await apiClient.get(`${KPI_URL}/configurations`, {
        params: {
          brand,
          kpi,
          vendor,
          frequency,
          kpiUniqueIdentifier,
          kpiUniqueIdentifierValue,
        }, // Pass brand, KPI, and vendor as query parameters to the API
      });

      // Informational log: data was retrieved successfully
      console.info("Successfully retrieved KPI configurations data.");

      // The HTTP client returns a response object; the actual payload is in `response.data`.
      // We return that payload to the caller so they can use the highlights data.
      return response.data;
    } catch (error) {
      // If anything goes wrong (network, server error), log the error for debugging
      console.error("Error fetching KPI configurations data:", error);

      // Throw a new, generic error that calling code can catch and handle (e.g., show an error message)
      throw new Error("Failed to fetch KPI configurations data");
    }
  },

  /**
   * 
   * @returns  {Promise<KPIConfigurationFilters>} - A promise resolving to an object containing filter options for KPI configuration management.
   * 
   * Sample Output: 
   * {
        BRANDS: ["Brand A", "Brand B"],  
        KPI_NAMES: ["KPI1", "KPI2"],
        DATA_VENDORS: ["Vendor X", "Vendor Y"],
        RUN_FREQUENCIES: ["Daily", "Weekly"],
        KPI_UNIQUE_IDENTIFIERS: ["ALERT_THRESHOLD", "RULE_VALUE"],
        KPI_UNIQUE_IDENTIFIER_VALUES: ["90%", "80%", "70%"],
        CATALOG_NAMES: ["CatalogA", "CatalogB"],
        DATA_SOURCES: ["Source1", "Source2"],
        KPI_FORMATS: ["PERCENTAGE", "NUMERIC", "BOOLEAN"]
   * }
   */
  async getKPIConfigurationFilters(): Promise<KPIConfigurationFilters> {
    // Informational log: request is starting (helps trace activity in logs)
    console.info("Fetching KPI configuration management filters data...");

    try {
      // Call the API client to perform an HTTP GET to the highlights endpoint
      // Real-world analogy: asking a backend service for a summary report
      const response = await apiClient.get(`${KPI_URL}/configuration-filters`);

      // Informational log: data was retrieved successfully
      console.info(
        "Successfully retrieved KPI configuration management filters data.",
      );

      // The HTTP client returns a response object; the actual payload is in `response.data`.
      // We return that payload to the caller so they can use the highlights data.
      return response.data;
    } catch (error) {
      // If anything goes wrong (network, server error), log the error for debugging
      console.error(
        "Error fetching KPI configuration management filters data:",
        error,
      );

      // Throw a new, generic error that calling code can catch and handle (e.g., show an error message)
      throw new Error(
        "Failed to fetch KPI configuration management filters data",
      );
    }
  },

  /**
   * Creates a KPI job with the given configuration payload.
   *
   * @param {Object} payload - Configuration object for KPI job
   *
   * Sample payload:
   * {
   *   brand: "Brand A", // Selected brand (e.g., "Brand A")
   *   kpi: "Daily Sales Volume", // KPI name (e.g., "Daily Sales Volume")
   *   source: "Redshift", // Data source (e.g., "Redshift", "BigQuery")
   *   vendor: "In-house", // Data vendor (e.g., "In-house", "Third-party")
   *
   *   catalogName: "dset_dev", // Database catalog name (e.g., "dset_dev")
   *   schemaName: "sales_data", // Schema name (e.g., "sales_data")
   *   datasetName: "daily_sales", // Dataset/table name (e.g., "daily_sales")
   *
   *   dataDomain: "Sales", // Business domain (e.g., "Sales", "Finance")
   *   kpiFormat: "Count", // KPI format (e.g., "Percentage", "Count")
   *   calculationMethod: "SUM(sales_amount)", // Calculation logic
   *
   *   kpiUniqueIdentifier: "store_id", // Unique identifier column (e.g., "store_id")
   *   kpiUniqueIdentifierValue: "12345", // Value for unique identifier (e.g., "12345")
   *   alertThreshold: 1000, // Threshold value (used if Manual)
   *   thresholdDerivationType: "Manual", // "Manual" or "Automatic"
   *   thresholdDerivationMethod: null, // Method if Automatic (e.g., "Standard Deviation")
   *   thresholdLookbackValue: 7, // Lookback period (used in Automatic)
   *   runFrequency: "Daily", // Frequency (e.g., "Daily", "Weekly")
   *   receiverAlertEmail: "ops-team@company.com, manager@company.com"
   *
   * }
   *
   * @returns {Promise<any>} Resolves with response:
   * {
   *   run_id: "abc123",
   *   job_id: "job789"
   * }
   */
  async manageKPIConfiguration(payload: any): Promise<any> {
    // Informational log: request is starting (helps trace activity in logs)
    console.info("Fetching KPI configuration management filters data...");

    try {
      // Call the API client to perform an HTTP GET to the highlights endpoint
      // Real-world analogy: asking a backend service for a summary report
      const response = await apiClient.post(
        `${KPI_URL}/manage-configuration`,
        payload,
      );

      // Informational log: data was retrieved successfully
      console.info(
        "Successfully retrieved KPI configuration management filters data.",
      );

      // The HTTP client returns a response object; the actual payload is in `response.data`.
      // We return that payload to the caller so they can use the highlights data.
      return response.data;
    } catch (error) {
      // If anything goes wrong (network, server error), log the error for debugging
      console.error(
        "Error fetching KPI configuration management filters data:",
        error,
      );

      // Throw a new, generic error that calling code can catch and handle (e.g., show an error message)
      throw new Error(
        "Failed to fetch KPI configuration management filters data",
      );
    }
  },

  /**
   * Retrieves all KPI configured alerts.
   * These identifiers are typically used when associating rules
   * with notification or alerting mechanisms.
   * @returns {Promise<Alert[]>} - A promise resolving to alert receiver IDs.
   *
   * Sample Input: None
   * Sample Output:
   * [
   *   { id: "alert-001", type: "Email" },
   *  { id: "alert-002", type: "Slack" }
   * ]
   */
  async getKPIConfiguredAlerts(): Promise<Alert[]> {
    console.info("Initiating request for KPI configured alerts..."); // Logs request start

    try {
      // Sends request to retrieve all configured alert receivers
      const response = await apiClient.get(`${KPI_URL}/configured-alerts`);

      console.info("KPI configured alerts fetched successfully."); // Log successful completion

      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      console.error("Failed to retrieve KPI configured alerts:", error); // Log the error occured

      throw new Error(
        "An error occurred while fetching KPI configured alerts.",
      ); // Throw an error if something goes wrong.
    }
  },

  /**
   * Retrieves the current status of the Databricks cluster.
   * This is used to determine if the cluster is up and running before attempting to execute any rules or configurations that depend on it.
   * @returns {Promise<any>} - A promise resolving to the status information of the Databricks cluster.
   * Sample Input: None
   * Sample Output:
   * {
   *  status: "running",
   *  clusterId: "cluster-12345",
   *  uptime: "48 hours",
   * }
   */
  async getDatabricksClusterStatus(): Promise<any> {
    console.info("Initiating request for Databricks cluster status..."); // Logs request start

    try {
      // Sends request to retrieve all configured alert receivers
      const response = await apiClient.get(`${CLUSTER_URL}/status`);

      console.info("Databricks cluster status fetched successfully."); // Log successful completion

      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      console.error("Failed to retrieve Databricks cluster status:", error); // Log the error occured

      throw new Error(
        "An error occurred while fetching Databricks cluster status.",
      ); // Throw an error if something goes wrong.
    }
  },

  /**
   * Starts the Databricks cluster if it is not already running.
   * This function is typically called before executing any rules or configurations that depend on the cluster to ensure that the necessary compute resources are available.
   * @returns {Promise<any>} - A promise resolving to the response from the cluster start request, which may include information about the cluster startup process or status.
   * Sample Input: None
   * Sample Output:
   * {
   *   status: "starting",
   *   clusterId: "cluster-12345",
   *   message: "Databricks cluster is starting. It may take a few minutes to be fully operational."
   * }
   */
  async startDatabricksCluster(): Promise<any> {
    console.info("Initiating request for start Databricks cluster..."); // Logs request start

    try {
      // Sends request to retrieve all configured alert receivers
      const response = await apiClient.post(`${CLUSTER_URL}/start`);

      console.info("Databricks cluster started successfully."); // Log successful completion

      return response.data; // Returns alert receiver identifiers
    } catch (error) {
      console.error("Failed to start Databricks cluster:", error); // Log the error occured

      throw new Error("An error occurred while starting Databricks cluster."); // Throw an error if something goes wrong.
    }
  },

  async runHelperFunction(payload: HelperFunctionsJobPayload): Promise<any> {

    console.log(`Initiating request to run helper function: ${payload?.FUNCTION}`);

    try {
      const response = await apiClient.post(
        `${CLUSTER_URL}/run-helper-functions-job`,
        payload,
      )

      if (response.status === 200) {
        console.info(`${payload.FUNCTION} ran successfully.`)
      }

      return response.data;
    } catch(error:any) {
      console.error(`Failed to run the helper function ${payload.FUNCTION}.`)

      throw new Error(`An error occured while running helper function: ${error}`);
    }
  },
};
