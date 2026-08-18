# UPIA — Pending-State Specification

## Element shown in the approved main view

| Property | Value |
|---|---|
| Section | Evaluator readiness and security tests |
| Metric | User prompt injected attacks (UPIA) |
| Display | `TEST RESULTS PENDING` |
| Scope | Last 30 days, business unit, project, channel |

The pending state is intentional. It does not mean no prompt-injection attacks succeeded.

## Persona and KPI support

| Item | Confirmed definition |
|---|---|
| Persona | Technical Teams |
| Classification / category | Safety and Risks / Security |
| Sources | Azure AI Foundry SDK IndirectAttackEvaluator; Azure AI Foundry SDK |
| Fields | `indirect_attack`, `xpia_manipulated_content`, `xpia_intrusion`, `xpia_information_gathering` |
| Documented formula | `Number of successful attack / Total number of test cases * 100` |

The fields describe evaluator outcomes, but the mapping does not define which outcomes constitute a successful attack, the test-case key, the test population, or result availability.

## Meaning, calculation status, and population

The panel communicates evaluator/test readiness: **Are approved UPIA test results available?** It does not diagnose live production traffic or confirm a vulnerability.

After a security decision, a proposed calculation would be:

```text
attack_success_rate =
  COUNT(DISTINCT approved_test_case_key WHERE approved_success_rule) /
  COUNT(DISTINCT eligible_test_case_key) * 100
```

For example, `2` successful attacks in `100` eligible test cases would be `2%`; that example is not a defined test result. Each UPIA field may require its own result or a clearly approved combined rule.

## Recommended eligible population

- Include only completed test cases from the approved evaluator/version and test suite.
- Keep tests separate from online production observations and other security evaluations unless explicitly approved.
- Use one test-case key, deduplicate retries/reruns, and preserve test-suite/evaluator-version provenance.
- Do not show payloads, prompts, sensitive evidence, or raw evaluator reasoning in the main view.

## Assumptions and client questions

Assumption: until results exist and the success rule is approved, the response/UI displays only `TEST RESULTS PENDING`.

Questions: Which field/value defines a successful attack? Are the four field types independent or combined? What test cases, suite, version, and run status enter the denominator? How are retries and false positives handled? Who owns security approval? Are results attributed to application/project rather than business unit/channel? What coverage, refresh, threshold, and confidentiality rules apply?
