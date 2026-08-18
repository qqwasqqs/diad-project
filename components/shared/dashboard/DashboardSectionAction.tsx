"use client";
import { Button } from "@fluentui/react-components";
import { MoreHorizontalRegular } from "@fluentui/react-icons";
interface DashboardSectionActionProps {
    onClick: () => void;
    label?: string;
}
export default function DashboardSectionAction({
    onClick,
    label = "View details",
}: DashboardSectionActionProps) {
    return (
        <Button
            appearance="subtle"
            size="small"
            icon={<MoreHorizontalRegular />}
            onClick={onClick}
            aria-label={label}
        />
    );
}