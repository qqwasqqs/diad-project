/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script provides a function to retrieve the appropriate Azure credential based on the environment.
    - It checks if the environment is local (development) or production (Azure environment).
    - In the local environment, it uses Service Principal credentials.
    - In the production environment, it uses Managed Identity.
    - The returned credentials are used to authenticate and access Azure resources.
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
import {
  DefaultAzureCredential,
  ClientSecretCredential,
} from "@azure/identity";

// ---------------------- Utility Function: getAzureCredential -------------------------//

/**
 * Retrieves the appropriate Azure credential based on the environment.
 *
 * - For local development, it uses Service Principal credentials (Client ID, Tenant ID, Client Secret).
 * - For production (Azure environment), it uses Managed Identity.
 *
 * @returns {DefaultAzureCredential | ClientSecretCredential} - An Azure credential instance based on the environment.
 * @throws {Error} - Throws an error if required environment variables are missing in local development.
 *
 * Example input:
 *   - Environment variable `process.env.ENVIRONMENT = 'local'` (local development)
 *   - Environment variable `process.env.ENVIRONMENT = 'production'` (Azure production environment)
 *
 * Example output:
 *   - `new ClientSecretCredential(tenantId, clientId, clientSecret)` if local environment.
 *   - `new DefaultAzureCredential()` if production environment.
 */
export function getAzureCredential() {
  // Identify which runtime environment the application is currently running in
  const environment = process.env.ENVIRONMENT ?? "unknown"; // Read runtime environment variable, fallback to "unknown" for safety

  // Log environment value to help debugging and operational traceability
  console.info(`🌍 Current environment: ${environment}`);

  // If running locally (developer machine), use Service Principal credentials
  if (environment === "local") {
    // Log which authentication strategy is being used
    console.info("🔑 Using Service Principal authentication...");

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

    // Create and return a ClientSecretCredential using Service Principal inputs
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  // If not local, assume Azure-hosted environment and use Managed Identity-based authentication
  console.info("🔑 Using Managed Identity authentication...");

  // Create and return DefaultAzureCredential, which will resolve Managed Identity in Azure App Service
  return new DefaultAzureCredential();
}
