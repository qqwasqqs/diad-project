"use client";
import {
 Button,
 Menu,
 MenuItem,
 MenuList,
 MenuPopover,
 MenuTrigger,
 makeStyles,
 tokens,
} from "@fluentui/react-components";
import {
 ChevronDownRegular,
 CheckmarkRegular,
} from "@fluentui/react-icons";
import { ReactNode } from "react";
interface DashboardFilterOption {
 value: string;
 label: string;
}
interface DashboardFilterProps {
 label?: string;
 value: string;
 options: DashboardFilterOption[];
 icon?: ReactNode;
 onChange: (value: string) => void;
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
 icon: {
   display: "flex",
   alignItems: "center",
   color: tokens.colorNeutralForeground2,
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
 label,
 value,
 options,
 icon,
 onChange,
}: DashboardFilterProps) {
 const styles = useStyles();
 const selectedOption = options.find(
   (option) => option.value === value
 );
 const displayValue = selectedOption?.label ?? value;
 return (
<Menu>
<MenuTrigger disableButtonEnhancement>
<Button
         className={styles.trigger}
         appearance="outline"
         iconPosition="after"
         icon={<ChevronDownRegular />}
>
<span className="flex min-w-0 items-center gap-1.5">
           {icon && (
<span className={styles.icon}>
               {icon}
</span>
           )}
           {label && (
<span className={styles.label}>
               {label}:
</span>
           )}
<span className={styles.value}>
             {displayValue}
</span>
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
             {option.value === value && (
<CheckmarkRegular
                 className={styles.selectedIcon}
               />
             )}
</MenuItem>
         ))}
</MenuList>
</MenuPopover>
</Menu>
 );
}