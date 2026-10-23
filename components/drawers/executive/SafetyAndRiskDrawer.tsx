"use client";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import type { ExecutiveDrawers } from "@/types/executiveDashboard";

/*
  Executive safety and risk detail.

  One drawer for the whole section rather than one per card. It reports what
  each signal can support: a PII flag is an evaluation result, not a confirmed
  breach, and no safety score is derived from category severity values.
*/

interface SafetyAndRiskDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: ExecutiveDrawers["safetyAndRisk"];
}

export default function SafetyAndRiskDrawer({
  open,
  onClose,
  content,
}: SafetyAndRiskDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerSection title="What each signal reports">
        <DrawerRowList rows={content?.signals ?? []} />
      </DrawerSection>
    </DetailDrawer>
  );
}
