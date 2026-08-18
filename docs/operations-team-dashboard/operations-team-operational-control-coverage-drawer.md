# Operational Control Coverage Drawer

**Source:** Operational control coverage section. **Interaction:** right-side drawer.
**Drawer image:** [Operational Control Coverage](operations-team-operational-control-coverage-drawer-01.png).

## Design

Shows five control/readiness rows with their mapped field families and pending
reason. It explains evidence availability without turning it into a compliance
score or a governance workflow.

### Evidence boundary

Training Reproducibility, Audit Logging, Tool Usage Compliance, Model Governance,
and Environment Compliance lack an approved common policy/aggregation contract.
No application names, users, model URIs, audit notes, or compliance verdicts.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a non-scrolling drawer. Header "OPERATIONAL CONTROL COVERAGE DETAILS"; title "Operational control coverage"; subtitle "Calculation and evidence readiness"; close X and illustrative banner. Card "Control readiness matrix" rows: "Training Reproducibility" "DEFINITION PENDING" "Reproducible-run rule required"; "Audit Logging" "CALCULATION PENDING" "Required event set required"; "Tool Usage Compliance" "CALCULATION PENDING" "Allowed-tool policy required"; "Model Governance" "CALCULATION PENDING" "Eligible-model policy required"; "Environment Compliance" "CALCULATION PENDING" "Environment policy required". Card "Mapped evidence" shows concise rows: Training run and lineage fields; audit log type and application; tool and agent fields; model registry/evaluation fields; environment and application fields. Bottom note "No compliance score is authorized". No user identity, model URI, audit note, application list, approvals, remediation, scrollbar, or browser chrome.
```
