/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script contains custom React hooks to fetch various KPI data for the Teva Data Integrity Automation Dashboard. 
    - These hooks interact with the KPI dashboard service to fetch summary views, vendor details, and KPI data.
    - They use React Query for data fetching and caching.
    - The code structure allows efficient querying, data refetching, and filter handling in the dashboard.
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

/*  
  @/lib/services/kpiDashboardService
    - What it is: Local service module that wraps HTTP calls to KPI-related backend endpoints.
    - Why used: Encapsulates API calls so hooks only need to invoke high-level methods like `getKPISummary()`.
*/
import { kpiDashboardService } from "@/lib/services/kpiDashboardService";
/*  
  @/store/kpiDetailedViewFiltersStore
    - What it is: Local Zustand store exposing filters applied in the detailed KPI view.
    - Why used: Provides the currently selected brand/KPI/vendor so the developer-specific hook can fetch filtered data.
*/
import { useKPIDetailedViewFilterStore } from "@/store/kpiDetailedViewFiltersStore";

/**
 * Custom hook to fetch the KPI summary data for the dashboard.
 * This provides a high-level view of key performance indicators (KPIs) for the system.
 *
 * @returns {Object} - An object containing the KPI summary data and loading status.
 *
 * Sample Output: { data: { totalKPIs: 150, passed: 130, failed: 20 }, isFetching: false }
 */
export function useGetKPISummary() {
  // useQuery returns `data` and `isLoading` which indicate fetched payload and loading state
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    /* unique cache key for this query */
    queryKey: ["getKPISummary"],
    /* function that performs the HTTP request via the service layer */
    queryFn: () => kpiDashboardService.getKPISummary(),
    /* do not refetch automatically when window is focused to reduce network calls */
    refetchOnWindowFocus: false,
  });

  // Return a friendly shape: `summaryData` contains the payload, `isFetching` exposes loading state
  return { summaryData: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the KPI details for a specific brand.
 * This provides a detailed breakdown of KPIs for a particular brand.
 *
 * @param brand - The name of the brand to fetch details for.
 *
 * @returns {Object} - An object containing the KPI details for the specified brand and loading status.
 *
 * Sample Input: "BrandA"
 * Sample Output: { data: { kpis: [...] }, isFetching: false }
 */
export function useGetKPIDetailsForBrand(brand: string) {
  // Query for KPI details scoped to a specific brand
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    /* include `brand` in the query key so cache separates different brands */
    queryKey: ["getKPIDetailsForBrand", brand],
    /* call service with the brand parameter */
    queryFn: () => kpiDashboardService.getKPIDetailsForBrand(brand),
    /* only run query when `brand` is truthy */
    enabled: !!brand,
    // Do not refetch automatically when window is focused to reduce network calls
    refetchOnWindowFocus: false,
  });

  // Return the brand-specific KPI details and loading flag
  return { brandKPIDetails: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the status-wise KPI details for a brand.
 * This allows filtering KPIs by their result status (e.g., Passed, Failed).
 *
 * @param brand - The name of the brand to fetch details for.
 * @param resultStatus - The status to filter the KPIs by (e.g., "Passed", "Failed").
 *
 * @returns {Object} - An object containing the filtered KPI details and loading status.
 *
 * Sample Input: "BrandA", "Passed"
 * Sample Output: { data: { kpis: [...] }, isFetching: false }
 */
export function useGetStatusWiseKPIDetails(
  brand: string,
  resultStatus: string
) {
  // Query to fetch KPI details filtered by status for a brand
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    /* cache key includes brand and resultStatus to separate cache entries */
    queryKey: ["getStatusWiseKPIDetails", brand, resultStatus],
    /* call the service with both parameters */
    queryFn: () =>
      kpiDashboardService.getStatusWiseKPIDetails(brand, resultStatus),
    /* only enable when both brand and resultStatus are provided */
    enabled: !!brand && !!resultStatus,
    // Do not refetch automatically when window is focused to reduce network calls
    refetchOnWindowFocus: false,
  });

  // Return filtered KPI details and loading indicator
  return { statusWiseKPIDetails: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch vendor-specific KPI details for a brand.
 * This fetches KPI details filtered by vendor for a particular brand.
 *
 * @param brand - The name of the brand to fetch details for.
 * @param vendor - The name of the vendor to filter KPIs by.
 *
 * @returns {Object} - An object containing vendor-specific KPI details and loading status.
 *
 * Sample Input: "BrandA", "VendorX"
 * Sample Output: { vendorData: { kpis: [...] }, isFetchingVendor: false }
 */
export function useGetKPIVendorDetailsForBrandAndVendor(
  brand: string,
  vendor: string
) {
  // Query to fetch vendor-specific KPI data for a brand
  // Use the useQuery hook to fetch vendor-specific KPI data for a brand
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Unique cache key for this query, includes brand and vendor to separate cache entries
    queryKey: ["getKPIVendorDetailsForBrandAndVendor", brand, vendor],
    // Function that performs the HTTP request via the service layer with brand and vendor parameters
    queryFn: () =>
      kpiDashboardService.getKPIVendorDetailsForBrandAndVendor(brand, vendor),
    // Only enable the query when both brand and vendor are provided
    enabled: !!brand && !!vendor,
    // Do not refetch automatically when window is focused to reduce network calls
    refetchOnWindowFocus: false,
  });

  // Return vendor data and a vendor-specific loading flag
  return { vendorData: data, isFetchingVendor: isLoading };
}

/**
 * Custom hook to fetch the list of available KPI filters for data quality dashboard.
 * This allows users to filter KPIs based on various criteria like date, result status, etc.
 *
 * @returns {Object} - An object containing the available filters and loading status.
 *
 * Sample Output: { data: [{ filterName: "DateRange", filterType: "date" }, { filterName: "ResultStatus", filterType: "select" }], isFetching: false }
 */
export function useGetKPIFilters() {
  // Query to get available KPI filters (date ranges, statuses, etc.)
  // Use the useQuery hook to fetch available KPI filters
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Unique cache key for this query
    queryKey: ["getKPIFilters"],
    // Function that performs the HTTP request via the service layer to get filters
    queryFn: () => kpiDashboardService.getKPIFilters(),
    // Do not refetch automatically when window is focused to reduce network calls
    refetchOnWindowFocus: false,
  });

  // Return filter options and loading indicator
  return { filtersData: data, isFetching: isLoading };
}

/**
 * Custom hook to fetch developer-specific KPI details based on applied filters.
 * This fetches detailed KPI information based on filters set by the user for the brand, KPI, and vendor.
 *
 * @returns {Object} - An object containing the developer KPI details and loading status.
 *
 * Sample Output: { data: { kpis: [...] }, isFetching: false }
 */
export function useGetDeveloperKPIDetails() {
  // Extract the applied filters from the store
  const { appliedBrand, appliedKpi, appliedVendor } =
    useKPIDetailedViewFilterStore();

  // Query for developer-specific KPI details using the currently applied filters from the store
  // Use the useQuery hook to fetch developer-specific KPI details based on applied filters
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    // Unique cache key for this query, includes applied filters to separate cache entries
    queryKey: [
      "getDeveloperKPIDetails",
      appliedBrand,
      appliedKpi,
      appliedVendor,
    ],
    // Function that performs the HTTP request via the service layer with applied filters
    queryFn: () =>
      kpiDashboardService.getDeveloperKPIDetails(
        appliedBrand,
        appliedKpi,
        appliedVendor
      ),
    // Only enable the query when all filters are applied (truthy values)
    enabled: !!appliedBrand && !!appliedKpi && !!appliedVendor,
    // Do not refetch automatically when window is focused to reduce network calls
    refetchOnWindowFocus: false,
  });

  // Return developer KPI details and loading flag
  return { developerKPIDetails: data, isFetching: isLoading };
}
