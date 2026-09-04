"use client";

import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DetailDrawer from "../../DetailDrawer";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import type { ExecutiveDrawers } from "@/types/executiveDashboard";

/*
  Executive pulse detail.

  Consolidated for the whole pulse section. Session & Query Volume and Cost per
  Request stay summary-only and hand off to the sections that own them, rather
  than growing a competing trend or allocation view here.
*/

interface ExecutivePulseDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: ExecutiveDrawers["pulse"];
}

export default function ExecutivePulseDrawer({
  open,
  onClose,
  content,
}: ExecutivePulseDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerSection title="End-to-End Latency">
        <DrawerRowList rows={content?.latency ?? []} />
      </DrawerSection>

      <DrawerSection title="API response-status distribution">
        <HorizontalBarList
          values={(content?.apiStatus ?? []).map((row) => ({
            label: row.label,
            value: row.sharePct,
          }))}
          rowsPerColumn={3}
        />
      </DrawerSection>

      <DrawerSection title="User Feedback">
        <DrawerRowList rows={content?.feedback ?? []} />
      </DrawerSection>

      {/*
        Handoffs, not links: these two signals are owned by their own sections,
        and no navigation target is approved yet.
      */}
      <DrawerSection title="Detail lives in these sections">
        <DrawerRowList
          rows={(content?.handoffs ?? []).map((handoff) => ({
            id: handoff.id,
            label: handoff.label,
            value: handoff.destination,
          }))}
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
