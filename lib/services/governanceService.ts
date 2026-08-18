/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script provides a service layer for governance-related API calls, specifically for fetching information 
    related to user activities, update history, login activities, and user privileges.
    - It uses `apiClient` to interact with backend APIs and fetch various governance data, such as update history, 
    login activities, and user privileges.
    - It defines helper methods to get specific data and return it to the frontend in a consistent format.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  ../apiClient
    - What it is: Centralized HTTPS client (Axios) configured with base URL and interceptors.
    - Why used: Allows calling backend APIs without duplicating request setup (headers, logging, auth).
*/
import apiClient from "../apiClient"; // Importing the base API client for making HTTP requests

// Base URL for all governance-related API endpoints
const GOVERNANCE_API_URL = "/api/governance";

// Governance service that provides methods for interacting with governance-related APIs
export const governanceService = {
  /**
   * Fetches the update history of configurations within a specified time range for a given user.
   * This is useful for tracking configuration changes, such as system updates or administrative changes.
   *
   * @param email - The email of the user whose update history is to be fetched.
   * @param operation - The type of operation to filter the history by (e.g., "create", "update", "delete").
   * @param startDate - The starting date for filtering the update history.
   * @param endDate - The ending date for filtering the update history.
   *
   * @returns {Promise<any[]>} - A promise that resolves to the list of configuration update records.
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
  async getUpdateHistory(
    type: string,
    table: string,
    email?: string,
    operation?: string,
    startDate?: Date,
    endDate?: Date,
    configId?: string,
    columnName?: string,
  ): Promise<any[]> {
    // Log start - helpful when reading server logs to trace what the app is doing
    console.info("Fetching configuration updates history for type:", type);

    try {
      // Make a GET request to the API endpoint for fetching update history.
      // The `params` object becomes query string parameters in the HTTP request.
      const response = await apiClient.get(
        `${GOVERNANCE_API_URL}/configuration-updates-history`,
        {
          params: { type, table, email, operation, startDate, endDate, configId, columnName },
        },
      );
      // Log success and return payload
      console.info("Successfully fetched configuration updates history for type:", type);
      // Returns the response data from the API call
      return response.data;
    } catch (error) {
      // Log the error (useful for debugging) and rethrow a readable error message
      console.error("Error fetching configuration updates history for type:", type, error);
      // Throws a new error with a user-friendly message
      throw new Error(`Failed to fetch configuration updates history for type: ${type}`);
    }
  },

  /**
   * Fetches the login activities for a given user within a specified date range.
   * This is useful for tracking user access and activity within the system.
   *
   * @param type - The type of the user whose login activities are to be fetched.
   * @param startDate - The starting date for filtering the login activities.
   * @param endDate - The ending date for filtering the login activities.
   * @param uniqueId - (Optional) A unique identifier to filter login activities by (e.g., user ID or session ID).
   *
   * @returns {Promise<any[]>} - A promise that resolves to the list of login activity records.
   *
   * Sample Input:
   * {
   *   type: "user@example.com",
   *   startDate: new Date("2025-01-01"),
   *   endDate: new Date("2025-11-01")
   * }
   * Sample Output:
   * [
   *   { date: "2025-01-10", email: "user@example.com", action: "login" },
   *   { date: "2025-02-15", email: "user@example.com", action: "login" }
   * ]
   */
  async getLoginActivities(
    type: string, // The type of the user whose login activities are to be fetched.
    startDate?: Date, // The starting date for filtering the login activities.
    endDate?: Date, // The ending date for filtering the login activities.
    uniqueId?: string, // (Optional) A unique identifier to filter login activities by (e.g., user ID or session ID).
  ): Promise<any[]> {
    // Log the start of fetching login activities for traceability
    console.info("Fetching login activities for type:", type);

    try {
      // Call endpoint for login activities; pass date range and type as query params
      const response = await apiClient.get(
        `${GOVERNANCE_API_URL}/login-activities`,
        {
          params: { type, startDate, endDate, uniqueId },
        },
      );
      // Logs successful fetch of login activity
      console.info("Successfully fetched login activity for type:", type);
      // Returns the response data (list of login activities)
      return response.data;
    } catch (error) {
      // Logs any errors that occur during the API call
      console.error("Error fetching login activity for type:", type, error);
      // Throws a new error with a user-friendly message
      throw new Error(`Failed to fetch login activity for type: ${type}`);
    }
  },

  /**
   * Fetches the user privileges data for a given type and other parameters (user or service).
   * This is useful for auditing user access rights and permissions in the system.
   *
   * @param type - The type of the principal (user or service) whose privileges are to be fetched.
   * @param catalogName - (Optional) The name of the catalog to filter privileges by.
   * @param schemaName - (Optional) The name of the schema to filter privileges by.
   * @param datasetName - (Optional) The name of the dataset to filter privileges by.
   * @param principalName - The name of the user or service whose privileges are to be fetched.
   * @param startDate - (Optional) The starting date for filtering the privileges data.
   * @param endDate - (Optional) The ending date for filtering the privileges data.
   * @param access - (Optional) The type of access to filter privileges by (e.g., "read", "write").
   *
   * @returns {Promise<any[]>} - A promise that resolves to a list of privileges for the given principal.
   *
   * Sample Input:
   * {
   *   type: "user",
   *   principalName: "user@example.com",
   *   startDate: "2025-01-01",
   *   endDate: "2025-11-01"
   * }
   * Sample Output:
   * [
   *   { privilege: "read", catalog: "catalog1", schema: "schema1", dataset: "dataset1" },
   *   { privilege: "write", catalog: "catalog2", schema: "schema2", dataset: "dataset2" }
   * ]
   */
  async getUserPrivileges(
    type: string, // The type of the principal (user or service) whose privileges are to be fetched.
    catalogName?: string, // (Optional) The name of the catalog to filter privileges by.
    schemaName?: string, // (Optional) The name of the schema to filter privileges by.
    datasetName?: string, // (Optional) The name of the dataset to filter privileges by.
    principalName?: string, // The name of the user or service whose privileges are to be fetched.
    startDate?: Date | null, // (Optional) The starting date for filtering the privileges data.
    endDate?: Date | null, // (Optional) The ending date for filtering the privileges data.
    access?: string, // (Optional) The type of access to filter privileges by (e.g., "read", "write").
  ): Promise<any[]> {
    // Start fetching privileges data for this principal
    console.info("Fetching user privileges data for type:", type);

    try {
      // Call user-privileges endpoint passing the principalName as a query parameter
      const response = await apiClient.get(
        `${GOVERNANCE_API_URL}/user-privileges`,
        {
          params: {
            type, // The type of the principal (user or service) whose privileges are to be fetched.
            catalogName, // (Optional) The name of the catalog to filter privileges by.
            schemaName, // (Optional) The name of the schema to filter privileges by.
            datasetName, // (Optional) The name of the dataset to filter privileges by.
            principalName, // The name of the user or service whose privileges are to be fetched.
            startDate, // (Optional) The starting date for filtering the privileges data.
            endDate, // (Optional) The ending date for filtering the privileges data.
            access, // (Optional) The type of access to filter privileges by (e.g., "read", "write").
          },
        },
      );
      // Logs successful fetch of user privileges
      console.info("Successfully fetched user privileges data for type:", type);
      // Returns the response data (list of privileges)
      return response.data;
    } catch (error) {
      // Logs any errors that occur during the API call
      console.error(
        "Error fetching user privileges data for type:",
        type,
        error,
      );
      // Throws a new error with a user-friendly message
      throw new Error(`Failed to fetch user privileges data for type: ${type}`);
    }
  },
};
