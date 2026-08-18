# Consolidated Data & AI Observability Business Logic

## Document purpose and status

This document consolidates the business and delivery logic from:

- `business-logic/archive/scope.md`
- `business-logic/archive/sow.md`
- `notes/extra-info.md`

Repeated statements have been merged. Where the source documents conflict or leave a decision open, this document does not select an unsupported answer; the issue is recorded under **Missing Evidence and Open Decisions**.

Source precedence used for consolidation:

1. Explicit SOW scope and responsibility statements
2. React and telemetry scope explanations derived from the SOW
3. Investigation notes, treated as proposed detail unless independently confirmed

## 1. Confirmed Facts

### Engagement and commercial model

- **Client:** Teva Pharmaceutical Industries Ltd.
- **Supplier:** Cognizant
- **Engagement:** Data & AI Observability Layer
- **Duration:** Five months, from April 23 to September 23, 2026
- **Fixed fee:** $480,000
- **Commercial structure:** Five milestones of $96,000 each
- **Named stakeholder:** Tracy Daniels, VP DA&AI, Teva Global IT

### Solution boundary

The solution consists of two connected layers:

1. An observability pipeline that ingests, normalizes, enriches, correlates, and alerts on telemetry in Splunk.
2. A dashboard layer containing four persona-specific React views and one Splunk-native developer dashboard.

The React application is a separate frontend hosted in Teva's Azure environment. It consumes observability data through Splunk REST APIs. The documented access pattern does not include direct reads from Azure Databricks or other producer systems.

The Splunk-native developer dashboard remains in Splunk and supports saved SPL searches and Correlation ID-based trace reconstruction.

### High-level telemetry flow

1. Approved producer applications and Azure services emit logs, metrics, and traces.
2. Telemetry is routed through Azure Event Hub.
3. Splunk ingests, parses, normalizes, enriches, and correlates the telemetry.
4. The React dashboards query Splunk REST APIs.
5. Splunk evaluates configured alert rules against approved thresholds.

Documented producer categories include Azure Databricks, Azure AI Foundry, RAG applications, Copilot agents, and other approved source systems.

### Dashboard audiences

The four React views currently use these working persona labels:

- Business Executives
- Product Owners
- Technical Teams
- Operations Teams

Each view presents observability information relevant to its audience. These labels are working names, not confirmed final product labels.

### Metrics and alerting

The dashboards and alerts use an agreed 74-metric observability framework. Explicit metric examples include:

- P95 and P99 latency
- Pipeline failure rates
- API error rates
- Cost per request
- Content-safety flag rates
- Data freshness

Cognizant configures Splunk alert rules for the agreed metrics. Teva defines and approves threshold values before the rules are activated.

### Delivery phases and deliverables

#### Month 1: Blueprint and validation

Cognizant must:

- Review, rather than recreate, Teva's existing observability framework and KPIs.
- Produce a Telemetry Availability Matrix.
- Produce a Logging Gap Register that assigns gaps to the responsible party.
- Produce an MVA scope-boundary document that classifies applications as full-telemetry or Minimum Viable Approach targets.
- Validate the end-to-end Event Hub-to-Splunk architecture and obtain Architecture Review Board sign-off.
- Confirm the design specification for the four React persona views and the Splunk-native developer dashboard.

#### Months 2-4: Three onboarding batches

Each batch covers five services, for a documented total of 15 services. Cognizant must:

- Define application-specific logging schemas and instrumentation specifications.
- Build the React observability dashboard with four persona views.
- Build the Splunk-native developer dashboard and saved SPL search library.
- Configure Splunk alerts across the agreed metric framework.
- Validate each application's telemetry conformance.
- Show `Data Pending` states for applications whose instrumentation is incomplete.

#### Month 5: Fine-tuning, knowledge transfer, handover, and hypercare

Cognizant must:

- Tune alert thresholds using real traffic patterns.
- Execute end-to-end system integration testing where source applications emit conformant telemetry.
- Support Teva-led user acceptance testing for no more than 10 business days after the code drop.
- Deliver at least three formal knowledge-transfer sessions covering dashboard use, Splunk alert management, and Logging Gap Register closure.
- Deliver technical documentation, administration guides, and runbooks.
- Provide two weeks of post-handover hypercare for P1/P2 defect resolution, up to three alert-tuning iterations, and Event Hub-to-Splunk pipeline triage.

Teva may request an additional two weeks of extended hypercare in writing for $15,000.

### Telemetry readiness and delivery rules

- Producer telemetry unavailability does not automatically block Cognizant's work. Representative or synthetic schemas may be used to continue design and implementation.
- Cognizant performs no more than two telemetry-conformance review cycles per application. Remaining issues are recorded in the Logging Gap Register.
- If an application team has not implemented the required instrumentation within two weeks of receiving Cognizant's specification, the application may be classified as an MVA target.
- For an MVA target, a correctly rendered `Data Pending` state counts as fulfilled dashboard delivery for the unavailable telemetry.
- A telemetry gap or cross-team delay does not automatically create a Change Request. It reaches the documented Change Request threshold only when it causes an unmitigable critical-path impact of at least seven business days after resequencing and representative-schema options have been exhausted.
- For Teva-caused delays, timeline extension is the preferred remedy. A commercial adjustment may be raised through the Change Request process when unavoidable, unmitigable idle time meets the applicable conditions.

### Correlation and distributed-tracing requirement

The target model requires a unique Correlation ID to be propagated across participating components so that events for one end-to-end request or workflow can be reconstructed in Splunk.

Each component logs its own view of the flow. The orchestrator also records request-response interactions with downstream services, enabling trace continuity across orchestration, agent execution, and tool invocation.

The investigation notes describe a layered identifier model:

- **Correlation ID:** Connects the end-to-end request or workflow across components.
- **Task ID:** Identifies a discrete unit of agent work within the wider flow.
- **Span ID:** Identifies a fine-grained operation within a task, such as a tool call or intermediate action.

This layered model is documented as investigation detail; its approval and exact field contract are not established by the available documents.

### Responsibility boundaries

#### Cognizant is responsible for

- Observability architecture validation and dashboard design.
- Logging schemas and instrumentation specifications.
- React dashboard implementation.
- Splunk-native dashboard, saved searches, alert configuration, and documented validation activities.
- Telemetry-conformance validation, gap tracking, testing within dependency constraints, documentation, knowledge transfer, and hypercare.

#### Teva and its application or platform teams are responsible for

- Writing or modifying producer application code, including instrumentation and Correlation ID propagation in that code.
- Enabling Azure resource-level diagnostic logs.
- Provisioning and operating Azure, Event Hub, Splunk, and related infrastructure.
- Providing required access and confirming Event Hub namespaces, consumer groups, Splunk HTTP Event Collector reachability, indexing capacity, and access-control configuration.
- Platform procurement and licensing.
- Defining and approving alert thresholds.

#### Out of scope for Cognizant

- Remediation of application defects, anomalies, or AI hallucinations exposed by observability.
- AI model retraining based on observability output.
- Business-as-usual L1, L2, or L3 support after handover.
- Compliance or legal advice.
- AWS, GCP, or on-premises systems outside the agreed architecture.

### Acceptance and invoicing

| Milestone                                   | Timing         |  Amount |
| ------------------------------------------- | -------------- | ------: |
| Blueprint and Telemetry Validation          | End of Month 1 | $96,000 |
| Batch 1: five priority services             | End of Month 2 | $96,000 |
| Batch 2: next five services                 | End of Month 3 | $96,000 |
| Batch 3: remaining five services            | End of Month 4 | $96,000 |
| Knowledge Transfer, Handover, and Hypercare | End of Month 5 | $96,000 |

- All invoices require Teva approval.
- A deliverable is deemed accepted when Teva does not raise a documented Material Issue within 17 business days of submission.
- Deemed acceptance does not apply to active security vulnerabilities, foundational AI logic issues, architectural-integrity failures, or data-integration failures.
- The source scope gives a `70-80%` live-observability range for Batch 1-3 milestone acceptance, subject to Teva-caused dependencies. The exact binding percentage is not specified and remains an open issue.

### Governance and staffing

Cognizant must:

- Operate under Teva's three-tier DADAI Factory Governance Model.
- Obtain written Factory Owner approval for architecture decisions and release plans.
- Avoid billing separately for Factory-level governance covered by the MVG retainer.
- Store design artifacts, test evidence, and runbooks in the Factory documentation repository.
- Maintain weekly status reporting, a RAID log, and milestone tracking.

The documented full-time roles are Scrum Master, Solution Architect, Observability Engineers, AI-focused Data Engineers, React Developers, QA Engineers, and AI/ML Architect.

Teva may request staffing re-baselining when allocation is demonstrably inconsistent with actual scope, but this does not change the fixed fee. Cognizant must absorb unused capacity or redirect it to Teva-approved backlog work.

## 2. Likely Interpretations

- The Correlation ID is best understood as an end-to-end workflow or request identifier. Calling it a "session" in the investigation notes likely describes its use as a trace-retrieval key, not necessarily an authenticated user session.
- "Correlation ID propagation" is a solution requirement, while the responsibility boundary means Cognizant specifies and validates it and Teva's application teams implement it in producer code.
- `Data Pending` fulfills only the dashboard obligation for telemetry that is unavailable because of an external instrumentation dependency; it does not imply that live telemetry exists or that the upstream gap is closed.
- Event Hub and Splunk configuration checks are validation activities supporting the solution. They do not transfer infrastructure-provisioning ownership to Cognizant.

## 3. Assumptions Used in This Consolidation

- Explicit responsibility and commercial statements in the SOW-derived documents take precedence over less formal investigation notes.
- The three onboarding batches contain five services each, based on the repeated batch descriptions.
- References to the 74-metric framework establish its size and example categories, but not the definition, query, aggregation, unit, or visualization of every KPI.
- The dedicated Correlation ID service described in the notes is not part of the current target approach because the notes record that option as rejected.

## 4. Missing Evidence and Open Decisions

The available documents do not establish:

- The approved owner and creation point for the Correlation ID. The notes first state that the UI generates it, then state that the creation point is unknown and identify Azure API Management as an option.
- Whether API Management is present at every relevant entry point and can create or preserve the identifier for all application and agent flows.
- The approved field names, formats, uniqueness rules, lifecycle, propagation headers, and parent-child relationships for Correlation ID, Task ID, and Span ID.
- Whether the proposed Task ID and Span ID model has received architecture, security, privacy, and data-governance approval.
- The exact meaning of "session" in relation to a workflow, request, conversation, user session, or multi-turn agent interaction.
- The final names and information needs of the four React personas.
- KPI definitions, units, aggregations, threshold values, ownership, and source-field mappings for the 74 metrics.
- Splunk REST endpoints, authentication method, search/query contracts, response schemas, rate limits, and error behavior used by the React application.
- The precise Batch 1-3 acceptance threshold because the source states a range of 70-80% rather than one binding value.
- The authoritative inventory of the 15 services and their full-telemetry or MVA classification.
- Current Architecture Review Board approval status and any conditions attached to approval.
- The detailed rules for loading, empty, API-error, stale-data, and `Data Pending` UI states.
