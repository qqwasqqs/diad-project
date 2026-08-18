# Safety Evaluation Score — Full Pending-State Specification

## Element shown in the concept

`Safety Evaluation Score — CALCULATION PENDING` is intentionally nonnumeric in
Safety and Security Readiness.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Safety and Risks / Content Safety |
| Source | Azure AI Foundry SDK |
| Fields | Hate/unfairness, violence, sexual, and self-harm score/result/reason fields |
| Mapped alternatives | Direct relevant scores, or guardrail-trigger percentage |

Scores are documented as 0–7 and results are pass/fail. The alternative formula
references `guardrail_triggered` and `request_id`, which are not mapped fields.

## Calculation status and business meaning

No numeric aggregation is authorized. The state answers: **is a valid,
approved safety aggregate available for this operational scope?** It does not
mean zero safety events, safe content, or an unavailable service.

## Required future aggregation decision

A future impacted-request rate would need a canonical request key, approved
category thresholds, and one result per request:

```text
request_impacted = MAX(approved category failure flags for one request)
impacted_rate    = COUNT(impacted requests) / COUNT(complete evaluations) * 100
```

This is a proposal only, not a currently approved calculation.

## Eligible population, assumptions, and verification

Keep online production, offline evaluation, and red-team runs separate unless
approved otherwise. Never expose evaluator reasons, prompts, responses, or
request-level data in the main view. Verify that incomplete evaluator runs do
not become passes, repeat evaluator records combine once per request, and no
numeric state appears until a scale/denominator is approved.

## Client questions

Should Operations see severity, pass/fail rate, or impacted-request percentage?
Which categories, thresholds, request key, coverage rule, evaluator version,
timestamp, filter attribution, privacy/access, and alert ownership apply?
