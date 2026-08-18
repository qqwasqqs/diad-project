# Operations Team Dashboard Clickability Map

The approved main view uses seven section-level click targets. Each opens a
right-side, non-scrolling drawer over the dimmed Operations main view and
preserves active global filters. Individual cards and rows are not nested click
targets.

| Selection | Added detail question | Evidence | Pending boundary |
| --- | --- | --- | --- |
| Operational situation | Are the three measured stability signals changing, and what is known about alerts? | End-to-end, API, and pipeline specifications | Alert feed stays `THRESHOLD PENDING` |
| Requested operations coverage | Which requested operational signals have usable measurement contracts? | Persona statement and explicit pending states | No values, owners, or live status |
| Service-path Stability chart | How do the four compatible latency series move together? | Four mapped series/calculations | Components are not additive |
| Service-path Stability context list | What is the scope and readiness of supporting throughput/runtime values? | Throughput, pipeline, indexing, token specs | Token Throughput stays pending |
| Failure surface | Which workload-specific rate needs investigation? | Nine mapped failure rates | No raw errors or combined rate |
| Operational control coverage | Which control calculations are ready? | Five mapped governance/control entries | No compliance score |
| Safety and security readiness | Which evaluator/test outputs are usable? | Four safety/security entries | No sensitive content or security verdict |

All drawers remain within Operations scope. They add calculation provenance,
coverage, or trend context rather than repeat the main-view tile.
