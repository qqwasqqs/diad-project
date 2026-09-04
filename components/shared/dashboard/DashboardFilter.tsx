"use client";

import type { ReactNode } from "react";
import {
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";
import { CheckmarkRegular, ChevronDownRegular } from "@fluentui/react-icons";

interface DashboardFilterOption {
  value: string;
  label: string;
}

export type DashboardFilterSize = "regular" | "compact";

interface DashboardFilterProps {
  ariaLabel: string;
  label?: string;
  value: string;
  options: DashboardFilterOption[];
  icon?: ReactNode;
  onChange: (value: string) => void;
  size?: DashboardFilterSize;
}

const useStyles = makeStyles({
  trigger: {
    minWidth: "140px",
    height: "32px",
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalXS,
    justifyContent: "space-between",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  triggerCompact: {
    minWidth: "0",
    maxWidth: "100%",
    height: "28px",
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXXS,
    fontSize: tokens.fontSizeBase200,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    color: tokens.colorNeutralForeground2,
  },
  compactIcon: {
    fontSize: "14px",
  },
  label: {
    color: tokens.colorNeutralForeground2,
  },
  value: {
    color: tokens.colorNeutralForeground1,
  },
  menuItem: {
    minWidth: "200px",
  },
  selectedIcon: {
    marginLeft: "auto",
    color: tokens.colorBrandForeground1,
  },
});

export default function DashboardFilter({
  ariaLabel,
  label,
  value,
  options,
  icon,
  onChange,
  size = "regular",
}: DashboardFilterProps) {
  const styles = useStyles();
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label ?? value;
  const compact = size === "compact";

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          aria-label={`${ariaLabel}: ${displayValue}`}
          className={mergeClasses(styles.trigger, compact && styles.triggerCompact)}
          appearance="outline"
          iconPosition="after"
          icon={<ChevronDownRegular />}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {icon && (
              <span className={mergeClasses(styles.icon, compact && styles.compactIcon)}>
                {icon}
              </span>
            )}
            {label && <span className={styles.label}>{label}:</span>}
            <span className={styles.value}>{displayValue}</span>
          </span>
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {options.map((option) => (
            <MenuItem
              key={option.value}
              className={styles.menuItem}
              onClick={() => onChange(option.value)}
            >
              {option.label}
              {option.value === value && <CheckmarkRegular className={styles.selectedIcon} />}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
