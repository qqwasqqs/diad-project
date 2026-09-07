/*
  Executive main-view endpoint.

  This route is the single seam between the dashboard and its data source. The
  page, its hook, and its service all speak `ExecutiveDashboardPayload`, so
  moving from local mock data to Splunk (or any approved API) means replacing
  `loadFromSource` below and changing nothing else.

  In local design mode the payload is built from the static mock so the page can
  be developed without external systems. Outside local design mode the real
  source is required: the route fails loudly rather than serving illustrative
  numbers that would be indistinguishable from measured ones.
*/

import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { isLocalDesignModeServer } from "@/lib/localDesignMode";
import {
  formatRow,
  readFilters,
  scopeFactor,
  shiftBounded,
  sliceSeries,
  type MockMetricRow,
} from "@/lib/dashboard/mockSource";
import type { DashboardFilters, MetricRow, Series } from "@/types/dashboard";
import type {
  ExecutiveCostItem,
  ExecutiveDashboardPayload,
  ExecutiveDrawers,
  ExecutivePulseCard,
} from "@/types/executiveDashboard";

const MOCK_PATH = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
  "executive-dashboard.json",
);

/*
  Shape of the mock file: numeric amounts and a full 90-day range, because the
  mock is a source to be filtered and formatted rather than a ready-made
  response. Mapping it onto the public contract is this route's job, exactly as
  mapping a Splunk report would be.
*/
interface MockPulseCard extends MockMetricRow {
  suffix?: string;
  split?: { positive: number; negative: number };
  // Parts of the second line, each formatted then joined.
  supportingParts?: { amount: number; decimals?: number; unit?: string }[];
}

interface MockPayload {
  pulse: MockPulseCard[];
  sessionAndQueryVolume: {
    series: Series[];
    supporting: { id: string; label: string; amount: number; decimals?: number }[];
  };
  costByBusinessUnit: {
    items: ExecutiveCostItem[];
    infrastructureCost: MetricRow;
  };
  safetyAndRisk: MockPulseCard[];
  drawers: ExecutiveDrawers;
}

function formatPulseCard(
  card: MockPulseCard,
  factor: number,
): ExecutivePulseCard {
  const base = formatRow(card, factor);

  const supporting = card.supportingParts
    ?.map(
      (part) =>
        `${(part.amount * factor).toFixed(part.decimals ?? 0)}${part.unit ?? ""}`,
    )
    .join(" • ");

  return {
    ...base,
    suffix: card.suffix,
    supporting,
    /*
      The split must agree with the value printed beside it, so it is derived
      from the same scaled number rather than scaled independently. Computing it
      separately let the bar read 99/1 while the value read 86%.
    */
    split: card.split
      ? (() => {
          const positive =
            card.amount !== undefined && card.max !== undefined
              ? Math.round(shiftBounded(card.amount, card.max, factor))
              : card.split.positive;

          const bounded = Math.min(99, Math.max(1, positive));
          return { positive: bounded, negative: 100 - bounded };
        })()
      : undefined,
  };
}

/*
  Applies the selected scope to the mock.

  Deliberately more permissive than a real source may be: every metric here
  responds to every filter, because the mock exists to exercise the UI. See
  `attributionRule` in lib/dashboard/mockSource for what the real source must do
  instead, and the note on `loadFromSource` below.
*/
function applyFilters(
  mock: MockPayload,
  filters: DashboardFilters,
): ExecutiveDashboardPayload {
  const factor = scopeFactor(filters);

  return {
    pulse: mock.pulse.map((card) => formatPulseCard(card, factor)),

    sessionAndQueryVolume: {
      series: sliceSeries(mock.sessionAndQueryVolume.series, filters),
      supporting: mock.sessionAndQueryVolume.supporting.map((stat) => ({
        id: stat.id,
        label: stat.label,
        value: (stat.amount * factor).toFixed(stat.decimals ?? 0),
      })),
    },

    costByBusinessUnit: {
      /*
        The project cost is scaled with its business-unit total so it stays a
        subset of it. A project must never exceed the unit it belongs to.
      */
      items: mock.costByBusinessUnit.items.map((item) => ({
        ...item,
        totalCost: Number((item.totalCost * factor).toFixed(2)),
        topProjectCost: Number((item.topProjectCost * factor).toFixed(2)),
      })),
      // Stays pending under every scope; it has no approved source to filter.
      infrastructureCost: mock.costByBusinessUnit.infrastructureCost,
    },

    safetyAndRisk: mock.safetyAndRisk.map((card) =>
      formatPulseCard(card, factor),
    ),

    /*
      Drawer content is provenance and readiness text, not measurements, so it
      passes through unscoped. The pending states it carries stay pending under
      every selection.
    */
    drawers: mock.drawers,
  };
}

async function loadMockPayload(
  filters: DashboardFilters,
): Promise<ExecutiveDashboardPayload> {
  const file = await fs.readFile(MOCK_PATH, "utf-8");
  return applyFilters(JSON.parse(file) as MockPayload, filters);
}

/*
  Replace this with the approved source call.

  The implementation must return `ExecutiveDashboardPayload` with the selected
  filters already applied, per metric, following the attribution rule documented
  in lib/dashboard/mockSource: filter where attribution is approved, and return
  `pendingState: "filter-breakdown"` where it is not.

  Do not copy the mock's behaviour of scoping everything unconditionally. It is
  a UI fixture, not a model of what the source is allowed to claim.
*/
async function loadFromSource(
  filters: DashboardFilters,
): Promise<ExecutiveDashboardPayload> {
  void filters;

  throw new Error(
    "Executive main-view source is not configured. Supply the approved " +
      "Splunk/API contract in loadFromSource, or run with local design mode enabled.",
  );
}

export async function GET(request: NextRequest) {
  const filters = readFilters(request);

  try {
    const payload = isLocalDesignModeServer()
      ? await loadMockPayload(filters)
      : await loadFromSource(filters);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading main view.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
