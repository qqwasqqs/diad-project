/*
  Validation helpers shared by the per-dashboard endpoint adapters.

  An adapter is the boundary where an unverified wire value becomes a value the
  page is allowed to render. These helpers make that boundary explicit: a value
  that is not the shape the contract promises throws here rather than reaching a
  component as `undefined` or `NaN`.

  Pure. No network calls, no React dependencies.
*/

export function assertRecord(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected an object`);
  }

  return value as Record<string, unknown>;
}

export function assertFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}: expected a finite number`);
  }

  return value;
}

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid ${field}: expected a non-empty string`);
  }

  return value;
}

/*
  Rejects an identifier the dashboard did not ask for.

  A switch over a union of approved metric IDs is exhaustive at compile time,
  but the wire can still carry an unknown one. Calling this in the default case
  turns that into a clear failure instead of a silently undefined model.
*/
export function unsupportedMetric(metricId: string, dashboard: string): never {
  throw new Error(`Unsupported ${dashboard} metric in response: ${metricId}`);
}

/*
  Validates a value the contract lists but the current source may not send.

  Used for the supporting counts behind a rate or an average — the numerator,
  denominator, or window a metric was derived from. They are in the data
  contract and belong in the model, but the local fixture has no approved
  values for them and the approved main view does not show them yet. Absent is
  therefore allowed; present but malformed is not.
*/
export function assertOptionalFiniteNumber(
  value: unknown,
  field: string,
): number | undefined {
  return value === undefined || value === null
    ? undefined
    : assertFiniteNumber(value, field);
}
