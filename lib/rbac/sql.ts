/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 20 May 2026
  Purpose of the script:
    This file contains SQL value escaping and formatting helpers used throughout the Teva dashboard backend.
    - The script provides safe SQL string literal construction that prevents SQL injection by escaping single quotes (O'Brien becomes 'O''Brien').
    - It handles nullable/optional values, converting undefined or null to SQL NULL literals instead of breaking queries.
    - It formats JavaScript Date objects into ISO timestamp strings for SQL insertion, ensuring consistent UTC timezone representation.
    - These helpers are used across RBAC authorization queries, audit logging, and data-scoping SQL generation to ensure all user-provided values are safely quoted before entering SQL text.
    - They are called by policy resolution, scope building, and management permission checking functions to construct parameterized-style SQL strings.
    - Suitable for pharmaceutical/regulated environments where SQL injection prevention and proper NULL handling are critical for data integrity and security audits.
*/

// Converts a normal string into a safe SQL string literal.
// - Wraps the value in single quotes
// - Escapes backslashes ( \ → \\ ) to prevent breaking string boundaries
// - Escapes single quotes ( ' → '' ) to avoid SQL syntax errors
// Example:
//   O'Brien                → 'O''Brien'
//   path\to\folder         → 'path\\to\\folder'
export function sqlString(value: string): string {
  // Wrap the value in single quotes and double any internal single quote characters.
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}


// Converts an optional string into either a SQL string or SQL NULL.
// Example: "US" becomes 'US', while undefined becomes NULL.
export function sqlNullableString(value?: string | null): string {
  // Use sqlString for real values; use NULL when the value is missing.
  return value ? sqlString(value) : "NULL";
}

// Converts a JavaScript Date into a SQL-safe timestamp string.
// Example: new Date("2026-01-01") becomes '2026-01-01T00:00:00.000Z'.
export function sqlTimestamp(value: Date): string {
  // Convert the date to ISO text, then quote it safely for SQL.
  return sqlString(value.toISOString());
}
