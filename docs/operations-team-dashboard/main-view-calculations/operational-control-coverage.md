# Operational Control Coverage — Pending-State Specification

## Elements shown

| Metric | Image state | Source basis |
| --- | --- | --- |
| Training Reproducibility | `DEFINITION PENDING` | Training run, parameter, dataset, lineage, and deployment fields; successful runs / total runs |
| Audit Logging | `CALCULATION PENDING` | Trigger, schema, operation, log type, time, application; search application/log type |
| Tool Usage Compliance | `CALCULATION PENDING` | Tool, agent version, agent ID; no formula |
| Model Governance | `CALCULATION PENDING` | Model identity/status/registry/evaluation fields; no formula |
| Environment Compliance | `CALCULATION PENDING` | `environment`, `application_name`; no formula |

## Confirmed facts

The mapping supplies the fields and the stated formulas/gaps above. It does not
define a reproducible training-run test, mandatory audit event set, allowed-tool
policy, governed-model population, or environment-compliance policy.

## Calculation status and business meaning

No numeric aggregation is authorized for the five displayed states. The panel
answers: is an approved operational-control calculation available for this scope?
It does not assert that a control is absent, failed, compliant, or healthy.

## Likely interpretation

These are readiness signals for Operations follow-up, not a replacement for a
formal governance or audit dashboard.

## Assumptions

`DEFINITION PENDING` denotes an ambiguous metric definition; `CALCULATION
PENDING` denotes fields without an approved calculation. Neither is zero.

## Missing evidence and client questions

What exact evidence makes a training run reproducible? Which applications/log
types are mandatory for audit logging? Which tools and models are eligible and
approved? What environment policy, exceptions, denominator, period, filter
attribution, sampling, privacy, threshold, no-data, and ownership rules apply?
