/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script provides functionality for acquiring the Azure Active Directory (AAD) token for Databricks.
    - It handles authentication based on the environment, using a Service Principal for local development and Managed Identity for production environments (Azure).
    - It fetches the Databricks AAD token either via Service Principal or Managed Identity and handles errors related to token acquisition.
    - The script is used to authenticate Azure-based applications to access Databricks resources securely.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @azure/identity
    - What it is:
        Official Azure SDK package that provides credential implementations
        to authenticate applications against Azure Active Directory (Azure Entra ID).

    - Why used:
        To securely obtain access tokens for Azure services (e.g., Key Vault, EventHub, Azure Databricks).
        This project uses it to support multiple authentication strategies:
          - DefaultAzureCredential (Managed Identity / environment-based auth in Azure)
          - ClientSecretCredential (Service Principal auth for local/dev environments)
*/
import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity"; // Azure Identity SDK for Managed Identity authentication

/*
  ./keyvault
    - What it is:
        A local module that contains helper functions to securely retrieve
        secrets from Azure Key Vault (e.g., getSecret).

    - Why used:
        To avoid hardcoding sensitive configuration (such as Event Hub namespace
        and name) and instead load them securely from Key Vault at runtime.
*/
import { getSecret } from "./keyvault"; // Function to fetch secrets from Azure Key Vault

/*
  axios
    - What it is: A popular HTTP client library for JavaScript/TypeScript
      used to make network requests (GET/POST/etc.) from the browser or Node.
    - Why used here: We create a single `axios` instance configured with
      headers and interceptors so all API calls in the app share consistent
      behavior (JSON headers, logging, error handling, correlation IDs).
*/
import axios from "axios";

// ---------------------- Function: getDatabricksAADToken -------------------------//

/**
 * Fetches the Databricks Azure AD token based on the environment.
 * Uses Service Principal for local development and Managed Identity for production environment (Azure).
 * Local: Service Principal -> gets AAD token (access token)
 * Azure: Managed Identity -> generates Databricks PAT token
 *
 * @returns {Promise<string>} - A promise that resolves with the Azure AD token for Databricks.
 * @throws {Error} - Throws an error if token acquisition fails.
 *
 * Input Example:
 *   process.env.ENVIRONMENT = "local"
 *   process.env.AZURE_AD_SCOPE = "xxxxxxxxxxxx/.default"
 *
 * Output Example:
 *   "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."   // AAD Access Token (JWT) OR
 *   "dapiXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"      // Databricks PAT token
 */
export async function getDatabricksAADToken(): Promise<string> {
  // Main function returning token string for Databricks use
  const environment = process.env.ENVIRONMENT ?? "unknown"; // Read runtime environment variable, fallback to "unknown" for safety

  console.info(`[DatabricksAuth] ENVIRONMENT=${environment}`); // Log environment to identify which auth flow is used

  // Decide auth strategy based on environment
  if (environment === "local") {
    // Local development branch
    console.info(
      "[DatabricksAuth] Using Service Principal (MSAL client credentials) flow."
    ); // Log which auth method is used

    return await getDatabricksTokenViaServicePrincipal(); // Delegate token acquisition to dedicated SP helper
  }

  // Default: Assume Azure runtime branch
  console.info("[DatabricksAuth] Using Managed Identity flow (Azure runtime)."); // Log which auth method is used

  return await getDatabricksTokenViaManagedIdentity(); // Delegate token acquisition to MI helper
}

/**
 * Acquires a Databricks AAD access token using Service Principal credentials.
 * 
 * This function uses the Azure SDK's ClientSecretCredential to authenticate via a Service Principal 
 * and acquire an AAD token, which can then be used to interact with the Databricks API.
 * 
 * @returns {Promise<string>} The AAD Access Token (JWT).
 * 
 * @throws {Error} Throws an error if any of the environment variables are missing 
 * or if the token acquisition fails.
 *
 * Input Example:
 *   process.env.AZURE_AD_SCOPE = "xxxxxxxxxxxx/.default"
 *
 * Output Example:
 *   "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."   // AAD Access Token (JWT)
 */
async function getDatabricksTokenViaServicePrincipal(): Promise<string> {
  // Helper function for Service Principal token acquisition
  try {
    // Wrap token retrieval in try/catch for controlled error reporting    
    // Read Azure AD Tenant ID from environment variables
    const tenantId = process.env.AZURE_AD_TENANT_ID;

    // Read Azure AD Application/Client ID from environment variables
    const clientId = process.env.AZURE_AD_CLIENT_ID;

    // Read Azure AD Client Secret from environment variables
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

    // Validate that Service Principal configuration is complete before proceeding
    if (!tenantId || !clientId || !clientSecret) {
      // Log error to indicate a configuration issue
      console.error(
        "❌ Missing required environment variables for Service Principal authentication."
      );

      // Throw an exception so callers fail fast rather than misbehaving later
      throw new Error(
        // Provide clear feedback about which variables must be set
        "AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, and AZURE_AD_CLIENT_SECRET are required for Service Principal auth."
      );
    }

    // Read the required AAD scope from environment variables
    const scope = process.env.AZURE_AD_SCOPE;

    // Validate that the scope variable is provided
    if (!scope) {
      // Validate scope exists
      throw new Error(
        "AZURE_AD_SCOPE is not defined in environment variables."
      ); // Throw clear configuration error
    }

    // Create a new ClientSecretCredential instance with the Service Principal credentials
    // This will be used to authenticate and acquire tokens from Azure Active Directory
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

    console.debug(
      "[DatabricksAuth:SP] Acquiring AAD token via MSAL acquireTokenByClientCredential..."
    ); // Debug log before calling MSAL

    // Acquire the token by passing in the required scope
    const tokenResponse = await credential.getToken(scope); // MSAL internally handles token acquisition

    // Extract the access token from the token response object
    const accessToken = tokenResponse?.token;
    
    // Validate if the token was successfully retrieved
    if (!accessToken) {
      // Validate token exists
      console.error(
        "[DatabricksAuth:SP] Token response did not contain accessToken:",
        tokenResponse
      ); // Log token response metadata
      throw new Error(
        "Failed to acquire Databricks AAD access token via Service Principal."
      ); // Throw meaningful error
    }

    console.info(
      "[DatabricksAuth:SP] Successfully acquired AAD token via Service Principal."
    ); // Log success message

    return accessToken; // Return acquired access token
  } catch (error: any) {
    // Catch any errors from MSAL call
    console.error(
      "[DatabricksAuth:SP] Error acquiring token via Service Principal:",
      error?.message ?? error
    ); // Log error details
    throw new Error(
      "Failed to acquire Databricks token via Service Principal."
    ); // Throw sanitized error to caller
  }
}

/**
 * Azure authentication: Generate Databricks Personal Access Token (PAT) using Managed Identity.
 *
 * Input Example:
 *   KeyVault Secret: "kv-data-integrity-ad-scope" = "xxxxxxxxxxxx/.default"
 *   KeyVault Secret: "kv-data-integrity-adb-server-hostname" = "adb-1234567890123456.7.azuredatabricks.net"
 *
 * Output Example:
 *   "dapiXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"      // Databricks PAT token
 */
async function getDatabricksTokenViaManagedIdentity(): Promise<string> {
  // Helper function for Managed Identity flow
  try {
    // Wrap MI flow in try/catch for controlled error handling
    console.debug(
      "[DatabricksAuth:MI] Loading Databricks config secrets from Key Vault..."
    ); // Debug log to show KV calls are starting

    const scope = await getSecret("kv-data-integrity-ad-scope"); // Get AAD scope secret from Key Vault
    const workspaceUrl = await getSecret(
      "kv-data-integrity-adb-server-hostname"
    ); // Get Databricks workspace hostname from Key Vault

    console.info(
      `[DatabricksAuth:MI] Scope loaded=${Boolean(
        scope
      )} Workspace loaded=${Boolean(workspaceUrl)}`
    ); // Log if secrets were fetched

    if (!scope || !workspaceUrl) {
      // Validate required secrets exist
      throw new Error(
        "Missing Databricks scope or workspace hostname in Key Vault."
      ); // Throw configuration exception
    }

    // Generate PAT using Databricks REST API
    const pat = await getDatabricksPat(scope, workspaceUrl); // Call helper to generate a Databricks PAT token

    console.info(
      "[DatabricksAuth:MI] Successfully acquired Databricks PAT via Managed Identity."
    ); // Log success message

    return pat; // Return Databricks PAT token
  } catch (error: any) {
    // Catch managed identity / Key Vault / REST API errors
    console.error(
      "[DatabricksAuth:MI] Error acquiring token via Managed Identity:",
      error?.message ?? error
    ); // Log error details
    throw new Error("Failed to acquire Databricks token via Managed Identity."); // Throw sanitized error to caller
  }
}

/**
 * Generates a Databricks Personal Access Token by calling the Databricks token create API.
 *
 * Input Example:
 *   scope = "xxxxxxxxxxxx/.default"
 *   workspaceUrl = "adb-1234567890123456.7.azuredatabricks.net"
 *
 * Output Example:
 *   "dapiXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"      // Databricks PAT token
 */
async function getDatabricksPat(
  scope: string,
  workspaceUrl: string
): Promise<string> {
  // Helper function to generate PAT token
  try {
    // Wrap REST call and identity acquisition in try/catch
    console.info(
      `[DatabricksPAT] Starting PAT generation for workspace=${workspaceUrl}`
    ); // Log workspace identifier (non-secret)

    // Step 1: Acquire Azure access token using Managed Identity
    const credential = new DefaultAzureCredential(); // Initialize DefaultAzureCredential provider (Managed Identity in Azure)
    console.debug("[DatabricksPAT] Acquiring Managed Identity token..."); // Debug log before acquiring MI token

    const tokenResponse = await credential.getToken(scope); // Request access token for specified scope
    const bearerToken = tokenResponse?.token; // Extract token safely

    if (!bearerToken) {
      // Validate MI token exists
      throw new Error(
        "Failed to acquire Managed Identity token (empty token response)."
      ); // Throw error if token is missing
    }

    console.info(
      "[DatabricksPAT] Managed Identity token acquired successfully."
    ); // Log success
    console.debug(
      `[DatabricksPAT] MI token expiresOn=${tokenResponse?.expiresOnTimestamp ?? "unknown"
      }`
    ); // Log expiry timestamp when available

    // Step 2: Prepare HTTP request headers and body for PAT creation
    const headers = {
      // HTTP headers required by Databricks REST API
      Authorization: `Bearer ${bearerToken}`, // Provide AAD Bearer token for authentication
      "Content-Type": "application/json", // Specify payload type as JSON
    };

    const data = {
      // Request payload for token creation
      comment: "Token generated by Managed Identity", // Description to appear in Databricks token list
      lifetime_seconds: 3600, // Configure PAT lifetime to 1 hour
    };

    // Step 3: Call Databricks API endpoint to create token
    const patTokenUrl = `https://${workspaceUrl}/api/2.0/token/create`; // Construct the Databricks PAT API endpoint

    console.info(
      `[DatabricksPAT] Calling Databricks PAT create API: ${patTokenUrl}`
    ); // Log outgoing request URL

    const response = await axios.post(patTokenUrl, data, { headers }); // Execute REST API call to Databricks

    console.info(`[DatabricksPAT] API response status=${response.status}`); // Log HTTP status code

    const databricksPat = response?.data?.token_value; // Extract token value from response payload

    if (!databricksPat) {
      // Validate PAT token is present
      console.error(
        "[DatabricksPAT] Response payload missing token_value:",
        response?.data
      ); // Log response payload safely
      throw new Error(
        "Databricks token API response did not contain token_value."
      ); // Throw error if token missing
    }

    console.info("[DatabricksPAT] Databricks PAT created successfully."); // Log success
    console.debug(`[DatabricksPAT] PAT token length=${databricksPat.length}`); // Log token length only (safe)

    return databricksPat; // Return PAT token to caller
  } catch (error: any) {
    // Catch any errors from AAD/Databricks API call
    console.error(
      "[DatabricksPAT] Error generating Databricks PAT:",
      error?.message ?? error
    ); // Log detailed error info
    throw new Error("Failed to acquire Databricks PAT."); // Throw sanitized error
  }
}
