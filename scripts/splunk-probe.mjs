#!/usr/bin/env node
/*
  Splunk connectivity probe.

  Why this exists: the dashboard cannot map Splunk results onto metrics until we
  know what the saved search actually returns. This script calls the Splunk
  Azure Function directly and prints a field inventory of the response.

  It deliberately bypasses Next.js, Key Vault, RBAC, and local design mode, so
  it works on a machine where the app itself cannot start. The only things it
  needs are SPLUNK_SERVICE_BASE_URL and SPLUNK_FUNCTION_SECRET.

  Usage:
    node scripts/splunk-probe.mjs
    node scripts/splunk-probe.mjs --days 7
    node scripts/splunk-probe.mjs --query "| savedsearch some_other_search"
    node scripts/splunk-probe.mjs --out splunk-response.json

  Nothing is written anywhere unless --out is passed.
*/

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_QUERY = "| savedsearch consolidated_metric_final";
const DEFAULT_DAYS = 30;
const REQUEST_TIMEOUT_MS = 120_000;

/* ------------------------------------------------------------------ env --- */

/*
  Minimal .env reader. Next.js gives .env.local priority over .env, so the same
  precedence is used here to avoid probing with different values than the app.
*/
function loadEnvFile(file) {
  if (!existsSync(file)) return {};

  const out = {};
  for (const rawLine of readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip matching surrounding quotes, which .env files commonly carry.
    if (value.length >= 2 && /^(".*"|'.*')$/s.test(value)) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadConfig(root) {
  const merged = {
    ...loadEnvFile(path.join(root, ".env")),
    ...loadEnvFile(path.join(root, ".env.local")),
    ...process.env,
  };

  return {
    baseUrl: (merged.SPLUNK_SERVICE_BASE_URL ?? "").trim().replace(/\/+$/, ""),
    secret: (merged.SPLUNK_FUNCTION_SECRET ?? "").trim(),
  };
}

/* ----------------------------------------------------------------- args --- */

function parseArgs(argv) {
  const args = { query: DEFAULT_QUERY, days: DEFAULT_DAYS, out: null };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];

    if (flag === "--query" && value) {
      args.query = value;
      i += 1;
    } else if (flag === "--days" && value) {
      const days = Number(value);
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error(`--days must be a positive number, got "${value}"`);
      }
      args.days = days;
      i += 1;
    } else if (flag === "--out" && value) {
      args.out = value;
      i += 1;
    } else if (flag === "--help" || flag === "-h") {
      args.help = true;
    }
  }
  return args;
}

/* ------------------------------------------------------------ inventory --- */

/*
  The field inventory is the real output of this script. The existing Splunk
  schemas in types/api.ts show two different naming conventions and numbers
  delivered as strings, so the mapper has to be written against observed fields
  rather than assumed ones.
*/
function describeValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value !== "string") return typeof value;

  // Distinguish numeric strings, since this Splunk returns numbers as strings.
  if (value.trim() !== "" && Number.isFinite(Number(value))) return "string(numeric)";
  return "string";
}

function truncate(value, max = 60) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return "undefined";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function printInventory(body) {
  const rows = Array.isArray(body?.results)
    ? body.results
    : Array.isArray(body)
      ? body
      : null;

  if (!rows) {
    console.log("\n--- Response shape ---");
    console.log("No `results` array found. Top-level keys:");
    for (const key of Object.keys(body ?? {})) {
      console.log(`  ${key}: ${describeValue(body[key])}`);
    }
    return;
  }

  console.log(`\n--- Field inventory (${rows.length} row(s)) ---`);

  if (rows.length === 0) {
    console.log("The saved search returned zero rows. Try a wider --days range.");
    return;
  }

  // Union the keys: Splunk rows are not guaranteed to be uniform.
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row ?? {})))];
  const width = Math.max(...keys.map((k) => k.length));

  for (const key of keys) {
    const sample = rows.find((row) => row?.[key] !== undefined)?.[key];
    const presentIn = rows.filter((row) => row?.[key] !== undefined).length;
    const coverage = presentIn === rows.length ? "" : `  (in ${presentIn}/${rows.length} rows)`;

    console.log(
      `  ${key.padEnd(width)}  ${describeValue(sample).padEnd(15)} ${truncate(sample)}${coverage}`,
    );
  }

  if (rows.length > 1) {
    console.log(`\nFirst row in full:\n${JSON.stringify(rows[0], null, 2)}`);
  }
}

/* ----------------------------------------------------------------- main --- */

async function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        "Usage: node scripts/splunk-probe.mjs [options]",
        "",
        "  --query <spl>   Search to run (default: the dashboard's saved search)",
        "  --days <n>      Look-back window in days (default: 30)",
        "  --out <file>    Write the full JSON response to this file",
      ].join("\n"),
    );
    return 0;
  }

  const { baseUrl, secret } = loadConfig(root);

  console.log("--- Configuration ---");
  console.log(`  SPLUNK_SERVICE_BASE_URL  ${baseUrl || "(empty)"}`);
  console.log(`  SPLUNK_FUNCTION_SECRET   ${secret ? `set (${secret.length} chars)` : "(empty)"}`);

  const missing = [
    !baseUrl && "SPLUNK_SERVICE_BASE_URL",
    !secret && "SPLUNK_FUNCTION_SECRET",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(
      `\nMissing ${missing.join(" and ")}.\n` +
        "Set them in .env (or .env.local, or the shell) and run again.",
    );
    return 2;
  }

  const end = new Date();
  const start = new Date(end.getTime() - args.days * 24 * 60 * 60 * 1000);
  const url = `${baseUrl}/api/splunk/query?code=${encodeURIComponent(secret)}`;

  console.log("\n--- Request ---");
  console.log(`  POST ${baseUrl}/api/splunk/query?code=***`);
  console.log(`  SEARCH_QUERY  ${args.query}`);
  console.log(`  START_TIME    ${start.toISOString()}`);
  console.log(`  END_TIME      ${end.toISOString()}`);

  const startedAt = Date.now();
  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SEARCH_QUERY: args.query,
        START_TIME: start.toISOString(),
        END_TIME: end.toISOString(),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`\n--- Failed after ${Date.now() - startedAt}ms ---`);
    console.error(`  ${error.name}: ${error.message}`);
    console.error(
      error.name === "TimeoutError"
        ? "  The Function did not respond. The saved search may be slow; retry with a smaller --days."
        : "  The host was not reachable. Check VPN/network access to the Function App.",
    );
    return 1;
  }

  const elapsed = Date.now() - startedAt;
  const text = await response.text();

  console.log(`\n--- Response ---`);
  console.log(`  HTTP ${response.status} ${response.statusText} in ${elapsed}ms`);
  console.log(`  Content-Type: ${response.headers.get("content-type") ?? "(none)"}`);
  console.log(`  Body size: ${text.length} bytes`);

  if (!response.ok) {
    console.error(`\nRequest rejected. First 500 bytes of the body:\n${text.slice(0, 500)}`);
    if (response.status === 401) {
      console.error("\n401 usually means SPLUNK_FUNCTION_SECRET is wrong or expired.");
    }
    return 1;
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error(`\nResponse was not JSON. First 500 bytes:\n${text.slice(0, 500)}`);
    return 1;
  }

  printInventory(body);

  if (args.out) {
    const target = path.resolve(root, args.out);
    writeFileSync(target, JSON.stringify(body, null, 2));
    console.log(`\nFull response written to ${target}`);
  } else {
    console.log("\nRe-run with --out splunk-response.json to save the full response.");
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(`Unexpected failure: ${error.message}`);
    process.exit(1);
  });
