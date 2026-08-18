# Safety and Security Readiness Drawer

**Source:** Safety and security readiness section. **Interaction:** right-side drawer.
**Drawer image:** [Safety and Security Readiness](operations-team-safety-security-readiness-drawer-01.png).

## Design

Shows the four readiness rows, neutral MLflow Safety Score `0.91 / 1`, a concise
calculation/coverage table, and `EVALUATOR COVERAGE PENDING`. It is not an
incident, breach, or attack-analysis view.

### Evidence boundary

Safety aggregation, agent-only PII coverage, and UPIA test results remain
unresolved. Do not show reasons, sensitive values, prompts, responses, test
payloads, incident claims, security controls, or thresholds.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a non-scrolling drawer. Header "SAFETY AND SECURITY READINESS DETAILS"; title "Safety and security readiness"; subtitle "Evaluator availability and test readiness"; close X and illustrative banner. Card "Readiness matrix" rows: "Safety Evaluation Score" "CALCULATION PENDING"; "MLflow Safety Score" "0.91 / 1"; "PII Leakage (Agent Only)" "DATA PENDING"; "UPIA" "TEST RESULTS PENDING". Card "Calculation and coverage context" rows: "Safety Evaluation" "Aggregate decision required"; "MLflow Safety" "AVG(Safety), 0–1 scale"; "PII Leakage" "Agent-only evaluator availability"; "UPIA" "Successful tests / eligible test cases". Add exact amber label "EVALUATOR COVERAGE PENDING". MLflow score must be neutral indigo/charcoal, not green. No sensitive reasons, PII values, prompts, attacks, breach/incident claims, thresholds, remediation, scrollbar, or browser chrome.
```
