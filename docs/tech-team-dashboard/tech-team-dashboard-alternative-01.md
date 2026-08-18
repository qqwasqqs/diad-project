# Technical Teams Dashboard Alternative 01

![Technical Teams Dashboard alternative](tech-team-dashboard-alternative-02.png)

## Approval status

This is an alternative main-view concept produced in response to Approval Gate
1 feedback. It revises the information hierarchy and presentation only. It does
not begin the step-9 calculation audit or any detail-view design.
The approval candidate is `tech-team-dashboard-alternative-02.png`; version 01
is retained as the pre-review generation for traceability.

## Design decision

The original concept correctly reused the shared dashboard shell and displayed
KPIs assigned to Technical Teams, but its top summary strip and full-width
safety strip were visually close to the Executive Dashboard. This alternative
keeps cross-persona consistency while making the Technical Teams main view a
diagnostic workspace rather than an executive summary with extra charts.

### What changes

1. The five-card `Technical health` row is replaced by one integrated
   `Request-path health` panel. It gives component-latency trends the largest
   area and keeps throughput, inference errors, pipeline duration, and
   indexing/AI-service latency beside them as diagnostic context.
2. `Cost per Request` moves into `Capacity and efficiency`, beside token usage
   and the unresolved capacity/cache definitions.
3. The full-width `Safety and security` strip becomes a compact
   `Evaluator readiness and security tests` panel. This changes the emphasis
   from executive risk posture to whether technical evaluators and test results
   are usable.
4. `Failure localization` and `AI and model quality` retain prominent chart
   space because they answer engineering investigation questions.

### What remains unchanged

- The Executive Dashboard's green navigation shell, typography, white-card
  system, color roles, pending-state language, and top controls.
- The exact top controls and order: `Last 30 days`, `All business units`,
  `All projects`, `All channels`, and `Export`.
- The source baseline, 41-row mapped KPI inventory, feasibility classifications,
  seven-metric source conflict, and filter limitations documented in
  `tech-team-dashboard-concept-01.md`.
- Illustrative-value labeling and the rule that missing telemetry is never zero.

## Information architecture and persona questions

| Reading order | Section | Technical question | Treatment |
|---|---|---|---|
| 1 | Request-path health | Where is request-path performance changing, and is the issue synchronous or asynchronous? | Multi-series latency trend plus four diagnostic context values. |
| 2 | Failure localization | Which workload currently has the highest failure rate? | Eight service-specific bars in two columns. |
| 3 | Capacity and efficiency | What are requests consuming, what do they cost, and which capacity definitions are not ready? | Two illustrative values and three precise pending states. |
| 4 | AI and model quality | Are compatible evaluator scores changing together? | Three 1-5 trend series and two scale-separated supporting values. |
| 5 | Evaluator readiness and security tests | Which evaluator/test results are usable versus pending? | Compact four-row readiness panel. |

## Main-view content

### Request-path health

- Trend series: `End-to-End P95`, `Model Response avg`, `Retrieval avg`, and
  `Tool Call avg`, all displayed in milliseconds on one explicitly labeled
  illustrative chart.
- Diagnostic values: `Request Throughput`, `Inference Error Rate`,
  `Pipeline Duration`, and `Indexing / AI Services`.
- The panel must say that component times are not additive because request
  paths and tool calls may overlap or repeat.

### Failure localization

- Pipeline Failure Rate
- Job Failure Rate
- Inference Error Rate
- API Service Error Rate
- Training Failure Rate
- Indexing Failure Rate
- Transcription Failure Rate
- Translation Failure Rate

### Capacity and efficiency

- Cost per Request
- Token Usage / Request
- Token Throughput: `DEFINITION PENDING`
- Available Token Limit: `DEFINITION PENDING`
- Cache Hit Ratio: `FORMULA PENDING`

### AI and model quality

- Shared 1-5 trend axis: Groundedness, Response Coherence, Relevance Quality.
- Separate supporting values: Retrieval Quality on a 1-5 scale and MLflow
  Correctness on a 0-1 scale.
- Remaining mapped quality metrics stay behind the future `View all quality
  evaluations` interaction; no clickability is approved yet.

### Evaluator readiness and security tests

- Safety Evaluation Score: `CALCULATION PENDING`.
- MLflow Safety Score: illustrative `0.91 / 1`.
- PII Leakage (Agent Only): `DATA PENDING`.
- UPIA: `TEST RESULTS PENDING`.

## Evidence classification

### Confirmed facts

- Technical Teams need deep-dive application latency, throughput, error rates,
  system-bottleneck, AI/model-quality, and tracing information.
- All visible metric names come from the supplied Technical Team mapping.
- The user requires the same top filters as the Executive Dashboard.
- Shared metric definitions should not change across personas.

### Likely interpretations

- A Technical Team landing view should lead with diagnostic relationships and
  localization rather than a row of business-summary outcomes.
- Safety/security is most actionable here as evaluator/test readiness unless
  Technical Teams are confirmed owners of risk decisions.
- Cost is more meaningful to Technical Teams when paired with token and
  capacity behavior.

### Assumptions

- All numeric values and chart shapes remain illustrative.
- P95 is used for End-to-End Latency; the other component series use the mapped
  average calculations.
- The latency trend uses milliseconds, including `1,200 ms` for the illustrative
  End-to-End value, so compatible units share one axis.
- Layout, chart type, icons, colors, and exact spacing remain design proposals.

### Missing evidence

- Validated values, time buckets, comparison periods, timezone, rounding, and
  alert thresholds.
- Approved event grain, retries, deduplication, and eligible populations.
- Confirmed correlation of business unit, project, and channel across every
  visible metric.
- Live Splunk/API response contracts and evaluator coverage/freshness.
- Approved definitions for Token Throughput, Available Token Limit, Cache Hit
  Ratio, Safety Evaluation Score, PII Leakage aggregation, and UPIA success.
- Confirmation that Technical Teams own safety investigation rather than only
  evaluator implementation and observability.

## Risks and verification

- A denser diagnostic screen may take longer to scan than the original. Verify
  with Technical Team users using time-to-answer tests for bottleneck, failure,
  and evaluator-readiness questions.
- A shared latency axis is valid only if every series is normalized to
  milliseconds and uses clearly stated aggregation. Verify the API contract
  and chart calculation before implementation.
- Compacting safety may understate it if Technical Teams own security response.
  Confirm role ownership with the client before final hierarchy approval.
- Global filters may not apply to every panel. Verify attribution coverage and
  show `FILTER BREAKDOWN UNAVAILABLE` when a selected scope cannot be honored.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: polished desktop alternative main view for a Technical Teams AI Observability Dashboard
Primary request: Generate a new original, realistic, implementation-ready Technical Teams Dashboard that is structurally more diagnostic than the Executive Dashboard. Keep the established visual family and exact shared filters, but do not use an executive-style row of five KPI cards and do not use a full-width executive-style safety strip.
Input images: Image 1 is the Executive Dashboard reference for visual family only. Image 2 is the earlier Technical Teams concept for content continuity only. Do not copy either layout exactly.
Scene/backdrop: full 16:9 landscape desktop application screen, light warm-gray canvas, white cards, thin neutral borders, subtle shadows, rounded corners, ample whitespace.
Style/medium: shippable enterprise product UI, crisp sans-serif typography, restrained, credible, data-dense but readable, no browser chrome.
Composition/framing:
- Narrow dark forest-green left navigation rail. Selected item reads exactly "Technical Teams Dashboard". Secondary items read "AI Observability" and "Data Observability". Bottom item reads "Need Help?".
- Header reads exactly "AI Observability — Technical Teams Dashboard". Subtitle reads exactly "Diagnose request paths, failures, evaluator quality, and capacity".
- Top-right controls, in this exact order: "Last 30 days", "All business units", "All projects", "All channels", "Export".
- Directly below the header, a slim pale amber banner reads exactly "ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION".
- First and largest full-width card is titled "Request-path health". Do not create a row of KPI cards. Use the left two-thirds for a clean 30-day multi-line latency trend with a vertical axis labeled "Latency (ms)" and four exact series labels: "End-to-End P95", "Model Response avg", "Retrieval avg", "Tool Call avg". Use illustrative trajectories centered around 1200 ms, 760 ms, 210 ms, and 180 ms. Add the small note "Component times are not additive". Use the right third for four compact diagnostic rows with exact labels and values: "Request Throughput 42.8 req/s", "Inference Error Rate 1.14%", "Pipeline Duration avg 42 s", "Indexing / AI Services avg 620 ms".
- Second row has two cards. Left card, about 60% width, is titled "Failure localization". Show eight compact horizontal bars in two readable columns with exact labels and illustrative values: "Pipeline 0.7%", "Job 0.9%", "Inference 1.14%", "API Service 0.8%", "Training 0.5%", "Indexing 0.6%", "Transcription 0.4%", "Translation 0.3%". No target line. Right card, about 40% width, is titled "Capacity and efficiency" and shows five rows: "Cost per Request $0.12", "Token Usage / Request 2.4K tokens", "Token Throughput DEFINITION PENDING", "Available Token Limit DEFINITION PENDING", "Cache Hit Ratio FORMULA PENDING".
- Third row has two cards. Left card, about 65% width, is titled "AI and model quality". Show a small 30-day line chart with three compatible 1-5 series labeled exactly "Groundedness", "Response Coherence", and "Relevance Quality". Add two supporting values: "Retrieval Quality 4.0 / 5" and "MLflow Correctness 0.88 / 1". Add a subtle action "View all quality evaluations". Do not show a Hallucination percentage.
- Right card, about 35% width, is titled "Evaluator readiness and security tests". Show four compact rows with exact text: "Safety Evaluation Score CALCULATION PENDING", "MLflow Safety Score 0.91 / 1", "PII Leakage (Agent Only) DATA PENDING", and "UPIA TEST RESULTS PENDING". This must look like evaluator readiness, not an executive risk-posture summary.
Color palette: dark forest-green navigation; warm-white canvas; white cards; charcoal text; indigo/blue/cyan for neutral charts; muted green only for favorable movement; amber for attention or pending; red only for explicit risk.
Text (verbatim): use every label and value above exactly.
Constraints: Keep every required label fully visible and correctly spelled. Color must not be the only status cue. Use only mapped Technical Team metrics. Do not add an executive pulse, technical-health KPI strip, full-width safety strip, composite health score, uptime/SLA, CPU, memory, adoption, feedback, governance, recommendations, environment/model filters, real company names, raw prompts/responses, or raw error messages. Do not represent pending data as zero. No corporate logo, trademarks, watermark, stock imagery, or browser chrome.
```

The intended generation mode is the built-in image-generation tool. Both input
images are references, not edit targets.
