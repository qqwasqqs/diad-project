/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This service script handles API requests for the Data Quality Dashboard, which provides information on business units, rule categories, 
    and dataset health, along with detailed data insights for developers and business units.
    - The service functions include fetching summary and detailed views of data quality, rule categories, metadata, and dataset health.
    - It uses `apiClient` for interacting with the backend APIs, structured around business units and dataset health.
    - This service helps retrieve data required for building the data quality overview and developer-level insights for datasets.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  ../apiClient
     - What it is: A module that provides a configured HTTP client for making API requests.
     - Why used: Centralizes API request logic, allowing for easier management of API calls and error handling.
*/
import apiClient from "../apiClient"; // Importing the base API client for making HTTPS requests

/*  
  @/types/api
    - What it is: TypeScript type definitions for the API responses used across the app.
    - Why used: Ensures functions return typed data, improving developer experience and catching type errors at compile time.
*/
import {
  SummaryView,
  BusinessUnitSummary,
  BusinessUnitName,
  BusinessUnitHealth,
  RuleCategoryName,
  RuleDetails,
  Overview,
  DataProfile,
  DataHealth,
  DataRefresh,
  DatasetRuleTypes,
  DatasetDetails,
  DQDFilter,
  RuleCategorySummary,
  DataDrift,
} from "@/types/api";
// Importing relevant TypeScript types to ensure type safety for API responses

// ----------------------------- CONSTANTS -----------------------------

// Base URLs for the respective API endpoints
const EXECUTIVE_API_URL = "/api/data-quality-dashboard/summary-view";
const DEVELOPER_API_URL = "/api/data-quality-dashboard/detailed-view";

// The service that handles API calls related to the Data Quality Dashboard
export const qualityDashboardService = {

  /**
   * Fetches the summary of all business units in the Data Quality Dashboard.
   * This summary provides an overview of the data quality at the business unit level.
   * 
   * @returns {Promise<SummaryView>} - A promise resolving to the business unit summary data.
   * 
   * Sample Input: None
   * Sample Output:
   * {
   *   businessUnitCount: 5,
   *   ruleCategoryCount: 10,
   *   healthStatus: "Healthy"
   * }
   */
  async getBusinessUnits(): Promise<SummaryView> {
    console.info("Fetching business unit summary...");  // Log the beginning of the fetch process
    try {
      // Sends a request to get data for all business units in the system
      const response = await apiClient.get(`${EXECUTIVE_API_URL}/business-unit`);
      console.info("Successfully fetched business unit summary.");  // Log successful completion
      return response.data;  // Return the data fetched from the server
    } catch (error) {
      console.error("Error fetching business unit summary:", error);  // Log any error encountered
      throw new Error("Failed to fetch business unit summary.");  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches the names of all business units in the system.
   * This is useful for filtering or selecting specific business units in the dashboard.
   * 
   * @returns {Promise<BusinessUnitName[]>} - A promise resolving to the list of business unit names.
   * 
   * Sample Input: None
   * Sample Output: ["BusinessUnitA", "BusinessUnitB", "BusinessUnitC"]
   */
  async getBusinessUnitNames(): Promise<BusinessUnitName[]> {
    console.info("Fetching business unit names...");  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch all business unit names
      const response = await apiClient.get(`${EXECUTIVE_API_URL}/business-unit-names`);
      console.info("Successfully fetched business unit names.");  // Log successful completion
      return response.data;  // Return the list of business unit names fetched from the server
    } catch (error) {
      console.error("Error fetching business unit names:", error);  // Log any error encountered
      throw new Error("Failed to fetch business unit names.");  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches a summary of the data for a given business unit.
   * This summary includes important insights on the data quality within the business unit.
   * 
   * @param businessUnit - The name of the business unit.
   * 
   * @returns {Promise<BusinessUnitSummary>} - A promise resolving to the business unit's data summary.
   * 
   * Sample Input: { businessUnit: "BusinessUnitA" }
   * Sample Output: { totalRecords: 5000, healthyRecords: 4500, issuesFound: 500 }
   */
  async getBusinessUnitSummary(
    businessUnit: string
  ): Promise<BusinessUnitSummary> {
    console.info(`Fetching data summary for business unit: ${businessUnit}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the data summary for a specific business unit
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/data-summary`
      );
      console.info(`Successfully fetched data summary for ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the business unit's data summary
    } catch (error) {
      console.error(`Error fetching data summary for ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch data summary for ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches a list of dataset rule types for a given business unit.
   * This is useful for inspecting dataset-level rule types in the business unit.
   * 
   * @param businessUnit - The business unit for which to fetch the dataset rule types.
   * @param resultStatus - The result status of the rules to filter by (e.g., "Passed", "Failed").
   * @param ruleCategory - The optional rule category to filter by.
   * 
   * @returns {Promise<DatasetRuleTypes[]>} - A promise resolving to the list of rule types.
   * 
   * Sample Input: { businessUnit: "BusinessUnitA", resultStatus: "Failed" }
   * Sample Output: ["RuleType1", "RuleType2"]
   */
  async getBusinessUnitDatasetRuleTypes(
    businessUnit: string,
    resultStatus: string,
    ruleCategory?: string
  ): Promise<DatasetRuleTypes[]> {
    console.info(`Fetching dataset rule types for ${businessUnit}...`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch dataset rule types for a specific business unit and filters like result status or rule category
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/dataset-rule-types`,
        {
          params: { resultStatus, ruleCategory },  // These are filters to narrow down the results
        }
      );
      console.info(`Successfully fetched dataset rule types for ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the list of dataset rule types
    } catch (error) {
      console.error(`Error fetching dataset rule types for ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch dataset rule types for ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches detailed dataset information for a given business unit, dataset, and rule.
   * This is used to gather information about dataset-specific data issues.
   * 
   * @param businessUnit - The business unit of the dataset.
   * @param datasetName - The name of the dataset.
   * @param resultStatus - The result status of the dataset (e.g., "Passed", "Failed").
   * @param ruleCategory - The optional category to filter dataset rules by.
   * @param ruleType - The optional rule type to filter by.
   * @param ruleName - The optional rule name to filter by.
   * 
   * @returns {Promise<DatasetDetails[]>} - A promise resolving to detailed dataset information.
   * 
   * Sample Input: { businessUnit: "BusinessUnitA", datasetName: "DatasetX", resultStatus: "Failed" }
   * Sample Output: [{ ruleName: "Rule1", status: "Failed" }, { ruleName: "Rule2", status: "Failed" }]
   */
  async getBusinessUnitDatasetDetails(
    businessUnit: string,
    datasetName: string,
    resultStatus: string,
    ruleCategory?: string,
    ruleType?: string,
    ruleName?: string
  ): Promise<DatasetDetails[]> {
    console.info(`Fetching dataset details for ${datasetName} in ${businessUnit}...`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch dataset details based on various filters such as business unit, dataset name, result status, etc.
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/dataset-details`,
        {
          params: { datasetName, resultStatus, ruleCategory, ruleType, ruleName },
        }
      );
      console.info(`Successfully fetched dataset details for ${datasetName} in ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the detailed dataset information
    } catch (error) {
      console.error(`Error fetching dataset details for ${datasetName} in ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch dataset details for ${datasetName} in ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches the health data for a specific business unit within a defined date range.
   * This is used for tracking data health trends over time.
   * 
   * @param businessUnit - The name of the business unit.
   * @param startDate - The start date for the health data range.
   * @param endDate - The end date for the health data range.
   * 
   * @returns {Promise<BusinessUnitHealth[]>} - A promise resolving to an array of business unit health data.
   * 
   * Sample Input: { businessUnit: "BusinessUnitA", startDate: "2025-01-01", endDate: "2025-12-31" }
   * Sample Output: 
   * [
   *   { date: "2025-01-01", status: "Healthy", percentage: 98 },
   *   { date: "2025-06-30", status: "At Risk", percentage: 75 }
   * ]
   */
  async getBusinessUnitHealth(
    businessUnit: string,
    startDate: Date,
    endDate: Date
  ): Promise<BusinessUnitHealth[]> {
    console.info(`Fetching health data for business unit: ${businessUnit} from ${startDate} to ${endDate}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the health data for a specific business unit over a date range
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/data-health`,
        {
          params: { startDate, endDate },  // Send the start and end dates to filter the data
        }
      );
      console.info(`Successfully fetched health data for ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the health data for the business unit
    } catch (error) {
      console.error(`Error fetching health data for ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch health data for ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
 * Fetches the rule categories for a specific business unit.
 * This provides insight into the types of rules applied to datasets within the unit.
 * 
 * @param businessUnit - The name of the business unit to fetch rule categories for.
 * 
 * @returns {Promise<RuleCategoryName[]>} - A promise resolving to the list of rule category names.
 * 
 * Sample Input: { businessUnit: "BusinessUnitA" }
 * Sample Output: ["Category1", "Category2", "Category3"]
 */
  async getRuleCategories(businessUnit: string): Promise<RuleCategoryName[]> {
    console.info(`Fetching rule categories for business unit: ${businessUnit}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the rule categories for a specific business unit
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/rule-categories`
      );
      console.info(`Successfully fetched rule categories for ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the list of rule categories fetched from the server
    } catch (error) {
      console.error(`Error fetching rule categories for ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch rule categories for ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches a summary of a specific rule category for a given business unit.
   * This summary provides insights into the rule category’s performance, health, and data quality.
   * 
   * @param businessUnit - The name of the business unit.
   * @param ruleCategory - The rule category name.
   * 
   * @returns {Promise<RuleCategorySummary>} - A promise resolving to the rule category summary data.
   * 
   * Sample Input: { businessUnit: "BusinessUnitA", ruleCategory: "Category1" }
   * Sample Output: 
   * { totalRules: 20, passedRules: 18, failedRules: 2 }
   */
  async getRuleCategorySummary(
    businessUnit: string,
    ruleCategory: string
  ): Promise<RuleCategorySummary> {
    console.info(`Fetching rule category summary for ${ruleCategory} in ${businessUnit}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch a summary of a specific rule category for a business unit
      const response = await apiClient.get(
        `${EXECUTIVE_API_URL}/business-unit/${businessUnit}/${ruleCategory}`
      );
      console.info(`Successfully fetched rule category summary for ${ruleCategory} in ${businessUnit}`);  // Log successful completion
      return response.data;  // Return the rule category summary data
    } catch (error) {
      console.error(`Error fetching rule category summary for ${ruleCategory} in ${businessUnit}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch rule category summary for ${ruleCategory} in ${businessUnit}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches a list of filters available for data quality rules.
   * Filters are used to narrow down results in the data quality dashboard.
   * 
   * @returns {Promise<DQDFilter[]>} - A promise resolving to the list of available filters.
   * 
   * Sample Input: None
   * Sample Output: [{ filterName: "DateRange", filterType: "date" }, { filterName: "ResultStatus", filterType: "select" }]
   */
  async getFilters(): Promise<DQDFilter[]> {
    console.info("Fetching available filters for data quality dashboard...");  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the available filters for the data quality dashboard
      const response = await apiClient.get(`${DEVELOPER_API_URL}/filters`);
      console.info("Successfully fetched available filters.");  // Log successful completion
      return response.data;  // Return the list of filters
    } catch (error) {
      console.error("Error fetching filters:", error);  // Log any error encountered
      throw new Error("Failed to fetch filters.");  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches the rule details for a specific rule category, dataset, and other relevant parameters.
   * This is used by developers to view specific data quality rules applied to datasets.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema within the catalog.
   * @param datasetName - The name of the dataset.
   * @param ruleCategory - The rule category to filter by.
   * @param resultStatus - The result status of the rule (e.g., "Passed", "Failed").
   * 
   * @returns {Promise<RuleDetails[]>} - A promise resolving to a list of data quality rule details.
   * 
   * Sample Input: 
   * { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX", ruleCategory: "Category1", resultStatus: "Failed" }
   * Sample Output: [{ ruleName: "Rule1", status: "Failed" }, { ruleName: "Rule2", status: "Failed" }]
   */
  async getRuleDetails(
    catalogName: string,
    schemaName: string,
    datasetName: string,
    ruleCategory: string,
    resultStatus: string
  ): Promise<RuleDetails[]> {
    console.info(`Fetching rules for ${datasetName} in ${schemaName} under ${catalogName}...`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch specific rule details based on the dataset, schema, catalog, and filter parameters
      const response = await apiClient.get(
        `${DEVELOPER_API_URL}/rule-category/${ruleCategory}`,
        {
          params: { catalogName, schemaName, datasetName, resultStatus },  // Filters for the specific dataset and rule details
        }
      );
      console.info(`Successfully fetched rules for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the list of rule details
    } catch (error) {
      console.error(`Error fetching rules for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch rules for ${datasetName}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches an overview of the data health for a specific dataset within a catalog and schema.
   * This is used to obtain a quick overview of dataset health in the data quality dashboard.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema.
   * @param datasetName - The name of the dataset.
   * 
   * @returns {Promise<Overview>} - A promise resolving to the dataset overview data.
   * 
   * Sample Input: { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX" }
   * Sample Output: { datasetHealth: "Healthy", issueCount: 0 }
   */
  async getOverview(
    catalogName: string,
    schemaName: string,
    datasetName: string
  ): Promise<Overview> {
    console.info(`Fetching overview for dataset: ${datasetName} in ${schemaName} under ${catalogName}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the dataset overview based on the catalog, schema, and dataset
      const response = await apiClient.get(`${DEVELOPER_API_URL}/overview`, {
        params: { catalogName, schemaName, datasetName },  // Filters based on the catalog, schema, and dataset name
      });
      console.info(`Successfully fetched overview for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the dataset's overview data
    } catch (error) {
      console.error(`Error fetching overview for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch overview for ${datasetName}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches metadata information for a dataset within a specific catalog and schema.
   * This metadata includes schema details, data types, and other essential attributes.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema.
   * @param datasetName - The name of the dataset.
   * 
   * @returns {Promise<RuleCategorySummary[]>} - A promise resolving to the dataset metadata.
   * 
   * Sample Input: { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX" }
   * Sample Output: [{ column: "col1", dataType: "string", description: "Column 1 description" }]
   */
  async getMetadata(
    catalogName: string,
    schemaName: string,
    datasetName: string
  ): Promise<RuleCategorySummary[]> {
    console.info(`Fetching metadata for dataset: ${datasetName} in ${schemaName} under ${catalogName}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch metadata information for a specific dataset, catalog, and schema
      const response = await apiClient.get(`${DEVELOPER_API_URL}/metadata`, {
        params: { catalogName, schemaName, datasetName },  // Filters for the specific dataset
      });
      console.info(`Successfully fetched metadata for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the metadata of the dataset
    } catch (error) {
      console.error(`Error fetching metadata for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch metadata for ${datasetName}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches the data profile for a specific dataset within a catalog and schema.
   * Data profiles contain detailed statistics about the dataset, such as data distribution and column-wise statistics.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema.
   * @param datasetName - The name of the dataset.
   * 
   * @returns {Promise<DataProfile>} - A promise resolving to the dataset’s data profile.
   * 
   * Sample Input: { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX" }
   * Sample Output: { columnStats: [{ column: "col1", mean: 10, stddev: 2 }, { column: "col2", mean: 5, stddev: 1 }] }
   */
  async getDataProfile(
    catalogName: string,
    schemaName: string,
    datasetName: string
  ): Promise<DataProfile> {
    console.info(`Fetching data profile for dataset: ${datasetName} in ${schemaName} under ${catalogName}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the data profile for a specific dataset, catalog, and schema
      const response = await apiClient.get(`${DEVELOPER_API_URL}/data-profile`, {
        params: { catalogName, schemaName, datasetName },  // Filters based on catalog, schema, and dataset name
      });
      console.info(`Successfully fetched data profile for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the dataset's data profile
    } catch (error) {
      console.error(`Error fetching data profile for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch data profile for ${datasetName}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches data drift details for a specific dataset within a catalog and schema.
   * This is useful for detecting anomalies in the dataset over time.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema.
   * @param datasetName - The name of the dataset.
   * 
   * @returns {Promise<DataDrift[]>} - A promise resolving to data drift information for the dataset.
   * 
   * Sample Input: { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX" }
   * Sample Output: [{ date: "2025-01-01", driftPercentage: 5.5 }]
   */
  async getDataDrift(
    catalogName: string,
    schemaName: string,
    datasetName: string
  ): Promise<DataDrift[]> {
    console.info(`Fetching data drift details for dataset: ${datasetName} in ${schemaName} under ${catalogName}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch the data drift details for a specific dataset, schema, and catalog
      const response = await apiClient.get(`${DEVELOPER_API_URL}/data-drift`, {
        params: { catalogName, schemaName, datasetName },  // Filters based on catalog, schema, and dataset name
      });
      console.info(`Successfully fetched data drift details for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the data drift details
    } catch (error) {
      console.error(`Error fetching data drift for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch data drift for ${datasetName}`);  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches data health trends for a specific dataset within a catalog and schema over a defined time range.
   * This is used to monitor changes in the dataset’s health over time.
   * 
   * @param catalogName - The name of the data catalog.
   * @param schemaName - The name of the schema.
   * @param datasetName - The name of the dataset.
   * @param startDate - The start date for the health data range.
   * @param endDate - The end date for the health data range.
   * 
   * @returns {Promise<DataHealth[]>} - A promise resolving to the data health trend for the dataset.
   * 
   * Sample Input: { catalogName: "CatalogA", schemaName: "Schema1", datasetName: "DatasetX", startDate: "2025-01-01", endDate: "2025-12-31" }
   * Sample Output: [{ date: "2025-01-01", healthStatus: "Healthy", percentage: 98 }]
   */
  async getDataHealth(
    catalogName: string,
    schemaName: string,
    datasetName: string,
    startDate: Date,
    endDate: Date
  ): Promise<DataHealth[]> {
    console.info(`Fetching data health for dataset: ${datasetName} in ${schemaName} under ${catalogName} from ${startDate} to ${endDate}`);  // Log the beginning of the fetch process
    try {
      // Sends a request to fetch data health information over a date range for a specific dataset
      const response = await apiClient.get(`${DEVELOPER_API_URL}/data-health`, {
        params: { catalogName, schemaName, datasetName, startDate, endDate },  // Filters based on dataset and date range
      });
      console.info(`Successfully fetched data health for ${datasetName}`);  // Log successful completion
      return response.data;  // Return the data health trend
    } catch (error) {
      console.error(`Error fetching data health for ${datasetName}:`, error);  // Log any error encountered
      throw new Error(`Failed to fetch data health for ${datasetName}`);  // Throw an error if something went wrong
    }
  }
};
