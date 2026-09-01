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
                    {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
                    {title}
                    {description && (
                        <span className={styles.description}>{description}</span>
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