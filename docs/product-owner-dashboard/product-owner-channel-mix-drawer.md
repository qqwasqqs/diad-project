# Product Owner Channel Engagement Patterns Drawer

**Source element:** Channel mix.  
**Current Gate 3 candidate:** [product-owner-channel-mix-drawer-02.png](product-owner-channel-mix-drawer-02.png).  
**Superseded review artifact:** `product-owner-channel-mix-drawer-01.png` (retained for traceability; it repeated the main-view share snapshot).  
**Calculation authority:** [Channel mix](main-view-calculations/channel-mix.md) and [Adoption and engagement](main-view-calculations/adoption-and-engagement.md).

## Design decision

Clicking Channel mix opens a Channel engagement patterns drawer. It replaces the
repeated share bars with a time-based mix trend, a proposed channel-level
engagement comparison, and attribution readiness. It answers which entry
channels are gaining or losing share and whether they may have different
observed engagement patterns.

## Supported drawer content

| Element | Evidence and purpose |
| --- | --- |
| Channel share evolution | Illustrative 30-day 100%-stacked share trend for Web, Teams, Mobile, and API. It is a proposed time bucketing of the channel-share calculation. |
| Engagement by entry channel | Proposed `queries/session` and timestamp-derived average session duration comparison. It is conditional on a valid session-to-entry-channel rule. |
| Channel attribution readiness | Makes channel classification, session assignment, timestamp, and BU/project attribution evidence visible. |
| Calculation context | Keeps query-key, grouping, and attribution assumptions traceable. |

## Excluded content

No repeated channel share snapshot, users, sessions, application names,
feature-adoption or completion claims, satisfaction/performance comparison,
raw telemetry, or claimed channel causation.

## Evidence classification

### Confirmed facts

- `channel` is a documented UI engagement field with examples `web`, `teams`,
  `mobile`, and `api`.
- `session_id` and `timestamp_start` support the mapped session engagement
  calculations.

### Likely interpretations

- Channel-mix direction and channel-level engagement comparisons are useful to
  Product Owners when labels and attribution limits remain explicit.

### Assumptions

- The 100%-stacked trend uses daily classified-query shares.
- The comparison assigns each session to one approved entry channel and derives
  query depth/duration using the session rules in the adoption specification.
- Pictured values are illustrative; no channel is presented as better/worse.

### Missing evidence and client questions

Confirm channel vocabulary/normalization, unknown/multi-channel request and
session treatment, canonical query key, entry-channel assignment, session-end
rule, timestamp/timezone, retries/deduplication, BU/project attribution,
coverage threshold, and no-data behavior.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Product Owner main view with a right-side detail drawer
Primary request: Create a compact non-scrolling revised Channel engagement patterns drawer over the dimmed Product Owner Dashboard main view. It must add time-based channel mix and cautiously proposed engagement comparison, not repeat the main-view channel-share snapshot.
Input images: Image 1 is the Product Owner main-view image, used as background/layout reference. Image 2 is the Technical Teams quality drawer, used only as interaction-pattern reference.
Composition: right white drawer about 40% screen width. Top label exactly "CHANNEL ENGAGEMENT PATTERNS DETAILS", close X, title "Channel engagement patterns", subtitle "Entry-channel change and observed session context", scope text "Last 30 days · All business units · All projects · All channels", and the amber illustrative-values banner.

Top card title exactly "Channel share evolution". Show a clean 30-day 100%-stacked area chart with legend exactly "Web", "Teams", "Mobile", "API" and y-axis label "Share of classified queries". Add small label exactly "Illustrative daily classified-query share". Do not repeat the four main-view bar percentages.

Middle left card title exactly "Engagement by entry channel". Show a compact comparison matrix with rows "Web", "Teams", "Mobile", "API" and columns exactly "Queries / session" and "Avg session duration". Use illustrative values: Web "4.8" "8.6 min"; Teams "4.2" "7.9 min"; Mobile "3.7" "6.4 min"; API "5.1" "9.1 min". Put exact amber label "PROPOSED AGGREGATION" above/below the matrix.

Middle right card title exactly "Channel attribution readiness". Show four rows: "Channel vocabulary", "Session to entry channel", "Timestamp", "Business unit and project attribution"; each has exact state "PENDING". Add small text "Multi-channel session rule not supplied".

Bottom table title exactly "Calculation context" with columns "Signal", "Proposed calculation", "Coverage" and rows: "Share evolution" "Classified queries by day" "PENDING"; "Queries / session" "Distinct query key per assigned channel session" "PENDING"; "Session duration" "Max minus min timestamp" "PENDING"; "Channel assignment" "Approved entry channel rule" "PENDING". Bottom neutral note exactly "CHANNEL PATTERNS DO NOT ESTABLISH FEATURE ADOPTION, SATISFACTION, OR CAUSATION".
Constraints: no scrollbar; retain dimmed main view; no repeated share snapshot, user/session details, raw data, named applications, feature/completion/satisfaction metric, latency or performance claims, causal claims, technical diagnostics, or extra KPIs.
```
