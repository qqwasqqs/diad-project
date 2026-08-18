# Failure Surface Drawer

**Source:** Failure surface section. **Interaction:** right-side drawer.
**Drawer image:** [Failure Surface](operations-team-failure-surface-drawer-01.png).

## Design

Shows all nine illustrative rates in a compact three-column comparison, a table
of workload and eligible unit, and explicit classification/partial-failure
pending notices. It adds rate provenance, not root cause.

### Evidence boundary

Every workload has its own denominator. No combined rate, raw error message,
trace, alert action, incident claim, or remediation control is allowed.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a non-scrolling drawer. Header "FAILURE SURFACE DETAILS"; title "Failure surface"; subtitle "Compare workload-specific failure rates"; close X and illustrative banner. Card "Failure-rate comparison" has nine compact labeled bars: Pipeline 0.7%, Activity 0.6%, Job 0.9%, API 1.14%, Training 0.5%, MLflow Span 0.8%, Indexing 0.6%, Transcription 0.4%, Translation 0.3%. Card "Calculation context" table columns "Workload", "Eligible unit", "Filter coverage"; use Pipeline run, Activity run, Job run, API request, Training run, MLflow span, Indexing operation, Transcription operation, Translation operation; all coverage "PENDING". Amber rows exactly "FAILURE CLASSIFICATION PENDING" and "INDEXING PARTIAL-FAILURE RULE PENDING". No raw errors, counts, shared rate, thresholds, incidents, remediation, scrollbar, or browser chrome.
```
