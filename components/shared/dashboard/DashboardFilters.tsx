"use client";

import type { ReactNode } from "react";
import {
  AppsRegular,
  BuildingMultipleRegular,
  CalendarLtrRegular,
  FolderRegular,
} from "@fluentui/react-icons";

import DashboardFilter, { type DashboardFilterSize } from "./DashboardFilter";
import { useDashboardFilterOptions } from "@/hooks/useDashboardFilterOptions";
import { useSelectedDashboardFilters } from "@/hooks/useSelectedDashboardFilters";
import {
  PERIOD_OPTIONS,
  useDashboardFiltersStore,
} from "@/store/dashboardFiltersStore";
import type { DashboardFilterSelection } from "@/types/dashboard";

export type DashboardFilterValues = DashboardFilterSelection;

export interface DashboardFilterState {
  values: DashboardFilterValues;
  onChange: (values: DashboardFilterValues) => void;
}

type ControlledFilterState =
  | DashboardFilterState
  | {
      values?: never;
      onChange?: never;
    };

type DashboardFiltersProps = {
  trailing?: ReactNode;
  size?: DashboardFilterSize;
} & ControlledFilterState;

interface DashboardFiltersContentProps {
  values: DashboardFilterValues;
  onChange: (values: DashboardFilterValues) => void;
  size: DashboardFilterSize;
  trailing?: ReactNode;
}

/*
  The business unit, project, and app values are the distinct values present in
  the source, so they are fetched rather than declared here. Until they arrive
  each of those filters offers only `all`, the scope already selected.
*/
function DashboardFiltersContent({
  values,
  onChange,
  size,
  trailing,
}: DashboardFiltersContentProps) {
  const { filterOptions } = useDashboardFilterOptions();

  const update = (field: keyof DashboardFilterValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div
      className={`flex flex-wrap items-center ${
        size === "compact" ? "gap-1" : "gap-2 2xl:justify-end"
      }`}
    >
      <DashboardFilter
        ariaLabel="Period"
        value={values.period}
        icon={<CalendarLtrRegular />}
        options={PERIOD_OPTIONS}
        onChange={(value) => update("period", value)}
        size={size}
      />
      <DashboardFilter
        ariaLabel="Business unit"
        value={values.businessUnit}
        icon={<BuildingMultipleRegular />}
        options={filterOptions.businessUnit}
        onChange={(value) => update("businessUnit", value)}
        size={size}
      />
      <DashboardFilter
        ariaLabel="Project"
        value={values.project}
        icon={<FolderRegular />}
        options={filterOptions.project}
        onChange={(value) => update("project", value)}
        size={size}
      />
      <DashboardFilter
        ariaLabel="Application"
        value={values.app}
        icon={<AppsRegular />}
        options={filterOptions.app}
        onChange={(value) => update("app", value)}
        size={size}
      />
      {trailing}
    </div>
  );
}

/*
  The bar reads the selection through the same hook the pages use, so the
  labels it shows and the scope the page requests can never disagree — on
  arriving at a dashboard both are the unfiltered default.
*/
function StoreBackedDashboardFilters({
  size,
  trailing,
}: {
  size: DashboardFilterSize;
  trailing?: ReactNode;
}) {
  const values = useSelectedDashboardFilters();
  const setPeriod = useDashboardFiltersStore((state) => state.setPeriod);
  const setBusinessUnit = useDashboardFiltersStore((state) => state.setBusinessUnit);
  const setProject = useDashboardFiltersStore((state) => state.setProject);
  const setApp = useDashboardFiltersStore((state) => state.setApp);

  return (
    <DashboardFiltersContent
      size={size}
      trailing={trailing}
      values={values}
      onChange={(next) => {
        setPeriod(next.period);
        setBusinessUnit(next.businessUnit);
        setProject(next.project);
        setApp(next.app);
      }}
    />
  );
}

export default function DashboardFilters({
  size = "regular",
  trailing,
  ...controlledState
}: DashboardFiltersProps) {
  if ("values" in controlledState && controlledState.values) {
    return (
      <DashboardFiltersContent
        size={size}
        trailing={trailing}
        values={controlledState.values}
        onChange={controlledState.onChange}
      />
    );
  }

  return <StoreBackedDashboardFilters size={size} trailing={trailing} />;
}
