# Technical Teams Evaluator Readiness and Security-Test Detail

**Source element:** Evaluator readiness and security tests panel in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Calculation authority:** [Safety Evaluation Score](main-view-calculations/safety-evaluation-score-status.md), [MLflow Safety Score](main-view-calculations/mlflow-safety-score.md), [PII Leakage](main-view-calculations/pii-leakage-agent-only-status.md), and [UPIA](main-view-calculations/upia-status.md).

## Design decision

Open a Technical Teams **Evaluator readiness and security tests** detail from the panel. It clarifies evaluator availability, compatible MLflow Safety history, and the decisions that block other metrics. It is not an incident or executive risk-posture screen.

## Supported detail content

| Detail element | Added question | Fields / calculation | Feasibility |
|---|---|---|---|
| Evaluator readiness matrix | Which evaluator has usable output, a conflicting definition, or no results? | Four main-panel metrics and states. | Supported as status/context. |
| MLflow Safety 0–1 trend | Is the available MLflow rating changing? | MLflow safety rating; average. | Supported. |
| Safety calculation decision register | What prevents an aggregate safety score? | Category scores/results/reasons and absent guardrail/request fields. | Conflicting. |
| PII availability register | What is needed before agent-only leakage reporting? | `Sensitive_data_leakage`. | Data pending/conflicting. |
| UPIA test-evidence register | What is needed before attack-success reporting? | UPIA evaluator outcome fields. | Test results pending. |

## Proposed layout and interaction

Use a dedicated page with retained filters and the illustrative banner. Lead with a status matrix whose visible states are exactly `CALCULATION PENDING`, `0.91 / 1` (illustrative), `DATA PENDING`, and `TEST RESULTS PENDING`. Place the MLflow Safety trend in its own `0–1` card. Below, show three concise decision registers: safety aggregation, agent-only PII evaluator availability, and UPIA test-suite evidence. Each says what data/decision is needed; none introduces a risk severity or incident count.

## Excluded content

No evaluator reasons, sensitive values, prompt/response payloads, attack payloads, incident claims, breach claims, red-team instructions, security remediation, user information, or security-operation workflow.

## Assumptions

- This view is evaluator/test readiness for Technical Teams, not a final security-risk dashboard.
- MLflow Safety retains its documented `0–1` scale and is kept separate from other safety concepts.
- The status matrix is allowed to explain why a calculation is unavailable without calculating it.
- All values are illustrative and no safety threshold/color policy is implied.

## Missing evidence and client questions

- Which safety aggregate, categories, thresholds, request key, coverage, and population are approved?
- Is MLflow Safety higher-is-safer, which evaluator/version produces it, and can scores be attributed to the selected filters?
- Which agents/versions support `Sensitive_data_leakage`, what encoding/threshold applies, and can it run in production?
- What defines a UPIA success, which test suite/version/denominator applies, and who approves it?
- What security privacy, access, freshness, no-data, and escalation rules govern this page?

## Image-generation brief

Generate only after the prior Gate 3 detail view is approved. Create a polished Technical Teams **Evaluator readiness and security tests** page with filters/banner, readiness matrix, a separate 0–1 MLflow Safety trend, and three non-numeric decision registers. Keep all pending text explicit. Do not imply attacks, incidents, breaches, thresholds, security remediation, raw evaluator evidence, sensitive data, or cross-persona risk governance.
