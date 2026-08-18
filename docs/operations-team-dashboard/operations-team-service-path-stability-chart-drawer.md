# Service-path Stability Chart Drawer

**Source:** left latency chart. **Interaction:** right-side drawer.
**Drawer image:** [Service-path Stability](operations-team-service-path-stability-chart-drawer-01.png).

## Design

Displays four summary cards, enlarged 30-day millisecond trend, a metric table,
and the required `Component times are not additive` rule. It excludes the
right-side runtime-context list.

### Evidence boundary

End-to-End uses P95; Model Response, Retrieval, and Tool Call use averages.
Eligible populations, timezone, buckets, retries, and attribution are pending.
No traces, request IDs, or raw component calls appear.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a wide non-scrolling drawer. Header "SERVICE-PATH STABILITY DETAILS"; title "Service-path stability"; subtitle "End-to-End P95 · Model Response avg · Retrieval avg · Tool Call avg"; close X and illustrative banner. Four cards: "End-to-End P95" "1.20 s"; "Model Response avg" "760 ms"; "Retrieval avg" "210 ms"; "Tool Call avg" "180 ms". Card "Latency trend" with four lines, exact legend labels, axis "Latency (ms)", and note "Component times are not additive". Card "Metric calculation" table columns "Metric", "Calculation", "Illustrative latest", "Filter coverage"; P95 for End-to-End and avg for other rows; all coverage "PENDING". Bottom note "Time bucket, timezone, and attribution pending validation". No right-list metrics, traces, request IDs, raw errors, thresholds, scrollbar, or browser chrome.
```
