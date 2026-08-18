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
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
}
export default function DashboardDrawer({
    open,
    title,
    children,
    onClose,
    footer,
}: DashboardDrawerProps) {
    const styles = useStyles();
    return (
        <Drawer
            className={styles.drawer}
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
                    {title}
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