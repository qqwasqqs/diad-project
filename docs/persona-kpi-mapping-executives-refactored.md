# Executives Persona KPI Mapping

Source workbook: `KPIs & Field Mappings Final-22April.xlsx`

Source sheets:

- Persona data: `Persona-KPIMapping`
- Field descriptions: `Generic-KPI-FieldsMapping` (`Fields` to `Description`)

## Mapping notes

- KPI records follow the workbook order. A dash (`—`) represents a blank cell; some blanks were visually covered by merged cells in Excel.
- Field names were matched case-insensitively after trimming whitespace. A suffix after `:` was removed only when the remaining base field exactly matched the generic registry.
- Where the generic sheet contains distinct descriptions for a single field, each description is retained with its metric and source context.
- Missing matches are explicit. No descriptions were inferred from similar-looking fields.

## KPI Mapping

### End-to-End Latency

Classification: Performance  
KPI Category: Latency  
Metrics: End-to-End Latency  
Key Fields: `timestamp_start`, `timestamp_end`, `response_latency_ms`  
Source: UI Layer  
Calculation: End-to-End Latency = `AVG(response_latency_ms)` or `P95(response_latency_ms)`  
Field Description:

- `timestamp_start`: UI timestamp when the user submits a request; start of end-to-end latency measurement. (Metric: End-to-End Latency; Source: UI Layer.)
  - Timestamp when the request began. Session duration is derived from the minimum and maximum timestamps per session. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)
- `timestamp_end`: UI timestamp when the final response is received and rendered; true end-to-end completion point.
- `response_latency_ms`: Computed as response timestamp minus submit timestamp; primary user-experience latency KPI. (Metric: End-to-End Latency; Source: UI Layer (Response).)
  - UI-measured request duration; P50 represents AHT. (Metric: Average Handling Time; Source: UI Layer (Response).)

### API Error Rate (Inference Errors)

Classification: Reliability  
KPI Category: Error Rate  
Metrics: API Error Rate (Inference Errors)  
Key Fields: `status_code`, `error_code (API)`, `response_status`, `error_message (API)`  
Source: UI Layer, Azure Open AI (as client)  
Calculation: API Error Rate = Error count / Total Request  
Field Description:

- `status_code`: HTTP response status code. Logged by application code on every API call response.
- `error_code (API)`: Structured error code for pattern detection across recurring failures.
- `response_status`: `success`, `error`, `timeout`, or `content_filtered`; feeds uptime calculation.
- `error_message (API)`: Human-readable failure detail for RCA.

### Session & Query Volume (Session Length / Query per Session)

Classification: Adoption  
KPI Category: User Engagement  
Metrics: Session & Query Volume (Session Length / Query per Session)  
Key Fields: `session_id`, `conversation_id`, `user_id`, `channel`, `timestamp_start`  
Source: UI Layer  
Calculation: Distinct User ID; average query per user.  
Field Description:

- `session_id`: User session identifier for session-level analytics. (Metric: Request Throughput; Source: UI Layer.)
  - Unique user session identifier. Used to compute queries per session and session-level metrics. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)
  - Session-level access grouping. All events in a session share `session_id`. (Metric: Access Traceability; Source: UI Layer.)
- `conversation_id`: Identifier for a multi-turn conversation within a session; enables conversation-depth analysis.
- `user_id`: SHA-256-hashed user identifier; segmentation without storing PII. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)
  - SHA-256-hashed user identifier for segmentation without storing PII. (Metric: User Satisfaction Rate; Source: UI Layer.)
  - Pseudonymised user ID (SHA-256 hash). Identifies a user without storing PII. Required for compliance audit. (Metric: User Accountability; Source: UI Layer.)
- `channel`: `web`, `teams`, `mobile`, or `api`; an unexpected channel in production triggers an alert. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)
  - `web`, `teams`, `mobile`, or `api`. An unexpected channel in production triggers an alert. (Metric: Access Traceability; Source: UI Layer.)
- `timestamp_start`: UI timestamp when the user submits a request; start of end-to-end latency measurement. (Metric: End-to-End Latency; Source: UI Layer.)
  - Timestamp when the request began. Session duration is derived from the minimum and maximum timestamps per session. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)

### User Feedback (Thumbs Up/Down)

Classification: —  
KPI Category: —  
Metrics: User Feedback (Thumbs Up/Down)  
Key Fields: `user_feedback_score`, `user_id`  
Source: UI Layer  
Calculation: Distinct User ID; total positive feedback percentage; total negative feedback percentage. Positive User Feedback % = Total Positive Feedback (`user_feedback_score >= 3`) / Total Feedback Received.  
Field Description:

- `user_feedback_score`: Binary feedback (`1` = thumbs up, `0` = thumbs down) logged as a separate event on the same correlation ID.
- `user_id`: SHA-256-hashed user identifier; segmentation without storing PII. (Metric: Session & Query Volume (Session Length / Query per Session); Source: UI Layer.)
  - SHA-256-hashed user identifier for segmentation without storing PII. (Metric: User Satisfaction Rate; Source: UI Layer.)
  - Pseudonymised user ID (SHA-256 hash). Identifies a user without storing PII. Required for compliance audit. (Metric: User Accountability; Source: UI Layer.)

### Cost per Request

Classification: Cost  
KPI Category: Cost Evaluation  
Metrics: Cost per Request  
Key Fields: `cost_per_request`, `usage.prompt_tokens`, `usage.completion_tokens`, `total_tokens`  
Source: Azure OpenAI (Client)  
Calculation: `cost_per_request`; `SUM(token_prompt * input_token_price + token_completion * output_token_price)`; `AVG(cost_per_request) = SUM(cost_per_request) / Total number of requests`.  
Field Description:

- `cost_per_request`: Computed total cost using input and output token pricing.
- `usage.prompt_tokens`: Actual input tokens consumed.
- `usage.completion_tokens`: Actual output tokens generated from `API response.usage.completion_tokens`. Output tokens are approximately 2–4 times more expensive per token.
- `total_tokens`: Combined prompt and completion tokens.

### Cost by BU and Project

Classification: —  
KPI Category: —  
Metrics: Cost by BU and Project  
Key Fields: `business_unit`, `project_name`  
Source: ALL Components  
Calculation: Aggregate `cost_per_request` by BU and Project. Filter `cost_per_request` by BU and Project, and calculate an average if required.  
Field Description:

- `business_unit`: Business unit owning this request. Mandatory on every custom event for BU-level cost grouping. (Metric: Cost by BU and Project; Source: ALL Components.)
  - Business unit owning this application. (Metric: Business Ownership; Source: ALL Components.)
- `project_name`: Project or use-case name within the BU. Sub-BU cost attribution. (Metric: Cost by BU and Project; Source: ALL Components.)
  - Project name within the BU. Sub-BU ownership attribution. (Metric: Business Ownership; Source: ALL Components.)

### Infrastructure Cost

Classification: —  
KPI Category: —  
Metrics: Infrastructure Cost  
Key Fields: `Azure Cost Management`  
Source: ALL Components  
Calculation: —  
Field Description:

- `Azure Cost Management`: No exact description found in `Generic-KPI-FieldsMapping`.

### Safety Evaluation Score

Classification: Safety and Risks Evaluators  
KPI Category: Content Safety  
Metrics: Safety Evaluation Score  
Key Fields: `hate_unfairness_score`, `hate_unfairness_result`, `hate_unfairness_reason`, `violence_score`, `violence_result`, `violence_reason`, `sexual_score`, `sexual_result`, `sexual_reason`, `self_harm_score`, `self_harm_result`, `self_harm_reason`  
Source: Azure AI Foundry SDK  
Calculation: `COUNT(guardrail_triggered) / COUNT(request_id)` to calculate impacted percentage, or obtain the score directly for the application.  
Field Description:

- `hate_unfairness_score`: Numeric severity score (0–7) for hate or unfairness content.
- `hate_unfairness_result`: Pass/fail based on severity threshold.
- `hate_unfairness_reason`: LLM explanation of why hate or unfairness was detected and its severity.
- `violence_score`: Numeric severity score (0–7). A score greater than `3` means fail.
- `violence_result`: Pass/fail indicator.
- `violence_reason`: LLM explanation of violence detected.
- `sexual_score`: Numeric severity score (0–7).
- `sexual_result`: `pass` or `fail`.
- `sexual_reason`: LLM explanation.
- `self_harm_score`: Numeric severity score (0–7) for self-harm content.
- `self_harm_result`: Pass/fail indicator.
- `self_harm_reason`: `self_harm_reason`.

### MLflow Safety Score

Classification: —  
KPI Category: —  
Metrics: MLflow Safety Score  
Key Fields: `response/llm_judged/safety/rating/average`  
Source: MLflow / Databricks ML  
Calculation: KPI value = average of safety ratings over the selected period. Example KPI card: Safety Score = `4.42 / 5`; Green: `>= 4.0`; Yellow: `3.0–3.99`; Red: `< 3.0`.  
Field Description:

- `response/llm_judged/safety/rating/average`: Float from 0 to 1.

### PII Leakage (Agent Only)

Classification: —  
KPI Category: Security  
Metrics: PII Leakage (Agent Only)  
Key Fields: `Sensitive_data_leakage`  
Source: AI Foundry SDK (Agent Only)  
Calculation: PII Leakage Score = `AVG(Sensitive_data_leakage)`.  
Field Description:

- `Sensitive_data_leakage`: Pass/fail indicator or score.

## Additional populated cells outside the main persona table

These populated cells occur within this persona's Excel row range but outside the six-column persona table structure.

| Excel cell | Value |
| - | - |
| L5 | `AVG(model_latency_ms)` or `P95(model_latency_ms)` |
| B11 | Reliability and Responsiveness |

## Field-description join coverage

- Exact field references matched: 34
- Base-field matches after removing a descriptive suffix following `:`: 0
- Field-like references without an exact registry match: 1

Unmatched value: `Azure Cost Management`
