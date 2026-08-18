/*
  Project Name : Teva Data Integrity
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Atharva Mundhada
  Date: 20 May 2026

  Purpose of the script:
  This script defines the Roles Management service layer for the
  Teva Data Integrity application.

  Responsibilities:
  - Provides all backend API communication methods required by the Roles Management module.
  - Handles CRUD operations for dashboard users, groups, roles, permissions, owners, and scope mappings.
  - Handles mapping operations such as:
    - assigning roles to users in groups
    - assigning permissions to roles
    - fetching permissions for a role
    - fetching scope for a group
  - Centralizes all Roles Management HTTP calls in one reusable service object.
  - Logs API request lifecycle information for easier debugging and operational visibility.
  - Converts low-level request failures into user-friendly JavaScript errors for the calling layer.

  Business Value:
  - Prevents UI components and hooks from duplicating raw HTTP logic.
  - Makes the API layer easier to maintain if backend endpoints change.
  - Improves consistency across all RBAC-related screens in the dashboard.
  - Supports better debugging by keeping request logging and error handling standardized.
*/


// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  ../apiClient
  - What it is: Shared HTTP client abstraction used across the application.
  - Why used: Provides standardized request methods like:
    - get
    - post
    - put
    - delete
  - In this file: Every service method uses this shared client to communicate with backend APIs.
  - Benefit:
    - common base URL setup
    - shared interceptors
    - centralized authentication/session handling
    - consistent response processing
*/
import apiClient from "../apiClient";


// ---------------------------------------------------------------------
// API ENDPOINT CONSTANTS
// ---------------------------------------------------------------------

/*
  DASHBOARD_USERS_URL
  - What it represents: API endpoint for dashboard user management operations.
  - Why stored in a constant:
    - avoids repeating raw strings
    - reduces typo risk
    - simplifies future endpoint changes
  - Used by:
    - getAllDashboardUsers
    - addDashboardUser
    - updateDashboardUser
    - removeDashboardUser
*/
const DASHBOARD_USERS_URL = "/api/roles-management/dashboard-users";

/*
  DASHBOARD_GROUPS_URL
  - What it represents: API endpoint for dashboard group management operations.
  - Used by:
    - getAllDashboardGroups
    - addDashboardGroup
    - updateDashboardGroup
    - removeDashboardGroup
*/
const DASHBOARD_GROUPS_URL = "/api/roles-management/dashboard-groups";

/*
  DASHBOARD_ROLES_URL
  - What it represents: API endpoint for dashboard role management operations.
  - Used by:
    - getAllDashboardRoles
    - addDashboardRole
    - updateDashboardRole
    - removeDashboardRole
*/
const DASHBOARD_ROLES_URL = "/api/roles-management/dashboard-roles"

/*
  DASHBOARD_PERMISSIONS_URL
  - What it represents: API endpoint for dashboard permission management operations.
  - Used by:
    - getAllDashboardPermissions
    - addDashboardPermission
    - updateDashboardPermission
*/
const DASHBOARD_PERMISSIONS_URL = "/api/roles-management/dashboard-permissions";

/*
  DASHBOARD_USER_ROLE_PERMISSION_URL
  - What it represents: API endpoint for managing user-role mappings inside groups.
  - Used by:
    - getUserRoleInAGroup
    - assignRoleToUserInAGroup
    - updateRoleToUserInAGroup
    - removeUserFromGroup
  - Example use case:
    - A group is selected, and admins view or update which role each user has inside that group.
*/
const DASHBOARD_USER_ROLE_PERMISSION_URL = "/api/roles-management/manage-user-role"

/*
  DASHBOARD_ROLE_PERMISSION_URL
  - What it represents: API endpoint for managing permissions assigned to roles.
  - Used by:
    - getAllPermissionsinRole
    - assignPermissionstoRole
    - removePermissionFromRole
*/
const DASHBOARD_ROLE_PERMISSION_URL = "/api/roles-management/manage-role-permission"

/*
  DASHBOARD_GROUP_SCOPE_URL
  - What it represents: API endpoint for managing scope access assigned to groups.
  - Used by:
    - getGroupScope
    - removeGroupScope
    - addGroupScope
  - Example use case:
    - A group is granted access to a specific business unit or scope entry.
*/
const DASHBOARD_GROUP_SCOPE_URL = "/api/roles-management/manage-group-scope"

/*
  DASHBOARD_OWNERS_URL
  - What it represents: API endpoint for dashboard owner / super-admin management.
  - Used by:
    - getAllOwners
    - removeDashboardOwners
    - addNewDashboardOwner
*/
const DASHBOARD_OWNERS_URL = "/api/roles-management/manage-super-admins"


// ---------------------------------------------------------------------
// SERVICE OBJECT
// ---------------------------------------------------------------------

/*
  rolesManagementService
  - What it is: Central service object containing all API methods for the Roles Management module.
  - Why used:
    - groups related HTTP methods in one place
    - makes hooks/components cleaner
    - enforces a reusable service-layer pattern across the application
*/
export const rolesManagementService ={

      /**
       * getAllDashboardUsers
       *
       * Fetches all dashboard users configured in the RBAC system.
       *
       * Typical use case:
       * - Used by the Users tab to populate the users table.
       */
      async getAllDashboardUsers(): Promise<any> {
        // Log the start of the request for tracing and debugging.
        console.info("Starting request to retrieve dashboard users...");

        try {
          // Send a GET request to the dashboard users endpoint.
          // This is a read operation, so no request payload is required.
          const response = await apiClient.get(
            `${DASHBOARD_USERS_URL}`,
          );
    
          // Log successful retrieval after the API responds correctly.
          console.info("Dashboard Users retrieved successfully.");
    
          // Return only the backend payload.
          // Calling hooks/components generally need `response.data`, not the full HTTP response object.
          return response.data;
        } catch (error) {
          // Log detailed technical error information to help debugging.
          console.error("Unable to retrieve dashboard users:", error);
    
          // Throw a user-friendly error upward to the calling layer.
          throw new Error("An error occurred while loading dashboard users.");
        }
      },   


      /**
       * addDashboardUser
       *
       * Creates a new dashboard user.
       *
       * Parameter:
       * - payload: Request body containing the user details required by the backend
       *
       * Typical use case:
       * - Called when an admin submits the Add User form.
       */
      async addDashboardUser(payload: any): Promise<any> {
        // Log request initiation before making the API call.
        console.info("Initiating request for registering new user...");
    
        try {
          // Send a POST request to create a new dashboard user.
          // POST is appropriate because a new resource is being created.
          const response = await apiClient.post(
            `${DASHBOARD_USERS_URL}`,
            payload,
          );
    
          // If backend responds with HTTP 200, log successful completion.
          if (response.status === 200) {
            console.info("New Dashboard User registered successfully.");
          }
    
          // Return the backend payload to the caller.
          return response.data;
        } catch (error) {
          // Log the low-level error for developers.
          console.error("Failed to register new user:", error);
    
          // Throw a cleaner error for hooks/components to handle.
          throw new Error("An error occurred while registering a new user.");
        }
      },


      /**
       * updateDashboardUser
       *
       * Updates an existing dashboard user.
       *
       * Parameter:
       * - payload: Request body containing the user identifier and updated values
       *
       * Typical use case:
       * - Called when an admin edits a user and saves changes.
       */
      async updateDashboardUser(payload: any): Promise<any> {
        // Log the start of the update request.
        console.info("Initiating request for updating user...");
    
        try {
          // Send a PUT request with the updated user payload.
          // PUT is used here because an existing resource is being updated.
          const response = await apiClient.put(
            `${DASHBOARD_USERS_URL}`,
            payload,
          );
    
          // Log success only when the backend confirms the update.
          if (response.status === 200) {
            console.info("Dashboard User updated successfully.");
          }
    
          // Return the backend response payload.
          return response.data;
        } catch (error) {
          // Log technical failure details.
          console.error("Failed to update user:", error);
    
          // Throw a user-friendly update error.
          throw new Error("An error occurred while updating the user.");
        }
      },


      /**
       * getAllDashboardGroups
       *
       * Fetches all dashboard groups from the backend.
       *
       * Typical use case:
       * - Used in the Groups tab to display the list of available groups.
       */
      async getAllDashboardGroups(): Promise<any> {
        // Log request start for debugging and request tracing.
        console.info("Starting request to retrieve dashboard groups...");

        try {
          // Send a GET request to retrieve all dashboard groups.
          const response = await apiClient.get(
            `${DASHBOARD_GROUPS_URL}`,
          );
    
          // Log successful retrieval.
          console.info("Dashboard groups retrieved successfully.");
    
          // Return only the response payload.
          return response.data;
        } catch (error) {
          // Log low-level error details.
          console.error("Unable to retrieve dashboard groups:", error);
    
          // Throw a clean error message for the caller.
          throw new Error("An error occurred while loading dashboard groups.");
        }
      },   


      /**
       * addDashboardGroup
       *
       * Creates a new dashboard group.
       *
       * Parameter:
       * - payload: Request body containing new group details
       *
       * Typical use case:
       * - Called when an admin submits the Add Group form.
       */
      async addDashboardGroup(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for registering new groupr...");
    
        try {
          // Send a POST request to create a new dashboard group.
          const response = await apiClient.post(
            `${DASHBOARD_GROUPS_URL}`,
            payload,
          );
    
          // Log success when backend responds with HTTP 200.
          if (response.status === 200) {
            console.info("New Dashboard group registered successfully.");
          }
    
          // Return the backend payload to the caller.
          return response.data;
        } catch (error) {
          // Log technical error information.
          console.error("Failed to register new group:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while registering a new group.");
        }
      },


      /**
       * updateDashboardGroup
       *
       * Updates an existing dashboard group.
       *
       * Parameter:
       * - payload: Request body containing the group identifier and updated values
       *
       * Typical use case:
       * - Called when an admin edits group details and saves the change.
       */
      async updateDashboardGroup(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating group...");
    
        try {
          // Send a PUT request to update an existing dashboard group.
          const response = await apiClient.put(
            `${DASHBOARD_GROUPS_URL}`,
            payload,
          );
    
          // Log success when the response confirms update completion.
          if (response.status === 200) {
            console.info("Dashboard group updated successfully.");
          }
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log detailed technical failure information.
          console.error("Failed to update group:", error);
    
          // Throw friendly error for the caller.
          throw new Error("An error occurred while updating the group.");
        }
      },


      /**
       * getAllDashboardPermissions
       *
       * Fetches all dashboard permissions configured in the RBAC system.
       *
       * Typical use case:
       * - Used by the Permissions tab and permission assignment workflows.
       */
      async getAllDashboardPermissions(): Promise<any> {
        // Log request initiation.
        console.info("Starting request to retrieve dashboard permissions...");

        try {
          // Send a GET request to fetch all permission definitions.
          const response = await apiClient.get(
            `${DASHBOARD_PERMISSIONS_URL}`,
          );
    
          // Log successful completion of the request.
          console.info("Dashboard USers retrieved successfully.");
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log failure details for debugging.
          console.error("Unable to retrieve dashboard permissions:", error);
    
          // Throw a cleaner error upward.
          throw new Error("An error occurred while loading dashboard permissions.");
        }
      },   


      /**
       * addDashboardPermission
       *
       * Creates a new dashboard permission.
       *
       * Parameter:
       * - payload: Request body containing new permission details
       *
       * Typical use case:
       * - Called when an admin submits the Add Permission form.
       */
      async addDashboardPermission(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for registering new permission...");
    
        try {
          // Send a POST request to create a new permission record.
          const response = await apiClient.post(
            `${DASHBOARD_PERMISSIONS_URL}`,
            payload,
          );
    
          // Log success when backend confirms creation.
          if (response.status === 200) {
            console.info("New Dashboard permission registered successfully.");
          }
    
          // Return backend payload for caller usage.
          return response.data;
        } catch (error) {
          // Log low-level technical error.
          console.error("Failed to register new permission:", error);
    
          // Throw friendly error message.
          throw new Error("An error occurred while registering a new permission.");
        }
      },


      /**
       * updateDashboardPermission
       *
       * Updates an existing dashboard permission.
       *
       * Parameter:
       * - payload: Request body containing updated permission details
       *
       * Typical use case:
       * - Called when an admin edits a permission and saves changes.
       */
      async updateDashboardPermission(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating permissions...");
    
        try {
          // Send a PUT request to update an existing permission.
          const response = await apiClient.put(
            `${DASHBOARD_PERMISSIONS_URL}`,
            payload,
          );
    
          // Log success on HTTP 200 response.
          if (response.status === 200) {
            console.info("Dashboard Permission updated successfully.");
          }
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log technical error details.
          console.error("Failed to update permission:", error);
    
          // Throw a user-friendly error upward.
          throw new Error("An error occurred while updating the permission.");
        }
      },


      /**
       * getUserRoleInAGroup
       *
       * Fetches the user-role mappings for a selected group.
       *
       * Parameter:
       * - group_id: Identifier of the selected group whose mappings are required
       *
       * Typical use case:
       * - Used in Manage Roles in Group screens or dialogs.
       */
      async getUserRoleInAGroup(group_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to retrieve dashboard permissions...");

        try {
          // Send a GET request with `group_id` as a query parameter.
          // The backend uses this identifier to return role assignments only for the selected group.
          const response = await apiClient.get(
            `${DASHBOARD_USER_ROLE_PERMISSION_URL}`,
            {
              params : {group_id},
            }
          );
    
          // Log successful response retrieval.
          console.info("User roles in a group retrieved successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure details.
          console.error("Unable to user roles in a group:", error);
    
          // Throw clean caller-facing error.
          throw new Error("An error occurred while loading user roles in a group.");
        }
      }, 


      /**
       * assignRoleToUserInAGroup
       *
       * Assigns a role to a user inside a specific group.
       *
       * Parameter:
       * - payload: Request body containing the group, user, and role mapping details
       *
       * Typical use case:
       * - Called when an admin assigns a new role to a user from the group-management UI.
       */
      async assignRoleToUserInAGroup(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating Roles...");
    
        try {
          // Send a POST request to create a new user-role-group mapping.
          const response = await apiClient.post(
            `${DASHBOARD_USER_ROLE_PERMISSION_URL}`,
            payload,
          );
    
          // Log success when backend confirms assignment.
          if (response.status === 200) {
            console.info("Role assigned to a user successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure.
          console.error("Failed to assign Role:", error);
    
          // Throw friendly error for the caller.
          throw new Error("An error occurred while assigning the Role.");
        }
      },


      /**
       * updateRoleToUserInAGroup
       *
       * Updates an existing role assignment for a user inside a group.
       *
       * Parameter:
       * - payload: Request body containing updated mapping details
       *
       * Typical use case:
       * - Called when an admin changes a user's assigned role within a group.
       */
      async updateRoleToUserInAGroup(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating Roles...");
    
        try {
          // Send a PUT request to update an existing role assignment mapping.
          const response = await apiClient.put(
            `${DASHBOARD_USER_ROLE_PERMISSION_URL}`,
            payload,
          );
    
          // Log success when backend confirms update.
          if (response.status === 200) {
            console.info("Role updated for a user successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure details.
          console.error("Failed to update assigned Role:", error);
    
          // Throw user-friendly update error.
          throw new Error("An error occurred while updating the Role.");
        }
      },


      /**
       * getAllDashboardRoles
       *
       * Fetches all dashboard roles from the backend.
       *
       * Typical use case:
       * - Used in the Roles tab and in role-selection flows elsewhere in the RBAC module.
       */
      async getAllDashboardRoles(): Promise<any> {
        // Log request initiation.
        console.info("Starting request to retrieve dashboard roles...");

        try {
          // Send a GET request to retrieve all roles.
          const response = await apiClient.get(
            `${DASHBOARD_ROLES_URL}`,
          );
    
          // Log successful retrieval.
          console.info("Dashboard roles retrieved successfully.");
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log raw technical error details.
          console.error("Unable to retrieve dashboard roles:", error);
    
          // Throw a user-friendly error.
          throw new Error("An error occurred while loading dashboard roles.");
        }
      },


      /**
       * addDashboardRole
       *
       * Creates a new dashboard role.
       *
       * Parameter:
       * - payload: Request body containing new role details
       *
       * Typical use case:
       * - Called when an admin submits the Add Role form.
       */
      async addDashboardRole(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for registering new role...");
    
        try {
          // Send a POST request to create a new role.
          const response = await apiClient.post(
            `${DASHBOARD_ROLES_URL}`,
            payload,
          );
    
          // Log success when the create operation completes successfully.
          if (response.status === 200) {
            console.info("New Dashboard role registered successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log low-level error details.
          console.error("Failed to register new role:", error);
    
          // Throw a user-friendly error upward.
          throw new Error("An error occurred while registering a new role.");
        }
      },


      /**
       * updateDashboardRole
       *
       * Updates an existing dashboard role.
       *
       * Parameter:
       * - payload: Request body containing updated role details
       *
       * Typical use case:
       * - Called when an admin edits a role and saves the changes.
       */
      async updateDashboardRole(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating role...");
    
        try {
          // Send a PUT request to update the role record.
          const response = await apiClient.put(
            `${DASHBOARD_ROLES_URL}`,
            payload,
          );
    
          // Log success when backend confirms update.
          if (response.status === 200) {
            console.info("Dashboard role updated successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure details.
          console.error("Failed to update role:", error);
    
          // Throw a clean update error.
          throw new Error("An error occurred while updating the role.");
        }
      },


      /**
       * getAllPermissionsinRole
       *
       * Fetches all permissions assigned to a selected role.
       *
       * Parameter:
       * - role_id: Identifier of the role whose permissions need to be fetched
       *
       * Typical use case:
       * - Used in Manage Permissions in Role dialogs or role-detail views.
       */
      async getAllPermissionsinRole(role_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to retrieve role permissions...");

        try {
          // Send a GET request with `role_id` as query parameter.
          // The backend uses this value to return the permissions mapped to the selected role.
          const response = await apiClient.get(
            `${DASHBOARD_ROLE_PERMISSION_URL}`,
            {
              params : {role_id},
            }
          );
    
          // Log successful retrieval.
          console.info("Permissions for a role retrieved successfully.");
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log failure details for debugging.
          console.error("Unable to fetch permissions for a role:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while loading permissions in a role.");
        }
      }, 


      /**
       * assignPermissionstoRole
       *
       * Assigns permissions to a selected role.
       *
       * Parameter:
       * - payload: Request body containing role-permission assignment details
       *
       * Typical use case:
       * - Called when an admin submits selected permissions for a role.
       */
      async assignPermissionstoRole(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for updating Permissions...");
    
        try {
          // Send a POST request to create role-permission mapping records.
          const response = await apiClient.post(
            `${DASHBOARD_ROLE_PERMISSION_URL}`,
            payload,
          );
    
          // Log success when assignment completes.
          if (response.status === 200) {
            console.info("Permission assigned to Role successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log low-level technical failure.
          console.error("Failed to assign Permission:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while assigning the Permission.");
        }
      },


      /**
       * removePermissionFromRole
       *
       * Removes a permission mapping from a role.
       *
       * Parameter:
       * - mapping_id: Identifier of the role-permission mapping record to remove
       *
       * Typical use case:
       * - Called when an admin removes an assigned permission from a role.
       */
      async removePermissionFromRole(mapping_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove permission from role...");

        try {
          // Send a DELETE request with `mapping_id` as query parameter.
          // The backend uses this mapping identifier to delete the exact relationship record.
          const response = await apiClient.delete(
            `${DASHBOARD_ROLE_PERMISSION_URL}`,
            {
              params : {mapping_id},
            }
          );
    
          // Log successful deletion.
          console.info("Permissions from role deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical error details.
          console.error("Unable to remove permissions from a role:", error);
    
          // Throw user-friendly delete error.
          throw new Error("An error occurred while deleting permissions from a role.");
        }
      },


      /**
       * removeDashboardUser
       *
       * Deletes a dashboard user.
       *
       * Parameter:
       * - user_id: Identifier of the user record to delete
       */
      async removeDashboardUser(user_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove user from Dashboard...");

        try {
          // Send a DELETE request with the selected user identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_USERS_URL}`,
            {
              params : {user_id},
            }
          );
    
          // Log successful deletion.
          console.info("user deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure information.
          console.error("Unable to remove user from dashboard:", error);
    
          // Throw a user-friendly delete error.
          throw new Error("An error occurred while deleting user.");
        }
      },


      /**
       * removeDashboardGroup
       *
       * Deletes a dashboard group.
       *
       * Parameter:
       * - group_id: Identifier of the group to remove
       */
      async removeDashboardGroup(group_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove group from dashboard...");

        try {
          // Send a DELETE request with the selected group identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_GROUPS_URL}`,
            {
              params : {group_id},
            }
          );
    
          // Log successful deletion.
          console.info("Group deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log raw technical failure.
          console.error("Unable to remove Group from Dashboard:", error);
    
          // Throw a cleaner error for the UI layer.
          throw new Error("An error occurred while deleting Group");
        }
      },


      /**
       * removeDashboardRole
       *
       * Deletes a dashboard role.
       *
       * Parameter:
       * - role_id: Identifier of the role to delete
       */
      async removeDashboardRole(role_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove role from Dashboard...");

        try {
          // Send a DELETE request with the selected role identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_ROLES_URL}`,
            {
              params : {role_id},
            }
          );
    
          // Log successful deletion.
          console.info("role deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure details.
          console.error("Unable to remove role from dashboard:", error);
    
          // Throw user-friendly delete error.
          throw new Error("An error occurred while deleting role.");
        }
      },


      /**
       * removeUserFromGroup
       *
       * Deletes a user-role-group mapping.
       *
       * Parameter:
       * - mapping_id: Identifier of the mapping record to remove
       *
       * Typical use case:
       * - Called when an admin removes a user entry from a group's role mapping list.
       */
      async removeUserFromGroup(mapping_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove user from group...");

        try {
          // Send a DELETE request with the selected mapping identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_USER_ROLE_PERMISSION_URL}`,
            {
              params : {mapping_id},
            }
          );
    
          // Log successful deletion.
          console.info("User from Group deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical failure information.
          console.error("Unable to remove User from a group:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while deleting User from a group");
        }
      },


      /**
       * getGroupScope
       *
       * Fetches all scope assignments for a selected group.
       *
       * Parameter:
       * - group_id: Identifier of the selected group
       *
       * Typical use case:
       * - Used in the Manage Scope dialog to display current scope mappings.
       */
      async getGroupScope(group_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to get group scope...");

        try {
          // Send a GET request with `group_id` as query parameter.
          const response = await apiClient.get(
            `${DASHBOARD_GROUP_SCOPE_URL}`,
            {
              params : {group_id},
            }
          );
    
          // Log successful retrieval.
          console.info("Group Scope Fetched successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log low-level technical failure details.
          console.error("Unable to get Group Scope:", error);
    
          // Throw a user-friendly fetch error.
          throw new Error("An error occurred while fetching group scope");
        }
      },


      /**
       * removeGroupScope
       *
       * Deletes a group-scope mapping.
       *
       * Parameter:
       * - scope_id: Identifier of the scope mapping record to remove
       */
      async removeGroupScope(scope_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove group scope...");

        try {
          // Send a DELETE request with the selected scope mapping identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_GROUP_SCOPE_URL}`,
            {
              params : {scope_id},
            }
          );
    
          // Log successful deletion.
          console.info("Group Scope deleted successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical delete failure.
          console.error("Unable to remove group scope:", error);
    
          // Throw user-friendly deletion error.
          throw new Error("An error occurred while deleting group scope");
        }
      },


      /**
       * addGroupScope
       *
       * Creates a new scope assignment for a group.
       *
       * Parameter:
       * - payload: Request body containing group-scope assignment details
       *
       * Typical use case:
       * - Called when an admin grants a new business-unit scope to a selected group.
       */
      async addGroupScope(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for registering new group scope...");
    
        try {
          // Send a POST request to create a new group-scope mapping.
          const response = await apiClient.post(
            `${DASHBOARD_GROUP_SCOPE_URL}`,
            payload,
          );
    
          // Log success if backend confirms creation.
          if (response.status === 200) {
            console.info("New Group Scope registered successfully.");
          }
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical create failure.
          console.error("Failed to register new group scope:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while registering a new group scope.");
        }
      },


      /**
       * getAllOwners
       *
       * Fetches all dashboard owners / super admins.
       *
       * Typical use case:
       * - Used in the Super Admins tab to list all configured owner records.
       */
      async getAllOwners(): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for fetching dashboard owners...");
    
        try {
          // Send a GET request to fetch all owner records.
          const response = await apiClient.get(
            `${DASHBOARD_OWNERS_URL}`,
          );
    
          // Log success when backend confirms retrieval.
          if (response.status === 200) {
            console.info("Successfully fetched dashboard owners.");
          }
    
          // Return the backend payload.
          return response.data;
        } catch (error) {
          // Log technical fetch failure.
          console.error("Failed to fetch dashboard owners:", error);
    
          // Throw user-friendly fetch error.
          throw new Error("An error occurred while fetching dashboard owners.");
        }
      },


      /**
       * removeDashboardOwners
       *
       * Removes a dashboard owner / super admin.
       *
       * Parameter:
       * - user_id: Identifier of the owner user record to remove
       */
      async removeDashboardOwners(user_id:any): Promise<any> {
        // Log request initiation.
        console.info("Starting request to remove dashboard owner...");

        try {
          // Send a DELETE request with the selected owner user identifier.
          const response = await apiClient.delete(
            `${DASHBOARD_OWNERS_URL}`,
            {
              params : {user_id},
            }
          );
    
          // Log successful deletion.
          console.info("Owner removed successfully.");
    
          // Return backend payload.
          return response.data;
        } catch (error) {
          // Log technical delete failure.
          console.error("Unable to remove dashboard owner:", error);
    
          // Throw user-friendly delete error.
          throw new Error("An error occurred while deleting dashboard owner");
        }
      },


      /**
       * addNewDashboardOwner
       *
       * Creates a new dashboard owner / super admin.
       *
       * Parameter:
       * - payload: Request body containing the owner registration details
       *
       * Typical use case:
       * - Called when an admin adds a new owner from the Super Admins screen.
       */
      async addNewDashboardOwner(payload: any): Promise<any> {
        // Log request initiation.
        console.info("Initiating request for registering new dashboard owner...");
    
        try {
          // Send a POST request to create a new dashboard owner.
          const response = await apiClient.post(
            `${DASHBOARD_OWNERS_URL}`,
            payload,
          );
    
          // Log success when backend confirms creation.
          if (response.status === 200) {
            console.info("New dashboard owner registered successfully.");
          }
    
          // Return the backend payload to the caller.
          return response.data;
        } catch (error) {
          // Log technical create failure details.
          console.error("Failed to register new dashboard owner:", error);
    
          // Throw user-friendly error.
          throw new Error("An error occurred while registering a new dashboard owner.");
        }
      },

      /**
       * Sends a request to import/sync Azure Active Directory (AD) groups.
       *
       * This function:
       * - Logs the start of the operation for debugging/tracking
       * - Makes an API POST request to trigger AD group import/sync
       * - Logs success when the request completes successfully
       * - Returns the response payload from the backend
       * - Handles and logs errors, and throws a user-friendly error message
       *
       * @async
       * @method importADGroups
       * @returns {Promise<any>} Resolves with the backend response data after successful import/sync
       * @throws {Error} Throws an error if the API request fails
       */
      async importADGroups(): Promise<any> {
        // Log the start of the import/sync process for monitoring/debugging
        console.info("Initiating request for importing/syncing Azure AD groups...");

        try {
          // Send a POST request to the backend API endpoint that triggers AD group import/sync
          const response = await apiClient.post(
            `/api/roles-management/import-ad-groups`,
          );

          // Check if the response status is HTTP 200 (success)
          if (response.status === 200) {
            // Log a success message for confirmation
            console.info("AD groups imported/synced successfully.");
          }

          // Return the response payload (data) to the caller
          return response.data;
        } catch (error) {
          // Log detailed technical error information for debugging
          console.error("Failed to import/sync AD groups:", error);

          // Throw a user-friendly error message to be handled by the caller
          throw new Error("An error occurred while importing/syncing AD groups.");
        }
      }

}