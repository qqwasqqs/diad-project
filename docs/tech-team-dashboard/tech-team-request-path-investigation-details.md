# Technical Teams Request-path Investigation Detail

> **Superseded preliminary proposal.** Retained for traceability only. The current Gate 3 design is the focused right-side [Request-path latency chart drawer](tech-team-request-path-latency-chart-drawer.md), which does not combine this chart with the separate Request-path diagnostics list.

**Source element:** Request-path health panel in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Gate 3 image candidate:** [`tech-team-request-path-investigation-details.png`](tech-team-request-path-investigation-details.png)  
**Calculation specifications:** [Request-path health](main-view-calculations/request-path-health-chart.md), [Request Throughput](main-view-calculations/request-throughput.md), [Inference Error Rate](main-view-calculations/inference-error-rate.md), [Pipeline Duration](main-view-calculations/pipeline-duration.md), and [Indexing / AI Services Latency](main-view-calculations/indexing-ai-services-latency.md).

## Design decision

Open an in-persona dedicated detail page titled **Request-path investigation** from the Request-path health panel. It adds comparative history and component-specific context; it does not reproduce the landing-panel summary alone.

The selected filters remain visible: `Last 30 days`, `All business units`, `All projects`, and `All channels`. A breadcrumb returns to **Technical Teams Dashboard**. The same illustrative-values banner remains visible.

## Supported detail content

| Detail element | Purpose | Fields / calculation | Feasibility |
|---|---|---|---|
| Four-series 30-day trend | Compare user-visible P95 with model, retrieval, and tool averages. | Main-view request-path calculations. | Supported by series; bucket/timezone pending. |
| P95, model, retrieval, and tool summary table | Give units and latest illustrated values without creating a new health score. | Same four calculations; ms. | Supported. |
| Tool-call breakdown | Identify a tool whose average latency warrants investigation. | `tool_name`, `tool_call_latency`; `AVG(tool_call_latency)` by tool. | Derivable; operation/request roll-up pending. |
| Model completion-status context | Separate timing observations by logged terminal completion status. | `completion_status`, `model_latency_ms`. | Partially supported; status population pending. |
| Async workload indicators | Keep Pipeline Duration and Indexing / AI Services visible but separate from request-path timing. | `duration`; indexing/service-duration candidates. | Supported / partially supported. |
| Valid-sample and filter-coverage state | Prevent a visually precise trend from concealing incomplete telemetry. | Aggregate counts/coverage contract not supplied. | `DATA PENDING` until supplied. |

## Excluded content and persona boundary

Do not show raw correlation-ID traces, request IDs, prompts, responses, tool arguments/results, raw error messages, model/deployment comparisons, infrastructure utilization, executive business outcomes, or alert remediation instructions. Those require other evidence, a different persona, or the separate Splunk-native developer dashboard.

## Layout and interaction proposal

1. Header, breadcrumb, preserved filters, and illustrative-values banner.
2. A full-width Request-path latency card with a larger four-series chart in milliseconds, its legend, and the required **Component times are not additive** note.
3. A compact comparison table for the four series with calculation type (`P95` or `avg`), illustrated latest value, and a visible `FILTER BREAKDOWN UNAVAILABLE` state where attribution fails.
4. Two side-by-side diagnostic cards: **Tool call latency by tool** and **Model response by completion status**. These add source-specific context rather than a duplicate chart.
5. A full-width **Async workloads** card for Pipeline Duration avg and Indexing / AI Services avg. It explicitly says these values are not summed into request latency; indexing remains `DATA PENDING` if a cross-service composite cannot be defined.

## Assumptions

- The dedicated page pattern is a proposed Technical Teams interaction; it is not an approved navigation contract.
- The trend uses 30 daily buckets, one timezone, and millisecond values.
- Tool-call rows are grouped by `tool_name`; the number of calls and the request-level roll-up rule remain unapproved.
- `completion_status` is shown only as logged context, not an invented error classification.
- All values and charts in the image are illustrative; no status threshold is implied.

## Missing evidence and client questions

- Which timestamp, timezone, bucket boundary, percentile interpolation, precision, and eligible terminal outcomes apply to every series?
- How are multiple model, retrieval, and tool operations correlated and rolled up per request? How are retries/deduplications handled?
- Is `tool_name` safe and useful to display, and what does one model `completion_status` record represent?
- Which sources can honor business-unit, project, and channel filters? How should partial attribution be represented?
- Which indexing/AI services belong in the indicator and what aggregation is approved?
- Should the page link out to the Splunk-native correlation-ID trace view, and which user roles may use it?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: polished desktop detail page in an AI Observability web application
Primary request: Create an original Technical Teams “Request-path investigation” detail page that continues the approved Technical Teams Dashboard visual family. This is a new in-persona diagnostic page, not an Executive screen and not a raw trace viewer.
Scene/backdrop: 16:9 desktop application screen; light warm-gray canvas, white cards, thin neutral borders, rounded corners, subtle shadows, no browser chrome.
Style/medium: shippable enterprise product UI; crisp sans-serif typography; credible and technical but readable.
Composition/framing:
- Narrow dark forest-green left navigation rail. Selected label exactly “Technical Teams Dashboard”; other labels exactly “AI Observability”, “Data Observability”, and bottom “Need Help?”.
- Header breadcrumb exactly “Technical Teams Dashboard / Request-path investigation”. Main title exactly “Request-path investigation”. Subtitle exactly “Compare user-visible latency with instrumented component timings”.
- Top-right controls exactly, in order: “Last 30 days”, “All business units”, “All projects”, “All channels”, “Export”.
- Below header, a slim pale-amber banner exactly: “ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION”.
- First large card title exactly “Request-path latency”. Show a larger 30-day multi-line trend in milliseconds with exact legend labels “End-to-End P95”, “Model Response avg”, “Retrieval avg”, “Tool Call avg”. Use illustrated paths around 1,200 ms, 760 ms, 210 ms, and 180 ms. Include exact note “Component times are not additive”.
- Under the trend, show a compact comparison table with exact columns “Metric”, “Calculation”, “Illustrative latest”, “Filter coverage”. Rows use the four series; calculations are “P95” for End-to-End and “avg” for others. Use values “1,200 ms”, “760 ms”, “210 ms”, “180 ms”. Filter coverage says “PENDING” without numeric percentages.
- Next row: two cards. Left title exactly “Tool call latency by tool”; short horizontal bars for generic labels “Tool A”, “Tool B”, “Tool C”, with latency values only. Right title exactly “Model response by completion status”; show rows “Completed”, “Filtered”, “Timeout”, with illustrated averages and no error count.
- Bottom full-width card title exactly “Async workloads”. Two side-by-side rows: “Pipeline Duration avg 42 s” and “Indexing / AI Services avg 620 ms”; below them exact note “Async workload timing is not added to request-path latency”. Add a small neutral outlined label “CROSS-SERVICE AGGREGATION PENDING” next to the indexing row.
Color palette: dark forest-green nav, warm white canvas, white cards, charcoal text; indigo/blue/cyan chart lines; amber only for pending states; no red risk state.
Text (verbatim): retain every quoted label above exactly.
Constraints: Preserve filters and Technical Teams persona. Do not show raw prompts, responses, correlation IDs, request IDs, tool arguments/results, raw error messages, CPU, memory, uptime/SLA, executive metrics, model/deployment filters, real company names, real tool names, percentages for pending coverage, target lines, recommendations, watermark, or browser chrome. Do not imply component times sum to End-to-End Latency. Do not present pending data as zero.
```

## Gate 3 review checklist

- Confirm Technical Teams scope, visual continuity, exact labels, preserved filters, illustrative banner, and the non-additive note.
- Confirm that all proposed detail content adds diagnostic information without exposing raw traces or sensitive payloads.
- Confirm that `PENDING` and `CROSS-SERVICE AGGREGATION PENDING` remain explicit non-numeric states.
