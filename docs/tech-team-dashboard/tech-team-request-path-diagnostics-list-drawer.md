# Technical Teams Request-path Diagnostics List Drawer

**Source element:** the four-row diagnostic list inside **Request-path health**: Request Throughput, Inference Error Rate, Pipeline Duration avg, and Indexing / AI Services avg.  
**Approved Gate 3 image:** [tech-team-request-path-diagnostics-list-drawer-01.png](tech-team-request-path-diagnostics-list-drawer-01.png)  
**Calculation authority:** [Request Throughput](main-view-calculations/request-throughput.md), [Inference Error Rate](main-view-calculations/inference-error-rate.md), [Pipeline Duration](main-view-calculations/pipeline-duration.md), and [Indexing / AI Services Latency](main-view-calculations/indexing-ai-services-latency.md).

## Design decision

Clicking the diagnostic list opens a compact right-side drawer. It deliberately excludes the four-series latency chart because that chart is a separate clickable element.

## Supported drawer content

| Drawer element | Evidence and purpose |
|---|---|
| Four summary cards | Request Throughput `42.8 req/s`, Inference Error Rate `1.14%`, Pipeline Duration avg `42 s`, Indexing / AI Services avg `620 ms`; illustrative only. |
| Diagnostic context table | Makes each metric’s calculation type, source context, and filter coverage explicit without placing incompatible units on one axis. |
| Async-workload notice | States that Pipeline and Indexing / AI Services are asynchronous and are not added to request-path latency. |
| Indexing aggregation notice | Shows `CROSS-SERVICE AGGREGATION PENDING`, rather than creating an unsupported composite definition. |

## Excluded content

No End-to-End/Model/Retrieval/Tool latency chart, raw error messages, request IDs, traces, tool results, model/deployment names, or threshold-based recommendations.

## Evidence classification

### Confirmed facts

- The four rows are visibly grouped together in the selected main view.
- Their units differ: requests per second, percent, seconds, and milliseconds.
- Pipeline and Indexing/AI Services are not additive parts of End-to-End request latency.

### Likely interpretation

A calculation/provenance drawer is more useful than a single trend because the four metrics have incompatible grains and units.

### Assumptions

The drawer fits within one viewport without scrolling. A later evidence-supported time-series interaction may be designed for a specific metric.

### Missing evidence and client questions

What request/run/operation grain, retries/deduplication, timestamp/timezone, global-filter attribution, coverage, rounding, and no-data behavior apply to each metric? Which services may contribute to the Indexing / AI Services average?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Technical Teams main view with a right-side detail drawer
Primary request: Create a compact non-scrolling drawer for the Request-path diagnostics list only. Keep the selected Technical Teams main view dimmed behind it.
Input images: Image 1 is the Technical Teams main-view reference; Image 2 is the Executive drawer reference for interaction pattern only.
Composition: Right drawer title exactly “Request-path diagnostics”. Subtitle exactly “Throughput, inference errors, and asynchronous workload timing”. Show exact banner “ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION”. Show four cards exactly: “Request Throughput” “42.8 req/s”; “Inference Error Rate” “1.14%”; “Pipeline Duration avg” “42 s”; “Indexing / AI Services avg” “620 ms”. Then a table titled exactly “Metric context” with columns “Metric”, “Calculation type”, “Source context”, “Filter coverage”. Its rows are exactly: Request Throughput / “Distinct requests / second” / “UI Layer / Backend API” / “PENDING”; Inference Error Rate / “Error requests / requests” / “Azure OpenAI client” / “PENDING”; Pipeline Duration avg / “AVG(duration)” / “Azure Data Factory” / “PENDING”; Indexing / AI Services avg / “COMPOSITE PENDING” / “Multiple mapped services” / “PENDING”. Add two exact notices: “Async workload timing is not added to request-path latency” and “CROSS-SERVICE AGGREGATION PENDING”.
Constraints: No scrollbar. Do not show the latency chart, raw errors, request IDs, traces, model/deployment filters, thresholds, recommendations, or zero for pending data.
```
