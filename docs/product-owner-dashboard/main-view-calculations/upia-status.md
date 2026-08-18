# UPIA — Shared Pending-State Definition

## Element shown in the approved main view

`UPIA — TEST RESULTS PENDING` is intentional. It is not a production attack rate, no attacks, or a vulnerability verdict.

## Canonical shared specification

Reuse the approved Operations [UPIA pending-state specification](../../operations-team-dashboard/main-view-calculations/upia-status.md).

| Item | Confirmed definition |
| --- | --- |
| Source | Azure AI Foundry SDK IndirectAttackEvaluator |
| Fields | `indirect_attack`, `xpia_manipulated_content`, `xpia_intrusion`, `xpia_information_gathering` |
| Mapped calculation | successful attacks / total test cases * 100 |

The canonical future calculation needs an approved test-case key, attack-success taxonomy, eligible test population, and online/offline separation:

```text
upia_defect_rate = COUNT(DISTINCT successful approved test_case_key) /
                   COUNT(DISTINCT eligible test_case_key) * 100
```

This formula is proposed only and is not currently displayable.

## Product Owner presentation note

Keep security-test readiness distinct from product adoption, satisfaction, and workflow outcome. The main view exposes neither test content nor sensitive attack evidence.
