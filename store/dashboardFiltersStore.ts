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

import type {
  DashboardFilterOption,
  DashboardFilterSelection,
} from "@/types/dashboard";

/*
  The one dimension whose values are fixed rather than data-derived.

  A period is a request parameter — the contract's relative `timeRange` — so its
  values are decided here. The business unit, project, and app values are the
  distinct values present in the source, so they are fetched from
  `/api/dashboard/filters` by `useDashboardFilterOptions` instead.
*/
export const PERIOD_OPTIONS: DashboardFilterOption[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export interface DashboardFiltersState extends DashboardFilterSelection {
  /*
    The route the current selection belongs to.

    A selection is scoped to the dashboard it was made on: each persona answers
    a different question, so carrying one dashboard's scope onto the next shows
    a narrowed view the reader never asked for, and the bar is the only thing
    that says so. Recording the route lets a selection be discarded when the
    reader moves on, and lets a reader of a stale selection ignore it before the
    reset has been applied.
  */
  scopePath: string | null;

  setPeriod: (value: string) => void;
  setBusinessUnit: (value: string) => void;
  setProject: (value: string) => void;
  setApp: (value: string) => void;
  // Adopts `path`, clearing the selection when it belongs to another route.
  enterScope: (path: string) => void;
  reset: () => void;
}

/*
  Every dimension but the period starts at `all`, the one value that needs no
  confirmation from the source: it is the unfiltered scope.
*/
export const DEFAULT_FILTER_SELECTION: DashboardFilterSelection = {
  period: "30d",
  businessUnit: "all",
  project: "all",
  app: "all",
};

const initialState = {
  ...DEFAULT_FILTER_SELECTION,
  scopePath: null as string | null,
};

export const useDashboardFiltersStore = create<DashboardFiltersState>()(
  devtools(
    (set) => ({
      ...initialState,

      setPeriod: (period) => set({ period }, false, "setPeriod"),
      setBusinessUnit: (businessUnit) =>
        set({ businessUnit }, false, "setBusinessUnit"),
      setProject: (project) => set({ project }, false, "setProject"),
      setApp: (app) => set({ app }, false, "setApp"),

      enterScope: (scopePath) =>
        set(
          (state) =>
            state.scopePath === scopePath
              ? state
              : { ...DEFAULT_FILTER_SELECTION, scopePath },
          false,
          "enterScope",
        ),

      reset: () => set({ ...initialState }, false, "reset"),
    }),
    { name: "DashboardFiltersStore" },
  ),
);
