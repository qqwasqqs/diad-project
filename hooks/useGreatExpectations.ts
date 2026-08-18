/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 20 January 2026
  Purpose of the script: 
    This script provides React hooks that interact with great-expectations API services, specifically fetching 
    information on dataset metadata, kpi metadata, configured rules, rule suggestions.
    - The hooks leverage `react-query` for data fetching, caching, and state management.
    - The hooks are reusable and can be used across components to fetch governance data consistently.
    - Each hook abstracts the API call and provides a simple interface for components to access the data and loading states.
    - The hooks are organized into two sections: one for data quality related data and another for KPI related data, reflecting the different domains of the application.
    - The hooks also include parameters to allow for flexible data fetching based on different filters and identifiers, making them adaptable to various use cases within the application.
    - Overall, this script serves as a centralized place for all data fetching logic related to great expectations, promoting code reuse and separation of concerns in the application architecture.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A popular data-fetching and caching library for React applications
      (formerly known as "react-query"). It automates the management of asynchronous requests,
      caching, and background refetching, enabling developers to focus on the UI rendering logic.
    - Why used: React Query provides the `useQuery` hook, which abstracts complex state management 
      such as loading, error handling, and caching while performing network requests.
*/
import { useQuery } from "@tanstack/react-query"; // Importing the `useQuery` hook from React Query for data fetching

/*
  @/lib/services/greatExpectationsService
    - What it is: A local module that contains API service functions related to "Great Expectations", 
      a data quality framework. This module encapsulates API calls that interact with backend services 
      for tasks such as fetching registered datasets, dataset metadata, configured rules, etc.
    - Why used: Separating API logic into a service layer allows React components to remain 
      simple and focused on rendering. The hooks only call predefined functions like 
      `greatExpectationsService.getDataQualityRegistedDatasets()` instead of handling network requests.
*/
import { greatExpectationsService } from "@/lib/services/greatExpectationsService"; // Importing the service functions for data fetching

// ------------------------- Custom Hooks for Data Quality Data -------------------------

/**
 * Custom hook to fetch the list of registered datasets for data quality.
 * This hook is responsible for retrieving datasets that have been registered in the system 
 * for the purpose of applying data quality checks.
 *
 * @returns {object} - Returns an object containing `registeredDatasets` (list of datasets) 
 *                     and `isFetchingRegisteredDatasets` (loading state for fetching datasets).
 *
 * Sample Output:
 * {
 *   registeredDatasets: [
 *     { datasetName: "dataset1", status: "active", lastUpdated: "2025-01-01" },
 *     { datasetName: "dataset2", status: "inactive", lastUpdated: "2025-01-02" }
 *   ],
 *   isFetchingRegisteredDatasets: false
 * }
 */
export function useGetDataQualityRegistedDatasets() {
    // Fetch data for registered datasets using `useQuery` from React Query
    const { data, isLoading } = useQuery({
        queryKey: ["getDataQualityRegistedDatasets"], // Unique query key for caching and refetching
        queryFn: () => greatExpectationsService.getDataQualityRegistedDatasets(), // Function call to service layer to fetch data
        refetchOnWindowFocus: false, // Disables refetch when window is focused
    });

    // Return the fetched data and loading state
    return { registeredDatasets: data, isFetchingRegisteredDatasets: isLoading };
}

/**
 * Custom hook to fetch metadata for a specific dataset used in data quality checks.
 * This hook retrieves detailed information (metadata) for a dataset, such as its columns, 
 * data types, etc., which are necessary for configuring data quality checks.
 *
 * @param {string} businessUnit - The business unit associated with the dataset (optional).
 * @param {string} catalogName - The catalog name where the dataset resides (optional).
 * @param {string} schemaName - The schema name that contains the dataset (optional).
 * @param {string} datasetName - The name of the dataset (optional).
 *
 * @returns {object} - Returns an object containing `datasetMetadata` (metadata of the dataset) 
 *                     and `isFetchingDatasetMetadata` (loading state for fetching metadata).
 *
 * Sample Input:
 * {
 *   businessUnit: "finance",
 *   catalogName: "main_catalog",
 *   schemaName: "schema1",
 *   datasetName: "dataset1"
 * }
 * Sample Output:
 * {
 *   datasetMetadata: {
 *     columns: [
 *       { name: "column1", type: "string" },
 *       { name: "column2", type: "integer" }
 *     ],
 *     lastUpdated: "2025-02-01"
 *   },
 *   isFetchingDatasetMetadata: false
 * }
 */
export function useGetDataQualityDatasetMetadata(
    businessUnit: string, // business unit parameter
    catalogName: string | null, // catalog name parameter
    schemaName: string | null, // schema name parameter
    datasetName: string, // dataset name parameter
) {
    // Fetch dataset metadata using `useQuery` from React Query
    const { data, isLoading } = useQuery({
        queryKey: [
            "getDataQualityDatasetMetadata", 
            businessUnit, catalogName, schemaName, datasetName
        ], // Unique query key to differentiate between various requests
        queryFn: () => greatExpectationsService.getDataQualityDatasetMetadata(
            businessUnit, catalogName, schemaName, datasetName
        ), // Call to the service layer to fetch dataset metadata
        refetchOnWindowFocus: false, // Disables refetch on window focus
    });

    // Return the fetched data and loading state
    return { datasetMetadata: data, isFetchingDatasetMetadata: isLoading };
}

/**
 * Custom hook to fetch the configured data quality rules for a specific dataset.
 * This hook retrieves the data quality rules configured for a particular dataset,
 * which helps in validating data against specified conditions.
 *
 * @param {string} businessUnit - The business unit associated with the dataset (optional).
 * @param {string} catalogName - The catalog name where the dataset resides (optional).
 * @param {string} schemaName - The schema name that contains the dataset (optional).
 * @param {string} datasetName - The name of the dataset (optional).
 * @param {string} targetColumn - The target column to apply the rules to (optional).
 *
 * @returns {object} - Returns an object containing `globalRules` (configured rules) 
 *                     and `isFetchingGlobalRules` (loading state for fetching rules).
 *
 * Sample Output:
 * {
 *   globalRules: [
 *     { ruleName: "checkNulls", targetColumn: "column1", status: "active" },
 *     { ruleName: "checkUnique", targetColumn: "column2", status: "inactive" }
 *   ],
 *   isFetchingGlobalRules: false
 * }
 */
export function useGetDataQualityConfiguredRules(
    businessUnit: string, // business unit parameter
    catalogName: string | null, // catalog name parameter
    schemaName: string | null, // schema name parameter
    datasetName: string, // dataset name parameter
    targetColumn?: string // target column parameter
) {
    // Fetch configured data quality rules using `useQuery`
    const { data, isLoading } = useQuery({
        queryKey: [
            "getDataQualityConfiguredRules", 
            businessUnit, catalogName, schemaName, datasetName, targetColumn
        ], // Unique query key for caching and tracking
        queryFn: () => greatExpectationsService.getDataQualityConfiguredRules(
            businessUnit, catalogName, schemaName, datasetName, targetColumn
        ), // Function call to fetch configured rules for the dataset
        refetchOnWindowFocus: false, // Disable refetch on window focus
    });

    // Return the fetched rules and loading state
    return { configuredRules: data, isFetchingConfiguredRules: isLoading };
}

/**
 * Custom hook to fetch the configured alerts for data quality issues.
 * This hook retrieves all the alerts configured in the system related to data quality 
 * violations or issues detected in datasets.
 *
 * @returns {object} - Returns an object containing `alerts` (configured alerts) 
 *                     and `isFetchingAlerts` (loading state for fetching alerts).
 *
 * Sample Output:
 * {
 *   alerts: [
 *     { alertType: "missingValues", severity: "high", dataset: "dataset1" },
 *     { alertType: "duplicateRecords", severity: "medium", dataset: "dataset2" }
 *   ],
 *   isFetchingAlerts: false
 * }
 */
export function useGetDataQualityConfiguredAlerts() {
    // Fetch configured alerts using `useQuery`
    const { data, isLoading } = useQuery({
        queryKey: ["getDataQualityConfiguredAlerts"], // Unique query key
        queryFn: () => greatExpectationsService.getDataQualityConfiguredAlerts(), // Function call to fetch alerts
        refetchOnWindowFocus: false, // Disable refetch on window focus
    });

    // Return the fetched alerts and loading state
    return { alerts: data, isFetchingAlerts: isLoading };
}

/**
 * Custom hook to suggest data quality rules for a specific dataset.
 * This hook retrieves suggested data quality rules for a dataset based on its characteristics 
 * (e.g., catalog name, schema name, dataset name).
 *
 * @param {string} catalogName - The catalog name where the dataset resides.
 * @param {string} schemaName - The schema name containing the dataset.
 * @param {string} datasetName - The name of the dataset.
 *
 * @returns {object} - Returns an object containing `suggestedRules` (suggested rules) 
 *                     and `isFetchingSuggestedRules` (loading state for fetching suggested rules).
 *
 * Sample Output:
 * {
 *   suggestedRules: [
 *     { ruleName: "checkNulls", targetColumn: "column1", status: "suggested" },
 *     { ruleName: "checkRange", targetColumn: "column2", status: "suggested" }
 *   ],
 *   isFetchingSuggestedRules: false
 * }
 */
export function useSuggestDataQualityRules(
    catalogName: string, // catalog name parameter
    schemaName: string, // schema name parameter
    datasetName: string, // dataset name parameter
) {
    // Fetch suggested data quality rules using `useQuery`
    const { data, isLoading } = useQuery({
        queryKey: ["suggestDataQualityRules", catalogName, schemaName, datasetName], // Unique query key for this request
        queryFn: () => greatExpectationsService.suggestDataQualityRules(
            catalogName, schemaName, datasetName
        ), // Function call to suggest data quality rules
        enabled: !!catalogName && !!schemaName && !!datasetName, // Ensures query is only triggered when all parameters are provided
        refetchOnWindowFocus: false, // Disable refetch on window focus
    });

    // Return the fetched suggested rules and loading state
    return { suggestedRules: data, isFetchingSuggestedRules: isLoading };
}


// ------------------------- Custom Hooks for KPI Data -------------------------

/**
 * Custom hook to fetch the KPI configurations based on various filters.
 * This hook is used to retrieve configuration data for KPIs (Key Performance Indicators),
 * including filters like date ranges, statuses, and other KPI-specific parameters.
 *
 * @param {string} brand - The brand name for the KPI configuration.
 * @param {string} kpi - The KPI identifier (e.g., "sales_growth").
 * @param {string} vendor - The vendor associated with the KPI (e.g., "vendorX").
 * @param {string} frequency - The frequency of the KPI data (e.g., "monthly", "quarterly").
 * @param {string} kpiUniqueIdentifier - A unique identifier for the KPI (e.g., "region").
 * @param {string} kpiUniqueIdentifierValue - The value corresponding to the unique identifier (e.g., "north").
 *
 * @returns {object} - Returns an object containing `kpiConfigurations` (available configurations) 
 *                     and `isFetching` (loading state for fetching data).
 *
 * Sample Input:
 * {
 *   brand: "BrandA",
 *   kpi: "sales_growth",
 *   vendor: "vendorX",
 *   frequency: "monthly",
 *   kpiUniqueIdentifier: "region",
 *   kpiUniqueIdentifierValue: "north"
 * }
 * Sample Output:
 * {
 *   kpiConfigurations: [
 *     { filterName: "dateRange", values: ["2025-01-01", "2025-02-01"] },
 *     { filterName: "status", values: ["active", "inactive"] }
 *   ],
 *   isFetching: false
 * }
 */
export function useGetKPIConfigurations(
    brand: string, // brand parameter
    kpi: string, // kpi parameter
    vendor: string, // vendor parameter
    frequency: string, // frequency parameter
    kpiUniqueIdentifier: string, // kpiUniqueIdentifier parameter
    kpiUniqueIdentifierValue: string, // kpiUniqueIdentifierValue parameter
) {
    // Query to get available KPI filters (date ranges, statuses, etc.)
    // Use the useQuery hook to fetch available KPI filters
    const { data, isLoading } = useQuery({
        // The `queryKey` is used by React Query to uniquely identify the query.
        // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
        // Unique cache key for this query
        queryKey: ["getKPIConfigurations",
            brand,
            kpi,
            vendor,
            frequency,
            kpiUniqueIdentifier,
            kpiUniqueIdentifierValue],
        // Function that performs the HTTP request via the service layer to get filters
        queryFn: () => greatExpectationsService.getKPIConfigurations(
            brand,
            kpi,
            vendor,
            frequency,
            kpiUniqueIdentifier,
            kpiUniqueIdentifierValue
        ),
        // Only enable the query when all filters are applied (truthy values)
        enabled: !!brand && !!kpi && !!vendor && !!frequency && !!kpiUniqueIdentifier && !!kpiUniqueIdentifierValue,
        // Do not refetch automatically when window is focused to reduce network calls
        refetchOnWindowFocus: false,
    });

    // Return filter options and loading indicator
    return { kpiConfigurations: data, isFetching: isLoading };
}


/**
 * Custom hook to fetch available KPI configuration filters.
 * This hook retrieves global KPI filters that can be used for configuring KPIs 
 * across different data sets, such as available date ranges, statuses, or other filter options.
 *
 * @returns {object} - Returns an object containing `filtersData` (list of available filters)
 *                     and `isFetching` (loading state for fetching filters).
 *
 * Sample Output:
 * {
 *   filtersData: [
 *     { filterName: "dateRange", values: ["2025-01-01", "2025-12-31"] },
 *     { filterName: "status", values: ["active", "inactive"] }
 *   ],
 *   isFetching: false
 * }
 */
export function useGetKPIConfigurationFilters() {
    // Query to get available KPI filters (date ranges, statuses, etc.)
    // Use the useQuery hook to fetch available KPI filters
    const { data, isLoading } = useQuery({
        // The `queryKey` is used by React Query to uniquely identify the query.
        // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
        // Unique cache key for this query
        queryKey: ["getKPIconfigurationFilters"],
        // Function that performs the HTTP request via the service layer to get filters
        queryFn: () => greatExpectationsService.getKPIConfigurationFilters(),
        // Do not refetch automatically when window is focused to reduce network calls
        refetchOnWindowFocus: false,
    });

    // Return filter options and loading indicator
    return { filtersData: data, isFetching: isLoading };
}


/**
 * Custom hook to fetch the available KPI alerts configured for KPIs.
 * This hook retrieves the configured alerts related to KPIs that can be used to monitor 
 * any issues or thresholds for the KPIs, such as violations or anomalies.
 *
 * @returns {object} - Returns an object containing `alerts` (configured alerts for KPIs)
 *                     and `isFetchingAlerts` (loading state for fetching alerts).
 *
 * Sample Output:
 * {
 *   alerts: [
 *     { alertType: "thresholdExceeded", threshold: "90%", kpi: "sales_growth", status: "active" },
 *     { alertType: "statusChanged", status: "inactive", kpi: "customer_satisfaction", severity: "high" }
 *   ],
 *   isFetchingAlerts: false
 * }
 */
export function useGetKPIConfiguredAlerts() {
    // Query to get available KPI filters (date ranges, statuses, etc.)
    // Use the useQuery hook to fetch available KPI filters
    const { data, isLoading } = useQuery({
        // The `queryKey` is used by React Query to uniquely identify the query.
        // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
        // Unique cache key for this query
        queryKey: ["getKPIConfiguredAlerts"],
        // Function that performs the HTTP request via the service layer to get filters
        queryFn: () => greatExpectationsService.getKPIConfiguredAlerts(),
        // Do not refetch automatically when window is focused to reduce network calls
        refetchOnWindowFocus: false,
    });

    // Return normalized response
    return { alerts: data, isFetchingAlerts: isLoading };
}