# Cache Hit Ratio — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Capacity and efficiency |
| Display | `FORMULA PENDING` |
| Scope | Last 30 days, business unit, project, channel |

This is an intentional non-numeric state. It must never be rendered as `0%`.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Cost / Cache Utilization |
| Fields | `AzureOpenAIContextTokensCacheMatchRate`, `cached_tokens` |
| Documented alternatives | platform match rate **or** `cached_tokens / (prompt_tokens + completion_tokens)` |

## Meaning, calculation status, and population

The two documented alternatives need not be equivalent: one may be platform-defined and the other is a token ratio with a denominator whose exact semantics are not confirmed. The dashboard therefore cannot select or transform a value.

After a client decision, the chosen formula could be displayed as a percentage with an explicit eligible-token population and compatible deployment/model scope. Until then, return/display only the pending reason.

## Assumptions and client questions

Assumption: pending-state text, rather than amber/red/green by threshold, communicates the missing formula.

Questions: Which metric is authoritative? Is the platform match rate already a percentage/fraction and what does it count? Which prompt, completion, cached, retry, or failed calls enter the token ratio? How are multi-call requests/deployments grouped? What timestamp, sample, filter attribution, and target rules apply?
