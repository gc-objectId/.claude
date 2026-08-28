# OR-2795 — Read every Observation value type after the Epic August 2026 lab value change

Status: Testing   Assignee: Ryan Ducharme

## Description

Epic notification Q-8360810 changes which element the Observation (Labs) FHIR API uses for lab values, in the August 2026 version and later.

Numeric values typed into free-text or multi-line text lab fields were always returned as valueString. They now come back as valueQuantity, valueRatio, or valueRange, based on the format of the value. Range values that carry a comparator prefix (for example ">1.0-5.0") move the other way: they become valueString instead of valueRange, so the prefix is no longer dropped. This applies to the Read and $lastN interactions on Observation (Labs), in STU3 and R4.

Mayo and MGB are both Epic, and each organization upgrades on its own schedule. Both the old and the new elements must be read at the same time.

Where we are exposed:

* FhirUtils.getValueAndUnit (client-integration-api/src/main/java/com/guided/orci/integration/fhir/FhirUtils.java:86) reads Quantity, StringType, and CodeableConcept. A Ratio or a Range gives a null value. MayoGetLatestObservationsR4Command and MayoGetLaboratoryValuesR4Command both use this method.
* The StringType branch splits a leading number off the text ("105 mg/dL"). A comparator range (">1.0-5.0") has no leading number, so it stays whole with no unit, and any consumer that parses the value as a number fails.
* MGB filters accept only valueQuantity (MGBGetLatestObservationsR4Command.java:81-83, MGBGetLatestObservationR4Command.java:51). A value returned as a Ratio or a Range is dropped with a "has no value" warning.
* MGBGetLatestObservationR4Command.java:82-83 and MGBGetPediatricObservationsR4Command.java:64-65 call getValueQuantity() with no type check, which throws when the value is a different type.

Acceptance criteria:

* One shared extraction reads valueQuantity, valueString, valueRatio, and valueRange, and keeps the CodeableConcept behavior we have today.
* No call site reads getValueQuantity() without first checking the value type.
* A comparator string (">1.0-5.0") keeps its prefix, is stored whole, and never becomes a number downstream.
* A Ratio or a Range value reaches the Observation record with a value and a unit, or is refused for a stated reason instead of a "has no value" warning.
* Tests cover each value type for the Mayo and the MGB observation commands.

----

h3. Epic notification, full text

You are receiving this email because your organization has an active app affected by a non-backwards compatible change as described below. We are reaching out to proactively notify you of this change, which we are also communicating to customers.

*Change to Value Element Returned by the Observation (Labs) FHIR API*

Notification ID: Q-8360810

Versions affected: August 2026+

This change will be introduced in the August 2026 version of Epic. It applies to apps that meet any of the following conditions:

* Your app reads the Observation (Labs) resource using the Read or $lastN interaction, in either STU3 or R4.
* Your app parses some but not all of the various value items (valueString, valueQuantity, etc.)
* Your app parses the valueRange element for lab values that include a comparator (for example, ">1.0-5.0").

*Background*

The Observation (Labs) FHIR resource represents lab values using different elements depending on the value's data type: numeric values are typically returned as valueQuantity, and text values as valueString. Some lab result fields can be configured to accept free-text or multi-line text entry, even when the values entered into them are usually numeric.

*What’s Changed*

Previously, numeric values recorded in these free-text or multi-line text fields were always returned using the valueString element, regardless of whether the value was numeric. Going forward, these values will be returned using valueQuantity, valueRatio, or valueRange, depending on the format of the value.

Separately, range values that include a comparator prefix (for example, ">1.0-5.0") will now be returned as valueString instead of valueRange, so the prefix is no longer dropped.

Observation.Read Labs (STU3)

Observation.Read Labs (R4)

This change ensures numeric lab values are represented using the correct FHIR data type and that information such as units and comparators isn't lost or misrepresented.

*Mitigating impact*

Your use of the Observation (Labs) API should account for numeric values being present in valueQuantity, valueRatio, or valueRange in addition to valueString, as Epic organizations upgrade through the August 2026 version on varying timelines. We recommend checking all relevant value elements rather than assuming a single element type for a given field.

## Comments (0)

(none)
