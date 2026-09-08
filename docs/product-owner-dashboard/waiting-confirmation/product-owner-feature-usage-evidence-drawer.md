# Feature Usage Evidence — Waiting for Confirmation

## Scope

This tracker explains why the **Feature usage evidence** section on the Product
Owner Dashboard main view displays `DATA PENDING`. The state means a feature
measurement contract has not been supplied; it does **not** mean no one uses a
feature, no data exists anywhere, or feature use is zero.

Feature usage is a confirmed Product Owner need, but the current mapping only
supports broader session/query activity. That activity is adoption evidence and
must not be presented as a feature-usage, feature-adoption, or repeat-use KPI.

The decision canvas presents four related pending proposals:

1. choose the measurement purpose;
2. define usage events;
3. define feature adoption or repeat feature use; and
4. establish measurement coverage, ownership, and reporting rules.

## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. This
tracker treats it as an available cross-log join field and never as a display
field. It can connect related records, but it does **not** define a feature, a
usage event, an exposure, or repeat use. Those identities and relationships
need client approval.

### Field-status legend

The statuses below compare a needed field with the Product Owner Concept's
documented **Key fields** inventory. They do not confirm live instrumentation
or an API response.

- **Existing for this metric** — listed for the same mapped metric.
- **Existing elsewhere only** — listed for another mapped metric or available
  under the platform-wide logging decision, but not approved for this use.
- **Not documented** — absent from the Concept's field inventory for this
  purpose.

## 1. Measurement purpose — decision pending

**Business meaning**

Selects the Product Owner question the eventual KPI must answer: how often a
feature is used, who uses an available feature, or who returns to use it again.
These are different measures and should not share a label or formula by default.

**In simple terms**

We first need to decide what “feature usage” means for this product. Counting
clicks, measuring adoption, and measuring repeat use can all be useful, but
they answer different questions and need different data.

**Why we propose it**

Without this choice, a number could look useful while answering the wrong
business question. For example, a high event count can come from a small group
of frequent users; it does not prove that many eligible people adopted the
feature. Likewise, repeat use requires a return rule that a one-time event
count does not need.

**What is needed to complete the decision**

One approved measurement purpose, its Product Owner decision, measurement
grain, and accountable owner. Only then can the event taxonomy, denominator,
and formula be designed. The three candidate formula shapes remain proposals,
not current calculations.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` or approved feature taxonomy key | Not documented | No stable feature identifier is supplied. |
| Approved feature `event_name` | Not documented | No feature event or event taxonomy is supplied. |
| Event key | Not documented | Needed to identify one event and remove retries/duplicates. |
| Event `timestamp` | Not documented | Needed for period selection, sequence, and repeat-use windows. |
| `user_id` | Existing elsewhere only | Listed for Session & Query Volume and User Satisfaction Rate, not approved for feature measurement. |
| `session_id` | Existing elsewhere only | Listed for Session & Query Volume, not approved as the feature-measurement grain. |
| Request key | Existing elsewhere only | `request_id` is listed for Request Throughput, not approved as a feature event identity. |

**Correlation needed**

No aggregation is chosen yet. Link each approved feature event to its feature
identifier and the approved user, session, request, or event grain.
`correlation_id` may connect related logs when necessary, but it cannot replace
the feature identifier or event key.

**Waiting for approval / confirmation**

- Which measurement purpose is primary: usage events, feature adoption, or
  repeat feature use.
- The Product Owner decision that the selected measure will inform.
- The grain: event, user, session, request, or another approved unit.
- The feature taxonomy, its owner, and whether one KPI covers one feature,
  feature family, or a clearly defined product capability.

## 2. Usage events — proposed measurement path

**Business meaning**

Would show how often an approved feature action occurs in the selected scope.
It can reveal interaction volume for a named capability. It does not show how
many eligible people adopted the feature, returned to it, completed a workflow,
or achieved a business outcome.

**In simple terms**

If the question is “how often is this feature used?”, we need to log the one or
more actions that count as actual use. We must also avoid counting automatic
events, background work, failed attempts, and retries as user use.

**Why we propose it**

Event volume is often the simplest starting point once the Product Owner needs
to understand interaction with a feature. It is only meaningful when the
feature and qualifying action are explicit; session and query volume cannot
tell us which feature caused the activity.

**What is needed to display live data**

An approved `feature_id`, event taxonomy, canonical event key, timestamp,
eligible-event rule, and duplicate/retry treatment. The result should be an
aggregate count of distinct eligible usage events for the selected scope.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` | Not documented | Required to identify the capability being measured. |
| Approved usage `event_name` | Not documented | Required to distinguish feature use from exposure, error, background, or retry events. |
| `feature_event_key` | Not documented | Required for distinct counting and deduplication. |
| Feature-event `timestamp` | Not documented | Required for the selected period and timezone. |
| Eligibility/status marker | Not documented | Required to exclude non-user, failed, test, and automatic events as agreed. |
| `correlation_id` | Existing elsewhere only | Available for cross-log joins, subject to feature-event-specific approval. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped for other Product Owner uses, not approved feature-event attribution. |

**Correlation needed**

Count each approved event key once under the selected feature identifier. Use
`correlation_id` only to enrich or deduplicate a related event when its
cardinality is confirmed. Do not count a request, session, model call, agent
step, or retry as a usage event unless the client explicitly defines it that way.

**Waiting for approval / confirmation**

- Feature identifiers, names, hierarchy, and taxonomy owner.
- Which event or events mean feature use, including success/failure and
  user-initiated/automatic behavior.
- Canonical event key, timestamp/timezone, retry, duplicate, and test-event
  treatment.
- Selected-scope attribution, aggregate privacy/minimum-cohort rules, and
  `NO_DATA` versus `DATA PENDING` behavior.

## 3. Feature adoption — proposed measurement path

**Business meaning**

Would show the share of eligible people or sessions that use an available
feature. It answers reach among the population that could use the feature; it
does not show event volume, repeat use, workflow completion, satisfaction, or
business value.

**In simple terms**

To measure adoption, we need two groups: the people or sessions that could use
the feature, and the ones that actually use it. Without the first group, we can
count activity but cannot honestly calculate an adoption percentage.

**Why we propose it**

An adoption measure can help a Product Owner decide whether an available
capability is reaching its intended audience. It avoids calling a feature
successful merely because a few people use it frequently.

**What is needed to display live data**

An approved feature identifier and usage event, an exposure or eligibility
event, a user-or-session grain, canonical keys and timestamps, a period rule,
and an approved denominator. The proposed formula is:

```text
feature_adoption = COUNT(DISTINCT eligible users or sessions using feature) /
                   COUNT(DISTINCT eligible exposed users or sessions) * 100
```

This formula is illustrative until the client confirms every term.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` | Not documented | Required to identify the feature whose adoption is measured. |
| Approved usage `event_name` and `feature_event_key` | Not documented | Required to identify one valid use of the feature. |
| Exposure or eligibility event/key | Not documented | Required to define who or what had a genuine opportunity to use the feature. |
| Exposure and usage `timestamp` | Not documented | Required for a consistent adoption period and ordering rule. |
| `user_id` or `session_id` | Existing elsewhere only | Available in Session & Query Volume, but not approved as the adoption grain. |
| `correlation_id` | Existing elsewhere only | May support joins, but it is not an exposure or feature-adoption identity. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved for feature-adoption attribution. |

**Correlation needed**

Associate a valid use event with one eligible exposed user or session under the
approved feature ID. Confirm whether one person can have multiple sessions,
whether an exposure must happen before use, and how anonymous or missing IDs are
handled. `correlation_id` can support a related-log join only after cardinality
and privacy rules are approved.

**Waiting for approval / confirmation**

- The feature's intended eligible/exposed population and the event that proves
  a real opportunity to use it.
- Whether adoption is measured by distinct users, sessions, accounts, or
  another approved unit.
- Exposure-before-use, cross-session, anonymous-ID, duplicate, and retry rules.
- Adoption period, timestamp/timezone, scope attribution, privacy/minimum
  cohort, and no-data/not-applicable behavior.

## 4. Repeat feature use — proposed measurement path

**Business meaning**

Would show the share of approved users or sessions that use a feature again
within an agreed period. It can indicate recurring interaction with a feature.
It does not prove retention, feature satisfaction, workflow completion, or
business value.

**In simple terms**

To know whether people return to a feature, we need to define the first use,
the later use, and how long a return window lasts. Two clicks in one automated
operation should not automatically count as someone coming back.

**Why we propose it**

Repeat use may answer a different Product Owner question from initial adoption:
whether people find a feature useful enough to revisit. It needs a stable
identity and timing rules, so it cannot be derived from total sessions or a
single event count.

**What is needed to display live data**

An approved feature ID and use event, a stable user/session identity, first-use
and return-use definitions, a repeat window, event keys/timestamps, and a
deduplication rule. The proposed formula is:

```text
repeat_use_rate = COUNT(DISTINCT users or sessions using feature again) /
                  COUNT(DISTINCT users or sessions using feature) * 100
```

This formula is illustrative until the client confirms every term.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` | Not documented | Required to keep first and return use tied to the same feature. |
| Approved usage `event_name` and `feature_event_key` | Not documented | Required to identify distinct valid use events. |
| Feature-event `timestamp` | Not documented | Required to order first and return use and apply the repeat window. |
| `user_id` or `session_id` | Existing elsewhere only | Available in Session & Query Volume, but not approved as the repeat-use grain. |
| Repeat-window definition | Not documented | Required business rule, such as a second use on a later day or within a stated period. |
| `correlation_id` | Existing elsewhere only | Can connect related logs but cannot establish a repeat-use identity. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved for repeat-use attribution. |

**Correlation needed**

Order valid, deduplicated events for one approved user or session and feature
ID, then apply the repeat-window rule. Confirm whether same-session use can
count, how IDs span devices/channels, and how replays or retries are excluded.
Do not use `correlation_id` as a substitute for a person or session identity.

**Waiting for approval / confirmation**

- The repeat-use definition, time window, and whether same-session use counts.
- The approved user, session, account, or other identity for return use.
- Cross-device/channel, anonymous-ID, retry, replay, and duplicate treatment.
- First-use cohort, timestamp/timezone, scope attribution, privacy/minimum
  cohort, and no-data/not-applicable behavior.

## 5. Measurement coverage and ownership — readiness pending

**Business meaning**

Shows whether the required feature, event, identity, timing, scope, and privacy
evidence is complete enough to publish the selected measure. It is a readiness
check, not another feature KPI and not a statement that coverage is zero.

**In simple terms**

Before publishing a number, we need to know that the basic ingredients exist,
are reliable, and have owners. This prevents a partial or unowned event stream
from becoming an apparently precise product metric.

**Why we propose it**

All three candidate measurement paths depend on the same missing foundation:
feature taxonomy, usable events, stable keys/timestamps, selected-scope
attribution, and privacy rules. An explicit readiness check makes the work and
the decision owners visible instead of hiding them behind `DATA PENDING`.

**What is needed to display live data**

A coverage threshold, completeness/freshness checks, a selected-scope
attribution contract, named owners for taxonomy and exposure/eligibility, and
approved API states for complete, partial, unavailable, no data, and not
applicable. Return aggregate coverage only; do not expose raw events or user
identities.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` and feature taxonomy version | Not documented | Needed to prove that events are classified under an approved feature. |
| Approved usage/exposure event and event key | Not documented | Needed to confirm the selected measure's numerator and denominator inputs. |
| Event `timestamp` | Not documented | Needed for completeness, freshness, period, and repeat-window checks. |
| Approved user/session/request identity | Existing elsewhere only | Candidate identities are mapped elsewhere; none is approved for feature measurement. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved feature-measurement attribution. |
| Coverage threshold, owner, and privacy/minimum-cohort rule | Not documented | Required measurement-governance metadata is not supplied. |

**Correlation needed**

No new business metric is calculated here. Confirm that the approved feature,
event, identity, timestamp, and selected-scope fields can be related for the
chosen measurement path. `correlation_id` can support related-log checks, but
does not replace any required field or ownership decision.

**Waiting for approval / confirmation**

- Feature taxonomy owner; instrumentation owner; and exposure/eligibility owner.
- Field completeness, validity, freshness, coverage threshold, and partial
  coverage rules.
- Privacy, access, pseudonymous identity, and minimum-cohort requirements.
- Business-unit, project, and channel attribution for the selected measure.
- API behavior for `DATA PENDING`, `NO_DATA`, partial coverage,
  `FILTER_BREAKDOWN_UNAVAILABLE`, and not applicable.

## Excluded from this tracker

This tracker does not invent a feature name, numerical usage/adoption/repeat
rate, workflow-completion percentage, session/query-volume proxy, event stream,
schema, endpoint, raw user data, implementation plan, technical diagnostic, or
claim that a proposed formula is approved.

## Quick view — why the main view is `DATA PENDING`

| Pending element | Business value when defined | Confirmation needed |
| --- | --- | --- |
| Measurement purpose | Ensures the KPI answers the intended Product Owner question. | Choose usage events, adoption, or repeat use; name the decision and owner. |
| Usage events | Shows interaction volume for a named feature. | Feature/event taxonomy, event key/timestamp, eligibility, deduplication, and scope. |
| Feature adoption | Shows reach among people or sessions that could use the feature. | Exposure population, measurement grain, denominator, and attribution. |
| Repeat feature use | Shows recurring interaction under an agreed return rule. | Stable identity, first/return-use rule, time window, and duplicate treatment. |
| Coverage and ownership | Prevents incomplete or unowned telemetry becoming a misleading KPI. | Coverage, freshness, privacy, owners, and availability-state contract. |
