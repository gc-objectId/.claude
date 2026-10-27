# OR-3020 — a-preop-ptt picks the latest-created heparin infusion, not the latest stopped one

Status: Testing   Assignee: Ryan Ducharme

## Description

IInfusionMedicationAdministration.getLatestEventDateForType compares an InfusionEventType with event.getEventType(), which returns Optional<InfusionEventType>. The equals is always false, so the method always returns null. generateChronologicalComparatorWithEventType then orders only by createdDate.

Effect in OnHeparinWithoutPTTRule (a-preop-ptt): when two IV heparin infusions have a STOP in the two days before the case, the rule uses the stop of the most recently created record, not the latest stop. A latest stop inside the 6 hours before the case can then be missed (the rule abstains as "no longer on heparin"). A later stop can also be missed, which raises a PTT alert for a patient who stopped heparin more than 6 hours before. The alert can also name the wrong stop time.

The comparator tests pass only because their fixtures create the record with the later event later. SpotBugs reports this as EC_UNRELATED_TYPES (found by OR-2966).

## Comments (0)

(none)
