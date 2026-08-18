# Technical Teams Evaluator Readiness and Security Tests Drawer

**Source element:** the **Evaluator readiness and security tests** panel.  
**Approved Gate 3 image:** [tech-team-evaluator-readiness-drawer-01.png](tech-team-evaluator-readiness-drawer-01.png)  
**Calculation authority:** [Safety Evaluation Score](main-view-calculations/safety-evaluation-score-status.md), [MLflow Safety Score](main-view-calculations/mlflow-safety-score.md), [PII Leakage](main-view-calculations/pii-leakage-agent-only-status.md), and [UPIA](main-view-calculations/upia-status.md).

## Design decision

Clicking Evaluator readiness and security tests opens a right-side drawer. It explains which evaluator output is usable and why the remaining three displayed states are pending; it is not an incident, breach, or attack analysis.

## Supported drawer content

| Drawer element | Evidence and purpose |
|---|---|
| Four-row readiness matrix | Safety Evaluation Score, MLflow Safety Score, PII Leakage (Agent Only), and UPIA with their exact visible states. |
| MLflow Safety context | Shows illustrative `0.91 / 1`, documented average calculation, and `0–1` scale. |
| Pending decision register | States the missing requirement for safety aggregation, agent-only PII telemetry, and UPIA test results. |
| Coverage note | `EVALUATOR COVERAGE PENDING` prevents interpreting a sparse score as complete risk evidence. |

## Excluded content

No safety reasons, sensitive values, prompts/responses, attack payloads, incident/breach claims, security remediation, risk thresholds, user data, or security-operations workflow.

## Evidence classification

### Confirmed facts

- MLflow Safety Score has a documented `0–1` field and average formula.
- Safety Evaluation Score, PII Leakage, and UPIA have unresolved calculation, availability, or test-result gaps.

### Likely interpretation

Technical Teams need evaluator readiness/provenance before a mature security/risk investigation interface.

### Assumptions

The drawer is non-scrolling. `0.91 / 1` is illustrative and has no favorable/attention threshold.

### Missing evidence and client questions

Which evaluator/version, request/evaluation/test grain, safety category aggregate, PII encoding, UPIA success rule, coverage/freshness, filter attribution, access restriction, and escalation rule are approved?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Technical Teams main view with a right-side detail drawer
Primary request: Create a compact non-scrolling Evaluator readiness and security tests drawer over the dimmed Technical Teams main view.
Input images: Image 1 is the Technical Teams main-view reference; Image 2 is the Executive drawer reference for interaction pattern only.
Composition: Right drawer top text exactly “EVALUATOR READINESS DETAILS”, title “Evaluator readiness and security tests”, subtitle “Evaluator availability and calculation readiness”. Show the illustrative-values banner. Show a card titled “Evaluator readiness matrix” with exact rows: “Safety Evaluation Score” “CALCULATION PENDING”; “MLflow Safety Score” “0.91 / 1”; “PII Leakage (Agent Only)” “DATA PENDING”; “UPIA” “TEST RESULTS PENDING”. Add a card titled “MLflow Safety context” with rows “Calculation” “AVG(Safety)” and “Scale” “0–1”. Add a card titled “Decisions required” with rows “Safety aggregation” “CALCULATION PENDING”; “Agent-only PII telemetry” “DATA PENDING”; “UPIA test evidence” “TEST RESULTS PENDING”. Add exact amber label “EVALUATOR COVERAGE PENDING”.
Constraints: No scrollbar. Do not show safety reasons, sensitive values, prompts, attack evidence, incidents, breaches, thresholds, remediation, or security workflow controls.
```
