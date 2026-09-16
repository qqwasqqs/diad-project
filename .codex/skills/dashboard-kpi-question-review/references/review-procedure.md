# Dashboard KPI Question Review Procedure

## 1. Establish the Evidence

For each KPI section, identify:

- The displayed metric and its stated business meaning.
- Whether the metric is confirmed, proposed, or pending.
- The documented source fields, meanings, scales, relationships, and
  calculation.
- Contradictions or omissions in client-provided documentation.
- Confirmed project architecture and previously answered questions.
- The exact sections the user authorized for review or editing.

Prefer the target dashboard's calculation documents and persona mapping over
inference. Use UI code to confirm what is displayed, not to invent the metric's
business definition.

Keep a mental evidence ledger with four states: confirmed, proposed,
conflicting, and missing. Also note whether each fact is project-wide,
dashboard-specific, or KPI-specific.

## 2. Classify Every Question

Use these three dispositions.

### Valid client question

Keep a question client-facing when the answer requires client knowledge or
authority and affects one or more of the following:

- Business meaning or intended decision use.
- KPI applicability or eligible business population.
- Choice between business-facing metric variants, such as average versus P95.
- The meaning, allowed values, scale, threshold, or relationship of a
  client-provided source field when documentation is missing or contradictory.
- Source evidence needed for the KPI but omitted from client documentation.
- Coverage or denominator evidence needed to interpret the displayed result.
- User-visible business treatment when documentation has not established
  whether a KPI is applicable, unavailable, omitted, or otherwise presented.

Ask about the source field's documented meaning, not how the endpoint should
encode it.

### Internal Splunk-React issue

Remove a question from the client list and track it internally when it concerns:

- Endpoint paths, property names, object or array shape, transport data types,
  response units, timestamp format, or time zone.
- Response envelopes or the technical representation of pending, unavailable,
  unsupported, and no-data states.
- How Splunk correlates, filters, aggregates, deduplicates, or handles retries.
- Which processed values Splunk returns to React.
- How React formats or renders an already-defined value or state.

If an internal question depends on a client decision, record that dependency
instead of asking the client to design the endpoint.

### Invalid with no open internal question

Remove a question without adding it to the internal open-question list when:

- Current documentation or user-provided context already answers it.
- The answer follows necessarily from an established hierarchy, identifier,
  field presence, or eligible population.
- It duplicates or depends on a more foundational unresolved question.
- Its premise asks React to calculate or process data even though React is
  display-only.
- It asks the client to reconfirm an established Splunk responsibility.

Record an important settled point under **Established responsibilities — not
open questions** when doing so prevents it from being asked again.

## 3. Apply the Decision Tests

Before keeping a client question, verify all of these:

1. The answer is absent or contradictory in current documentation and
   confirmed context.
2. The uncertainty concerns business meaning, scope, source semantics, source
   evidence, or interpretation evidence.
3. The client has the knowledge or authority to answer it.
4. The answer would materially affect meaning, applicability, evidence, or
   permitted use.
5. It is not a calculation, processing, endpoint, or React implementation
   detail.
6. It is not already implied by an established fact.
7. It is foundational rather than a redundant derivative question.
8. It remains unanswered.

If any test fails, the question is not valid for the client.

## 4. Report Before Editing

When the user asks for an assessment, do not modify files. Report every
question using the user's requested labels. A useful compact format is:

| # | Question | Result | Short reason if invalid |
| --- | --- | --- | --- |
| 1 | Question text | Valid or Invalid | Brief ownership or logic reason |

State the number of valid and invalid questions. If the section contains no
genuine client question but its status still says confirmation is needed,
briefly identify the missing product-level question as a proposed follow-up.

## 5. Update Documents Only After Authorization

When the user approves the refactor:

1. Remove invalid questions only from the reviewed KPI sections.
2. Keep valid client questions in simple language.
3. If none remain, write `_No client questions remain for this KPI._`
4. Add unresolved internal issues to the dashboard's Splunk-React question
   tracker, grouped under the KPI section.
5. Separate the tracker into:
   - **Questions to resolve between Splunk and React**
   - **Dependencies on client confirmation**, when applicable
   - **Established responsibilities — not open questions**
6. Do not copy already answered, logically implied, or redundant questions into
   the open internal list.
7. Do not alter later KPI sections until the user reviews or authorizes them.

Follow existing repository naming and placement. For the Product Owner main
view, the current tracker is:

`docs/product-owner-dashboard/waiting-confirmation/splunk-questions/product-owner-dashboard-main-view-splunk-react-questions.md`

For another dashboard, first look for an existing convention. If none exists,
place a kebab-case `splunk-questions` directory beside that dashboard's
client-facing waiting-confirmation view and use a descriptive Markdown file
name.

## 6. Capture New Context Carefully

When the user supplies a confirmed answer:

- Remove the settled question from active client questions.
- Record the answer as established context when requested.
- Extract only reusable reasoning patterns; keep KPI-specific facts scoped to
  that KPI or dashboard.
- If a foundational answer resolves derivative questions, remove those
  derivative questions too.

Do not overwrite established project rules with an inference. If new user
context conflicts with existing documentation, surface the conflict and treat
the user's latest explicit direction as controlling for the requested work.

## 7. Examples

| Question | Classification | Why |
| --- | --- | --- |
| Should the main view use average latency or P95? | Client | This is a business-facing metric choice. |
| The client documents feedback as both `0/1` and a five-point score. Which scale is correct? | Client | The client's source-field definitions conflict. |
| What should the endpoint property be called? | Splunk-React | This is an internal contract detail. |
| Should React calculate the KPI from timestamps? | Invalid and settled | Splunk calculates; React displays. |
| Will Splunk remove retry duplicates? | Invalid and settled | Deduplication is already a Splunk responsibility. |
| Which status object should represent unavailable feedback? | Splunk-React | The technical state shape is internal. |
| Should an unsupported application contribute to a feedback percentage? | Invalid and implied | It has no feedback evidence and cannot contribute. |

## 8. Validate Scoped Changes

After editing:

1. Run `git diff --check` for every tracked file changed.
2. Check new files for trailing whitespace because untracked files may not
   appear in an ordinary Git diff.
3. Inspect the edited KPI sections and the first untouched section after them.
4. Confirm every retained client question is client-owned.
5. Confirm every open internal question is unresolved rather than merely
   invalid.
6. Confirm no unreviewed KPI section or unrelated user change was modified.
7. Report the files changed and the validation performed.
