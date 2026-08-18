# Requested Operations Coverage Drawer

**Source:** Requested operations coverage section. **Interaction:** right-side drawer.
**Drawer image:** [Requested Operations Coverage](operations-team-requested-operations-coverage-drawer-01.png).

## Design

Shows a monitoring-readiness matrix for Uptime/SLA, CPU/Memory, System Load, and
Alert feed. Each stays explicitly pending and lists only the missing contract
category: calculation/target, telemetry field, or alert rule. It is a coverage
view, not a live infrastructure console.

### Evidence boundary

The persona statement requests these concerns. The supplied mapping lacks their
complete measurement contracts. Do not show utilization values, uptime percent,
load values, alert counts, owners, or severity.

## Image-generation brief

```text
Use case: ui-mockup
Asset type: Operations Team dashboard with a right-side detail drawer
Primary request: Dimmed approved Operations main view behind a non-scrolling right drawer. Header "REQUESTED OPERATIONS COVERAGE"; title "Monitoring coverage"; subtitle "Readiness for requested operational signals"; close X and illustrative banner. Main card title "Coverage readiness matrix" with four rows: "Uptime / SLA" "DEFINITION PENDING" "Formula and target required"; "CPU / Memory" "DATA PENDING" "Telemetry fields required"; "System load" "DATA PENDING" "Telemetry fields required"; "Alert feed" "THRESHOLD PENDING" "Alert rule required". Add card "What this means" with exactly "Pending is not zero, healthy, or unavailable service" and "No live infrastructure measurement contract is supplied". Amber pending text; no charts, owners, values, alert counts, incident controls, recommendations, scrollbar, watermark, or browser chrome.
```
