# PII Leakage (Agent Only) — Shared Pending-State Definition

## Element shown in the approved main view

`PII Leakage (Agent Only) — DATA PENDING` is intentional. It is not `0%`, no potential leakage, or a confirmed breach conclusion.

## Canonical shared specification

Reuse the approved Operations [PII Leakage pending-state specification](../../operations-team-dashboard/main-view-calculations/pii-leakage-agent-only-status.md).

| Item | Confirmed definition |
| --- | --- |
| Source | Azure AI Foundry SDK, agent only |
| Field | `Sensitive_data_leakage` |
| Mapped calculation | `AVG(Sensitive_data_leakage)` |
| Availability | agent-only; availability/type/encoding remain unconfirmed |

The canonical future proposal combines valid evaluator results once per eligible agent request, but no percentage is authorized until the evaluator's type/direction, coverage, availability, and request/evaluation key are approved.

## Product Owner presentation note

This light-touch readiness state intentionally excludes raw evaluator content, prompts, responses, identifiers, sensitive values, and incident claims. It remains separate from satisfaction and feature/workflow signals.
