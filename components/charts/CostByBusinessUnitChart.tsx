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

/*
  Two series, two colours. Every business unit shares one colour because they
  are the same measure; varying it per row would imply a distinction that does
  not exist. The project bar is a lighter tint of the same hue, which reads as a
  subset of the total above it rather than a separate measure.

  Blue rather than green: cost is a neutral data series, and the design rules
  reserve green for a confirmed favorable state.
*/
const BUSINESS_UNIT_BAR_COLOR = "var(--color-chart-series-1)";
const PROJECT_BAR_COLOR = "var(--color-chart-series-1-soft)";
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
        color: BUSINESS_UNIT_BAR_COLOR,
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

  const chartHeight = Math.max(240, chartRows.length * 28);

  return (
    <div className="flex min-h-0 w-full flex-1 items-stretch gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-end gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: BUSINESS_UNIT_BAR_COLOR }}
              />
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
              /* Right margin holds the value label, which sits outside the bar. */
              margin={{ top: 8, right: 56, bottom: 8, left: 4 }}
              barCategoryGap="0%"
            >
              <XAxis
                type="number"
                hide
                domain={[0, maxCost * 1.05 || 1]}
              />
              <YAxis
                type="category"
                dataKey="rowLabel"
                width={118}
                axisLine={false}
                tickLine={false}
                interval={0}
                /*
                  Both rows are named here rather than inside the bars. A
                  project bar can be too short to hold its own label, and a
                  clipped name is worse than an indented one.
                */
                tick={(props) => {
                  const row = chartRows[props.index];

                  if (!row || row.rowType === "spacer") {
                    return <g />;
                  }

                  const isBusinessUnit = row.rowType === "businessUnit";

                  return (
                    <text
                      x={props.x}
                      y={props.y}
                      dy={4}
                      textAnchor="end"
                      fontSize={isBusinessUnit ? 12 : 11}
                      fontWeight={isBusinessUnit ? 600 : 400}
                      fill={
                        isBusinessUnit
                          ? "var(--color-text-primary)"
                          : "var(--color-chart-axis)"
                      }
                    >
                      {isBusinessUnit ? row.rowLabel : row.projectName}
                    </text>
                  );
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                barSize={26}
                isAnimationActive={false}
              >
                {chartRows.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}

                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  fill="var(--color-text-primary)"
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

      <div className="flex shrink-0 items-end">
        <InfrastructureDataPendingCard
          title="Infrastructure Cost"
          statusLabel="DATA PENDING"
          value=""
        />
      </div>
    </div>
  );
}
