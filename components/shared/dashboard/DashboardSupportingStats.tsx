import { makeStyles, Text, tokens } from "@fluentui/react-components";
import type { ReactNode } from "react";

export type DashboardSupportingStatsVariant = "default" | "productOwner";
export type DashboardSupportingStatsLayout = "bottom" | "right";

export interface DashboardSupportingStatItem {
  id: string;
  icon?: ReactNode;
  value: string;
  text: string;
  iconColor?: string;
  /*
    Colours the value and its label to the series they belong to, where the
    design calls for it. Left unset, both stay on the default body colour: a
    series colour is only meaningful when the stat maps to a plotted series.
  */
  valueColor?: string;
  textColor?: string;
}

interface DashboardSupportingStatsProps {
  items: DashboardSupportingStatItem[];
  variant?: DashboardSupportingStatsVariant;
  layout?: DashboardSupportingStatsLayout;
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
    color: "var(--color-text-primary)",
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    color: "var(--color-text-primary)",
    flexShrink: 0,
  },
  value: {
    fontSize: "2.1rem",
    lineHeight: 1.1,
    fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  text: {
    fontSize: "1.1rem",
    lineHeight: 1.2,
    color: "var(--color-text-primary)",
  },
  productOwnerRoot: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px 32px",
    paddingTop: "14px",
    marginTop: "2px",
  },
  productOwnerItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    minWidth: 0,
    flex: "0 1 auto",
    color: "var(--color-text-primary)",
  },
  productOwnerIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    border: `1.5px solid currentColor`,
    padding: "4px",
    flexShrink: 0,
    color: tokens.colorBrandForeground1,
  },
  productOwnerValue: {
    fontSize: "1.9rem",
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: "-0.04em",
    color: "var(--color-text-primary)",
  },
  productOwnerText: {
    fontSize: "1.1rem",
    lineHeight: 1.25,
    color: "var(--color-chart-axis)",
    fontWeight: 500,
  },
  rightRoot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    width: "150px",
    flexShrink: 0,
    paddingLeft: "8px",
    "@media (max-width: 768px)": {
      width: "100%",
      paddingLeft: 0,
      paddingTop: "12px",
    },
  },
  rightItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    color: "var(--color-text-primary)",
    paddingTop: "14px",
    marginTop: "12px",
  },
  rightItemHasDivider: {
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  rightItemFirst: {
    paddingTop: 0,
    marginTop: 0,
    borderTop: "none",
  },
  rightIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    color: "var(--color-text-primary)",
    flexShrink: 0,
  },
  rightValue: {
    fontSize: "1.6rem",
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: "-0.04em",
    color: "var(--color-text-primary)",
  },
  rightText: {
    fontSize: "0.9rem",
    lineHeight: 1.25,
    color: "var(--color-chart-axis)",
    fontWeight: 500,
    marginBottom: "4px",
    textAlign: "center",
  },
});

export default function DashboardSupportingStats({
  items,
  variant = "default",
  layout = "bottom",
}: DashboardSupportingStatsProps) {
  const styles = useStyles();

  if (!items || items.length === 0) {
    return null;
  }

  const isProductOwner = variant === "productOwner";
  const isRight = layout === "right";

  const rootClass = isRight
    ? styles.rightRoot
    : isProductOwner
      ? styles.productOwnerRoot
      : styles.root;

  const itemClass = isRight
    ? styles.rightItem
    : isProductOwner
      ? styles.productOwnerItem
      : styles.item;

  const iconClass = isRight
    ? styles.rightIcon
    : isProductOwner
      ? styles.productOwnerIcon
      : styles.icon;

  const valueClass = isRight
    ? styles.rightValue
    : isProductOwner
      ? styles.productOwnerValue
      : styles.value;

  const textClass = isRight
    ? styles.rightText
    : isProductOwner
      ? styles.productOwnerText
      : styles.text;

  return (
    <div className={rootClass}>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={[
            itemClass,
            isRight && index === 0 ? styles.rightItemFirst : "",
            isRight && index > 0 ? styles.rightItemHasDivider : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isRight ? (
            <>
              <Text
                as="span"
                className={textClass}
                style={item.textColor ? { color: item.textColor } : undefined}
              >
                {item.text}
              </Text>
              <Text
                as="span"
                className={valueClass}
                style={item.valueColor ? { color: item.valueColor } : undefined}
              >
                {item.value}
              </Text>
            </>
          ) : (
            <>
              {item.icon && (
                <span
                  className={iconClass}
                  style={item.iconColor ? { color: item.iconColor } : undefined}
                >
                  {item.icon}
                </span>
              )}
              <Text
                as="span"
                className={valueClass}
                style={item.valueColor ? { color: item.valueColor } : undefined}
              >
                {item.value}
              </Text>
              <Text
                as="span"
                className={textClass}
                style={item.textColor ? { color: item.textColor } : undefined}
              >
                {item.text}
              </Text>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
