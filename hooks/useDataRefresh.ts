/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script contains custom React hooks to fetch data refresh status and trend data
    for the Teva Data Integrity Automation Dashboard.
    - These hooks interact with the data refresh service to fetch overall refresh stats
      and time-series trend details for unrefreshed datasets.
    - They use React Query for data fetching, caching, and loading state management.
    - The code structure allows efficient querying, data refetching, and filter handling
      for both the overall and business-unit-scoped refresh views on the dashboard.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A data-fetching and caching library for React (handles async operations).
    - Why used: Provides `useQuery` which simplifies data fetching, caching, and loading state
      management in these hooks, including automatic deduplication and stale-data tracking.
*/
import { useQuery } from "@tanstack/react-query";

/*
  @/lib/services/dataRefreshService
    - What it is: Local service module that wraps HTTP calls to the data refresh backend endpoints.
    - Why used: Encapsulates API calls so hooks only need to invoke high-level methods like
      `getDataRefresh()` and `getDataRefreshTrendDetails()` without managing fetch logic directly.
*/
import { dataRefreshService } from "@/lib/services/dataRefreshService";

/**
 * Custom hook to fetch the data refresh status for a given date range,
 * optionally filtered by business unit and rule category.
 *
 * Returns aggregate KPI counts (refreshed datasets, unrefreshed datasets, last refresh timestamp)
 * used to populate the DataRefreshStats summary cards on the dashboard.
 *
 * @param startDate    - The start of the date window to filter refresh records by.
 * @param endDate      - The end of the date window to filter refresh records by.
 * @param businessUnit - Optional L1 Business Unit name to scope results to a single unit (e.g. "US Commercial").
 * @param ruleCategory - Optional rule category name to scope results to a specific category (e.g. "metadata").
 *
 * @returns {Object} - An object containing the data refresh summary and loading status.
 *
 * Sample Input: startDate = 2025-11-03, endDate = 2025-11-10, businessUnit = "US Commercial"
 * Sample Output: { data: { refreshed_datasets: 80, unrefreshed_datasets: 20, last_refresh_timestamp: "2025-11-10T09:45:00Z" }, isFetching: false }
 */
export function useGetDataRefresh(
    startDate: Date,
    endDate: Date,
    businessUnit?: string, // Optional parameter for business unit name
    ruleCategory?: string, // Optional parameter for rule category name
  ) {
    // useQuery returns `data` and `isLoading` which indicate the fetched payload and loading state
    const { data, isLoading } = useQuery({
      // The `queryKey` is used by React Query to uniquely identify the query.
      // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
      /* include all filter params in the key so each unique combination has its own cache entry */
      queryKey: ["getDataRefresh", businessUnit, ruleCategory, startDate, endDate], // Unique query key to manage caching
      /* call the service with all filter parameters; businessUnit and ruleCategory are optional */
      queryFn: () =>
        dataRefreshService.getDataRefresh(startDate, endDate, businessUnit, ruleCategory), // Fetching the refresh status for business unit and rule category
      /* do not refetch automatically when window is focused to reduce network calls */
      enabled: !!startDate && !!endDate, // Only fetch when all required inputs are present
      refetchOnWindowFocus: false, // Preventing refetching when the window is focused
    });
  
    // Return a friendly shape: `data` contains the payload, `isFetching` exposes the loading state
    return { data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the time-series trend data for unrefreshed datasets,
 * used to populate the DataRefreshTrendChart on the dashboard.
 *
 * Returns an array of bucketed data points (one per time bucket), each containing
 * the unrefreshed count and individual dataset detail records for drill-down.
 * The bucket size is determined server-side based on the width of the date range.
 *
 * @param startDate    - The start of the date window to filter trend records by.
 * @param endDate      - The end of the date window to filter trend records by.
 * @param businessUnit - Optional L1 Business Unit name to scope trend to a single unit (e.g. "US Commercial").
 * @param datasetName  - Optional fully-qualified dataset name to scope trend to a single dataset
 *                       for the drill-down dialog view (e.g. "catalog.schema.my_table").
 *
 * @returns {Object} - An object containing the trend data array and loading status.
 *
 * Sample Input: startDate = 2025-11-03, endDate = 2025-11-10, businessUnit = "US Commercial"
 * Sample Output: { data: [{ date: "05-11-2025", bucket_label: "05 Nov 2025 - 09 Nov 2025", unrefreshed_count: 12, dataset_details: [...] }], isFetching: false }
 */
export function useGetDataRefreshTrendDetails(
    startDate: Date,
    endDate: Date,
    businessUnit?: string,
    datasetName?: string, 
) {
  // useQuery returns `data` and `isLoading` which indicate the fetched payload and loading state
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    /* include all filter params in the key so BU-level and dataset-level trend data are cached separately */
    queryKey: ["getDataRefreshTrendDetails", businessUnit, datasetName, startDate, endDate], // Unique query key to manage caching
    /* call the service with all filter parameters; businessUnit and datasetName are optional */
    queryFn: () =>
      dataRefreshService.getDataRefreshTrendDetails(startDate, endDate, businessUnit, datasetName), // Fetching the refresh status for business unit and rule category
    /* do not refetch automatically when window is focused to reduce network calls */
    enabled: !!startDate && !!endDate, // Only fetch when all required inputs are present
    refetchOnWindowFocus: false, // Preventing refetching when the window is focused
  });

  // Return a friendly shape: `data` contains the trend array, `isFetching` exposes the loading state
  return { data, isFetching: isLoading };
}