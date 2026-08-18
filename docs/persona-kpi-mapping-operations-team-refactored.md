# Operations Team Persona KPI Mapping

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
Calculation: tool_call_latency = tool_call_latency, AVG(tool_call_latency) , AVG(tool_call_latency) per tool  
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

### Activity Duration

Classification: —  
KPI Category: —  
Metrics: Activity Duration  
Key Fields: activityName, activityRunId, start, end, activity_type, processing_duration_ms  
Source: ADF  
Calculation: Activity Duration per request = processing_duration_ms, Avg(Activity Duration per request)  
Field Description:

- `activityName`: Name of the ADF activity (Copy, Notebook, Lookup). (metric: Activity Duration; source: ADF Activity)
  - Name of the activity that failed. (metric: Activity Failure Rate; source: ADF Activity)
- `activityRunId`: Unique identifier for the activity execution; join key for activity-level metrics
- `start`: Activity execution start timestamp.
- `end`: Activity execution end timestamp; duration = end − start.
- `activity_type`: Copy / Lookup / Notebook / Web; distinguishes failure types.
- `processing_duration_ms`: Activity execution duration; activity-level SLA. (metric: Activity Duration; source: ADF Activity)
  - Total indexing duration (metric: Indexing Latency; source: Databricks (Indexing))

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

### MLflow Span Latency

Classification: —  
KPI Category: —  
Metrics: MLflow Span Latency  
Key Fields: span_latency_ms  
Source: MLflow / Databricks ML  
Calculation: MLflow Span latency = span_latency_ms, Avg(MLflow Span latency)  
Field Description:

- `span_latency_ms`: MLflow auto-captured span execution time. Covers ALL span types: LLM, RETRIEVER, TOOL, CHAIN, AGENT.

### Job Latency

Classification: —  
KPI Category: —  
Metrics: Job Latency  
Key Fields: job_id, run_id, training_start_timestamp, training_end_timestamp  
Source: Databricks/ MLflow / Databricks ML  
Calculation: Job latency = (training_end_timestamp -training_start_timestamp)  
Field Description:

- `job_id`: Identifier for the Databricks job; groups related executions. (metric: Job Latency; source: Databricks)
  - Databricks job ID. Groups failure rates per recurring job. (metric: Job Failure Rate; source: Databricks)
- `run_id`: Job run execution ID; join key for run-level telemetry.
- `training_start_timestamp`: MLflow-logged training start timestamp.
- `training_end_timestamp`: MLflow-logged training end timestamp; used to compute training duration.

### Request Throughput

Classification: —  
KPI Category: —  
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

Classification: Relibility  
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

### Activity Failure Rate

Classification: —  
KPI Category: —  
Metrics: Activity Failure Rate  
Key Fields: status, activityName, error_code (activity), error_message (activity), retry_count  
Source: ADF Activities  
Calculation: Activity Failure Rate = Total ( Error_Code)/Total Request  
Field Description:

- `status`: Final pipeline state (Succeeded, Failed, Cancelled). (metric: Pipeline Failure Rate; source: ADF Pipeline)
  - Execution status of the ADF activity (Succeeded or Failed). (metric: Activity Failure Rate; source: ADF Activity)
- `activityName`: Name of the ADF activity (Copy, Notebook, Lookup). (metric: Activity Duration; source: ADF Activity)
  - Name of the activity that failed. (metric: Activity Failure Rate; source: ADF Activity)
- `error_code (activity)`: Structured error code for failed activities; pattern detection.
- `error_message (activity)`: Human-readable failure detail for engineers.
- `retry_count`: Number of retries attempted before success or failure.

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

### API Error Rate

Classification: —  
KPI Category: —  
Metrics: API Error Rate  
Key Fields: status_code, error_code (API), response_status, error_message (API)  
Source: UI Layer, Azure Open AI ( as client)  
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

### MLflow Span Error Rate

Classification: —  
KPI Category: —  
Metrics: MLflow Span Error Rate  
Key Fields: span_status, span_error_message  
Source: MLflow / Databricks ML  
Calculation: MLflow Span Error Rate = Count(span_status (Failure))/Count (All Training Runs) *100  
Field Description:

- `span_status`: OK / ERROR per span. A trace can partially fail while HTTP returns 200.
- `span_error_message`: Exception message on ERROR spans. Root cause detail.

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

### Dataset Freshness

Classification: Data Freshness  
KPI Category: —  
Metrics: Dataset Freshness  
Key Fields: dataset_version, dataset_version (MLflow)  
Source: ADF Pipeline · Databricks, ML Flow, Databricks ML  
Calculation: This Metrics should be captured in Data Integration Platform and should be capture in their dashboard.  
Field Description:

- `dataset_version`: Version identifier of the source dataset being processed. Links index state to source data version. (metric: Dataset Freshness; source: ADF Pipeline · Databricks)
  - Version of the AI Search index or dataset used for retrieval. (metric: Retrieval Quality; source: Application code (from index metadata))
  - Version string e.g. 'v2.1'. Silent upgrades = #1 cause of quality regression. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `dataset_version (MLflow)`: Version of training dataset; distinct context from indexing dataset_version.

### Training Reproducibility

Classification: Audit & Governance  
KPI Category: Training Reproducibility Rate  
Metrics: Training Reproducibility  
Key Fields: training_run_id, experiment_name, hyperparameters, experiment_id, artifact_location, params.seed, mlflow.user, dataset_name, dataset_version, dataset_digest, dataset_source_uri, dataset_context, parent_run_id, data_snapshot_id, feature_set_version, triggering_pipeline_run_id, feature_set_version, deployment_target  
Source: MLflow / Databricks ML  
Calculation: Training Reproducibility Rate = (Number of sucessful training_run_id/total training run)  
Field Description:

- `training_run_id`: Unique identifier for the ML training run. (metric: Training Duration; source: MLflow / Databricks ML)
  - Unique MLflow training run ID; anchor for all training-level lineage. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `experiment_name`: MLflow experiment grouping name; organises runs for comparison.
- `hyperparameters`: Training hyperparameter values; required for reproducing results.
- `experiment_id`: MLflow experiment ID. PRIMARY partition key.
- `artifact_location`: ADLS/S3 URI set at experiment creation. Immutable after creation.
- `params.seed`: Random seed for deterministic run reproduction.
- `mlflow.user`: User or service principal. Auto-set by MLflow.
- `dataset_name`: Logical dataset name. THE critical field for data lineage and reproducibility.
- `dataset_version`: Version identifier of the source dataset being processed. Links index state to source data version. (metric: Dataset Freshness; source: ADF Pipeline · Databricks)
  - Version of the AI Search index or dataset used for retrieval. (metric: Retrieval Quality; source: Application code (from index metadata))
  - Version string e.g. 'v2.1'. Silent upgrades = #1 cause of quality regression. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `dataset_digest`: MD5/SHA-256 auto-computed by MLflow data API. If digest differs, data changed regardless of version label.
- `dataset_source_uri`: ADLS/Delta/S3 URI of source data.
- `dataset_context`: training' / 'validation' / 'test'. Set via context= param in mlflow.log_input().
- `parent_run_id`: Parent run ID for nested runs or HPO sweeps.
- `data_snapshot_id`: ID of specific data snapshot; point-in-time reproducibility. (metric: Training Reproducibility; source: MLflow / Databricks ML)
  - ID of specific data snapshot used; point-in-time reproducibility. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `feature_set_version`: Version of feature engineering pipeline; detects feature drift.
- `triggering_pipeline_run_id`: ADF pipeline_run_id that triggered this training run. (metric: Training Reproducibility; source: MLflow / Databricks ML)
  - ADF pipeline_run_id that triggered this training run; links training to data prep pipeline. (metric: Training Reproducibility; source: MLflow / Databricks ML)
- `feature_set_version`: Version of feature engineering pipeline; detects feature drift.
- `deployment_target`: Where model was deployed after training.

### Audit Logging

Classification: —  
KPI Category: Operational Audit logging  
Metrics: Audit Logging  
Key Fields: triggered_by, schema_version, operation_name (indexing), operation_name (retrieval), mlflow.note.content, log_type, date & time, application_name  
Source: —  
Calculation: Audit logging availability for application = search(Application_name, Log_type)  
Field Description:

- `triggered_by`: Manual / Schedule / Event; unexpected manual trigger in prod = audit event. (metric: Pipeline Failure Rate; source: ADF Pipeline)
  - Manual / Schedule / Event. Official ADF Triggers schema field. Unexpected manual trigger in prod = audit event. (metric: Audit Logging; source: ADF Pipeline)
- `schema_version`: Fixed string e.g. "1.0". Version of the telemetry schema. Separates new structured events from legacy data in Splunk.
- `operation_name (indexing)`: Azure operation type: e.g. Indexers.Run, Indexes.Update.
- `operation_name (retrieval)`: Query operation type: Query.Search / Query.Suggest / Query.Lookup.
- `mlflow.note.content`: User-editable run description. Set via mlflow.set_tag(). Appears in MLflow UI Notes pane.
- `log_type`: Semantic event type: "ui_event" / "retrieval_event" / "inference_event" / "indexing_event" / "evaluation_event". Routes events to correct Splunk index.
- `date & time`: No exact description found in Generic-KPI-FieldsMapping.
- `application_name`: Name of the owning application. Primary governance grouping.

### Tool Usage Compliance Rate

Classification: —  
KPI Category: Tool Usage Rate  
Metrics: Tool Usage Compliance Rate  
Key Fields: tool_name, agent_version, agent_id  
Source: Orchestration / Agent  
Calculation: —  
Field Description:

- `tool_name`: Name of the tool invoked. (metric: Tool Call Latency; source: Orchestration / Agent)
  - Name of each tool invoked by the agent. (metric: Tool Call Accuracy; source: Application code (from Azure OpenAI API response))
  - Name of each tool invoked by the agent. Group by tool_name to audit which capabilities are used. (metric: Tool Usage Compliance Rate; source: Orchestration / Agent)
- `agent_version`: Version tag of deployed agent; correlate evaluation score changes with deployments.
- `agent_id`: Unique agent identifier. Required for multi-agent routing audit.

### Model Governance

Classification: —  
KPI Category: Model Usage Rate  
Metrics: Model Governance  
Key Fields: model_id, source_run_id, model_type, model_status, model_uri, checkpoint_step, model_version (Registry), linked_metrics, linked_dataset, artifact_uri, post_training_evaluation_run_id  
Source: MLflow / Databricks ML  
Calculation: —  
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
KPI Category: Environment Compliance Rate  
Metrics: Environment Compliance  
Key Fields: environment, application_name  
Source: ALL Components  
Calculation: —  
Field Description:

- `environment`: prod / nonprod / staging. Log on every event.
- `application_name`: Name of the owning application. Primary governance grouping.

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

## Field-description join coverage

- Exact field references matched: 135
- Base-field matches after removing a descriptive suffix following `:`: 0
- Field-like references without an exact registry match: 2

Unmatched values:

- The original source reports two unmatched values, but its entries contain concatenated field-description HTML rather than standalone field references.
