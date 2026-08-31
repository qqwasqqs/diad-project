"use client";

import { makeStyles, Text, tokens } from "@fluentui/react-components";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardSupportingStats, {
  type DashboardSupportingStatItem,
} from "./DashboardSupportingStats";

export type DashboardLineAxisId = "left" | "right";

export interface DashboardLinePoint {
  x: string | number;
  y: number;
}

export interface DashboardLineSeries {
  id: string;
  label: string;
  color: string;
  yAxis?: DashboardLineAxisId;
  points: DashboardLinePoint[];
}

export interface DashboardLineAxisConfig {
  id: DashboardLineAxisId;
  label?: string;
  tickFormatter?: (value: number) => string;
  width?: number;
  domain?: [number, number] | [string, string];
}

export type DashboardLineChartSupportingStatsVariant =
  | "default"
  | "productOwner";

export type DashboardLineChartSupportingStatsTemplate = "bottom" | "right";

interface DashboardLineChartProps {
  title?: string;
  description?: string;
  series: DashboardLineSeries[];
  axes?: DashboardLineAxisConfig[];
  supportingStats?: DashboardSupportingStatItem[];
  supportingStatsVariant?: DashboardLineChartSupportingStatsVariant;
  supportingStatsTemplate?: DashboardLineChartSupportingStatsTemplate;
  height?: number;
  showGrid?: boolean;
  className?: string;
}

const useStyles = makeStyles({
  root: {
    width: "100%",
    backgroundColor: "transparent",
    padding: 0,
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "8px",
  },
  title: {
    fontSize: "clamp(2.5rem, 3vw, 4rem)",
    lineHeight: 1.05,
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
    letterSpacing: "-0.04em",
  },
  description: {
    fontSize: "1.05rem",
    color: tokens.colorNeutralForeground2,
    lineHeight: 1.4,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: tokens.colorNeutralForeground2,
    fontSize: "1.02rem",
    lineHeight: 1.3,
  },
  swatch: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    display: "inline-block",
    flexShrink: 0,
  },
  chartWithStats: {
    display: "flex",
    alignItems: "stretch",
    gap: "12px",
    width: "100%",
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  chartPane: {
    flex: "1 1 auto",
    minWidth: 0,
  },
  statsPane: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    minWidth: 0,
    width: "150px",
    "@media (max-width: 768px)": {
      width: "100%",
      justifyContent: "center",
    },
  },
  chartWrap: {
    width: "100%",
    marginTop: 0,
  },
  emptyState: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "140px",
    color: tokens.colorNeutralForeground2,
  },
});

function buildChartData(series: DashboardLineSeries[]) {
  const rows = new Map<string, Record<string, string | number>>();
  const order: string[] = [];

  series.forEach((item) => {
    item.points.forEach((point) => {
      const key = String(point.x);

      if (!rows.has(key)) {
        rows.set(key, { x: point.x });
        order.push(key);
      }

      rows.get(key)![item.id] = point.y;
    });
  });

  return order.map((key) => rows.get(key) as Record<string, string | number>);
}

export default function DashboardLineChart({
  title,
  description,
  series,
  axes,
  supportingStats,
  supportingStatsVariant = "default",
  supportingStatsTemplate = "bottom",
  height = 280,
  showGrid = true,
  className = "",
}: DashboardLineChartProps) {
  const styles = useStyles();

  if (!series || series.length === 0) {
    return (
      <div className={[styles.root, className].join(" ")}>
        <div className={styles.emptyState}>No chart data available</div>
      </div>
    );
  }

  const axisDefinitions = [...(axes ?? [{ id: "left" }])];
  const axisMap = new Map<DashboardLineAxisId, DashboardLineAxisConfig>();

  axisDefinitions.forEach((axis) => {
    axisMap.set(axis.id, axis);
  });

  series.forEach((item) => {
    const axisId = item.yAxis ?? "left";

    if (!axisMap.has(axisId)) {
      axisMap.set(axisId, { id: axisId });
    }
  });

  const chartData = buildChartData(series);
  const visibleAxes = Array.from(axisMap.values());
  const hasSupportingStats = Boolean(supportingStats && supportingStats.length > 0);

  const chartContent = (
    <div className={styles.chartWrap} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          {showGrid && (
            <CartesianGrid
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              vertical={false}
            />
          )}

          <XAxis
            dataKey="x"
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "#64748b", fontSize: 12 }}
            minTickGap={18}
          />

          {visibleAxes.map((axis) => (
            <YAxis
              key={axis.id}
              yAxisId={axis.id}
              orientation={axis.id === "right" ? "right" : "left"}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              tickMargin={10}
              width={axis.width ?? 50}
              domain={axis.domain}
              tickFormatter={axis.tickFormatter}
              tick={{ fill: "#64748b", fontSize: 12 }}
            />
          ))}

          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
            formatter={(value: number | string) => [value, ""]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
            }}
          />

          {series.map((item) => (
            <Line
              key={item.id}
              yAxisId={item.yAxis ?? "left"}
              type="monotone"
              dataKey={item.id}
              stroke={item.color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: item.color, stroke: "white", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const supportingStatsContent =
    hasSupportingStats && supportingStats ? (
      <DashboardSupportingStats
        items={supportingStats}
        variant={supportingStatsVariant}
        layout={supportingStatsTemplate === "right" ? "right" : "bottom"}
      />
    ) : null;

  return (
    <div className={[styles.root, className].join(" ")}>
      {(title || description) && (
        <div className={styles.header}>
          {title && <Text as="h3" className={styles.title}>{title}</Text>}
          {description && <Text className={styles.description}>{description}</Text>}
        </div>
      )}

      <div className={styles.legend}>
        {series.map((item) => (
          <div key={item.id} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {supportingStatsTemplate === "right" && hasSupportingStats ? (
        <div className={styles.chartWithStats}>
          <div className={styles.chartPane}>{chartContent}</div>
          <div className={styles.statsPane}>{supportingStatsContent}</div>
        </div>
      ) : (
        <>
          {chartContent}
          {supportingStatsContent}
        </>
      )}
    </div>
  );
}
