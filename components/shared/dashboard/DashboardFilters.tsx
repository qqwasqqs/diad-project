"use client";

import type { ReactNode } from "react";
import {
  BuildingMultipleRegular,
  CalendarLtrRegular,
  ChannelRegular,
  FolderRegular,
} from "@fluentui/react-icons";

import DashboardFilter, { type DashboardFilterSize } from "./DashboardFilter";
import {
  BUSINESS_UNIT_OPTIONS,
  CHANNEL_OPTIONS,
  PERIOD_OPTIONS,
  PROJECT_OPTIONS,
  useDashboardFiltersStore,
} from "@/store/dashboardFiltersStore";

export interface DashboardFilterValues {
  period: string;
  businessUnit: string;
  project: string;
  channel: string;
}

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

function DashboardFiltersContent({
  values,
  onChange,
  size,
  trailing,
}: DashboardFiltersContentProps) {
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
        options={BUSINESS_UNIT_OPTIONS}
        onChange={(value) => update("businessUnit", value)}
        size={size}
      />
      <DashboardFilter
        ariaLabel="Project"
        value={values.project}
        icon={<FolderRegular />}
        options={PROJECT_OPTIONS}
        onChange={(value) => update("project", value)}
        size={size}
      />
      <DashboardFilter
        ariaLabel="Channel"
        value={values.channel}
        icon={<ChannelRegular />}
        options={CHANNEL_OPTIONS}
        onChange={(value) => update("channel", value)}
        size={size}
      />
      {trailing}
    </div>
  );
}

function StoreBackedDashboardFilters({
  size,
  trailing,
}: {
  size: DashboardFilterSize;
  trailing?: ReactNode;
}) {
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);
  const channel = useDashboardFiltersStore((state) => state.channel);
  const setPeriod = useDashboardFiltersStore((state) => state.setPeriod);
  const setBusinessUnit = useDashboardFiltersStore((state) => state.setBusinessUnit);
  const setProject = useDashboardFiltersStore((state) => state.setProject);
  const setChannel = useDashboardFiltersStore((state) => state.setChannel);

  return (
    <DashboardFiltersContent
      size={size}
      trailing={trailing}
      values={{ period, businessUnit, project, channel }}
      onChange={(values) => {
        setPeriod(values.period);
        setBusinessUnit(values.businessUnit);
        setProject(values.project);
        setChannel(values.channel);
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
