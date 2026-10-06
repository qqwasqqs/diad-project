/*
  Technical Teams main-view endpoint.

  This route is the single seam between the dashboard and its data source. The
  page, its hook, and its service all speak `TechTeamDashboardPayload`, so
  moving from local mock data to Splunk (or any approved API) means replacing
  `loadFromSource` below and changing nothing else.

  In local design mode the payload is built from the static mock so the page can
  be developed without external systems. Outside local design mode the real
  source is required: the route fails loudly rather than serving illustrative
  numbers that would be indistinguishable from measured ones.
*/

import { promises as fs } from "fs";
import https from "https";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

import { getSecret } from "@/lib/azure/keyvault";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";
import {
  formatAmount,
  formatRow,
  readFilters,
  scopeFactor,
  sliceSeries,
  type MockAmount,
  type MockMetricRow,
} from "@/lib/dashboard/mockSource";
import type {
  ContextRow,
  DashboardFilters,
  DrawerContent,
  Series,
} from "@/types/dashboard";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "tech-team-dashboard.json",
);

/*
  A drawer's provenance rows quote the same metrics the main view shows, so they
  carry amounts here too rather than finished strings. A drawer that printed the
  mock's portfolio-wide string while a narrower scope was selected would
  contradict the panel behind it — and its own filter row.
*/
type MockContextRow = Omit<ContextRow, "latest"> & MockAmount;

interface MockDrawerContent extends Omit<DrawerContent, "contextRows"> {
  contextRows: MockContextRow[];
}

type MockDrawers = Record<keyof TechTeamDashboardPayload["drawers"], MockDrawerContent>;

/*
  Shape of the mock file: numeric amounts and a full 90-day range, because the
  mock is a source to be filtered and formatted rather than a ready-made
  response. Mapping it onto the public contract is this route's job, exactly as
  mapping a Splunk report would be.
*/
interface MockPayload
  extends Omit<
    TechTeamDashboardPayload,
    | "requestPathHealth"
    | "capacityAndEfficiency"
    | "aiModelQuality"
    | "evaluatorReadiness"
    | "drawers"
  > {
  drawers: MockDrawers;
  requestPathHealth: {
    latencySeries: Series[];
    diagnostics: MockMetricRow[];
  };
  capacityAndEfficiency: MockMetricRow[];
  aiModelQuality: {
    series: Series[];
    supporting: (MockMetricRow & { label: string })[];
  };
  evaluatorReadiness: MockMetricRow[];
}

/*
  Applies the selected scope to the mock.

  Deliberately more permissive than a real source may be: every metric here
  responds to every filter, because the mock exists to exercise the UI. See
  `attributionRule` in lib/dashboard/mockSource for what the real source must do
  instead, and the note on `loadFromSource` below.
*/
/*
  Resolves a drawer's provenance rows for the selected scope.

  `latest` is built from the same helper the main-view rows use, so a metric
  shown in both places reads the same in both. A row with no amount keeps its
  coverage state and simply has no latest value.
*/
function scopeDrawer(drawer: MockDrawerContent, factor: number): DrawerContent {
  return {
    ...drawer,
    contextRows: drawer.contextRows.map(
      ({ amount, unit, prefix, decimals, max, ...row }): ContextRow => ({
        ...row,
        latest: formatAmount({ amount, unit, prefix, decimals, max }, factor),
      }),
    ),
  };
}

function applyFilters(
  mock: MockPayload,
  filters: DashboardFilters,
): TechTeamDashboardPayload {
  const factor = scopeFactor(filters);

  return {
    ...mock,
    requestPathHealth: {
      latencySeries: sliceSeries(mock.requestPathHealth.latencySeries, filters),
      diagnostics: mock.requestPathHealth.diagnostics.map((row) =>
        formatRow(row, factor),
      ),
    },
    failureLocalization: {
      ...mock.failureLocalization,
      items: mock.failureLocalization.items.map((item) => ({
        ...item,
        value: Number((item.value * factor).toFixed(2)),
      })),
    },
    capacityAndEfficiency: mock.capacityAndEfficiency.map((row) =>
      formatRow(row, factor),
    ),
    aiModelQuality: {
      // Quality scores are bounded by their scale, so they shift rather than scale.
      series: sliceSeries(mock.aiModelQuality.series, filters, 5),
      supporting: mock.aiModelQuality.supporting.map((row) => ({
        id: row.id,
        label: row.label,
        value: formatRow(row, factor).value ?? "",
      })),
    },
    evaluatorReadiness: mock.evaluatorReadiness.map((row) =>
      formatRow(row, factor),
    ),

    /*
      Drawer prose — provenance, decisions, notes — passes through unscoped, but
      the numbers inside it do not. The drawers carry their own filter row, so a
      selection made there has to move the values the drawer is showing.
    */
    drawers: {
      latencyChart: scopeDrawer(mock.drawers.latencyChart, factor),
      diagnostics: scopeDrawer(mock.drawers.diagnostics, factor),
      failureLocalization: scopeDrawer(mock.drawers.failureLocalization, factor),
      capacityAndEfficiency: scopeDrawer(
        mock.drawers.capacityAndEfficiency,
        factor,
      ),
      aiModelQuality: scopeDrawer(mock.drawers.aiModelQuality, factor),
      evaluatorReadiness: scopeDrawer(mock.drawers.evaluatorReadiness, factor),
    },
  };
}

async function loadMockPayload(
  filters: DashboardFilters,
): Promise<TechTeamDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return applyFilters(JSON.parse(file) as MockPayload, filters);
}

/* ----------------------------------------------- direct Splunk access --- */

/*
  Reads the saved search straight from Splunk's REST API, rather than through
  the Splunk Azure Function that lib/services/splunkReportService calls.

  This works only from inside the Teva network, by design: the management port
  8089 on `ilsplunapp03t.il.teva.corp` is reachable over corporate DNS and
  routing, so whatever runs this has to be on-network — a developer machine on
  VPN, or a deployment with VNet integration and corporate DNS. Off-network the
  hostname does not resolve and the request fails before TLS or auth, with
  ENOTFOUND rather than a Splunk status.
*/

interface SplunkDirectConfiguration {
  /** Splunk REST root, including `/servicesNS`. */
  baseUrl: string;

  /** Splunk authentication token — not an Azure Function key. */
  token: string;
}

let cachedSplunkDirectBaseUrl: string | null = null;
let cachedSplunkDirectToken: string | null = null;

/*
  The same split the rest of the app uses: .env on a developer machine, Key
  Vault everywhere else, so a deployed image never carries the Splunk token.
  Both values are cached for the lifetime of the process because neither
  changes while it runs.

  The values are never logged. A static Splunk token grants everything its
  owner can do for as long as it is valid, so a log line is as good as a leak.
*/
async function loadSplunkDirectConfiguration(): Promise<SplunkDirectConfiguration> {
  if (cachedSplunkDirectBaseUrl && cachedSplunkDirectToken) {
    return {
      baseUrl: cachedSplunkDirectBaseUrl,
      token: cachedSplunkDirectToken,
    };
  }

  const isLocal = (process.env.ENVIRONMENT ?? "unknown") === "local";

  const baseUrl = isLocal
    ? process.env.SPLUNK_SERVICE_BASE_URL2?.trim()
    : await getSecret("kv-data-integrity-splunk-rest-base-url");

  const token = isLocal
    ? process.env.SPLUNK_BEARER_TOKEN?.trim()
    : await getSecret("kv-data-integrity-splunk-bearer-token");

  const missing = [
    !baseUrl && "base URL",
    !token && "authentication token",
  ].filter(Boolean);

  if (!baseUrl || !token) {
    throw new Error(
      `Missing Splunk ${missing.join(" and ")}. ` +
        (isLocal
          ? "Set SPLUNK_SERVICE_BASE_URL2 and SPLUNK_BEARER_TOKEN in .env."
          : "Check kv-data-integrity-splunk-rest-base-url and " +
            "kv-data-integrity-splunk-bearer-token in Key Vault."),
    );
  }

  cachedSplunkDirectBaseUrl = baseUrl.replace(/\/+$/, "");
  cachedSplunkDirectToken = token;

  return { baseUrl: cachedSplunkDirectBaseUrl, token: cachedSplunkDirectToken };
}

/*
  Splunk's management port serves a certificate from an internal CA that Node
  does not ship, so verification is switched off for this agent alone — not
  globally, which would weaken every other outbound call the app makes.

  The better fix is to trust the CA instead: point NODE_EXTRA_CA_CERTS at the
  Teva root bundle and drop this flag. Until that bundle is available on every
  host that runs the app, the connection fails closed without it.
*/
const splunkDirectAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

/*
  `search/jobs/export` streams newline-delimited JSON — one object per line,
  each wrapping a row under `result` — so the body is not a JSON document and
  axios is told not to parse it. Lines are parsed individually and the rows
  unwrapped; a trailing partial line, which a truncated stream leaves behind,
  is skipped rather than failing the whole response.
*/
function parseExportStream(body: string): unknown[] {
  const rows: unknown[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: { result?: unknown; preview?: boolean };
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }

    // Preview rows are partial results from a search that is still running.
    if (parsed.preview) continue;
    if (parsed.result !== undefined) rows.push(parsed.result);
  }

  return rows;
}

async function getReport(savedSearchName: string): Promise<unknown[]> {
  const { baseUrl, token } = await loadSplunkDirectConfiguration();

  try {
    /*
      `/-/Observability` is the namespace the token is scoped to: any owner, the
      Observability app. The saved search has to live in that app for
      `| savedsearch` to resolve it.
    */
    const { data } = await axios.get<string>(
      `${baseUrl}/-/Observability/search/jobs/export`,
      {
        httpsAgent: splunkDirectAgent,
        headers: { Authorization: `Bearer ${token}` },
        params: {
          output_mode: "json",
          search: `| savedsearch ${savedSearchName}`,
        },
        responseType: "text",
        transformResponse: [(body: string) => body],
        timeout: 120_000,

        /*
          Corporate hosts set HTTPS_PROXY, and axios honours it for every
          request. Splunk is internal, so proxying the call sends it to a gateway
          with no route to it — a timeout or a 403 from the proxy, neither of
          which looks like a Splunk problem. Internal traffic goes direct.
        */
        proxy: false,
      },
    );

    const rows = parseExportStream(data ?? "");

    if (rows.length === 0) {
      throw new Error(`Splunk saved search "${savedSearchName}" returned no rows.`);
    }

    return rows;
  } catch (error) {
    /*
      Splunk puts the useful part of a rejection in the response body, and axios
      hides it behind a generic "Request failed with status code 401", so it is
      surfaced here. Without it, a namespace or capability problem is
      indistinguishable from a bad token.
    */
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const body =
        typeof error.response?.data === "string"
          ? error.response.data.slice(0, 500)
          : JSON.stringify(error.response?.data ?? {}).slice(0, 500);

      console.error("Error in getReport:", status ?? error.code, body);

      if (status) {
        throw new Error(`Splunk responded ${status}: ${body}`);
      }

      /*
        A DNS failure is the one error with a single likely cause worth naming:
        the host is internal, so it means this is running off the Teva network.
        Everything else stays generic rather than guessing.
      */
      const offNetwork = error.code === "ENOTFOUND" || error.code === "EAI_AGAIN";

      throw new Error(
        `Splunk was not reachable (${error.code ?? "unknown"}): ${error.message}.` +
          (offNetwork
            ? " The host resolves on Teva's network only — check VPN or VNet DNS."
            : ""),
      );
    }

    console.error("Error in getReport:", error);
    throw error;
  }
}

/*
  Replace this with the approved source call.

  The implementation must return `TechTeamDashboardPayload` with the selected
  filters already applied, per metric, following the attribution rule documented
  in lib/dashboard/mockSource: filter where attribution is approved, and return
  `pendingState: "filter-breakdown"` where it is not.

  Do not copy the mock's behaviour of scoping everything unconditionally. It is
  a UI fixture, not a model of what the source is allowed to claim.

  Suggested shape once the contract exists:

    const report = await splunkReportService.getTechTeamMainView(filters);
    return mapSplunkReportToPayload(report);
*/
async function loadFromSource(
  filters: DashboardFilters,
): Promise<TechTeamDashboardPayload> {
  void filters;

  throw new Error(
    "Technical Teams main-view source is not configured. Supply the approved " +
      "Splunk/API contract in loadFromSource, or run with local design mode enabled.",
  );
}

export async function GET(request: NextRequest) {
  const filters = readFilters(request);

  try {
    /*
      The Splunk read comes first on purpose. `loadFromSource` below is still a
      stub that throws outside local design mode, so running it first would fail
      the request before the call this wiring exists to exercise ever happened.
      This way the rows reach the log either way.
    */
    const splunkData = await getReport("react_log");
    console.log("Splunk response:", splunkData);

    const payload = isLocalDesignModeServer()
      ? await loadMockPayload(filters)
      : await loadFromSource(filters);

    /*
      This changes the response shape: the Technical Teams drawers read this
      endpoint through techTeamDashboardService, which expects a
      `TechTeamDashboardPayload` at the top level, so they have nothing to read
      while the Splunk half rides along. Restore `NextResponse.json(payload)`
      once the rows are mapped in `loadFromSource` and `getReport` has no caller.
    */
    return NextResponse.json({ requestPayload: payload, splunkData });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading main view.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
