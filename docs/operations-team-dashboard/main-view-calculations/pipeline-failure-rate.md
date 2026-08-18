# Pipeline Failure Rate — Full Main-View Specification

## Element shown in the concept

| Property | Value |
| --- | --- |
| Section | Operational situation and Failure surface |
| Card / bar | Pipeline Failure Rate / Pipeline |
| Statistic | Failed pipeline-run rate |
| Illustrative value | `0.7%` |
| Scope | Last 30 days, business unit, project, channel |

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Reliability / Error Rate |
| Source | ADF Pipelines/Activities |
| Fields | `status`, `failureType`, `triggered_by`, `errorCode` |
| Mapped calculation | Total error code / total request |

`status` includes final pipeline state, while `triggered_by` distinguishes
manual, schedule, and event triggers. Neither field set defines the complete
failure denominator or retry policy.

## Business meaning and proposed calculation

The rate answers: **what proportion of eligible final pipeline executions were
classified as failed?** Proposed normalization requires one final pipeline run:

```text
pipeline_failure_flag = 1 when approved final pipeline status/taxonomy = failed
pipeline_failure_rate =
  COUNT(DISTINCT pipeline_run_key where pipeline_failure_flag = 1) /
  COUNT(DISTINCT eligible pipeline_run_key) * 100
```

Example: 7 failed final pipeline runs among 1,000 eligible final runs displays
`0.7%`. Error-code presence alone must not double-count a failed run.

## Recommended eligible population

Use a canonical pipeline `runId` where available, one terminal state per run,
and an approved treatment for cancellation, skip, manual trigger, retry, and
late diagnostic events. `failureType` supports breakdown, not an automatic
numerator rule.

## Assumptions and verification

The values are illustrative and no SLA breach is implied. Verify a failed run
with several error events counts once; retry chains follow the approved policy;
partial/cancelled states are explicit; empty populations are no-data; and global
filters only apply with approved run attribution.

## Client questions

What is the canonical pipeline key? Which final statuses are failures? Are
cancelled, skipped, or manually triggered executions eligible? Are retries
separate runs or one logical attempt? What selected dimensions, threshold,
sample-size, timezone, rounding, and no-data rules apply?
