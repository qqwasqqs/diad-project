# The Splunk Azure Function and `postSplunkQuery`

This document describes the Azure Function that stands between the application
and Splunk, and how [`lib/services/splunkReportService.ts`](../../lib/services/splunkReportService.ts)
talks to it through its `postSplunkQuery` method.

The Function itself is **not part of this repository**. It is deployed
separately and lives in Azure.

Both the Function and `splunkReportService.ts` were written by the **original
team**, not by us. We did not modify either of them. Our dashboards only
_consume_ `postSplunkQuery`, which already existed and was already used by the
inherited pipelines dashboard.

---

## 1. Why the Function exists

The application never talks to Splunk directly. There are three reasons for
the indirection:

1. **Network reach.** The Splunk instance (`https://ilsplunapp03t.il.teva.corp:8089`)
   is on the internal network. The Next.js app cannot reach it
   directly from its hosting environment.
2. **Credentials.** The Splunk token is held in Azure Key Vault and is read by
   the Function using its own Managed Identity. The token never travels to the
   application.
3. **Protocol complexity.** Splunk's REST API is not a single request. It
   requires creating a search job, polling it until it finishes, and then
   paging through the results. The Function hides all of that behind one
   ordinary HTTP POST.

So the full chain is:

```
Next.js route handler
  -> fetchSplunkReport.postSplunkQuery()   (lib/services/splunkReportService.ts)
    -> POST {baseUrl}/api/splunk/query?code={functionSecret}
      -> Azure Function  "fetch_splunk_query"
        -> Azure Key Vault   (read Splunk token)
        -> Splunk REST API   (create job -> poll -> page results)
      <- JSON array of result rows
```

---

## 2. What the Function does

The Function is registered as `fetch_splunk_query` on the route
`splunk/query`, and accepts **POST** only.

### 2.1 Request it expects

A JSON body with exactly three string fields:

| Field          | Meaning                              |
| -------------- | ------------------------------------ |
| `SEARCH_QUERY` | The Splunk search to run, in SPL.    |
| `START_TIME`   | Passed to Splunk as `earliest_time`. |
| `END_TIME`     | Passed to Splunk as `latest_time`.   |

If any of the three is missing or empty, the Function returns **400** with the
plain-text message `Missing parameters: SEARCH_QUERY, START_TIME, END_TIME`.

Note what is **not** validated: the Function does not inspect or restrict the
contents of `SEARCH_QUERY`. Whatever SPL is sent is executed against Splunk
with the Function's own credentials. This matters for the validation work
described in
[technical-debt-dashboard-validation-and-response-adaptation.md](./technical-debt-dashboard-validation-and-response-adaptation.md).

### 2.2 Authentication

Two separate layers, which are easy to confuse:

- **Caller → Function.** A standard Azure Functions key, sent as the `code`
  query-string parameter. The service supplies it from its configuration.
- **Function → Splunk.** A bearer token the Function reads at request time from
  Key Vault (`kv-oyrbd-wap-euno-dev.vault.azure.net`, secret
  `kv-fa-splunk-token`) using `DefaultAzureCredential`, i.e. the Function's
  Managed Identity.

The Key Vault URL and secret name are **hard-coded in the Function**, and the
hard-coded vault is a **dev** vault. Promoting the Function to another
environment therefore requires changing its source, not just its settings.

### 2.3 How it runs the search

1. **Create the job.** POSTs to `/services/search/jobs` with the search, the
   time bounds and `output_mode=json`, then reads the returned `sid`.
2. **Wait.** Polls `/services/search/jobs/{sid}` every 2 seconds until
   `dispatchState` is `DONE`. There is **no maximum number of attempts** — if
   the job never reaches `DONE`, this loop only ends when the Azure Functions
   host times the invocation out.
3. **Page the results.** Reads `/services/search/jobs/{sid}/results` in pages of
   1000 rows, increasing `offset` until a page comes back with no rows. Empty
   response bodies are retried after a 1-second pause.

Per-call timeouts are 120s for the job creation and result pages, and 60s for
each status poll. TLS verification is **disabled** (`verify=False`, plus
`urllib3.disable_warnings()`), presumably because of the internal certificate.

### 2.4 Response it returns

On success: **200**, `application/json`, and the body is a **flat JSON array of
the result rows** — the accumulated `results` arrays from every page,
concatenated. The Splunk envelope (`entry`, `fields`, `preview`, and so on) is
**not** included; only the rows survive.

Each row is an object whose keys are the fields the SPL search produced, and
whose values are, as is normal for Splunk, almost always **strings** — including
numbers. Anything numeric has to be converted on our side. The existing
pipelines code does exactly that, for example `Number(raw["Failed Pipeline Runs"]) || 0`.

On any failure: **500**, with `str(e)` as a **plain-text** body. There is no
error envelope and no error code. A failure therefore arrives at the caller as
a non-JSON 500, which Axios surfaces as a rejected promise.

---

## 3. How `postSplunkQuery` calls it

`postSplunkQuery` is one method on the exported `fetchSplunkReport` object in
[`lib/services/splunkReportService.ts`](../../lib/services/splunkReportService.ts).
It is a thin, deliberately generic wrapper: **the caller supplies the SPL**,
and the service only handles configuration, transport and logging.

```ts
async postSplunkQuery(
  searchQuery: string,
  startTime: string,
  endTime: string,
): Promise<any>
```

What it does, in order:

1. Calls `loadSplunkConfiguration()` to obtain `baseUrl` and `functionSecret`.
2. `axios.post` to `` `${baseUrl}/api/splunk/query` `` with the body
   `{ SEARCH_QUERY, START_TIME, END_TIME }` and the Function key as the `code`
   query parameter.
3. Returns `data` — the parsed response body, i.e. the array of rows,
   **unchanged**.
4. On error, logs `"Error in Post Query:"` and **re-throws**. It never returns
   a fallback value, so every caller must handle rejection.

Two things to be aware of:

- The return type is **`Promise<any>`**. Nothing about the row shape is checked
  or guaranteed by this function. The comment in the source claiming the result
  is `PipelineDataSchema[]` is inaccurate — no cast or validation takes place.
- The method is a **server-side** concern. It reads `process.env` and may call
  Key Vault, so it must only ever be invoked from route handlers or other
  server modules.

### 3.1 Configuration

`loadSplunkConfiguration()` resolves two values and caches them in module-level
variables for the lifetime of the process (so a changed secret needs a restart):

| Environment               | Source                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ENVIRONMENT === "local"` | `process.env.SPLUNK_SERVICE_BASE_URL` and `process.env.SPLUNK_FUNCTION_SECRET`                                     |
| anything else             | Azure Key Vault secrets `kv-data-integrity-splunk-service-base-url` and `kv-data-integrity-splunk-function-secret` |

If either value is missing it throws `Missing required Splunk configuration values`.

### 3.2 Time arguments

`startTime` and `endTime` are passed through verbatim to Splunk's
`earliest_time` and `latest_time`, so they accept any format Splunk accepts.
In practice two different styles are in use:

- The **inherited pipelines routes** forward the `startDate` / `endDate` query
  parameters they receive, as-is.
- **Our dashboard code** sends ISO-8601 strings produced by
  `new Date().toISOString()`.

Both work, but it means there is no single canonical format in the codebase.

---

## 4. Who calls it

### 4.1 Inherited pipelines dashboard — working

These existing route handlers call `postSplunkQuery` with SPL built by query
helpers, and map the returned rows into their response shapes. They are the
reference for what a _complete_ integration looks like:

- [`app/api/pipelines-dashboard/route.ts`](../../app/api/pipelines-dashboard/route.ts)
- [`app/api/pipelines-dashboard/highlights/route.ts`](../../app/api/pipelines-dashboard/highlights/route.ts)
- [`app/api/pipelines-dashboard/more-details/route.ts`](../../app/api/pipelines-dashboard/more-details/route.ts)
- [`app/api/pipelines-dashboard/pipeline-names/route.ts`](../../app/api/pipelines-dashboard/pipeline-names/route.ts)

### 4.2 Our dashboards — connectivity stage only

[`lib/server/dashboard/dashboardSplunkSource.ts`](../../lib/server/dashboard/dashboardSplunkSource.ts)
is the only place our dashboard work touches the Function. Both
`loadSplunkMetrics` and `loadSplunkTimeseries`:

- import `splunkReportService` **dynamically**, because `keyvault.ts` throws at
  module load when `KEY_VAULT_URL` is unset, which would otherwise break mock
  mode;
- call `postSplunkQuery("| savedsearch consolidated_metric_final", start, end)`
  with a **hard-coded 30-day window** and no other arguments;
- `console.log` the raw response;
- then deliberately `throw new DashboardSplunkContractError(...)`, which the
  routes translate to **HTTP 501**.

In other words: this is a **connectivity probe, not an integration**. It proves
the Function can be reached and shows the raw row shape in the server log, and
nothing more. The request's filters, `chartId` and metric IDs are **not**
forwarded, because the saved-search contract needed to do so does not exist yet.
`DashboardSplunkContractError` enumerates exactly what is missing.

---

## 5. What is still unknown

Everything in this list is a question for whoever owns the Function and the
Splunk saved searches. None of it can be answered from this repository:

1. **Which saved searches** back each dashboard metric and each `chartId`.
   Today only `consolidated_metric_final` is referenced, for every call.
2. **How to pass arguments.** The Function's body has exactly three fields and
   no parameter mechanism. Supporting time range, business units, projects and
   timezone needs either a changed Function contract or SPL composed on our
   side — and the latter would make request validation a security control.
3. **How array values are encoded** for multi-select filters.
4. **Which result fields** the rows actually contain, and their types.

Until points 1–4 are settled, the Splunk path cannot return data, and
`DASHBOARD_DATA_SOURCE=mock` remains the only working configuration.

---

## 6. Operational notes

- **Errors are opaque.** A Splunk failure becomes a 500 with a plain-text Python
  exception string. Expect to read the Function's own logs in Azure.
- **Calls can be slow.** The poll-until-`DONE` loop means response time is the
  search's run time. There is no fast path and no cancellation.
- **Nothing is cached** in the Function; each call re-runs the search.
- **Secrets are only in the Function and Key Vault** — the token is never sent
  to us, and must never be copied into this repository.
- **The vault and secret names are hard-coded** in the Function source, pinned
  to a dev vault.

---

## 7. File map

| File                                                                                                   | Role                                                                                           |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [`lib/services/splunkReportService.ts`](../../lib/services/splunkReportService.ts)                     | `postSplunkQuery` plus configuration loading and caching.                                      |
| [`lib/azure/keyvault.ts`](../../lib/azure/keyvault.ts)                                                 | `getSecret`, used for non-local configuration. Throws at import when `KEY_VAULT_URL` is unset. |
| [`lib/server/dashboard/dashboardSplunkSource.ts`](../../lib/server/dashboard/dashboardSplunkSource.ts) | Our connectivity-stage callers.                                                                |
| [`app/api/pipelines-dashboard/*`](../../app/api/pipelines-dashboard)                                   | Inherited, fully working callers. Use as the reference pattern.                                |

### Related hand-over documents

- [product-owner-dashboard-data-connection.md](./product-owner-dashboard-data-connection.md) — the pipeline that reaches `dashboardSplunkSource.ts`.
- [technical-debt-splunk-response-failure.md](./technical-debt-splunk-response-failure.md) — why both loaders currently throw.
- [technical-debt-dashboard-validation-and-response-adaptation.md](./technical-debt-dashboard-validation-and-response-adaptation.md) — validating requests and mapping rows into the UI shapes.
