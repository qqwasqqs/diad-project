"use client";

import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import MetricContextTable from "../../shared/dashboard/MetricContextTable";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { ExecutiveDrawers } from "@/types/executiveDashboard";

/*
  Executive engagement detail.

  Reach and composition. Neutral evidence of activity, not a satisfaction,
  completion, health, or business-outcome claim, and it deliberately does not
  repeat the main view's sessions-versus-queries trend.
*/

interface EngagementDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: ExecutiveDrawers["sessionAndQueryVolume"];
}

export default function EngagementDrawer({
  open,
  onClose,
  content,
}: EngagementDrawerProps) {
  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerStatGrid columns={4} items={content?.summary ?? []} />

      <DrawerSection title="Engagement by channel">
        <MetricContextTable
          columns={[
            { id: "channel", header: "Channel" },
            { id: "queries", header: "Queries" },
            { id: "sessions", header: "Sessions" },
            { id: "share", header: "Share of queries" },
          ]}
          rows={(content?.channels ?? []).map((row) => ({
            id: row.id,
            cells: {
              channel: row.label,
              queries: row.queries,
              sessions: row.sessions,
              share: `${row.sharePct}%`,
            },
          }))}
          caption="Engagement by entry channel"
        />
      </DrawerSection>

      <DrawerSection title="Session depth distribution">
        <HorizontalBarList
          values={(content?.sessionDepth ?? []).map((row) => ({
            label: row.label,
            value: row.sharePct,
          }))}
          rowsPerColumn={4}
        />
      </DrawerSection>

      <DrawerSection title="Conversation context">
        <DrawerRowList rows={content?.conversationContext ?? []} />
      </DrawerSection>
    </DetailDrawer>
  );
}
