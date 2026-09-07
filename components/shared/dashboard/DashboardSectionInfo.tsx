"use client";

import { Button, Tooltip } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";

export interface DashboardSectionInfoContent {
  description: string;
  kpiCategories: readonly string[];
}

interface DashboardSectionInfoProps {
  sectionTitle: string;
  content: DashboardSectionInfoContent;
}

export default function DashboardSectionInfo({
  sectionTitle,
  content,
}: DashboardSectionInfoProps) {
  return (
    <Tooltip
      content={
        <div>
          <div>{content.description}</div>
          <div className="mt-1">
            <strong>KPI categories:</strong> {content.kpiCategories.join(", ")}
          </div>
        </div>
      }
      relationship="description"
      positioning="above-end"
      withArrow
    >
      <Button
        appearance="subtle"
        size="small"
        icon={<Info16Regular aria-hidden="true" />}
        aria-label={"About " + sectionTitle}
      />
    </Tooltip>
  );
}
