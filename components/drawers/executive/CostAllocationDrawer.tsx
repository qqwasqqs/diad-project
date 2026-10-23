"use client";

import DetailDrawer from "../../shared/dashboard/DetailDrawer";
import MetricContextTable from "../../shared/dashboard/MetricContextTable";
import DrawerRowList from "../DrawerRowList";
import DrawerSection from "../DrawerSection";
import DrawerStatGrid from "../DrawerStatGrid";
import type { MetricRow } from "@/types/dashboard";
import type {
  ExecutiveCostItem,
  ExecutiveDrawers,
} from "@/types/executiveDashboard";

/*
  Executive cost allocation detail.

  Portfolio AI token cost. Never labelled total cost, and never inclusive of
  Infrastructure Cost, which has no approved source and stays a separate signal.
*/

interface CostAllocationDrawerProps {
  open: boolean;
  onClose: () => void;
  content?: ExecutiveDrawers["costByBusinessUnit"];
  // Falls back to the main view's items when the drawer supplies none.
  allocation: ExecutiveCostItem[];
}

export default function CostAllocationDrawer({
  open,
  onClose,
  content,
  allocation,
}: CostAllocationDrawerProps) {
  const items = content?.allocation?.length ? content.allocation : allocation;
  const infrastructure = content?.infrastructureCost;

  return (
    <DetailDrawer open={open} onClose={onClose} content={content} size="wide">
      <DrawerStatGrid items={content?.portfolio ?? []} />

      {/* Descending allocation. Each project stays a subset of its parent. */}
      <DrawerSection title="Allocation by business unit">
        <MetricContextTable
          columns={[
            { id: "unit", header: "Business unit" },
            { id: "cost", header: "Token cost" },
            { id: "project", header: "Displayed project" },
            { id: "projectCost", header: "Project subset" },
          ]}
          rows={[...items]
            .sort((a, b) => b.totalCost - a.totalCost)
            .map((item) => ({
              id: item.name,
              cells: {
                unit: item.name,
                cost: `$${item.totalCost.toFixed(2)}K`,
                project: item.topProjectName,
                projectCost: `$${item.topProjectCost.toFixed(2)}K`,
              },
            }))}
          caption="Attributed token cost by business unit"
        />
      </DrawerSection>

      <DrawerSection title="Separate signal">
        <DrawerRowList
          rows={[infrastructure].filter((row): row is MetricRow => Boolean(row))}
        />
      </DrawerSection>
    </DetailDrawer>
  );
}
