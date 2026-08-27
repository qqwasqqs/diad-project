"use client";

import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import InfrastructureDataPendingCard from "@/components/charts/InfrastructureDataPendingCard";

export interface CostByBusinessUnitItem {
  name: string;
  totalCost: number;
  topProjectName: string;
  topProjectCost: number;
  color: string;
}

interface CostByBusinessUnitChartProps {
  data: CostByBusinessUnitItem[];
}

type CostChartRow = {
  id: string;
  rowLabel: string;
  value?: number;
  color: string;
  rowType: "businessUnit" | "project" | "spacer";
  projectName?: string;
};

const PROJECT_BAR_COLOR = "#d1fae5";
const formatCurrencyK = (value: number) => `$${value.toFixed(2)}K`;

export default function CostByBusinessUnitChart({
  data,
}: CostByBusinessUnitChartProps) {
  const chartRows: CostChartRow[] = data.flatMap((item, index) => {
    const rows: CostChartRow[] = [
      {
        id: `${item.name}-bu`,
        rowLabel: item.name,
        value: item.totalCost,
        color: item.color,
        rowType: "businessUnit",
      },
      {
        id: `${item.name}-project`,
        rowLabel: `${item.name} project`,
        value: item.topProjectCost,
        color: PROJECT_BAR_COLOR,
        rowType: "project",
        projectName: item.topProjectName,
      },
    ];

    if (index < data.length - 1) {
      rows.push({
        id: `${item.name}-spacer`,
        rowLabel: `${item.name} spacer`,
        value: undefined,
        color: "transparent",
        rowType: "spacer",
      });
    }

    return rows;
  });

  const maxCost = Math.max(
    ...data.flatMap((item) => [item.totalCost, item.topProjectCost]),
    0,
  );

  const chartHeight = Math.max(220, chartRows.length * 22);

  return (
    <div className="flex w-full items-stretch gap-5">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-end gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-700" />
              <span>Business Unit</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: PROJECT_BAR_COLOR }}
              />
              <span>Project</span>
            </div>
          </div>
        </div>

        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              layout="vertical"
              margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
              barCategoryGap="0%"
            >
              <XAxis
                type="number"
                hide
                domain={[0, maxCost * 1.2 || 1]}
              />
              <YAxis
                type="category"
                dataKey="rowLabel"
                width={120}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#334155", fontSize: 12, fontWeight: 500 }}
                tickFormatter={(_, index) => {
                  if (typeof index !== "number") {
                    return "";
                  }

                  const row = chartRows[index];

                  return row?.rowType === "businessUnit" ? row.rowLabel : "";
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                barSize={22}
                isAnimationActive={false}
              >
                {chartRows.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="projectName"
                  position="insideLeft"
                  offset={8}
                  fill="#0f766e"
                  fontSize={11}
                  fontWeight={600}
                />
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  fill="#334155"
                  fontSize={11}
                  fontWeight={700}
                  formatter={(value: React.ReactNode) => {
                    if (typeof value === "number") {
                      return formatCurrencyK(value);
                    }

                    return "";
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <InfrastructureDataPendingCard
          title="Infrastructure Cost"
          statusLabel="DATA PENDING"
          value=""
        />
      </div>
    </div>
  );
}
