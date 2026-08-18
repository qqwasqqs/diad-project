# Executive Dashboard Main View — Presentation Guide

## Purpose and status

This guide provides a concise talk track for presenting the main view of the Executive Dashboard. It explains the intended information hierarchy without treating illustrative values, proposed interactions, or unresolved data contracts as confirmed production behavior.

The presentation should leave the audience with one central message:

> The main view gives executives a fast portfolio-level pulse, then provides enough context to understand adoption movement, cost ownership, and safety or security signals.

The dashboard contains four logical sections:

1. **Executive pulse**
2. **Adoption movement**
3. **Cost allocation**
4. **Safety and risk posture**

The adoption and cost sections appear side by side in the middle row, but they answer different executive questions and should be presented separately.

## Recommended presentation flow

| Step | On-screen focus | Presentation purpose | Suggested time |
|---|---|---|---:|
| 1 | Page title and whole dashboard | Establish the purpose of the main view | 15–20 seconds |
| 2 | Filters | Explain how the visible scope changes | 30–45 seconds |
| 3 | Executive pulse | Summarize the five headline signals | 45–60 seconds |
| 4 | Session and Query Volume | Explain adoption movement and context | 40–50 seconds |
| 5 | Cost by BU and Project | Explain cost allocation and ownership | 40–50 seconds |
| 6 | Safety and risk posture | Explain the three risk indicators precisely | 60–75 seconds |
| 7 | Whole dashboard | Close with the executive value of the design | 15–20 seconds |

The complete walkthrough should take approximately four to five minutes. If the dashboard is shown as one presentation slide, use progressive emphasis, a spotlight, or a zoomed duplicate of the same image for each step. Avoid showing every explanation at once.

## Refined talk track

### 1. Open with the purpose

**Point to the full dashboard.**

> This is the main view of the Executive Dashboard. It is designed to give an executive a clear portfolio-level view in one screen. The information is organized into four logical sections: the Executive pulse, adoption movement, cost allocation, and safety and risk posture. The first row shows what needs attention now, and the sections below add movement, ownership, and risk context.

If the concept banner is visible, add:

> The values shown in this concept are illustrative. Targets, thresholds, and several data contracts still require validation.

### 2. Establish the filter scope

**Point to the filters from left to right: Period, Business Unit, Project, and Channel.**

> The controls at the top establish the scope of the page. The period selects the reporting window. Business Unit scopes every KPI and chart that can be reliably attributed to that unit. The Project filter narrows the same view to an authorized project and should follow the selected business unit. The Channel filter supports documented channels such as web, Teams, mobile, and API.

Then state the filter limitation explicitly:

> A channel should behave as a global filter only when channel attribution is available or can be reliably correlated across every affected KPI. If that is not possible, the channel filter should be limited to adoption and session analysis. A metric that cannot support a selected filter should show an explicit unavailable or `Data Pending` state rather than an unfiltered portfolio value.

### 3. Present the Executive pulse

**Move across the five cards from left to right.**

> The Executive pulse provides one-row visibility into five headline signals. End-to-End Latency represents performance. API Error Rate represents reliability. Session and Query Volume represents adoption. User Feedback summarizes the positive and negative response signal. Cost per Request represents unit cost. Together, these cards give a quick answer to the question: where should an executive look next?

Use **five headline signals**, not **five classifications**. Feedback is a displayed signal, while the documented classification structure is not consistently one-to-one with these five cards.

Avoid explaining the full formula for every card during this main-view walkthrough. If asked, clarify that the latency concept uses request-level P95 and that all displayed figures are illustrative until connected to validated telemetry.

### 4. Explain adoption movement

**Point to the Session and Query Volume chart and then to the supporting values below it.**

> The adoption movement section uses one dual-series trend chart. It shows sessions and queries over the selected period so an executive can see whether activity is increasing, decreasing, or changing direction. The supporting values add context through queries per session and average session length.

Add the interpretation boundary:

> This chart shows engagement movement. It does not, by itself, prove user satisfaction, successful task completion, or business value.

Do not call this two charts. It is one chart with two series: Sessions and Queries. The supporting values are calculated over the selected period; they are not additional chart series.

### 5. Explain cost allocation

**Point first to the business-unit bars, then to the smaller project bars, and finally to Infrastructure Cost.**

> The cost allocation section shows how the included AI request cost is distributed across business units. Within each business unit, the smaller bar is intended to identify its highest-cost project, helping the executive connect spend with organizational ownership. The project value is part of the business-unit total; it is not an additional amount to add on top.

> Infrastructure Cost is shown as `Data Pending`. It was identified as an Executive metric in the design documentation, but the current material does not provide the Azure Cost Management contract or a confirmed calculation. Keeping the placeholder makes the gap visible without inventing a value.

The use of the highest-cost project is a design intention that still needs client confirmation. Until confirmed, present it as the intended behavior, not as an approved calculation rule.

### 6. Explain safety and risk posture

**Move across the three indicators from left to right.**

> The final section brings the three documented safety and security indicators together in one exception-oriented view.

For **Safety Evaluation Score**, say:

> The Safety Evaluation Score is presented here as the percentage of eligible, completely evaluated requests that triggered or failed at least one approved content-safety guardrail. Multiple category failures within the same request should still count as one impacted request.

For **MLflow Safety Score**, say:

> The MLflow Safety Score summarizes safety ratings across eligible request-and-model evaluations. The overall result is weighted by the number of evaluated request–model pairs, rather than calculated as a simple average of model averages. The scale remains pending because the source material conflicts between a zero-to-one field definition and a five-point example.

For **PII Leakage (Agent Only)**, say:

> PII Leakage is restricted to supported agent workloads. It shows the percentage of eligible evaluated agent requests flagged for potential sensitive-data leakage. A flag is a signal for review; it is not, by itself, proof of a confirmed data breach.

Use **PII**, not **PYY**, and use **MLflow** as one word.

### 7. Close on executive value

**Return attention to the full dashboard.**

> The value of this main view is the sequence: first see the current pulse, then understand whether adoption is moving, where cost is concentrated, and whether safety or security signals require attention. It gives executives a consistent starting point while keeping unsupported metrics visible as pending rather than presenting false precision.

## Short version for a two-minute walkthrough

> This is the main view of the Executive Dashboard. It is organized into four logical sections: Executive pulse, adoption movement, cost allocation, and safety and risk posture. The filters at the top define the reporting period and, where the telemetry supports reliable attribution, the selected business unit, project, and channel.
>
> The Executive pulse summarizes five headline signals: performance through End-to-End Latency, reliability through API Error Rate, adoption through Session and Query Volume, the feedback signal, and unit cost through Cost per Request.
>
> The adoption chart then shows sessions and queries as two series over time, with queries per session and average session length as supporting context. Beside it, the cost chart allocates included AI request cost by business unit and highlights the intended highest-cost project within each unit. Infrastructure Cost remains `Data Pending` because its calculation contract has not yet been defined.
>
> The bottom section groups the three documented risk indicators. Safety Evaluation Score shows the percentage of completely evaluated requests impacted by at least one approved guardrail. MLflow Safety Score summarizes eligible request–model safety ratings, with its display scale still pending confirmation. PII Leakage is agent-only and shows potential leakage flags, not confirmed breaches.
>
> Together, the page provides a quick executive pulse and the movement, ownership, and risk context needed to decide where to look next.

## Presenter wording guide

| Prefer | Avoid | Reason |
|---|---|---|
| Five headline signals | Five classifications | The five cards do not map cleanly to five confirmed classification labels. |
| One chart with two series | Two adoption charts | Sessions and Queries share one dual-series trend chart. |
| Queries per session | Query per session | This is the natural metric label. |
| Highest-cost project, intended | Most expensive project, confirmed | The top-project selection rule is a design intention awaiting confirmation. |
| Eligible evaluated requests | All requests | Safety denominators depend on completed, valid evaluations. |
| Weighted by evaluated request–model pairs | Average safety score for all models | Not every model is necessarily evaluated, and a simple mean of model averages would misweight the result. |
| Flagged for potential leakage | PII breach or confirmed leakage | An evaluator flag does not confirm an incident. |
| `Data Pending` | Zero or not available | `Data Pending` communicates an unresolved telemetry or calculation dependency without implying a measured zero. |

## Likely audience questions and concise responses

### Do all filters update every card?

Only when the KPI can be reliably attributed to the selected dimension. Business Unit and Project are intended as global filters for applicable metrics. Channel remains global only if the cross-KPI attribution contract supports it; otherwise it is limited to adoption and session analysis.

### Why is Infrastructure Cost still visible?

It is a documented Executive metric, but the current material does not define the Azure Cost Management data contract or calculation. The placeholder preserves the requirement and makes the dependency explicit.

### Is a higher Safety Evaluation Score better?

Not in the current presentation. The displayed value is an **impacted-request percentage**, so a larger percentage means more evaluated requests triggered at least one included guardrail. The title and status thresholds still require confirmation.

### Why does MLflow show `SCALE PENDING`?

The available documentation conflicts: the mapped field is described as a zero-to-one value, while the example uses a five-point scale. The dashboard should not convert or color the score until the authoritative scale and thresholds are approved.

### Does PII Leakage mean sensitive data was exposed?

No. It means an eligible agent request was flagged for potential leakage by the approved evaluator. Security review is still required to distinguish a true incident from a false positive or a blocked output.

## Confirmed facts

- The Executive persona mapping contains ten documented metrics represented in the concept. Session and Query Volume appears twice—once as a pulse card and once as a trend chart—but the chart does not introduce a new KPI.
- The documented channel examples are web, Teams, mobile, and API.
- Infrastructure Cost has no confirmed generic field mapping or calculation contract in the current project material.
- The MLflow source material contains a scale conflict between zero-to-one and a five-point example.
- PII Leakage is documented as agent-only.

## Likely interpretations

- Executives benefit from seeing the summary pulse before the trend, ownership, and risk details.
- The cost chart is intended to use summed request cost for allocation, because average request cost is already represented by the Cost per Request card.
- The smaller project bar is intended to show the highest-cost project within each business unit.

## Assumptions used in this guide

- The presentation uses the current Executive Dashboard concept image as its main visual.
- A four-to-five-minute main-view walkthrough is appropriate for the audience.
- Period, Business Unit, Project, and Channel are proposed top-level filters, subject to the available attribution contract.
- Online production evaluation is the default safety population unless the client approves a combined online/offline scope.

## Missing evidence and open decisions

- Confirmed filter support for every KPI, including timestamp and Business Unit, Project, and Channel attribution.
- The approved rule for selecting the displayed project within each business unit.
- The authoritative organizational hierarchy and business-unit field.
- The Infrastructure Cost source, grain, allocation rules, currency, and Azure Cost Management contract.
- The approved Safety Evaluation Score name, denominator, guardrail definition, and status thresholds.
- The authoritative MLflow scale, direction, evaluator version, normalization, and thresholds.
- The exact PII evaluator encoding, supported agent platforms, denominator, and incident-review process.

## Source traceability

- [Executive Dashboard Concept 01](executive-dashboard-concept-01.md)
- [Executive Persona KPI Mapping](../../business-logic/persona-kpi-mapping-executives.md)
- [Session and Query Volume Chart — Short Version](main-view-calculations/session-and-query-volume-chart-short.md)
- [Cost by BU and Project Chart — Short Version](main-view-calculations/cost-by-bu-and-project-chart-short.md)
- [Safety Evaluation Score Card — Short Version](main-view-calculations/safety-evaluation-score-card-short.md)
- [MLflow Safety Score Card — Short Version](main-view-calculations/mlflow-safety-score-card-short.md)
- [PII Leakage (Agent Only) Card — Short Version](main-view-calculations/pii-leakage-agent-only-card-short.md)
