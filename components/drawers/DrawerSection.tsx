import type { ReactNode } from "react";

/*
  A titled block inside a detail drawer.

  Drawers are read top to bottom as a sequence of named blocks — the values, how
  they are calculated, what is still pending. This gives every block the same
  heading treatment so that sequence stays legible across dashboards.
*/

interface DrawerSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function DrawerSection({
  title,
  children,
  className = "",
}: DrawerSectionProps) {
  return (
    <section className={className}>
      <h4
        className="mb-2 text-sm font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}
