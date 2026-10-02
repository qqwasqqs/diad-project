/*
  One translation between the endpoint's availability statuses and the UI's
  unavailable-data vocabulary.

  The two vocabularies exist for different reasons: the endpoint status says
  what the source could establish, and the UI state decides what the reader is
  told in the slot where a value would be. Mapping them in one place keeps every
  dashboard saying the same thing about the same status, and keeps the mapping
  reviewable rather than re-decided per page.
*/

import type { DashboardAvailabilityStatus } from "@/types/dashboardEndpointDtos";
import type { PendingState } from "@/types/dashboard";

export type UnavailableStatus = Exclude<DashboardAvailabilityStatus, "OK">;

const PENDING_STATE_BY_STATUS: Record<UnavailableStatus, PendingState> = {
  DATA_PENDING: "data",
  CALCULATION_PENDING: "calculation",
  FILTER_BREAKDOWN_UNAVAILABLE: "filter-breakdown",
  // Neither of these is pending approval, and neither is a measured zero.
  NO_DATA: "no-data",
  ERROR: "unavailable",
};

export function pendingStateForStatus(status: UnavailableStatus): PendingState {
  return PENDING_STATE_BY_STATUS[status];
}
