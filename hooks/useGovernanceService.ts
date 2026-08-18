/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script provides React hooks that interact with governance-related API services, specifically fetching 
    information on user activities, update history, login activities, and user privileges.
    - The hooks leverage `react-query` for data fetching, caching, and state management.
    - The hooks are reusable and can be used across components to fetch governance data consistently.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
    - What it is: A popular data-fetching and caching library for React apps
      (formerly "react-query"). It manages asynchronous requests, caching,
      background refetching, and loading/error states so components stay
      simple and focused on rendering.
    - Why used: The hooks in this file call `useQuery` to fetch governance
      data and automatically get caching, deduping, and loading state
      behavior without implementing those features manually.
*/
import { useQuery } from "@tanstack/react-query"; // Importing `useQuery` from React Query for fetching data
/*
  @/lib/services/governanceService
    - What it is: A local module that wraps API calls related to governance
      (e.g., functions that call REST endpoints or SDK methods).
    - Why used: It keeps network logic separated from UI hooks so the
      hooks only need to call a single method like
      `governanceService.getUserPrivileges()` rather than constructing
      HTTPS requests inline. 
*/
import { governanceService } from "@/lib/services/governanceService"; // Importing governance service methods for API interaction

// ------------------------- Custom Hooks for Governance Data -------------------------

/**
 * Custom hook to fetch the update history of configurations for a specific user.
 * This hook is used to track the configuration changes for a given user and filter
 * the results based on the operation type and date range.
 *
 * @param email - The email of the user whose update history is being fetched.
 * @param operation - The type of operation to filter updates by (e.g., "create", "update", "delete").
 * @param startDate - The start date for filtering the update history.
 * @param endDate - The end date for filtering the update history.
 *
 * @returns {object} - Returns an object containing `data` (update history) and `isFetching` (loading state).
 *
 * Sample Input:
 * {
 *   email: "user@example.com",
 *   operation: "update",
 *   startDate: new Date("2025-01-01"),
 *   endDate: new Date("2025-11-01")
 * }
 * Sample Output:
 * [
 *   { date: "2025-01-15", operation: "update", user: "user@example.com", description: "Updated config XYZ" },
 *   { date: "2025-03-22", operation: "update", user: "user@example.com", description: "Updated config ABC" }
 * ]
 */
export function useGetUpdateHistory(
  type: string,
  table: string,
  email?: string,
  operation?: string,
  startDate?: Date,
  endDate?: Date,
  configId?: string,
  columnName?: string,
) {
  // Call `useQuery` to fetch update history and manage loading/caching
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getUpdateHistory", type, table, email, operation, startDate, endDate, configId, columnName], // Array uniquely identifying this query and its parameters
    queryFn: () =>
      governanceService.getUpdateHistory(type, table, email, operation, startDate, endDate, configId, columnName), // Function that performs the network request when needed
    enabled: !!type && !!table && ((type === "updateHistory" || type === "updateHistoryDetails") ? (!!email && !!operation && !!startDate && !!endDate) || (!!configId && !!columnName) : true), // Only run the query when all filter parameters are present
    refetchOnWindowFocus: false, // Do not auto-refetch when the browser window regains focus
  });

  // Return the fetched data and a boolean flag indicating loading state
  return { data, isFetching: isLoading };
}


/**
 * Custom hook to fetch the login activity of a specific user within a given date range.
 * This hook is used to track user access and activities in the system.
 *
 * @param type - The type of the user whose login activity is being fetched.
 * @param startDate - The start date for filtering the login activities.
 * @param endDate - The end date for filtering the login activities.
 * @param uniqueId - (Optional) A unique identifier to further filter login activities, such as a workspace ID or user ID.
 *
 * @returns {object} - Returns an object containing `data` (login activities) and `isFetching` (loading state).
 *
 * Sample Input:
 * {
 *   type: "inactiveUser",
 *   startDate: new Date("2025-01-01"),
 *   endDate: new Date("2025-11-01"),
 *   uniqueId: "workspace-123"
 * }
 * Sample Output:
 * [
 *   { date: "2025-02-10", user: "user@example.com", action: "login" },
 *   { date: "2025-04-05", user: "user2@example.com", action: "logout" }
 * ]
 */
export function useGetLoginActivities(
  type: string, // The type of login activity to fetch (e.g., "inactiveUser", "activeUser", "workspaceActivity")
  startDate?: Date, // Optional start date for filtering login activities (not required for "inactiveUser" type)
  endDate?: Date, // Optional end date for filtering login activities (not required for "inactiveUser" type)
  uniqueId?: string, // Optional unique identifier for further filtering (e.g., workspace ID, user ID
) {
  // Query to fetch login activity for a user within a date range
  const { data, isLoading } = useQuery({
    // The `queryKey` is used by React Query to uniquely identify the query.
    // It helps React Query cache the result and track whether the data is fresh or if a refetch is needed.
    queryKey: ["getLoginActivities", type, startDate, endDate, uniqueId], // Key includes parameters so cache separates different queries
    queryFn: () =>
      governanceService.getLoginActivities(type, startDate, endDate, uniqueId), // Delegate network call
    enabled:
      !!type && (type === "inactiveUser" ? true : !!startDate && !!endDate), // Only fetch when all required inputs are present
    refetchOnWindowFocus: false, // Avoid refetching when user returns to the tab
  });

  // Return the data and a loading indicator under a consistent shape
  return { data, isFetching: isLoading };
}

/**
 * Custom hook to fetch the privileges of a specific user or service.
 * This hook is used to track access rights and permissions for a given principal.
 *
 * @param type - The type of privileges to fetch (e.g., "totalAccessedDatasetCount", "userWiseDatasetAccess", "principalsAccessDetails").
 * @param catalogName - (Optional) The name of the catalog to filter privileges by.
 * @param schemaName - (Optional) The name of the schema to filter privileges by.
 * @param datasetName - (Optional) The name of the dataset to filter privileges by.
 * @param principalName - (Optional) The name of the principal (user/service) to filter privileges by.
 * @param startDate - (Optional) The start date for filtering privileges.
 * @param endDate - (Optional) The end date for filtering privileges.
 * @param access - (Optional) The type of access to filter privileges by (e.g., "read", "write", "admin").
 *
 * @returns An object containing `data` (user privileges data) and `isFetching` (loading state).
 *
 * Sample Input:
 * {
 *    type: "userWiseDatasetAccess",
 *    catalogName: "SalesData",
 *    schemaName: "Public",
 *    datasetName: "CustomerInfo",
 *    principalName: "user@example.com",
 *    startDate: new Date("2025-01-01"),
 *    endDate: new Date("2025-11-01"),
 *    access: "read"
 * }
 * Sample Output:
 * [
 *   { catalogName: "SalesData", schemaName: "Public", datasetName: "CustomerInfo", principalName: "user@example.com", access: "read" },
 *   { catalogName: "SalesData", schemaName: "Public", datasetName: "CustomerInfo", principalName: " serviceAccount", access: "write" },
 * ]
 */
export function useGetUserPrivileges(
  type: string, // The type of privileges data to fetch (e.g., "totalAccessedDatasetCount", "userWiseDatasetAccess", "principalsAccessDetails")
  catalogName?: string, // Optional catalog name to filter privileges by
  schemaName?: string, // Optional schema name to filter privileges by
  datasetName?: string, // Optional dataset name to filter privileges by
  principalName?: string, // Optional principal name (user/service) to filter privileges by
  startDate?: Date | null, // Optional start date for filtering privileges (not required for all types)
  endDate?: Date | null, // Optional end date for filtering privileges (not required for all types)
  access?: string, // Optional access type to filter privileges by (e.g., "read", "write", "admin" - not required for all types
) {
  // Fetch privileges data for a specific principal using React Query
  const { data, isLoading } = useQuery({
    // Unique query key including all parameters for proper caching
    queryKey: [
      "getUserPrivileges", // Base key to identify the query
      type, // The type of privileges being fetched (e.g., "totalAccessedDatasetCount", "userWiseDatasetAccess", "principalsAccessDetails")
      catalogName, // Optional catalog name filter
      schemaName, // Optional schema name filter
      datasetName, // Optional dataset name filter
      principalName, // Optional principal name filter (user or service account)
      startDate, // Optional start date filter (not required for all types)
      endDate, // Optional end date filter (not required for all types)
      access, // Optional access type filter (e.g., "read", "write", "admin" - not required for all types)
    ],
    // Delegate to service layer to fetch privileges
    queryFn: () =>
      governanceService.getUserPrivileges(
        type, // The type of privileges data to fetch (e.g., "totalAccessedDatasetCount", "userWiseDatasetAccess", "principalsAccessDetails")
        catalogName, // Optional catalog name to filter privileges by
        schemaName, // Optional schema name to filter privileges by
        datasetName, // Optional dataset name to filter privileges by
        principalName, // Optional principal name (user/service) to filter privileges by
        startDate, // Optional start date for filtering privileges (not required for all types)
        endDate, // Optional end date for filtering privileges (not required for all types)
        access, // Optional access type to filter privileges by (e.g., "read", "write", "admin" - not required for all types)
      ),
    // Only run query when required parameters are present based on type
    enabled:
      !!type && // Type must always be present
      ((type === "totalAccessedDatasetCount" || // For total count, no additional parameters are required
        type === "userWiseDatasetAccess") && // For user-wise access, no date or access filters are required
        !!startDate && // For other types, start and end dates are required
        !!endDate // End date is required for types other than total count and user-wise access
        ? true
        : type === "principalsAccessDetails" && !!access // For principals access details, access type is required but dates are not
          ? true
          : type !== "totalAccessedDatasetCount" && // For any other type, all parameters are required
          type !== "userWiseDatasetAccess" && // For any other type, all parameters are required
          type !== "principalsAccessDetails"), // For any other type, all parameters are required
    // Prevent automatic refetch when browser window regains focus
    refetchOnWindowFocus: false,
  });

  // Return fetched data and loading state
  return { data, isFetching: isLoading };
}
