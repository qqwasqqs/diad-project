/*
  Local mock source for the filter bar's options.

  The values a dimension can be filtered by are data, not UI configuration: they
  are the distinct business units, projects, and apps present in the source. So
  they are read from a mock file here and served by `/api/dashboard/filters`,
  the same seam an approved Splunk search will replace.

  The mock carries one extra field the real source will not: `weight`. It is the
  illustrative scaling applied to mock metrics when that value is selected, kept
  beside the option so adding an app to the mock also gives it a visible effect
  on the numbers. It is stripped before the options are served.

  Used only in local design mode.
*/

import filterOptionsMock from "@/public/mocks/new-pages/dashboard-filters.json";

import type {
  DashboardFilterOption,
  DashboardFilterOptions,
} from "@/types/dashboard";

// The data-derived dimensions, in filter-bar order.
export const FILTER_DIMENSIONS = ["businessUnit", "project", "app"] as const;

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

interface MockFilterOption extends DashboardFilterOption {
  weight?: number;
}

type MockFilterOptions = Record<FilterDimension, MockFilterOption[]>;

function mockOptions(dimension: FilterDimension): MockFilterOption[] {
  return (filterOptionsMock as MockFilterOptions)[dimension] ?? [];
}

/*
  The options as the endpoint serves them: value and label only, so the client
  cannot come to depend on a field only the mock has.
*/
export function mockFilterOptions(): DashboardFilterOptions {
  return {
    businessUnit: mockOptions("businessUnit").map(toOption),
    project: mockOptions("project").map(toOption),
    app: mockOptions("app").map(toOption),
  };
}

function toOption({ value, label }: MockFilterOption): DashboardFilterOption {
  return { value, label };
}

/*
  Illustrative weight for one selection, read from the same mock that supplies
  the options. An unknown value leaves the numbers unscaled rather than zeroing
  them, because a scope with no mock weight is not a scope with no activity.
*/
export function mockScopeWeight(
  dimension: FilterDimension,
  selected?: string,
): number {
  const option = mockOptions(dimension).find(
    (candidate) => candidate.value === (selected ?? "all"),
  );

  return option?.weight ?? 1;
}
