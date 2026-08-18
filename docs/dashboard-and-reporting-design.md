# Dashboard and Reporting Design

**Document date:** 1 July 2026

**Source:** BA - Teva - AI Observability - Design document-01July-2026.docx

This file contains the dashboard section extracted from the main design. Return to [AI Observability Design](ai-observability-design.md).

## User Personas

The AI Observability dashboard is designed to support diverse operational requirements across the organization. For Teva, the key user personas identified include:

**Business Executives:** Focused on high-level strategic outcomes, platform adoption rates, total cost of ownership (TCO), base for Overall ROI calculation and overarching security or audit & compliance postures.

**Product Owners:** Focused on the user experience and business value. They need visibility into feature usage, user adoption metrics, workflow completion rates, and the impact of performance on customer satisfaction.

**Technical Teams (Engineering/Architecture):** Focused on application behavior, performance and efficiency. They require deep-dive metrics into application latency, throughput, error rates, system bottlenecks, AI/Model quality evaluations, and tracing across application flow & AI models.

**Operations Team:** Focused on platform stability and incident response. They monitor system reliability, uptime (SLAs), infrastructure resource utilization (CPU/Memory), system load, and real-time alerts for outages or security anomalies.

## Dashboard Definitions

To effectively serve each user, the dashboard definitions outline a structured set of AI Observability metrics tailored to each group’s specific goals—ranging from strategic performance visibility for business leaders to model health, reliability, and operational efficiency insights for product, technical, and operations teams.

### Business Executives Dashboard

| Classification   | KPI Category    | Metrics                                                     |
| ---------------- | --------------- | ----------------------------------------------------------- |
| Performance      | Latency         | End-to-End Latency                                          |
| Reliability      | Error Rate      | API Error Rate (Inference Errors)                           |
| Adoption         | User Engagement | Session & Query Volume (Session Length / Query per Session) |
| Adoption         | User Engagement | User Feedback (Thumbs Up/Down)                              |
| Cost             | Cost Evaluation | Cost per Request                                            |
| Cost             | Cost Evaluation | Cost by BU and Project                                      |
| Cost             | Cost Evaluation | Infrastructure Cost                                         |
| Safety and Risks | Content Safety  | Safety Evaluation Score                                     |
| Safety and Risks | Content Safety  | MLflow Safety Score                                         |
| Safety and Risks | Security        | PII Leakage (Agent Only)                                    |

### Product Owner Dashboard

| Classification     | KPI Category                   | Metrics                                                     |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| Performance        | Latency                        | End-to-End Latency                                          |
| Performance        | Latency                        | Tool Call Latency                                           |
| Performance        | Latency                        | Model Response Latency                                      |
| Performance        | Latency                        | Training Duration                                           |
| Performance        | Throughput                     | Request Throughput                                          |
| Performance        | Throughput                     | Token Throughput                                            |
| Reliability        | Error Rate                     | API Error Rate                                              |
| Reliability        | Error Rate                     | Training Failure Rate                                       |
| Reliability        | Error Rate                     | Transcription Failure Rate                                  |
| Reliability        | Error Rate                     | Translation Failure Rate                                    |
| Adoption           | User Engagement                | Session & Query Volume (Session Length / Query per Session) |
| Adoption           | User Engagement                | Query & Prompt Length                                       |
| Adoption           | User Engagement                | User Satisfaction Rate                                      |
| Quality            | AI Response Quality            | Groundedness and Hallucination                              |
| Quality            | AI Response Quality            | Response Coherence                                          |
| Quality            | AI Response Quality            | Relevance Quality                                           |
| Quality            | AI Response Quality            | Response Completeness                                       |
| Quality            | AI Response Quality            | Textual Similarity and F1                                   |
| Quality            | RAG Quality                    | Retrieval Quality                                           |
| Quality            | Agent Quality                  | Task Adherence Score                                        |
| Quality            | Agent Quality                  | Tool Call Accuracy                                          |
| Quality            | Agent Quality                  | Intent Resolution Score                                     |
| Quality            | ML Evaluation                  | MLflow Groundedness Score                                   |
| Quality            | ML Evaluation                  | MLflow Relevance Score                                      |
| Quality            | ML Evaluation                  | Training Accuracy Score                                     |
| Quality            | Training Quality               | Training F1 Score                                           |
| Quality            | Training Quality               | Training Loss Score                                         |
| Safety and Risks   | Content Safety                 | Safety Evaluators                                           |
| Safety and Risks   | Content Safety                 | MLflow Safety Score                                         |
| Safety and Risks   | Security                       | PII Leakage (Agent Only)                                    |
| Safety and Risks   | Security                       | User prompt injected attacks (UPIA)                         |
| Cost               | Cost Evaluation                | Cost per Request                                            |
| Cost               | Cost Evaluation                | Token Consumption                                           |
| Cost               | Cost Evaluation                | Capacity Utilization                                        |
| Cost               | Cost Evaluation                | Embedding Cost                                              |
| Cost               | Cost Evaluation                | Databricks Compute Cost                                     |
| Cost               | Cost Evaluation                | Azure AI Search Cost                                        |
| Cost               | Cost Evaluation                | Cost by BU and Project                                      |
| Cost               | Cost Evaluation                | Audio Workload Cost                                         |
| Cost               | Cost Evaluation                | 3rd-Party AI Tool Cost                                      |
| Cost               | Cost Evaluation                | Prompt Size Impact                                          |
| Cost               | Cost Evaluation                | Infrastructure Cost                                         |
| Audit & Governance | Accountability & Traceability  | User Accountability                                         |
| Audit & Governance | Accountability & Traceability  | Access Traceability                                         |
| Audit & Governance | Accountability & Traceability  | Approval Coverage                                           |
| Audit & Governance | Tool Governance                | Tool Usage                                                  |
| Audit & Governance | Model Governance Coverage Rate | Model Governance                                            |
| Audit & Governance | Environment Compliance         | Environment Compliance                                      |
| Audit & Governance | Business Ownership Coverage    | Business Ownership                                          |

### Technical Teams Dashboard

| Classification   | KPI Category        | Metrics                                           |
| ---------------- | ------------------- | ------------------------------------------------- |
| Performance      | Latency             | End-to-End Latency                                |
| Performance      | Latency             | Tool Call Latency                                 |
| Performance      | Latency             | Retrieval Latency                                 |
| Performance      | Latency             | Model Response Latency                            |
| Performance      | Latency             | Pipeline Duration<br>(Pipeline Execution latency) |
| Performance      | Latency             | Indexing/AI Services Latency                      |
| Performance      | Throughput          | Request Throughput                                |
| Performance      | Throughput          | Token Throughput                                  |
| Reliability      | Error Rate          | Pipeline Failure Rate                             |
| Reliability      | Error Rate          | Job Failure Rate                                  |
| Reliability      | Error Rate          | Inference Error Rate                              |
| Reliability      | Error Rate          | API Service Error Rate                            |
| Reliability      | Error Rate          | Training Failure Rate                             |
| Reliability      | Error Rate          | Indexing Failure Rate                             |
| Reliability      | Error Rate          | Transcription Failure Rate                        |
| Reliability      | Error Rate          | Translation Failure Rate                          |
| Quality          | Data Drift          | Data Integrity                                    |
| Quality          | Data Drift          | Processing Environment                            |
| Quality          | Data Freshness      | Data Freshness                                    |
| Quality          | Data Traceability   | Source Traceability                               |
| Quality          | Data Traceability   | Chunk level Traceability                          |
| Quality          | Data Traceability   | Input Traceability                                |
| Quality          | Data Traceability   | Output Lineage                                    |
| Quality          | AI Response Quality | Groundedness                                      |
| Quality          | AI Response Quality | Response Coherence                                |
| Quality          | AI Response Quality | F1 Score                                          |
| Quality          | AI Response Quality | Response Completeness                             |
| Quality          | AI Response Quality | Relevance Quality                                 |
| Quality          | AI Response Quality | Textual Similarity                                |
| Quality          | RAG Quality         | Retrieval Quality                                 |
| Quality          | Agent Quality       | Task Adherence Score                              |
| Quality          | Agent Quality       | Tool Call Accuracy                                |
| Quality          | Agent Quality       | Intent Resolution Score                           |
| Quality          | ML Evaluation       | MLflow Correctness Score                          |
| Quality          | ML Evaluation       | MLflow Groundedness Score                         |
| Quality          | ML Evaluation       | MLflow Document Recall                            |
| Quality          | ML Evaluation       | MLflow Relevance Score                            |
| Quality          | Training Quality    | Training Accuracy Score                           |
| Quality          | Training Quality    | Training F1 Score                                 |
| Safety and Risks | Content Safety      | Safety Evaluation Score                           |
| Safety and Risks | Content Safety      | MLflow Safety Score                               |
| Safety and Risks | Security            | PII Leakage (Agent Only)                          |
| Safety and Risks | Security            | User prompt injected attacks (UPIA)               |
| Cost             | Cost Evaluation     | Cost per Request                                  |
| Cost             | Consumption         | Token Usage Per Request                           |
| Cost             | Consumption         | Available Token Limit                             |
| Cost             | Cache Utilization   | Cache Hit Ratio                                   |

### Operations Team Dashboard

| Classification     | KPI Category                  | Metrics                                           |
| ------------------ | ----------------------------- | ------------------------------------------------- |
| Performance        | Latency                       | End-to-End Latency                                |
| Performance        | Latency                       | Tool Call Latency                                 |
| Performance        | Latency                       | Retrieval Latency                                 |
| Performance        | Latency                       | Model Response Latency                            |
| Performance        | Latency                       | Pipeline Duration<br>(Pipeline Execution latency) |
| Performance        | Latency                       | Activity Duration                                 |
| Performance        | Latency                       | Indexing/AI Services Latency                      |
| Performance        | Latency                       | MLflow Span Latency                               |
| Performance        | Latency                       | Job Latency                                       |
| Performance        | Latency                       | Request Throughput                                |
| Performance        | Latency                       | Token Throughput                                  |
| Reliability        | Error Rate                    | Pipeline Failure Rate                             |
| Reliability        | Error Rate                    | Activity Failure Rate                             |
| Reliability        | Error Rate                    | Job Failure Rate                                  |
| Reliability        | Error Rate                    | API Error Rate                                    |
| Reliability        | Error Rate                    | Training Failure Rate                             |
| Reliability        | Error Rate                    | MLflow Span Error Rate                            |
| Reliability        | Error Rate                    | Indexing Failure Rate                             |
| Reliability        | Error Rate                    | Transcription Failure Rate                        |
| Reliability        | Error Rate                    | Translation Failure Rate                          |
| Audit & Governance | Training Reproducibility Rate | Training Reproducibility                          |
| Audit & Governance | Operational Audit logging     | Audit Logging                                     |
| Audit & Governance | Tool Usage Rate               | Tool Usage Compliance Rate                        |
| Audit & Governance | Model Usage Rate              | Model Governance                                  |
| Audit & Governance | Environment Compliance Rate   | Environment Compliance                            |
| Safety and Risks   | Content Safety                | Safety Evaluation Score                           |
| Safety and Risks   | Content Safety                | MLflow Safety Score                               |
| Safety and Risks   | Security                      | PII Leakage (Agent Only)                          |
| Safety and Risks   | Security                      | User prompt injected attacks (UPIA)               |

## Documentation Status

### Confirmed Facts

- The source defines four dashboard personas and 135 persona-to-metric mappings: 10 for Business Executives, 49 for Product Owners, 47 for Technical Teams, and 29 for Operations.
- Every source row is represented in the tables above with its classification, KPI category, and metric.

### Likely Interpretations

- These tables define which metrics each persona should see; they do not prescribe a chart type, page layout, or aggregation behavior.

### Assumptions

- Obvious source spelling errors were normalized. Classification and KPI-category assignments were otherwise preserved exactly, including the Operations mappings of Request Throughput and Token Throughput under Latency.

### Missing Evidence

- The source does not define chart types, layouts, filters, drill-down behavior, refresh cadence, metric units, aggregation windows, thresholds, or ownership.
- The source does not provide the Splunk API/query contracts or loading, empty, stale-data, API-error, and `Data Pending` behavior needed for implementation.
