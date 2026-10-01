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
  /*
    Decorative mark beside the note, defaulting to the info glyph. It is
    hidden from assistive technology because it repeats what the note says.
  */
  icon?: ReactNode;
  /*
    Interactive control in the mark's place, for a panel whose explanation is
    reached from the note itself. It takes the slot instead of `icon` and stays
    in the accessibility tree, because here the glyph is the control: a reader
    who cannot see it still has to be able to reach the explanation it opens.

    A panel offers one of the two, never both. Two identical glyphs where only
    one responds read as a single broken control.
  */
  control?: ReactNode;
  className?: string;
}

export default function PanelFootnote({
  children,
  icon = <Info16Regular />,
  control,
  className = "",
}: PanelFootnoteProps) {
  return (
    <div
      className={`flex items-center gap-2 pt-3 ${className}`.trim()}
      style={{ color: "var(--color-chart-axis)" }}
    >
      {control ? (
        <span className="flex shrink-0 items-center">{control}</span>
      ) : (
        icon && (
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {icon}
          </span>
        )
      )}

      <Text size={200}>{children}</Text>
    </div>
  );
}
