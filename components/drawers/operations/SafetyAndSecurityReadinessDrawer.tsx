"use client";

import type { ReactNode } from "react";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Safety and security readiness detail.

  Reports which evaluator and test outputs are usable. The illustrative MLflow
  value is neutral: not a favorable state and not a threshold result. This is not
  an incident, breach, attack, or remediation view.
*/

interface SafetyAndSecurityReadinessDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["safetyAndSecurityReadiness"];
  icons?: Record<string, ReactNode>;
}

export default function SafetyAndSecurityReadinessDrawer({
  open,
  onClose,
  content,
  icons,
}: SafetyAndSecurityReadinessDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerSection title="Readiness matrix">
        <DrawerRowList
          rows={content?.readiness ?? []}
          icons={icons}
          variant="prominent"
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
