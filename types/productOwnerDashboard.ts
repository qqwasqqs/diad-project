/*
  Response contract for the Product Owner dashboard main view.

  The page renders this shape regardless of whether the route is backed by the
  local design fixture or, later, Splunk. Values arrive filtered and prepared
  for display; the page only adds presentation such as icons and chart colors.
*/

import type { ProductOwnerAdoptionAndEngagementData } from "@/components/drawers/product-owner/ProductOwnerAdoptionAndEngagementDrawer";
import type { ProductOwnerChannelMixData } from "@/components/drawers/product-owner/ProductOwnerChannelMixDrawer";
import type { ProductOwnerExperienceQualityData } from "@/components/drawers/product-owner/ProductOwnerExperienceQualityDrawer";
import type { ProductExperiencePulseData } from "@/components/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer";
import type { ProductOwnerTrustEvidenceData } from "@/components/drawers/product-owner/ProductOwnerTrustEvidenceDrawer";
import type { MetricRow, PendingState, Series } from "./dashboard";

export interface ProductOwnerApiErrorRateValue {
  errorRatePercent: number;
  errorRequestCount: number;
  eligibleRequestCount: number;
}

export interface ProductOwnerSupportingStat {
  id: string;
  label: string;
  value: string;
}

/*
  Splunk supplies the complete feedback aggregate, including the number of
  applications that contributed feedback. React does not classify records or
  derive either percentage or coverage count.
*/
export type ProductOwnerFeedbackSummaryData =
  | {
      status: "OK";
      positivePercent: number;
      negativePercent: number;
      includedApplicationCount: number;
      illustrative?: boolean;
    }
  | {
      status:
        | "DATA_PENDING"
        | "CALCULATION_PENDING"
        | "FILTER_BREAKDOWN_UNAVAILABLE"
        | "NO_DATA";
      reason?: string;
    };

export interface ProductOwnerDashboardMetricRow {
  id: string;
  label: string;
  amount?: number;
  decimals?: number;
  unit?: string;
  max?: number;
  pendingState?: PendingState;
}

export interface ProductOwnerDashboardMetricsPayload {
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
    workflowCompletion: ProductOwnerDashboardMetricRow & { reason: string };
  };
  adoptionAndEngagement: {
    series: Series[];
    supporting: ProductOwnerDashboardMetricRow[];
  };
  experienceAndResponseQuality: {
    series: Series[];
    supporting: ProductOwnerDashboardMetricRow[];
  };
  featureUsageEvidence: {
    statusLabel: "DATA PENDING";
    description: string;
  };
  trustAndMeasurementReadiness: ProductOwnerDashboardMetricRow[];
}

export type ProductOwnerDashboardAvailabilityStatus =
  | "OK"
  | "DATA_PENDING"
  | "CALCULATION_PENDING"
  | "FILTER_BREAKDOWN_UNAVAILABLE"
  | "NO_DATA"
  | "ERROR";

export type ProductOwnerDashboardSeriesResult =
  | {
      metricId: string;
      status: "OK";
      points: { x: string; y: number }[];
    }
  | {
      metricId: string;
      status: Exclude<ProductOwnerDashboardAvailabilityStatus, "OK">;
      points: [];
      reason: string;
    };

export type ProductOwnerDashboardSupportingStat =
  | { metricId: string; status: "OK"; value: number }
  | {
      metricId: string;
      status: Exclude<ProductOwnerDashboardAvailabilityStatus, "OK">;
      value: null;
      reason: string;
    };

export interface ProductOwnerDashboardTimeseriesPayload {
  meta: {
    dashboard: "product-owner";
    requestId: string;
    generatedAt: string;
    appliedFilters: {
      timeRange: string;
      businessUnits: string[];
      projects: string[];
      timezone: "UTC";
    };
    illustrative?: true;
    chartId: "adoption-and-engagement" | "experience-and-response-quality";
    granularity: "day";
  };
  series: ProductOwnerDashboardSeriesResult[];
  supportingStats: ProductOwnerDashboardSupportingStat[];
}

export interface ProductOwnerDashboardPayload {
  feedbackSummary: ProductOwnerFeedbackSummaryData;
  productExperiencePulse: {
    sessionQueryVolume: {
      queries: number;
      sessions: number;
      queriesPerSession: number;
    };
    apiErrorRate: ProductOwnerApiErrorRateValue;
    endToEndLatency: {
      percentile: string;
      seconds: number;
    };
    workflowCompletion: MetricRow & { reason: string };
  };
  adoptionAndEngagement: {
    series: Series[];
    supporting: ProductOwnerSupportingStat[];
  };
  experienceAndResponseQuality: {
    series: Series[];
    supporting: ProductOwnerSupportingStat[];
  };
  featureUsageEvidence: {
    statusLabel: "DATA PENDING";
    description: string;
  };
  trustAndMeasurementReadiness: MetricRow[];
  drawers: {
    adoptionAndEngagement: ProductOwnerAdoptionAndEngagementData;
    channelMix: ProductOwnerChannelMixData;
    productExperiencePulse: ProductExperiencePulseData;
    experienceAndResponseQuality: ProductOwnerExperienceQualityData;
    trustAndMeasurementReadiness: ProductOwnerTrustEvidenceData;
  };
}
