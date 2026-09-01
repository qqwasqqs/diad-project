"use client";

import type { ReactNode } from "react";
import { ChannelRegular, CalendarLtrRegular, BuildingMultipleRegular, FolderRegular } from "@fluentui/react-icons";

import DashboardFilter from "./DashboardFilter";
import {
    BUSINESS_UNIT_OPTIONS,
    CHANNEL_OPTIONS,
    PERIOD_OPTIONS,
    PROJECT_OPTIONS,
    useDashboardFiltersStore,
} from "@/store/dashboardFiltersStore";

interface DashboardFiltersProps {
    /*
      Rendered as the last item of the same wrapping row as the filters, so a
      trailing action stays after them instead of being stranded mid-row when
      the filters wrap onto a second line.
    */
    trailing?: ReactNode;
}

export default function DashboardFilters({ trailing }: DashboardFiltersProps) {
    /*
      Selections are held in the shared store so a dashboard page can read the
      same scope its header is showing. Selecting a filter here does not, by
      itself, refilter a page that has not opted in.
    */
    const period = useDashboardFiltersStore((state) => state.period);
    const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
    const project = useDashboardFiltersStore((state) => state.project);
    const channel = useDashboardFiltersStore((state) => state.channel);

    const setPeriod = useDashboardFiltersStore((state) => state.setPeriod);
    const setBusinessUnit = useDashboardFiltersStore((state) => state.setBusinessUnit);
    const setProject = useDashboardFiltersStore((state) => state.setProject);
    const setChannel = useDashboardFiltersStore((state) => state.setChannel);

    return (
        <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
            <DashboardFilter
                value={period}
                icon={<CalendarLtrRegular />}
                options={PERIOD_OPTIONS}
                onChange={setPeriod}
            />
            <DashboardFilter
                value={businessUnit}
                icon={<BuildingMultipleRegular />}
                options={BUSINESS_UNIT_OPTIONS}
                onChange={setBusinessUnit}
            />
            <DashboardFilter
                value={project}
                icon={<FolderRegular />}
                options={PROJECT_OPTIONS}
                onChange={setProject}
            />
            <DashboardFilter
                value={channel}
                icon={<ChannelRegular />}
                options={CHANNEL_OPTIONS}
                onChange={setChannel}
            />

            {trailing}
        </div>
    );
}
