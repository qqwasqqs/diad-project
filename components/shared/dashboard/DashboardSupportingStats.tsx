import { makeStyles, Text, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

export interface DashboardSupportingStatItem {
  id: string;
  icon?: ReactNode;
  value: string;
  text: string;
}

interface DashboardSupportingStatsProps {
  items: DashboardSupportingStatItem[];
}

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px 28px",
    paddingTop: "18px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    flex: "1 1 220px",
    color: tokens.colorNeutralForeground1,
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    color: tokens.colorNeutralForeground1,
    flexShrink: 0,
  },
  value: {
    fontSize: "2.1rem",
    lineHeight: 1.1,
    fontWeight: 700,
    color: tokens.colorNeutralForeground1,
  },
  text: {
    fontSize: "1.1rem",
    lineHeight: 1.2,
    color: tokens.colorNeutralForeground1,
  },
});

export default function DashboardSupportingStats({
  items,
}: DashboardSupportingStatsProps) {
  const styles = useStyles();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          {item.icon && <span className={styles.icon}>{item.icon}</span>}
          <Text as="span" className={styles.value}>
            {item.value}
          </Text>
          <Text as="span" className={styles.text}>
            {item.text}
          </Text>
        </div>
      ))}
    </div>
  );
}
