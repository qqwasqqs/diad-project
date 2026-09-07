# Presentation

## Introduction

This is the Product Owner Dashboard. It is the quick view of adoption, experience, quality, and measurement status.

It tells us: are people using it, are they satisfied, is the experience fast enough, and what still needs validation before we trust the metric.

## What this view intentionally does not cover

This is not a catalogue of every Product Owner KPI. It is a business-first
landing view: it gives the Product Owner the shortest path to questions about
adoption, user experience, response usefulness, and measurement readiness.

We keep some important categories out of the first screen because they need a
different decision context, are more operational or technical, or still need a
clear data contract. They are not being dismissed or hidden. They can be added
when they become important to the client's decision process.

Notable categories currently outside the primary view include:

- **Throughput** — for example, request or token throughput; useful when the
  client needs to assess demand, scale, or capacity pressure.
- **Error Rate** — for example, API, transcription, translation, or training
  failures; useful when reliability becomes a Product Owner concern.
- **Cost Evaluation** — for example, cost per request, token consumption, or
  cost by business unit and project; useful for spend and value discussions.
- **Accountability and Governance** — including accountability, tool use,
  model governance, environment compliance, and business ownership; useful for
  ownership, audit, and control discussions.
- **ML Evaluation and Training Quality** — useful for model-improvement and
  training decisions, but normally better suited to a technical or dedicated
  supporting view than the Product Owner's first screen.

If the client wants to extend the dashboard, we can prioritise one of these
categories, confirm its business question and data contract, then add a
Product Owner-appropriate summary and supporting detail. This keeps the main
view focused while making the wider KPI inventory available when it is needed.

## Product Experience Pulse

This is the executive pulse. It is the top-level summary.

It shows:

- session and query volume
- user satisfaction
- end-to-end latency, using P95
- workflow completion, which is still pending because there is no confirmed definition or formula yet

So this section is just the fast read. It is not the deep view.

## Adoption and Engagement

This chart shows sessions and queries over time.

It adds supporting metrics like queries per session and average session length. So we can see whether usage is growing and whether people are coming back.

This is the adoption story.

## Channel Mix

This shows where the traffic is coming from.

Web, Teams, Mobile, API. Simple view of demand distribution across channels.

## Experience and Response Quality

This is the quality section.

It shows satisfaction and latency together, then adds quality signals like groundedness, relevance, and intent resolution.

It also includes retrieval quality and task adherence. The idea is to understand whether the response is useful, not just whether it is fast.

This is not a causal chart. It is just context.

## Trust and Measurement Readiness

This section flags what is ready and what is still pending.

Some values are fine. Some are still data pending because the source definition, coverage, or validation is not complete yet.

This is useful because it keeps the dashboard honest. We do not pretend missing data is valid data.

## Experience Pulse Drawer

This is the detail drawer for the product experience pulse.

The drawer gives more context around the same signals:

- engagement over time
- responsiveness over time
- feedback evidence
- workflow measurement readiness
- measurement context

The goal is not to repeat the main cards. It adds detail and makes the measurement state explicit.

The interesting part is that the drawer does not try to claim a strong conclusion. It shows what is visible and what is still missing.

Feedback is still pending because the timestamp and request correlation are not approved yet.

Workflow completion is also pending because there is no final workflow event or denominator defined.

So the drawer is mostly a validation layer: what we know, what we can show, and what still needs definition before this becomes a production-quality metric.

## Adoption and Engagement Drawer

This is the detail drawer for the adoption and engagement section.

It goes one level deeper into how the behavior looks inside the session itself.

It shows:

- session depth distribution
- conversation pattern
- session duration distribution
- engagement measurement coverage
- calculation context

This is not a duplicate of the main trend. The main chart already shows the timeline. The drawer focuses on session behavior and what we can actually measure.

The first card shows how sessions are distributed by query depth. For example, how many sessions have 1 query, 2 to 3 queries, and so on.

The second card is the conversation pattern. This is a proposed aggregation, not a confirmed metric yet. It tries to estimate conversations per session, but it depends on a validated session and conversation relationship.

The third card shows session duration distribution. This is useful to understand if engagement is short and shallow or deeper and longer.

The final coverage section shows whether the required fields are actually usable for this scope. Session ID, conversation ID, timestamp, and channel are all relevant, but they are still marked as pending until the coverage is confirmed.

This drawer is useful because it gives context without claiming more than the data supports.

## Channel Mix Drawer

This is the detail drawer for the channel mix section.

It goes one level deeper into how the usage mix changes over time and whether different channels behave differently.

It shows:

- channel share evolution over time
- engagement by entry channel
- channel attribution readiness
- calculation context

The main bar chart shows the overall mix. The drawer adds the time dimension, so we can see if one channel is growing, shrinking, or becoming more dominant over time.

The engagement by channel section compares queries per session and average session duration by channel. This is useful context, but it is still a proposed aggregation. We need a validated session-to-channel rule before we treat it as real product behavior.

The attribution readiness section is important. We need to confirm channel vocabulary, session assignment, timestamp handling, and project or business unit attribution. Without that, we cannot say the channel split is truly reliable.

This drawer is useful because it keeps the channel story honest. It adds context, but it does not pretend that a channel pattern is a confirmed causal signal.

## Experience and Response Quality Drawer

This is the detail drawer for the experience and response quality section.

It goes one level deeper into whether the product is not only satisfying users, but also producing useful responses.

It shows:

- user satisfaction and latency in context
- groundedness trend
- relevance quality trend
- intent resolution trend
- retrieval quality
- task adherence
- measurement context

The main chart already shows a high-level summary. The drawer adds the quality trend and the supporting indicators that explain the signal.

The first part keeps satisfaction and latency side by side. That is useful context, but it is not a causal chart. We are not saying latency causes satisfaction. We are just showing that both are relevant to the experience.

Then we get the quality metrics. Groundedness, relevance, and intent resolution tell us whether the response is accurate and aligned with the task. Retrieval quality and task adherence add more evidence that the system is actually helping the user complete the flow.

This is where we start to answer the question: is the product useful, not just active?

The important thing is that the drawer stays at the product level. It does not go into raw logs or technical diagnostics. It gives the Product Owner enough signal to understand quality without exposing the lower-level details.

## Trust and Measurement Readiness Drawer

This is the detail drawer for trust and measurement readiness.

This is the place where we say: here is what is validated, here is what is still pending, and here is where the measurement model is not strong enough yet.

It shows:

- safety evaluator status
- MLflow safety score
- PII leakage status
- UPIA test status
- overall measurement readiness context

This drawer is important because it makes the dashboard honest. We do not hide uncertainty behind a clean chart.

Some metrics are ready enough to show. Others are still pending because the source definition, coverage, or validation step is not complete. That is exactly the point of this section.

It helps the Product Owner understand that adoption and experience are visible, but some trust and measurement signals need more engineering work before they are decision-grade.

In short, this drawer is a validation gate. It tells us what we can trust today and what still needs follow-up before it becomes part of the core story.

## Closing

This dashboard is built for a quick Product Owner read.

High level first. Then some supporting detail. Then clear flags when the metric is not ready.

That keeps the decision flow simple and avoids pretending we have data we do not actually have.
