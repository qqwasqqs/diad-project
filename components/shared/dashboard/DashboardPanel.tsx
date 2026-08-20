"use client";

import { Children, ReactNode } from "react";

export interface DashboardPanelSection {
  id: string;
  title?: string;
}

interface DashboardPanelProps {
  template: "single" | "segmented";
  title?: string;
  sections?: DashboardPanelSection[];
  children: ReactNode;
  className?: string;
}

export default function DashboardPanel({
  template,
  title,
  sections,
  children,
  className = "",
}: DashboardPanelProps) {
  if (template === "single") {
    return (
      <div
        className={[
          "w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          className,
        ].join(" ")}
      >
        {title && (
          <div className="px-5 pt-4">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
        )}
        <div className="px-5 pb-4 pt-2">{children}</div>
      </div>
    );
  }

  const childArray = Children.toArray(children);
  const sectionList: DashboardPanelSection[] =
    sections && sections.length > 0
      ? sections
      : childArray.map((_, index) => ({
          id: `panel-section-${index}`,
        }));

  const sectionCount = Math.max(sectionList.length, 1);

  if (sections && childArray.length !== sections.length) {
    console.warn(
      "DashboardPanel: the number of child elements does not match the number of sections."
    );
  }

  // that the panel should hide the overall header when any section has its own title
  const shouldUseSectionTitles = sectionList.some((section) => section.title);

  return (
    <div
      className={[
        "w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      ].join(" ")}
    >
      {title && !shouldUseSectionTitles && (
        <div className="px-5 pt-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        </div>
      )}

      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${sectionCount}, minmax(0, 1fr))` }}
      >
        {sectionList.map((section, index) => {
          const regionChild = childArray[index] ?? null;
          const isLastSection = index === sectionList.length - 1;

          return (
            <div key={section.id} className="min-w-0 bg-white">
              {section.title && (
                <div className="px-4 pt-3">
                  <span className="text-sm font-medium text-slate-700">
                    {section.title}
                  </span>
                </div>
              )}
              <div
                className={[
                  "px-4 pb-4 pt-2",
                  !isLastSection ? "border-r border-slate-200 pr-4" : "",
                ].join(" ")}
              >
                {regionChild}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
