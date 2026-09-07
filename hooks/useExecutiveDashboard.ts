/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script contains the custom React hook `useExecutiveMainView`, which
    fetches the AI Observability Executive dashboard main view.
    - The hook uses the `react-query` library to handle asynchronous fetching.
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
    - Why used here: `useQuery` simplifies fetching the main-view payload,
        provides a stable loading state, and caches results to avoid
        unnecessary network calls.
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
import type { DashboardFilters } from "@/types/dashboard";

/**
 * Data hook for the AI Observability Executive main view.
 *
 * Fetching lives here so the page stays a presentation component. The filters
 * are part of the query key, so selecting a different scope in the global filter
 * bar refetches and caches independently.
 */
export function useExecutiveMainView(filters: DashboardFilters = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["executiveDashboardMainView", filters],
    queryFn: () => executiveDashboardService.getMainView(filters),
    refetchOnWindowFocus: false,
  });

  return {
    mainViewData: data,
    isFetchingMainView: isLoading,
    isMainViewError: isError,
    mainViewError: error,
  };
}
