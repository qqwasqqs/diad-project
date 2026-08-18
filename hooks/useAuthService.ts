/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This script provides a custom React hook for fetching the current authenticated user's details.
    - It leverages the `useQuery` hook from React Query to fetch user data from the authentication service.
    - The hook returns the user data and the loading state.
    - It ensures data caching, disables retries on failure, and prevents refetching on window focus.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A data-fetching and caching library for React (commonly called React Query).
    - Why used: Manages server state, caching, background updates, and simplifies async data fetching with hooks like `useQuery`.
*/
import { useQuery } from "@tanstack/react-query"; // Importing the useQuery hook from React Query

/*
  @/lib/services/authService
    - What it is: Local module exposing functions that call authentication-related backend APIs (e.g., fetch current user).
    - Why used: Encapsulates API calls so the hook can request the current user's details without directly dealing with HTTP logic.
*/
import { authService } from "@/lib/services/authService"; // Importing the auth service to fetch user data

/**
 * Custom hook that fetches the current authenticated user's data using React Query.
 * This hook calls the `authService.useFetchMe()` function and returns the user data.
 * It provides a loading state to indicate whether the data is being fetched.
 *
 * @returns {Object} - Returns an object with `data` (user details) and `isFetching` (loading state).
 *
 * Sample Input:
 *  - No input is required for this function as it fetches the current user data.
 *
 * Sample Output:
 *  - Example:
 *    {
 *      data: {
 *        id: "12345",
 *        username: "johndoe",
 *        email: "john.doe@example.com",
 *        roles: ["user", "admin"]
 *      },
 *      isFetching: false
 *    }
 */
export function useFetchMe() {
  // Use React Query's `useQuery` hook to fetch the current user's data
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    /* queryKey: unique identifier for this query used by React Query's cache */
    queryKey: ["fetchMe"],
    /* queryFn: the function that actually fetches data from the server via authService */
    queryFn: () => authService.fetchMe(),
    /* staleTime: how long the data is considered fresh (Infinity means never considered stale)
       Real-world example: If the user info rarely changes, we avoid re-fetching it unnecessarily. */
    staleTime: Infinity,
    /* retry: whether to automatically retry failed requests. Disabled to avoid repeated auth calls on failure. */
    retry: false,
    /* refetchOnWindowFocus: avoid refetch when user switches back to the app window to reduce noise */
    refetchOnWindowFocus: false,
  });

  if(!isLoading) {
    console.log("permissions:", data);
  }

  // Return the fetched data and the loading state as a custom hook result
  // We map `isLoading` to `isFetching` for a clearer external API name
  return { data, isFetching: isLoading };
}

export function useDashboardModules() {
  // React Query manages loading, caching, and reusing the dashboard module API response.
  const { data, isLoading } = useQuery({
    // Unique cache name for this request.
    // Example: other components using this same key receive the cached module list.
    queryKey: ["dashboardModules"],
    // Actual API call that asks the backend for modules visible to the logged-in user.
    queryFn: () => authService.fetchDashboardModules(),
    // Keep the module list fresh for five minutes because permissions rarely change every second.
    // staleTime: 5 * 60 * 1000,
    // Do not retry automatically; a 401/403 should remain visible instead of repeating requests.
    retry: false,
    // Avoid reloading modules every time the browser tab gets focus.
    refetchOnWindowFocus: false,
  });

  // Return both the raw response and a convenience modules array for UI components.
  // Example: const { modules } = useDashboardModules(); can feed a side navigation menu.
  const modules = data?.modules || [];
  const dashboardModules = [{
      moduleId: "executive-dashboard",
      moduleSlug: "/executive-dashboard",
      displayName: "Executive Dashboard",
      iconPath: "PeopleTeam20Regular",
      requiredPermissions: [],
      children: []
    },
    {
      moduleId: "tech-team-dashboard",
      moduleSlug: "/tech-team-dashboard",
      displayName: "Tech Team Dashboard",
      iconPath: "PeopleTeamToolbox20Regular",
      requiredPermissions: [],
      children: []
    },
    {
      moduleId: "product-owner-dashboard",
      moduleSlug: "/product-owner-dashboard",
      displayName: "Product Owner Dashboard",
      iconPath: "PersonStar20Regular",
      requiredPermissions: [],
      children: []
    },{
      moduleId: "operations-team-dashboard",
      moduleSlug: "/operations-team-dashboard",
      displayName: "Operations Team Dashboard",
      iconPath: "PeopleSettings20Regular",
      requiredPermissions: [],
      children: []
    }
  ];
 
  return { data, modules: [...dashboardModules, ...modules ], isFetching: isLoading };
}
