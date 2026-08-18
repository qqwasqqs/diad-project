# User Prompt Injected Attacks (UPIA) — Full Pending-State Specification

## Element shown in the concept

`UPIA — TEST RESULTS PENDING` is intentional. It does not represent no detected
attacks, no vulnerability, or a production attack rate.

## Persona and KPI support

| Item | Confirmed definition |
| --- | --- |
| Persona | Operations Team |
| Classification / category | Safety and Risks / Security |
| Source | Azure AI Foundry SDK IndirectAttackEvaluator |
| Fields | `indirect_attack`, `xpia_manipulated_content`, `xpia_intrusion`, `xpia_information_gathering` |
| Mapped calculation | Successful attacks / total test cases * 100 |

## Proposed test-case aggregation

```text
attack_success = approved outcome from the four evaluator fields
upia_defect_rate = COUNT(DISTINCT successful approved test_case_key) /
                   COUNT(DISTINCT eligible test_case_key) * 100
```

No outcome taxonomy, test-case key, corpus, or online/offline scope is defined,
so the main view remains pending.

## Business meaning

Once approved, the metric would show the rate of successful injection/security
test cases in a defined test population. It must not be merged with ordinary
production reliability errors or shown as an unqualified incident count.

## Assumptions and verification

The pending label is neutral. Before a value is shown, verify evaluator coverage,
test-case uniqueness, repeat-test/retry behavior, field-to-success taxonomy,
timestamp, attribution, sensitive-test handling, access controls, and result
freshness.

## Client questions

Confirm the corpus, environment, ownership, severity/alert rule, approved
denominator, remediation workflow, and whether live production and red-team
results remain separate.
