# PII Leakage (Agent Only) — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Evaluator readiness and security tests |
| Display | `DATA PENDING` |
| Scope restriction | Agent workloads only |
| Scope | Last 30 days, business unit, project, channel |

This is deliberately not `0%`. The available mapping is conflicting and the evaluator is described as preview/agent-only.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Safety and Risks / Security |
| Source | Azure AI Foundry SDK, agent only |
| Field | `Sensitive_data_leakage` |
| Documented alternatives | `AVG(Sensitive_data_leakage)`; a pass/fail label; attack success rate mentioned |

The source does not define field type, numeric range, direction, pass/fail encoding, threshold, evaluator availability, or population key.

## Meaning, calculation status, and population

The element answers: **Is usable agent-only sensitive-data-leakage evaluator telemetry available?** It is evaluator readiness, not proof of a breach or an incident count.

No numeric aggregation is authorized. If the field is confirmed as pass/fail, a future proposed rate would be:

```text
flagged_agent_requests / evaluated_agent_requests * 100
```

where repeated evaluator results first roll up to one approved request key. That proposal cannot be implemented until the encoding, supported agents, and coverage are confirmed.

## Assumptions and client questions

Assumption: the API/UI provides `DATA PENDING` and no score, percent, or traffic-light state.

Questions: Which agents/versions support this evaluator and is it production-ready? What values, range, direction, and threshold does `Sensitive_data_leakage` use? What is the request/evaluation denominator? Does `fail` mean potential leakage? How are repeated evaluations, tests versus production, correlation, global filters, coverage, and privacy/redaction handled?
