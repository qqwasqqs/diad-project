"use client";

import type { ReactNode } from "react";
import { ChannelRegular, CalendarLtrRegular, BuildingMultipleRegular, FolderRegular } from "@fluentui/react-icons";


import DashboardFilter
    from "./DashboardFilter";

interface DashboardFiltersProps {
    /*
      Rendered as the last item of the same wrapping row as the filters, so a
      trailing action stays after them instead of being stranded mid-row when
      the filters wrap onto a second line.
    */
    trailing?: ReactNode;
}

export default function DashboardFilters({ trailing }: DashboardFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
            <DashboardFilter
                value="30d"
                icon={<CalendarLtrRegular />}
                options={[
                    {
                        value: "7d",
                        label: "Last 7 days",
                    },
                    {
                        value: "30d",
                        label: "Last 30 days",
                    },
                    {
                        value: "90d",
                        label: "Last 90 days",
                    },
                ]}
                onChange={(value) => {
                    console.log(value);
                }}
            />
            <DashboardFilter
                value="all"
                icon={<BuildingMultipleRegular />}
                options={[
                    {
                        value: "all",
                        label: "All business units",
                    },
                    {
                        value: "a",
                        label: "Business Unit A",
                    },
                    {
                        value: "b",
                        label: "Business Unit B",
                    },
                ]}
                onChange={(value) => {
                    console.log(value);
                }}
            />
            <DashboardFilter
                value="all"
                icon={<FolderRegular />}
                options={[
                    {
                        value: "all",
                        label: "All projects",
                    },
                    {
                        value: "a1",
                        label: "Project A1",
                    },
                    {
                        value: "b1",
                        label: "Project B1",
                    },
                ]}
                onChange={(value) => {
                    console.log(value);
                }}
            />
            <DashboardFilter

                value="all"
                icon={<ChannelRegular />}
                options={[
                    {
                        value: "all",
                        label: "All channels",
                    },
                    {
                        value: "web",
                        label: "Web",
                    },
                    {
                        value: "api",
                        label: "API",
                    },
                    {
                        value: "mobile",
                        label: "Mobile",
                    },
                ]}
                onChange={(value) => {
                    console.log(value);
                }}
            />

            {trailing}
        </div>
    );
}