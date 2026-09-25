---
name: rule-summary
description: Summarize an existing ORCI rule implementation from the codebase given a rule identifier, including a clinical overview, technical implementation review, and an ASCII decision tree of the rule's evaluation criteria.
allowed-tools: Read, Grep, Glob
---

Use this skill when the user provides a Rule Identifier and wants to understand what the implemented rule actually does.

Terminology: use the shared vocabulary in `GLOSSARY.md` at the root of the skills directory. Use canonical terms such as Rule, Rule Identifier, fire, abstain, Guidance Category, Lockout, Rejection, Citation, and Compliance.

## Goals

- Locate the real implementation for the requested Rule Identifier in the codebase.
- Explain the clinical guidance in plain language without losing the important edge cases.
- Explain the implementation in engineering terms with file-path evidence.
- Show the evaluation logic as an ASCII decision tree so a reader can follow how the rule fires vs abstains.

## When To Use

Use this skill for questions like:

- "Summarize `a-some-rule`"
- "How does rule `w-example` work?"
- "Show me the implementation details for this ORCI rule"
- "Why does this rule fire?"

Do not use this skill to design a new rule. For new rules, use `rule-spec`.

## Canonical Search Areas

Start in the backend rule engine and only expand outward as needed:

- `orci/src/main/java/com/guided/orci/engine/rule/`
- `orci/src/main/java/com/guided/orci/engine/`
- `orci/src/main/java/com/guided/orci/service/`
- `orci/src/main/java/com/guided/orci/events/`
- `orci/src/main/java/com/guided/orci/web/`
- `orci-models/src/main/java/com/guided/orci/models/`
- tests for the rule under `src/test`

Useful search patterns:

- Exact Rule Identifier string, for example `a-succinylcholine-malignant-hyperthermia`
- Class names derived from the rule topic
- Methods such as `getRuleIdentifier`, `evaluate`, `shouldFire`, `buildPrompt`, `getPrompt`, `getCitations`, `getLockout`, `isCompliant`
- Trigger base classes from `GLOSSARY.md` such as `MedicationSelectionRule`, `MedicationDoseRule`, `TimerBasedRule`, `ScheduledRule`, `EventBasedRule`, `AppLaunchRule`

## Workflow

1. Read the requested Rule Identifier carefully. If the identifier is missing or malformed, ask for it.
2. Grep the codebase for the exact Rule Identifier string first.
3. Read the implementing rule class and any immediate base class methods needed to understand evaluation flow.
4. Read supporting collaborators actually used by the rule:
   - helper services
   - repositories
   - data fetchers
   - prompt builders
   - citation providers
   - lockout or compliance logic
5. Read the tests for that rule if they exist. Tests often reveal the true edge cases faster than production code.
6. Reconstruct the rule's evaluation criteria:
   - what data it reads
   - what conditions make it fire
   - what conditions make it abstain
   - what prompt it shows
   - whether it locks out
   - whether it tracks compliance
7. Produce the final summary with file-path citations and an ASCII decision tree.

## Evidence Standard

Every implementation claim must be backed by a file path or code snippet from the current codebase session.

- If you infer behavior from multiple files, say it is an inference.
- If the code path is ambiguous, say so and explain what you could verify.
- If the Rule Identifier exists in tests but not production code, say that clearly.
- If you cannot find the rule, return the search paths and patterns you tried.

## Output Contract

Return the summary in this order.

### 1. Rule Summary

| Field | Value |
|---|---|
| Rule Identifier | `[rule-id]` |
| Rule Class | `[class name]` |
| Trigger | `[SELECTION / DOSE / CONTINUOUS / SCHEDULED / NOTIFICATION / LAUNCH / unknown]` |
| Guidance Category | `[category or unknown]` |
| Primary Files | `[path list]` |

### 2. Clinical Overview

One compact section covering:

- what clinical situation the rule is watching for
- when it warns or alerts
- what the clinician is being asked to do
- important abstain or suppression conditions

Write this for a product or clinical stakeholder, not just an engineer.

### 3. Evaluation Criteria

Provide an ASCII decision tree that reflects the implemented logic, for example:

```text
Start
 |
 +-- Required clinical data present?
 |    |
 |    +-- No -> Abstain
 |    |
 |    +-- Yes
 |         |
 |         +-- Inclusion criteria met?
 |         |    |
 |         |    +-- No -> Abstain
 |         |    |
 |         |    +-- Yes
 |         |         |
 |         |         +-- Any exclusion condition met?
 |         |              |
 |         |              +-- Yes -> Abstain
 |         |              |
 |         |              +-- No
 |         |                   |
 |         |                   +-- Lockout active?
 |         |                        |
 |         |                        +-- Yes -> Suppress
 |         |                        |
 |         |                        +-- No -> Fire
```

Make the tree specific to the actual rule. Include the concrete predicates, not placeholders.

### 4. Technical Review

Cover these points when they exist:

- entry point and base class
- key evaluation methods and call flow
- collaborators and data sources
- prompt construction
- citation handling
- lockout behavior
- compliance tracking
- notable edge cases from tests
- gaps, risks, or surprising implementation details

Prefer short paragraphs or a tight bullet list. Always include file paths.

### 5. Verified vs Inferred

Separate what was directly verified from what was inferred:

- `Verified:` facts directly visible in code or tests
- `Inferred:` conclusions drawn from combining multiple files

## Review Heuristics

Focus on the real behavioral questions:

- What exact condition flips the rule from abstain to fire?
- Does the rule key off medication selection, administration, time, event, or launch?
- What patient or operation data gates evaluation?
- What override or rejection options exist?
- Does lockout suppress repeated firing?
- Is there a difference between the stated clinical intent and the implemented code path?

## Anti-patterns

- Do not paraphrase the rule from its name alone. Read the code.
- Do not stop at the rule class if key behavior lives in helpers or the base class.
- Do not claim the prompt text without reading where it is assembled.
- Do not hand-wave with "roughly" or "seems to." Show the evidence.
- Do not produce a generic decision tree. It must match the actual implemented criteria.
- Do not silently ignore tests. If no tests exist, say that.
