"use client";

interface DashboardGridProps {
  children: React.ReactNode;
}

export default function DashboardGrid({
  children,
}: DashboardGridProps) {
  return (
    <div
      className="
        grid
        grid-cols-1
        xl:grid-cols-2
        gap-6
        w-full
      "
    >
      {children}
    </div>
  );
}