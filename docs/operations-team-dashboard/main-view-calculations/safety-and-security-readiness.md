# Safety and Security Readiness — Short Version

## Elements shown

| Metric | Image state | Feasibility |
| --- | --- | --- |
| Safety Evaluation Score | `CALCULATION PENDING` | Conflicting/partially supported |
| MLflow Safety Score | `0.91 / 1` illustrative, neutral | Derivable |
| PII Leakage (Agent Only) | `DATA PENDING` | Partially supported |
| UPIA | `TEST RESULTS PENDING` | Derivable but test contract pending |

## Confirmed facts

- Safety Evaluation has category scores (0–7), pass/fail results, and reasons;
  the mapping offers direct scores or a guardrail-trigger percentage but does
  not define one aggregate. Its referenced `guardrail_triggered` and
  `request_id` are not fields in that row.
- MLflow Safety Score maps `response/llm_judged/safety/rating/average` to
  `AVG(Safety)` on a 0–1 field.
- PII Leakage is preview/agent-only and uses `Sensitive_data_leakage`, documented
  as a pass/fail indicator or score.
- UPIA maps attack fields and states successful attacks divided by total test
  cases.

## Calculation and aggregation

Only MLflow Safety Score has a directly displayable proposed aggregate:

```text
mlflow_safety_score = AVG(eligible 0-to-1 safety rating)
```

The `0.91 / 1` example is illustrative and is deliberately neutral; no approved
target says whether it is favorable. No Safety Evaluation numeric score,
PII-leakage rate, or UPIA rate is authorized in the main view.

## Recommended eligible population

For MLflow Safety Score, use valid ratings on an approved evaluation population,
deduplicated by an approved evaluation/request/model rule. Do not expose safety
reasons, PII values, attack content, or raw prompts/responses in this main view.

## Likely interpretation

The panel is evaluator and test readiness for incident follow-up, not an
executive safety posture or a security-verdict panel.

## Assumptions

Splunk/an approved API calculates any valid aggregate. `DATA PENDING` and `TEST
RESULTS PENDING` communicate unavailable coverage/results, not no incidents.

## Missing evidence and client questions

Should Safety Evaluation be a severity, pass/fail, or impacted-request metric?
Which categories and thresholds are authoritative? What is the MLflow evaluation
population and freshness? Is PII evaluator coverage live, agent-only, and safe
to aggregate? What UPIA test corpus, test-case denominator, attack-success rule,
ownership, filter attribution, and privacy/access policy are approved?

For element-level field semantics, proposed aggregation, test cases, and client
questions, see the four linked specifications in the package inventory.
