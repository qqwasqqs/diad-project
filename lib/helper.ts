/*
  Project Name : Teva Data Integrity 
  Business Owner, Team : Keerthi Pusuloori
  Script Author, Team : Radhe Raman Tiwari
  Date: 10 November 2025 
  Purpose of the script: 
    This script contains helper functions used for manipulating and formatting route parameters,
    dataset names, and dates, as well as for converting strings into specific formats (e.g., title case).
    - The functions help in standardizing how parameters are passed in the URL and displayed in the user interface.
    - These helper functions are used throughout the Teva Data Integrity Automation Dashboard to format and display data.
*/

//---------------------- Imports -------------------------//

// No imports needed in this helper file. All functions are written in pure TypeScript.

//---------------------- Helper Functions -------------------------//

/**
 * `formatRouteParam` Function
 * 
 * This function formats a route parameter value by decoding it, replacing hyphens and underscores with spaces,
 * and converting the first letter of each word to uppercase. It's useful for human-readable route parameters.
 * 
 * Sample Input:
 *   "teva_data-quality-dashboard"
 * 
 * Sample Output:
 *   "Teva Data Quality Dashboard"
 * 
 * @param value - The route parameter value to format (string).
 * @returns The formatted string with proper spacing and capitalization.
 */
export const formatRouteParam = (value: string): string =>
  decodeURIComponent(value)                     // Decode the URL-encoded value
    .replace(/-/g, " ")                         // Replace hyphens with spaces
    .replace(/_/g, " ")                         // Replace underscores with spaces
    .replace(/\b\w/g, (l) => l.toUpperCase());   // Capitalize the first letter of each word

/**
 * `decodeRouteParam` Function
 * 
 * This function decodes a URL-encoded route parameter value. This is typically used for decoding values 
 * that are passed through the URL, such as a dataset name or business unit.
 * 
 * Sample Input:
 *   "teva%20data-quality-dashboard"
 * 
 * Sample Output:
 *   "teva data-quality-dashboard"
 * 
 * @param value - The URL-encoded route parameter value to decode (string).
 * @returns The decoded string.
 */
export const decodeRouteParam = (value: string): string =>
  decodeURIComponent(value); // Decode the URL-encoded value

/**
 * `prepareRouteParam` Function
 * 
 * This function prepares a route parameter by converting the string to lowercase and replacing spaces with underscores. 
 * It is commonly used for preparing route parameters that are passed in URLs in a standardized way.
 * 
 * Sample Input:
 *   "Teva Data Quality Dashboard"
 * 
 * Sample Output:
 *   "teva_data_quality_dashboard"
 * 
 * @param value - The route parameter value to prepare (string).
 * @returns The formatted string with spaces replaced by underscores and converted to lowercase.
 */
export const prepareRouteParam = (value: string): string =>
  value.toLocaleLowerCase()           // Convert to lowercase
    .replace(" ", "_");                // Replace spaces with underscores

/**
 * `toTitleCase` Function
 * 
 * This function converts a string into title case, where the first letter of each word is capitalized. 
 * It is useful for displaying proper case titles in the UI.
 * 
 * Sample Input:
 *   "hello world"
 * 
 * Sample Output:
 *   "Hello World"
 * 
 * @param str - The string to convert to title case (string).
 * @returns The string in title case format.
 */
export const toTitleCase = (str: string): string => {
  if (!str) return str;  // If the string is empty or null, return it as is

  return str
    .toLowerCase()                        // First make everything lowercase
    .replace(/(^|\s)([a-z])/g, (_, separator, letter) => {
      return separator + letter.toUpperCase();  // Capitalize the first letter of each word
    });
}

/**
 * `parseFullyQualifiedDatasetName` Function
 * 
 * This function parses a fully qualified dataset name into its constituent parts: 
 * catalog name, schema name, and dataset name. It expects the dataset name in the format `catalog.schema.dataset`.
 * 
 * Sample Input:
 *   "my_catalog.my_schema.my_dataset"
 * 
 * Sample Output:
 *   { catalogName: "my_catalog", schemaName: "my_schema", datasetName: "my_dataset" }
 * 
 * @param fullDatasetName - The fully qualified dataset name in the format `catalog.schema.dataset` (string).
 * @returns An object containing the `catalogName`, `schemaName`, and `datasetName` or `null` if parsing fails.
 */
export const parseFullyQualifiedDatasetName = (
  fullDatasetName: string
): { catalogName: string; schemaName: string; datasetName: string } | null => {
  if (!fullDatasetName) return null;  // If the input is empty or null, return null

  const parts = fullDatasetName.split('.').map((p) => p.trim());  // Split by dots and trim spaces
  if (parts.length !== 3) return null;  // Ensure there are exactly 3 parts (catalog, schema, dataset)

  const [catalogName, schemaName, datasetName] = parts;  // Destructure the parts into catalog, schema, and dataset

  if (!catalogName || !schemaName || !datasetName) return null;  // If any part is missing, return null

  return { catalogName, schemaName, datasetName };  // Return an object with the parsed values
}

/**
 * `formatDateTime` Function
 * 
 * This function formats a timestamp (ISO 8601 string) into a human-readable date and time format.
 * It is useful for displaying timestamp data in a more user-friendly format.
 * 
 * Sample Input:
 *   "2025-11-10T12:34:56Z"
 * 
 * Sample Output:
 *   "11/10/2025, 12:34:56 PM" (Depends on locale)
 * 
 * @param timestamp - The timestamp in ISO 8601 format (string).
 * @returns A formatted date and time string.
 */
export const formatDateTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleString(); // Convert the timestamp to a human-readable string based on the user's locale
