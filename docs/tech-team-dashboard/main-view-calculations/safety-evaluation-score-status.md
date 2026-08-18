# Safety Evaluation Score — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Evaluator readiness and security tests |
| Display | `CALCULATION PENDING` |
| Scope | Last 30 days, business unit, project, channel |

The status is intentional. The mapped source offers incompatible presentation choices—direct category severity scores or a guardrail-triggered percentage—without defining one aggregate.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Safety and Risks / Content Safety |
| Source | Azure AI Foundry SDK |
| Fields | hate/unfairness, violence, sexual, and self-harm scores/results/reasons |
| Alternatives | direct relevant score, or `COUNT(guardrail_triggered) / COUNT(request_id) * 100` |

Scores are `0–7` severity fields and results are pass/fail. The formula references `guardrail_triggered` and `request_id`, neither of which occurs in this mapping row.

## Meaning, calculation status, and population

The panel answers readiness—not risk posture—until a calculation is approved: **Is a valid safety evaluator metric available for this scope?** Reasons are diagnostic evidence and must not be shown in the main view.

No numeric aggregation is authorized. A possible future impacted-request rate would require one canonical request key, approved included categories and thresholds, and a rule such as `MAX(category_failure)` per request. It must not be implemented from the current mapping alone.

## Assumptions and client questions

Assumption: `CALCULATION PENDING` is returned/displayed independently of score/threshold colors.

Questions: Should this display a severity score, passed/failed rate, or impacted-request percentage? Is `guardrail_triggered` available and what makes it true? Which categories/thresholds are authoritative? What evaluation grain, coverage, online/offline separation, retry/deduplication, filter attribution, and privacy constraints apply?
