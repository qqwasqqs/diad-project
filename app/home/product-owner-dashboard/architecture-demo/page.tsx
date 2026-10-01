"use client";

import Link from "next/link";

import { useProductOwnerMainView } from "@/hooks/useProductOwnerDashboardEndpoints";
import { useDashboardFiltersStore } from "@/store/dashboardFiltersStore";

interface DemoResultProps {
  title: string;
  isPending: boolean;
  error: Error | null;
  data: unknown;
}

function DemoResult({ title, isPending, error, data }: DemoResultProps) {
  return (
    <section className="rounded-lg border border-neutral-300 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {isPending ? (
        <p>Loading this request…</p>
      ) : error ? (
        <p role="alert" className="text-red-700">{error.message}</p>
      ) : (
        <pre className="max-h-96 overflow-auto rounded bg-neutral-50 p-3 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}

export default function ProductOwnerArchitectureDemoPage() {
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);
  const { metrics, adoption, quality } = useProductOwnerMainView({
    period,
    businessUnit,
    project,
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Link href="/home/product-owner-dashboard" className="text-blue-700 underline">
          Product Owner dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Product Owner endpoint architecture demo</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Each panel has its own React Query request. Local design mode serves
          illustrative JSON through the planned POST endpoints. The objects below
          are the adapter output consumed by the page.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <DemoResult
          title="Metrics"
          isPending={metrics.isPending}
          error={metrics.error}
          data={metrics.data}
        />
        <DemoResult
          title="Adoption and engagement"
          isPending={adoption.isPending}
          error={adoption.error}
          data={adoption.data}
        />
        <DemoResult
          title="Experience and response quality"
          isPending={quality.isPending}
          error={quality.error}
          data={quality.data}
        />
      </div>
    </main>
  );
}
