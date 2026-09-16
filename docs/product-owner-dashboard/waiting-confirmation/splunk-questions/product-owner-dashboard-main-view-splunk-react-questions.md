# Product Owner Dashboard Main View — Splunk and React Questions

## Purpose

This document tracks questions and contract issues that belong to the Splunk
and React teams rather than the client. It currently covers the four main
view KPI sections reviewed so far:

1. Session & Query Volume
2. User Satisfaction Rate
3. End-to-End Latency
4. Workflow Completion

Splunk performs the calculations and returns processed KPI data. React displays
that data without calculating, aggregating, filtering, correlating, or
deduplicating it.

## 1. Session & Query Volume

### Questions to resolve between Splunk and React

- What response property names will contain query count, session count,
  queries per session, and average session duration?
- What documented value type and unit will each returned KPI value use?
- If timestamps are included for display or context, what format and time zone
  will they use?
- What will the complete response shape be when the KPI status is
  `DATA_PENDING`?

### Established responsibilities — not open questions

- Splunk returns the four KPI values already processed and ready to display.
- Splunk calculates session duration; React does not calculate it from
  timestamps.
- Splunk handles retries, duplicate records, and request-status filtering.
- One `request_id` represents one query.
- Every session belongs to its parent conversation according to the confirmed
  conversation and session hierarchy.
- `DATA_PENDING` is the established status when the required KPI data is not
  available.

## 2. User Satisfaction Rate

### Questions to resolve between Splunk and React

- How will the response distinguish an application that does not support
  feedback from an application that supports feedback but received no
  submissions?
- Will an unsupported application be omitted or returned with an unavailable
  or not-applicable value?
- What response status and value shape will be used when satisfaction data is
  unavailable or pending?
- After the client confirms the valid `user_feedback_score` values, how will
  Splunk represent neutral, invalid, and missing feedback in the processed
  response, if React needs to distinguish them?
- If the client confirms that coverage counts are required, what response
  properties and value types will contain those counts?

### Dependencies on client confirmation

The teams cannot finalize every User Satisfaction Rate response detail until
the client confirms:

- The valid values, type, scale, and positive threshold for
  `user_feedback_score`.
- Whether the source feedback records provide a feedback key, timestamp, and
  answer or request identifier.
- Whether coverage counts must accompany the satisfaction percentage.

### Established responsibilities — not open questions

- Splunk calculates the satisfaction percentage and returns it ready to
  display.
- React does not classify, filter, or aggregate feedback records.
- Only applications with usable feedback data contribute to the percentage.
- Applications without feedback support must not be represented as having
  zero satisfaction.
- A missing or valueless `user_feedback_score` is currently interpreted as
  meaning that feedback is not enabled for the application.
- The technical representation of feedback availability is an internal
  Splunk–React contract decision; it does not require a client-defined status.

## 3. End-to-End Latency

### Questions to resolve between Splunk and React

- What response property name will contain the processed P95 latency value?
- Although the source field `response_latency_ms` is measured in milliseconds,
  will the processed display value be returned in milliseconds or seconds?
- What will the complete response shape be when no valid latency value is
  available and the KPI status is `DATA_PENDING`?

### Established responsibilities — not open questions

- Splunk calculates and returns the P95 latency value ready to display.
- React does not calculate latency from `timestamp_start` and `timestamp_end`.
- Splunk combines or removes retries and duplicate request records before
  calculating the result.
- `response_latency_ms` is the documented source measurement and uses
  milliseconds.
- `DATA_PENDING` is the established status when a valid latency KPI value is
  unavailable.

## 4. Workflow Completion

### Questions to resolve between Splunk and React

_None at this stage._

Workflow Completion is an entirely proposed KPI with no supporting definition
in the current client documentation. Although `correlation_id` connects related
events within the same observed journey or session, that relationship does not
define the workflow, a successful completion, or the eligible population.

Do not begin a Splunk–React data contract for this KPI until the client first
confirms that the general Workflow Completion proposal should be pursued. If
the proposal is accepted, its business definition must be established before
implementation questions are opened.
