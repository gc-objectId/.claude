# OR-2983 — Show readable antiemetic class names in the ERAS antiemetics prompt

Status: Testing   Assignee: Ryan Ducharme

## Description

The ERAS antiemetics prompt puts the internal category constant into the text that clinicians see. Example: "all administered antiemetics are of class ANTIEMETIC_5HT3_ANTAGONIST". OR-158 agreed readable class names, but they were never implemented.

Acceptance criteria:

* Each antiemetic class has the label from OR-158: Steroid, Anticholinergic, Sympathomimetic, Antidopaminergic, 5HT3-Antagonist. The NK1 class from OR-2918 is NK1-Antagonist.
* The list of labels is the source of the list of antiemetic classes, so a class cannot be added without a label.
* The ERAS antiemetics prompt shows the label, not the constant (example: "are of class 5HT3-Antagonist").
* ERASAntiemeticsRuleTest checks the prompt text with the labels.

Depends on OR-2918, which adds ANTIEMETIC_NK1_ANTAGONIST.

## Comments (0)

(none)
