"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import {
  DEFAULT_FILTER_SELECTION,
  useDashboardFiltersStore,
} from "@/store/dashboardFiltersStore";
import type { DashboardFilterSelection } from "@/types/dashboard";

/**
 * The scope currently selected in the global filter bar.
 *
 * Every persona dashboard opts in to the bar the same way — read the selection,
 * hand it to the page's data hook, which keys its cache on it so changing a
 * filter refetches for that scope. That made the same four lines appear in each
 * page, and a dimension added to the bar had to be remembered in all of them.
 * Reading the selection lives here instead, so a page states the intent once.
 *
 * A selection belongs to the dashboard it was made on and does not travel:
 * arriving at a dashboard always starts from the unfiltered default, because a
 * carried-over scope silently narrows a view the reader did not narrow, and
 * every number on the page would be a subset without anything announcing it.
 *
 * The defaults are returned as soon as the route changes, rather than after the
 * effect below has run, so the first render already asks for the right scope.
 * Returning the previous dashboard's selection for even one render would send a
 * request for a scope the reader is no longer in.
 */
export function useSelectedDashboardFilters(): DashboardFilterSelection {
  const pathname = usePathname();

  /*
    Selected individually rather than as one object literal: a selector
    returning a fresh object compares unequal on every store update, which
    re-renders the page whatever changed.
  */
  const period = useDashboardFiltersStore((state) => state.period);
  const businessUnit = useDashboardFiltersStore((state) => state.businessUnit);
  const project = useDashboardFiltersStore((state) => state.project);
  const app = useDashboardFiltersStore((state) => state.app);
  const scopePath = useDashboardFiltersStore((state) => state.scopePath);
  const enterScope = useDashboardFiltersStore((state) => state.enterScope);

  useEffect(() => {
    enterScope(pathname);
  }, [pathname, enterScope]);

  const belongsToThisPath = scopePath === pathname;

  return useMemo(
    () =>
      belongsToThisPath
        ? { period, businessUnit, project, app }
        : { ...DEFAULT_FILTER_SELECTION },
    [belongsToThisPath, period, businessUnit, project, app],
  );
}
