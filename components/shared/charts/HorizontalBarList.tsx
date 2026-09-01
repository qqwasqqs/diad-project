import React from "react";
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";
import { makeStyles, tokens } from "@fluentui/react-components";

export type HorizontalBarListItem = {
    label: string;
    value: number;
};

export type HorizontalBarListProps = {
    values: HorizontalBarListItem[];
    /*
      Rows per column before wrapping into the next column. Defaults to filling
      the component height, so eight items split 6 + 2; pass 4 for an even 4 + 4.
    */
    rowsPerColumn?: number;
    /*
      Number of columns the rows flow into. Defaults to two.
    */
    columns?: number;
    /*
      Fill direction. "column" (default) fills each column top to bottom, so the
      supplied order reads down the first column. "row" fills left to right, so
      the order reads across. Which one is correct comes from the design being
      implemented, not from the data.
    */
    flow?: "column" | "row";
    /*
      Upper bound of the bar track. Bar length is `value / max`.

      Defaults to 100 for values that are already percentages of a whole. Sets of
      small rates that are compared against each other need a smaller bound,
      otherwise every bar renders as an invisible sliver at the same length.
    */
    max?: number;
};

const COMPONENT_HEIGHT = 180;
const ROW_HEIGHT = 30;
const DEFAULT_ROWS_PER_COLUMN = Math.floor(COMPONENT_HEIGHT / ROW_HEIGHT);
const DEFAULT_COLUMN_COUNT = 2;

const useStyles = makeStyles({
    root: {
        display: "grid",
        columnGap: "24px",
        overflow: "hidden",
    },

    row: {
        display: "grid",
        gridTemplateColumns: "80px minmax(0, 1fr) 40px",
        alignItems: "center",
        columnGap: tokens.spacingHorizontalM,
        height: `${ROW_HEIGHT}px`,
    },

    label: {
        fontSize: "12px",
        lineHeight: "16px",
        color: tokens.colorNeutralForeground2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
    },

    chartWrapper: {
        width: "100%",
        height: "10px",
    },

    value: {
        fontSize: "12px",
        lineHeight: "16px",
        color: "#6b7280",
        textAlign: "right",
        fontWeight: 500,
        whiteSpace: "nowrap",
    },
});

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
    const safeMax = max > 0 ? max : 100;
    const safeValue = Math.max(0, Math.min(value, safeMax));

    const data = [
        {
            value: safeValue,
            remaining: safeMax - safeValue,
        },
    ];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{
                    top: 0,
                    right: 0,
                    left: 0,
                    bottom: 0,
                }}
            >
                <XAxis type="number" domain={[0, safeMax]} hide />
                <YAxis type="category" hide />

                {/* Filled portion */}
                <Bar
                    dataKey="value"
                    stackId="progress"
                    fill="var(--color-chart-series-1)"
                    radius={[999, 0, 0, 999]}
                    barSize={8}
                    isAnimationActive={false}
                />

                {/* Remainder (track) */}
                <Bar
                    dataKey="remaining"
                    stackId="progress"
                    fill="var(--color-chart-grid)"
                    radius={[0, 999, 999, 0]}
                    barSize={8}
                    isAnimationActive={false}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export const HorizontalBarList: React.FC<HorizontalBarListProps> = ({
    values,
    rowsPerColumn = DEFAULT_ROWS_PER_COLUMN,
    columns = DEFAULT_COLUMN_COUNT,
    flow = "column",
    max = 100,
}) => {
    const styles = useStyles();

    const rows = Math.max(1, rowsPerColumn);
    const columnCount = Math.max(1, columns);
    const visibleItems = values.slice(0, rows * columnCount);

    return (
        <div
            className={styles.root}
            style={
                flow === "row"
                    ? {
                          gridAutoFlow: "row",
                          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                          gridAutoRows: `${ROW_HEIGHT}px`,
                          height: `${rows * ROW_HEIGHT}px`,
                      }
                    : {
                          gridAutoFlow: "column",
                          gridAutoColumns: "minmax(0, 1fr)",
                          gridTemplateRows: `repeat(${rows}, ${ROW_HEIGHT}px)`,
                          height: `${rows * ROW_HEIGHT}px`,
                      }
            }
        >
            {visibleItems.map((item, index) => (
                <div
                    key={`${item.label}-${index}`}
                    className={styles.row}
                >
                    <div className={styles.label}>
                        {item.label}
                    </div>

                    <div className={styles.chartWrapper}>
                        <ProgressBar value={item.value} max={max} />
                    </div>

                    <div className={styles.value}>
                        {item.value}%
                    </div>
                </div>
            ))}
        </div>
    );
};

export default HorizontalBarList;