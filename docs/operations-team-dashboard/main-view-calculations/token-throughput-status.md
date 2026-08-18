# Token Throughput — Pending-State Specification

## Element shown

`Token Throughput — DEFINITION PENDING` is displayed in Service-path Stability.
It is intentionally not a numeric value.

## Confirmed facts

The mapping offers non-equivalent alternatives: average Azure OpenAI tokens per
second; average Search queries per second; or MLflow prompt plus completion
tokens per time unit. Available fields span `TokenTransaction`,
`AzureOpenAITokenPerSecond`, `SearchQueriesPerSecond`, trace and span token
fields, throttling fields, and `deployment_name`.

## Calculation status and business meaning

No aggregation is authorized. Tokens/second, queries/second, token transactions,
and active tokens describe different populations and units. `DEFINITION PENDING`
prevents an arbitrary combination being displayed as capacity throughput.

## Likely interpretation

Operations may eventually need a capacity-related token-rate signal, but it must
name the service, unit, time bucket, and scope rather than substitute request
throughput or token consumption.

## Assumptions

The pending label is neutral, not a zero, alert, or missing-data inference.

## Missing evidence and client questions

Which source and unit is the intended KPI? Is the denominator wall-clock time,
active processing time, or a time bucket? Does it aggregate AOAI, Search, and
MLflow workloads together? How are deployments, throttling, retries, attribution,
targets, and no-data handled?
