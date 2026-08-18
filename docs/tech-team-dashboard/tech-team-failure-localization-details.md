# Technical Teams Failure Localization Explorer Detail

**Source element:** Failure localization panel in [`tech-team-dashboard-alternative-02.png`](tech-team-dashboard-alternative-02.png)  
**Calculation authority:** [Failure Localization](main-view-calculations/failure-localization-chart.md) and [Inference Error Rate](main-view-calculations/inference-error-rate.md).

## Design decision

Open an in-persona **Failure localization explorer** from the whole Failure localization panel. It enables a Technical Team to identify which workload’s rate has changed and review safe, source-specific error categories without presenting raw error payloads.

## Supported detail content

| Detail element | Added question | Fields / calculation | Feasibility |
|---|---|---|---|
| Selected-workload rate trend | When did the selected workload’s failure rate change? | One mapped failure-rate formula per selected workload, bucketed over time. | Derivable; buckets/grain pending. |
| Eight-workload comparison table | Which rate is highest, and what are the failed/eligible counts? | Main-view rates plus proposed failed and eligible counts. | Rate supported/derivable; count contract pending. |
| Safe category breakdown | Which approved failure category/code is contributing? | `failureType`, `errorCode`, job/API status codes, source status fields. | Partially supported; normalization pending. |
| Indexing partial-failure callout | Are document failures distinct from failed indexing runs? | `indexing_status`, `failed_document_count`. | Pending client rule. |
| Coverage/filter state | Is the selected scope complete? | Attribution/coverage contract absent. | `DATA PENDING`. |

## Proposed layout and interaction

Use a dedicated Technical Teams page with breadcrumb, retained global filters, and illustrative banner. Lead with an eight-row comparison table (rate, failed units, eligible units, coverage state) and a **Select workload** control. Below it, show one selected-workload trend and a source-safe category table. The category table uses generic categories/codes only and never displays `error_message`, `response.errorMessage`, or raw diagnostics. A distinct indexing notice records that partial-document failure treatment is not defined.

## Excluded content

No raw error messages, stack traces, request IDs, user identities, prompts/responses, incident-management workflow, production alert action, or Operations dashboard status. This view identifies a diagnostic direction, not root-cause proof.

## Assumptions

- The failure-rate calculation stays metric-specific; the view never sums rates or imposes a shared denominator.
- A selected workload is a UI selection, not a new global filter.
- Failed/eligible counts and category breakdowns are proposed only when the source can return the approved grain and normalized categories.
- All values are illustrative and no rate threshold is implied.

## Missing evidence and client questions

- What final status/denominator/retry rule applies to each of the eight rates?
- Which category/code taxonomy is safe, normalized, and useful for Technical Teams?
- Does `failed_document_count > 0` create an indexing failure, a partial failure, or a separate quality indicator?
- What timestamp/timezone, sample-size, filter attribution, coverage, rounding, and no-data rules apply?
- Should the view deep-link to an approved incident or Splunk investigation, and what role restrictions apply?

## Image-generation brief

Generate only after the prior Gate 3 detail view is approved. Create a polished Technical Teams dedicated page titled **Failure localization explorer** with preserved global filters and illustrative banner. Show an eight-workload rate comparison table, one selected-workload trend, safe generic error-category rows, explicit `DATA PENDING` coverage, and an `INDEXING PARTIAL-FAILURE RULE PENDING` callout. Maintain the approved forest-green/nav and warm-white/card visual family. Do not show raw error messages, traces, prompts, real application names, targets, remediation actions, or cross-persona content.
