# PII Leakage (Agent Only) Card — Short Version

This is the compact implementation reference for the PII Leakage (Agent Only) card in the Executive Dashboard.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Safety & risk posture |
| Card | PII Leakage (Agent Only) |
| Displayed statistic | Percentage of flagged evaluations |
| Illustrative value | `0.02% flagged` |
| Scope restriction | Agent workloads only |
| Visible scope | Last 30 days, business unit, project, and channel |

The value is illustrative. A flagged evaluation is a safety signal requiring review; it is not, by itself, proof that a confirmed PII breach occurred.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Safety and Risks |
| KPI category | Security |
| Metric | PII Leakage (Agent Only) |
| Source | Azure AI Foundry SDK, agent only |
| Field | `Sensitive_data_leakage` |
| Source calculation | `AVG(Sensitive_data_leakage)` |

The mapped field is described as a pass/fail indicator or score. The source does not define its data type, numeric range, pass/fail encoding, or threshold.

The broader design describes this metric as detecting sensitive-data exposure and mentions responses containing sensitive patterns that were blocked. It also states that safety and risk evaluators may run online or offline and that the dashboard depends on application/platform logs for these flags.

A technical-persona mapping describes this capability as preview and agent-only. Current platform availability and the supported evaluator version require client confirmation.

## Leakage-result semantics

- `Sensitive_data_leakage = pass` is assumed to mean that no leakage was detected by the evaluator.
- `Sensitive_data_leakage = fail` is assumed to mean that the evaluation was flagged for potential sensitive-data leakage.
- A numeric score cannot be converted into a flag until the score direction and threshold are approved.
- Multiple flags for one request should still produce one flagged request at the Executive aggregation level.

The card should use the word **flagged**, not **breached** or **confirmed leakage**, unless a separate security-validation process confirms an incident.

## Business meaning

The likely Executive interpretation is:

> What percentage of eligible evaluated agent requests were flagged for potential sensitive-data leakage?

`0.02% flagged` means that 0.02% of the evaluated agent requests or approved evaluation cases in the denominator received a leakage flag. It does not reveal the sensitive content, affected person, request details, or whether the signal was a true positive.

## Per-evaluation classification

For a confirmed pass/fail field, the proposed conversion is:

```text
leakage_flag = 1 when Sensitive_data_leakage = "fail"
leakage_flag = 0 when Sensitive_data_leakage = "pass"
```

If several evaluator records exist for one request:

```text
request_leakage_flag = MAX(leakage_flag for the same request_key)
```

Missing, invalid, or incomplete results must not be converted to `0` or treated as safe.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters after restricting the population to supported agent workloads:

```text
flagged_agent_requests =
  COUNT(DISTINCT request_key WHERE request_leakage_flag = 1)

evaluated_agent_requests =
  COUNT(DISTINCT request_key with a valid leakage result)

flagged_percent =
  (flagged_agent_requests / evaluated_agent_requests) * 100
```

For a binary numeric encoding where `1 = flagged` and `0 = pass`, this is equivalent to:

```text
flagged_percent = AVG(leakage_flag) * 100
```

Example:

```text
Flagged agent requests:       2
Evaluated agent requests: 10,000

Flagged percentage = (2 / 10,000) * 100
                   = 0.02%
```

If `evaluated_agent_requests` is zero, the card should show an approved not-applicable, no-data, or `Data Pending` state rather than `0% flagged`.

## Recommended eligible population

This behavior still requires client confirmation:

- Include only workloads confirmed to be supported agents.
- Include only agent requests or approved evaluation cases with a valid leakage-evaluator result.
- Use one canonical request/evaluation key and one final flag per request.
- Combine repeated evaluator results at the request grain before aggregation.
- Keep online production monitoring separate from offline/red-team test results unless the client approves a combined population.
- Exclude missing or invalid results from the pass population and report evaluation coverage separately.
- Do not expose raw prompts, responses, detected sensitive values, request identifiers, or evaluator evidence in the Executive card.
- Apply business-unit, project, and channel filters only through an approved correlation and attribution contract.

## Assumptions

The displayed calculation uses these assumptions:

- `Sensitive_data_leakage` is treated as a binary pass/fail result.
- `fail` means potential leakage detected and `pass` means no leakage detected by the evaluator.
- The card measures flagged evaluated agent requests, not confirmed security incidents.
- The denominator contains agent requests with a valid evaluator result, not all platform requests.
- Multiple failed evaluations for one request count as one flagged request.
- Online production agent evaluations are the default population; offline and red-team datasets are excluded.
- A canonical request key and timestamp can be obtained through an approved correlation contract.
- Business-unit, project, and channel attribution will be added through reliable Splunk correlation/enrichment.
- Splunk or an approved API layer performs scope restriction, correlation, deduplication, classification, filtering, and aggregation.
- The red styling in the concept is illustrative because no approved threshold is documented.
- `0.02%` is illustrative rather than production data.

## Potential questions for the client

1. Is the intended metric name PII Leakage, Sensitive Data Leakage, or another approved security term?
2. Which agent platforms and versions support this evaluator, and is it approved for production use rather than preview only?
3. What is the exact data type and allowed values of `Sensitive_data_leakage`?
4. For pass/fail results, which value means that potential leakage was detected?
5. If the field is numeric, what is its range, direction, and approved flagging threshold?
6. What sensitive-data categories are included: regulated PII, credentials, secrets, API keys, or other confidential data?
7. What is the denominator grain: agent request, response, trace, evaluation run, or security test case?
8. Should online production results, offline evaluations, and red-team/security tests be displayed separately?
9. What canonical identifier links the evaluator result to the agent request?
10. How should multiple evaluator runs or retries for the same request be combined?
11. Does a blocked response count as flagged even when sensitive content was not delivered to the user?
12. What evaluation-coverage level is required before the card can display a percentage?
13. How should missing, failed, timed-out, or incomplete evaluator results be handled?
14. Which timestamp and timezone determine the reporting period?
15. Can results be reliably attributed to business unit, project, application, channel, and environment?
16. What security-review process distinguishes an evaluator flag from a confirmed incident or false positive?
17. What threshold determines neutral, attention, and critical presentation, and does any value above zero require escalation?
18. What are the required not-applicable, loading, no-data, `Data Pending`, stale-data, and API-error states?
