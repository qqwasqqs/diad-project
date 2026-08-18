# Product Owner Engagement Patterns Drawer

**Source element:** Adoption and engagement.  
**Current Gate 3 candidate:** [product-owner-adoption-and-engagement-drawer-02.png](product-owner-adoption-and-engagement-drawer-02.png).  
**Superseded review artifact:** `product-owner-adoption-and-engagement-drawer-01.png` (retained for traceability; it enlarged the main-view trend).  
**Calculation authority:** [Adoption and engagement](main-view-calculations/adoption-and-engagement.md).

## Design decision

Clicking Adoption and engagement opens an Engagement patterns drawer. It
replaces the repeated sessions/queries trend and headline values with
within-session behavior distributions, a proposed conversation-depth view, and
measurement coverage. This answers a different Product Owner question: how
does observed engagement look inside sessions?

## Supported drawer content

| Element | Evidence and purpose |
| --- | --- |
| Session-depth distribution | Groups sessions by distinct approved queries: `1`, `2–3`, `4–6`, and `7+`. The banding is illustrative. |
| Conversation pattern | Shows proposed average conversations per session from `conversation_id` and `session_id`; it remains conditional on a validated session/conversation relationship. |
| Session-duration distribution | Groups timestamp-derived session spans into illustrative duration bands instead of repeating the average. |
| Engagement measurement coverage | Shows whether session ID, conversation ID, timestamp, and channel are usable for the selected scope; no record-level data appears. |
| Calculation context | Retains key, session, and coverage assumptions. |

## Excluded content

No enlarged Sessions/Queries trend, duplicate headline figures, feature-use
percentage, workflow-completion rate, user/session records, raw telemetry,
satisfaction claim, or causal assertion.

## Evidence classification

### Confirmed facts

- `session_id` identifies a user session; `conversation_id` identifies a
  multi-turn conversation within a session.
- `timestamp_start` supports a minimum/maximum timestamp-derived session span.
- `channel` is a documented entry-channel field.

### Likely interpretations

- Session depth, conversation depth, and duration distribution help a Product
  Owner distinguish shallow from more sustained observed engagement.

### Assumptions

- Query-depth bands are `1`, `2–3`, `4–6`, and `7+`; duration bands are
  `0–2 min`, `3–7 min`, `8–15 min`, and `16+ min`.
- `conversations per session = COUNT(DISTINCT conversation_id) / COUNT(DISTINCT session_id)` is a proposed aggregation, not a supplied formula.
- Pictured distributions and coverage values are illustrative.

### Missing evidence and client questions

Confirm the canonical query key; session-end/idle-gap/cross-day rule;
conversation/session relationship; one-query-session duration treatment;
timestamp/timezone; duplicate/retry behavior; channel and selected-dimension
attribution; coverage threshold; and no-data behavior.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Engagement patterns drawer over the dimmed Product Owner Dashboard main view. It must add within-session behavior and measurement coverage, not enlarge or repeat the main-view Sessions and Queries trend.
Input images: Image 1 is the Product Owner main-view image, used as the background/layout reference. Image 2 is the Technical Teams quality drawer, used only as interaction-pattern reference.
Composition: right white drawer about 40% screen width. Top label exactly "ENGAGEMENT PATTERNS DETAILS", close X, title "Engagement patterns", subtitle "Observed behavior within sessions", scope text "Last 30 days · All business units · All projects · All channels", and the amber illustrative-values banner.

Top left card title exactly "Session depth distribution". Show a compact horizontal bar distribution with exact categories and illustrative shares: "1 query 31%", "2–3 queries 36%", "4–6 queries 21%", "7+ queries 12%". Add small label exactly "Illustrative session grouping".

Top right card title exactly "Conversation pattern". Show one simple donut or bar visual titled "Conversations per session" with illustrative value "1.6" and exact state "PROPOSED AGGREGATION". Add small text "Requires validated session and conversation relationship".

Middle left card title exactly "Session-duration distribution". Show four compact vertical or horizontal bars with exact labels and illustrative shares: "0–2 min 29%", "3–7 min 34%", "8–15 min 23%", "16+ min 14%". Add small label exactly "Timestamp-derived session spans".

Middle right card title exactly "Engagement measurement coverage". Show four rows: "Session ID", "Conversation ID", "Timestamp", "Channel"; each has exact state "PENDING". Add small text "Coverage threshold not supplied".

Bottom table title exactly "Calculation context" with columns "Signal", "Proposed calculation", "Coverage" and four rows: "Session depth" "Distinct approved query key per session" "PENDING"; "Conversation pattern" "Distinct conversations / sessions" "PENDING"; "Session duration" "Max minus min timestamp" "PENDING"; "Channel" "Classified entry channel" "PENDING". Bottom neutral note exactly "ENGAGEMENT PATTERNS ARE NOT FEATURE ADOPTION OR WORKFLOW COMPLETION".
Constraints: no scrollbar; preserve dimmed main view; do not show the main Sessions/Queries trend, repeated total queries/sessions, individual users/sessions, feature use, completion percentage, satisfaction, raw telemetry, causal claims, technical diagnostics, or extra KPIs.
```
