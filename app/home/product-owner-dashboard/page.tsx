"use client";

import { useState } from "react";

import DashboardPage from "@/components/shared/dashboard/DashboardPage";
import DashboardGrid from "@/components/shared/dashboard/DashboardGrid";
import DashboardPanel from "@/components/shared/dashboard/DashboardPanel";
import DashboardDrawer from "@/components/shared/dashboard/DashboardDrawer";
import { MetricCard } from "@/components/shared/dashboard/MetricCard";
import { PositiveNegativeBar } from "@/components/shared/charts/PositiveNegativeBar";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import DashboardLineChart from "@/components/shared/dashboard/DashboardLineChart";
import DataPendingCard from "@/components/shared/dashboard/DataPendingCard";
import {
  ArrowSync24Regular,
  Clock24Regular,
  DataTrending24Regular,
  Hourglass24Regular,
  Person24Regular,
  ThumbLike24Regular,
} from "@fluentui/react-icons";

const channelMixValues = [
  { label: "Web", value: 52 },
  { label: "Teams", value: 28 },
  { label: "Mobile", value: 14 },
  { label: "API", value: 6 },
];

const channelMixComparison = [
  { label: "Web", queriesPerSession: 4.8, avgSession: "8.6 min" },
  { label: "Teams", queriesPerSession: 4.2, avgSession: "7.9 min" },
  { label: "Mobile", queriesPerSession: 3.7, avgSession: "6.4 min" },
  { label: "API", queriesPerSession: 5.1, avgSession: "9.1 min" },
];

export default function ProductOwnerDashboard() {
  const [channelMixOpen, setChannelMixOpen] = useState(false);

  return (
    <>
      <DashboardPage
        title="AI Observability — Product Owner Dashboard"
        description="Understand adoption, user experience, and business value"
      >
        <DashboardGrid>
        <DashboardPanel
          template="segmented"
          title="Product experience pulse"
          sections={[
            { id: "session-query-volume" },
            { id: "user-satisfaction-rate" },
            { id: "end-to-end-latency" },
            { id: "workflow-completion" },
          ]}
          className="xl:col-span-2"
        >
          <MetricCard
            icon={<DataTrending24Regular className="text-blue-600" />}
            title="Session & Query Volume"
            className="h-[170px] metricCard-violet"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                316K <span className="text-4xl font-normal">queries</span>
              </div>
            }
            supportingContent={
              <span className="text-xs text-neutral-500">
                68K sessions • 4.6 queries/session
              </span>
            }
          />
          <MetricCard
            icon={<ThumbLike24Regular className="text-green-600" />}
            title="User Satisfaction Rate"
            className="h-[170px] metricCard-success"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                84% <span className="text-4xl font-normal">positive</span>
              </div>
            }
            supportingContent={
              <PositiveNegativeBar
                positive={84}
                negative={16}
              />
            }
          />
          <MetricCard
            icon={<ArrowSync24Regular className="text-green-600" />}
            title="End-to-End Latency"
            className="h-[170px] metricCard-success"
            primaryContent={
              <div className="text-[38px] leading-none font-semibold text-neutral-950">
                P95 <span className="text-4xl font-normal">1.20 s</span>
              </div>
            }
          />
          <MetricCard
            icon={<Hourglass24Regular className="text-amber-700" />}
            title="Workflow Completion"
            className="h-[170px] metricCard-warning"
            primaryContent={
              <div className="text-[30px] leading-none font-semibold text-slate-500">
                DATA PENDING
              </div>
            }
            supportingContent={
              <span className="text-xs text-neutral-500">
                Completion event and formula not supplied
              </span>
            }
          />
        </DashboardPanel>



        <DashboardPanel template="single" title="Adoption and engagement">
          <DashboardLineChart
            description=""
            height={320}
            supportingStatsVariant="productOwner"
            series={[
              {
                id: "sessions",
                label: "Sessions",
                color: "#3b82f6",
                yAxis: "left",
                points: [
                  { x: "Apr 20", y: 15000 },
                  { x: "Apr 21", y: 14000 },
                  { x: "Apr 22", y: 18000 },
                  { x: "Apr 23", y: 21000 },
                  { x: "Apr 24", y: 22000 },
                  { x: "Apr 25", y: 24000 },
                  { x: "Apr 26", y: 26000 },
                  { x: "Apr 27", y: 28000 },
                  { x: "Apr 28", y: 25000 },
                  { x: "Apr 29", y: 30000 },
                  { x: "Apr 30", y: 27000 },
                  { x: "May 1", y: 29000 },
                  { x: "May 2", y: 32000 },
                  { x: "May 3", y: 30000 },
                  { x: "May 4", y: 33000 },
                  { x: "May 5", y: 31000 },
                ],
              },
              {
                id: "queries",
                label: "Queries",
                color: "#8b5cf6",
                yAxis: "right",
                points: [
                  { x: "Apr 20", y: 12000 },
                  { x: "Apr 21", y: 16000 },
                  { x: "Apr 22", y: 19000 },
                  { x: "Apr 23", y: 20000 },
                  { x: "Apr 24", y: 24000 },
                  { x: "Apr 25", y: 26000 },
                  { x: "Apr 26", y: 28000 },
                  { x: "Apr 27", y: 30000 },
                  { x: "Apr 28", y: 34000 },
                  { x: "Apr 29", y: 36000 },
                  { x: "Apr 30", y: 39000 },
                  { x: "May 1", y: 42000 },
                  { x: "May 2", y: 43000 },
                  { x: "May 3", y: 47000 },
                  { x: "May 4", y: 50000 },
                  { x: "May 5", y: 52000 },
                ],
              },
            ]}
            axes={[
              {
                id: "left",
                tickFormatter: (value) => `${Math.round(value / 1000)}K`,
              },
              {
                id: "right",
                tickFormatter: (value) => `${Math.round(value / 1000)}K`,
              },
            ]}
            supportingStats={[
              {
                id: "queries-per-session",
                icon: <Person24Regular aria-hidden="true" />,
                value: "4.6",
                text: "queries/session",
                iconColor: "#4f46e5",
              },
              {
                id: "avg-session",
                icon: <Clock24Regular aria-hidden="true" />,
                value: "8.2 min",
                text: "avg session",
                iconColor: "#2563eb",
              },
            ]}
          />
        </DashboardPanel>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setChannelMixOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setChannelMixOpen(true);
            }
          }}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <DashboardPanel template="single" title="Channel mix">
            <HorizontalBarList values={channelMixValues} />
            <div className="mt-2 text-[11px] font-medium text-neutral-500">
              Illustrative channel breakdown
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel template="single" title="Experience and response quality">
          <DashboardLineChart
            height={300}
            supportingStatsVariant="productOwner"
            supportingStatsTemplate="right"
            series={[
              {
                id: "groundedness",
                label: "Groundedness",
                color: "#4f46e5",
                points: [
                  { x: "Apr 20", y: 4.1 },
                  { x: "Apr 22", y: 4.3 },
                  { x: "Apr 24", y: 4.2 },
                  { x: "Apr 26", y: 4.4 },
                  { x: "Apr 28", y: 4.3 },
                  { x: "Apr 30", y: 4.2 },
                  { x: "May 2", y: 4.5 },
                  { x: "May 4", y: 4.4 },
                  { x: "May 6", y: 4.3 },
                  { x: "May 8", y: 4.5 },
                  { x: "May 10", y: 4.6 },
                  { x: "May 12", y: 4.5 },
                ],
              },
              {
                id: "relevance-quality",
                label: "Relevance Quality",
                color: "#7c3aed",
                points: [
                  { x: "Apr 20", y: 3.8 },
                  { x: "Apr 22", y: 3.9 },
                  { x: "Apr 24", y: 4.0 },
                  { x: "Apr 26", y: 4.1 },
                  { x: "Apr 28", y: 4.0 },
                  { x: "Apr 30", y: 4.2 },
                  { x: "May 2", y: 4.1 },
                  { x: "May 4", y: 4.2 },
                  { x: "May 6", y: 4.1 },
                  { x: "May 8", y: 4.3 },
                  { x: "May 10", y: 4.2 },
                  { x: "May 12", y: 4.4 },
                ],
              },
              {
                id: "intent-resolution",
                label: "Intent Resolution",
                color: "#0f766e",
                points: [
                  { x: "Apr 20", y: 3.2 },
                  { x: "Apr 22", y: 3.4 },
                  { x: "Apr 24", y: 3.3 },
                  { x: "Apr 26", y: 3.5 },
                  { x: "Apr 28", y: 3.4 },
                  { x: "Apr 30", y: 3.6 },
                  { x: "May 2", y: 3.7 },
                  { x: "May 4", y: 3.6 },
                  { x: "May 6", y: 3.8 },
                  { x: "May 8", y: 3.7 },
                  { x: "May 10", y: 3.9 },
                  { x: "May 12", y: 3.8 },
                ],
              },
            ]}
            axes={[
              {
                id: "left",
                domain: [0, 5],
                tickFormatter: (value) => `${value}`,
              },
            ]}
            supportingStats={[
              {
                id: "retrieval-quality",
                value: "4.0 / 5",
                text: "Retrieval Quality",
              },
              {
                id: "task-adherence",
                value: "4.2 / 5",
                text: "Task Adherence",
              },
            ]}
          />
        </DashboardPanel>

        <DashboardPanel title="Feature usage evidence" template="single">
          <DataPendingCard description="No feature identifier or usage formula supplied" />
        </DashboardPanel>

      </DashboardGrid>
    </DashboardPage>

    <DashboardDrawer
      open={channelMixOpen}
      title="Channel engagement patterns"
      onClose={() => setChannelMixOpen(false)}
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
        Illustrative values
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 text-xs font-semibold text-slate-700">
          Channel share evolution
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          {channelMixValues.map((item) => (
            <div key={item.label} className="grid grid-cols-[34px_minmax(0,1fr)_32px] items-center gap-2">
              <span className="font-medium text-slate-700">{item.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="text-right font-medium text-slate-700">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold text-slate-700">
          Engagement by entry channel
        </div>

        <div className="mt-3 rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-slate-200 bg-slate-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <span>Channel</span>
            <span>Queries / session</span>
            <span>Avg session</span>
          </div>

          {channelMixComparison.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-b border-slate-200 px-2 py-2 text-xs text-slate-700 last:border-b-0"
            >
              <span>{item.label}</span>
              <span>{item.queriesPerSession}</span>
              <span>{item.avgSession}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold text-slate-700">
          Calculation context
        </div>

        <ul className="mt-2 space-y-2 text-xs text-slate-600">
          <li>
            <span className="font-medium text-slate-700">Share evolution:</span> classified queries by entry channel and day.
          </li>
          <li>
            <span className="font-medium text-slate-700">Queries / session:</span> distinct query key per assigned channel session.
          </li>
          <li>
            <span className="font-medium text-slate-700">Session duration:</span> max minus min timestamp per approved session rule.
          </li>
          <li>
            <span className="font-medium text-slate-700">Channel assignment:</span> pending validation for entry-channel mapping.
          </li>
        </ul>
      </div>
    </DashboardDrawer>
    </>
  );
}
