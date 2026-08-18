/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    The script defines an API route handler for managing data quality rules within the Great Expectations framework. 
    It processes incoming POST requests to either create new data quality rules or update existing ones based on 
    the presence of a configuration ID in the request body and returns Databricks notebook job execution response with run ID and job ID.
    The handler integrates with Azure Event Hub to log both successful operations and errors, providing detailed telemetry for monitoring and troubleshooting. 
    Additionally, it triggers Databricks jobs to execute the necessary data quality operations 
    as defined by the incoming requests.
      - Processes POST requests to manage data quality rules in Great Expectations framework
      - Handles creation of new rules and updating of existing rules and returns Databricks notebook job execution response with run ID and job ID
      - Integrates with Azure Event Hub for logging success and failure events
      - Triggers Databricks jobs to execute data quality operations
  
  Key Features:
  - Determines operation type (INSERT/UPDATE) based on presence of configId
  - Extracts user context from request headers
  - Constructs appropriate payload for Databricks job execution
  - Logs all events to Event Hub for monitoring and audit trails
  - Handles errors gracefully with detailed error logging
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
        Shared Databricks SQL helper used here to validate that an existing rule belongs to the user's RBAC data scope before update.

    - Why used:
        Update requests can send only a configId, so we must look up that configId in Databricks before triggering the notebook job.
*/
import {
  executeQuery,
  getDatabricksSession,
} from "@/lib/azure/databricksClient";

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
        To encapsulate the logic for authenticating with Databricks, constructing job payloads, and
        invoking the Databricks REST API to run notebooks that perform data quality operations as
        defined by the incoming API requests.
*/
import { databricksNotebookService } from "@/lib/services/databricksNotebookService";
import {
  CATALOG_NAME,
  DATA_DRIFT_CONFIG_TABLE,
  DATA_QUALITY_CONFIG_TABLE,
  SCHEMA_NAME,
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
  dataQualityScopeColumns,
} from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ----------------------------- RBAC SCOPE VALIDATION ----------------------------- */

const buildScopedConfigValidationQuery = (
  configId: string,
  request: NextRequest
): string => {
  // Build one RBAC filter against a normalized config view that contains both quality and drift rows.
  // Example: business_unit=Finance allows the update only when the configId belongs to Finance.
  const rbacScopeClause = buildRbacDataScopeAndClause(
    request,
    dataQualityScopeColumns("scoped_config")
  );

  // Return one query that checks whether the configId exists inside the user's allowed data scope.
  return `
    SELECT scoped_config.CONFIG_ID
    FROM (
      SELECT
        CONFIG_ID,
        L1_BUSINESS_UNIT,
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        RULE_CATEGORY
      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_QUALITY_CONFIG_TABLE}

      UNION ALL

      SELECT
        CONFIG_ID,
        L1_BUSINESS_UNIT,
        CATALOG_NAME,
        SCHEMA_NAME,
        DATASET_NAME,
        'data_drift' AS RULE_CATEGORY
      FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_DRIFT_CONFIG_TABLE}
    ) scoped_config
    WHERE scoped_config.CONFIG_ID = '${configId}'
      ${rbacScopeClause}
      -- RBAC data-scope filter: configId updates are allowed only for rows inside the user's groups
    LIMIT 1
  `;
};


/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the POST request to update or insert data based on the request body.
 *
 * This API endpoint processes a request to update an existing configuration or insert a new configuration,
 * depending on the data provided in the request body. It also logs both success and failure events for monitoring purposes.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing dataset information in the body and user ID in headers.
 * @returns {Promise<NextResponse>} A JSON response containing the Databricks job run ID or an error message if registration fails.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  // Start logging the request handling execution
  console.info("POST request started: inserting data.");

  // Record the start time of the request for performance and auditing purposes
  const requestStartTime = new Date();

  // Log the start time of the request for debugging and performance monitoring
  console.debug(`Request start time: ${requestStartTime.toISOString()}`);

  const programName = "GreatExpectationsDataQualityManageRuleAPI";
  // Define the program name used in logs to identify which API is being executed

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Extract user ID from the request headers. If not found, default to "Anonymous"

  console.info(`Request initiated by user: ${user}`);
  // Log who initiated the request

  const body = await request.json();
  // Parse the JSON body of the request to get the data

  try {
    // Try block: begin normal processing; failures will go to the catch block
    // Log the received request body for debugging purposes
    console.debug("Received request body:", JSON.stringify(body));
    let payload;

    // Check if the request body contains a configId to determine if this is an update or insert operation
    // Determine operation type based on presence of configId in request body
    if (body?.configId) {
      // UPDATE operation: configId indicates an existing configuration to be modified
      const session = await getDatabricksSession();
      // Open a Databricks SQL session so we can verify the configId is inside the user's scope before updating it.

      const scopedConfigRows = await executeQuery(
        session,
        buildScopedConfigValidationQuery(body.configId, request)
      );
      // If no row is returned, the config either does not exist or is outside the user's allowed scopes.

      if (scopedConfigRows.length === 0) {
        const errorMessage =
          "You do not have permission to update this data quality rule configuration.";
        // Return a 403 response because the user is authenticated but not authorized for this scoped row.

        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }

      payload = {
        OPERATION: "UPDATE", // Operation type for Databricks job
        CONFIG_ID: body.configId, // Unique identifier of the configuration to update
        SELECT_COLUMN: body.selectColumn, // Column name to be used in the update query
        UPDATED_VALUE: body.updatedValue, // New value to set in the specified column
        RULE_CATEGORY: body.ruleCategory, // Category classification of the data quality rule
        UPDATED_BY: user, // Audit trail: track who performed the update
      };
    } else {
      // INSERT operation: no configId means creating a new data quality rule configuration
      payload = {
        ALERT_FLAG: "", // Alert flag status (populated by Databricks job if needed)
        BASELINE_LOOKBACK_UNIT: "", // Time unit for baseline calculation (populated by job)
        BASELINE_LOOKBACK_VALUE: "", // Number of periods for baseline (populated by job)
        BASELINE_VALUE: body.baselineValue, // Reference baseline value for comparison
        CATALOG_NAME: body.catalogName, // Catalog name where the dataset resides
        DATA_PATTERN: body.dataPattern, // Pattern definition for data validation
        DATASET_NAME: body.datasetName, // Name of the dataset being validated
        DATASET_TYPE: body.datasetType, // Type/classification of the dataset
        L1_BUSINESS_UNIT: body.businessUnit, // Business unit owner of the dataset
        LOOKBACK_VALUE: "", // Number of periods for rule evaluation (populated by job)
        LOOKBACK_UNIT: "", // Time unit for rule evaluation period (populated by job)
        OPERATION: "INSERT", // Operation type for Databricks job
        PIPELINE_NAME: "", // Pipeline name associated with the rule (populated by job)
        RECEIVER_ALERT_EMAIL: body.receiverAlertEmail, // Email recipient for alerts
        RECEIVER_ALERT_ID: body.receiverAlertId, // Identifier for alert recipient
        RULE_CATEGORY: body.ruleCategory, // Category classification of the rule
        RULE_CRITICAL_THRESHOLD: body.ruleCriticalThreshold, // Critical threshold value for alerts
        RULE_NAME: body.ruleName, // Human-readable name of the rule
        RULE_TYPE: body.ruleType, // Type of rule (e.g., threshold, pattern match)
        RULE_VALUE: body.ruleValue, // Primary value parameter for the rule
        RULE_WARNING_THRESHOLD: body.ruleWarningThreshold, // Warning threshold value for alerts
        RUN_FREQUENCY: body.runFrequency, // Frequency of rule execution (e.g., daily, hourly)
        SCHEMA_NAME: body.schemaName, // Database schema name containing the dataset
        SELECT_COLUMN: "", // Specific column for operations (empty for new rules)
        SELECT_COLUMNS: body.selectColumns, // Multiple columns to include in rule evaluation
        TARGET_COLUMN: body.targetColumn, // Primary column targeted by the rule
        THRESHOLD_LOOKBACK_UNIT: "", // Time unit for threshold baseline (populated by job)
        THRESHOLD_LOOKBACK_VALUE: "", // Number of periods for threshold (populated by job)
        THRESHOLD_UNIT: "", // Unit of measurement for threshold values
        UPDATED_VALUE: "", // No updated value for new configurations
        CREATED_BY: user, // Audit trail: user who created this rule configuration
        UPDATED_BY: user, // Audit trail: initialized to creation user
      };
    }

    // Invoke Databricks service to trigger the data quality notebook job with the constructed payload
    const response =
      await databricksNotebookService.triggerDatabricksJob(payload);

    // Log the successful job trigger for observability and debugging
    console.info(
      `Databricks job triggered successfully for operation: ${payload.OPERATION}. Run ID: ${response?.run_id || "N/A"}, response: ${response}`
    );

    // Publish success event to Event Hub for centralized monitoring, alerting, and compliance tracking
    await logToEventHub({
      type: "INFO", // Log severity level
      detailMessage: `Data quality rule ${payload.OPERATION === "INSERT" ? "created" : "updated"} successfully. Dataset: ${body.datasetName}, Rule Name: ${body.ruleName}`, // Detailed success message
      programName, // API identifier for log aggregation
      startDatetime: requestStartTime, // Request initiation timestamp for duration calculation
      status: "SUCCESS", // Operation completion status
      actionType: "Spark_Notebook_Job_Trigger", // Category for log filtering and analytics
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `${payload.OPERATION} data quality rule configuration in Great Expectations framework with payload: ${JSON.stringify(payload)}`, // Detailed operation description
      user, // Audit trail: who initiated the operation
    });

    // Return the Databricks job execution response (including run ID and status) to the client
    return NextResponse.json(response);
    // Send back the JSON response to the frontend
  } catch (error: unknown) {
    // Catch block: runs if there was an error during processing

    const errorMessage = `Error during request processing: ${
      error instanceof Error ? error.message : "Unknown error occurred."
    }`;
    // Capture the error message (fallback to a default if none is provided)

    console.error(errorMessage, error instanceof Error ? error.stack : error);
    // Log the error message and stack trace for debugging purposes

    // Log the error event to Event Hub for monitoring and alerting
    await logToEventHub({
      type: "ERROR", // Log level: ERROR
      detailMessage: errorMessage, // Error message
      programName, // Program name for identifying where the log came from
      startDatetime: requestStartTime, // Start time of the request
      status: "FAILED", // Mark the request as failed
      actionType: "Spark_Notebook_Job_Trigger", // Action type (for categorization)
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Failed to process request for dataset: ${body.datasetName} with payload: ${JSON.stringify(body)}`, // Description of the failed operation
      user, // The user who triggered the failed request
    });

    // Return a 500 Internal Server Error response with the error message to the frontend
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
