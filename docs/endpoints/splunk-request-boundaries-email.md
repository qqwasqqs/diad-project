# Email: Splunk Request Boundaries and Dashboard Metric Fan-Out

**Subject:** Confirmation needed: Splunk request boundaries and dashboard metric fan-out

Hi [Tech Lead Name],

I would like to confirm the expected integration pattern between the Next.js dashboards, the Azure Function, and Splunk.

The Splunk team has informed us that, because of the current saved-search implementation, each Splunk request can return only one metric. In other words, we cannot request multiple single-value metrics through one saved-search execution.

For the Product Owner dashboard, we currently have:

- 8 single-value metrics across the Product Experience Pulse and Trust and Measurement Readiness sections
- 2 charts, with one request planned for each chart

Under the current constraint, loading this page would require at least 10 downstream Splunk requests.

This becomes more significant for the other dashboards. The Tech Team and Operations Team dashboards may each display approximately 20-30 metrics, in addition to their chart requests. If every metric requires an independent Splunk call, one page load could generate more than 20-30 downstream searches.

## Proposed approach

To keep the frontend API efficient, I propose using a fan-out pattern in the Azure Function:

1. The Next.js server sends one request containing the required metric identifiers and selected filters.
2. The Azure Function validates the requested metric identifiers against an approved allow-list.
3. The Azure Function maps each identifier to its corresponding saved search.
4. It executes the required Splunk requests in parallel, using a controlled concurrency limit.
5. It combines the results into one response for the Next.js server.
6. If an individual metric fails, the response identifies that metric as unavailable without failing the entire dashboard request.

Charts could continue to use separate requests because they have different response structures and generally return larger datasets.

This would reduce the number of Next.js-to-Azure requests and give us a consistent API contract, centralized validation, common error handling, and the option to introduce caching. It would not eliminate the downstream Splunk searches, but it would allow us to manage them in a controlled place.

For caching, we are considering the following server-side options:

- Next.js server-side caching
- Azure Function-side caching as a potential option, subject to confirmation on feasibility and ownership
- Splunk-side caching, if the Splunk team supports it

Any cached result would need to vary by the complete request context, including the requested metrics, time range, business units, projects, timezone, and any other applicable filters. We would also need an agreed cache duration so that reduced Splunk load does not result in unacceptably stale dashboard data.

Could you please confirm whether this is the preferred architecture?

It would also be helpful to confirm the following boundaries:

1. Is one metric per Splunk request an intentional and permanent constraint of the current saved-search design?
2. Is there any supported way for Splunk to combine multiple approved metric searches into one response?
3. Are 20-30 or more Splunk searches per dashboard load acceptable?
4. What Splunk concurrency or rate limits must we respect?
5. Should the Azure Function execute searches sequentially or with bounded parallelism? If parallel execution is allowed, what concurrency limit should we use?
6. What are the expected execution times for the saved searches?
7. What timeout limits apply to the Azure Function and the Splunk requests?
8. Can aggregated metric results be cached on the Next.js server, potentially in the Azure Function, or on the Splunk side? If so, which layer should own the cache and what cache duration would be acceptable?
9. Should the fan-out and aggregation responsibility belong to the Azure Function, or should it be implemented in the Next.js server layer?

Once these points are confirmed, we can finalize the endpoint contract and estimate the expected request volume for each dashboard.

Thanks,  
[Your Name]
