# Trust and Measurement Readiness Drawer — Waiting for Confirmation

## Scope

This tracker covers the four proposed gates in the **Trust evidence decision
guide** drawer. The gates answer one question: can the available trust evidence
responsibly inform a Product Owner decision? They do not calculate a trust
score, safety verdict, risk rating, release recommendation, or customer outcome.

The proposed gates are:

1. Definition and scale;
2. Coverage and filter attribution;
3. Customer-outcome connection; and
4. Approved decision rule.

The signal interpretation guide and `DECISION READINESS PENDING` state are
deliberate explanations of the current boundary. They are not additional
metrics or proposals to turn pending evidence into a green/red status.

## Confirmed platform capability

Every application and component will emit a `correlation_id` in its logs. This
tracker treats it as an available cross-log join field and never as a display
field. It can connect related records, but does **not** define an evaluated
request, test case, customer outcome, or a decision rule. Those identities and
relationships still need approval.

### Field-status legend

The statuses compare a needed field with the Product Owner Concept's documented
**Key fields** inventory. They do not confirm live data, coverage, or an API
response.

- **Existing for this metric** — listed for the same mapped metric.
- **Existing elsewhere only** — listed for another metric or available under
  the platform-wide logging decision, but not approved for this proposal.
- **Not documented** — absent from the Concept's field inventory for this use.

## 1. Definition and scale — proposed first decision gate

**Business meaning**

Confirms what each trust signal measures, which scale and direction it uses,
and whether it is suitable for the stated Product Owner purpose. It does not
decide that a product is safe, ready to release, or acceptable to customers.

**In simple terms**

Before a number or status can influence a product decision, we must agree what
it means. A `0–1` evaluator rating, a `0–7` severity category, a pass/fail
agent check, and a security-test outcome cannot be treated as the same thing.

**Why we propose it**

The four signals have different sources and evidence shapes. Safety Evaluators
have category score/result evidence but no approved Product Owner aggregate;
MLflow Safety Score has a documented `0–1` field but a conflicting five-point
example elsewhere; PII Leakage has an unconfirmed pass/fail-or-score encoding;
and UPIA lacks an approved definition of an attack success. The gate makes
those differences visible before any signal is used in a decision.

**What is needed to complete the gate**

An approved business meaning, scale, favorable/unfavorable direction, eligible
population, and display boundary for each signal. If a threshold is wanted, it
also needs an owner, validation method, and an explicit statement that it is
not automatically a rollout or release gate.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| `hate_unfairness_score`, `violence_score`, `sexual_score`, `self_harm_score` | Existing for this metric | Safety Evaluators supplies category-specific severity scores on `0–7` scales. |
| Corresponding safety result fields | Existing for this metric | Category pass/fail results exist, but no aggregate Product Owner calculation is approved. |
| `response/llm_judged/safety/rating/average` | Existing for this metric | MLflow Safety Score is documented as a float `0–1`; its direction and scale conflict must be resolved. |
| `Sensitive_data_leakage` | Existing for this metric | PII Leakage is described as a pass/fail indicator or score; type, direction, and availability are open. |
| `indirect_attack`, `xpia_manipulated_content`, `xpia_intrusion`, `xpia_information_gathering` | Existing for this metric | UPIA supplies evaluator outputs, but not an approved combined attack-success taxonomy. |
| Approved signal direction, threshold, and definition version | Not documented | Required decision metadata; no Product Owner trust-definition contract is supplied. |

**Correlation needed**

No cross-signal aggregate or correlation is proposed. Interpret each signal
within its approved source population and scale. Do not combine category
severity, MLflow rating, agent-only evidence, and security-test outcomes into a
composite trust score.

**Waiting for approval / confirmation**

- The Product Owner purpose and permitted interpretation for each of the four
  signals.
- Safety Evaluator categories, result/threshold semantics, and whether any
  future aggregate has a specific approved business definition.
- Whether MLflow's authoritative scale is `0–1` or `1–5`, whether higher is
  favorable, and the compatible evaluator/version/population.
- PII Leakage encoding, direction, agent-only availability, and the precise
  meaning of an evaluator flag.
- UPIA field-to-attack-success taxonomy and test-result interpretation.
- Any threshold's owner, validation method, and boundary; none is approved now.

## 2. Coverage and filter attribution — proposed second decision gate

**Business meaning**

Confirms whether the selected business unit, project, channel, and period are
represented by a sufficiently complete, eligible evaluator or test population.
It is a readiness check, not proof that no trust issue exists when coverage is
missing.

**In simple terms**

Before using a trust signal for one part of the product, we need to know which
requests or test cases were actually checked and whether they belong to that
selected scope. Missing coverage must stay pending, not become zero.

**Why we propose it**

The mapping supplies signal values, but not a common evaluation or test
identity, timestamp, population contract, coverage threshold, or business-unit,
project, and channel attribution for these trust measures. PII is limited to
agent workloads, and UPIA must keep test populations distinct from production.

**What is needed to complete the gate**

An approved request, evaluation, or test-case identity; timestamp/timezone;
evaluator/version/population; eligibility and deduplication rules; coverage
numerator and denominator; selected-scope attribution; and API states for
complete, partial, unavailable, and no data. The API returns aggregates and
availability states only, never raw safety, PII, or attack evidence.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| Trust-signal fields above | Existing for their metrics | Values exist, but values alone do not establish coverage or selected-scope membership. |
| `evaluation_key` and evaluation `timestamp` | Not documented | Required for evaluator deduplication, freshness, and period selection. |
| `test_case_key` and test timestamp | Not documented | Required to count eligible UPIA test cases once and identify the test population. |
| Approved request key | Existing elsewhere only | `request_id` is listed for Request Throughput; it is not approved as the trust-evaluation key. |
| `correlation_id` | Existing elsewhere only | Available for cross-log joins, subject to trust-metric-specific pairing approval. |
| Evaluator/test version and population | Not documented | Required to separate production, offline, red-team, agent-only, and security-test evidence. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Mapped for business ownership or session/access use, not approved trust-signal attribution. |

**Correlation needed**

Use an approved identity to group repeated evaluator results once per eligible
request, evaluation, or test case. `correlation_id` may support related-log
joins but cannot substitute for the key. Keep online production, offline,
red-team, agent-only, and UPIA test records separate until the client approves
a specific combination.

**Waiting for approval / confirmation**

- Canonical request, evaluation, and UPIA test-case keys, with retry and
  duplicate-result rules.
- Evaluator/test version, timestamp/timezone, freshness, and eligible
  population for every signal.
- Coverage threshold, numerator/denominator, partial-coverage behavior, and
  API result states.
- Confirmed agent workloads for PII Leakage and the separation of production,
  offline, red-team, and security-test evidence.
- Business-unit, project, and channel attribution; otherwise use
  `FILTER_BREAKDOWN_UNAVAILABLE` rather than a misleading filtered result.

## 3. Customer-outcome connection — proposed research gate

**Business meaning**

Would establish an approved, privacy-preserving, non-causal way to study how a
trust signal relates to one named Product Owner outcome. It cannot establish
that a trust signal causes satisfaction, adoption, workflow completion, or
business value.

**In simple terms**

Trust evidence can be useful, but it is not automatically a customer result.
First the client must choose the product question to study and agree how the
two record sets can be joined without exposing people or sensitive content.

**Why we propose it**

The drawer keeps trust evidence distinct from product outcomes. No outcome
measure, joining rule, shared eligible population, or permitted analysis is
supplied. This gate prevents a safety or security-test signal from being
presented as customer-impact proof.

**What is needed to complete the gate**

One named Product Owner outcome with its approved calculation and timestamp;
an approved privacy-preserving join to the chosen trust signal; a shared,
eligible population; minimum-cohort rules; and a descriptive research plan.
The plan must state what it can describe and exclude causal claims,
individual-level reporting, release gating, and user-facing messaging.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| Named Product Owner outcome and outcome key/timestamp | Not documented | No outcome is selected and no trust-to-outcome contract exists. |
| Trust evaluation/request/test key and timestamp | Not documented | Required to align a selected trust record with the approved outcome period. |
| `correlation_id` | Existing elsewhere only | Available for cross-log joins, but it does not prove an outcome-to-trust relationship. |
| `user_feedback_score` | Existing elsewhere only | Listed for User Satisfaction Rate; it is only a possible future outcome input, not an automatically selected outcome. |
| `business_unit`, `project_name`, `channel` | Existing elsewhere only | Need approved attribution for both populations before any scoped comparison. |
| Privacy/minimum-cohort and analysis-version metadata | Not documented | Required governance metadata for an approved aggregate study. |

**Correlation needed**

Choose the outcome first, then define the approved record-level relationship to
one trust signal. Use `correlation_id` only where its cardinality and privacy
rules are confirmed. Aggregate before display, preserve unmatched records as
coverage information, and never infer a causal effect from adjacency or an
observed association.

**Waiting for approval / confirmation**

- The exact Product Owner outcome and decision question to study.
- Trust-signal/outcome identity, join cardinality, timestamp/timezone, and
  shared eligibility rules.
- Population separation, scope attribution, privacy/access, and
  minimum-cohort requirements.
- The permitted descriptive method and presentation, including treatment of
  unmatched records and no-data states.
- Explicit confirmation that the study does not create a safety verdict,
  customer-impact claim, rollout/release rule, or user-facing message.

## 4. Approved decision rule — proposed final decision gate

**Business meaning**

Would define who may use completed evidence, for which named product decision,
and under which approved rule. It does not delegate a safety, security, or
release decision to the dashboard.

**In simple terms**

Even good data should not make the decision by itself. We need to name the
decision owner, what decision is in scope, which evidence is allowed, and what
happens when evidence is incomplete or conflicting.

**Why we propose it**

The current trust signals have pending definitions, coverage, and outcome
connections. Without an owner and a written rule, a Product Owner could mistake
a neutral signal or pending state for permission to gate adoption, rollout,
release, or user-facing messaging.

**What is needed to complete the gate**

A client-approved decision scope, accountable owner, evidence version/snapshot,
rule for complete/partial/conflicting evidence, review cadence, and escalation
path. The rule must preserve the drawer's boundary: these signals do not become
security verdicts or automatic product gates.

**Fields needed**

| Needed field | Status in Concept | Concept comparison |
| --- | --- | --- |
| Decision name and permitted decision scope | Not documented | No Product Owner trust decision is named. |
| Accountable decision owner and approver | Not documented | No ownership contract is supplied. |
| Evidence definition/version and review date | Not documented | Required to show which approved evidence rule was used. |
| Coverage/availability state | Not documented | Required to distinguish complete, partial, unavailable, and no-data evidence. |
| Decision rule, exception rule, and escalation reference | Not documented | No adoption, rollout, release, or messaging rule is authorized. |

**Correlation needed**

No telemetry join is proposed. The rule references approved aggregate evidence
and its coverage/availability state only. It must not expose raw evaluator
reasons, PII values, attack content, identities, or operational diagnostics.

**Waiting for approval / confirmation**

- The one Product Owner decision this evidence may inform, and decisions it may
  never make.
- Accountable owner, required reviewers, approval date, review cadence, and
  escalation route.
- Required evidence versions, minimum coverage, conflict treatment, and
  expiration/freshness rules.
- How incomplete, unavailable, or conflicting evidence is communicated without
  turning it into a product, safety, or release verdict.

## Excluded from this tracker

This tracker does not propose repeated trust status cards, a calculation table,
a composite trust score, safety/risk color rating, release recommendation,
security verdict, raw safety reasons, PII values, test cases, attack content,
prompts/responses, user identities, remediation steps, incidents, or technical
security diagnostics.

## Quick view — required confirmations

| Proposed readiness gate | Confirmation needed |
| --- | --- |
| Definition and scale | Meaning, scale/direction, category or attack-success taxonomy, threshold boundary, and interpretation per signal. |
| Coverage and filter attribution | Request/evaluation/test-case keys; eligible populations; coverage; time; deduplication; and selected-scope attribution. |
| Customer-outcome connection | Named outcome, privacy-preserving join, shared population, descriptive method, and non-causal boundary. |
| Approved decision rule | Decision scope, accountable owner, required evidence, conflict handling, review/expiry, and escalation. |
