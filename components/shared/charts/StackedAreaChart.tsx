"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { makeStyles, tokens } from "@fluentui/react-components";

export interface StackedAreaSeries {
  id: string;
  label: string;
  color: string;
}

export interface StackedAreaPoint {
  x: string | number;
  // Keyed by series id.
  values: Record<string, number>;
}

export interface StackedAreaChartProps {
  series: StackedAreaSeries[];
  points: StackedAreaPoint[];
  /* Label shown rotated alongside the y-axis. */
  axisLabel?: string;
  height?: number;
  className?: string;
}

const useStyles = makeStyles({
  root: {
    width: "100%",
  },
  legend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "8px",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    color: tokens.colorNeutralForeground2,
    fontSize: "11px",
  },
  swatch: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    display: "inline-block",
    flexShrink: 0,
  },
});

function buildChartData(points: StackedAreaPoint[]) {
  return points.map((point) => ({ x: point.x, ...point.values }));
}

const percentFormatter = (value: number) => `${Math.round(value * 100)}%`;

export default function StackedAreaChart({
  series,
  points,
  axisLabel,
  height = 220,
  className = "",
}: StackedAreaChartProps) {
  const styles = useStyles();

  if (!series || series.length === 0 || !points || points.length === 0) {
    return null;
  }

  const chartData = buildChartData(points);

  return (
    <div className={[styles.root, className].join(" ")}>
      <div className={styles.legend}>
        {series.map((item) => (
          <div key={item.id} className={styles.legendItem}>
            <span className={styles.swatch} style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            stackOffset="expand"
            margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="x"
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              tickMargin={10}
              tick={{ fill: "#64748b", fontSize: 11 }}
              minTickGap={18}
            />

            <YAxis
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
              tickMargin={10}
              width={axisLabel ? 60 : 42}
              tickFormatter={percentFormatter}
              tick={{ fill: "#64748b", fontSize: 11 }}
              label={
                axisLabel
                  ? {
                      value: axisLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#64748b", fontSize: 11, textAnchor: "middle" },
                    }
                  : undefined
              }
            />

            <Tooltip
              formatter={(value: number) => percentFormatter(value)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.08)",
              }}
            />

            {series.map((item) => (
              <Area
                key={item.id}
                type="monotone"
                dataKey={item.id}
                stackId="channel-share"
                stroke={item.color}
                fill={item.color}
                fillOpacity={0.85}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
