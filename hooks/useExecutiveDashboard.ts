/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script contains the custom React hook `useGetExecutiveDashboardHighlights` to fetch executive dashboard highlights.
    - The hook uses the `react-query` library to handle asynchronous fetching of the executive dashboard highlights data.
    - It provides an interface to easily query and track the loading state of the data for use in components.
    - The hook leverages the `executiveDashboardService` to interact with the backend API for fetching data.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A data-fetching and caching library for React (handles async
        requests, background refetching, and caching so components remain simple).
    - Why used here: `useQuery` simplifies fetching highlight data, provides
        a stable loading state, and caches results to avoid unnecessary network calls.
*/
import { useQuery } from "@tanstack/react-query"; // Hook from react-query for data fetching, caching and status
/*
  @/lib/services/executiveDashboardService
    - What it is: A local service module that contains functions to call the
        backend API endpoints related to the executive dashboard.
    - Why used here: The hook delegates the actual HTTP/network logic to this
        service so the hook remains focused on lifecycle and state management.
*/
import { executiveDashboardService } from "@/lib/services/executiveDashboardService"; // Service module that wraps API calls for executive dashboard

/**
 * Custom hook to fetch executive dashboard highlights.
 *
 * This hook uses the `react-query` library to fetch the executive highlights asynchronously.
 * It provides a `highlightData`/ `pipelineHighlightData` variable that contains the data once fetched and an `isFetchingHighlight`/`isFetchingPipelineHighlight` variable
 * that tracks the loading state.
 *
 * @returns {Object} - The hook returns an object containing:
 *   - `highlightData`: The fetched executive highlights data (or null if loading).
 *   - `isFetchingHighlight`: A boolean indicating whether the data is being fetched.
 *
 * Sample Usage:
 * ```
 * const { highlightData, isFetchingHighlight } = useExecutiveDashboard();
 * const { pipelineHighlightData, isFetchingPipelineHighlight } = getPipelineHighlights();
 * ```
 *
 * Sample Input: No input required.
 * Sample Output:
 * ```
 * {
 *   highlightData: {
 *     totalSales: 100000,
 *     newCustomers: 500,
 *     topPerformingRegion: "North America"
 *   },
 *   isFetchingHighlight: false
 * }
 * ```
 */
export function useGetExecutiveDashboardHighlights() {
  // Use the `useQuery` hook to fetch the executive highlights from the backend
  // `useQuery` returns an object with `data`, `isLoading`, `error`, etc.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // `queryKey` uniquely identifies this query in the cache
    queryKey: ["getExecutiveDashboardHighlights"],

    // `queryFn` is the function that will be called to fetch data when needed
    queryFn: () => executiveDashboardService.getExecutiveDashboardHighlights(),

    // Keep results stable and avoid refetching on browser focus for performance
    refetchOnWindowFocus: false,
  });

  // Return the highlight data and loading state to any component that uses this hook
  return {
    // `highlightData`: contains the API response (or `undefined` while loading)
    highlightData: data,

    // `isFetchingHighlight`: boolean that is true while the query is in progress
    isFetchingHighlight: isLoading,
  };
}

export function useGetPipelineHighlights() {
  // Use the `useQuery` hook to fetch the pipeline executive highlights from the backend
  // `useQuery` returns an object with `data`, `isLoading`, `error`, etc.
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // `queryKey` uniquely identifies this query in the cache
    queryKey: ["getExecutiveDashboardPipelineHighlights"],

    // `queryFn` is the function that will be called to fetch data when needed
    queryFn: () => executiveDashboardService.getPipelineHighlights(),

    // Keep results stable and avoid refetching on browser focus for performance
    refetchOnWindowFocus: false,
  });

  // Return the highlight data and loading state to any component that uses this hook
  return {
    // `pipelineHighlightData`: contains the API response (or `undefined` while loading)
    pipelineHighlightData: data,

    // `isFetchingPipelineHighlight`: boolean that is true while the query is in progress
    isFetchingPipelineHighlight: isLoading
  };
}