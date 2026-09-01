import type { ReactNode } from "react";
import { Text } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";

/*
  Short, always-visible note rendered beneath a panel's content.

  The note carries a qualification the reader needs in order to read the panel
  correctly, so it is deliberately not a tooltip or disclosure: hiding it until
  a user seeks it out would let a correct chart be read the wrong way.

  Unlike the compact metric components, this uses `children`. The note is
  variable-length prose with no fixed anatomy of named parts.
*/

export interface PanelFootnoteProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function PanelFootnote({
  children,
  icon,
  className = "",
}: PanelFootnoteProps) {
  return (
    <div
      className={`flex items-center gap-2 pt-3 ${className}`.trim()}
      style={{ color: "var(--color-chart-axis)" }}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center">
        {icon ?? <Info16Regular />}
      </span>

      <Text size={200}>{children}</Text>
    </div>
  );
}
