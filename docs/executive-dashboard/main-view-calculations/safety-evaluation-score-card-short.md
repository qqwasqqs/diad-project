# Safety Evaluation Score Card — Short Version

This is the compact implementation reference for the Safety Evaluation Score card in the Executive Dashboard.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Safety & risk posture |
| Card | Safety Evaluation Score |
| Displayed statistic | Percentage of impacted requests |
| Illustrative value | `0.8% impacted requests` |
| Visible scope | Last 30 days, business unit, project, and channel |

The value is illustrative. No approved target or threshold currently establishes whether `0.8%` is neutral, attention, or critical.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Safety and Risks |
| KPI category | Content Safety |
| Metric | Safety Evaluation Score |
| Source | Azure AI Foundry SDK |
| Categories | Hate/unfairness, violence, sexual content, and self-harm |
| Supported calculations | Direct category score, or guardrail-triggered requests divided by total requests |

The mapped fields are:

- `hate_unfairness_score`, `hate_unfairness_result`, `hate_unfairness_reason`;
- `violence_score`, `violence_result`, `violence_reason`;
- `sexual_score`, `sexual_result`, `sexual_reason`;
- `self_harm_score`, `self_harm_result`, `self_harm_reason`.

The score fields use a documented `0–7` severity scale. The result fields are pass/fail indicators. Only the violence description explicitly states an example rule of score greater than 3 producing failure; approved thresholds for every category are not documented.

The source formula references `guardrail_triggered` and `request_id`, but neither field appears in this Executive mapping row. Their availability and safety-event correlation contract are therefore not confirmed.

## Safety-result semantics

- A category score represents the detected severity for that safety category.
- A category result represents whether the evaluation passed or failed its configured threshold.
- A category reason contains evaluator explanation and is intended for investigation, not for display on the Executive card.
- An impacted request should represent one request for which at least one approved safety category triggered or failed.

The card title says “Score,” but the concept displays an impacted-request percentage. These are different measurements and should not be treated as interchangeable.

## Business meaning

The likely Executive interpretation is:

> What percentage of eligible evaluated requests triggered at least one approved content-safety guardrail?

`0.8% impacted requests` means that 0.8% of the requests in the approved denominator were flagged by at least one included safety evaluation. It does not show which category triggered, the severity distribution, or whether the response was blocked.

## Per-request classification

Until a canonical `guardrail_triggered` field is confirmed, a proposed derived rule is:

```text
request_impacted = 1 when any approved result is "fail":
  hate_unfairness_result = "fail"
  OR violence_result     = "fail"
  OR sexual_result       = "fail"
  OR self_harm_result    = "fail"

request_impacted = 0 when all required category results are "pass"
```

If several evaluator records exist for one request, combine them at the request grain before aggregation:

```text
request_impacted = MAX(impact flag across included evaluations)
```

Missing evaluation results must not be silently interpreted as a pass.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters first. Then calculate:

```text
impacted_requests =
  COUNT(DISTINCT request_key WHERE request_impacted = 1)

evaluated_requests =
  COUNT(DISTINCT request_key with an approved complete evaluation)

impacted_request_percent =
  (impacted_requests / evaluated_requests) * 100
```

Example:

```text
Impacted requests:    80
Evaluated requests: 10,000

Impacted request percentage = (80 / 10,000) * 100
                            = 0.8%
```

If `evaluated_requests` is zero, the card should show an approved no-data or `Data Pending` state rather than `0% impacted`.

## Recommended eligible population

This behavior still requires client confirmation:

- Use one canonical request key and one final impact classification per request.
- Include only requests processed by the approved safety-evaluation configuration.
- Require the approved set of category results before classifying a request as passed.
- Classify a request as impacted when any included category produces an approved fail/trigger result.
- Deduplicate repeated evaluator telemetry before calculating request impact.
- Keep online production evaluation separate from offline evaluation and security-test datasets unless the client approves a combined view.
- Exclude incomplete evaluations from the pass population and report evaluation coverage separately.
- Do not expose category reasons, prompts, responses, or request-level records in the Executive card.

## Assumptions

The displayed calculation uses these assumptions:

- The concept selects impacted-request percentage rather than an averaged numeric safety score.
- A request is impacted when any of the four mapped category result fields equals `fail`.
- The result fields are authoritative; the dashboard does not independently recreate thresholds from the numeric scores.
- The denominator contains requests with a complete approved safety evaluation, not all platform requests.
- Multiple failed categories on one request count as one impacted request.
- Multiple evaluator records for one request are combined before counting.
- Online production requests are the default population; offline evaluation and red-team testing are excluded.
- A canonical request key and timestamp can be obtained through an approved correlation contract.
- Business-unit, project, and channel attribution will be added through reliable Splunk correlation/enrichment.
- Splunk or an approved API layer performs correlation, classification, deduplication, filtering, and aggregation.
- `0.8%` is illustrative rather than production data.

## Potential questions for the client

1. Should this card display impacted-request percentage, a numeric safety score, or both?
2. Should the card be renamed from “Safety Evaluation Score” to “Safety-Impacted Requests” if it displays a percentage?
3. Is there a canonical `guardrail_triggered` field, and exactly what makes it true?
4. What is the canonical request identifier linking safety results to the original request?
5. Which safety categories must run before an evaluation is considered complete?
6. What are the approved pass/fail thresholds for hate/unfairness, violence, sexual content, and self-harm?
7. Are the result fields authoritative, or should the dashboard derive failure from numeric scores?
8. Should the denominator include all eligible platform requests or only successfully evaluated requests?
9. What evaluation-coverage percentage is required before the card can display a value?
10. How should missing, failed, timed-out, or partially completed evaluator runs be treated?
11. Should online production, offline evaluation, red-team tests, and security tests be shown separately?
12. If a guardrail blocks or filters a response, does that always count as an impacted request?
13. If several categories or evaluator runs fail for one request, should it still count only once in the Executive rate?
14. Which timestamp and timezone determine the selected reporting period?
15. Can results be reliably attributed to business unit, project, application, channel, and environment?
16. What thresholds determine neutral, attention, and critical presentation states?
17. What category breakdown, if any, may be exposed in an Executive detail view?
18. What are the required loading, no-data, `Data Pending`, stale-data, and API-error states?
