"use client";
import {
  Text,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ReactNode } from "react";
const useStyles = makeStyles({
  root: {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    padding: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
    boxShadow: tokens.shadow2,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalL,
  },
  titleContainer: {
    minWidth: 0,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
  },
  description: {
    display: "block",
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  content: {
    width: "100%",
    minWidth: 0,
  },
});
interface DashboardSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}
export default function DashboardSection({
  title,
  description,
  actions,
  children,
}: DashboardSectionProps) {
  const styles = useStyles();
  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <Title3 className={styles.title}>
            {title}
          </Title3>
          {description && (
            <Text className={styles.description}>
              {description}
            </Text>
          )}
        </div>
        {actions && (
          <div className={styles.actions}>
            {actions}
          </div>
        )}
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </section>
  );
}