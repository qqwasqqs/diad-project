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
};

const COMPONENT_HEIGHT = 180;
const ROW_HEIGHT = 30;
const ROWS_PER_COLUMN = Math.floor(COMPONENT_HEIGHT / ROW_HEIGHT);
const MAX_ITEMS = ROWS_PER_COLUMN * 2;

const useStyles = makeStyles({
    root: {
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "minmax(0, 1fr)",
        columnGap: "24px",
        overflow: "hidden",
        height: `${COMPONENT_HEIGHT}px`,
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

const ProgressBar = ({ value }: { value: number }) => {
    const safeValue = Math.max(0, Math.min(value, 100));

    const data = [
        {
            value: safeValue,
            remaining: 100 - safeValue,
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
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" hide />

                {/* Blue filled portion */}
                <Bar
                    dataKey="value"
                    stackId="progress"
                    fill="#2563eb"
                    radius={[999, 0, 0, 999]}
                    barSize={8}
                    isAnimationActive={false}
                />

                {/* Gray remainder (track) */}
                <Bar
                    dataKey="remaining"
                    stackId="progress"
                    fill="#e5e7eb"
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
}) => {
    const styles = useStyles();

    const visibleItems = values.slice(0, MAX_ITEMS);

    return (
        <div
            className={styles.root}
            style={{
                gridTemplateRows: `repeat(${ROWS_PER_COLUMN}, ${ROW_HEIGHT}px)`,
            }}
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
                        <ProgressBar value={item.value} />
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