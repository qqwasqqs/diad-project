/*
  Response contract for the Product Owner dashboard main view.

  The page renders this shape regardless of whether the route is backed by the
  local design fixture or, later, Splunk. Values arrive filtered and prepared
  for display; the page only adds presentation such as icons and chart colors.
*/

import type { ProductOwnerAdoptionAndEngagementData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerAdoptionAndEngagementDrawer";
import type { ProductOwnerChannelMixData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerChannelMixDrawer";
import type { ProductOwnerExperienceQualityData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerExperienceQualityDrawer";
import type { ProductExperiencePulseData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerProductExperiencePulseDrawer";
import type { ProductOwnerTrustEvidenceData } from "@/components/shared/dashboard/drawers/product-owner/ProductOwnerTrustEvidenceDrawer";
import type { MetricRow, Series } from "./dashboard";

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

export interface ProductOwnerDashboardPayload {
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
  trustAndMeasurementReadiness: MetricRow[];
  drawers: {
    adoptionAndEngagement: ProductOwnerAdoptionAndEngagementData;
    channelMix: ProductOwnerChannelMixData;
    productExperiencePulse: ProductExperiencePulseData;
    experienceAndResponseQuality: ProductOwnerExperienceQualityData;
    trustAndMeasurementReadiness: ProductOwnerTrustEvidenceData;
  };
}
