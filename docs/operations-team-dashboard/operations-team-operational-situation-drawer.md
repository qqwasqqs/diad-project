# Operational Situation Drawer

**Source:** Operational situation section. **Interaction:** right-side drawer.
**Drawer image:** [Operational Situation](operations-team-operational-situation-drawer-01.png).

## Design

Shows the three illustrative stability signals together: End-to-End P95 `1.20 s`,
API Error Rate `1.14%`, and Pipeline Failure Rate `0.7%`; a compact 30-day
three-series trend; a calculation-context table; and `Alert feed — THRESHOLD
PENDING`. It adds direction and calculation provenance, not a composite health
score or incident conclusion.

### Confirmed facts

The sources supply fields/formulas for the three metrics; alert-event/rule and
threshold contracts are missing.

### Assumptions and missing evidence

All values are illustrative. Time buckets, eligible outcomes, retries,
deduplication, attribution, alert rules, and thresholds remain pending. No raw
error messages, incident actions, or alert counts appear.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: A dimmed Operations Team main view behind a non-scrolling white right-side drawer. Header: "OPERATIONAL SITUATION DETAILS"; title "Operational situation"; subtitle "Stability signals and alert readiness"; close X. Add the exact illustrative banner. Show three cards: "End-to-End P95" "1.20 s"; "API Error Rate" "1.14%"; "Pipeline Failure Rate" "0.7%". Add card "Stability trend" with three clean lines and legend "End-to-End P95", "API Error Rate", "Pipeline Failure Rate"; label values illustrative. Add table "Calculation context" columns "Metric", "Calculation", "Filter coverage" with P95, Error / eligible requests, Failure / eligible pipeline runs, all filter coverage "PENDING". Add bottom amber row "ALERT FEED — THRESHOLD PENDING" and note "No alert rule or threshold contract available". Preserve Operations visual family; no scrollbar, no raw errors, incident counts, health score, recommendations, or browser chrome.
```
