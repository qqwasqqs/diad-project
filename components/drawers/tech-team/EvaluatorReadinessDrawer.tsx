"use client";

import type { ReactNode } from "react";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import type { MetricRow } from "@/types/dashboard";
import type { TechTeamDashboardPayload } from "@/types/techTeamDashboard";

/*
  Evaluator readiness detail.

  Reports whether evaluator and test evidence is usable. It is not an incident,
  risk-posture, or release-decision view, and it exposes no evaluator reasons,
  sensitive values, prompts, or attack content.
*/

interface EvaluatorReadinessDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: TechTeamDashboardPayload["drawers"]["evaluatorReadiness"];
  rows: MetricRow[];
  icons?: Record<string, ReactNode>;
}

export default function EvaluatorReadinessDrawer({
  open,
  onClose,
  content,
  rows,
  icons,
}: EvaluatorReadinessDrawerProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      content={content}
      size="wide"
      showScopeFilters
    >
      <DrawerSection title="Evaluator readiness matrix">
        <DrawerRowList rows={rows} icons={icons} />
      </DrawerSection>
    </DetailDrawer>
  );
}
