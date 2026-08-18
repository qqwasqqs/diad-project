# User Satisfaction Rate — Short Version

## Elements shown in the approved main view

The same calculation appears in two places: the `User Satisfaction Rate` card (`84% positive`, `84% / 16%`) and the supporting callout in `Experience and response quality`. Both use one canonical value.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Product Owners |
| Classification / category | Adoption / User Engagement |
| Metric | User Satisfaction Rate |
| Source | UI Layer |
| Fields | `user_feedback_score`, `user_id`, `application_name` |
| Mapped calculation | `AVG(user_feedback_score)`; application-specific average |

The field description says binary `1 = thumbs up`, `0 = thumbs down`, while a related source formula uses `user_feedback_score >= 3`. This conflict prevents a confirmed positive-rate calculation. A detailed feedback schema elsewhere documents `correlation_id` and feedback `timestamp`, but not the full selected-dimension attribution.

## Proposed calculation

For the binary interpretation shown in the image:

```text
feedback_class = positive when user_feedback_score = 1
feedback_class = negative when user_feedback_score = 0
valid_feedback = positive or negative feedback_class

positive_percent = COUNT(valid positive feedback) /
                   COUNT(valid feedback) * 100
negative_percent = COUNT(valid negative feedback) /
                   COUNT(valid feedback) * 100
```

Illustrative example: `840` positive and `160` negative valid feedback events give `84%` positive and `16%` negative. If binary encoding is confirmed, the percentages total 100% subject to rounding.

## Meaning and eligible population

This answers: **Of valid feedback received in the selected scope, what share was positive?** It does not measure all users, all requests, workflow completion, or a causal effect of latency.

Use one effective valid feedback event per approved response/request grain; deduplicate; apply an approved first/latest/history rule for changed feedback; exclude invalid/missing feedback from the denominator; and protect pseudonymous `user_id` and any text from display.

## Assumptions and questions

Assume binary feedback, most-recent valid feedback per correlated response, feedback-event timestamp for period selection, and API-side correlation/aggregation. Confirm the score scale; positive/neutral/negative rule; response/request/conversation/session grain; change rule; feedback timestamp; correlation to latency and dimensions; feedback coverage denominator; privacy/minimum-cohort rules; and no-data/threshold treatment.
