"use client";
import {
    Button,
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerHeaderTitle,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { ReactNode } from "react";
import DashboardHeader from "./DashboardHeader";
import type { DashboardFilterState } from "./DashboardFilters";
const useStyles = makeStyles({
    drawer: {
        width: "400px",
        maxWidth: "90vw",
    },
    // Detail drawers that carry a chart and a table need more width than a
    // plain list drawer, while still leaving the dimmed main view visible.
    drawerWide: {
        width: "720px",
        maxWidth: "95vw",
    },
    eyebrow: {
        display: "block",
        fontSize: "12px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: tokens.colorNeutralForeground2,
    },
    description: {
        display: "block",
        marginTop: "4px",
        fontSize: "13px",
        color: "var(--color-chart-axis)",
    },
    body: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalL,
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: tokens.spacingHorizontalS,
    },
});
interface DashboardDrawerProps {
    open: boolean;
    title: string;
    /* Short uppercase label above the title, naming the detail view. */
    eyebrow?: string;
    /* One line under the title saying what the drawer covers. */
    description?: ReactNode;
    size?: "default" | "wide";
    children?: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
    /* Enables the compact, locally controlled filter row under the drawer title. */
    headerFilters?: DashboardFilterState;
    /*
      Enables the same compact filter row, but bound to the global scope the
      page already reads, so a selection made here re-scopes the payload the
      drawer is showing rather than only moving a label. Use this or
      `headerFilters`, not both: a drawer either changes the scope or demos it.
    */
    showScopeFilters?: boolean;
}
export default function DashboardDrawer({
    open,
    title,
    eyebrow,
    description,
    size = "default",
    children,
    onClose,
    footer,
    headerFilters,
    showScopeFilters = false,
}: DashboardDrawerProps) {
    const styles = useStyles();
    return (
        <Drawer
            className={size === "wide" ? styles.drawerWide : styles.drawer}
            position="end"
            open={open}
            onOpenChange={(_, data) => {
                if (!data.open) {
                    onClose();
                }
            }}
        >
            <DrawerHeader>
                <DrawerHeaderTitle
                    action={
                        <Button
                            appearance="subtle"
                            aria-label="Close"
                            icon={<Dismiss24Regular />}
                            onClick={onClose}
                        />
                    }
                >
                    {headerFilters || showScopeFilters ? (
                        <DashboardHeader
                            template="drawer"
                            title={title}
                            eyebrow={eyebrow}
                            description={description}
                            showExport={false}
                            filterState={headerFilters}
                        />
                    ) : (
                        <>
                            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
                            {title}
                            {description && (
                                <span className={styles.description}>{description}</span>
                            )}
                        </>
                    )}
                </DrawerHeaderTitle>
            </DrawerHeader>
            <DrawerBody>
                <div className={styles.body}>
                    {children}
                </div>
            </DrawerBody>
            {footer && (
                <DrawerFooter>
                    <div className={styles.footer}>
                        {footer}
                    </div>
                </DrawerFooter>
            )}
        </Drawer>
    );
}
