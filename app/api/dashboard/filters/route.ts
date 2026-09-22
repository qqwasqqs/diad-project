/*
  Filter-bar options endpoint.

  The values the filter bar offers are data, not UI configuration: the business
  units, projects, and apps that actually appear in the source. This route is
  the single seam between the filter bar and that source, alongside the shared
  `/api/dashboard/metrics` and `/api/dashboard/timeseries` contract paths.

  In local design mode the options come from the static mock so the bar can be
  developed without external systems. Outside local design mode the real source
  is required: the route fails loudly rather than offering a list of scopes the
  data cannot actually be filtered by.

  `period` is not served here. It is a fixed request parameter — the contract's
  relative `timeRange` — rather than a set of values discovered in the data, so
  it stays a constant in the filter store.
*/

import { NextResponse } from "next/server";

import { mockFilterOptions } from "@/lib/dashboard/filterOptionsSource";
import { isLocalDesignModeServer } from "@/lib/localDesignMode";
import type { DashboardFilterOptions } from "@/types/dashboard";

/*
  Replace this with the approved source call.

  The implementation must return one entry per distinct value the source can be
  filtered by, each with the value sent back on `/api/dashboard/metrics` and
  `/api/dashboard/timeseries` and the label shown in the bar, led by the `all`
  entry. A generating search per dimension, for example:

    | tstats count where index=<approved> by <app field>
    | rename <app field> as value
    | eval label = value
    | sort label

  For applications the field is `application_name` ("Name of the owning
  application. Primary governance grouping"), whose values are the application
  names themselves, so `value` and `label` are the same string and no slugging
  is involved. Its OTEL equivalent comes from Hugo's old-to-new mapping, as do
  the other dimensions' field names.

  The mock's application list was supplied by the product owner rather than
  taken from a document, so the search is also the first check of it: an
  application the search does not return is one the bar should stop offering.

  Run it through a saved search with validated arguments, as the Splunk
  connection task requires — do not concatenate request values into SPL.

  Two rules matter more than the shape:

  - Offer a value only where the metrics endpoint can actually attribute it.
    A scope the bar offers but no metric can apply produces a dashboard of
    FILTER BREAKDOWN UNAVAILABLE rows, which reads as an outage.
  - Never fall back to the mock list here. An option list invented by the client
    is indistinguishable from one measured in the source.
*/
async function loadFromSource(): Promise<DashboardFilterOptions> {
  throw new Error(
    "Dashboard filter options source is not configured. Supply the approved " +
      "Splunk/API contract in loadFromSource, or run with local design mode enabled.",
  );
}

export async function GET() {
  try {
    const options = isLocalDesignModeServer()
      ? mockFilterOptions()
      : await loadFromSource();

    return NextResponse.json(options);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading filter options.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
