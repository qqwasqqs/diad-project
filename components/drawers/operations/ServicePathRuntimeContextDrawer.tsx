"use client";

import type { ReactNode } from "react";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import DrawerStatGrid from "../DrawerStatGrid";
import type { OperationsDrawers } from "@/types/operationsDashboard";

/*
  Service-path runtime context detail.

  The four right-side measures only. The latency chart is deliberately absent:
  it is a separate element with its own drawer. Units and populations stay
  separate, and these are not a combined health score.
*/

interface ServicePathRuntimeContextDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: OperationsDrawers["servicePathRuntimeContext"];
  icons?: Record<string, ReactNode>;
}

export default function ServicePathRuntimeContextDrawer({
  open,
  onClose,
  content,
  icons,
}: ServicePathRuntimeContextDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerStatGrid columns={4} items={content?.summary ?? []} icons={icons} />
    </DetailDrawer>
  );
}
