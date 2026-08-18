/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script contains custom React hooks to fetch various data quality dashboard information, including business units, rule categories, dataset details, and more.
    - These hooks interact with the `qualityDashboardService` to fetch data related to business units, datasets, rule categories, etc.
    - They use React Query for data fetching, caching, and managing the loading state.
    - The code structure ensures efficient querying, data refetching, and filtering based on user input.

*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A data-fetching and caching library for React (handles async operations).
    - Why used: Provides `useQuery` which simplifies data fetching, caching, and loading state management in these hooks.
*/
import { useQuery } from "@tanstack/react-query";

/*  @/lib/services/qualityDashboardService"
    - What it is: A service module that contains functions to fetch data quality dashboard information from APIs or data sources.
    - Why used: This service abstracts the API calls, allowing the hooks to focus on data fetching logic without worrying about the underlying API details.
*/
import { qualityDashboardService } from "@/lib/services/qualityDashboardService";
/* 
  @/store/DQDDetailedViewFiltersStore
    - What it is: A Zustand store that manages the state of filters applied in the Data Quality Dashboard detailed view.
    - Why used: This store provides access to the currently applied filters (catalog, schema, dataset) which are essential for fetching filtered data in some hooks.
*/
import { useDQDDetailedViewFiltersStore } from "@/store/DQDDetailedViewFiltersStore";

/**
 * Custom hook to fetch the list of business units.
 * This function fetches the overall summary view for the business units.
 *
 * @returns {Object} - An object containing the business units data and loading status.
 *
 * Sample Output:
 * { data: { businessUnits: [...] }, isFetching: false }
 */
export function useGetBusinessUnits() {
  // Execute query using React Query
  const { data, isLoading } = useQuery({
    // Unique cache key for this query
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getBusinessUnits"],

    // Function that performs the API call
    queryFn: () => qualityDashboardService.getBusinessUnits(),

    // Disable refetch when browser window regains focus
    refetchOnWindowFocus: false,
  });

  // Return normalized response
  return { businessUnitsData: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the list of business unit names.
 * This function fetches the names of available business units.
 *
 * @returns {Object} - An object containing the business unit names and loading status.
 *
 * Sample Output:
 * { data: [{ name: "Business Unit A" }, { name: "Business Unit B" }], isFetching: false }
 */
export function useGetBusinessUnitNames() {
  // Using the useQuery hook to fetch data for business unit names
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getBusinessUnitNames"], // Unique key for this query to avoid conflicts
    queryFn: () => qualityDashboardService.getBusinessUnitNames(), // Fetching business unit names from the service
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning the data and the fetching status (whether the data is still loading)
  return { businessUnitNames: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the summary details for a specific business unit.
 *
 * @param businessUnit - The business unit to fetch the summary for.
 *
 * @returns {Object} - An object containing the business unit summary data and loading status.
 *
 * Sample Input: "Business Unit A"
 * Sample Output: { data: { summary: {...} }, isFetching: false }
 */
export function useGetBusinessUnitSummary(businessUnit: string) {
  // Using the useQuery hook to fetch the summary for the provided business unit
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getBusinessUnitSummary", businessUnit], // Unique query key for this summary query
    queryFn: () => qualityDashboardService.getBusinessUnitSummary(businessUnit), // Fetching summary details from the service
    enabled: !!businessUnit, // Query is only executed if business unit is provided
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning the summary data for the business unit along with the fetching status
  return { businessUnitSummary: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch dataset rule types for a specific business unit and result status.
 * Optionally filters by rule category.
 *
 * @param businessUnit - The business unit to fetch dataset rule types for.
 * @param resultStatus - The result status to filter by.
 * @param ruleCategory - The rule category to filter by (optional).
 *
 * @returns {Object} - An object containing dataset rule types and loading status.
 *
 * Sample Input: "Business Unit A", "Passed", "Data Integrity"
 * Sample Output: { data: [{ ruleType: "Validation" }], isFetching: false }
 */
export function useGetBusinessUnitDatasetRuleTypes(
  businessUnit: string, // The business unit to get dataset rules for
  resultStatus: string, // The result status to filter by (e.g., Passed, Failed)
  ruleCategory?: string // Optional filter for rule category
) {
  // Using the useQuery hook to fetch dataset rule types based on the given parameters
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: [
      "getBusinessUnitDatasetRuleTypes",
      businessUnit,
      resultStatus,
      ruleCategory,
    ], // Unique query key based on the input parameters
    queryFn: () =>
      qualityDashboardService.getBusinessUnitDatasetRuleTypes(
        businessUnit,
        resultStatus,
        ruleCategory
      ), // Fetching dataset rule types from the service
    enabled: !!businessUnit && !!resultStatus && resultStatus !== "TOTAL", // Only run query if valid parameters are provided
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning dataset rule types and fetching status
  return { datasetRuleTypes: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch detailed dataset information for a specific business unit and dataset.
 * Optionally filters by rule category, rule type, and rule name.
 *
 * @param businessUnit - The business unit to fetch dataset details for.
 * @param datasetName - The name of the dataset to fetch details for.
 * @param resultStatus - The result status to filter by.
 * @param ruleCategory - The rule category to filter by (optional).
 * @param ruleType - The rule type to filter by (optional).
 * @param ruleName - The rule name to filter by (optional).
 *
 * @returns {Object} - An object containing dataset details and loading status.
 *
 * Sample Input: "Business Unit A", "Dataset X", "Passed", "Data Integrity"
 * Sample Output: { data: [{ datasetName: "Dataset X", status: "Passed" }], isFetching: false }
 */
export function useGetBusinessUnitDatasetDetails(
  businessUnit: string, // Business unit to get dataset details for
  datasetName: string, // Dataset name to get details for
  resultStatus: string, // Result status to filter by (e.g., Passed, Failed)
  ruleCategory?: string, // Optional filter for rule category
  ruleType?: string, // Optional filter for rule type
  ruleName?: string // Optional filter for rule name
) {
  // Using the useQuery hook to fetch dataset details based on the given parameters
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: [
      "getBusinessUnitDatasetDetails",
      businessUnit,
      datasetName,
      ruleCategory,
      ruleType,
      ruleName,
    ], // Unique query key based on the input parameters
    queryFn: () =>
      qualityDashboardService.getBusinessUnitDatasetDetails(
        businessUnit,
        datasetName,
        resultStatus,
        ruleCategory,
        ruleType,
        ruleName
      ), // Fetching dataset details from the service
    enabled: !!businessUnit && !!datasetName && !!resultStatus, // Ensure query runs only if all required fields are provided
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning dataset details and fetching status
  return { datasetDetails: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the data health for a specific business unit within a date range.
 *
 * @param businessUnit - The business unit to fetch data health for.
 * @param startDate - The start date of the range.
 * @param endDate - The end date of the range.
 *
 * @returns {Object} - An object containing data health information and loading status.
 *
 * Sample Input: "Business Unit A", "2025-01-01", "2025-12-31"
 * Sample Output: { data: [{ healthScore: 90, status: "Healthy" }], isFetching: false }
 */
export function useGetBusinessUnitHealth(
  businessUnit: string, // Business unit to get health data for
  startDate: Date, // Start date for the range
  endDate: Date // End date for the range
) {
  // Using the useQuery hook to fetch business unit health data within the date range
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getBusinessUnitHealth", businessUnit, startDate, endDate], // Unique query key for health data
    queryFn: () =>
      qualityDashboardService.getBusinessUnitHealth(
        businessUnit,
        startDate,
        endDate
      ), // Fetching health data from the service
    enabled: !!businessUnit && !!startDate && !!endDate, // Only run query if all required fields are provided
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning business unit health data and fetching status
  return { businessDatasetUnitHealth: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the rule categories for a specific business unit.
 *
 * @param businessUnit - The business unit to fetch rule categories for.
 *
 * @returns {Object} - An object containing rule categories and loading status.
 *
 * Sample Input: "Business Unit A"
 * Sample Output: { data: ["Category 1", "Category 2"], isFetching: false }
 */
export function useGetRuleCategories(businessUnit: string) {
  // Using the useQuery hook to fetch rule categories for the given business unit
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getRuleCategories", businessUnit], // Unique query key based on the business unit
    queryFn: () => qualityDashboardService.getRuleCategories(businessUnit), // Fetching rule categories from the service
    enabled: !!businessUnit, // Only run query if business unit is provided
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Returning rule categories and fetching status
  return { ruleCategories: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the summary of a specific rule category within a business unit.
 *
 * @param businessUnit - The business unit to fetch rule category summary for.
 * @param ruleCategory - The specific rule category to fetch the summary for.
 *
 * @returns {Object} - An object containing rule category summary and loading status.
 *
 * Sample Input: "Business Unit A", "Data Integrity"
 * Sample Output: { data: { totalRules: 10, passed: 8, failed: 2 }, isFetching: false }
 */
export function useGetRuleCategorySummary(
  businessUnit: string, // The name of the business unit (like "Business Unit A").
  ruleCategory: string // The specific category of rules we want to get a summary for (e.g., "Data Integrity").
) {
  // The `useQuery` hook is used to fetch data asynchronously from a service (qualityDashboardService).
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // `queryKey` is a unique identifier for the data request.
    queryKey: ["getRuleCategorySummary", businessUnit, ruleCategory],
    // `queryFn` defines the function that will fetch the data (it calls an API to get the summary).
    queryFn: () =>
      qualityDashboardService.getRuleCategorySummary(
        businessUnit, // Pass the business unit name to the API.
        ruleCategory // Pass the rule category to the API.
      ),
    // `enabled` ensures that the query is only run if both businessUnit and ruleCategory are provided.
    enabled: !!businessUnit && !!ruleCategory,
    // `refetchOnWindowFocus` is set to false so the data doesn't automatically reload when the window is focused.
    refetchOnWindowFocus: false,
  });

  // Return the fetched data (`ruleCategorySummary`) and the loading state (`isFetching`).
  return { ruleCategorySummary: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the available filters for data quality dashboards.
 *
 * @returns {Object} - An object containing available filters and loading status.
 *
 * Sample Output:
 * { data: [{ filterName: "DateRange", filterType: "date" }, { filterName: "ResultStatus", filterType: "select" }], isFetching: false }
 */
export function useGetFilters() {
  // Fetch available filters for the data quality dashboard.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getFilters"], // Unique key for the request.
    queryFn: () => qualityDashboardService.getFilters(), // Call the API to get the list of available filters.
    refetchOnWindowFocus: false, // Prevent automatic refetch when the window is focused.
  });

  // Return the filters data (`data`) and the loading state (`isFetching`).
  return { data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the failed rules and last run information based on applied filters.
 * It uses the filters defined in the `DQDDetailedViewFiltersStore`.
 *
 * @param ruleCategory - The rule category to filter by.
 * @param resultStatus - The result status to filter by (e.g., "Failed").
 *
 * @returns {Object} - An object containing the failed rules and last run details.
 *
 * Sample Input: "Data Integrity", "Failed"
 * Sample Output: { data: [{ ruleName: "Rule X", lastRun: "2025-11-15" }], isFetching: false }
 */
export function useGetRuleDetails(ruleCategory: string, resultStatus: string) {
  // Fetch the applied filters for catalog, schema, and dataset from a store.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch data based on the applied filters and the specific rule category and result status.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // `queryKey` includes filters and other parameters to uniquely identify the request.
    queryKey: [
      "getRuleDetails", appliedCatalog, appliedSchema, appliedDataset, ruleCategory, resultStatus
    ],
    // Call the API to get rule details using the filters and inputs.
    queryFn: () =>
      qualityDashboardService.getRuleDetails(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset, // Pass the dataset filter.
        ruleCategory, // Pass the rule category filter.
        resultStatus // Pass the result status filter (like "Failed").
      ),
    // Only fetch the data if all required parameters are available.
    enabled:
      !!appliedCatalog &&
      !!appliedSchema &&
      !!appliedDataset &&
      !!ruleCategory &&
      !!resultStatus,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched rule details (`ruleDetails`) and the loading state (`isFetching`).
  return { ruleDetails: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch an overview of the data based on applied filters.
 * This pulls a general summary of the data quality for the selected catalog, schema, and dataset.
 *
 * @returns {Object} - An object containing the data overview and loading status.
 *
 * Sample Output: { data: { overview: {...} }, isFetching: false }
 */
export function useGetOverview() {
  // Fetch the applied filters for catalog, schema, and dataset.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch data based on the applied filters for a general overview.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getOverview", appliedCatalog, appliedSchema, appliedDataset],
    queryFn: () =>
      qualityDashboardService.getOverview(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset // Pass the dataset filter.
      ),
    // Only fetch the data if all required filters are available.
    enabled: !!appliedCatalog && !!appliedSchema && !!appliedDataset,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched overview data (`overviewData`) and the loading state (`isFetching`).
  return { overviewData: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch metadata details for the selected catalog, schema, and dataset.
 *
 * @returns {Object} - An object containing metadata details and loading status.
 *
 * Sample Output: { data: { metadata: {...} }, isFetching: false }
 */
export function useGetMetadata() {
  // Fetch the applied filters for catalog, schema, and dataset.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch metadata details using the applied filters.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getMetadata", appliedCatalog, appliedSchema, appliedDataset],
    queryFn: () =>
      qualityDashboardService.getMetadata(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset // Pass the dataset filter.
      ),
    // Only fetch the data if all required filters are available.
    enabled: !!appliedCatalog && !!appliedSchema && !!appliedDataset,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched metadata (`metadata`) and the loading state (`isFetching`).
  return { metadata: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the data profile for the selected catalog, schema, and dataset.
 *
 * @returns {Object} - An object containing data profile details and loading status.
 *
 * Sample Output: { data: { profile: {...} }, isFetching: false }
 */
export function useGetDataProfile() {
  // Fetch the applied filters for catalog, schema, and dataset.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch the data profile using the applied filters.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getDataProfile", appliedCatalog, appliedSchema, appliedDataset],
    queryFn: () =>
      qualityDashboardService.getDataProfile(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset // Pass the dataset filter.
      ),
    // Only fetch the data if all required filters are available.
    enabled: !!appliedCatalog && !!appliedSchema && !!appliedDataset,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched data profile (`dataProfile`) and the loading state (`isFetching`).
  return { dataProfile: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch data drift information for the selected catalog, schema, and dataset.
 *
 * @returns {Object} - An object containing data drift information and loading status.
 *
 * Sample Output: { data: { drift: {...} }, isFetching: false }
 */
export function useGetDataDrift() {
  // Fetch the applied filters for catalog, schema, and dataset.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch data drift details using the applied filters.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getDataDrift", appliedCatalog, appliedSchema, appliedDataset],
    queryFn: () =>
      qualityDashboardService.getDataDrift(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset // Pass the dataset filter.
      ),
    // Only fetch the data if all required filters are available.
    enabled: !!appliedCatalog && !!appliedSchema && !!appliedDataset,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched data drift information (`dataDrift`) and the loading state (`isFetching`).
  return { dataDrift: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the data health for the selected catalog, schema, and dataset within a date range.
 *
 * @param startDate - The start date for the data health query.
 * @param endDate - The end date for the data health query.
 *
 * @returns {Object} - An object containing data health information and loading status.
 *
 * Sample Input: "2025-01-01", "2025-12-31"
 * Sample Output: { data: { health: "Good" }, isFetching: false }
 */
export function useGetDataHealth(startDate: Date, endDate: Date) {
  // Fetch the applied filters for catalog, schema, and dataset.
  const { appliedCatalog, appliedSchema, appliedDataset } =
    useDQDDetailedViewFiltersStore();
  
  // Fetch data health details using the applied filters and date range.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: [
      "getDataHealth",
      appliedCatalog, appliedSchema, appliedDataset, startDate, endDate
    ],
    queryFn: () =>
      qualityDashboardService.getDataHealth(
        appliedCatalog, // Pass the catalog filter.
        appliedSchema, // Pass the schema filter.
        appliedDataset, // Pass the dataset filter.
        startDate, // Pass the start date for the health query.
        endDate // Pass the end date for the health query.
      ),
    // Only fetch the data if all required filters and dates are available.
    enabled:
      !!appliedCatalog &&
      !!appliedSchema &&
      !!appliedDataset &&
      !!startDate &&
      !!endDate,
    refetchOnWindowFocus: false, // Don't automatically refetch when the window gains focus.
  });

  // Return the fetched data health (`dataHealth`) and the loading state (`isFetching`).
  return { dataHealth: data, isFetching: isLoading };
}
