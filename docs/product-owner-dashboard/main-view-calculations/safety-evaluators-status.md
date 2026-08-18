# Safety Evaluators — Shared Pending-State Definition

## Element shown in the approved main view

`Safety Evaluators — CALCULATION PENDING` is a nonnumeric readiness state in Trust and measurement readiness.

## Canonical shared specification

The field semantics, evidence conflict, proposed future aggregation, privacy guardrails, and verification questions are reused from the approved Operations [Safety Evaluation Score specification](../../operations-team-dashboard/main-view-calculations/safety-evaluation-score-status.md).

Confirmed source support is Azure AI Foundry SDK hate/unfairness, violence, sexual, and self-harm score/result/reason fields. They provide category-specific `0–7` severity and pass/fail evidence, but do not authorize one aggregate Product Owner score. The alternative guardrail-trigger percentage references unmapped `guardrail_triggered` and `request_id` fields.

## Product Owner presentation note

The status answers whether an approved aggregate safety-evaluator measure is available. It does not mean no safety events, safe responses, a completed safety review, or a business-value conclusion. Do not expose reasons, prompts, responses, user identifiers, or request-level evaluator evidence.
