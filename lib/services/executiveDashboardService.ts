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

 import type { DashboardFilters } from "@/types/dashboard";
import type { ExecutiveDashboardPayload } from "@/types/executiveDashboard";


// ----------------------------- CONSTANTS -----------------------------

// Base endpoint for the Executive Dashboard API (keeps URLs DRY and easier to change)
const EXECUTIVE_DASHBOARD_BASE_URL = "/api/executive-dashboard";

// ----------------------------- API SERVICE ----------------------------

/**
 * Service to interact with the Executive Dashboard API.
 * This service fetches the main-view payload for the AI Observability
 * Executive dashboard.
 */
export const executiveDashboardService = {
  /*
    Main-view payload for the AI Observability Executive dashboard.

    The endpoint owns the data source, so this wrapper stays unchanged when the
    route moves from local mock data to Splunk.
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
};
// ----------------------------- END OF SERVICE ----------------------------
