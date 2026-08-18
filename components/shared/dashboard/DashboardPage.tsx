"use client";

import DashboardHeader from "./DashboardHeader";

interface DashboardPageProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function DashboardPage({
  title,
  description,
  children,
}: DashboardPageProps) {
  return (
    <div className="flex flex-col gap-6 p-6 w-full">
      <DashboardHeader
        title={title}
        description={description}
        showFilters
        showExport
      />

      {children}
    </div>
  );
}