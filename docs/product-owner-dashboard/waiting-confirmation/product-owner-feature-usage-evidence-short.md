# Feature Usage Evidence — Short Version

## Feature Usage Measurement — DATA PENDING

**Business meaning**

Would show how people use a named product feature. It could measure usage
events, feature adoption, or repeat feature use. These are different measures;
none is the same as session/query volume, workflow completion, satisfaction, or
business value.

**In simple terms**

We do not yet know what “feature usage” should mean for this product, and we do
not have the fields to measure it. `DATA PENDING` means the measurement contract
is missing; it does not mean the feature has zero users or no data exists.

**What is needed to display live data**

Choose one purpose—usage events, adoption, or repeat use—then define the
feature, the valid usage event, its identity and timestamp, and the eligible
population. Adoption also needs an exposure denominator; repeat use also needs
a return-use window. The API must return an approved aggregate or an explicit
availability state, never a session/query proxy.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `feature_id` | Not documented | No stable feature identifier or taxonomy is supplied. |
| Approved usage `event_name` | Not documented | No event distinguishes feature use from background, retry, or automatic activity. |
| `feature_event_key` and event `timestamp` | Not documented | Needed to count valid events once and select the reporting period. |
| Exposure or eligibility event/key | Not documented | Required for adoption; no feature-level denominator is supplied. |
| `user_id`, `session_id`, or approved request key | Existing elsewhere only | Mapped for other metrics, not approved as the feature-measurement grain. |
| Repeat-use window | Not documented | Required only if repeat use is the selected measure. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped elsewhere, not approved for feature-usage attribution. |

**Correlation needed**

Associate each valid usage event with an approved feature ID and the chosen
event, user, session, or request grain. Link it to an eligible exposure only if
adoption is selected. `correlation_id` can connect related logs, but it does not
define a feature, a usage event, exposure, or repeat use.

**Waiting for approval / confirmation**

- Is the KPI usage events, feature adoption, or repeat feature use?
- Which feature taxonomy and event names define valid use, and who owns them?
- What is the event/user/session/request key, timestamp/timezone, and
  retry/deduplication rule?
- For adoption, who is eligible or exposed? For repeat use, what counts as a
  return and over what time window?
- How do privacy, minimum cohort, business-unit/project/channel attribution,
  and `DATA PENDING`/`NO_DATA`/not-applicable states work?
