/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script: 
    This service module handles authentication-related API calls for the Teva Data Integrity application.
    - It fetches user data (e.g., details of the currently authenticated user) using Azure’s built-in authentication(i.e App Service EasyAuth) system.
    - It exposes the `fetchMe` function which interacts with the authentication API endpoint.
    - The service ensures proper error handling and logging for traceability and debugging.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/types/api
    - What it is: Local TypeScript type definitions for API responses used across the app.
    - Why used: Provides compile-time guarantees about the data shape returned by the auth API.
*/
import {
  CurrentUserResponse, // Shape returned by /api/me, including identity and RBAC profile.
  DashboardModulesResponse, // Shape returned by /api/dashboard-modules, including visible modules.
} from "@/types/api"; // Type describing the shape of the app-owned auth API responses
import { isLocalDesignModeClient } from "@/lib/localDesignMode";
/*
  ../apiClient
    - What it is: The centralized Axios instance pre-configured with headers and interceptors.
    - Why used: Ensures all service modules make network requests consistently (logging, error handling,
     correlation IDs) instead of creating ad-hoc fetch logic in every file.
*/
import apiClient from "../apiClient"; // Reusable Axios client configured in lib/apiClient.ts

const LOCAL_DESIGN_MODE_USER: CurrentUserResponse = {
  principal: {
    id: "local-design-mode",
    email: "local.design.mode@localhost",
    displayName: "Local Design Mode",
    provider: "local-env",
    source: "local-env",
    roles: ["local-design-mode"],
    claimTypes: ["local_design_mode"],
  },
  user: {
    userId: "local-design-mode",
    email: "local.design.mode@localhost",
    displayName: "Local Design Mode",
    groups: [{ groupId: "local-design-mode", groupName: "Local Design Mode" }],
    roles: [{ roleId: "local-design-mode", roleName: "Local Design Mode" }],
    permissions: ["*"],
    scopes: [{ type: "tenant", value: "*" }],
    isSuperAdmin: true,
  },
};

const LOCAL_DESIGN_MODE_MODULES: DashboardModulesResponse = {
  modules: [],
  totalModules: 0,
  visibleModules: 0,
};

/**
 * AuthService handles the authentication-related API interactions.
 * It provides an interface to retrieve the current authenticated user's details.
 */
export const authService = {
  /**
   * Fetches the current authenticated user's data.
   * This function makes a GET request to the `/api/me` endpoint to get the normalized logged-in user.
   * It returns EasyAuth identity plus RBAC groups, roles, permissions, and scopes.
   *
   * @returns {Promise<CurrentUserResponse>} - A promise that resolves to the user data fetched from the API.
   * @throws {Error} - Throws an error if the API request fails.
   *
   * Sample Input:
   *  - No input is required for this function.
   *
   * Sample Output:
   *  - Example:
   *    {
   *      id: "12345",
   *      username: "johndoe",
   *      email: "john.doe@example.com",
   *      roles: ["user", "admin"]
   *    }
   */
  async fetchMe(): Promise<CurrentUserResponse> {
    if (isLocalDesignModeClient()) {
      console.info("[AuthService] Using local design-mode mock user payload");
      return LOCAL_DESIGN_MODE_USER;
    }

    // This log helps developers see when the browser asks "Who is the current user?".
    // Example browser flow: HomeLayout loads -> useFetchMe runs -> this service calls /api/me.
    console.log(
      "Fetching current user data from the RBAC identity endpoint"
    );

    try {
      // Perform a GET request to the app-owned endpoint that returns
      // information about the currently authenticated and authorized user.
      const response = await apiClient.get<CurrentUserResponse>("/api/me");

      // `response.data` holds the parsed JSON body from the server.
      // Return it to the caller so they can read fields like `id`, `email`, `roles`.
      // Example returned data: { principal: { email: "user@company.com" }, user: { permissions: [...] } }.
      console.log("User data fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      // Log the original error to the console for debugging purposes.
      console.error("Error fetching current user data", error);

      // Re-throw a generic error with a readable message so callers don't need
      // to interpret Axios error shapes. This message can be shown to users
      // (or localized) if desired.
      throw new Error("Failed to fetch current user data");
    }
  },

  /**
   * Fetches the dashboard modules visible to the current logged-in user.
   *
   * Why this exists:
   * - The frontend should not hardcode who can see which module.
   * - The backend checks RBAC and returns only allowed modules.
   *
   * Example:
   * - A user with "data-quality-dashboard:read" receives the Data Quality module.
   * - A user without KPI permissions does not receive the KPI Dashboard module.
   */
  async fetchDashboardModules(): Promise<DashboardModulesResponse> {
    if (isLocalDesignModeClient()) {
      console.info("[AuthService] Using local design-mode mock dashboard modules payload");
      return LOCAL_DESIGN_MODE_MODULES;
    }

    // This log helps developers trace when the UI asks for the user's module menu.
    console.log("Fetching dashboard modules for current user");

    try {
      // Call the protected API that filters modules using the logged-in user's RBAC grants.
      const response = await apiClient.get<DashboardModulesResponse>(
        "/api/dashboard-modules"
      );

      // Return the parsed response body so components can use response.modules directly.
      console.log("Dashboard modules fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      // Log the original error for debugging and throw a simple message for callers.
      console.error("Error fetching dashboard modules", error);
      throw new Error("Failed to fetch dashboard modules");
    }
  },
};
