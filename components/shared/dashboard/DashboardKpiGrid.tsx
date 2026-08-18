"use client";
import {
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { ReactNode } from "react";
const useStyles = makeStyles({
    root: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: tokens.spacingHorizontalM,
        width: "100%",
        minWidth: 0,
    },
});
interface DashboardKpiGridProps {
    children: ReactNode;
}
export default function DashboardKpiGrid({
    children,
}: DashboardKpiGridProps) {
    const styles = useStyles();
    return (
        <div className={styles.root}>
            {children}
        </div>
    );
}