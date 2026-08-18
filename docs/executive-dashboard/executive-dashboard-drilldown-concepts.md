# Executive Dashboard Progressive Drill-Down Concepts

> **Superseded interaction note:** the Business-Unit-A-specific token-cost
> drawer in this historical concept is replaced by the section-level
> [Cost by BU and Project details](executive-dashboard-cost-by-bu-project-details.md).
> Retain this document and its images for traceability only; do not implement
> its selected-bar, unit-specific, or operational-investigation interactions.

The approved high-level dashboard remains unchanged:

- `executive-dashboard-concept-01.png`

Preferred new images:

1. `executive-dashboard-explanation-latency-02.png` — executive explanation after selecting End-to-End Latency.
2. `executive-dashboard-explanation-token-cost-01.png` — executive explanation after selecting Business Unit A in the token-cost chart.
3. `operational-investigation-token-cost-01.png` — protected technical-owner investigation reached from the cost explanation.

`executive-dashboard-explanation-latency-01.png` is a superseded draft retained non-destructively. Version 02 corrects one background legend typo.

## Interaction model

### Layer 1: Executive summary

The existing dashboard stays concise and attention-oriented. It is the starting context for the new screens and was not edited during this work.

### Layer 2: Executive explanation

Selecting a KPI or chart mark opens a right-side drawer while preserving the executive dashboard and its filters in the background. The drawer explains:

- the selected value and scope;
- change versus the comparison period;
- the trend;
- ranked business contributors;
- telemetry coverage and freshness;
- why the metric may require attention;
- the controlled transition to technical analysis.

The drawer does not display requests, traces, raw logs, prompts, responses, user identities, or PII.

### Layer 3: Operational investigation

The operational page is a separate, access-controlled technical-owner workspace. It adds application, model, token, and masked request evidence. It explicitly hides prompt/response content and limits the visible request list to selected samples.

## Confirmed facts

- The meeting extraction proposes progressive drill-down from portfolio to business domain, application, model, and request/trace level.
- The executive layer is intended to emphasize what requires attention, with technical evidence available in deeper views.
- Business unit/project, prompt tokens, completion tokens, total tokens, cost per request, request identifiers, and cache fields are represented in the available mappings.
- Infrastructure Cost is included in the executive persona mapping but has no exact generic field-description match.
- The meeting extraction says broader infrastructure cost is outside the current token-cost proposal scope.

## Likely interpretations

- A side drawer is an appropriate executive explanation pattern because it preserves context while progressively revealing aggregated evidence.
- Request-level details belong in a separate operational workspace rather than inside the executive drawer.
- Role-aware navigation is more consistent with the documented persona-specific dashboard architecture than placing identical detail on every persona's page.

## Assumptions used in the images

- All values, business units, projects, applications, models, comparisons, coverage percentages, and refresh times are illustrative.
- The selected 30-day period, Production environment, filters, drawer behavior, and buttons are interaction proposals.
- AI Token Cost means token-based AI consumption cost only.
- Infrastructure Cost is excluded from AI Token Cost and remains `DATA PENDING`.
- Request identifiers can be masked before display, and trace access can be restricted by role.

## Missing evidence

- Approved access-control rules and role mappings.
- Approved drill-down routes and cross-persona navigation behavior.
- Splunk query contracts for aggregate, model, application, and request-level data.
- Authoritative time windows, comparisons, targets, thresholds, and attention logic.
- Cost-pricing contracts, currency, discounts, effective dates, and treatment of retries or agent sub-calls.
- Data masking, retention, audit, and prompt/response-access requirements.
- Refresh, cache, pagination, loading, stale-data, error, and `Data Pending` behavior.

## Guardrails applied

- AI consumption dollars are always labeled `AI Token Cost` or `AI token cost`.
- The unqualified label `Total Cost` is not used.
- Infrastructure Cost is separate, pending, and explicitly excluded from AI token cost.
- Executive drawers show aggregated trends and ranked contributors only.
- The operational page uses masked request IDs and selected samples rather than a raw log dump.
- Prompts, responses, user identities, raw PII, secrets, and unmasked identifiers are not shown.
- Trace access is marked as role-controlled.
- Status is communicated with text/icons as well as color.
- Data coverage, freshness, and illustrative-value notices are visible.

## Final prompt set

### Prompt 1 — latency executive explanation

```text
Use case: ui-mockup
Asset type: desktop interaction-state mockup for an Executive AI Observability dashboard
Primary request: Generate a new separate image showing the executive explanation layer after an executive selects the "End-to-End Latency" card. Preserve the visual identity, proportions, navigation, filter context, and restrained enterprise style of Image 1. This is not a redesign of Image 1 and must not replace or alter the source file.
Input images: Image 1 is the approved high-level dashboard and the primary style/layout reference. Images 2-5 are secondary references for cards, tabs, a detail overlay, and reliability presentation. Treat every image as a reference only.
Scene/backdrop: full 16:9 desktop application screen with the approved dashboard visible in the background, slightly muted to focus attention on a right-side detail drawer. No browser chrome.
Style/medium: realistic shippable enterprise product UI, crisp sans-serif typography, light warm-gray canvas, white cards, dark forest-green navigation, thin borders, subtle shadows.
Composition/framing:
- Keep the dark green left navigation and the dashboard header visible.
- Preserve the filters "Last 30 days", "All business units", "All projects", and "All channels".
- Preserve the pale amber banner "ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION".
- Highlight the selected "End-to-End Latency" card with a clear outline and a small "Selected" label.
- Open a white right-side drawer occupying about 42% of the main content width. The drawer has a close X and scroll-safe spacing.
Drawer content, exact hierarchy and text:
- Eyebrow: "EXECUTIVE EXPLANATION"
- Title: "End-to-End Latency"
- Scope line: "All business units • All projects • Last 30 days"
- Status pill: "NEEDS ATTENTION"
- Main value: "P95 1.20 s"
- Comparison: "↑ 8.3% vs previous 30 days"
- Section: "30-day trend" with a clean indigo line chart and a final amber segment.
- Section: "What is driving the change"
- Insight callout: "P95 increased across 3 business units; Business Unit A is the largest contributor."
- Section: "Top contributors"
- Ranked rows:
  "1  Business Unit A    1.54 s    ↑ 12.1%"
  "2  Business Unit B    1.31 s    ↑ 6.4%"
  "3  Business Unit C    0.92 s    ↓ 2.8%"
- Small metadata cards: "Telemetry coverage 92%" and "Data refreshed 4 min ago"
- Guardrail note with shield icon: "Aggregated view — no request-level data"
- Secondary button: "Close"
- Primary button: "View technical analysis"
Color: muted green for favorable change, amber for attention, red only if clearly critical, indigo for neutral trends. Do not rely on color alone; pair status with text and icons.
Constraints: The detail drawer must remain executive-level and aggregated. Do not show request IDs, trace IDs, raw logs, error messages, user identities, prompts, response content, or operational tables. No corporate logo, no trademarks, no watermark. Do not add new executive KPIs. Render every specified label accurately and legibly.
```

Text correction applied to the preferred version:

```text
Use case: text-localization
Asset type: Executive Dashboard latency explanation interaction state
Input images: Image 1 is the edit target.
Primary request: Correct exactly one misspelled chart legend in the dimmed dashboard background. Replace the word "Sueries" next to the short blue legend line above the Session & Query Volume chart with the exact word "Sessions".
Constraints: Change only that one word. Preserve every other pixel, drawer label, value, chart, card, navigation item, banner, button, color, position, and spacing unchanged. Do not modify the executive explanation drawer. Do not add or remove any content. No watermark.
```

### Prompt 2 — AI token-cost executive explanation

```text
Use case: ui-mockup
Asset type: desktop interaction-state mockup for an Executive AI Observability dashboard
Primary request: Generate a new separate image showing the executive explanation layer after an executive selects "Business Unit A" in the "Cost by BU and Project" chart. Use the approved high-level dashboard in Image 1 as the primary visual reference without modifying its source file. The cost scope is AI token consumption only; infrastructure cost remains unavailable.
Input images: Image 1 is the approved high-level dashboard and primary style/layout reference. Images 2-5 are secondary references for dashboard density, modal/detail behavior, model-cost tables, and cost presentation. Treat every image as a reference only.
Scene/backdrop: full 16:9 desktop application screen with the approved dashboard visible in the background, slightly muted to focus attention on a right-side detail drawer. No browser chrome.
Style/medium: realistic shippable enterprise product UI, crisp sans-serif typography, light warm-gray canvas, white cards, dark forest-green navigation, thin borders, subtle shadows.
Composition/framing:
- Keep the dark green left navigation, dashboard header, and the filters "Last 30 days", "All business units", "All projects", and "All channels" visible.
- Preserve the pale amber banner "ILLUSTRATIVE VALUES — TARGETS AND THRESHOLDS PENDING VALIDATION".
- Highlight the "Business Unit A" bar inside "Cost by BU and Project" with a clear outline and small "Selected" label.
- Open a white right-side drawer occupying about 44% of the main content width, with a close X and scroll-safe spacing.
Drawer content, exact hierarchy and text:
- Eyebrow: "EXECUTIVE EXPLANATION"
- Title: "AI Token Cost — Business Unit A"
- Scope line: "Business Unit A • All projects • Last 30 days"
- Status pill: "NEEDS REVIEW"
- Main value: "$7.68K AI token cost"
- Comparison: "↑ 6.4% vs previous 30 days"
- Supporting KPI cards: "49.2% portfolio share", "$0.14 cost per request", and "54.8K requests"
- Section: "30-day AI token cost trend" with a clean indigo area or line chart and a final amber segment.
- Insight callout under title "What is driving the change": "Output tokens account for 62% of observed AI token cost."
- Section title: "Project breakdown"
- Compact ranked table with columns "Project", "AI Token Cost", "Share", "Cost / Request", "Change"
- Rows:
  "Project A1    $4.21K    54.8%    $0.15    ↑ 9.1%"
  "Project A2    $2.14K    27.9%    $0.12    ↑ 3.6%"
  "Project A3    $1.33K    17.3%    $0.10    ↓ 1.8%"
- Neutral data-state card: "Infrastructure Cost" and large value "DATA PENDING", with small note "Not included in AI token cost"
- Metadata: "Telemetry coverage 94%" and "Data refreshed 4 min ago"
- Guardrail note with shield icon: "Aggregated values — no request-level content"
- Secondary button: "Close"
- Primary button: "Open operational investigation"
Color: forest green and indigo for neutral business data, amber for attention, red only if clearly critical. Pair every color status with text or an icon.
Constraints: Always use the labels "AI Token Cost" or "AI token cost". Never use the unqualified label "Total Cost". Do not merge infrastructure cost into AI token cost. Keep Infrastructure Cost as DATA PENDING. Do not show individual requests, request IDs, raw logs, user identities, prompts, or response content in this executive drawer. No corporate logo, no trademarks, no watermark. Render every specified label accurately and legibly.
```

### Prompt 3 — operational AI token-cost investigation

```text
Use case: ui-mockup
Asset type: protected desktop operational investigation page for an AI Observability application
Primary request: Generate a new separate image showing the operational investigation layer reached from the "Open operational investigation" action in Image 1. Continue the same Business Unit A / Project A1 AI token-cost story, but transition from the executive drawer to a full technical-owner workspace. The page must be detailed enough for investigation while applying access, privacy, scope, and data-availability guardrails.
Input images: Image 1 is the preceding AI token-cost executive explanation and primary continuity reference. Image 2 is the approved high-level dashboard visual reference. Images 3-5 are secondary references for model breakdown, cost tables, and detail overlays. Treat all images as references only.
Scene/backdrop: full 16:9 desktop application page, no browser chrome.
Style/medium: realistic shippable enterprise product UI, crisp sans-serif typography, light warm-gray canvas, white cards, dark forest-green navigation, thin borders, subtle shadows, denser than the executive screen but still highly readable.
Composition/framing:
- Dark forest-green left navigation rail. Highlight "AI Observability". Include a small role badge: "TECHNICAL OWNER".
- Breadcrumb: "Executive Dashboard / Business Unit A / Project A1 / AI Token Cost"
- Header title: "AI Token Cost Investigation"
- Subtitle: "Application, model, token, and request-level evidence"
- Top-right controls: "Last 30 days", "Project A1", "Production", "All applications", and "Export".
- Directly below header, a pale blue shield banner reading exactly: "PROTECTED VIEW — PROMPT AND RESPONSE CONTENT HIDDEN"
- A small amber banner below it: "ILLUSTRATIVE VALUES — DATA CONTRACTS PENDING VALIDATION"
Top KPI row, five cards:
  1. "AI Token Cost" — "$4.21K"
  2. "Cost per Request" — "$0.15"
  3. "Total Tokens" — "18.4M"
  4. "Requests" — "28.4K"
  5. "Cache Hit Ratio" — "42%"
Main analysis row:
- Left two-thirds card title "AI token cost and token usage over time". Show a 30-day stacked area chart with legend "Input tokens" and "Output tokens", plus a thin indigo line labeled "AI token cost". Use an amber highlight on the latest increase.
- Right one-third card title "AI token cost by model". Use three horizontal bars:
  "Model A    $2.36K    56%"
  "Model B    $1.18K    28%"
  "Model C    $0.67K    16%"
- Inside the model card, a neutral state below the bars: "Infrastructure Cost — DATA PENDING" and "Not included in AI token cost".
Detailed table card title "Application and model breakdown"
Columns: "Application", "Model", "Input Tokens", "Output Tokens", "AI Token Cost", "Cost / Request", "Requests", "Change"
Rows:
  "Application A    Model A    6.8M    4.2M    $2.36K    $0.17    13.9K    ↑ 8.4%"
  "Application B    Model B    3.1M    2.0M    $1.18K    $0.13    9.1K    ↑ 2.1%"
  "Application C    Model C    1.4M    0.9M    $0.67K    $0.12    5.4K    ↓ 1.6%"
Bottom card title "Recent request samples"
Small note: "Masked identifiers • selected samples only"
Columns: "Request ID", "Time", "Model", "Input", "Output", "Total Tokens", "AI Token Cost", "Status", "Action"
Rows:
  "req_•••A17    10:42:18    Model A    682    341    1,023    $0.014    Success    Open trace"
  "req_•••B04    10:41:53    Model B    516    228    744    $0.010    Success    Open trace"
  "req_•••C92    10:40:27    Model A    1,104    584    1,688    $0.023    Error    Open trace"
Guardrail/footer strip:
- Shield icon and exact text: "Raw prompts and responses are not displayed. Request IDs are masked. Trace access requires an approved role."
- Metadata: "Telemetry coverage 94% • Data refreshed 4 min ago"
- Secondary action: "Back to executive explanation"
Color: forest green and indigo for neutral information, amber for attention, red only for error, gray for pending/unavailable. Pair colors with labels and icons.
Constraints: Use "AI Token Cost" or "AI token cost" for every monetary AI-consumption label. Never use the unqualified phrase "Total Cost". Never include infrastructure cost in AI token cost. Keep Infrastructure Cost as DATA PENDING. Never show prompt text, response text, user identities, raw PII, full unmasked request IDs, raw logs, or secrets. Show exactly three masked request samples, not a giant log dump. No corporate logo, no trademarks, no watermark. Render all specified labels clearly.
```

Text correction applied to the final operational version:

```text
Use case: text-localization
Asset type: protected operational AI token-cost investigation UI
Input images: Image 1 is the edit target.
Primary request: Correct exactly one corrupted text label in Image 1. In the neutral card below "AI token cost by model", replace the full current line "Infrastructure Cost — DATA MCING" with the exact text "Infrastructure Cost — DATA PENDING".
Constraints: Change only that one text line. Preserve every other pixel, label, value, table, chart, icon, position, color, spacing, navigation item, banner, and button unchanged. Do not alter the line "Not included in AI token cost". Do not add or remove any content. No watermark.
```

All images were generated with the built-in image-generation mode. No CLI fallback was used.
