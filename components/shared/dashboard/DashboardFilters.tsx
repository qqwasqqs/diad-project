"use client";

import {
    Dropdown,
    Option,
} from "@fluentui/react-components";
import { ChannelRegular, CalendarLtrRegular, BuildingMultipleRegular, FolderRegular } from "@fluentui/react-icons";


import DashboardFilter
    from "./DashboardFilter";
export default function DashboardFilters() {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
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
        </div>
    );
}