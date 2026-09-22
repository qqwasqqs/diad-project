/*
  Product Owner main-view endpoint.

  This route is the data-source seam for the dashboard. Local design mode reads
  deterministic JSON fixtures; a future Splunk integration only replaces
  `loadFromSource` and maps its result to `ProductOwnerDashboardPayload`.

  Channel is intentionally not accepted as a Product Owner filter. The current
  Product Owner contract scopes results by period, business unit, and project.
*/

import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import {
  formatRow,
  periodDays,
  readFilters,
  scopeFactor,
  shiftBounded,
  type MockMetricRow,
} from "@/lib/dashboard/mockSource";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";
import type { ProductOwnerAdoptionAndEngagementData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerAdoptionAndEngagementDrawer";
import type { ProductOwnerChannelMixData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerChannelMixDrawer";
import type { ProductOwnerExperienceQualityData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerExperienceQualityDrawer";
import type { ProductExperiencePulseData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer";
import type { ProductOwnerTrustEvidenceData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerTrustEvidenceDrawer";
import type { DashboardFilters, Series } from "@/types/dashboard";
import type {
  ProductOwnerApiErrorRateValue,
  ProductOwnerDashboardPayload,
  ProductOwnerFeedbackSummaryData,
  ProductOwnerSupportingStat,
} from "@/types/productOwnerDashboard";

const MOCK_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "mocks",
  "new-pages",
);

const MOCK_FILES = {
  main: "product-owner-dashboard.json",
  adoptionAndEngagement: "product-owner-adoption-and-engagement.json",
  channelMix: "product-owner-channel-mix.json",
  productExperiencePulse: "product-owner-product-experience-pulse.json",
  experienceAndResponseQuality: "product-owner-experience-quality.json",
  trustAndMeasurementReadiness: "product-owner-trust-evidence.json",
} as const;

type ProductOwnerDashboardFilters = Omit<DashboardFilters, "channel">;

interface MockSupportingStat extends MockMetricRow {
  label: string;
}

interface MockMainPayload {
  generatedAt: string;
  note: string;
  feedbackSummary: ProductOwnerFeedbackSummaryData;
  productExperiencePulse: {
    sessionQueryVolume: {
      queries: number;
      sessions: number;
      queriesPerSession: number;
    };
    endToEndLatency: {
      percentile: string;
      seconds: number;
    };
    workflowCompletion: MockMetricRow & { reason: string };
  };
  adoptionAndEngagement: {
    series: Series[];
    supporting: MockSupportingStat[];
  };
  experienceAndResponseQuality: {
    series: Series[];
    supporting: MockSupportingStat[];
  };
  featureUsageEvidence: ProductOwnerDashboardPayload["featureUsageEvidence"];
  trustAndMeasurementReadiness: MockMetricRow[];
}

interface MockDrawers {
  adoptionAndEngagement: ProductOwnerAdoptionAndEngagementData;
  channelMix: ProductOwnerChannelMixData;
  productExperiencePulse: ProductExperiencePulseData;
  experienceAndResponseQuality: ProductOwnerExperienceQualityData;
  trustAndMeasurementReadiness: ProductOwnerTrustEvidenceData;
}

function scaleSeries<T extends Series>(
  series: T[],
  filters: ProductOwnerDashboardFilters,
  max?: number,
): T[] {
  const days = periodDays(filters);
  const factor = scopeFactor(filters);

  return series.map((item) => ({
    ...item,
    points: item.points.slice(-days).map((point) => {
      const scaled =
        max === undefined
          ? point.y * factor
          : shiftBounded(point.y, max, factor);

      return { ...point, y: Number(scaled.toFixed(2)) };
    }),
  }));
}

function formatSupporting(
  rows: MockSupportingStat[],
  factor: number,
): ProductOwnerSupportingStat[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    // The same factor is applied to query and session counts, so their ratio
    // remains stable. Scaling it independently would contradict those counts.
    value: formatRow(row, row.id === "queries-per-session" ? 1 : factor).value ?? "",
  }));
}

function scaleApiErrorRate(
  value: ProductOwnerApiErrorRateValue,
  factor: number,
): ProductOwnerApiErrorRateValue {
  return {
    errorRatePercent: value.errorRatePercent,
    errorRequestCount: Math.round(value.errorRequestCount * factor),
    eligibleRequestCount: Math.round(value.eligibleRequestCount * factor),
  };
}

function applyFilters(
  mock: MockMainPayload,
  drawers: MockDrawers,
  filters: ProductOwnerDashboardFilters,
): ProductOwnerDashboardPayload {
  const factor = scopeFactor(filters);
  const apiErrorRate = scaleApiErrorRate(
    drawers.productExperiencePulse.apiErrorRate,
    factor,
  );

  return {
    // Feedback values and application coverage are already supplied as one
    // aggregate. Do not calculate them from the other mock metrics.
    feedbackSummary: mock.feedbackSummary,
    productExperiencePulse: {
      sessionQueryVolume: {
        queries: Math.round(
          mock.productExperiencePulse.sessionQueryVolume.queries * factor,
        ),
        sessions: Math.round(
          mock.productExperiencePulse.sessionQueryVolume.sessions * factor,
        ),
        queriesPerSession:
          mock.productExperiencePulse.sessionQueryVolume.queriesPerSession,
      },
      apiErrorRate,
      endToEndLatency: {
        ...mock.productExperiencePulse.endToEndLatency,
        seconds: Number(
          (mock.productExperiencePulse.endToEndLatency.seconds * factor).toFixed(
            2,
          ),
        ),
      },
      workflowCompletion: {
        ...formatRow(mock.productExperiencePulse.workflowCompletion, factor),
        reason: mock.productExperiencePulse.workflowCompletion.reason,
      },
    },
    adoptionAndEngagement: {
      series: scaleSeries(mock.adoptionAndEngagement.series, filters),
      supporting: formatSupporting(
        mock.adoptionAndEngagement.supporting,
        factor,
      ),
    },
    experienceAndResponseQuality: {
      series: scaleSeries(
        mock.experienceAndResponseQuality.series,
        filters,
        5,
      ),
      supporting: formatSupporting(
        mock.experienceAndResponseQuality.supporting,
        factor,
      ),
    },
    featureUsageEvidence: mock.featureUsageEvidence,
    trustAndMeasurementReadiness:
      mock.trustAndMeasurementReadiness.map((row) => formatRow(row, factor)),
    drawers: {
      adoptionAndEngagement: drawers.adoptionAndEngagement,
      channelMix: drawers.channelMix,
      productExperiencePulse: {
        ...drawers.productExperiencePulse,
        engagementSeries: scaleSeries(
          drawers.productExperiencePulse.engagementSeries,
          filters,
        ),
        responsivenessSeries: scaleSeries(
          drawers.productExperiencePulse.responsivenessSeries,
          filters,
        ),
        apiErrorRate,
      },
      experienceAndResponseQuality: drawers.experienceAndResponseQuality,
      trustAndMeasurementReadiness: drawers.trustAndMeasurementReadiness,
    },
  };
}

async function readJson<T>(fileName: string): Promise<T> {
  const file = await fs.readFile(path.join(MOCK_DIRECTORY, fileName), "utf-8");
  return JSON.parse(file) as T;
}

async function loadMockPayload(
  filters: ProductOwnerDashboardFilters,
): Promise<ProductOwnerDashboardPayload> {
  const [main, adoption, channelMix, pulse, quality, trust] = await Promise.all([
    readJson<MockMainPayload>(MOCK_FILES.main),
    readJson<ProductOwnerAdoptionAndEngagementData>(
      MOCK_FILES.adoptionAndEngagement,
    ),
    readJson<ProductOwnerChannelMixData>(MOCK_FILES.channelMix),
    readJson<ProductExperiencePulseData>(MOCK_FILES.productExperiencePulse),
    readJson<ProductOwnerExperienceQualityData>(
      MOCK_FILES.experienceAndResponseQuality,
    ),
    readJson<ProductOwnerTrustEvidenceData>(
      MOCK_FILES.trustAndMeasurementReadiness,
    ),
  ]);

  return applyFilters(
    main,
    {
      adoptionAndEngagement: adoption,
      channelMix,
      productExperiencePulse: pulse,
      experienceAndResponseQuality: quality,
      trustAndMeasurementReadiness: trust,
    },
    filters,
  );
}

async function loadFromSource(
  filters: ProductOwnerDashboardFilters,
): Promise<ProductOwnerDashboardPayload> {
  void filters;

  throw new Error(
    "Product Owner main-view source is not configured. Supply the approved " +
      "Splunk/API contract in loadFromSource, or run with local design mode enabled.",
  );
}

export async function GET(request: NextRequest) {
  const { period, businessUnit, project } = readFilters(request);
  const filters: ProductOwnerDashboardFilters = {
    period,
    businessUnit,
    project,
  };

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
