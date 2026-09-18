---
name: rule-spec
description: Refine a rule description into a structured Jira ticket spec for implementing a new ORCI Rule. Prompts for clarity on inclusion/exclusion criteria, citations, prompt text, rule type, and all attributes necessary for implementation.
allowed-tools: Read, Grep, Glob, AskUserQuestion
---

Use this skill when the user wants to spec out a new clinical rule for the ORCI rule engine.

When you need missing inputs, prefer the host agent's structured question mechanism if it exists. Otherwise ask concise direct questions with explicit options where the domain constrains the answer.

## Goals

- Turn a rough rule idea into a complete, unambiguous implementation spec.
- Ensure every attribute needed for a Rule implementation is captured.
- Output a consistent Jira ticket template that any developer can pick up.

## Workflow

1. **Read the user's initial description.**
2. **Identify gaps** by checking the description against the attribute checklist below.
3. **Ask the user** targeted questions for any missing or ambiguous attributes. Group related questions together (don't ask one at a time). Prefer giving options over open-ended questions where the codebase constrains the answer.
4. **Once all attributes are clear**, generate the Jira ticket using the output template.

## Attribute Checklist

These are the attributes you need to nail down. If the user's description doesn't cover one, ask.

### Rule Identity
- **Rule ID**: Short kebab-case identifier (e.g., `a-succinylcholine-malignant-hyperthermia`). Prefix: `a-` for alerts, `w-` for warnings, `i-` for info.
- **Rule Name**: Human-readable name.
- **Guidance Category**: One of: `DELAYED_MISSED_OR_WRONG_ANTIBIOTIC`, `VITAL_SIGNS`, `WRONG_DOSE`, `WRONG_MED`, `NMB`, `ALLERGY_AND_INTERACTIONS`, `MONITORING`, `ERAS`, `UNCATEGORIZED`.

### Rule Type & Trigger
- **Rule Type**: `ALERT` (action required), `WARNING` (informational warning), `INFO` (information only).
- **Rule Trigger / Base Class**: Which phase does this rule fire in?
  - `SELECTION` → `MedicationSelectionRule` (context: `MedicationSelectionContext`) - fires when a medication is selected
  - `DOSE` → `MedicationDoseRule` (context: `MedicationDosingContext`) - fires when a dose is being administered/saved
  - `CONTINUOUS` → `TimerBasedRule` (context: `TimerContext`) - fires on a polling interval for continuous monitoring
  - `SCHEDULED` → `ScheduledRule` (context: `TimerContext`) - fires at a scheduled time (Quartz job)
  - `NOTIFICATION` → `EventBasedRule` (context: `EventContext`) - fires on a clinical event
  - `LAUNCH` → `AppLaunchRule` (context: `PatientContext`) - fires on case launch

### Evaluation Logic
- **Inclusion criteria**: When should this rule fire? (patient conditions, medication categories, procedure types, vital sign thresholds, lab values, etc.)
- **Exclusion criteria**: When should this rule abstain? (e.g., medication already marked tolerated, specific patient populations excluded, certain procedure types)
- **Clinical data needed**: What patient/clinical information does the rule need to make its decision? (e.g., allergy list, vital signs, lab results, medication history, patient conditions/diagnoses, procedure type, weight/age)

### For Timer/Event-Specific Rules
- **Event categories** (event rules): Which `EventCategory` values trigger this? (e.g., `PROCEDURE_START`, `HYPOGLYCEMIA`, `INSULIN_INFUSION_STARTED`)
- **Polling/timing config** (timer rules): Threshold values, observation windows, recovery durations.
- **Lockout behavior**: Should the rule lock out after firing to prevent alert fatigue? Duration?

### Prompt & UI
- **Prompt title**: The alert/warning title shown to the clinician. Can include `${PLACEHOLDER}` tokens from the details map.
- **Prompt description**: Body text of the prompt. Can include `${PLACEHOLDER}` tokens.
- **Accept text**: Button text for accepting the guidance (e.g., "Acknowledged", "Remove Medication").
- **Reject text**: Button text for dismissing (e.g., "Override", "Continue Anyway").
- **Rejection reasons**: What reasons can the clinician give for overriding? (free text, or specific `RejectionReason` codes)
- **Allow suppression?**: Can the clinician suppress future firings of this rule for this case?
- **Allow allergy suppression / mark tolerated?**: (allergy rules only)

### Citations
- **Always-cited references**: Clinical references that always appear when this rule fires.
- **Conditional citations**: References that appear only under certain evaluation outcomes.
- **Citation source**: Journal, guideline, or institutional reference with year/edition.

### Compliance (if applicable)
- **Compliance tracking**: Should adherence to this rule be tracked? If so, what does compliance look like? (e.g., clinician administered the recommended dose, clinician gave the antibiotic before incision)

## Output Template

Format the final spec as a Jira ticket in exactly this structure:

```
## Rule: [Rule Name]

**Rule ID:** `[rule-id]`
**Type:** [ALERT | WARNING | INFO]
**Trigger:** [SELECTION | DOSE | CONTINUOUS | SCHEDULED | NOTIFICATION | LAUNCH]
**Base Class:** [MedicationSelectionRule | MedicationDoseRule | TimerBasedRule | ScheduledRule | EventBasedRule | AppLaunchRule]
**Guidance Category:** [category]

---

### Description

[1-2 sentence plain-English summary of what this rule does and why it exists.]

---

### Evaluation Logic

**Fires when:**
- [inclusion criterion 1]
- [inclusion criterion 2]

**Abstains when:**
- [exclusion criterion 1]
- [exclusion criterion 2]

**Clinical data needed:**
- [e.g., patient allergy list]
- [e.g., vital signs from last N minutes]

[If event/timer rule:]
**Event categories:** [list]
**Lockout:** [duration or "none"]

---

### Prompt

| Field | Value |
|---|---|
| Title | [title with ${PLACEHOLDERS}] |
| Description | [description with ${PLACEHOLDERS}] |
| Accept text | [text] |
| Reject text | [text] |
| Rejection reasons | [list] |
| Allow suppression | [yes/no] |

---

### Citations

| Citation | Condition |
|---|---|
| [reference] | Always / [conditional description] |

---

### Acceptance Criteria

- [ ] Rule fires when [inclusion criteria summary]
- [ ] Rule abstains when [exclusion criteria summary]
- [ ] Prompt displays correct title, description, and buttons
- [ ] Citations render correctly
- [ ] [Any additional specific criteria]
- [ ] Unit tests cover fire, abstain, and edge cases
```

## Guidelines

- If the user gives a vague description like "warn when X happens", ask what trigger phase it belongs to (is it at medication selection? on a timer? on an event?).
- If the user doesn't mention citations, ask if there's a clinical reference. Many rules have them.
- If the user says "alert" vs "warning", clarify: alerts require user action (accept/reject), warnings are informational.
- Keep questions practical. Don't ask about implementation details like class names or package structure; those follow from the rule type.
- For prompt text, suggest reasonable defaults based on similar existing rules if the user isn't sure.
- Look at similar existing rules (use Grep/Read) to suggest patterns when the user's description resembles something already implemented.
