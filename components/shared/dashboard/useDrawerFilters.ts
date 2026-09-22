"use client";

import { useState } from "react";

import type { DashboardFilterValues } from "./DashboardFilters";

const initialDrawerFilters: DashboardFilterValues = {
  period: "30d",
  businessUnit: "all",
  project: "all",
  app: "all",
};

export default function useDrawerFilters() {
  const [values, onChange] = useState(initialDrawerFilters);

  return { values, onChange };
}
