# Channel Mix — Short Version

## Element shown in the approved main view

The `Channel mix` card displays four illustrative horizontal shares: `Web 52%`, `Teams 28%`, `Mobile 14%`, and `API 6%`, labelled `Illustrative channel breakdown`.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Product Owners |
| Supporting metric | Session & Query Volume (Session Length / Query per Session) |
| Source | UI Layer |
| Fields | `channel`, `session_id`, `timestamp_start` |
| Field semantics | `channel` examples: web, teams, mobile, api |
| Mapped calculation | No channel-share formula supplied |

`channel` supports a proposed entry-channel breakdown, but it does not itself identify product features or outcomes.

## Proposed calculation

Use the same eligible user-query population as Adoption and Engagement, with one approved query key per request.

```text
channel_queries(channel) = COUNT(DISTINCT approved query_key where channel = value)
all_classified_queries   = SUM(channel_queries for approved channel values)
channel_share_percent    = channel_queries(channel) / all_classified_queries * 100
```

The shares should total 100% only across the explicitly classified, eligible channel population. Example `52, 28, 14, 6` sums to `100%` and is illustrative. Do not assign null, unknown, or unmapped channels to a named channel.

## Meaning and eligible population

This answers: **Which documented entry channels account for observed eligible product queries?** It is query volume by channel, not unique users, feature adoption, workflow completion, satisfaction, or business value.

Deduplicate query telemetry; use the approved time and request identity rule; keep unknown/missing channels separate; and never expose individual sessions/users.

## Assumptions and questions

Assume channel is reliably available on the eligible UI query event and counts are query-weighted. Confirm channel vocabulary, case/alias normalization, whether requests may have multiple channels, query versus session/user weighting, unknown handling, timestamp/timezone, BU/project attribution, and whether the global `All channels` filter changes this visual or makes it redundant.
