# OR-2951 — Mayo RAS and ORU processors drop a message when two first messages for a patient race

Status: Testing   Assignee: Ryan Ducharme

## Description

MayoHL7RasMedAdminProcessor and MayoHL7OruBaseProcessor create an unknown patient with findByPmrn followed by patientRepository.save, with no serialization. Inbound messages run on the async executor across nodes, and a new patient's first messages routinely arrive together. Both threads see no row and both insert. The loser trips the patients_pmrn_key unique constraint, the exception leaves process(), the dispatcher logs it, and the administration or lab result that message carried is never stored. The row stays ACCEPTED.

MayoHL7SiuCaseSchedulingProcessor already uses HL7ProcessingContext.findOrCreatePatient, which takes the per-patient advisory lock, re-checks, and inserts only if still absent. RAS and ORU should use the same path. Both already inject HL7ProcessingContext.

Mayo prod, last 7 days: 4,236 new patients, of which about 900 arrived with 2 to 5 messages inside the lock window. That is the population exposed to the race.

Fix: route RAS and ORU patient creation through findOrCreatePatient and collapse the three identical skeleton builders into one.

## Comments (0)

(none)
