/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose of the script:
  This script defines custom React Query hooks used by the
  Roles Management module of the Teva Data Integrity application.

  Responsibilities:
  - Fetches dashboard users, groups, roles, permissions, owners, group scope, and role permissions.
  - Wraps backend API calls from the rolesManagementService inside reusable hooks.
  - Centralizes query caching behavior through React Query.
  - Exposes normalized response objects to UI components for consistent consumption.
  - Supports conditional query execution using the `enabled` flag where required.
  - Prevents unnecessary refetching on browser window focus for all hooks.

  Why this file exists:
  - UI components should not directly contain repeated query logic.
  - Encapsulating query definitions inside hooks improves reuse, readability, and maintainability.
  - React Query handles caching, loading state, and refetching in a standard way across the Roles Management module.
*/


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @tanstack/react-query
  - What it is: A powerful data-fetching and caching library for React applications.
  - Why used: Provides the `useQuery` hook, which handles asynchronous API calls,
    caching, loading state management, background refetching, and query invalidation patterns.
  - In this file: Every hook uses `useQuery` to fetch a specific RBAC-related dataset
    such as users, groups, roles, or permissions.
*/
import { useQuery } from "@tanstack/react-query";

/*
  @/lib/services/rolesManagementService
  - What it is: Service layer responsible for making backend API calls related to Roles Management.
  - Why used: Keeps HTTP/API logic separate from hook logic.
  - In this file: Each custom hook delegates the actual backend request to a specific method
    from this service, such as `getAllDashboardUsers()` or `getGroupScope(group_id)`.
*/
import { rolesManagementService } from "@/lib/services/rolesManagementService";


// ---------------------------------------------------------------------
// HOOKS
// ---------------------------------------------------------------------

/**
 * useGetDashboardUsers
 *
 * Custom hook for fetching all dashboard users registered in the RBAC system.
 *
 * What this hook does:
 * - Calls the backend API through `rolesManagementService.getAllDashboardUsers()`
 * - Caches the result using React Query
 * - Returns the fetched user list using a normalized property name: `dashboardUsers`
 * - Exposes `refetch` so UI components can manually refresh the list after add/edit actions
 * - Exposes a loading boolean under the UI-friendly name `isFetchingUsers`
 *
 * Why the `enabled` parameter exists:
 * - Some parent components first check page-level permissions before they should fetch data.
 * - Passing `enabled` lets the caller decide whether the query should run immediately or wait.
 *
 * Example usage:
 * const { dashboardUsers, refetch, isFetchingUsers } = useGetDashboardUsers(canViewUsers);
 */
export function useGetDashboardUsers(enabled:boolean) {
    // Execute the query using React Query.
    // `useQuery` manages API execution, caching, loading state, and refetch behavior.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for this query.
      // React Query uses this key to identify, cache, and track this dataset independently.
      // If another component uses the same queryKey, React Query can reuse cached results.
      // Example: ["getAllDashboardUsers"]
      queryKey: ["getAllDashboardUsers"],
 
      // Function that performs the API call.
      // This delegates the actual request to the centralized service layer.
      queryFn: () => rolesManagementService.getAllDashboardUsers(),
 
      // Disable automatic refetch when the browser window regains focus.
      // This prevents unplanned background refreshes when users switch back to the tab.
      refetchOnWindowFocus: false,

      // Controls whether the query should execute.
      // If `enabled` is false, React Query will not run this request.
      enabled:enabled
    });
 
    // Return a normalized response object.
    // Why normalize?
    // - UI files can consume a clear domain-specific property name (`dashboardUsers`)
    //   instead of generic React Query naming like `data`.
    // - This keeps component code easier to read and consistent across hooks.
    return { dashboardUsers: data, refetch, isFetchingUsers: isLoading };
  }


/**
 * useGetDashboardGroups
 *
 * Custom hook for fetching all dashboard groups registered in the RBAC system.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getAllDashboardGroups()`
 * - Stores the result in React Query cache
 * - Returns the normalized result under `dashboardGroups`
 * - Exposes `refetch` and `isFetchingGroups`
 *
 * Why `enabled` is optional here:
 * - Some consumers may want to explicitly control whether the query runs.
 * - If not provided, the query defaults to running (`true`).
 *
 * Example usage:
 * const { dashboardGroups, refetch, isFetchingGroups } = useGetDashboardGroups(canViewGroups);
 * const { dashboardGroups } = useGetDashboardGroups(); // defaults to enabled
 */
  export function useGetDashboardGroups(enabled?:boolean) {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for the groups dataset.
      // This key is used to cache and identify the dashboard groups query.
      queryKey: ["getAllDashboardUGroups"],
 
      // Function that performs the backend API call for groups.
      queryFn: () => rolesManagementService.getAllDashboardGroups(),
 
      // Prevent automatic refetch when the browser window becomes active again.
      refetchOnWindowFocus: false,

      // Run the query if `enabled` is true.
      // If `enabled` is undefined, default to true so the query still executes.
      enabled: enabled ?? true
    });
 
    // Return normalized group query data for UI consumption.
    return { dashboardGroups: data, refetch, isFetchingGroups: isLoading };
  }


/**
 * useGetDashboardPermissions
 *
 * Custom hook for fetching all dashboard permissions available in the RBAC system.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getAllDashboardPermissions()`
 * - Caches the permissions list using React Query
 * - Returns the normalized result under `dashboardPermissions`
 * - Exposes `refetch` and `isFetchingPermissions`
 *
 * Why this matters:
 * - Permissions are used in UI areas such as permission selection dropdowns,
 *   role-permission mapping dialogs, and permissions listing tabs.
 *
 * About `enabled`:
 * - This query should only run when the calling component is allowed to view permissions.
 * - If not enabled, the request is skipped.
 */
  export function useGetDashboardPermissions(enabled:boolean) {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for the permissions dataset.
      queryKey: ["getAllDashboardPermissions"],
 
      // Function that performs the backend API call for dashboard permissions.
      queryFn: () => rolesManagementService.getAllDashboardPermissions(),
 
      // Prevent automatic refetch on browser refocus.
      refetchOnWindowFocus: false,

      // Only execute the query when explicitly enabled.
      // Because `enabled` is required in the function signature, this remains permission-driven.
      enabled: enabled ?? false
    });
 
    // Return normalized permissions query data for UI consumption.
    return { dashboardPermissions: data, refetch, isFetchingPermissions: isLoading };
  }


/**
 * useGetGroupUserRoles
 *
 * Custom hook for fetching all user-role mappings for a specific group.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getUserRoleInAGroup(group_id)`
 * - Fetches all users assigned to a given group along with their mapped roles
 * - Caches results per group using a query key that includes `group_id`
 * - Returns normalized data under `userRolesInGroup`
 *
 * Why `group_id` is part of the query key:
 * - Each group has its own distinct mapping data.
 * - Including `group_id` ensures React Query caches each group's data separately.
 *
 * Why the query is conditionally enabled:
 * - The query should only execute when a valid `group_id` exists
 *   and when the caller allows the request through the `enabled` flag.
 *
 * Example usage:
 * const { userRolesInGroup } = useGetGroupUserRoles(selectedGroup?.group_id || "", canReadUserRoles);
 */
  export function useGetGroupUserRoles(group_id:string, enabled:boolean) {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for this query.
      // Because the key contains `group_id`, each group's result is cached independently.
      // Example:
      // ["getUserRoleInAGroup", "group-123"]
      queryKey: ["getUserRoleInAGroup", group_id],
 
      // Function that performs the backend API call using the provided group ID.
      queryFn: () => rolesManagementService.getUserRoleInAGroup(group_id),
 
      // Prevent automatic refetch on browser focus.
      refetchOnWindowFocus: false,

      // Only run the query if:
      // 1. `group_id` is truthy (non-empty string)
      // 2. the caller explicitly allows the query through `enabled`
      enabled: !!group_id && enabled
    });
 
    // Return normalized group user-role mapping data.
    return { userRolesInGroup: data, refetch, isFetchingUserRolesInGroup: isLoading };
  }


/**
 * useGetDashboardRoles
 *
 * Custom hook for fetching all dashboard roles registered in the RBAC system.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getAllDashboardRoles()`
 * - Caches the role list
 * - Returns normalized data under `dashboardRoles`
 * - Exposes `refetch` and `isFetchingRoles`
 *
 * Common usage:
 * - Roles tab listing
 * - Add/Edit role dialogs
 * - Group-user-role assignment dropdowns
 */
  export function useGetDashboardRoles(enabled:boolean) {
    // Execute the roles query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for all dashboard roles.
      queryKey: ["getAllDashboardRoles"],

      // Function that performs the backend API call for roles.
      queryFn: () => rolesManagementService.getAllDashboardRoles(),

      // Prevent automatic window-focus refetching.
      refetchOnWindowFocus: false,

      // Only run the query when explicitly enabled by the caller.
      enabled:enabled
    });
   
    // Return normalized role data for consistent use across UI components.
    return { dashboardRoles: data, refetch, isFetchingRoles: isLoading };
  }


/**
 * useGetRolePermissions
 *
 * Custom hook for fetching all permissions assigned to a specific role.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getAllPermissionsinRole(role_id)`
 * - Fetches assigned permissions for one selected role
 * - Uses a role-specific query key so each role's permissions are cached separately
 * - Returns normalized data under `permissionsInRole`
 *
 * Why `role_id` is part of the query key:
 * - Different roles have different permission sets.
 * - React Query needs a unique cache entry for each role.
 *
 * Why this is useful:
 * - Used in role-permission management dialogs where admins add or remove permissions from roles.
 */
  export function useGetRolePermissions(role_id?:string, enabled?:boolean) {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for this query.
      // Because the key contains `role_id`, each role's permissions are cached independently.
      // Example:
      // ["getAllPermissionsinRole", "role-456"]
      queryKey: ["getAllPermissionsinRole", role_id],
 
      // Function that performs the backend API call for permissions assigned to a role.
      queryFn: () => rolesManagementService.getAllPermissionsinRole(role_id),
 
      // Prevent automatic refetch on browser focus.
      refetchOnWindowFocus: false,

      // Only run the query if a valid role_id exists and the caller enables it.
      enabled: !!role_id && enabled
    });
 
    // Return normalized role-permission mapping data.
    return { permissionsInRole: data, refetch, isFetchingPermissionsInRole: isLoading };
  }


/**
 * useGetGroupScope
 *
 * Custom hook for fetching all scope entries assigned to a specific group.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getGroupScope(group_id)`
 * - Fetches the scope mappings for the selected group
 * - Caches results per group using `group_id` in the query key
 * - Returns normalized data under `scopeInGroup`
 *
 * Example use case:
 * - Used in the Manage Scope dialog to show all Business Units granted to a selected group.
 */
  export function useGetGroupScope(group_id:string) {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for the selected group's scope list.
      // Including `group_id` ensures scope is cached separately for each group.
      queryKey: ["getGroupScope", group_id],
 
      // Function that performs the backend API call for the group's scope mappings.
      queryFn: () => rolesManagementService.getGroupScope(group_id),
 
      // Prevent automatic refetch on browser focus.
      refetchOnWindowFocus: false,

      // Only run the query if a valid group ID is available.
      enabled: !!group_id
    });
 
    // Return normalized scope data for group-scope management screens.
    return { scopeInGroup: data, refetch, isFetchingGroupScope: isLoading };
  }


/**
 * useGetDashboardOwners
 *
 * Custom hook for fetching all dashboard owners.
 *
 * What this hook does:
 * - Calls `rolesManagementService.getAllOwners()`
 * - Caches the owner list with React Query
 * - Returns normalized data under `dashboardOwners`
 * - Exposes `refetch` and `isFetchingDashboardOwners`
 *
 * Why used:
 * - Useful wherever the application needs a list of owners for ownership assignment,
 *   filtering, or metadata display.
 */
  export function useGetDashboardOwners() {
    // Execute the query using React Query.
    const { data, refetch, isLoading } = useQuery({
      // Unique cache key for the owners dataset.
      queryKey: ["getAllOwners"],
 
      // Function that performs the backend API call for owners.
      queryFn: () => rolesManagementService.getAllOwners(),
 
      // Prevent automatic refetch when the browser window regains focus.
      refetchOnWindowFocus: false,
    });
 
    // Return normalized owners data for UI consumption.
    return { dashboardOwners: data, refetch, isFetchingDashboardOwners: isLoading };
  }