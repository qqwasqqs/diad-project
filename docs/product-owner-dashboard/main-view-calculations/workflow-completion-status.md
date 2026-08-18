# Workflow Completion — Pending-State Specification

## Element shown in the approved main view

`Workflow Completion — DATA PENDING` with `Completion event and formula not supplied` is intentionally nonnumeric.

## Persona support and evidence gap

Workflow completion is a confirmed Product Owner need in `dashboard-and-reporting-design.md`. The supplied Product Owner mapping has no workflow ID, start/end or terminal-status field, completion event, eligible workflow population, or completion-rate formula. Existing fields such as `response_status`, `training_status`, and agent `approval_status` are component-specific and must not be repurposed as user-workflow completion.

## Meaning and required future calculation

The state answers: **is an approved workflow-completion measure available for the selected product scope?** It does not mean zero completions, failed workflows, or no product value.

A future rate would require an approved workflow key, start event, terminal outcome vocabulary, and denominator, for example:

```text
completion_rate = COUNT(DISTINCT completed eligible workflow_key) /
                  COUNT(DISTINCT started eligible workflow_key) * 100
```

This is a proposed shape only; it is not authorized by current fields.

## Assumptions and questions

Assume the data-pending state is returned by the API when no validated contract exists. Confirm what a workflow means for each product/use case; start, completion, cancellation, abandonment, retry, and partial-success semantics; keys/timestamps; scope attribution; event coverage; privacy/access; and no-data versus not-applicable behavior.
