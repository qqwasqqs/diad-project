/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 February 2026
  Purpose of the script:
    This script provides services for interacting with the Data Refresh APIs, including
    retrieving overall dataset refresh status and time-series trend details for unrefreshed datasets.
    - It fetches data related to refreshed/unrefreshed dataset counts, last refresh timestamps,
      and bucketed trend data from the backend.
    - The service interacts with the backend API using `apiClient` to ensure consistent
      data retrieval and error handling across the application.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @/types/api
    - What it is: TypeScript type definitions for the API responses used across the app.
    - Why used: Ensures functions return typed data, improving developer experience
      and catching type errors at compile time.
*/
import { DataRefresh } from "@/types/api";

/*
  ../apiClient
    - What it is: Centralized HTTP client (Axios) configured with base URL, headers, and interceptors.
    - Why used: Provides a consistent way to make API requests and centralizes cross-cutting
      concerns like authentication and logging.
*/
import apiClient from "../apiClient"; // Importing the base API client for making HTTP requests

// ----------------------------- CONSTANTS -----------------------------

// Base URL for all data refresh API endpoints
const DATA_REFRESH_API_URL = "/api/data-refresh"; // Base URL used as the prefix for all data refresh HTTP requests

// Data Refresh Service: Provides methods to fetch dataset refresh status and trend data
export const dataRefreshService = {

  /**
   * Fetches the overall data refresh status for a given date range, optionally filtered
   * by business unit and rule category.
   *
   * Returns aggregate KPI counts (refreshed datasets, unrefreshed datasets, last refresh timestamp)
   * and an array of individual unrefreshed dataset records for display in the DataGrid.
   *
   * @param startDate    - The start of the date window to filter refresh records by.
   * @param endDate      - The end of the date window to filter refresh records by.
   * @param businessUnit - Optional L1 Business Unit name to scope results (e.g. "US Commercial").
   * @param ruleCategory - Optional rule category name to scope results (e.g. "metadata").
   *
   * @returns {Promise<DataRefresh>} - A promise resolving to the data refresh summary details.
   *
   * Sample Input: { businessUnit: "US Commercial", ruleCategory: "timeliness_check", startDate: 2025-11-03, endDate: 2025-11-10 }
   * Sample Output: { refreshed_datasets: 80, unrefreshed_datasets: 20, last_refresh_timestamp: "2025-11-10T09:45:00Z", datasets: [...] }
   */
  async getDataRefresh(
    startDate: Date,
    endDate: Date,
    businessUnit?: string,
    ruleCategory?: string,
  ): Promise<DataRefresh> {
    console.info("Fetching data refresh details...");  // Log the beginning of the fetch process
    try {
      // Sends a GET request to the data refresh endpoint with optional query parameters.
      // businessUnit and ruleCategory are passed as params so the API can filter results server-side.
      const response = await apiClient.get(`${DATA_REFRESH_API_URL}`, {
        params: { businessUnit, ruleCategory, startDate, endDate },  // These are optional filters
      });
      console.info("Successfully fetched data refresh details.");  // Log successful completion
      return response.data;  // Return the fetched data refresh details
    } catch (error) {
      console.error("Error fetching data refresh details:", error);  // Log any error encountered
      throw new Error("Failed to fetch data refresh details.");  // Throw an error if something went wrong
    }
  },

  /**
   * Fetches the time-series trend data for unrefreshed datasets over a given date range,
   * optionally filtered by business unit and/or a specific dataset name.
   *
   * Returns an array of bucketed data points used to render the DataRefreshTrendChart.
   * Each data point contains the bucket start date, a human-readable bucket label,
   * the count of unrefreshed datasets in that bucket, and detail records for drill-down.
   * The bucket size is determined server-side based on the width of the date range.
   *
   * @param startDate    - The start of the date window to filter trend records by.
   * @param endDate      - The end of the date window to filter trend records by.
   * @param businessUnit - Optional L1 Business Unit name to scope trend to a single unit (e.g. "US Commercial").
   * @param datasetName  - Optional fully-qualified dataset name to scope trend to a single dataset
   *                       for the drill-down dialog view (e.g. "catalog.schema.my_table").
   *
   * @returns {Promise<any>} - A promise resolving to an array of bucketed trend data points.
   *
   * Sample Input: { businessUnit: "US Commercial", startDate: 2025-11-03, endDate: 2025-11-10 }
   * Sample Output: [{ date: "05-11-2025", bucket_label: "05 Nov 2025 - 09 Nov 2025", unrefreshed_count: 12, dataset_details: [...] }]
   */
  async getDataRefreshTrendDetails(
    startDate: Date,
    endDate: Date,
    businessUnit?: string,
    datasetName?: string,    
  ): Promise<any> {
    console.info("Fetching data refresh trend details...");  // Log the beginning of the fetch process
    try {
      // Sends a GET request to the trend-details endpoint with optional query parameters.
      // businessUnit and datasetName are passed as params so the API can filter and scope results server-side.
      const response = await apiClient.get(`${DATA_REFRESH_API_URL}/trend-details`, {
        params: { businessUnit, startDate, endDate, datasetName },  // These are optional filters
      });
      console.info("Successfully fetched data refresh trend details.");  // Log successful completion
      return response.data;  // Return the fetched data refresh details
    } catch (error) {
      console.error("Error fetching data refresh trend details:", error);  // Log any error encountered
      throw new Error("Failed to fetch data refresh trend details.");  // Throw an error if something went wrong
    }
  }
}