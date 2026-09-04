"use client";

import { Children, ReactNode } from "react";

export interface DashboardPanelSection {
  id: string;
  title?: string;
  /*
    Action for this region alone. A segmented panel can hold two separately
    addressable elements, so the action belongs to the region, not the panel.
  */
  action?: ReactNode;
  /*
    Relative width of this region. Regions share the panel in proportion to
    their weights, so { 2, 1 } gives a two-thirds / one-third split. Omitted
    weights count as 1, which keeps regions equal by default.
  */
  weight?: number;
}

interface DashboardPanelProps {
  template: "single" | "segmented";
  title?: string;
  /* Action for the panel as a whole, rendered beside its title. */
  actions?: ReactNode;
  /* Supplemental panel control, rendered below the content. */
  footer?: ReactNode;
  sections?: DashboardPanelSection[];
  children: ReactNode;
  className?: string;
}

export default function DashboardPanel({
  template,
  title,
  actions,
  footer,
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
        {(title || actions) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            {title && (
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            )}
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        )}
        <div className="px-5 pb-4 pt-2">{children}</div>
        {footer && (
          <div className="flex justify-end px-3 pb-2">{footer}</div>
        )}
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
      {(title || actions) && !shouldUseSectionTitles && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      {/*
        Regions sit side by side only where each still has usable width. Below
        that they stack full width, so a narrow region does not squeeze its
        content into an unreadable column.
      */}
      <div
        className="grid w-full grid-cols-1 xl:[grid-template-columns:var(--panel-cols)]"
        style={
          {
            "--panel-cols": sectionList
              .map((section) => `minmax(0, ${section.weight ?? 1}fr)`)
              .join(" "),
          } as React.CSSProperties
        }
      >
        {sectionList.map((section, index) => {
          const regionChild = childArray[index] ?? null;
          const isLastSection = index === sectionList.length - 1;

          return (
            <div key={section.id} className="min-w-0 bg-white">
              {(section.title || section.action) && (
                <div className="flex min-h-[28px] items-start justify-between gap-3 px-4 pt-3">
                  {section.title ? (
                    <span className="text-sm font-medium text-slate-700">
                      {section.title}
                    </span>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  {section.action && (
                    <div className="shrink-0">{section.action}</div>
                  )}
                </div>
              )}
              <div
                className={[
                  "px-4 pb-4 pt-2",
                  // Divider follows the layout: a rule between stacked regions,
                  // a rule beside them once they sit side by side.
                  !isLastSection
                    ? "border-b border-slate-200 xl:border-b-0 xl:border-r xl:pr-4"
                    : "",
                ].join(" ")}
              >
                {regionChild}
              </div>
            </div>
          );
        })}
      </div>
      {footer && <div className="flex justify-end px-3 pb-2">{footer}</div>}
    </div>
  );
}
