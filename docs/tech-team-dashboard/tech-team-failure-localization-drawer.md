# Technical Teams Failure Localization Drawer

**Source element:** the **Failure localization** chart with eight service-specific failure-rate bars.  
**Approved Gate 3 image:** [tech-team-failure-localization-drawer-01.png](tech-team-failure-localization-drawer-01.png)  
**Calculation authority:** [Failure Localization](main-view-calculations/failure-localization-chart.md).

## Design decision

Clicking the Failure localization chart opens a compact right-side drawer for the eight rates as one comparison. It adds calculation provenance and safe source-status context; it does not claim root cause.

## Supported drawer content

| Drawer element | Evidence and purpose |
|---|---|
| Eight-rate comparison | Pipeline, Job, Inference, API Service, Training, Indexing, Transcription, Translation; illustrative bars and percentages. |
| Calculation/provenance table | Records each workload’s failure-rate calculation and eligible unit without implying a shared denominator. |
| Source-status context | Shows only safe, mapped classification fields (for example pipeline status, job terminal state, training/indexing/transcription/translation status). |
| Pending notices | `FAILURE CLASSIFICATION PENDING` and `INDEXING PARTIAL-FAILURE RULE PENDING`. |

## Excluded content

No raw error message, stack trace, request ID, incident claim, alert action, operational remediation, user/prompt content, or misleading combined failure rate.

## Evidence classification

### Confirmed facts

- The main view visibly contains eight service-specific rates in the Failure localization chart.
- Each rate has a distinct source/status taxonomy and calculation grain.

### Likely interpretation

Technical Teams need rate provenance and safe classification context before a deeper trace/investigation workflow.

### Assumptions

The drawer remains non-scrolling by using a compact two-column comparison and a concise eight-row table. All counts stay absent until a contract supports them.

### Missing evidence and client questions

What failure/status rule, denominator, retry rule, error-code taxonomy, timestamp/timezone, minimum sample, filter attribution, and coverage state apply to every rate? Does `failed_document_count` create an Indexing failure or a separate partial-failure measure?

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Technical Teams main view with a right-side detail drawer
Primary request: Create a compact non-scrolling Failure localization drawer over the dimmed Technical Teams main view.
Input images: Image 1 is the Technical Teams main-view reference; Image 2 is the Executive drawer reference for interaction pattern only.
Composition: Right drawer top text exactly “FAILURE LOCALIZATION DETAILS”, title “Failure localization”, subtitle “Compare service-specific failure rates”. Include the illustrative-values banner. Show eight labeled horizontal bars in two columns with exact values: Pipeline 0.7%, Job 0.9%, Inference 1.14%, API Service 0.8%, Training 0.5%, Indexing 0.6%, Transcription 0.4%, Translation 0.3%. Add a compact table titled “Calculation context” with columns “Workload”, “Failure calculation”, “Filter coverage”; every row uses exact calculation text “Failure / eligible unit” and coverage says “PENDING”. Add two exact amber labels: “FAILURE CLASSIFICATION PENDING” and “INDEXING PARTIAL-FAILURE RULE PENDING”.
Constraints: No scrollbar. Do not display raw error messages, counts, traces, incident/remediation controls, shared/combined rate, thresholds, or unsupported cause claims.
```
