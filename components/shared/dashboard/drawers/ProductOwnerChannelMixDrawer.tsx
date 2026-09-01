import DashboardDrawer from "../DashboardDrawer";

type ChannelMixValue = {
  label: string;
  value: number;
};

type ChannelMixComparisonItem = {
  label: string;
  queriesPerSession: number;
  avgSession: string;
};

type ProductOwnerChannelMixDrawerProps = {
  open: boolean;
  onClose: () => void;
  values: ChannelMixValue[];
  comparison: ChannelMixComparisonItem[];
};

export default function ProductOwnerChannelMixDrawer({
  open,
  onClose,
  values,
  comparison,
}: ProductOwnerChannelMixDrawerProps) {
  return (
    <DashboardDrawer
      open={open}
      title="Channel engagement patterns"
      onClose={onClose}
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
        Illustrative values
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 text-xs font-semibold text-slate-700">
          Channel share evolution
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          {values.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[34px_minmax(0,1fr)_32px] items-center gap-2"
            >
              <span className="font-medium text-slate-700">{item.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="text-right font-medium text-slate-700">
                {item.value}%
              </span>
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

          {comparison.map((item) => (
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
            <span className="font-medium text-slate-700">Share evolution:</span>{" "}
            classified queries by entry channel and day.
          </li>
          <li>
            <span className="font-medium text-slate-700">Queries / session:</span>{" "}
            distinct query key per assigned channel session.
          </li>
          <li>
            <span className="font-medium text-slate-700">Session duration:</span>{" "}
            max minus min timestamp per approved session rule.
          </li>
          <li>
            <span className="font-medium text-slate-700">Channel assignment:</span>{" "}
            pending validation for entry-channel mapping.
          </li>
        </ul>
      </div>
    </DashboardDrawer>
  );
}
