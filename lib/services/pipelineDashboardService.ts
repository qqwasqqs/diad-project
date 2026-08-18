/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Parthesh Patel
  Date: 20 December 2025

  Purpose of the script:
    This script provides services for interacting with the Pipelines Dashboard APIs.

  Responsibilities:
    - Fetches overall pipeline dashboard data.
    - Fetches status-filtered pipeline dashboard data.
    - Fetches pipeline highlights summary.
    - Fetches pipeline-specific trend and more-details data.
*/

/* --------------------------------------------------------------------- */
/* IMPORTS                                                               */
/* --------------------------------------------------------------------- */

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
  PipelineData,
  PipelineDashboard,
  PipelineTrendDetails
} from "@/types/api"; // TypeScript API response types to enforce compile-time safety for service returns.

/* --------------------------------------------------------------------- */
/* CONSTANTS                                                             */
/* --------------------------------------------------------------------- */

const PIPELINE_BASE = "/api/pipelines-dashboard"; // Base path for all pipelines-dashboard related backend endpoints.

/* --------------------------------------------------------------------- */
/* SERVICE                                                               */
/* --------------------------------------------------------------------- */

// Pipelines Dashboard Service: Provides methods to fetch pipeline runs data, including summary, details, and visuals
export const pipelineDashboardService = {
  // Exported service object grouping all Pipelines Dashboard API methods in one place.

  /**
   * Fetches pipeline names for combobox.
   * @param startDate - start date for the date range.
   * @param endDate - end date for the date range.
   * @returns Promise<any> - Resolves with the pipeline dashboard payload.
   * 
   * Sample Input: startDate = 2026-03-12T00:00:00.000Z
   *               endDate = 2026-03-13T23:59:59.999Z
   * Sample Output: 
              {
                "pipelineName": [
                  "DEV-PL_DATA_DS_ODATA_SAPPM_To_DS_ABLB_SAPPM_MASTERDATA",
                  "DEV-PL_DATA_DS_ORACDB_APSO_To_DS_ABLB_APSO",
                  "DEV-PL_DATA_DS_ORACDB_LIMS6_To_DS_ABLB_LIMS6",
                  "DEV-PL_DATA_DS_ORACDB_LIMS7_To_DS_ABLB_LIMS7",
                  "DEV-PL_DATA_DS_ORAC_EAM_To_DS_ABLB_EAM",
                  "DEV-PL_DATA_DS_ORAC_MES_DISPENSED_MATERIALS_DS_ABLB",
                  "DEV-PL_DATA_DS_ORAC_MES_EXCEPTIONS_DS_ABLB",
                  "DEV-PL_DATA_DS_ORAC_VEEVA_To_DS_ABLB_VEEVA",
                  ...
                ]
              }
   */
  async getPipelineNames(
    startDate: Date | null,
    endDate: Date | null
    ): Promise<any> {
    // Async function because it awaits an HTTP request and returns a Promise.

    // Log the start of the All Pipeline fetch (useful for debugging and tracing)
    console.info("Fetching pipeline names...");

    try {

      const res = await apiClient.get(`${PIPELINE_BASE}/pipeline-names`,
        {
          params: { startDate, endDate }, // Sends "startDate" and "enddate" as a query string parameter (?startDate=...&endDate=...).
        } // End request config object.
      ); // Performs HTTP GET to the base pipelines dashboard endpoint.

      // Log successful fetch
      console.info("Successfully fetched Pipeline Names.");

      return res.data; // Returns the response payload (data).

    } catch (error) {
      // Log the error details for diagnostics
      console.error("Error fetching Pipeline Names:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch Pipeline Names.");
    }
  }, // End of getPipelineNames method.

  /**
   * Fetches pipeline dashboard data filtered by a specific status.
   *
   * @param status - Status filter value used by the backend to filter pipelines (e.g., "Succeeded", "Failed").
   * @param startDate - start date for the date range.
   * @param endDate - end date for the date range.
   * 
   * @returns Promise<PipelineData> - Resolves with the filtered dashboard payload.
   * 
   * Sample Input: status: "Failed"
   * Sample Output: 
   *          "pipelineData": [
   *               {
   *               "PIPELINE_NAME": "DEV-PL_Scitara_Notebook",
   *               "RUN_ID": "2b3a853b-444c-4ff2-aacb-81ddbfde64dd",
   *               "START_TIME": "2026-01-15T10:02:12.0000000Z",
   *               "END_TIME": "2026-01-15T10:18:21.0000000Z",
   *               "DURATION_IN_MINUTES": "16.15",
   *               "STATUS": "Failed",
   *               "ERROR_MESSAGE": "Operation on target ForEach1 failed: Activity failed because an inner activity failed; 
   *                     Inner activity name: ExecuteDbTaskId, Error: Operation on target 
   *                     webStartQlikTask failed: {\"value\":\"8f13dd64-2f20-42f1-9806-a554bb6c5e7a\"}"
   *             },
   *             ...
   *             (more failed pipeline logs)
   *           ]
   */
  async getFilteredPipelineData(
    status: string, // Status filter to be passed as a query parameter.
    startDate: Date | null,
    endDate: Date | null
  ): Promise<PipelineData> {
    // Returns PipelineData but filtered based on the provided status.

    // Log the start of the Filtered Pipeline fetch (useful for debugging and tracing)
    console.info(`Fetching Filtered (${status}) Pipelines data...`);

    try {

      const res = await apiClient.get(
        `${PIPELINE_BASE}`, // Same base endpoint as unfiltered call; backend differentiates based on query params.
        {
          params: { status, startDate, endDate }, // Sends "status" as a query string parameter (?status=...).
        } // End request config object.
      ); // End GET request call.

      // Log successful fetch
      console.info(`Successfully fetched Filtered (${status}) Pipelines data.`);

      return res.data; // Returns the filtered response payload.

    } catch (error) {
      // Log the error details for diagnostics
      console.error("Error fetching Filtered Pipelines data:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch Filtered Pipelines data.");
    }
  }, // End of getFilteredPipelineData method.

  /**
   * Fetches pipeline dashboard highlights (high-level KPI/summary data).
   *
   * @param startDate - start date for the date range.
   * @param endDate - end date for the date range.
   * 
   * @returns Promise<PipelineHighlights> - Resolves with highlights payload.
   * 
   * Sample Output:
   *          {
   *            "total_pipelines": 335,
   *            "total_pipelines_percentage": "100.00",
   *            "succeeded_pipelines": 316,
   *            "succeeded_pipelines_percentage": "94.33",
   *            "failed_pipelines": 19,
   *            "failed_pipelines_percentage": "5.67"
   *          }
   */
  async getPipelineHighlights(
    startDate: Date | null,
    endDate: Date | null
  ): Promise<PipelineDashboard> {
    // Async because it awaits a backend call.

    // Log the start of the Pipelines Highlights fetch (useful for debugging and tracing)
    console.info(`Fetching Pipelines Highlights data...`);

    try {

      const res = await apiClient.get(`${PIPELINE_BASE}/highlights`,
      {
        params: { startDate, endDate },
      }  
      ); // Calls the highlights endpoint under the pipelines dashboard route.

      // Log successful fetch
      console.info(`Successfully fetched Pipelines Highlights data.`);

      return res.data; // Returns the highlights payload for UI consumption.

    } catch (error) {
      // Log the error details for diagnostics
      console.error("Error fetching Pipelines Highlights data:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch Pipelines Highlights data.");
    }
  }, // End of getPipelineHighlights method.

  /**
   * Fetches trend + more-details for a specific pipeline name.
   *
   * @param pipelineName - The selected pipeline identifier/name used to fetch pipeline-specific details.
   * 
   * @param startDate - start date for the date range.
   * @param endDate - end date for the date range.
   * 
   * @returns Promise<PipelineTrendDetails> - Resolves with donut/trend/more-details data for the chosen pipeline.
   * 
   * Sample Input: pipelineName: "PL_ABC_123"
   * Sample Output: 
   *           {
   *           "trend_data": [{"start": 1768485702000,"duration": "14.25","status": "Succeeded"},
   *                          {"start": 1768505464000,"duration": "13.45","status": "Succeeded"}],
   *           "donut_data": {
   *                   "total_pipelines": 2,
   *                   "total_pipelines_percentage": "",
   *                   "succeeded_pipelines": 2,
   *                   "failed_pipelines": 0,
   *                   "succeeded_pipelines_percentage": "100.00",
   *                   "failed_pipelines_percentage": "0.00"
   *               }
   *           }
   */
  async getPipelineTrendDetails(
    pipelineName: string, // Pipeline name used by the backend to locate and return trend details.
    startDate: Date | null,
    endDate: Date | null,
    triggerId: string | null
  ): Promise<PipelineTrendDetails> {
    // Async because it awaits the API response.

    // Log the start of the Pipeline Visuals(trend and donut) data fetch (useful for debugging and tracing)
    console.info(`Fetching Pipeline Visuals(trend and donut) data...`);

    try {

      const res = await apiClient.get(
        `${PIPELINE_BASE}/more-details`, // Endpoint that returns deeper analytics for a single pipeline.
        {
          params: { pipelineName, startDate, endDate, triggerId }, // Sends the selected pipeline name as a query parameter (?pipelineName=...).
        } // End request config object.
      ); // End GET request call.

      // Log successful fetch
      console.info(`Successfully fetched Pipeline Visuals(trend and donut) data.`);

      return res.data; // Returns the pipeline-specific trend details payload.

    } catch (error) {
      // Log the error details for diagnostics
      console.error("Error fetching Pipeline Visuals(trend and donut) data:", error);
      // Throw a readable error for calling code to handle
      throw new Error("Failed to fetch Pipeline Visuals(trend and donut) data.");
    }
  }, // End of getPipelineTrendDetails method.

}; // End of pipelineDashboardService export.
