---
name: dashboard-kpi-question-review
description: Review dashboard KPI documentation to separate valid client questions from internal Splunk-React contract issues, resolved assumptions, and redundant questions. Use when assessing or refactoring client-question sections for any dashboard in this repository.
---

# Dashboard KPI Question Review

Use this skill to keep client-facing KPI questions focused on decisions the
client is qualified to make, while tracking implementation-contract questions
separately for the Splunk and React teams.

## Read Before Reviewing

1. Read the complete project guideline at
   `docs/product-owner-dashboard/waiting-confirmation/new-view/client-question-context-and-guidelines.md`.
   Treat its delivery architecture and ownership rules as authoritative unless
   newer user-provided context explicitly supersedes them.
2. Read the target dashboard document and the full sections being reviewed.
3. Inspect the relevant KPI calculation documents, persona mapping, dashboard
   concept, and UI only as needed to establish what is documented, proposed,
   conflicting, or missing.
4. Read [references/review-procedure.md](references/review-procedure.md) for the
   classification and editing procedure.

The Product Owner guideline contains both reusable project architecture and
Product Owner-specific facts. Do not automatically apply dashboard-specific
facts, field availability, identifier relationships, or KPI decisions to a
different dashboard. Verify their scope first.

## Core Boundary

- Splunk performs KPI calculations, aggregation, correlation, filtering,
  retry handling, and deduplication, then returns processed data.
- React displays the returned data. It does not calculate KPI values or
  process raw telemetry.
- The client owns unresolved business meaning, product scope, source-field
  meaning, contradictions in client-provided documentation, and evidence
  needed to interpret a KPI.
- Splunk and React own endpoint property names, transport types, units in the
  response contract, timestamp encoding, response envelopes, and UI handoff
  states.

Do not treat every invalid client question as an open Splunk question. A
question may instead be answered already, logically implied, redundant, or
based on a premise that contradicts the established architecture.

## Authorization and Scope

- For an assessment or review request, report classifications without editing
  files.
- Edit documents only when the user requests a change.
- When editing, change only the KPI sections the user authorized. Preserve all
  unreviewed sections and unrelated working-tree changes.
- Move only unresolved implementation-contract issues to a Splunk-React
  tracker. Record settled responsibilities separately; do not reopen them as
  questions.
- Update the project guideline with new facts or reasoning patterns only when
  the user asks for that update.

## Required Quality

- Use current documentation as evidence and call out genuine conflicts.
- Keep proposals, missing fields, unsupported states, and unresolved
  denominators explicit. Never invent a definition to make the document look
  complete.
- Phrase client questions in plain, nontechnical language.
- Give invalid questions a brief, concrete reason.
- Validate changed Markdown and inspect the scoped diff before reporting
  completion.
