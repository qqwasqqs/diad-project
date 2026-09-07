# Channel Mix Drawer — Waiting for Confirmation

## Scope

This tracker covers only elements currently displayed in the **Channel mix**
main-view section or its **Channel engagement patterns** detail drawer for
which a data contract, calculation definition, attribution rule, or approval is
still missing. It does not list elements whose display contract is already
clear, and it does not turn a pending state into a zero value.

The drawer's channel shares, trends, comparisons, and readiness states are
illustrative until the listed confirmations are complete.

## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. This
tracker treats it as an available cross-log join field and never as a display
field. It can connect related emitted events, but it does **not** itself define
a query, a session, or a channel assignment. Those identities and their
aggregation rules still require the confirmations below.

### Field-status legend

The statuses below compare the required field with the Concept's documented
**Key fields** inventory. They do not confirm live telemetry or an API response.

- **Existing for this metric** — listed for Session & Query Volume, the mapped
  supporting metric for Channel mix.
- **Existing elsewhere only** — present in another Concept metric, but not
  supplied or approved for this Channel mix calculation.
- **Not documented** — absent from the Concept's field inventory for the
  required purpose.

## 1. Channel Share Evolution — proposed daily trend

**Business meaning**  
Shows how the share of eligible product queries changes over time for the
approved entry channels: Web, Teams, Mobile, and API. It is a query-volume mix,
not a count of users, feature adoption, workflow completion, satisfaction, or
business value.

**In simple terms**  
We want to see whether people are entering through Web, Teams, Mobile, or the
API more or less often over time. Before we trust the trend, we need to agree
what each channel name means and how to treat missing or unknown channels.

**What is needed to display live data**  
One eligible, deduplicated user-query population; an approved query identity;
a channel vocabulary and normalization rule; daily time buckets; and a decision
that shares use only classified queries. Unknown, null, or unmapped channels
must remain separate rather than being assigned to a named channel.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `channel` | Existing for this metric | Listed for Session & Query Volume, with documented examples Web, Teams, Mobile, and API. |
| Approved normalized channel value | Not documented | The Concept lists `channel`, but no approved alias/case normalization field or rule. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume; needed for daily time buckets. |
| `query_key` | Not documented | No canonical query-key field is listed in the Concept. |
| `request_id` | Existing elsewhere only | Listed for Request Throughput, not Channel Mix; it is not yet approved as the query key. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; the platform-wide logging decision makes it available for joins, subject to metric-specific approval. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not Channel Share attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not Channel Share attribution. |

**Correlation needed**  
Associate each approved query with one approved normalized entry channel. Use
the query key to deduplicate query events; use `correlation_id` only to connect
related component logs when the channel requires enrichment. Apply the selected
business-unit and project scope only when attribution is reliable.

**Waiting for approval / confirmation**

- Channel vocabulary, aliases, casing, and normalization rule.
- Treatment of null, unknown, unmapped, and multi-channel requests.
- Canonical query key, eligibility, retry, and deduplication rules.
- Daily bucket and timezone rule.
- Whether shares use query weighting, session weighting, or another approved
  population; the current proposal is query-weighted.
- Business-unit and project attribution, coverage, and no-data behavior.

## 2. Engagement by Entry Channel — proposed aggregation

**Business meaning**  
Compares queries per session and average session duration across the approved
entry channels. It may help describe different observed usage patterns, but it
does not establish that one channel is better, causes engagement, drives
satisfaction, or produces business value.

**In simple terms**  
We want to compare how people use the product after entering through different
channels. For example, do Web sessions usually contain more queries than Mobile
sessions? Before using this comparison, we need to decide which single channel
belongs to a session that uses more than one channel.

**What is needed to display live data**  
An approved entry-channel assignment for every eligible session, a canonical
query key, session boundaries, timestamp-based duration rules, and consistent
selected-scope attribution. Each session must be assigned to one channel—or be
excluded or shown separately—before queries per session and average duration
can be compared fairly.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `channel` | Existing for this metric | Listed for Session & Query Volume; its session-level assignment rule is not supplied. |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume; needed to derive a session span. |
| `query_key` | Not documented | No canonical query-key field is listed in the Concept. |
| `correlation_id` | Existing elsewhere only | Listed for User Accountability, not Session & Query Volume; available for cross-log joins but not a session or channel key. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not channel-level engagement attribution. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not channel-level engagement attribution. |

**Correlation needed**  
Group approved queries by `session_id`, assign each session one approved entry
channel, and derive duration from valid timestamps. Use `correlation_id` only
for cross-log enrichment; it must not replace the session ID or decide the
entry channel. Apply the same eligibility, retry, duplicate, and selected-scope
rules to every channel.

**Waiting for approval / confirmation**

- Entry-channel assignment rule, including multi-channel sessions.
- Canonical query key, session boundary, and duplicate/retry rules.
- One-query-session, idle-gap, cross-day, and missing-timestamp treatment.
- Whether queries/session and average duration are the right comparison for the
  Product Owner's decision.
- Timestamp/timezone and business-unit/project attribution.
- Coverage threshold, privacy/minimum-cohort rule, and no-data behavior.

## 3. Channel Attribution Readiness — readiness pending

**Business meaning**  
Shows whether the evidence needed to make the Channel Mix view reliable is
available for the selected scope: channel vocabulary, session-to-entry-channel
assignment, timestamp, and business-unit/project attribution. It is a
readiness check, not another engagement KPI and not a statement that coverage
is zero.

**In simple terms**  
Before we compare channels, we need to know that we can identify the channel
correctly and connect it to the right session, date, business unit, and project.
This panel is a checklist showing that those connections still need to be
verified.

**What is needed to display live data**  
A coverage threshold for each required field or relationship, completeness and
freshness checks, an approved classification and session-assignment rule, and
API states that distinguish complete, partial, unavailable, and no-data
coverage.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `channel` | Existing for this metric | Listed for Session & Query Volume. |
| `session_id` | Existing for this metric | Listed for Session & Query Volume. |
| `timestamp_start` | Existing for this metric | Listed for Session & Query Volume. |
| `business_unit` | Existing elsewhere only | Listed for Business Ownership, not a supplied Channel Mix attribution field. |
| `project_name` | Existing elsewhere only | Listed for Business Ownership, not a supplied Channel Mix attribution field. |
| `correlation_id` | Existing elsewhere only | Available for cross-log joins under the platform-wide logging decision, but not listed for Session & Query Volume attribution. |

**Correlation needed**  
Confirm that the approved event relationships reliably connect a classified
channel to the session, timestamp, business unit, and project for the selected
scope. `correlation_id` can support cross-log attribution checks but does not
replace channel classification or session assignment.

**Waiting for approval / confirmation**

- Channel-vocabulary and normalization coverage threshold.
- Session-to-entry-channel assignment, including multi-channel sessions.
- Timestamp completeness, timezone, and daily-bucket rule.
- Business-unit and project attribution contract.
- Complete, partial, unavailable, and no-data API states.

## Excluded from this tracker

This drawer intentionally does not add repeated channel-share bars, raw users
or sessions, named applications, feature adoption, workflow completion,
satisfaction, latency/performance comparisons, technical diagnostics, or causal
claims. Channel patterns alone do not establish those outcomes.

## Quick view — required confirmations

| Displayed element | Confirmation needed |
| --- | --- |
| Channel Share Evolution | Channel vocabulary/normalization; eligible query population; unknown-channel treatment; time and selected-scope attribution. |
| Engagement by Entry Channel | Session-to-entry-channel rule; query/session/duration definitions; multi-channel and selected-scope treatment. |
| Channel Attribution Readiness | Coverage thresholds; classification and attribution completeness; API states for partial or unavailable data. |
