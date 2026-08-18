"use client";
import {
    Text,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { ReactNode } from "react";
const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        width: "100%",
        minHeight: "120px",
        boxSizing: "border-box",
        padding: tokens.spacingHorizontalL,
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: tokens.spacingHorizontalS,
        minWidth: 0,
    },
    label: {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: tokens.colorNeutralForeground2,
        fontSize: tokens.fontSizeBase300,
    },
    icon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: tokens.colorNeutralForeground2,
    },
    value: {
        marginTop: tokens.spacingVerticalM,
        color: tokens.colorNeutralForeground1,
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightSemibold,
        lineHeight: tokens.lineHeightHero700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    description: {
        marginTop: tokens.spacingVerticalXS,
        color: tokens.colorNeutralForeground2,
        fontSize: tokens.fontSizeBase200,
    },
    footer: {
        display: "flex",
        alignItems: "center",
        marginTop: "auto",
        paddingTop: tokens.spacingVerticalM,
    },
});
interface DashboardKpiCardProps {
    label: string;
    value: string;
    description?: string;
    icon?: ReactNode;
    footer?: ReactNode;
}
export default function DashboardKpiCard({
    label,
    value,
    description,
    icon,
    footer,
}: DashboardKpiCardProps) {
    const styles = useStyles();
    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Text className={styles.label}>
                    {label}
                </Text>
                {icon && (
                    <span className={styles.icon}>
                        {icon}
                    </span>
                )}
            </div>
            <div className={styles.value}>
                {value}
            </div>
            {description && (
                <Text className={styles.description}>
                    {description}
                </Text>
            )}
            {footer && (
                <div className={styles.footer}>
                    {footer}
                </div>
            )}
        </div>
    );
}
