# Technical Teams Persona KPI Mapping

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
Key Fields: timestamp_start, timestamp_end, response_latency_ms  
Source: UI Layer  
Calculation: End-to-End Latency = AVG(response_latency_ms) or P95(response_latency_ms)  
Field Description:

- `timestamp_start`: UI timestamp when the user submits a request; start of end-to-end latency measurement. (metric: End-to-End Latency; source: UI Layer)
  - Timestamp when the request began. Session duration is derived from min/max timestamps per session. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
- `timestamp_end`: UI timestamp when the final response is received and rendered; true end-to-end completion point.
- `response_latency_ms`: Computed as response_timestamp − submit_timestamp; primary user experience latency KPI. (metric: End-to-End Latency; source: UI Layer (Response))
  - UI-measured request duration; P50 represents AHT. (metric: Average Handling Time; source: UI Layer (Response))

### Tool Call Latency

Classification: —  
KPI Category: —  
Metrics: Tool Call Latency  
Key Fields: tool_call_latency, tool_name  
Source: Orchestration /AI Agent  
Calculation: Too Call Latency = AVG(tool_call_latency)  
Field Description:

- `tool_call_latency`: Execution time for each individual tool invocation.
- `tool_name`: Name of the tool invoked. (metric: Tool Call Latency; source: Orchestration / Agent)
  - Name of each tool invoked by the agent. (metric: Tool Call Accuracy; source: Application code (from Azure OpenAI API response))
  - Name of each tool invoked by the agent. Group by tool_name to audit which capabilities are used. (metric: Tool Usage Compliance Rate; source: Orchestration / Agent)

### Retrieval Latency

Classification: —  
KPI Category: —  
Metrics: Retrieval Latency  
Key Fields: DurationMs, query_latency_ms, request_timestamp_start, timestamp_end (retrieval)  
Source: Azure AI Search, ADF-Databricks · Backend API, Backend API / Orchestration  
Calculation: Retrival Latency = AVG(query_latency_ms)  
Field Description:

- `DurationMs`: Per-query execution time from AI Search logs; used for P95/P99 analysis. (metric: Retrieval Latency; source: Azure AI Search)
  - Per-query execution duration from AI Search diagnostic logs. (metric: Retrieval Quality; source: Azure AI Search (resource logs))
- `query_latency_ms`: Client-side retrieval time including network overhead.
- `request_timestamp_start`: When retrieval call was initiated; client-side latency baseline.
- `timestamp_end (retrieval)`: When retrieval response was received; latency end point.

### Model Response Latency

Classification: —  
KPI Category: —  
Metrics: Model Response Latency  
Key Fields: model_latency_ms, timestamp_start (AOAI), timestamp_end (AOAI), completion_status  
Source: Azure Open AI, Backend API, Azure Open AI(Client)  
Calculation: Model Response Latency= AVG(model_latency_ms)  
Field Description:

- `model_latency_ms`: backend_response_timestamp − backend_request_timestamp; isolates model time from network.
- `timestamp_start (AOAI)`: When Azure OpenAI call was initiated.
- `timestamp_end (AOAI)`: When Azure OpenAI response was received.
- `completion_status`: Overall status of the completion call; health signal at AOAI level.

### Pipeline Duration (Pipeline Execution latency)

Classification: —  
KPI Category: —  
Metrics: Pipeline Duration (Pipeline Execution latency)  
Key Fields: pipelineName, runId, run_start_timestamp, run_end_timestamp, duration  
Source: ADF  
Calculation: Pipeline Duration per request = duration, Avg(Pipeline Duration per request)  
Field Description:

- `pipelineName`: Name of the Azure Data Factory pipeline (properties.pipelineName); used for grouping metrics.
- `runId`: Unique identifier for the pipeline execution; primary join key for pipeline telemetry.
- `run_start_timestamp`: Pipeline execution start timestamp; SLA baseline.
- `run_end_timestamp`: Pipeline execution end timestamp; used to calculate duration.
- `duration`: Total pipeline runtime emitted by ADF; alert when exceeding pipeline-specific SLA.

### Indexing/AI Services Latency

Classification: —  
KPI Category: —  
Metrics: Indexing/AI Services Latency  
Key Fields: indexer_execution_time_ms, processing_start_timestamp, processing_end_timestamp, processing_duration_ms, transcription_latency_ms, translation_latency_ms, audio_duration_ms  
Source: Azure AI Search, Azure AI Speech, Azure AI Translation, ADF/Databricks (Indexing)  
Calculation: AI Service latency = service_execution_time_ms or service_duration_ms  
Field Description:

- `indexer_execution_time_ms`: Total run time of the Azure AI Search indexer from resource diagnostic logs.
- `processing_start_timestamp`: Start timestamp of the Databricks indexing notebook; indexing SLA baseline.
- `processing_end_timestamp`: End timestamp of the Databricks indexing notebook; used to compute duration. (metric: Indexing Latency; source: Databricks (Indexing))
  - Timestamp when indexing finished; used to calculate freshness lag. (metric: Dataset Freshness; source: Databricks (Indexing))
- `processing_duration_ms`: Activity execution duration; activity-level SLA. (metric: Activity Duration; source: ADF Activity)
  - Total indexing duration (metric: Indexing Latency; source: Databricks (Indexing))
- `transcription_latency_ms`: Time from audio submission to transcript generation.
- `translation_latency_ms`: Time taken by AI Translator to translate a document.
- `audio_duration_ms`: Duration of audio file; SLA ratio = transcription_latency / audio_duration.

### Request Throughput

Classification: —  
KPI Category: Throughput  
Metrics: Request Throughput  
Key Fields: request_id, timestamp, session_id  
Source: UI Layer · Backend API  
Calculation: Request Throughput = Count(Distinct(request_id) in the time window/Time window in seconds  
Field Description:

- `request_id`: Unique identifier per request; used for throughput calculations.
- `timestamp`: Event timestamp; buckets requests into time windows for rate calculation.
- `session_id`: User session identifier for session-level analytics. (metric: Request Throughput; source: UI Layer)
  - Unique user session identifier. Used to compute queries per session and session-level metrics. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - Session-level access grouping. All events in a session share session_id. (metric: Access Traceability; source: UI Layer)

### Token Throughput

Classification: —  
KPI Category: —  
Metrics: Token Throughput  
Key Fields: TokenTransaction, AzureOpenAITokenPerSecond, SearchQueriesPerSecond, total_tokens_trace, prompt_tokens (MLflow span), completion_tokens (MLflow span), ActiveTokens, ThrottledSearchQueriesPercentage, throttled, deployment_name  
Source: Azure AI Search, Databricks ML/ ML Flow  
Calculation: Token Throughput = AVG(Azure Open AI Token Per Second) Or AVG(SearchQueries per Second) MLFlow Thoken Throughput = (Prompt_Tokens + Completion_Tokens) per time unit/Time unit  
Field Description:

- `TokenTransaction`: Total tokens (prompt + completion) per request. (metric: Token Throughput; source: Azure OpenAI)
  - Total tokens (prompt + completion). (metric: Token Consumption; source: Azure OpenAI)
- `AzureOpenAITokenPerSecond`: Tokens generated per second. Token/s throughput for capacity planning.
- `SearchQueriesPerSecond`: Queries per second. Search throughput capacity monitoring. (metric: Token Throughput; source: Azure AI Search)
  - Queries per second. (Query volume cost driver.) (metric: Azure AI Search Cost; source: Azure AI Search)
- `total_tokens_trace`: Sum of prompt + completion tokens across all LLM spans in the trace. MLflow SDK field. Use this for Databricks-hosted model cost tracking.
- `prompt_tokens (MLflow span)`: Input tokens for a single LLM span. Extracted from Databricks serving endpoint response. Distinct from Azure OpenAI usage.prompt_tokens which covers one AOAI call only.
- `completion_tokens (MLflow span)`: Output tokens for a single LLM span. Extracted from Databricks serving endpoint response. Distinct from Azure OpenAI usage.completion_tokens.
- `ActiveTokens`: Tokens currently in flight; high values indicate throttling risk. (metric: Request Throughput; source: Azure OpenAI)
  - Active tokens currently being processed. (metric: Available Token Limit; source: Azure OpenAI)
- `ThrottledSearchQueriesPercentage`: % of AI Search queries that were throttled. Any throttling in prod = scale event needed.
- `throttled`: Boolean: whether this specific request was throttled; per-request indicator.
- `deployment_name`: Azure OpenAI deployment name. Maps utilization to specific capacity allocation. (metric: Request Throughput; source: Azure OpenAI (Client))
  - Azure OpenAI deployment handling the request. (metric: Available Token Limit; source: Azure OpenAI (Client))

### Pipeline Failure Rate

Classification: Reliability  
KPI Category: Error Rate  
Metrics: Pipeline Failure Rate  
Key Fields: status, failureType, triggered_by, errorCode  
Source: ADF Pipelines/Activities  
Calculation: Pipeline Failure Rate = Total ( Error_Code)/Total Request  
Field Description:

- `status`: Final pipeline state (Succeeded, Failed, Cancelled). (metric: Pipeline Failure Rate; source: ADF Pipeline)
  - Execution status of the ADF activity (Succeeded or Failed). (metric: Activity Failure Rate; source: ADF Activity)
- `failureType`: Error classification (System or User) from ADF diagnostics.
- `triggered_by`: Manual / Schedule / Event; unexpected manual trigger in prod = audit event. (metric: Pipeline Failure Rate; source: ADF Pipeline)
  - Manual / Schedule / Event. Official ADF Triggers schema field. Unexpected manual trigger in prod = audit event. (metric: Audit Logging; source: ADF Pipeline)
- `errorCode`: Structured ADF error code for failure pattern analysis.

### Job Failure Rate

Classification: —  
KPI Category: —  
Metrics: Job Failure Rate  
Key Fields: jobTerminalState, response.statusCode, response.errorMessage, job_id  
Source: Databricks  
Calculation: Job Failure Rate = Total ( Failed response.statusCode)/Total Request  
Field Description:

- `jobTerminalState`: Final execution state (Succeeded, Failed, TimedOut, Skipped).
- `response.statusCode`: HTTP status of Databricks API response.
- `response.errorMessage`: Error detail from Databricks API.
- `job_id`: Identifier for the Databricks job; groups related executions. (metric: Job Latency; source: Databricks)
  - Databricks job ID. Groups failure rates per recurring job. (metric: Job Failure Rate; source: Databricks)

### Inference Error Rate

Classification: —  
KPI Category: —  
Metrics: Inference Error Rate  
Key Fields: status_code, error_code (Model call), response_status (Model call), error_message (Model call)  
Source: Azure Open AI ( as client)  
Calculation: Inference Error Rate = Total (error_code)/Total Request  
Field Description:

- `status_code`: HTTP response status code. Logged by application code on every API call response.
- `error_code (Model call)`: No exact description found in Generic-KPI-FieldsMapping.
- `response_status (Model call)`: No exact description found in Generic-KPI-FieldsMapping.
- `error_message (Model call)`: No exact description found in Generic-KPI-FieldsMapping.

### API Service Error Rate

Classification: —  
KPI Category: —  
Metrics: API Service Error Rate  
Key Fields: status_code, error_code (API), response_status, error_message (API)  
Source: UI Layer  
Calculation: API Service Error Rate = Total (AI related Error_Code)/Total Request  
Field Description:

- `status_code`: HTTP response status code. Logged by application code on every API call response.
- `error_code (API)`: Structured error code for pattern detection across recurring failures.
- `response_status`: success / error / timeout / content_filtered; feeds uptime calculation.
- `error_message (API)`: Human-readable failure detail for RCA.

### Training Failure Rate

Classification: —  
KPI Category: —  
Metrics: Training Failure Rate  
Key Fields: training_status  
Source: MLflow / Databricks ML  
Calculation: Training Failure Rate = Count(Training Status (Failure))/Count (All Training Runs) *100  
Field Description:

- `training_status`: Current state of the training run (Succeeded, Failed, Running). (metric: Training Duration; source: MLflow / Databricks ML)
  - Succeeded / Failed / Running. Logged by MLflow SDK. Feeds training failure rate and training SLA. (metric: Training Failure Rate; source: MLflow / Databricks ML)

### Indexing Failure Rate

Classification: —  
KPI Category: —  
Metrics: Indexing Failure Rate  
Key Fields: indexing_status, failed_document_count  
Source: Azure AI Search, Databricks(Indexing)  
Calculation: Indexing Failure Rate = Count(Indexing Status (Failure))/Count (All Indexing requests) *100  
Field Description:

- `indexing_status`: Success / Failed / TransientFailure for the indexer run.
- `failed_document_count`: Count of documents that failed indexing in this run. Catches silent partial failures where index reports Success but N documents are missing.

### Transcription Failure Rate

Classification: —  
KPI Category: —  
Metrics: Transcription Failure Rate  
Key Fields: transcription_status, confidence_score, word_error_rate  
Source: Azure AI Speech  
Calculation: Transcription Failure Rate = Count(Transcription Status (Failure))/Count (All Transcription requests) *100  
Field Description:

- `transcription_status`: Success / Failed / Partial; primary health signal for speech pipeline.
- `confidence_score`: Per-utterance confidence; low confidence = data quality issue propagating into RAG.
- `word_error_rate`: % of words incorrectly transcribed; directly impacts RAG quality.

### Translation Failure Rate

Classification: —  
KPI Category: —  
Metrics: Translation Failure Rate  
Key Fields: translation_status  
Source: Azure AI Translator  
Calculation: Translation Failure Rate = Count(Translation Status (Failure))/Count (All Translation requests) *100  
Field Description:

- `translation_status`: Success / Failed; health signal for translation step.

### Groundedness

Classification: Quality  
KPI Category: AI Response Quality  
Metrics: Groundedness  
Key Fields: evaluation_run_id, groundedness_score, groundedness_result, completion_id, finish_reason  
Source: Azure AI Foundry SDK  
Calculation: Groundedness = AVG(Groundedness_score)  
Field Description:

- `evaluation_run_id`: Foundry evaluation run ID; groups all evaluator scores from one batch for history trending.
- `groundedness_score`: Likert score (1–5) indicating factual support from context; averaged across turns if applicable.
- `groundedness_result`: Pass/fail flag based on configured threshold; primary hallucination alert signal.
- `completion_id`: Azure OpenAI response ID linking evaluation results to the exact model invocation.
- `finish_reason`: Model termination reason (stop, length, content_filter) from the native API response.

### Hallucination %

Classification: —  
KPI Category: —  
Metrics: Hallucination %  
Key Fields: groundedness_score: Scores below thresholds, groundedness_result: Failures  
Source: Azure AI Foundry SDK  
Calculation: We need more discussion as the calculation is tricky and need to understand if Dev team is going to enable the hallucinatoin evaluation, how?  
Field Description:

- `groundedness_score: Scores below thresholds (matched to registry field groundedness_score)`: Likert score (1–5) indicating factual support from context; averaged across turns if applicable.
- `groundedness_result: Failures (matched to registry field groundedness_result)`: Pass/fail flag based on configured threshold; primary hallucination alert signal.

### Response Coherence

Classification: —  
KPI Category: —  
Metrics: Response Coherence  
Key Fields: coherence_score, coherence_result  
Source: Azure AI Foundry SDK  
Calculation: Response Coherence = AVG(Coherence_score)  
Field Description:

- `coherence_score`: Likert score (1–5) measuring logical structure and readability.
- `coherence_result`: Pass/fail classification based on threshold.

### F1 Score

Classification: —  
KPI Category: —  
Metrics: F1 Score  
Key Fields: f1_score, f1_result  
Source: Azure AI Foundry SDK  
Calculation: F1 = AVG(f1_score)  
Field Description:

- `f1_score`: Token-overlap F1 score (0.0–1.0) computed using NLP metrics. (Faster and cheaper than Similarity)
- `f1_result`: Pass/fail indicator.

### Response Completeness

Classification: —  
KPI Category: —  
Metrics: Response Completeness  
Key Fields: response_completeness, response_completeness_result  
Source: Azure AI Foundry SDK  
Calculation: Response Completeness = AVG(response_completeness)  
Field Description:

- `response_completeness`: Likert score (1–5) measuring coverage of all critical information from ground truth.
- `response_completeness_result`: Pass/fail indicator.

### Relevance Quality

Classification: —  
KPI Category: —  
Metrics: Relevance Quality  
Key Fields: relevance_score, relevance_result  
Source: Azure AI Foundry SDK  
Calculation: Relevance Quality = AVG(relevance_score)  
Field Description:

- `relevance_score`: Likert score (1–5) measuring how well the response addresses the query.
- `relevance_result`: Pass/fail indicator.

### Textual Similarity

Classification: —  
KPI Category: —  
Metrics: Textual Similarity  
Key Fields: similarity_score, similarity_result  
Source: Azure AI Foundry SDK  
Calculation: Textual Similarity = AVG(similarity_score)  
Field Description:

- `similarity_score`: Likert score (1–5) measuring semantic similarity to ground-truth answers.
- `similarity_result`: Pass/fail indicator.

### Retrieval Quality

Classification: —  
KPI Category: RAG Quality  
Metrics: Retrieval Quality  
Key Fields: retrieval_score, retrieval_result  
Source: Application code (from AI Search response) Azure AI Foundry SDK, Azure AI Search, Application Code  
Calculation: Retrival Quality = AVG(Retrival_Score)  
Field Description:

- `retrieval_score`: Likert score (1–5) measuring relevance and ranking quality of retrieved chunks.
- `retrieval_result`: Pass/fail indicator.

### Task Adherence Score

Classification: —  
KPI Category: Agent Quality  
Metrics: Task Adherence Score  
Key Fields: task_adherence_score, task_adherence_result  
Source: Azure AI Foundry SDK Backend API / Orchestration,  
Calculation: Task Adherence Score = AVG(Task_Adherence_Score)  
Field Description:

- `task_adherence_score`: Likert score (1–5) indicating compliance with system instructions. (metric: Task Adherence Score; source: Azure AI Foundry SDK)
  - Likert 1–5; compliance with system instructions. (metric: Task Adherence Score; source: Azure AI Foundry SDK)
- `task_adherence_result`: Pass/fail indicator.

### Tool Call Accuracy

Classification: —  
KPI Category: —  
Metrics: Tool Call Accuracy  
Key Fields: tool_call_accuracy_score, tool_name  
Source: Azure AI Foundry SDK Application code (from Azure OpenAI API response) Orchestration / Agent code  
Calculation: Tool Call Accuracy = AVG(tool_call_accuracy_score)  
Field Description:

- `tool_call_accuracy_score`: Composite score evaluating tool selection, parameters, redundancy, and output usage.
- `tool_name`: Name of the tool invoked. (metric: Tool Call Latency; source: Orchestration / Agent)
  - Name of each tool invoked by the agent. (metric: Tool Call Accuracy; source: Application code (from Azure OpenAI API response))
  - Name of each tool invoked by the agent. Group by tool_name to audit which capabilities are used. (metric: Tool Usage Compliance Rate; source: Orchestration / Agent)

### Intent Resolution Score

Classification: —  
KPI Category: —  
Metrics: Intent Resolution Score  
Key Fields: intent_resolution_score, intent_resolution_result  
Source: Azure AI Foundry SDK  
Calculation: Intent Resolution Score -AVG(intent_resolution_score)  
Field Description:

- `intent_resolution_score`: Likert score (1–5) measuring how accurately user intent was understood.
- `intent_resolution_result`: Pass/fail indicator.

### MLflow Correctness Score

Classification: —  
KPI Category: ML Evaluation  
Metrics: MLflow Correctness Score  
Key Fields: response/llm_judged/correctness/rating/average  
Source: MLflow / Databricks ML  
Calculation: MLflow Correctness = AVG( MLFlow Correctness_Score)  
Field Description:

- `response/llm_judged/correctness/rating/average`: float 0–1. From mlflow.evaluate() with Databricks judge model.

### MLflow Groundedness Score

Classification: —  
KPI Category: —  
Metrics: MLflow Groundedness Score  
Key Fields: response/llm_judged/groundedness/rating/average  
Source: MLflow / Databricks ML  
Calculation: MLflow Groundedness = AVG( MLFlow Groundedness_Score)  
Field Description:

- `response/llm_judged/groundedness/rating/average`: float 0–1. Requires retrieved_context[].content in eval dataset.

### MLflow Document Recall

Classification: —  
KPI Category: —  
Metrics: MLflow Document Recall  
Key Fields: document_recall/recall  
Source: MLflow / Databricks ML  
Calculation: —  
Field Description:

- `document_recall/recall`: float 0–1

### MLflow Relevance Score

Classification: —  
KPI Category: —  
Metrics: MLflow Relevance Score  
Key Fields: response/llm_judged/relevance_to_query/rating/average  
Source: MLflow / Databricks ML  
Calculation: MLflow Relevancy = AVG( MLFlow relevance_to_query)  
Field Description:

- `response/llm_judged/relevance_to_query/rating/average`: float 0–1

### Training Accuracy Score

Classification: —  
KPI Category: Training Quality  
Metrics: Training Accuracy Score  
Key Fields: metrics.accuracy  
Source: MLflow / Databricks ML  
Calculation: Training Accuracy Score =AVG(Training_Accuracy_Score)  
Field Description:

- `metrics.accuracy`: Per-epoch or final accuracy from mlflow.log_metric(step=epoch). Time-series in MLflow UI.

### Training F1 Score

Classification: —  
KPI Category: —  
Metrics: Training F1 Score  
Key Fields: metrics.f1_score  
Source: MLflow / Databricks ML  
Calculation: Training F1 Score = AVG(Training_F1_Score)  
Field Description:

- `metrics.f1_score`: Logged per class and macro-average during training run.

### Safety Evaluation Score

Classification: Safety and Risks Evaluators  
KPI Category: Content Safety  
Metrics: Safety Evaluation Score  
Key Fields: hate_unfairness_score, hate_unfairness_result, hate_unfairness_reason, violence_score, violence_result, violence_reason, sexual_score, sexual_result, sexual_reason, self_harm_score, self_harm_result, self_harm_reason  
Source: Azure AI Foundry SDK  
Calculation: We can get the score directly from relevent scores or Guradrail trigger % = (COUNT(guardrail_triggered) / COUNT(request_id)*100 )to calculate impacted %  
Field Description:

- `hate_unfairness_score`: Numeric severity score (0–7) for hate or unfairness content.
- `hate_unfairness_result`: Pass/fail based on severity threshold.
- `hate_unfairness_reason`: LLM explanation of why hate/unfairness was detected and its severity.
- `violence_score`: Numeric severity 0–7. Score > 3 = fail.
- `violence_result`: Pass/fail indicator.
- `violence_reason`: LLM explanation of violence detected.
- `sexual_score`: Numeric severity score (0–7)
- `sexual_result`: 'pass' / 'fail'.
- `sexual_reason`: LLM explanation.
- `self_harm_score`: Numeric severity score (0–7) for self-harm content.
- `self_harm_result`: Pass/fail indicator
- `self_harm_reason`: self_harm_reason

### MLflow Safety Score

Classification: —  
KPI Category: —  
Metrics: MLflow Safety Score  
Key Fields: response/llm_judged/safety/rating/average  
Source: MLflow / Databricks ML  
Calculation: MLFlow Safety Score = AVG(Safety)  
Field Description:

- `response/llm_judged/safety/rating/average`: float 0–1

### PII Leakage (Agent Only)

Classification: —  
KPI Category: Security  
Metrics: PII Leakage (Agent Only)  
Key Fields: Sensitive_data_leakage  
Source: AI Foundry SDK (Agent Only)  
Calculation: Its available only in preview and for agent only PII Leakage Score = AVG(Sensitive_data_leakage) Attack Success rate - If its above 0% than application has data leakage vulneraility. Sensitive_data_leakage - its Pass or Fail label  
Field Description:

- `Sensitive_data_leakage`: Pass/fail indicator/score

### User prompt injected attacks (UPIA)

Classification: —  
KPI Category: —  
Metrics: User prompt injected attacks (UPIA)  
Key Fields: indirect_attack, xpia_manipulated_content, xpia_intrusion, xpia_information_gathering  
Source: Azure AI Foundry SDK (IndirectAttackEvaluator) Azure AI Foundry SDK  
Calculation: User prompt injected attacks (UPIA) - Security team test the application with malicious prompt and based on their defect rate or attack success rate, Application flagged if its vulnerable for UPIA Defect Rate = Number of successful attack/Total number of test cases * 100  
Field Description:

- `indirect_attack`: Indicates whether the response fell for an indirect prompt injection.
- `xpia_manipulated_content`: Indicates attempts to alter or fabricate contextual information.
- `xpia_intrusion`: Indicates attempts at unauthorized access or privilege escalation.
- `xpia_information_gathering`: Indicates attempts to extract sensitive information.

### Cost per Request

Classification: Cost  
KPI Category: Cost Evaluation  
Metrics: Cost per Request  
Key Fields: cost_per_request, usage.prompt_tokens, usage.completion_tokens, total_tokens  
Source: Azure OpenAI (Client)  
Calculation: Cost per request = (cost_per_request), Cost per request = SUM(token_prompt * input_Token_price + token_completion * output_token_price) AVG(Cost_per_request) = SUM of All (Cost_per_request)/Total number of requests  
Field Description:

- `cost_per_request`: Computed total cost using input and output token pricing.
- `usage.prompt_tokens`: Actual input tokens consumed.
- `usage.completion_tokens`: Actual output tokens generated. From API response.usage.completion_tokens. Output tokens are ~2–4× more expensive per token.
- `total_tokens`: Combined prompt and completion tokens.

### Token Usage Per Request

Classification: —  
KPI Category: Consumption  
Metrics: Token Usage Per Request  
Key Fields: ProcessedPromptTokens, TokenTransaction  
Source: Azure OpenAI Azure OpenAI (Client)  
Calculation: Input Token = ProcessedPrompt Token, Output Token = Token Transaction - ProcessedPrompt Token Token Usage Per Request = Token Transaction (for 1 request)  
Field Description:

- `ProcessedPromptTokens`: Azure OpenAI platform-reported input tokens.
- `TokenTransaction`: Total tokens (prompt + completion) per request. (metric: Token Throughput; source: Azure OpenAI)
  - Total tokens (prompt + completion). (metric: Token Consumption; source: Azure OpenAI)

### Available Token Limit

Classification: —  
KPI Category: —  
Metrics: Available Token Limit  
Key Fields: ActiveTokens, deployment_name  
Source: Azure OpenAI Azure OpenAI (Client)  
Calculation: Available Token Limit = Active Token  
Field Description:

- `ActiveTokens`: Tokens currently in flight; high values indicate throttling risk. (metric: Request Throughput; source: Azure OpenAI)
  - Active tokens currently being processed. (metric: Available Token Limit; source: Azure OpenAI)
- `deployment_name`: Azure OpenAI deployment name. Maps utilization to specific capacity allocation. (metric: Request Throughput; source: Azure OpenAI (Client))
  - Azure OpenAI deployment handling the request. (metric: Available Token Limit; source: Azure OpenAI (Client))

### Cache Hit Ratio

Classification: —  
KPI Category: Cache Utilization  
Metrics: Cache Hit Ratio  
Key Fields: AzureOpenAIContextTokensCacheMatchRate, cached_tokens  
Source: Azure OpenAI Azure OpenAI (Client)  
Calculation: Cache Hit Ratio (%) = AzureOpenAIContextTokensCacheMatchRate, Cache Hit Ratio (%) = cached_tokens/(prompt_tokens + completion_tokens)  
Field Description:

- `AzureOpenAIContextTokensCacheMatchRate`: Percentage of prompt tokens served from cache.
- `cached_tokens`: Token count served from prompt cache.

## Field-description join coverage

- Exact field references matched: 115
- Base-field matches after removing a descriptive suffix following `:`: 2
- Field-like references without an exact registry match: 3
Unmatched values:
- status_code — HTTP response status code. Logged by application code on every API call response. error_code (Model call)
- response_status (Model call)
- error_message (Model call)
