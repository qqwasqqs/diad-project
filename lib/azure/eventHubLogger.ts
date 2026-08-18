/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script handles logging events to Azure Event Hub for the Teva Data Integrity project.
    - The script initializes a connection to the Event Hub Producer Client using managed identity.
    - Tt Skips logging if running in the "local(development)" environment.
    - It defines a logging interface (`LogEventOptions`) to send log events to the Event Hub.
    - It ensures graceful shutdown of the Event Hub producer client when the process terminates.
    - Provides clear and concise logging at different stages, including error handling for failed log submissions.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @azure/event-hubs
    - What it is:
        Official Azure SDK package that provides clients and types for producing,
        consuming, and managing events in Azure Event Hubs.

    - Why used:
        To publish structured application log events to Azure Event Hubs, which acts as the
        ingestion/streaming layer for Splunk. This enables centralized monitoring, analytics,
        alerting, and audit/compliance reporting.
*/
import { EventHubProducerClient, type EventData } from "@azure/event-hubs"; // Azure SDK for Event Hub

/*
  ./credential
    - What it is:
        A local utility module that provides Azure authentication credentials
        through a single standardized function (getAzureCredential).

    - Why used:
        To centralize authentication logic and support multiple environments:
          - Local development: Service Principal authentication
          - Azure production: Managed Identity / DefaultAzureCredential
*/
import { getAzureCredential } from "./credential"; // Azure credentials for authentication

/*
  ./keyvault
    - What it is:
        A local module that contains helper functions to securely retrieve
        secrets from Azure Key Vault (e.g., getSecret).

    - Why used:
        To avoid hardcoding sensitive configuration (such as Event Hub namespace
        and name) and instead load them securely from Key Vault at runtime.
*/
import { getSecret } from "./keyvault"; // Function to retrieve secrets from Azure Key Vault

// ---------------------- Singleton Producer -------------------------//

/**
 * Singleton producer for the Event Hub. This ensures that only one producer is created per process.
 *
 * @type {EventHubProducerClient | null}
 */
let producer: EventHubProducerClient | null = null;

/**
 * Initializes and retrieves the EventHubProducerClient.
 * If the producer is already created, it returns the existing one.
 * Otherwise, it fetches necessary secrets from Azure Key Vault and creates a new producer.
 *
 * @returns {Promise<EventHubProducerClient>} - The Event Hub producer client.
 *
 * @throws {Error} - Throws an error if it fails to retrieve secrets or create the EventHub producer.
 */
async function getProducer(): Promise<EventHubProducerClient> {
  // Async factory function that returns a singleton Event Hub producer client
  if (producer) return producer; // Reuse existing producer instance if already initialized (singleton pattern)

  try {
    // Wrap initialization logic in try/catch to handle failures cleanly
    console.log(
      "Reaching to the try/catch block of EventHub getProducer function..."
    ); // Diagnostic log to confirm producer initialization path is executed

    // Fetch necessary secrets from Azure Key Vault // Comment indicating secure retrieval of configuration
    const eventHubNamespace = await getSecret(
      "kv-data-integrity-eventhub-namespace"
    ); // Retrieve Event Hub namespace endpoint from Key Vault
    const eventHubName = await getSecret("kv-data-integrity-eventhub-name"); // Retrieve Event Hub entity name from Key Vault

    // Log namespace value to verify Key Vault secret retrieval
    // console.log("eventHubNamespace(kv-data-integrity-eventhub-namespace): ", eventHubNamespace);

    // Log Event Hub name to verify Key Vault secret retrieval
    // console.log("eventHubName(kv-data-integrity-eventhub-name): ", eventHubName);

    if (!eventHubNamespace || !eventHubName) {
      // Validate secrets are present before creating the client
      throw new Error( // Throw an error to fail fast if required secrets are missing
        "The 'kv-data-integrity-eventhub-namespace' and 'kv-data-integrity-eventhub-name' secrets must be available in Key Vault." // Clear message for config troubleshooting
      ); // Close error
    } // End validation block

    console.log(
      "EventHub secrets check passed. Proceeding to the next step..."
    ); // Confirm configuration is valid before connecting

    // Retrieve Azure credentials based on the environment // Comment describing authentication strategy
    const credential = getAzureCredential(); // Get Service Principal credential locally or Managed Identity credential in Azure

    // Create and initialize the Event Hub producer client // Comment explaining object creation
    producer = new EventHubProducerClient( // Instantiate producer client for sending events to Event Hub
      eventHubNamespace, // Provide fully qualified Event Hub namespace (e.g., <namespace>.servicebus.windows.net)
      eventHubName, // Provide Event Hub entity name inside the namespace
      credential // Provide credential used by SDK to request access tokens and authenticate
    ); // End client initialization

    console.log("The EventHub is connected!!!"); // Confirmation log indicating producer client initialization succeeded

    return producer; // Return initialized producer for use in logging calls
  } catch (error) {
    // Catch any failure occurring during secret retrieval or client initialization
    // Log errors if fetching secrets or creating the EventHub producer fails // Comment on failure logging purpose
    console.error("Error creating EventHub producer:", error); // Log full error details for debugging/monitoring
    throw error; // Re-throw error so caller can decide how to handle initialization failure
  } // End try/catch block
} // End getProducer()

// ---------------------- Logging Interface -------------------------//

/**
 * Defines the structure of a log event that will be sent to the Event Hub.
 *
 * @interface LogEventOptions
 */
export interface LogEventOptions {
  type: "INFO" | "WARN" | "ERROR" | "DEBUG"; // Type of the log event (Example: "INFO")
  detailMessage: string; // Detailed message of the log event (Example: "Dashboard refresh completed successfully.")
  programName: string; // Name of the program generating the log (Example: "Teva-Data-Integrity-Dashboard")

  user?: string; // Optional: User associated with the log (Example: "john.doe@teva.com")
  country?: string; // Optional: Country of the user (Example: "India")
  startDatetime?: Date; // Optional: Start date and time of the action (Example: new Date("2026-01-11T09:15:00Z"))
  status?: string; // Optional: Status of the action (Example: "SUCCESS" | "FAILED" | "IN_PROGRESS")
  actionType?: string; // Optional: Type of the action (Example: "Spark_SQL_Query")
  actionDescription?: string; // Optional: Description of the action (Example: "Refreshing dashboard KPI metrics from Azure SQL.")
  apiUsage?: Record<string, any>; // Optional: API usage details (Example: { endpoint: "/api/refresh", method: "POST", responseCode: 200, latencyMs: 1200 })
  feedback?: Record<string, any>; // Optional: Feedback details (Example: { userMessage: "Refresh completed", rating: 5 })

  // Optional overrides
  projectName?: string; // Optional: Project name (Example: "Teva Data Integrity Dashboard")
  department?: string; // Optional: Department name (Example: "Data Engineering")
  createdBy?: string; // Optional: User who created the log event (Example: "System" | "Scheduler" | "john.doe@teva.com")
  technicalOwner?: string; // Optional: Technical owner of the project (Example: "Radhe Raman Tiwari")
  businessOwner?: string; // Optional: Business owner of the project (Example: "Keerthi Pusuloori")
  l1Tag?: string | null; // Optional: L1 business unit tag (Example: "US Commercial" or null)
  l2Tag?: string | null; // Optional: L2 business unit tag (Example: "Manufacturing" or null)
  subscription?: string; // Optional: Subscription ID (Example: "sub-12345678-90ab-cdef-1234-567890abcdef")
}

/**
 * Logs an event to the Event Hub.
 *
 * This function sends structured log events to the Azure Event Hub for monitoring and tracking purposes.
 * It checks the environment to ensure it only sends logs in non-local environments. In the local environment, it skips Event Hub logging.
 *
 * @param {LogEventOptions} opts - The options containing the details of the log event.
 *
 * @returns {Promise<void>} - Resolves when the log event is successfully sent or if an error occurs.
 */
export async function logToEventHub(opts: LogEventOptions): Promise<void> {
  // Export async function to send structured logs to Azure Event Hub
  const environment = process.env.ENVIRONMENT; // Read current environment to decide whether Event Hub logging should run

  // Skip logging if running in the "local(development)" environment
  // Comment describing local-skip behavior
  if (environment === "local") return; // Avoid sending logs to Event Hub when running locally (dev mode)

  const now = new Date(); // Capture current timestamp for log creation time and end time

  // Create a structured payload for the Event Hub log event
  // Comment describing payload construction
  const payload = {
    // Build the event body in a standardized schema for downstream consumers (e.g., Splunk)
    ProjectName: opts.projectName ?? "Teva Data Integrity Dashboard", // Use provided project name or apply default
    ProgramName: opts.programName, // Attach program name that generated the log
    Subscription: opts.subscription ?? "Default-Subscription", // Use provided subscription or fallback default
    Department: opts.department ?? "Data Engineering", // Use provided department or fallback default
    Environment_Type: process.env.ENVIRONMENT ?? "Unknown", // Record runtime environment for filtering/searching logs
    Type: opts.type, // Set log severity/type (INFO/WARN/ERROR/DEBUG)
    ActionType: opts.actionType ?? null, // Add action type if provided, else null for schema consistency
    ActionDescription: opts.actionDescription ?? null, // Add action description if provided
    ActionStatus: opts.status ?? null, // Add action status if provided (e.g., SUCCESS/FAILED)
    ActionStartTime: opts.startDatetime?.toISOString() ?? null, // Convert start time to ISO string, else null
    ActionEndTime: now.toISOString(), // Capture end time of action/log
    ActionDuration: opts.startDatetime // Compute duration only if start time exists
      ? `${now.getTime() - opts.startDatetime.getTime()}ms` // Duration in milliseconds as readable string
      : null, // If no start time, keep duration as null
    DetailMessage: opts.detailMessage, // Main detailed message of the log event
    ConsumptionDetails: opts.apiUsage ?? null, // Attach API usage/telemetry info if available
    FeedbackDetails: opts.feedback ?? null, // Attach feedback/extra metadata if available
    CreationTime: now.toISOString(), // Timestamp indicating when the log payload was created
    User: opts.user ?? null, // Include user identity if available
    UserCountry: opts.country ?? null, // Include user's country if available
    CreatedBy: opts.createdBy ?? "System", // Store the log originator, defaulting to System
    TechnicalOwner: opts.technicalOwner ?? "Radhe Raman Tiwari", // Include technical owner metadata with default
    BusinessOwner: opts.businessOwner ?? "Keerthi Pusuloori", // Include business owner metadata with default
    L2_BU: opts.l2Tag ?? null, // Store L2 business unit tag if provided
    L1_BU: opts.l1Tag ?? null, // Store L1 business unit tag if provided
  }; // End of payload construction

  try {
    // Wrap send flow in try/catch to avoid breaking app execution on logging failures
    // Ensure the Event Hub producer is initialized before sending the log
    // Comment about producer initialization
    const client = await getProducer(); // Get singleton EventHubProducerClient (creates it if not already created)

    const eventData: EventData = { body: payload }; // Wrap payload inside EventData object required by Event Hub SDK
    console.info("Event data prepared:", eventData); // Log the prepared event for debugging and traceability

    // Attempt to send the log in a batch
    // Note: Maximum individual event size = 1 MB (1,048,576 bytes)
    // Maximum batch size = 5 MB (5,242,880 bytes)
    // Batching helps optimize sending multiple events at once, as long as total size does not exceed the batch limit.
    const batch = await client.createBatch(); // Create an Event Hub batch container to send events efficiently
    if (batch.tryAdd(eventData)) {
      // Attempt to add event into batch (checks size constraints)
      await client.sendBatch(batch); // Send the batch if event fits
    } else {
      // If event is too large to fit in batch
      // If the event exceeds 1 MB or the batch exceeds 5 MB, send it individually.
      // Fallback logic when event can't be batched due to size constraints
      console.warn("Event too large for batch, sending individually"); // Warn about large payload size
      await client.sendBatch([eventData]); // Send event as standalone message (single-item array)
    } // End batch send decision

    // Log locally for debugging in non-production environments
    // Comment describing local console logging
    console.log(`[EventHub:${opts.type}] ${opts.detailMessage}`); // Print short summary message for local traceability
  } catch (error: any) {
    // Handle errors from Event Hub creation, authentication, batching, or sending
    // Log any errors encountered during log submission
    // Comment explaining error logging
    if (error instanceof AggregateError) {
      // If SDK returns multiple errors grouped together
      console.error("Multiple errors occurred during EventHub log submission:"); // Print header for multi-error output
      error.errors.forEach((localError, index) => {
        // Loop over each contained error
        console.error(`Error ${index + 1}:`, localError); // Print each error with sequence number
      }); // End loop over errors
    } else {
      // Handle simple single-error case
      console.error("Failed to send log to Event Hub:", error); // Log full error details for troubleshooting
    } // End AggregateError check

    // Fallback: Print the payload locally for debugging
    // Comment describing fallback diagnostics
    console.error(
      // Output payload to console so logs are not completely lost
      "Log payload (local fallback):", // Label for payload output
      JSON.stringify(payload, null, 2) // Pretty-print JSON payload for readability
    ); // End payload fallback log
    console.error("Error Message:", error?.message ?? "Unknown error"); // Output only the error message as a quick diagnostic

    // Ensure logging doesn't break the application flow // Comment describing non-blocking logging principle
    console.error("Failed to send log to Event Hub. Continuing execution."); // Explicitly confirm application flow continues even if logging fails
  } // End try/catch
} // End logToEventHub()

// ---------------------- Graceful Shutdown -------------------------//

/**
 * Gracefully closes the EventHubProducerClient when the process terminates.
 * Ensures resources are cleaned up and the Event Hub connection is closed properly.
 */
export async function closeEventHubClient(): Promise<void> {
  // Export async cleanup function to gracefully close the Event Hub producer client
  if (producer) {
    // Only attempt to close if the producer has been initialized
    await producer.close(); // Close the EventHubProducerClient to release network connections and resources
    producer = null; // Reset the producer reference to prevent reuse of a closed client
  } // End producer cleanup block
} // End closeEventHubClient()

// Auto-close the EventHub producer on process termination (SIGTERM or SIGINT) // Comment describing graceful shutdown handling
if (typeof process !== "undefined") {
  // Ensure code is running in a Node.js environment where process object exists
  const shutdown = async (sig: string) => {
    // Define shutdown handler function that accepts the termination signal name
    console.log(`Received ${sig} signal: closing EventHub producer...`); // Log the signal received for traceability
    await closeEventHubClient(); // Close Event Hub producer to avoid open handles and data loss
    process.exit(0); // Exit the Node.js process after performing cleanup
  }; // End shutdown function definition

  process.on("SIGTERM", () => shutdown("SIGTERM")); // Handle SIGTERM (commonly sent by container orchestrators like Kubernetes)
  process.on("SIGINT", () => shutdown("SIGINT")); // Handle SIGINT (commonly triggered by Ctrl+C in terminal)
} // End Node.js runtime guard
