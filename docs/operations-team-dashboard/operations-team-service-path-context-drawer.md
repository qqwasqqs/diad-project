# Service-path Runtime Context Drawer

**Source:** right runtime-context list. **Interaction:** right-side drawer.
**Drawer image:** [Runtime Context](operations-team-service-path-context-drawer-01.png).

## Design

Shows Request Throughput `42.8 req/s`, Pipeline Duration `42 s`, Indexing/AI
Services `620 ms`, and Token Throughput `DEFINITION PENDING`, with a compact
calculation/context table. It does not aggregate unlike units into health.

### Evidence boundary

The first three values are illustrative and derivable/partially supported. Token
Throughput has non-equivalent mapped alternatives. No capacity, quota, cost,
alerts, or infrastructure utilization appears.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a non-scrolling drawer. Header "RUNTIME CONTEXT DETAILS"; title "Service-path runtime context"; subtitle "Throughput and asynchronous workload context"; close X and illustrative banner. Four cards/rows: "Request Throughput" "42.8 req/s"; "Pipeline Duration avg" "42 s"; "Indexing / AI Services avg" "620 ms"; "Token Throughput" "DEFINITION PENDING". Card "Calculation context" table columns "Metric", "Calculation", "Unit", "Filter coverage". Values: Request Throughput "Distinct requests / second" "req/s"; Pipeline Duration "Average final run duration" "s"; Indexing / AI Services "Service-specific average" "ms"; Token Throughput "Definition required" "—"; all coverage "PENDING". Bottom note "These measures are not a combined health score". No latency chart, capacity, quota, cost, utilization, raw records, scrollbar, or browser chrome.
```
