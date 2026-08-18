/*
  Project Name: Teva Data Integrity 
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script provides services for interacting with KPI dashboard APIs, including retrieving KPI summary data, 
    detailed views for KPIs, vendor data, and filters. 
    - It fetches data related to KPI metrics, vendor data, and developer-specific KPIs from the backend.
    - The service interacts with the backend API using `apiClient` to ensure consistent data retrieval across the application.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*  
  ../apiClient
    - What it is: Centralized HTTP client (Axios) configured with base URL, headers and interceptors.
    - Why used: Provides a consistent way to make API requests and centralizes cross-cutting concerns like auth and logging.
*/
import apiClient from "../apiClient"; // Importing the base API client for making HTTP requests

/*  
  @/types/api
    - What it is: TypeScript type definitions for the API responses used across the app.
    - Why used: Ensures functions return typed data, improving developer experience and catching type errors at compile time.
*/
import {
  KPISummaryView,
  KPIDetailsView,
  KPIVendorDetails,
  KPIVendor,
  DeveloperKPIDetails,
  KPIFilter,
} from "@/types/api"; // Importing relevant TypeScript types to ensure type safety for API responses

// ----------------------------- CONSTANTS -----------------------------

// Define base URLs for the KPI Executive and Developer views
const KPI_EXECUTIVE_BASE_URL = "/api/kpi-dashboard/summary-view"; // Base URL for KPI executive-related API endpoints
const KPI_DEVELOPER_BASE_URL = "/api/kpi-dashboard/detailed-view"; // Base URL for KPI developer-related API endpoints

// KPI Dashboard Service: Provides methods to fetch KPI data, including summary, details, vendor data, and developer metrics
export const kpiDashboardService = {
  /**
   * Fetches the summary view of KPIs, providing an overview of KPI data for the executive dashboard.
   *
   * @returns {Promise<KPISummaryView>} - A promise that resolves to the KPI summary view data.
   *
   * Sample Output:
   * {
   *   totalKPIs: 120,
   *   completedKPIs: 90,
   *   pendingKPIs: 30
   * }
   */
  async getKPISummary(): Promise<KPISummaryView> {
    // Log the start of the KPI summary fetch (useful for debugging and tracing)
    console.info("Fetching KPI summary data...");

    try {
      // Perform HTTP GET to the KPI summary endpoint
      const response = await apiClient.get(KPI_EXECUTIVE_BASE_URL);
      // Log successful fetch
      console.info("Successfully fetched KPI summary data.");
      // Return the payload from the HTTP response
      return response.data;
    } catch (error) {
      // Log the error details for diagnostics
      console.error("Error fetching KPI summary data:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch KPI summary data.");
    }
  },

  /**
   * Fetches detailed KPI data for a specific brand. This is useful for providing in-depth information about a brand's KPIs.
   *
   * @param brand - The brand name to fetch detailed KPI data for.
   * @returns {Promise<KPIDetailsView>} - A promise that resolves to the detailed KPI view data for the specified brand.
   *
   * Sample Input:
   * { brand: "BrandA" }
   * Sample Output:
   * {
   *   kpiName: "KPI1",
   *   status: "Completed",
   *   target: 100,
   *   actual: 95
   * }
   */
  async getKPIDetailsForBrand(brand: string): Promise<KPIDetailsView> {
    // Log request start with brand context
    console.info(`Fetching detailed KPI data for brand: ${brand}`);

    try {
      // GET request to fetch details for the specified brand
      const response = await apiClient.get(
        `${KPI_EXECUTIVE_BASE_URL}/${brand}`
      );
      // Log success and return payload
      console.info(`Successfully fetched KPI details for brand: ${brand}`);
      // Return the detailed KPI data
      return response.data;
    } catch (error) {
      // Log error and rethrow for caller to handle
      console.error(`Error fetching KPI details for brand: ${brand}`, error);
      // Throw a readable error for calling code to handle
      throw new Error(`Failed to fetch KPI details for brand: ${brand}`);
    }
  },

  /**
   * Fetches KPI details filtered by result status for a specific brand.
   * This is useful for filtering KPIs based on their result status (e.g., "Completed", "Pending").
   *
   * @param brand - The brand name for which to fetch the filtered KPI details.
   * @param resultStatus - The result status to filter by (e.g., "Completed", "Pending").
   * @returns {Promise<KPIVendor[]>} - A promise that resolves to a list of KPIVendor data.
   *
   * Sample Input:
   * { brand: "BrandA", resultStatus: "Completed" }
   * Sample Output:
   * [
   *   { vendor: "Vendor1", kpiName: "KPI1", resultStatus: "Completed", value: 95 },
   *   { vendor: "Vendor2", kpiName: "KPI2", resultStatus: "Completed", value: 88 }
   * ]
   */
  async getStatusWiseKPIDetails(
    brand: string,
    resultStatus: string
  ): Promise<KPIVendor[]> {
    // Log the start of the status-wise KPI details fetch
    console.info(
      `Fetching status-wise KPI details for brand: ${brand}, status: ${resultStatus}`
    );

    try {
      // Request the KPI details filtered by resultStatus via query parameters
      const response = await apiClient.get(
        `${KPI_EXECUTIVE_BASE_URL}/${brand}/kpis-details`,
        {
          params: { resultStatus }, // Pass the resultStatus as query parameter
        }
      );
      // Log successful fetch
      console.info(
        `Successfully fetched status-wise KPI details for brand: ${brand}`
      );
      // Return the filtered KPI vendor details
      return response.data;
    } catch (error) {
      // Log any error during the fetch
      console.error(
        `Error fetching status-wise KPI details for brand: ${brand}`,
        error
      );
      // Throw a readable error for calling code to handle
      throw new Error(
        `Failed to fetch status-wise KPI details for brand: ${brand}`
      );
    }
  },

  /**
   * Fetches vendor-specific KPI details for a given brand and vendor.
   * This is useful for understanding the KPIs related to a specific vendor in the context of a brand.
   *
   * @param brand - The brand name for which to fetch the vendor details.
   * @param vendor - The vendor name for which to fetch the KPI details.
   * @returns {Promise<KPIVendorDetails[]>} - A promise that resolves to a list of KPIVendorDetails.
   *
   * Sample Input:
   * { brand: "BrandA", vendor: "Vendor1" }
   * Sample Output:
   * [
   *   { kpiName: "KPI1", value: 95, target: 100 },
   *   { kpiName: "KPI2", value: 88, target: 90 }
   * ]
   */
  async getKPIVendorDetailsForBrandAndVendor(
    brand: string,
    vendor: string
  ): Promise<KPIVendorDetails[]> {
    // Log start with brand and vendor context
    console.info(
      `Fetching vendor-specific KPI details for brand: ${brand}, vendor: ${vendor}`
    );

    try {
      // Request vendor-specific KPI details; `vendor` sent as query parameter
      const response = await apiClient.get(
        `${KPI_EXECUTIVE_BASE_URL}/${brand}/data-vendors`,
        {
          params: { vendor }, // Pass the vendor name as query parameter
        }
      );
      // Log successful fetch
      console.info(
        `Successfully fetched vendor-specific KPI details for vendor: ${vendor}`
      );
      // Return the KPI details for the vendor
      return response.data;
    } catch (error) {
      // Log any error during the fetch
      console.error(
        `Error fetching vendor-specific KPI details for brand: ${brand}, vendor: ${vendor}`,
        error
      );
      // Throw a readable error for calling code to handle
      throw new Error(
        `Failed to fetch KPI vendor details for brand: ${brand}, vendor: ${vendor}`
      );
    }
  },

  /**
   * Fetches the available filters for KPI data, such as date ranges, status, and other parameters.
   *
   * @returns {Promise<KPIFilter[]>} - A promise that resolves to the available KPI filters.
   *
   * Sample Output:
   * {
   *   dateRange: ["2025-01-01", "2025-12-31"],
   *   status: ["Completed", "Pending"]
   * }
   */
  async getKPIFilters(): Promise<KPIFilter[]> {
    // Request available KPI filter options (date ranges, status, etc.)
    console.info("Fetching available KPI filters...");

    try {
      // Request the available filters for the KPI detailed view dashboard.
      const response = await apiClient.get(`${KPI_DEVELOPER_BASE_URL}/filters`);
      // Log successful fetch
      console.info("Successfully fetched KPI filters.");
      return response.data;
    } catch (error) {
      // Log any error during the fetch
      console.error("Error fetching KPI filters:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch KPI filters.");
    }
  },

  /**
   * Fetches detailed developer-specific KPI data for a given brand, KPI, and vendor.
   * This is useful for obtaining granular details on KPI metrics at the developer level.
   *
   * @param brand - The brand name for which to fetch developer-specific KPI data.
   * @param kpi - The KPI name for which to fetch developer-specific data.
   * @param vendor - The vendor name for which to fetch developer-specific data.
   * @returns {Promise<DeveloperKPIDetails[]>} - A promise that resolves to the developer-specific KPI details.
   *
   * Sample Input:
   * { brand: "BrandA", kpi: "KPI1", vendor: "Vendor1" }
   * Sample Output:
   * [
   *   { developer: "Dev1", value: 95, target: 100 },
   *   { developer: "Dev2", value: 85, target: 90 }
   * ]
   */
  async getDeveloperKPIDetails(
    brand: string,
    kpi: string,
    vendor: string
  ): Promise<DeveloperKPIDetails[]> {
    // Log request context for developer KPI details
    console.info(
      `Fetching developer-specific KPI details for brand: ${brand}, KPI: ${kpi}, vendor: ${vendor}`
    );

    try {
      // GET request with brand, kpi and vendor as query params
      const response = await apiClient.get(`${KPI_DEVELOPER_BASE_URL}`, {
        params: { brand, kpi, vendor }, // Pass brand, KPI, and vendor as query parameters to the API
      });
      // Log successful fetch
      console.info(
        `Successfully fetched developer-specific KPI details for brand: ${brand}, KPI: ${kpi}, vendor: ${vendor}`
      );
      // Return the developer-specific KPI details
      return response.data;
    } catch (error) {
      // Log any error during the fetch
      console.error(
        `Error fetching developer-specific KPI details for brand: ${brand}, KPI: ${kpi}, vendor: ${vendor}`,
        error
      );
      // Throw a readable error for calling code to handle
      throw new Error(
        `Failed to fetch developer-specific KPI details for brand: ${brand}, KPI: ${kpi}, vendor: ${vendor}`
      );
    }
  },
};
