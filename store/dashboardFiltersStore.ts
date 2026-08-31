/*
  Global dashboard filter bar state.

  The filter bar lives in the shared header while the values it scopes are
  rendered by each dashboard page, so the selection is held in a store rather
  than threaded through the layout components between them.

  Holding the selection here does not apply it. A page opts in by reading these
  values and passing them to its own data hook.
*/

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface DashboardFilterOptionDef {
  value: string;
  label: string;
}

export const PERIOD_OPTIONS: DashboardFilterOptionDef[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const BUSINESS_UNIT_OPTIONS: DashboardFilterOptionDef[] = [
  { value: "all", label: "All business units" },
  { value: "a", label: "Business Unit A" },
  { value: "b", label: "Business Unit B" },
];

export const PROJECT_OPTIONS: DashboardFilterOptionDef[] = [
  { value: "all", label: "All projects" },
  { value: "a1", label: "Project A1" },
  { value: "b1", label: "Project B1" },
];

export const CHANNEL_OPTIONS: DashboardFilterOptionDef[] = [
  { value: "all", label: "All channels" },
  { value: "web", label: "Web" },
  { value: "api", label: "API" },
  { value: "mobile", label: "Mobile" },
];

export interface DashboardFiltersState {
  period: string;
  businessUnit: string;
  project: string;
  channel: string;

  setPeriod: (value: string) => void;
  setBusinessUnit: (value: string) => void;
  setProject: (value: string) => void;
  setChannel: (value: string) => void;
  reset: () => void;
}

const initialState = {
  period: "30d",
  businessUnit: "all",
  project: "all",
  channel: "all",
};

export const useDashboardFiltersStore = create<DashboardFiltersState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPeriod: (period) => set({ period }, false, "setPeriod"),
      setBusinessUnit: (businessUnit) =>
        set({ businessUnit }, false, "setBusinessUnit"),
      setProject: (project) => set({ project }, false, "setProject"),
      setChannel: (channel) => set({ channel }, false, "setChannel"),
      reset: () => set({ ...initialState }, false, "reset"),
    }),
    { name: "DashboardFiltersStore" },
  ),
);
