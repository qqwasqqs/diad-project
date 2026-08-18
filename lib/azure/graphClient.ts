/*
  Project Name: Teva Data Integrity
  Business Owner: Keerthi Pusuloori
  Script Author: Radhe Raman Tiwari
  Date: 19 June 2026
  Purpose of the script:
    This script creates a connection (client) to Microsoft Graph API.

    What is Microsoft Graph?
      - Microsoft Graph is a service from Microsoft that lets you access data like:
          • Users
          • Groups
          • Emails
          • Calendars
          • Azure Active Directory (Entra ID)

    In simple terms:
      ➤ This code helps your application "talk to Microsoft systems securely".

    How it works:
      1. It gets secure login credentials (token) using Azure authentication.
      2. It creates a Graph client using that token.
      3. That client is then used to call Microsoft APIs.

  Example real-life analogy:
    - Think of Microsoft Graph as a **secure office building**.
    - The credential is your **ID card**.
    - The Graph client is the **entry pass that lets you access rooms (data)**.
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  @microsoft/microsoft-graph-client
    - What it is:
        Official Microsoft library used to connect and interact with Microsoft Graph APIs.

    - Why used:
        To perform operations like:
          • Fetch users from Azure AD
          • Get groups
          • Send emails
          • Access organizational data

    - Simple explanation:
        This is the "tool" that helps your app communicate with Microsoft services.
*/
import { Client } from "@microsoft/microsoft-graph-client";

/*
  ./credential
    - What it is:
        A local utility module that provides Azure authentication credentials
        through a single standardized function (getAzureCredential).

    - Why used:
        To centralize authentication logic and support multiple environments:
          - Local development: Service Principal authentication
          - Azure production: Managed Identity / DefaultAzureCredential

    - Simple explanation:
        This function gives us the "login key" needed to access Microsoft services.
*/
import { getAzureCredential } from "./credential";

// ---------------------------------------------------------------------
// FUNCTION: getGraphClient
// ---------------------------------------------------------------------

/**
 * Creates and returns a Microsoft Graph client with proper authentication.
 *
 * What this function does:
 *   - Gets Azure credentials (login identity)
 *   - Uses those credentials to request an access token
 *   - Creates a Graph client using that token
 *
 * Why this is important:
 *   Without this, your application cannot securely access Microsoft data.
 *
 * @returns {Client}
 *   A configured Microsoft Graph client ready to be used for API calls.
 *
 * Example usage:
 *   const client = getGraphClient();
 *   const users = await client.api('/users').get();
 *
 * Example output:
 *   Returns a client object that can:
 *     - Fetch users
 *     - Fetch groups
 *     - Perform Microsoft Graph operations
 */
export function getGraphClient() {

  // Step 1: Get Azure authentication credential
  // (This acts like getting your login ID card)
  const credential = getAzureCredential();

  // Step 2: Create and return a new Microsoft Graph client
  return Client.initWithMiddleware({

    // Middleware helps automatically attach authentication to every request
    authProvider: {
      
      /*
        This function is called automatically whenever Graph API needs a token.

        What is a token?
          - A temporary secure key used to prove identity.
          - Like a "session pass" to access Microsoft services.

        Example:
          Instead of logging in again and again,
          we generate a token that works for a short time.
      */
      getAccessToken: async () => {

        // Step 3: Request an access token using the credential
        const token = await credential.getToken(

          /*
            Scope: "https://graph.microsoft.com/.default"

            What this means:
              - It tells Azure:
                "Give me access to Microsoft Graph API 
                 with all permissions already granted to this app."

            Simple explanation:
              - It defines what resources we want to access.

            Example:
              Like saying:
              "I need access to Employee Directory system"
          */
          "https://graph.microsoft.com/.default"
        );

        /*
          Step 4: Return the token string

          token?.token:
            - Extracts the actual token value safely.
            - If token is null/undefined, return empty string.

          ?? "":
            - Default fallback value (avoids breaking the app).

          Simple explanation:
            - If login is successful → return token
            - If something goes wrong → return empty value
        */
        return token?.token ?? "";
      },
    },
  });
}