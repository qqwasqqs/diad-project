/*
  In-memory cache for the dashboard endpoint responses, keyed by user and
  request.

  A Splunk saved search takes seconds; a user moving between dashboards, or
  back to a scope they just viewed, asks for the same answer again. Each entry
  is scoped to one user, so a response can never be served to someone whose
  data scope differs, and to one endpoint and exact request (dashboard,
  sections or chart, metrics, filters), so a narrowed filter is its own entry.

  The entry holds the pending promise, not only the result: identical requests
  that arrive while the first is still running share its call instead of each
  starting one. A failed call is removed, so an error is never served from the
  cache.

  The cache lives in this process. Each server instance keeps its own, and a
  restart empties it.
*/

import { createHash } from "crypto";

export type DashboardEndpoint = "metrics" | "timeseries";

interface CacheEntry {
  expiresAt: number;
  value: Promise<unknown>;
}

// Five minutes: the probe reads a fixed 30-day window, so a newer answer within minutes adds nothing.
const DEFAULT_TTL_MS = 5 * 60 * 1000;

// Bounds memory. The least recently used entry is dropped first.
const MAX_ENTRIES = 500;

const entries = new Map<string, CacheEntry>();

// Reads the TTL from DASHBOARD_CACHE_TTL_MS. 0 disables the cache.
function ttlMs(): number {
  const configured = Number(process.env.DASHBOARD_CACHE_TTL_MS ?? DEFAULT_TTL_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_TTL_MS;
}

/*
  The request's JSON is the key. The parsers pass the body through unchanged,
  so this relies on each dashboard service building its requests the same way
  every time, which they do. The key is hashed to keep it short.
*/
function cacheKey(user: string, endpoint: DashboardEndpoint, request: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify([user.trim().toLowerCase(), endpoint, request]))
    .digest("hex");
}

function evictOverflow(): void {
  // Map iteration follows insertion order, and a hit re-inserts its entry, so the first key is the least recently used.
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) return;
    entries.delete(oldest);
  }
}

export function cachedDashboardResponse<T>(
  user: string,
  endpoint: DashboardEndpoint,
  request: unknown,
  load: () => Promise<T>,
): Promise<T> {
  const ttl = ttlMs();
  if (ttl === 0) {
    return load();
  }

  const key = cacheKey(user, endpoint, request);
  const now = Date.now();
  const hit = entries.get(key);

  if (hit && hit.expiresAt > now) {
    entries.delete(key);
    entries.set(key, hit);
    return hit.value as Promise<T>;
  }

  const value = load();
  entries.delete(key);
  entries.set(key, { expiresAt: now + ttl, value });
  evictOverflow();

  // Only the entry this call created is removed, never a newer one for the same key.
  value.catch(() => {
    if (entries.get(key)?.value === value) {
      entries.delete(key);
    }
  });

  return value;
}
