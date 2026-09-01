/*
Project Name: Teva Data Integrity
Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script is part of the Teva Data Integrity Automation Dashboard and handles API calls related to the Executive Dashboard.
    It specifically manages the fetching of executive dashboard highlights data.
    The service uses an HTTP client to request the necessary data from the backend API, processes the response, and returns the parsed data.
    - Fetches executive dashboard highlights from the backend API.
    - Provides clear and structured logging to track the execution flow.
    - Returns the expected data in a well-structured format.
    */

   // ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  ../apiClient
  - What it is: A centralized Axios-based HTTPS client configured for the app (base URL, interceptors).
  - Why used: Encapsulates HTTP behavior (headers, logging, auth) so service functions can simply call `get`/`post`.
  */
 import apiClient from "../apiClient"; // Import the API client to interact with the backend

 /*  @/types/api
- What it is: TypeScript type definitions for API responses and payloads.
- Why used: Provides typed return values (like `ExecutiveDashboardHighlights`) so callers get correct autocompletion and compile-time checks.
*/
import {
  PipelineExecutiveDashboardSchema,
  ExecutiveDashboardHighlights
} from "@/types/api"; // Import the types for executive dashboard highlights
import type { DashboardFilters } from "@/types/dashboard";
import type { ExecutiveDashboardPayload } from "@/types/executiveDashboard";


// ----------------------------- CONSTANTS -----------------------------

// Base endpoint for the Executive Dashboard API (keeps URLs DRY and easier to change)
const EXECUTIVE_DASHBOARD_BASE_URL = "/api/executive-dashboard";

// ----------------------------- API SERVICE ----------------------------

/**
 * Service to interact with the Executive Dashboard API.
 * This service includes functions to fetch the highlights for the executive dashboard.
 */
export const executiveDashboardService = {
  /**
   * Fetches the executive highlights data from the backend API.
   *
   * This function sends a GET request to the executive dashboard API to retrieve the highlights data.
   * The highlights data provides insights into key performance metrics for the executive dashboard.
   * It logs the request's start and end time for traceability.
   *
   * @returns {Promise<ExecutiveDashboardHighlights>} - A promise that resolves to the executive dashboard highlights data.
   *
   * Example:
   *   Input: No input parameters are needed.
   *   Output: The function returns an object containing executive dashboard highlights, e.g.,
   *     {
   *       "totalDatasets": 100000,
   *       "validatedDatasets": 500,
   *       "failedDatasets": 120,
   *     }
   */
  /*
    Main-view payload for the AI Observability Executive dashboard.

    Distinct from the highlights calls below, which serve the Data Integrity
    dashboards. The endpoint owns the data source, so this wrapper stays
    unchanged when the route moves from local mock data to Splunk.
  */
  async getMainView(
    filters: DashboardFilters = {},
  ): Promise<ExecutiveDashboardPayload> {
    const response = await apiClient.get<ExecutiveDashboardPayload>(
      `${EXECUTIVE_DASHBOARD_BASE_URL}/main-view`,
      { params: filters },
    );

    return response.data;
  },

  async getExecutiveDashboardHighlights(): Promise<ExecutiveDashboardHighlights> {
    // Informational log: request is starting (helps trace activity in logs)
    console.info("Fetching executive dashboard highlights data...");

    try {
      // Call the API client to perform an HTTP GET to the highlights endpoint
      // Real-world analogy: asking a backend service for a summary report
      const response = await apiClient.get(
        `${EXECUTIVE_DASHBOARD_BASE_URL}/highlights`
      );

      // Informational log: data was retrieved successfully
      console.info(
        "Successfully retrieved executive dashboard highlights data."
      );

      // The HTTP client returns a response object; the actual payload is in `response.data`.
      // We return that payload to the caller so they can use the highlights data.
      return response.data;
    } catch (error) {
      // If anything goes wrong (network, server error), log the error for debugging
      console.error(
        "Error fetching executive dashboard highlights data:",
        error
      );

      // Throw a new, generic error that calling code can catch and handle (e.g., show an error message)
      throw new Error("Failed to fetch executive dashboard highlights");
    }
  },
  
/**
   * Fetches the pipeline dashboard highlights data from the backend API.
   *
   * This function works similarly to the above function and sends a GET request to the executive dashboard API to retrieve the pipeline highlights data.
   * The pipeline highlights data provides insights into key performance metrics for the executive dashboard.
   * It logs the request's start and end time for traceability.
   *
   * @returns {Promise<PipelineExecutiveDashboardSchema>} - A promise that resolves to the pipeline dashboard highlights data.
   *
   * Example:
   *   Input: No input parameters are needed.
   *   Output: The function returns an object containing executive dashboard highlights, e.g.,
   *     {
   *       "totalPipelines": 100000,
   *       "failedPipelines": 500,
   *       "mostFailedPipeine": "ADB_Pipeline_123"
   *     }
   */
async getPipelineHighlights(): Promise<PipelineExecutiveDashboardSchema> {

    try{
      // Call the API client to perform an HTTP GET to the highlights endpoint
      // Real-world analogy: asking a backend service for a summary report
      const response = await apiClient.get(
        `${EXECUTIVE_DASHBOARD_BASE_URL}/pipeline-highlights`
      );
      
      // The HTTP client returns a response object; the actual payload is in `response.data`.
      // We return that payload to the caller so they can use the highlights data.
      return response.data;
    } catch (error) {
      // If anything goes wrong (network, server error), log the error for debugging
      console.error(
        "Error fetching executive dashboard highlights data:",
        error
      );

      // Throw a new, generic error that calling code can catch and handle (e.g., show an error message)
      throw new Error("Failed to fetch executive dashboard highlights");
    }
  },
};
// ----------------------------- END OF SERVICE ----------------------------
