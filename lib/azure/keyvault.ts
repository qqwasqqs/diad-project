/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This script interacts with Azure Key Vault to retrieve secrets.
    - It initializes a client to interact with Azure Key Vault using the appropriate Azure credential (either Managed Identity or Service Principal).
    - It provides a function `getSecret` to fetch a secret by its name from Key Vault.
    - The script logs errors in case of failure to fetch secrets, and ensures necessary environment variables are set.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @azure/keyvault-secrets
    - What it is:
        Azure SDK package that provides clients and models to interact with
        Azure Key Vault Secrets.

    - Why used:
        To retrieve, set, update, and manage secrets stored in Azure Key Vault
        in a secure and centralized way.
*/
import { SecretClient } from "@azure/keyvault-secrets"; // Importing the SecretClient from the Azure SDK

/*
  ./credential
    - What it is:
        A local module that exposes helper functions for Azure authentication
        (e.g., getAzureCredential).

    - Why used:
        To centralize credential creation logic and switch authentication
        strategies depending on environment (local Service Principal vs Azure Managed Identity).
*/
import { getAzureCredential } from "./credential"; // Importing the function to fetch Azure credentials

// ---------------------- Key Vault Configuration -------------------------// // Section header to clearly separate Key Vault setup from other logic

// Read the Azure Key Vault URL from environment variables (e.g., https://<vault-name>.vault.azure.net)
const keyVaultUrl = process.env.KEY_VAULT_URL; // Holds the Key Vault endpoint needed to connect to the vault

// Validate that the Key Vault URL is available before attempting to create a client
if (!keyVaultUrl) {
  // If the environment variable is missing or empty
  throw new Error(
    "KEY_VAULT_URL environment variable is not set. Please set it in your environment configuration."
  ); // Fail fast with a descriptive configuration error
}

// Obtain an Azure credential object based on current environment (local SPN vs Azure Managed Identity)
const credential = getAzureCredential(); // Centralized authentication helper used across the app

// Create the Key Vault SecretClient instance for performing secret operations (get/set/list/delete)
const secretClient = new SecretClient(keyVaultUrl, credential); // Client will use the provided URL and credential to authenticate calls to Key Vault

// ---------------------- Utility Function: getSecret -------------------------//

/**
 * Fetches a secret from Azure Key Vault.
 *
 * This function interacts with the Azure Key Vault service to retrieve the value of a specific secret.
 * It handles both success and error scenarios by logging appropriate messages.
 * If the secret does not exist or has no value, an error is thrown.
 *
 * @param secretName - The name of the secret to fetch from Azure Key Vault.
 *
 * @returns {Promise<string>} - A promise that resolves to the secret value.
 * @throws {Error} - Throws an error if the secret cannot be retrieved or if no value is associated with it.
 *
 * Example input:
 *   - `secretName = 'mySecretKey'`
 *
 * Example output:
 *   - `'mySecretValue'` (The secret value stored in Azure Key Vault).
 */
export async function getSecret(secretName: string): Promise<string> {
  // Log which secret is being requested for debugging and traceability
  console.info(`Attempting to retrieve secret: ${secretName}`);

  // Use try/catch to handle Key Vault access failures gracefully
  try {
    // Call Azure Key Vault to fetch the secret object by its name
    const secretResponse = await secretClient.getSecret(secretName);

    // Validate that the returned secret actually contains a usable value
    if (!secretResponse.value) {
      // Log an error if the secret exists but has no value (unexpected scenario)
      console.error(`❌ The secret '${secretName}' has no value.`);

      // Throw an error to signal an invalid secret response to the caller
      throw new Error(`Secret ${secretName} has no value.`);
    }

    // Log success to indicate that secret retrieval worked as expected
    console.info(`✅ Successfully retrieved secret: ${secretName}`);

    // Return the extracted secret string value to the caller
    return secretResponse.value;
  } catch (error: any) {
    // Log the failure with the original error for troubleshooting
    console.error(`❌ Failed to retrieve secret '${secretName}':`, error);

    // Throw a new descriptive error message so higher-level code can handle/report it
    throw new Error(
      `Unable to fetch secret: ${secretName}. Error: ${error.message}`
    );
  }
}
