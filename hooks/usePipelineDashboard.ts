/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Parthesh Patel
  Date: 20 December 2025

  Purpose of the script:
    This script defines custom React hooks for fetching pipeline-related data
    for the Teva Data Integrity Automation Dashboard.

    Key Responsibilities:
    - Fetches complete pipeline data for dashboard listings.
    - Retrieves filtered pipeline data based on execution status.
    - Fetches high-level pipeline highlights for summary cards.
    - Retrieves detailed trend and status distribution data for individual pipelines.
    - Uses React Query for efficient data fetching, caching, and state management.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A powerful data-fetching and caching library for React.
    - Why used: Provides the `useQuery` hook which manages asynchronous API calls,
      caching, loading states, and refetching logic for these dashboard hooks.
*/
import { useQuery } from "@tanstack/react-query";

/*
  @/lib/services/pipelineDashboardService
    - What it is: A local service module that wraps HTTP calls to pipeline-related
      backend endpoints.
    - Why used: Encapsulates API logic so the hooks only call high-level methods
      such as `getPipelineData()` or `getPipelineTrendDetails()`.
*/
import { pipelineDashboardService } from "@/lib/services/pipelineDashboardService";

// constant stale time to increase waiting time for query
const STALE_TIME_MS = 2*60*1000;

// ---------------------------------------------------------------------
// HOOKS
// ---------------------------------------------------------------------

/**
 * Custom hook to fetch all pipeline data.
 * This provides a complete dataset of pipelines for the dashboard.
 *
 * @param startDate - Start date of the range from whcih the data needs to be fetched.
 * @param endDate - End date of the range from whcih the data needs to be fetched.
 * 
 * @returns {Object} - An object containing the pipeline data and loading status.
 *
 * Sample Input: 
 *   status: "Failed"
 * Sample Output:
 *   { data: [...], isFetching: false }
 */
export function useGetPipelineNames(
  startDate: Date | null,
  endDate: Date | null
  ) {
  // Calls React Query's useQuery hook to fetch pipeline data
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Unique cache key used by React Query to store and identify this request
    queryKey: ["getPipelineData", startDate, endDate],

    // Function that performs the HTTP request via the service layer
    queryFn: () => pipelineDashboardService.getPipelineNames(startDate, endDate),

    // Enables the query only when a valid status value is provided
    enabled: !!startDate && !!endDate,

    // Prevents automatic refetch when the browser window regains focus
    refetchOnWindowFocus: false,

    staleTime: STALE_TIME_MS
  });

  // Returns the fetched data along with a normalized loading flag
  return { data, isFetching: isLoading };
}

/**
 * Custom hook to fetch filtered pipeline data based on status.
 * This allows the dashboard to show pipelines matching a specific execution state.
 *
 * @param status - The pipeline status used to filter results (e.g., "Succeeded", "Failed").
 * @param startDate - Start timestamp of the range for the data.
 * @param endDate - End timestamp of the range for the data.
 *
 * @returns {Object} - An object containing filtered pipeline data and loading status.
 *
 * Sample Input: "Failed"
 * Sample Output: { filteredData: [...], isFetchingFilteredData: false }
 */
export function useGetFilteredPipelineData(
  status: string,
  startDate: Date | null,
  endDate: Date | null
  ) {
  // Calls useQuery to fetch pipeline data filtered by the provided status
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Cache key includes the status so different statuses are cached separately
    queryKey: ["getFilteredPipelineData", status, startDate, endDate],

    // API call to fetch filtered pipeline data from the service layer
    queryFn: () => pipelineDashboardService.getFilteredPipelineData(status, startDate, endDate),

    // Enables the query only when a valid status value is provided
    enabled: !!status && !!endDate && !!startDate,

    // Prevents automatic refetch on window focus to reduce unnecessary network calls
    refetchOnWindowFocus: false,

    staleTime: STALE_TIME_MS
  });

  // Returns the filtered data with a descriptive loading state flag
  return { filteredData: data, isFetchingFilteredData: isLoading };
}

/**
 * Custom hook to fetch pipeline highlights.
 * This retrieves summary-level information displayed in highlight cards on the dashboard.
 * 
 * @param startDate - Start date of the range from whcih the data needs to be fetched.
 * @param endDate - End date of the range from whcih the data needs to be fetched.
 *
 * @returns {Object} - An object containing highlight data and loading status.
 *
 * Sample Output:
 *   { highlightsData: {...}, isFetchingHighlights: false }
 */
export function useGetPipelineHighlights(
  startDate: Date | null,
  endDate: Date | null
) {
  // Executes a React Query request for pipeline highlights
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Unique query key for caching highlight data
    queryKey: ["getPipelineHighlights", startDate, endDate],

    // Function that retrieves highlight metrics from the service layer
    queryFn: () => pipelineDashboardService.getPipelineHighlights(startDate, endDate),

    enabled: !!startDate && !!endDate,

    // Disables automatic refetch on window focus
    refetchOnWindowFocus: false,

    staleTime: STALE_TIME_MS
  });

  // Returns highlight data and a clearly named loading flag
  return { highlightsData: data, isFetchingHighlights: isLoading };
}

/**
 * Custom hook to fetch trend and status distribution details for a specific pipeline.
 * This is used to drive charts such as trend lines and donut charts for a selected pipeline.
 *
 * @param pipelineName - The name of the pipeline for which trend details are requested.
 * @param startDate - Start date of the range from whcih the data needs to be fetched.
 * @param endDate - End date of the range from whcih the data needs to be fetched.
 * @param triggerId - TriggerId of the pipeline run event.
 *
 * @returns {Object} - An object containing trend data and loading status.
 *
 * Sample Input: "Pipeline_A"
 * Sample Output: { data: {...}, isFetching: false }
 */
export function useGetPipelineTrendDetails(
  pipelineName: string,
  startDate: Date | null,
  endDate: Date | null,
  triggerId: string | null
  ) {
  // Uses React Query to fetch trend details for the specified pipeline
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Cache key includes pipelineName so each pipeline has a separate cache entry
    queryKey: ["getPipelineTrendDetails", pipelineName, startDate, endDate, triggerId],

    // API call to fetch trend details for the selected pipeline
    queryFn: () => pipelineDashboardService.getPipelineTrendDetails(pipelineName, startDate, endDate, triggerId),

    // Ensures the query only runs when a valid pipeline name is provided
    enabled: !!pipelineName && !!startDate && !!endDate,

    // Prevents automatic refetch on window focus to avoid redundant calls
    refetchOnWindowFocus: false,
  });

  // Returns the trend data and a normalized loading flag
  return { data: data, isFetching: isLoading }
};
