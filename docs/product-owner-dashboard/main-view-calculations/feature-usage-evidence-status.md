# Feature Usage Evidence — Pending-State Specification

## Element shown in the approved main view

`Feature usage evidence — DATA PENDING` with `No feature identifier or usage formula supplied` is intentionally nonnumeric.

## Persona support and evidence gap

Feature usage is a confirmed Product Owner need. The supplied mapping has session, query, channel, application, and evaluator fields but no stable `feature_id`, feature event name, feature exposure/eligibility definition, or feature-usage formula. Session/query volume is adoption evidence, not a valid substitute for feature-level usage.

## Meaning and required future calculation

The state answers: **is a validated feature-usage measure available for the selected scope?** It does not mean no one used features or no data exists elsewhere.

An eventual implementation needs a feature identifier, approved event taxonomy, user/session/request grain, and eligible denominator. For example only:

```text
feature_usage_count = COUNT(DISTINCT approved event_key where event_name = approved usage event)
feature_adoption    = COUNT(DISTINCT eligible user/session using feature) /
                      COUNT(DISTINCT eligible user/session exposed to feature) * 100
```

Neither formula is authorized by current evidence.

## Assumptions and questions

Assume the API returns `DATA PENDING` until a contract exists. Confirm feature taxonomy and ownership; instrumentation events/keys/timestamps; use versus exposure; user/session/request denominator; repeat/retry treatment; privacy/minimum cohort; BU/project/channel attribution; and no-data/not-applicable semantics.
