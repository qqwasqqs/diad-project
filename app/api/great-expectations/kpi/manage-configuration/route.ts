/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    This API route handler processes POST requests to manage KPI configurations for the Great Expectations framework.
      - It supports both updating existing configurations and inserting new ones based on the presence of a configId in the request body.
      - It checks whether the dataset exists by executing a query on the Databricks SQL Warehouse.
      - It constructs a payload with the necessary details and triggers a Databricks notebook job to execute the required operations.
      - It returns Databricks notebook job execution response with run ID and job ID.
      - It also implements robust error handling and logs both success and failure events to Azure Event Hub for monitoring and troubleshooting purposes.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  next/server
    - What it is:
        Next.js server-side module that provides request/response utilities for Route Handlers
        (API endpoints) in the App Router.

    - Why used:
        To handle incoming HTTP requests and generate structured HTTP responses in Next.js APIs,
        including reading request payloads, returning JSON responses, and managing status codes.
*/
import { NextRequest, NextResponse } from "next/server"; // Next.js types/utilities for server route handling

/*
  @/lib/azure/databricksClient
    - What it is:
        A local utility module responsible for connecting to Databricks SQL, managing sessions,
        and executing queries using the Databricks SQL Connector.

    - Why used:
        To abstract Databricks connectivity and query execution into reusable functions, ensuring
        consistent authentication, session management, error handling, and resource cleanup across APIs.
*/
import {
  executeQuery,
  getDatabricksSession,
} from "@/lib/azure/databricksClient"; // Session + query execution helpers for Databricks SQL

/*
  @/lib/azure/eventHubLogger
    - What it is:
        A local logging module that publishes structured operational logs to Azure Event Hub.

    - Why used:
        To capture API execution telemetry (success/failure, duration, errors, metadata) and stream
        it to Event Hub for downstream ingestion into monitoring systems such as Splunk for analytics,
        alerting, and audit/compliance tracking.
*/
import { logToEventHub } from "@/lib/azure/eventHubLogger"; // Centralized Event Hub logger for API observability

/*
  @/lib/services/databricksNotebookService
    - What it is:
        A local service module that abstracts interactions with Databricks, specifically for triggering
        notebook jobs.
    - Why used:
        To encapsulate the logic for communicating with Databricks APIs, allowing this route handler to
        trigger notebook jobs without needing to manage the details of API requests, authentication,
        and response handling directly in the route code.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";

/*
  @/constants/config
    - What it is:
        A centralized configuration/constants module containing common project constants such as
        Databricks catalog name, schema name, dataset/table names, and a predefined SQL-ready list 
        of approved Databricks schema names (SCHEMAS) used for filtering queries.

    - Why used:
        To avoid hardcoding critical metadata (catalog/schema/table identifiers) across the codebase,
        promote consistency, reduce duplication, and simplify maintenance when these values change.
*/
import {
  CATALOG_NAME, // Databricks catalog name used as the logical database container
  SCHEMA_NAME, // Databricks schema name used to organize tables within the catalog
  KPI_QUALITY_CONFIG_TABLE, // Table name for storing KPI quality configuration details
  KPI_L1_TAG_NAME, // L1 business tag used for KPI Splunk logging, monitoring, and reporting
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import {
  buildRbacDataScopeAndClause,
  kpiConfigScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
 // Project-level configuration constants

/* ----------------------------- RBAC SCOPE VALIDATION ----------------------------- */

const buildScopedKpiConfigValidationQuery = (
  configId: string,
  request: NextRequest
): string => {
  // Build the RBAC filter for KPI configuration rows.
  // Example: brand=Teva allows updates only when the configId belongs to Teva.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    kpiConfigScopeColumns("c")
  );

  // Return one row only when the configId exists and is inside the user's allowed data scope.
  return `
    SELECT c.CONFIG_ID
    FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${KPI_QUALITY_CONFIG_TABLE} c
    WHERE c.CONFIG_ID = '${configId}'
      ${rbacScopeClause}
      -- RBAC data-scope filter: configId updates are allowed only for rows inside the user's groups
    LIMIT 1
  `;
};

/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the POST request to update or insert data based on the request body.
 * The function first logs the start of the request handling and extracts necessary information such as the user ID from the request headers.
 * It then constructs a payload based on whether the request is for updating an existing configuration (if configId is present)
 * or inserting a new configuration (if configId is absent). it checks whether the dataset exists by executing a query on the Databricks SQL Warehouse. and 
 * After preparing the payload, it triggers a Databricks job using the databricksNotebookService and logs the response.
 * Finally, it logs the success or failure of the operation to Azure Event Hub for monitoring and returns the appropriate JSON response to the client.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing the necessary headers for user and other context.
 * @returns {Promise<NextResponse>} A JSON response containing the result of the operation, or an error message if something goes wrong.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  // Start logging the request handling execution
  console.info(
    "POST request started: updating or inserting rule configuration.",
  );

  // Record the start time of the request for performance and auditing purposes
  const requestStartTime = new Date();
  console.debug(`Request start time: ${requestStartTime.toISOString()}`);

  // Define the program name used in logs to identify which API is being executed
  const programName = "GreatExpectationsKPIManageConfigurationAPI";

  // Extract the user ID from request headers. If not found, default to "Anonymous"
  const user = request.headers.get("x-user-id") ?? "Anonymous";

  console.info(`Request initiated by user: ${user}`);
  // Log who initiated the request to help with troubleshooting and auditing

  const body = await request.json();
  // Parse the JSON body of the request to get the configuration data needed for processing.
  // This will contain fields like configId, selectColumn, updatedValue, etc.

  try {
    // Try block: begin normal processing; failures will go to the catch block
    // Log the received request body for debugging purposes
    console.debug("Received request body:", JSON.stringify(body));
    let payload;

    // Check if the request body contains a configId to determine if this is an update or insert operation
    if (body?.configId) {
      // If configId exists in the body, it means we're updating an existing configuration
      console.debug("Preparing payload for UPDATE operation.");
      const session = await getDatabricksSession();
      // Open a Databricks SQL session so we can verify the configId belongs to the user's scope.

      const scopedConfigRows = await executeQuery(
        session,
        buildScopedKpiConfigValidationQuery(body.configId, request)
      );
      // If no row is returned, the config either does not exist or is outside the user's allowed scopes.

      if (scopedConfigRows.length === 0) {
        const errorMessage =
          "You do not have permission to update this KPI configuration.";
        // Return 403 because the user is authenticated but not authorized for this scoped row.

        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }

      payload = {
        OPERATION: "UPDATE", // Operation type is "UPDATE"
        CONFIG_ID: body.configId, // The ID of the configuration to be updated
        SELECT_COLUMN: body.selectColumn, // Column for the query operation
        UPDATED_VALUE: body.updatedValue, // The updated value for the configuration
        RULE_CATEGORY: "KPI", // The rule category, hardcoded as "KPI"
        UPDATED_BY: user, // The user who is making the update, used for auditing purposes
      };
    } else {
      // If configId does not exist, it means we're inserting a new configuration
      console.debug("Preparing payload for INSERT operation.");

      // Retrieve the Databricks session (establish a connection to Databricks)
      const session = await getDatabricksSession();
      // This function is assumed to handle authentication and connection management, 
      // ensuring that subsequent queries are executed within the context of a valid session.

      // Build the RBAC filter for the physical table metadata lookup.
      // Example: catalog=prod and dataset=sales_fact only validates that allowed table.
      const rbacScopeClause = buildRbacDataScopeAndClause(request, {
        catalog: "table_catalog",
        schema: "table_schema",
        dataset: "table_name",
      });

      // Prepare the SQL query to check for the existence of the dataset in the specified catalog and schema
      const query = `
        SELECT table_name
        FROM system.information_schema.tables
        -- Get metadata of the dataset/table name
        WHERE table_catalog = '${body.catalogName}' -- catalog name
          AND table_schema = '${body.schemaName}' -- schema name
          AND table_name = '${body.datasetName}' -- dataset/table name
          ${rbacScopeClause}
          -- RBAC data-scope filter: only validate datasets inside the user's assigned scope
      `;
      // The SQL query asks Databricks to return the table name from the information schema if it matches
      // the specified catalog, schema, and dataset. If the dataset exists, we expect at least one result.

      // Execute the SQL query using the established session connection
      const datasetValidation = await executeQuery(session, query);
      // 'executeQuery' runs the query against the Databricks SQL warehouse and returns the result,
      // typically in the form of an array of rows matching the criteria (table_name).

      // Check if the dataset exists (i.e., if the query returned any rows)
      if (datasetValidation.length === 0) {
        // If the result array is empty, it means the dataset was not found in the catalog/schema.

        // Define a more descriptive error message to explain the issue
        const errorMessage =
          "The dataset could not be found. Please ensure the provided catalog, schema, and dataset names are correct.";
        // This error message provides more context and guidance. It helps the user understand that the issue is likely related to invalid or non-existent input values.

        console.error(errorMessage);
        // Log the error message for developers or support to easily track why the validation failed.
        // This helps in debugging issues and understanding why certain requests do not pass validation.

        // Return a 400 HTTP response with the error message
        return NextResponse.json({ error: errorMessage }, { status: 400 });
        // A 400 status code indicates that the request was malformed or invalid.
        // By returning this error with the appropriate message, the client/frontend can handle it appropriately (e.g., showing a user-friendly message).
      }

      // Preparing payload for INSERT operation.
      payload = {
        OPERATION: "INSERT", // Operation type is "INSERT"
        RULE_CATEGORY: "KPI", // The rule category, hardcoded as "KPI"
        CATALOG_NAME: body.catalogName, // Catalog name related to the KPI
        SCHEMA_NAME: body.schemaName, // Schema name related to the KPI
        DATASET_NAME: body.datasetName, // Dataset name related to the KPI
        BRAND: body.brand, // Brand name related to the KPI
        CALCULATION_METHOD: body.calculationMethod, // Method used for calculation
        DATA_DOMAIN: body.dataDomain, // Data domain related to the KPI
        DATA_SOURCE: body.source, // Source of the data for the KPI
        DATA_VENDOR: body.vendor, // Vendor for the data
        KPI_FORMAT: body.kpiFormat, // The format of the KPI
        KPI_NAME: body.kpi, // The name of the KPI
        KPI_UNIQUE_IDENTIFIER: body.kpiUniqueIdentifier, // A unique identifier for the KPI
        KPI_UNIQUE_IDENTIFIER_VALUE: body.kpiUniqueIdentifierValue, // A unique identifier value for the KPI
        ALERT_THRESHOLD: body.alertThreshold, // Threshold value for triggering alerts
        THRESHOLD_DERIVATION_TYPE: body.thresholdDerivationType, // The type of threshold derivation
        THRESHOLD_DERIVATION_METHOD: body.thresholdDerivationMethod, // The method for threshold derivation
        THRESHOLD_LOOKBACK_VALUE: body.thresholdLookbackValue, // Lookback value for the threshold
        RECEIVER_ALERT_EMAIL: body.receiverAlertEmail, // Email address to receive alerts
        RUN_FREQUENCY: body.runFrequency, // Frequency for running the KPI
        SELECT_COLUMN: "", // Select column (left empty as placeholder)
        UPDATED_VALUE: "", // Leave updated value empty for new entries
        CREATED_BY: user, // The user who is creating the new configuration, used for auditing purposes
        UPDATED_BY: user, // The user who is creating the new configuration, used for auditing purposes
      };
    }

    // Call external service to trigger a Databricks notebook job with the constructed payload
    const response =
      await databricksNotebookService.triggerDatabricksJob(payload);

    // Log the successful job trigger for observability and debugging
    console.info(
      `Databricks job triggered successfully for operation: ${payload.OPERATION}. Run ID: ${response?.run_id || "N/A"}, response: ${response}`
    );
    // Log the output of the Databricks job to see the result

    // Log the success event to Event Hub for monitoring and alerting
    await logToEventHub({
      type: "INFO", // Log level: INFO indicates a successful event
      detailMessage: `Successfully triggered Databricks notebook job for operation: ${payload.OPERATION}. Run ID: ${response?.run_id || "N/A"}`, // Human-readable success message
      programName, // The API that created the log record
      startDatetime: requestStartTime, // The start time of the request
      status: "SUCCESS", // Mark the request as successful
      actionType: "Spark_Notebook_Job_Trigger", // Action type (category for logging)
      actionDescription: `Processed configuration request for KPI with payload: ${JSON.stringify(payload)}`, // Description of the operation
      l1Tag: KPI_L1_TAG_NAME, // Business tag for monitoring/alert routing
      user, // The user who triggered the request
    });

    // Return the result of the Databricks job execution as a JSON response
    return NextResponse.json(response);
    // Send the results back to the frontend as JSON so UI can display the data
  } catch (error: unknown) {
    // Catch block: runs if there was an error during processing
    // Prepare the error message for logging
    const errorMessage = `Error encountered during KPI configuration request processing: ${
      error instanceof Error ? error.message : "Unknown error occurred."
    }`;

    // Log the error message and stack trace for debugging purposes
    console.error(errorMessage, error instanceof Error ? error.stack : error);

    // Log the error event to Event Hub for monitoring and alerting
    await logToEventHub({
      type: "ERROR", // Log level: ERROR indicates the operation failed
      detailMessage: errorMessage, // Detailed error message
      programName, // The API that failed
      startDatetime: requestStartTime, // Start time of the request
      status: "FAILED", // Mark the request as failed
      actionType: "Spark_Notebook_Job_Trigger", // Action type (category for logging)
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Failed to process configuration request for KPI with payload: ${JSON.stringify(body)}`, // Description of the failed operation
      l1Tag: KPI_L1_TAG_NAME, // Business tag for monitoring/alert routing
      user, // The user who triggered the failed request
    });

    // Return a 500 Internal Server Error response with the error message to the frontend
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: indicating a server-side problem
  }
});
