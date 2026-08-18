# Product Owner Persona KPI Mapping

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

### Training Duration

Classification: —  
KPI Category: —  
Metrics: Training Duration  
Key Fields: training_run_id, training_duration_ms, training_status  
Source: MLflow / Databricks ML  
Calculation: AVG(training_duration_ms)  
Field Description:

- `training_run_id`: Unique identifier for the ML training run. (metric: Training Duration; source: MLflow / Databricks ML)
  - Unique MLflow training run ID; anchor for all training-level lineage. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `training_duration_ms`: Total training time; computed end − start.
- `training_status`: Current state of the training run (Succeeded, Failed, Running). (metric: Training Duration; source: MLflow / Databricks ML)
  - Succeeded / Failed / Running. Logged by MLflow SDK. Feeds training failure rate and training SLA. (metric: Training Failure Rate; source: MLflow / Databricks ML)

### Request Throughput

Classification: —  
KPI Category: Throughput  
Metrics: Request Throughput  
Key Fields: request_id, timestamp, session_id  
Source: UI Layer · Backend API  
Calculation: Request Throughput = Count(Distinct(request_id) in the time window/Time window in seconds Example past 7 days Request throughput = (Total number of distinct request_id in past 7 days)/ (7days * 24 hours * 60 mins * 60 sec)  
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
Calculation: AVG(Azure Open AI Token Per Second) AVG(SearchQueries per Second) MLFlow Thoken Throughput = (Prompt_Tokens + Completion_Tokens) per time unit/Time unit  
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

### API Error Rate

Classification: Reliability  
KPI Category: Error Rate  
Metrics: API Error Rate  
Key Fields: status_code, error_code (API), response_status, error_message (API)  
Source: UI Layer, Azure Open AI ( as client)  
Calculation: Total (AI related Error_Code)/Total Request  
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

### Transcription Failure Rate

Classification: —  
KPI Category: —  
Metrics: Transcription Failure Rate  
Key Fields: transcription_status, confidence_score, word_error_rate  
Source: Azure AI Speech  
Calculation: AVG(confidence_score), AVG(word_error_rate), TranscriptionFailure Rate = Count(Transcription Status (Failure))/Count (All Transcription_request) *100  
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
Calculation: Translation Failure Rate = Count(Translation Status (Failure))/Count (All Translation Request) *100  
Field Description:

- `translation_status`: Success / Failed; health signal for translation step.

### Session & Query Volume (Session Length / Query per Session)

Classification: Adoption  
KPI Category: User Engagement  
Metrics: Session & Query Volume (Session Length / Query per Session)  
Key Fields: session_id, conversation_id, user_id, channel, timestamp_start  
Source: UI Layer  
Calculation: AVG Session Length = Sum of distinct Session duration/Total Sessions Query per Session = Total Queries/Total Session Query Volume per Session = Session Length/queries per session  
Field Description:

- `session_id`: User session identifier for session-level analytics. (metric: Request Throughput; source: UI Layer)
  - Unique user session identifier. Used to compute queries per session and session-level metrics. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - Session-level access grouping. All events in a session share session_id. (metric: Access Traceability; source: UI Layer)
- `conversation_id`: Identifier for a multi-turn conversation within a session; enables conversation depth analysis.
- `user_id`: SHA-256–hashed user identifier; segmentation without storing PII. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - SHA-256–hashed user identifier for segmentation without storing PII. (metric: User Satisfaction Rate; source: UI Layer)
  - Pseudonymised user ID (SHA-256 hash). Identifies user without storing PII. Required for compliance audit. (metric: User Accountability; source: UI Layer)
- `channel`: web / teams / mobile / api; unexpected channel in prod = alert. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - web / teams / mobile / api. Unexpected channel in prod = alert. (metric: Access Traceability; source: UI Layer)
- `timestamp_start`: UI timestamp when the user submits a request; start of end-to-end latency measurement. (metric: End-to-End Latency; source: UI Layer)
  - Timestamp when the request began. Session duration is derived from min/max timestamps per session. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)

### Query & Prompt Length

Classification: —  
KPI Category: —  
Metrics: Query & Prompt Length  
Key Fields: prompt_length, max_completion_tokens  
Source: Azure OpenAI, Backend API · Azure OpenAI (Client)  
Calculation: AVG(Prompt_length)  
Field Description:

- `prompt_length`: Character or token count of the user's prompt. Log at both UI (character count) and API level (token count). (metric: Query & Prompt Length; source: UI Layer · Backend API)
  - Character count of user prompt. Correlate with cost_per_request. (metric: Prompt Size Impact; source: UI Layer · Backend API)
- `max_completion_tokens`: Maximum tokens allowed for the response. Used to calculate token utilization efficiency.

### User Satisfaction Rate

Classification: —  
KPI Category: —  
Metrics: User Satisfaction Rate  
Key Fields: user_feedback_score, user_id, application_name  
Source: UI Layer  
Calculation: AVG(User_Feedback_Score) AVG (User_Feedback_Score) for specific Application  
Field Description:

- `user_feedback_score`: Binary feedback (1 = thumbs up, 0 = thumbs down) logged as a separate event on the same correlation ID.
- `user_id`: SHA-256–hashed user identifier; segmentation without storing PII. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - SHA-256–hashed user identifier for segmentation without storing PII. (metric: User Satisfaction Rate; source: UI Layer)
  - Pseudonymised user ID (SHA-256 hash). Identifies user without storing PII. Required for compliance audit. (metric: User Accountability; source: UI Layer)
- `application_name`: Name of the owning application. Primary governance grouping.

### Groundedness and Hallucination

Classification: Quality  
KPI Category: AI Response Quality  
Metrics: Groundedness and Hallucination  
Key Fields: evaluation_run_id, groundedness_score, groundedness_result, completion_id, finish_reason  
Source: Azure AI Foundry SDK Application code (from Azure OpenAI API response) Azure OpenAI API response (auto)  
Calculation: AVG (Groundedness_score)  
Field Description:

- `evaluation_run_id`: Foundry evaluation run ID; groups all evaluator scores from one batch for history trending.
- `groundedness_score`: Likert score (1–5) indicating factual support from context; averaged across turns if applicable.
- `groundedness_result`: Pass/fail flag based on configured threshold; primary hallucination alert signal.
- `completion_id`: Azure OpenAI response ID linking evaluation results to the exact model invocation.
- `finish_reason`: Model termination reason (stop, length, content_filter) from the native API response.

### Response Coherence

Classification: —  
KPI Category: —  
Metrics: Response Coherence  
Key Fields: coherence_score, coherence_result  
Source: Azure AI Foundry SDK  
Calculation: AVG (Coherence_score)  
Field Description:

- `coherence_score`: Likert score (1–5) measuring logical structure and readability.
- `coherence_result`: Pass/fail classification based on threshold.

### Relevance Quality

Classification: —  
KPI Category: —  
Metrics: Relevance Quality  
Key Fields: relevance_score, relevance_result  
Source: Azure AI Foundry SDK  
Calculation: AVG (Relevance_score)  
Field Description:

- `relevance_score`: Likert score (1–5) measuring how well the response addresses the query.
- `relevance_result`: Pass/fail indicator.

### Response Completeness

Classification: —  
KPI Category: —  
Metrics: Response Completeness  
Key Fields: response_completeness, response_completeness_result  
Source: Azure AI Foundry SDK  
Calculation: AVG(Response_Completeness)  
Field Description:

- `response_completeness`: Likert score (1–5) measuring coverage of all critical information from ground truth.
- `response_completeness_result`: Pass/fail indicator.

### Textual Similarity and F1

Classification: —  
KPI Category: —  
Metrics: Textual Similarity and F1  
Key Fields: similarity_score, similarity_result, f1_score, f1_result  
Source: Azure AI Foundry SDK  
Calculation: AVG (F1_Score), AVG (Similarity_Score)  
Field Description:

- `similarity_score`: Likert score (1–5) measuring semantic similarity to ground-truth answers.
- `similarity_result`: Pass/fail indicator.
- `f1_score`: Token-overlap F1 score (0.0–1.0) computed using NLP metrics. (Faster and cheaper than Similarity)
- `f1_result`: Pass/fail indicator.

### Retrieval Quality

Classification: —  
KPI Category: RAG Quality  
Metrics: Retrieval Quality  
Key Fields: retrieved_doc_ids, retrieval_score, retrieval_result, dataset_version, result_count, search_query_hash, top_k  
Source: Application code (from AI Search response) Azure AI Foundry SDK, Azure AI Search, Application Code  
Calculation: AVG(Retrival_Score)  
Field Description:

- `retrieved_doc_ids`: List of document identifiers returned by AI Search for lineage and audit.
- `retrieval_score`: Likert score (1–5) measuring relevance and ranking quality of retrieved chunks.
- `retrieval_result`: Pass/fail indicator.
- `dataset_version`: Version identifier of the source dataset being processed. Links index state to source data version. (metric: Dataset Freshness; source: ADF Pipeline · Databricks)
  - Version of the AI Search index or dataset used for retrieval. (metric: Retrieval Quality; source: Application code (from index metadata))
  - Version string e.g. 'v2.1'. Silent upgrades = #1 cause of quality regression. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `result_count`: Number of documents returned; zero indicates retrieval failure.
- `search_query_hash`: SHA-256 hash of query string; PII-safe query pattern analysis.
- `top_k`: Number of chunks requested for context assembly.

### Task Adherence Score

Classification: —  
KPI Category: Agent Quality  
Metrics: Task Adherence Score  
Key Fields: task_adherence_score, task_adherence_result  
Source: Azure AI Foundry SDK Backend API / Orchestration,  
Calculation: AVG (Task_Adherence_Score)  
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
Calculation: AVG (Tool_Call_Accuracy_Score) Distinct (Tool_Name ) call by Application  
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
Calculation: AVG (Intent_Resolution_Score)  
Field Description:

- `intent_resolution_score`: Likert score (1–5) measuring how accurately user intent was understood.
- `intent_resolution_result`: Pass/fail indicator.

### MLflow Groundedness Score

Classification: —  
KPI Category: ML Evaluation  
Metrics: MLflow Groundedness Score  
Key Fields: response/llm_judged/groundedness/rating/average  
Source: MLflow / Databricks ML  
Calculation: AVG( MLFlow Groundedness_Score)  
Field Description:

- `response/llm_judged/groundedness/rating/average`: float 0–1. Requires retrieved_context[].content in eval dataset.

### MLflow Relevance Score

Classification: —  
KPI Category: —  
Metrics: MLflow Relevance Score  
Key Fields: response/llm_judged/relevance_to_query/rating/average  
Source: MLflow / Databricks ML  
Calculation: AVG( MLFlow Relevancy_Score)  
Field Description:

- `response/llm_judged/relevance_to_query/rating/average`: float 0–1

### Training Accuracy Score

Classification: —  
KPI Category: —  
Metrics: Training Accuracy Score  
Key Fields: metrics.accuracy  
Source: MLflow / Databricks ML  
Calculation: AVG(Training_Accuracy_Score)  
Field Description:

- `metrics.accuracy`: Per-epoch or final accuracy from mlflow.log_metric(step=epoch). Time-series in MLflow UI.

### Training F1 Score

Classification: —  
KPI Category: Training Quality  
Metrics: Training F1 Score  
Key Fields: metrics.f1_score  
Source: MLflow / Databricks ML  
Calculation: AVG(Training F1 Score)  
Field Description:

- `metrics.f1_score`: Logged per class and macro-average during training run.

### Training Loss Score

Classification: —  
KPI Category: —  
Metrics: Training Loss Score  
Key Fields: metrics.train_loss / metrics.val_loss  
Source: MLflow / Databricks ML  
Calculation: AVG(Training Loss Score)  
Field Description:

- `metrics.train_loss / metrics.val_loss`: Logged at every epoch with step=epoch.

### Safety Evaluators

Classification: Safety and Risks Evaluators  
KPI Category: Content Safety  
Metrics: Safety Evaluators  
Key Fields: hate_unfairness_score, hate_unfairness_result, hate_unfairness_reason, violence_score, violence_result, violence_reason, sexual_score, sexual_result, sexual_reason, self_harm_score, self_harm_result, self_harm_reason  
Source: Azure AI Foundry SDK  
Calculation: AVG(Content_safety_score)  
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
Calculation: AVG(MLFlow_Safety_Score)  
Field Description:

- `response/llm_judged/safety/rating/average`: float 0–1

### PII Leakage (Agent Only)

Classification: —  
KPI Category: Security  
Metrics: PII Leakage (Agent Only)  
Key Fields: Sensitive_data_leakage  
Source: AI Foundry SDK (Agent Only)  
Calculation: Attack Success rate - If its above 0% than application has data leakage vulneraility. Sensitive_data_leakage - its Pass or Fail label.  
Field Description:

- `Sensitive_data_leakage`: Pass/fail indicator/score

### User prompt injected attacks (UPIA)

Classification: —  
KPI Category: —  
Metrics: User prompt injected attacks (UPIA)  
Key Fields: indirect_attack, xpia_manipulated_content, xpia_intrusion, xpia_information_gathering  
Source: Azure AI Foundry SDK (IndirectAttackEvaluator) Azure AI Foundry SDK  
Calculation: Attack Success rate - If its above 0% than application has data leakage vulneraility. Defect Rate = Number of successful attack/Total number of test cases * 100  
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
Calculation: Cost per request = Number of request * AVG(cost_per_request)  
Field Description:

- `cost_per_request`: Computed total cost using input and output token pricing.
- `usage.prompt_tokens`: Actual input tokens consumed.
- `usage.completion_tokens`: Actual output tokens generated. From API response.usage.completion_tokens. Output tokens are ~2–4× more expensive per token.
- `total_tokens`: Combined prompt and completion tokens.

### Token Consumption

Classification: —  
KPI Category: —  
Metrics: Token Consumption  
Key Fields: ProcessedPromptTokens, TokenTransaction  
Source: Azure OpenAI Azure OpenAI (Client)  
Calculation: Token Consumption = TokenTransaction Input Token = ProcessedPrompt Token Output Token = Token Transaction - ProcessedPrompt Token  
Field Description:

- `ProcessedPromptTokens`: Azure OpenAI platform-reported input tokens.
- `TokenTransaction`: Total tokens (prompt + completion) per request. (metric: Token Throughput; source: Azure OpenAI)
  - Total tokens (prompt + completion). (metric: Token Consumption; source: Azure OpenAI)

### Capacity Utilization

Classification: —  
KPI Category: —  
Metrics: Capacity Utilization  
Key Fields: ActiveTokens, deployment_name  
Source: Azure OpenAI Azure OpenAI (Client)  
Calculation: Capacity Utilization = Active Tokens/Provisioned Token Capacity (Static and predefined)  
Field Description:

- `ActiveTokens`: Tokens currently in flight; high values indicate throttling risk. (metric: Request Throughput; source: Azure OpenAI)
  - Active tokens currently being processed. (metric: Available Token Limit; source: Azure OpenAI)
- `deployment_name`: Azure OpenAI deployment name. Maps utilization to specific capacity allocation. (metric: Request Throughput; source: Azure OpenAI (Client))
  - Azure OpenAI deployment handling the request. (metric: Available Token Limit; source: Azure OpenAI (Client))

### Embedding Cost

Classification: —  
KPI Category: —  
Metrics: Embedding Cost  
Key Fields: DocumentsProcessedCount, embedding_model  
Source: Azure AI Search, Databricks  
Calculation: Embedding Cost = (DocumentProcessedCount* Avg token per chunk/1000)*Model Rate  
Field Description:

- `DocumentsProcessedCount`: Documents processed by AI Search indexer. (metric: Embedding Cost; source: Azure AI Search)
  - Documents indexed per period. Indexing cost driver; large reindexing events spike this. (metric: Azure AI Search Cost; source: Azure AI Search)
- `embedding_model`: Embedding model used for vector generation.

### Databricks Compute Cost

Classification: —  
KPI Category: —  
Metrics: Databricks Compute Cost  
Key Fields: cluster_type, cluster_id, dbu_consumed, cluster_hours  
Source: Databricks  
Calculation: ** There is API in databricks to capture the cost  
Field Description:

- `cluster_type`: Cluster configuration determining DBU pricing.
- `cluster_id`: Databricks cluster identifier; infra cost attribution.
- `dbu_consumed`: Databricks Units consumed. PRIMARY Databricks billing signal. Distinct from Azure OpenAI token cost.
- `cluster_hours`: Duration the Databricks cluster was running for this job. Cost = cluster_hours × DBU_rate × nodes.

### Azure AI Search Cost

Classification: —  
KPI Category: —  
Metrics: Azure AI Search Cost  
Key Fields: SearchQueriesPerSecond, DocumentsProcessedCount  
Source: Azure AI Search  
Calculation: { Search Unit = SearchQueriesPerSecond*DocumentsProcessedCount } * $ rate  
Field Description:

- `SearchQueriesPerSecond`: Queries per second. Search throughput capacity monitoring. (metric: Token Throughput; source: Azure AI Search)
  - Queries per second. (Query volume cost driver.) (metric: Azure AI Search Cost; source: Azure AI Search)
- `DocumentsProcessedCount`: Documents processed by AI Search indexer. (metric: Embedding Cost; source: Azure AI Search)
  - Documents indexed per period. Indexing cost driver; large reindexing events spike this. (metric: Azure AI Search Cost; source: Azure AI Search)

### Cost by BU and Project

Classification: —  
KPI Category: —  
Metrics: Cost by BU and Project  
Key Fields: business_unit, project_name  
Source: ALL Components  
Calculation: Aggregate { Avg(cost per request) for each BU/Project}  
Field Description:

- `business_unit`: Business unit owning this request. MANDATORY on every custom event for BU-level cost grouping. (metric: Cost by BU and Project; source: ALL Components)
  - Business unit owning this application. (metric: Business Ownership; source: ALL Components)
- `project_name`: Project or use-case name within the BU. Sub-BU cost attribution. (metric: Cost by BU and Project; source: ALL Components)
  - Project name within the BU. Sub-BU ownership attribution. (metric: Business Ownership; source: ALL Components)

### Audio Workload Cost

Classification: —  
KPI Category: —  
Metrics: Audio Workload Cost  
Key Fields: AudioSecondsTranscribed, AudioSecondsBatchTranscribed, AudioSecondsTranslated, OneDocumentCharactersTranslated, DocumentCharactersTranslated  
Source: Azure AI Translator  
Calculation: —  
Field Description:

- `AudioSecondsTranscribed`: Total audio seconds transcribed. Primary billing signal.
- `AudioSecondsBatchTranscribed`: Audio seconds transcribed in batch mode; batch-specific cost tracking.
- `AudioSecondsTranslated`: Audio seconds where speech translation was applied.
- `OneDocumentCharactersTranslated`: Characters in synchronous (single-doc) translation; separate billing metric from batch.
- `DocumentCharactersTranslated`: Characters in batch/async translation. Primary translation billing signal.

### 3rd-Party AI Tool Cost

Classification: —  
KPI Category: —  
Metrics: 3rd-Party AI Tool Cost  
Key Fields: cost_per_call, tokens_consumed  
Source: 3rd Party AI  
Calculation: 3rd-Party AI Tool Cost = Cost_per_call, Avg(3rd-Party AI Tool Cost)  
Field Description:

- `cost_per_call`: Cost of external tool usage per request.
- `tokens_consumed`: Token/credit count from external tool if reported. Cost tracking in external billing units.

### Prompt Size Impact

Classification: —  
KPI Category: —  
Metrics: Prompt Size Impact  
Key Fields: prompt_length  
Source: UI Layer, Backend API  
Calculation: —  
Field Description:

- `prompt_length`: Character or token count of the user's prompt. Log at both UI (character count) and API level (token count). (metric: Query & Prompt Length; source: UI Layer · Backend API)
  - Character count of user prompt. Correlate with cost_per_request. (metric: Prompt Size Impact; source: UI Layer · Backend API)

### Infrastructure Cost

Classification: —  
KPI Category: —  
Metrics: Infrastructure Cost  
Key Fields: Azure Cost Management  
Source: ALL Components  
Calculation: *Infrastructure cost could be extracted from Azure Cost management  
Field Description:

- `Azure Cost Management`: No exact description found in Generic-KPI-FieldsMapping.

### User Accountability

Classification: Audit & Governance  
KPI Category: Accountability & Tracebility  
Metrics: User Accountability  
Key Fields: user_id, correlation_id  
Source: ALL Components, UI Layer  
Calculation: —  
Field Description:

- `user_id`: SHA-256–hashed user identifier; segmentation without storing PII. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - SHA-256–hashed user identifier for segmentation without storing PII. (metric: User Satisfaction Rate; source: UI Layer)
  - Pseudonymised user ID (SHA-256 hash). Identifies user without storing PII. Required for compliance audit. (metric: User Accountability; source: UI Layer)
- `correlation_id`: End-to-end identifier propagated across all components.(Generated at ADF level.) (metric: Source Traceability; source: ALL Components)
  - End-to-end identifier linking all events across components. (metric: User Accountability; source: ALL Components)

### Access Traceability

Classification: —  
KPI Category: —  
Metrics: Access Traceability  
Key Fields: session_id, channel  
Source: UI Layer  
Calculation: —  
Field Description:

- `session_id`: User session identifier for session-level analytics. (metric: Request Throughput; source: UI Layer)
  - Unique user session identifier. Used to compute queries per session and session-level metrics. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - Session-level access grouping. All events in a session share session_id. (metric: Access Traceability; source: UI Layer)
- `channel`: web / teams / mobile / api; unexpected channel in prod = alert. (metric: Session & Query Volume (Session Length / Query per Session); source: UI Layer)
  - web / teams / mobile / api. Unexpected channel in prod = alert. (metric: Access Traceability; source: UI Layer)

### Approval Coverage

Classification: —  
KPI Category: —  
Metrics: Approval Coverage  
Key Fields: approval_status  
Source: Orchestration / Agent  
Calculation: Approval Coverage = agent action approval_status (in case of MITL)  
Field Description:

- `approval_status`: Approved / Pending / Rejected. Logged by orchestration layer before each high-stakes agent action.

### Tool Usage

Classification: —  
KPI Category: Tool Governance  
Metrics: Tool Usage  
Key Fields: tool_name, agent_version, agent_id  
Source: Orchestration / Agent  
Calculation: Tool Usage = List of the tools used by agent  
Field Description:

- `tool_name`: Name of the tool invoked. (metric: Tool Call Latency; source: Orchestration / Agent)
  - Name of each tool invoked by the agent. (metric: Tool Call Accuracy; source: Application code (from Azure OpenAI API response))
  - Name of each tool invoked by the agent. Group by tool_name to audit which capabilities are used. (metric: Tool Usage Compliance Rate; source: Orchestration / Agent)
- `agent_version`: Version tag of deployed agent; correlate evaluation score changes with deployments.
- `agent_id`: Unique agent identifier. Required for multi-agent routing audit.

### Model Governance

Classification: —  
KPI Category: Model Governance Coverage Rate  
Metrics: Model Governance  
Key Fields: model_id, source_run_id, model_type, model_status, model_uri, checkpoint_step, model_version (Registry), linked_metrics, linked_dataset, artifact_uri, post_training_evaluation_run_id  
Source: MLflow / Databricks ML  
Calculation: Model Governance = Model registry with model details  
Field Description:

- `model_id`: UUID auto-assigned by MLflow 3 at log_model(). New URI: models:/[model_id]. THE join key training → evaluation → serving.
- `source_run_id`: run_id of the training run that produced this model. Auto-set by MLflow.
- `model_type`: neural_network' / 'transformer' / 'agent' / 'classifier'. Routes safety evaluators.
- `model_status`: PENDING → READY / FAILED. Never promote PENDING. Set via mlflow.finalize_logged_model().
- `model_uri`: models:/[model_id] or models:/[name]/[version]. Always use models:/ prefix. NEVER runs:/ in production.
- `checkpoint_step`: Training epoch/step at checkpoint save. Required for mlflow.search_logged_models() ordering.
- `model_version (Registry)`: Integer version from MLflow Model Registry. Immutable after creation.
- `linked_metrics`: No exact description found in Generic-KPI-FieldsMapping.
- `linked_dataset`: Dataset reference with linked_metrics. Prevents cross-dataset metric contamination.
- `artifact_uri`: Root artifact URI. Access via mlflow.get_artifact_uri().
- `post_training_evaluation_run_id`: evaluation_run_id of the evaluation run that validated this model. Closes training → evaluation loop.

### Environment Compliance

Classification: —  
KPI Category: Environment Compliance  
Metrics: Environment Compliance  
Key Fields: environment, application_name  
Source: ALL Components  
Calculation: Environment Compliance = Application mapping with its environment  
Field Description:

- `environment`: prod / nonprod / staging. Log on every event.
- `application_name`: Name of the owning application. Primary governance grouping.

### Business Ownership

Classification: —  
KPI Category: Business Ownership Coverage  
Metrics: Business Ownership  
Key Fields: business_unit, project_name  
Source: ALL Components  
Calculation: For each application mapping with business_unit and project_name Business Ownership = Application mapping with business unit and project  
Field Description:

- `business_unit`: Business unit owning this request. MANDATORY on every custom event for BU-level cost grouping. (metric: Cost by BU and Project; source: ALL Components)
  - Business unit owning this application. (metric: Business Ownership; source: ALL Components)
- `project_name`: Project or use-case name within the BU. Sub-BU cost attribution. (metric: Cost by BU and Project; source: ALL Components)
  - Project name within the BU. Sub-BU ownership attribution. (metric: Business Ownership; source: ALL Components)

## Field-description join coverage

- Exact field references matched: 143
- Base-field matches after removing a descriptive suffix following `:`: 0
- Field-like references without an exact registry match: 2
Unmatched values:
- Azure Cost Management
- model_id — UUID auto-assigned by MLflow 3 at log_model(). New URI: models:/[model_id]. THE join key training → evaluation → serving. source_run_id — run_id of the training run that produced this model. Auto-set by MLflow. model_type — neural_network' / 'transformer' / 'agent' / 'classifier'. Routes safety evaluators. model_status — PENDING → READY / FAILED. Never promote PENDING. Set via mlflow.finalize_logged_model(). model_uri — models:/[model_id] or models:/[name]/[version]. Always use models:/ prefix. NEVER runs:/ in production. checkpoint_step — Training epoch/step at checkpoint save. Required for mlflow.search_logged_models() ordering. model_version (Registry) — Integer version from MLflow Model Registry. Immutable after creation. linked_metrics
