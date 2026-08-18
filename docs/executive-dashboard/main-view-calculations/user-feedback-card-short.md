# User Feedback Card — Short Version

This is the compact implementation reference for the User Feedback card in the Executive Dashboard. See [Executive Dashboard API Error and User Feedback Details](../executive-dashboard-api-error-and-feedback-details.md) for the related detail-view design.

## Card shown in the concept

| Property | Concept value |
|---|---|
| Section | Executive pulse |
| Card | User Feedback (Thumbs Up/Down) |
| Primary value | `84% positive` |
| Supporting value | `84% / 16%` positive/negative split |
| Visible scope | Last 30 days, business unit, project, and channel |

All values are illustrative. Targets and thresholds have not been validated, so the green styling does not represent an approved positive-performance state.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Business Executives |
| Classification | Adoption |
| KPI category | User Engagement |
| Metric | User Feedback (Thumbs Up/Down) |
| Source | UI Layer |
| Fields | `user_feedback_score`, `user_id` |
| Supported calculations | Distinct users, total positive percentage, and total negative percentage |

The field description defines `user_feedback_score` as binary: `1 = thumbs up` and `0 = thumbs down`. However, the source calculation defines positive feedback as `user_feedback_score >= 3`. These two definitions conflict and require client confirmation.

The detailed UI feedback event also provides `correlation_id`, event `timestamp`, `user_feedback_score`, and `feedback_text_hash`. It does not confirm `user_id`, business unit, project, or channel on that same event.

## Feedback semantics

- `user_feedback_score`: feedback classification or numeric rating supplied by the user.
- `user_id`: pseudonymized user identifier available in the Executive mapping.
- `correlation_id`: links feedback to the related request or response in the detailed event schema.
- `timestamp`: time when the feedback event was recorded in the detailed event schema.
- `feedback_text_hash`: hash of optional feedback text; it does not support comment themes or sentiment analysis.

The dashboard must not expose individual users, raw feedback text, prompts, responses, or request-level feedback in the Executive view.

## Business meaning

The likely Executive interpretation is:

> Of the valid feedback received in the selected scope, what percentage was positive and what percentage was negative?

`84% positive` means that 84% of the valid feedback events included in the calculation were classified as positive. It does not mean that 84% of all users or all requests were satisfied, because users who did not submit feedback are not included.

## Per-feedback classification

Using the binary interpretation shown by the concept:

```text
feedback_class = "positive" when user_feedback_score = 1
feedback_class = "negative" when user_feedback_score = 0
feedback_class = "invalid"  otherwise
```

This is an assumption until the client confirms whether the field is binary or uses a larger rating scale.

## Card aggregation

Apply the selected time, business-unit, project, and channel filters first. Then calculate:

```text
positive_feedback = COUNT(valid feedback classified as positive)
negative_feedback = COUNT(valid feedback classified as negative)
total_feedback    = positive_feedback + negative_feedback

positive_feedback_percent = (positive_feedback / total_feedback) * 100
negative_feedback_percent = (negative_feedback / total_feedback) * 100
```

Example:

```text
Positive feedback: 840
Negative feedback: 160
Total feedback:   1,000

Positive percentage = (840 / 1,000) * 100 = 84%
Negative percentage = (160 / 1,000) * 100 = 16%
```

For a confirmed binary scale, the positive and negative percentages should total 100%, subject only to display rounding. If `total_feedback` is zero, the card should show an approved no-data state rather than `0% positive`.

## Recommended eligible population

This behavior still requires client confirmation:

- Include only valid feedback values under the approved scoring scale.
- Use one effective feedback record per approved request/response grain.
- If a user changes feedback for the same response, apply an approved first-value, latest-value, or history rule before aggregation.
- Remove duplicate telemetry events before counting feedback.
- Exclude missing or invalid scores and report them as telemetry-quality issues.
- Use total valid feedback as the percentage denominator, not total requests or total users.
- Keep distinct-user counts separate from the positive/negative percentage calculation.
- Apply business-unit, project, and channel filters only after feedback is reliably attributed through the related request.

## Assumptions

The displayed calculation uses these assumptions:

- Feedback is binary: `1 = positive` and `0 = negative`.
- One `correlation_id` identifies the response receiving feedback.
- One effective feedback value is counted per response after deduplication.
- If multiple feedback updates exist, the most recent valid value is used.
- The denominator is all valid feedback received, not all eligible requests.
- The detailed feedback-event timestamp determines whether feedback belongs to the selected period.
- Business-unit, project, and channel attribution will be added through reliable Splunk correlation with the related request.
- `user_id` remains pseudonymized and is not returned at record level to the Executive view.
- Splunk or an approved API layer performs filtering, deduplication, classification, and aggregation.
- `84%` and `16%` are illustrative rather than production values.

## Potential questions for the client

1. Is `user_feedback_score` binary (`1/0`) or a multi-value rating scale?
2. If it is a rating scale, which values are positive, neutral, and negative, and should neutral feedback appear in the split?
3. Why does the source formula use `user_feedback_score >= 3` while the field description defines thumbs up/down as `1/0`?
4. What is the canonical feedback-event grain: one event per response, request, conversation, session, or user?
5. If users can change their feedback, should the calculation use the first value, latest value, or every change?
6. What identifier reliably links feedback to the request and its business unit, project, application, and channel?
7. Which timestamp determines whether feedback belongs to the selected reporting period?
8. Should the card show feedback-event percentages, distinct-user percentages, or both?
9. Should a feedback response rate also be shown, and what is the eligible-request denominator?
10. Are minimum cohort sizes or suppression rules required to protect user privacy?
11. Can executives filter feedback by business unit, project, channel, and environment without exposing individual users?
12. Should invalid or unmapped scores be excluded, shown separately, or trigger `Data Pending`?
13. What target and thresholds determine neutral, positive, attention, and critical states?
14. What are the required no-data, `Data Pending`, stale-data, and API-error states?
