# PII Leakage (Agent Only) — Full Pending-State Specification

## Element shown in the concept

`PII Leakage (Agent Only) — DATA PENDING` is intentional. It is not `0%` and
does not say that no sensitive-data event occurred.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Safety and Risks / Security |
| Source | Azure AI Foundry SDK, agent only |
| Field | `Sensitive_data_leakage` |
| Mapped calculation | `AVG(Sensitive_data_leakage)` |

The field is documented as a pass/fail indicator or score, while availability is
not confirmed and the source describes the capability as preview/agent-only.

## Proposed future calculation

For an approved binary pass/fail encoding only:

```text
leakage_flag = 1 when approved evaluator result = fail
request_flag = MAX(leakage_flag for one canonical agent request)
flagged_pct  = COUNT(flagged requests) / COUNT(valid evaluated agent requests) * 100
```

This would mean potential evaluator-flagged leakage, not a confirmed breach.
No value is authorized until coverage, type, direction, and availability are
approved.

## Eligible population, assumptions, and verification

Restrict to confirmed supported agent workloads; keep production monitoring and
offline/red-team tests separate; never display sensitive values, raw prompts,
responses, or identifiers. Test that missing/invalid evaluator outcomes are not
passes, duplicate outcomes combine once per request, agent eligibility is
enforced, and zero evaluated records return `DATA PENDING`/no-data.

## Client questions

What agent platforms/versions are supported? What encoding means flagged? What
is the request/evaluation key, denominator, evaluator coverage, timestamp,
filter attribution, review process, privacy rule, alert threshold, and
not-applicable state?
