/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script handles connecting to Databricks, executing queries, and managing sessions.
    - It manages Databricks SQL client and session connections.
    - Provides a method to execute SQL queries on the Databricks SQL Warehouse.
    - Includes robust logging to Event Hub for monitoring and traceability.
    - Implements a health check to ensure the Databricks session is active and reconnects if necessary.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @databricks/sql
    - What it is:
        Official Databricks SQL Connector for Node.js. It provides the DBSQLClient
        for connecting to Databricks SQL Warehouses and running SQL queries, along
        with logging utilities.

    - Why used:
        This project uses it to establish a connection to Databricks SQL, open sessions,
        execute Spark SQL statements, and enable structured SDK-level logging for debugging
        and performance troubleshooting.
*/
import { DBSQLClient, DBSQLLogger, LogLevel } from "@databricks/sql"; // Databricks SQL client and logger

/*
  @databricks/sql/dist/contracts/IDBSQLSession
    - What it is:
        TypeScript interface representing an active Databricks SQL session created
        from the DBSQLClient.

    - Why used:
        To strongly type the Databricks session object used throughout the application
        for executing SQL statements (executeStatement), fetching results, and managing
        session lifecycle (close).
*/
import IDBSQLSession from "@databricks/sql/dist/contracts/IDBSQLSession"; // Databricks SQL session interface

/*
  ./keyvault
    - What it is:
        A local module that contains helper functions to securely retrieve
        secrets from Azure Key Vault (e.g., getSecret).

    - Why used:
        To avoid hardcoding sensitive configuration (such as Event Hub namespace
        and name) and instead load them securely from Key Vault at runtime.
*/
import { getSecret } from "./keyvault"; // Utility to retrieve secrets from Azure Key Vault

/*
  ./ADToken
    - What it is:
        A local module that implements the authentication logic to retrieve a Databricks
        access token depending on runtime environment (local vs Azure).

    - Why used:
        To securely authenticate Databricks SQL connections by acquiring:
          - AAD access token via Service Principal (local development)
          - Databricks token / PAT via Managed Identity (Azure production runtime)
*/
import { getDatabricksAADToken } from "./ADToken"; // Function to get Databricks AAD token

/*
  ./eventHubLogger
    - What it is:
        A local logging utility module that publishes structured log events into Azure
        Event Hub.

    - Why used:
        To centralize application telemetry and operational logs by streaming them to
        Event Hub (and downstream systems such as Splunk) for monitoring, alerting,
        analytics, and audit/compliance purposes.
*/
import { logToEventHub } from "./eventHubLogger"; // Function to log events to Event Hub

// Cache the Databricks SQL client so we reuse the same client instance in the same Node.js process
let dbClient: DBSQLClient | null = null; // Holds DBSQLClient instance once connected

// Cache the Databricks SQL session so we can reuse the same session across queries
let dbSession: IDBSQLSession | null = null; // Holds active Databricks SQL session once opened

// Custom logger configuration for Databricks SDK profiling and debugging
const sqlLogger = new DBSQLLogger({
  // Create SDK logger instance
  level: LogLevel.info, // Default log level is INFO (switch to LogLevel.debug for deep troubleshooting)
}); // End logger config

// Helper constant: session health-check query used to validate session liveliness
const SESSION_HEALTHCHECK_SQL = "SELECT 1"; // Minimal query for connectivity/session testing

// Helper constant: timeout for session health-check query (milliseconds)
const SESSION_HEALTHCHECK_TIMEOUT_MS = 3000; // 3 seconds timeout to quickly detect broken session

// Helper constant: prefix for all console logs in this module
const LOG_PREFIX = "[DatabricksConnector]"; // Used to make logs searchable/consistent

/**
 * Resolves Databricks host/path depending on environment.
 * Local -> environment variables
 * Azure -> Key Vault secrets
 * 
 * Sample Input Example:
      process.env.ENVIRONMENT = "local"
      process.env.DATABRICKS_SERVER_HOSTNAME = "adb-1234567890123456.7.azuredatabricks.net"
      process.env.DATABRICKS_HTTP_PATH = "/sql/1.0/warehouses/abcd1234efgh5678"

   Sample Output Example:
    {
      host: "adb-1234567890123456.7.azuredatabricks.net",
      path: "/sql/1.0/warehouses/abcd1234efgh5678"
    }
 */
async function resolveDatabricksConnectionDetails(): Promise<{
  host: string;
  path: string;
}> {
  // Returns host/path needed by client.connect()
  const environment = process.env.ENVIRONMENT ?? "unknown"; // Read environment with safe fallback

  console.info(`${LOG_PREFIX} ENVIRONMENT=${environment}`); // Log environment for troubleshooting

  let host = ""; // Initialize host with empty string
  let path = ""; // Initialize path with empty string

  if (environment === "local") {
    // Local branch for developer machine
    console.info(
      `${LOG_PREFIX} Using local Databricks connection settings from env variables.`
    ); // Log which source is used
    host = process.env.DATABRICKS_SERVER_HOSTNAME ?? ""; // Read Databricks host from env
    path = process.env.DATABRICKS_HTTP_PATH ?? ""; // Read Databricks HTTP path from env
  } else {
    // Azure/production branch
    console.info(
      `${LOG_PREFIX} Loading Databricks connection settings from Key Vault...`
    ); // Log Key Vault retrieval
    host = await getSecret("kv-data-integrity-adb-server-hostname"); // Fetch Databricks host from Key Vault
    path = await getSecret("kv-data-integrity-adb-http-path"); // Fetch Databricks path from Key Vault
  }

  console.debug(
    `${LOG_PREFIX} host loaded=${Boolean(host)} path loaded=${Boolean(path)}`
  ); // Log presence only (not sensitive)

  if (!host || !path) {
    // Validate both required values exist
    throw new Error("Missing Databricks connection details (host/path)."); // Throw explicit configuration failure
  }

  return { host, path }; // Return connection details to caller
}

/**
 * Performs a health check on the cached Databricks session.
 * If session is dead/expired, it returns null so that caller reconnects.
 * 
 * Sample Input Example:
      session = <Active Databricks IDBSQLSession instance>

   Sample Output Example:
      <Same session object>   // if healthy
      null                   // if expired / invalid / timed out
 */
async function healthCheckSession(
  session: IDBSQLSession | null
): Promise<IDBSQLSession | null> {
  // Takes cached session and returns validated session or null
  if (!session) return null; // If no session cached, treat as invalid

  console.debug(`${LOG_PREFIX} Running session health check...`); // Log that health-check is starting

  try {
    // Wrap health-check execution in try/catch
    const operation = await Promise.race([
      // Race query vs timeout to avoid hanging calls
      session.executeStatement(SESSION_HEALTHCHECK_SQL), // Execute lightweight query
      new Promise<never>(
        (
          _,
          reject // Timeout promise rejects after X ms
        ) =>
          setTimeout(
            // Schedule timeout
            () => reject(new Error("Session health check timed out")), // Reject with explicit timeout error
            SESSION_HEALTHCHECK_TIMEOUT_MS // Use configured timeout
          ) // End setTimeout
      ), // End timeout promise
    ]); // End race

    await operation.close(); // Close operation to avoid handle/resource leak

    console.info(`${LOG_PREFIX} Session health check passed.`); // Confirm session is active
    return session; // Return original session as valid
  } catch (error: any) {
    // Catch session failures
    console.warn(
      `${LOG_PREFIX} Session health check failed. Will reconnect. Reason=${error?.message ?? error
      }`
    ); // Log reason

    // Log session expiry warning to Event Hub for Splunk monitoring
    await logToEventHub({
      // Send warning log event
      type: "WARN", // Warning log type
      detailMessage: "Databricks session expired or unhealthy. Reconnecting...", // Log message
      programName: "DatabricksConnector", // Program name for observability
      status: "RECONNECTING", // Custom status value
      actionType: "Spark_SQL_Connection", // Action classification
    }); // End EventHub log call

    return null; // Force reconnect by returning null
  }
}

/**
 * Ensures there is a valid, connected Databricks SQL session.
 * Reuses existing session if healthy, otherwise reconnects.
 * 
 *  Sample Input Example:
      (no direct parameters)
      process.env.ENVIRONMENT = "prod"
      KeyVault:
        kv-data-integrity-adb-server-hostname = "adb-1234567890123456.7.azuredatabricks.net"
        kv-data-integrity-adb-http-path = "/sql/1.0/warehouses/abcd1234efgh5678"

    Sample Output Example:
      <IDBSQLSession object>  // Active Databricks session used for executeStatement()
 */
export async function getDatabricksSession(): Promise<IDBSQLSession> {
  // Main session getter function
  console.info(`${LOG_PREFIX} getDatabricksSession() invoked.`); // Log entry point for traceability

  // Attempt to reuse session if it exists and is healthy
  const existing = await healthCheckSession(dbSession); // Health-check cached session
  if (existing) {
    // If session is valid
    console.info(`${LOG_PREFIX} Reusing existing Databricks session.`); // Log session reuse
    return existing; // Return healthy session
  }

  // Log to EventHub that connection attempt is starting
  await logToEventHub({
    // Send EventHub log for session connect attempt
    type: "INFO", // Informational log
    detailMessage: "Connecting to Databricks...", // Message
    programName: "DatabricksConnector", // Program name
    status: "CONNECTING", // Connection status
    actionType: "Spark_SQL_Connection", // Category of action
  }); // End log event

  // Resolve host/path from env or Key Vault depending on runtime
  const { host, path } = await resolveDatabricksConnectionDetails(); // Fetch connection settings

  // Acquire token for Databricks authentication
  console.debug(`${LOG_PREFIX} Acquiring Databricks token...`); // Log token acquisition start

  const accessToken = await getDatabricksAADToken(); // Get AAD token (local) or PAT token (Azure)
  console.debug(
    `${LOG_PREFIX} Token acquired successfully. tokenLength=${accessToken.length}`
  ); // Log length only (safe)

  // Log the initialization process of the DBSQLClient
  console.info(`${LOG_PREFIX} Initializing DBSQLClient...`);

  // Initialize the Databricks SQL client with custom logger for SQL operations
  dbClient = new DBSQLClient({ logger: sqlLogger }); // Instantiate Databricks SQL client with logging configuration

  try {
    // Wrap connection logic in try/catch
    console.info(`${LOG_PREFIX} Calling dbClient.connect()...`); // Log connect attempt

    // Connect to the Databricks SQL endpoint using host/path/token
    await dbClient.connect({
      // Connect using the SDK method
      host, // Databricks server hostname
      path, // Databricks HTTP path
      token: accessToken, // Authentication token (do not log actual token)
    }); // End connect call

    console.info(`${LOG_PREFIX} Opening Databricks SQL session...`); // Log session open attempt

    // Open a session used for executing SQL statements
    dbSession = await dbClient.openSession(); // Create a new Databricks session

    // Log successful session open to EventHub
    await logToEventHub({
      // Send log
      type: "INFO", // Info log
      detailMessage: "Databricks session opened successfully.", // Message
      programName: "DatabricksConnector", // Program name
      status: "CONNECTED", // Connected status
      actionType: "Spark_SQL_Connection", // Connection category
    }); // End EventHub log

    console.info(`${LOG_PREFIX} Databricks session opened successfully.`); // Local console success log

    return dbSession; // Return the active Databricks session
  } catch (error: any) {
    // Catch connection failures
    console.error(
      `${LOG_PREFIX} Failed to connect/open session. Error=${error?.message ?? error
      }`
    ); // Log error

    // Log failure to EventHub for monitoring
    await logToEventHub({
      // Send failure log
      type: "ERROR", // Error severity
      detailMessage: `Failed to open Databricks session: ${error?.message ?? "Unknown error"
        }`, // Error details
      programName: "DatabricksConnector", // Program name
      status: "FAILED", // Failed state
      actionType: "Spark_SQL_Connection", // Action type
    }); // End EventHub log

    throw new Error(
      `Databricks connection/session initialization failed: ${error?.message ?? "Unknown error"
      }`
    ); // Throw sanitized error
  }
}

/**
 * Executes a SQL query on the Databricks session and returns all rows.
 * Ensures operation is always closed.
 * 
 * Sample Input Example:
      session = await getDatabricksSession()
      sql = "SELECT * FROM teva_data_integrity.metrics LIMIT 10"

   Sample Output Example:
      [
        { metric_name: "TotalRecords", metric_value: 12345 },
        { metric_name: "InvalidRecords", metric_value: 12 }
      ]
 */
export async function executeQuery<T = any>(
  session: IDBSQLSession,
  sql: string
): Promise<T[]> {
  // Executes query and returns typed array
  let operation: any = null; // Hold operation handle so we can close it in finally

  console.info(`${LOG_PREFIX} Executing Spark SQL query...`); // Log query execution start
  // console.debug(`${LOG_PREFIX} SQL=${sql}`); // Optional: uncomment only for debugging (may expose sensitive data)

  try {
    // Wrap execution in try/catch/finally
    operation = await session.executeStatement(sql); // Execute SQL statement using Databricks SDK
    const rows = await operation.fetchAll(); // Fetch all rows from result set
    console.info(
      `${LOG_PREFIX} Query executed successfully. rows=${rows?.length ?? 0}`
    ); // Log row count
    return rows as T[]; // Return typed result rows
  } catch (error: any) {
    // Catch SQL execution errors
    console.error(
      `${LOG_PREFIX} Query execution failed. Error=${error?.message ?? error}`
    ); // Log failure reason
    throw new Error(
      `Query execution failed: ${error?.message ?? "Unknown error"}`
    ); // Rethrow with normalized message
  } finally {
    // Always cleanup operation handle
    if (operation) {
      // Only close if operation exists
      await operation.close().catch((closeErr: any) => {
        // Close operation and swallow cleanup error
        console.warn(
          `${LOG_PREFIX} Failed to close query operation handle. Reason=${closeErr?.message ?? closeErr
          }`
        ); // Log cleanup warning
      }); // End close catch
    }
  }
}

/**
 * Closes Databricks session and client safely.
 * Should be called during application shutdown.
 * 
 * Sample Input Example:
      await closeDatabricksConnection()

   Sample Output Example:
      (Promise resolves with no return value)
      console output:
        [DatabricksConnector] Databricks connection cleanup completed.
 */
export async function closeDatabricksConnection(): Promise<void> {
  // Cleanup function for graceful shutdown
  console.info(`${LOG_PREFIX} Closing Databricks connection...`); // Log close attempt start

  // Close the session if present
  if (dbSession) {
    // Check if session exists
    try {
      // Wrap close in try/catch to prevent shutdown failures
      await dbSession.close(); // Close session gracefully
      console.info(`${LOG_PREFIX} Databricks session closed.`); // Log success
    } catch (error: any) {
      // Handle close errors
      console.warn(
        `${LOG_PREFIX} Error closing Databricks session. Reason=${error?.message ?? error
        }`
      ); // Log warning
    } finally {
      // Always reset session reference
      dbSession = null; // Clear cached session
    }
  }

  // Close the client if present
  if (dbClient) {
    // Check if client exists
    try {
      // Wrap close in try/catch
      await dbClient.close(); // Close the DBSQL client and underlying connections
      console.info(`${LOG_PREFIX} Databricks client closed.`); // Log success
    } catch (error: any) {
      // Handle close errors
      console.warn(
        `${LOG_PREFIX} Error closing Databricks client. Reason=${error?.message ?? error
        }`
      ); // Log warning
    } finally {
      // Always reset client reference
      dbClient = null; // Clear cached client
    }
  }

  console.info(`${LOG_PREFIX} Databricks connection cleanup completed.`); // Final shutdown log
}
