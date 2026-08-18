/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025
  Purpose of the script:
    This file contains the setup for the Axios HTTP client used for making API requests.
    - The script configures request and response interceptors for logging, error handling, and adding custom headers.
    - It centralizes API request configuration, ensuring consistent headers, logging, and error handling across the application.
    - It also includes handling for token refresh on unauthorized responses (401 errors).
*/

// ---------------------------------------------------------------------
// IMPORTS
// ---------------------------------------------------------------------

/*
  axios
    - What it is: A popular HTTP client library for JavaScript/TypeScript
      used to make network requests (GET/POST/etc.) from the browser or Node.
    - Why used here: We create a single `axios` instance configured with
      headers and interceptors so all API calls in the app share consistent
      behavior (JSON headers, logging, error handling, correlation IDs).
*/
import axios, { AxiosInstance, AxiosResponse } from 'axios';

/* ----------------------------- CONFIGURE AXIOS CLIENT ----------------------------- */

/**
 * The axios instance used for making HTTPS requests.
 * It is configured with default headers and interceptors to handle requests and responses.
 */
const apiClient: AxiosInstance = axios.create({
  // Default headers applied to every outgoing request created by this client
  headers: {
    'Content-Type': 'application/json', // Tell the server we are sending JSON payloads
  },
});

/* ----------------------------- REQUEST INTERCEPTORS ----------------------------- */

/**
 * Interceptor to add custom headers, like correlation IDs, to the outgoing request.
 * It also logs the request details for debugging and traceability.
 */
apiClient.interceptors.request.use(
  (config: any) => {
    // Create a unique correlation id to trace this request across logs and services
    const correlationId = crypto.randomUUID(); // e.g., "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
    config.headers['X-Correlation-ID'] = correlationId; // Attach correlation id header

    // Debug log the outgoing request with method and URL so developers can trace activity
    console.debug(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`, {
      correlationId, // The unique id for traceability
      requestData: config.data, // The request payload/body
    });

    // Always return the modified config so the request proceeds
    return config;
  },
  (error: any) => {
    // Log any error that occurred while preparing the request
    console.error('[Axios Request Error]', error); // Helpful for debugging pre-flight failures
    return Promise.reject(error); // Pass the error to the caller
  }
);

/* ----------------------------- RESPONSE INTERCEPTORS ----------------------------- */

/**
 * Interceptor to handle responses.
 * Logs successful responses and processes errors, including potential 401 errors (unauthorized).
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses for observability: HTTP status and request URL
    console.info(`[Axios Response] Success ${response.status} ${response.config.url}`, {
      responseData: response.data, // The body returned from the server
    });
    return response; // Forward successful responses to the caller
  },
  async (error: any) => {
    // If the server returned 401 (Unauthorized), we might need to refresh auth or sign-out
    if (error.response?.status === 401) {
      // Placeholder: implement token refresh or sign-out flow here if desired
      // For example: attempt refresh token flow or call a signOut() helper
      // signOut();
    }

    // If the server return 403, we lead the user to the forbidden page since, user does not have access to view it.
    if (error.response?.status === 403) {
        window.location.href = "/forbidden"; // using window.location.href to reroute to /forbidden
        return Promise.reject(error); // return error.
    };

    // Log detailed error information centrally for debugging and monitoring
    console.error('[Axios Response Error]', {
      status: error.response?.status, // HTTP status code (if present)
      errorMessage: error.response?.data?.error || 'Unknown error', // Message from backend if available
      url: error.config?.url, // URL that failed
    });

    // Display a user-friendly message on the screen using a toast notification
    // If the server provided a specific error message, use it;
    // otherwise, show a general fallback message.
    // Example:
    // - If the server says: "Databricks connection/session initialization failed!", that message is shown
    // - If no message comes from the server, the user sees: "Something went wrong!"
    notifyError(error.response?.data?.error || "Something went wrong!");

    // Reject the error back to the place where this code was called
    // This allows other parts of the app to handle the error using try/catch or .catch
    return Promise.reject(error);
  }
);

// Define a function that shows an error message to the user
// The "message" parameter is the text that will be shown on the screen
// Example values for "message":
// - "Databricks connection/session initialization failed!"
// - "Query execution failed: Unknown error"
function notifyError(message: string) {

  // Check if this code is running in a browser
  // If not (for example, running on a server), stop here to avoid errors
  if (typeof window === 'undefined') return;

  // Create a custom event that will carry the error message
  // This event can be listened to by other parts of the app
  const event = new CustomEvent('app-notification', {

    // Attach the error message as extra information
    // This is what the notification system will read and display
    detail: { message },
  });

  // Send (broadcast) the event to the browser window
  // Any listener waiting for "app-notification" will receive it
  window.dispatchEvent(event);
}

/* ----------------------------- EXPORT AXIOS CLIENT ----------------------------- */
export default apiClient;
