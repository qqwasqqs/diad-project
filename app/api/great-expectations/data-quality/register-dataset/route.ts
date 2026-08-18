/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 January 2025
  Purpose of the script:
    This API route handler is responsible for registering a new dataset for data quality monitoring using Great Expectations.
    - It receives dataset details from the frontend, check for the existence of the dataset, and triggers a Databricks job to set up the necessary Great Expectations checks,
      and logs the operation's success or failure to Azure Event Hub for monitoring and auditing purposes.
    - First, it checks whether the dataset exists by executing a query on the Databricks SQL Warehouse.
    - It implements a default "volume_check" rule to ensure that the dataset meets expected volume thresholds, which is a common data quality validation.
    - The API expects a POST request with dataset information in the body and uses that to configure the data quality checks in Databricks.
    - It also captures the user who initiated the request and logs detailed telemetry for observability in Splunk via Event Hub.
    - The API returns notebook job run id or error details in the response, allowing the frontend to track the registration process and provide feedback to the user.
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
        A local service module that provides functions to interact with Databricks notebooks and jobs.  
    - Why used:
        To trigger Databricks jobs/notebooks from the API with specific payloads, allowing us to execute
        data quality checks or other operations in Databricks as part of our API workflows.
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
  DATA_INTEGRITY_DATASET_TAGS_TABLE, // Table name for data integrity allowed tags
} from "@/constants/config";

// withAuthorization: a security wrapper that runs BEFORE the main logic.
//   It checks the user is logged in, records what they did (audit log),
//   and only lets the request through if everything is valid.
//   Like a bouncer at a club door who checks IDs before letting anyone in.
import { withAuthorization } from "@/lib/rbac/authorize";

// Role access is used for operations; role visibility also includes roles created by the current admin.
// Example: a creator can see a new standalone role, but can update it only after RBAC access is assigned.
import { buildRbacDataScopeAndClause } from "@/lib/rbac/dataScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/* ------------------------------- API ROUTE HANDLER ------------------------------- */

/**
 * Handles the POST request to register a new dataset for data quality monitoring and
 * implements the "volume_check" rule by default to ensure that the dataset has a minimum number of records,
 * which is a common data quality check to validate that the dataset is not empty and meets expected volume thresholds.
 * 
 * This API endpoint receives dataset details from the frontend, check for the existence of the dataset, and triggers a Databricks job
 * to set up Great Expectations checks, and logs the operation to Azure Event Hub for monitoring.
 *
 * @param request - The incoming HTTPS request(NextRequest object) containing dataset information in the body and user ID in headers.
 * @returns {Promise<NextResponse>} A JSON response containing the Databricks job run ID or an error message if registration fails.
 *
 * This function is asynchronous, meaning it returns a Promise. A Promise is an object representing the eventual completion or failure of
 * an asynchronous operation. In this case, the Promise resolves with a NextResponse, which contains the data to be sent back to the client
 * once the request is successfully processed. If the operation encounters an error, the Promise will be rejected with an error message.
 */
export const POST = withAuthorization(async function POST(request: NextRequest): Promise<NextResponse> {
  // This function executes when the frontend/browser calls this API using HTTP GET

  // Record the start time of the request for logging purposes.
  const requestStartTime = new Date();
  // Save the exact start time (like starting a stopwatch to measure performance)

  const programName = "GreatExpectationsDataQualityRegisterDatasetAPI";
  // Program/API name stored in logs to identify where the event came from

  const user = request.headers.get("x-user-id") ?? "Anonymous";
  // Read the user ID from request headers; if missing, mark as "Anonymous"

  // Log the start of the request.
  console.info(`Register dataset request initiated by user ${user}`);
  // Log to server console that the request started and who triggered it (helps troubleshooting)

  // Parse the JSON body of the request to extract dataset details sent from the frontend.
  const body = await request.json();

  try {
    // Try block: normal successful process runs here; failures go to catch block
    // Log the received request body for debugging purposes to verify what data we got from the frontend
    console.debug("Received request body:", JSON.stringify(body));

    // Check if the dataset type is not 'FILE' before proceeding with the validation logic.
    if (body?.datasetType !== 'FILE') {
      // Retrieve the Databricks session (establish a connection to Databricks)
      const session = await getDatabricksSession();
      // This function is assumed to handle authentication and connection management, 
      // ensuring that subsequent queries are executed within the context of a valid session.

      // Validate that the provided business unit is within the user's RBAC data scope.
      // This ensures users can only register datasets under business units they have access to.
      const businessUnitRbacClause = buildRbacDataScopeAndClause(request, {
        business_unit: "st.tag_value",
      });

      // Query to verify the business unit is accessible to the user
      const businessUnitValidationQuery = `
        SELECT st.tag_value
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.${DATA_INTEGRITY_DATASET_TAGS_TABLE} st
        WHERE st.tag_value = '${body.businessUnit.replace(/'/g, "''")}'
        ${businessUnitRbacClause}
        LIMIT 1
      `;

      // Execute the business unit validation query
      const businessUnitValidation = await executeQuery(session, businessUnitValidationQuery);

      // Check if the business unit is accessible to the user
      if (businessUnitValidation.length === 0) {
        // Business unit is not accessible to the user or doesn't exist
        const errorMessage =
          `Access denied. The business unit '${body.businessUnit}' is not within your assigned scope or does not exist.`;

        console.error(errorMessage);

        // Return a 403 Forbidden response - user lacks permission for this business unit
        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }

      // Build the RBAC filter for the physical table metadata lookup.
      // Example: catalog=prod and dataset=customer_master means the validation query can only match that allowed table.
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
    }

    // Construct the payload to send to the Databricks notebook based on the request body and required parameters.
    // Construct a comprehensive payload object with all required parameters for the Databricks notebook job.
    // This payload contains dataset metadata and configuration settings needed to register the dataset
    // for data quality monitoring with Great Expectations in Databricks.
    const payload = {
      // Alert configuration: empty string indicates no specific alert flag is set for this dataset
      ALERT_FLAG: "",

      // Baseline lookback configuration: unit type for historical data comparison (e.g., "days", "months")
      BASELINE_LOOKBACK_UNIT: "",

      // Baseline lookback configuration: numeric value for how far back to look for baseline data
      BASELINE_LOOKBACK_VALUE: "",

      // Baseline value: the baseline metric value for comparison during quality checks
      BASELINE_VALUE: "",

      // Databricks Unity Catalog name where the dataset table is located
      CATALOG_NAME: body.catalogName,

      // Data pattern: regex or pattern matching rules for data validation (empty for this operation)
      DATA_PATTERN: "",

      // Name of the dataset being registered for data quality monitoring
      DATASET_NAME: body.datasetName,

      // Type of dataset (e.g., "TABLE", "VIEW", "FILE") for classification purposes
      DATASET_TYPE: body.datasetType,

      // L1 business unit or department that owns this dataset for governance and auditing
      L1_BUSINESS_UNIT: body.businessUnit,

      // Lookback value: numeric value for monitoring lookback period during quality checks
      LOOKBACK_VALUE: "",

      // Lookback unit: time unit for the monitoring lookback period (e.g., "days", "weeks")
      LOOKBACK_UNIT: "",

      // Database operation type: "INSERT" indicates this is a new dataset registration (not an update)
      OPERATION: "INSERT",

      // Pipeline name: identifies the data pipeline this dataset belongs to (empty for standalone datasets)
      PIPELINE_NAME: "",

      // Receiver alert email: email address to send quality check alerts to (configured later or empty)
      RECEIVER_ALERT_EMAIL: "",

      // Rule category: classification of the quality rule (e.g., "metadata", "data_quality", "performance")
      RULE_CATEGORY: "metadata",

      // Rule critical threshold: severity level at which the rule triggers a critical alert
      RULE_CRITICAL_THRESHOLD: "",

      // Rule name: identifier for the specific quality check being applied (e.g., "volume_check")
      RULE_NAME: "volume_check",

      // Rule type: category of quality check (e.g., "volume", "freshness", "completeness", "uniqueness")
      RULE_TYPE: "volume",

      // Rule value: the actual threshold or expected value for the quality rule
      RULE_VALUE: "",

      // Rule warning threshold: severity level at which the rule triggers a warning alert
      RULE_WARNING_THRESHOLD: "",

      // Run frequency: how often the quality checks should execute (e.g., "Daily", "Weekly", "Monthly")
      RUN_FREQUENCY: "Monthly",

      // Databricks schema (database) name where the dataset table is located
      SCHEMA_NAME: body.schemaName,

      // Select column: specific column to apply quality checks to (empty for dataset-wide checks)
      SELECT_COLUMN: "",

      // Target column: the primary column for analysis or monitoring (empty if not applicable)
      TARGET_COLUMN: "",

      // Threshold lookback unit: time unit for threshold calculation lookback period
      THRESHOLD_LOOKBACK_UNIT: "",

      // Threshold lookback value: numeric value for threshold calculation lookback period
      THRESHOLD_LOOKBACK_VALUE: "",

      // Threshold unit: unit of measurement for the threshold (e.g., "records", "percentage", "seconds")
      THRESHOLD_UNIT: "",

      // Updated value: placeholder for tracking value changes (empty for new registrations)
      UPDATED_VALUE: "",

      // Created by: the user ID who initiated this dataset registration for audit trail
      CREATED_BY: user,

      // Updated by: the user ID who last modified this dataset configuration
      UPDATED_BY: user,
    };

    // Invoke the Databricks notebook service to trigger the job that registers the dataset.
    // This sends the payload to Databricks, which executes the Data Quality configuration notebook
    // and returns a response object containing the job run ID and execution details.
    const response = await databricksNotebookService.triggerDatabricksJob(payload);

    // Log the response from the Databricks configuration notebook to the server console for debugging.
    // This helps developers verify that the notebook executed successfully and see the returned job details.
    console.log(`Response from Databricks config notebook: ${JSON.stringify(response)}`);

    // Log the success event to Event Hub.
    await logToEventHub({
      // Send a structured success record to Event Hub (used for Splunk monitoring, auditing, alerts)
      type: "INFO",
      // INFO indicates this is a normal successful event
      detailMessage: `Successfully registered dataset '${body.datasetName}' in businessUnit '${body.businessUnit}' for data quality monitoring. Databricks Job Run ID: ${response.run_id}`,
      // Human readable success message
      programName,
      // Include which API created the log record
      startDatetime: requestStartTime,
      // Include start time so duration can be calculated in logging system
      status: "SUCCESS",
      // Mark this request as successful
      actionType: "Spark_Notebook_Job_Trigger",
      // Indicate this log is about triggering a Spark job on Databricks
      actionDescription: `Registered dataset '${body.datasetName}' in businessUnit '${body.businessUnit}' for data quality monitoring with payload: ${JSON.stringify(payload)}`,
      // Describe the business operation performed for audit context
      l1Tag: body.businessUnit,
      // Include business unit as a tag for easier filtering in logs
      user,
      // Store the user who triggered the API call for traceability
    });

    // Return the login emails as a JSON response.
    return NextResponse.json(response);
    // Send the results back to the frontend as JSON so UI can show dropdown/list of emails
  } catch (error: unknown) {
    // Catch block: runs if Databricks connection or query execution fails

    // Log the error event to Event Hub in case of failure.
    const errorMessage = `Error registering dataset: ${
      error instanceof Error
        ? error.message
        : "Unknown error occurred while registering dataset."
    }`;
    // Extract error message; if unavailable, use fallback

    console.error(errorMessage, error instanceof Error ? error.stack : error);
    // Print error with stack trace so developers can identify where it failed

    await logToEventHub({
      // Send structured failure log to Event Hub for monitoring and alerting
      type: "ERROR",
      // ERROR indicates the operation failed and needs attention
      detailMessage: errorMessage,
      // Detailed error message stored in logs
      programName,
      // Identify the API/service that failed
      startDatetime: requestStartTime,
      // Include start time so we know how long it ran before failing
      status: "FAILED",
      // Mark operation status as failed
      actionType: "Spark_Notebook_Job_Trigger",
      // Indicate it failed during Spark notebook job trigger
      actionDescription: `Failed to trigger Databricks notebook job for dataset: ${body.datasetName} in businessUnit: ${body.businessUnit} with payload: ${JSON.stringify(body)}`,
      // Describe what it tried to do for better investigation
      user,
      // Include which user triggered the failing request
    });

    // Return a 500 Internal Server Error response with the error message.
    return NextResponse.json({ error: errorMessage }, { status: 500 });
    // Return HTTP 500 to frontend: "server problem occurred" (not a user mistake)
  }
});
