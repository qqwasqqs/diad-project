# Available Token Limit — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Capacity and efficiency |
| Display | `DEFINITION PENDING` |
| Scope | Last 30 days, business unit, project, channel |

The status is intentional: the mapping’s `Available Token Limit = Active Token` formula conflicts with the field definition.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Cost / Consumption |
| Fields | `ActiveTokens`, `deployment_name` |
| Field meaning | `ActiveTokens` = tokens currently in flight; `deployment_name` identifies the Azure OpenAI deployment |
| Documented formula | `Available Token Limit = Active Token` |

## Meaning, calculation status, and population

Tokens in flight are utilization, not necessarily remaining capacity. A remaining token limit needs an authoritative limit for the same deployment/time window.

The dashboard must retain `DEFINITION PENDING`. It must not calculate remaining capacity by treating `ActiveTokens` as an available limit or subtracting it from an invented limit.

If a future authoritative limit exists, a proposed form would be:

```text
remaining_tokens = approved_deployment_limit - approved_active_tokens
```

That formula is not approved and requires compatible units and sampling times.

## Assumptions and client questions

Assumption: a pending state carries no favorable/attention threshold.

Questions: What does “available” mean—remaining TPM, RPM, quota, provisioned capacity, or concurrency? What source supplies the limit? Is `ActiveTokens` instantaneous or period-aggregated? Which deployment/model scope applies? How are different limits, time windows, filters, and throttling handled?
