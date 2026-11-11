package com.guided.orci.integration.mayo;

import com.guided.orci.models.operation.EventCategory;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MayoOperationEventService {

    public enum MayoEventType {

        IN_FACILITY("In Facility"),
        PATIENT_CALLED("Patient Called", "Pt Called"),
        IN_PREPROCEDURE("In Preprocedure", "In Pre-Proc"),
        NURSE_START("Nurse Start", "RN Start"),
        NURSE_COMPLETE("Nurse Complete", "RN Complete"),
        PREPROCEDURE_COMPLETE("Preprocedure Complete", "Pre-Proc Cmp"),
        INDUCTION("Induction"),
        ANESTHESIA_START("Anesthesia Start", "Anes Start"),
        IN_ROOM("In Room"),
        PROCEDURE_START("Procedure Start", "Proc Start"),
        PROCEDURE_FINISH("Procedure Finish", "Proc Finish"),
        OUT_OF_ROOM("Out of Room", "Out Room"),
        CLEANUP_COMPLETE("Cleanup Complete", "Cln up Cmp"),
        IN_RECOVERY("In Recovery", "In Recov"),
        ANESTHESIA_STOP("Anesthesia Stop", "Anes Stop"),
        OUT_OF_RECOVERY("Out of Recovery", "Out Recov"),
        IN_PHASE_II("In Phase II", "In Ph II"),
        PHASE_II_CARE_COMPLETE("Phase II Care Complete", "Ph II Cmp"),
        OUT_OF_PHASE_II("Out of Phase II", "Out PhII"),
        PROCEDURE_START_ANESTHESIA_DOCUMENTED("Procedure Start (Anesthesia Documented)", "AN Proc St"),
        PROCEDURE_FINISH_ANESTHESIA_DOCUMENTED("Procedure Finish (Anesthesia Documented)", "AN Proc Fin");

        public final String name;
        private final List<String> aliases;

        MayoEventType(String name, String... epicAliases) {
            this.name = name;
            this.aliases = List.of(epicAliases);
        }

        public static Optional<MayoEventType> findByName(String name) {
            return Arrays.stream(MayoEventType.values())
                    .filter(it -> it.name.equals(name) || it.aliases.contains(name))
                    .findFirst();
        }
    }

    private static final Map<MayoEventType, List<EventCategory>> EVENT_TYPE_MAP = Map.ofEntries(
                Map.entry(MayoEventType.IN_ROOM, List.of(
                        EventCategory.START_OPERATION_TRACKING,
                        EventCategory.START_MONITORING)),

                Map.entry(MayoEventType.ANESTHESIA_START, List.of(
                        EventCategory.START_MONITORING)),

                Map.entry(MayoEventType.PROCEDURE_START, List.of(
                        EventCategory.PROCEDURE_START,
                        EventCategory.INCISION_TIME)),

                Map.entry(MayoEventType.PROCEDURE_START_ANESTHESIA_DOCUMENTED, List.of(
                        EventCategory.PROCEDURE_START,
                        EventCategory.INCISION_TIME)),

                Map.entry(MayoEventType.INDUCTION, List.of(
                        EventCategory.INDUCTION_START)),

                Map.entry(MayoEventType.ANESTHESIA_STOP, List.of(
                        EventCategory.NMB_REVERSAL,
                        EventCategory.CLOSE_APP)),

                Map.entry(MayoEventType.OUT_OF_ROOM, List.of(
                        EventCategory.OUT_OF_ROOM,
                        EventCategory.CLOSE_APP)),

                Map.entry(MayoEventType.PROCEDURE_FINISH, List.of(
                        EventCategory.PROCEDURE_END,
                        EventCategory.STOP_MONITORING,
                        EventCategory.ERAS_OPERATION_END,
                        EventCategory.CANCEL_ANTIBIOTIC_REDOSE_REMINDERS)),

                Map.entry(MayoEventType.PROCEDURE_FINISH_ANESTHESIA_DOCUMENTED, List.of(
                        EventCategory.PROCEDURE_END,
                        EventCategory.STOP_MONITORING,
                        EventCategory.ERAS_OPERATION_END,
                        EventCategory.CANCEL_ANTIBIOTIC_REDOSE_REMINDERS))
        );

    public Map<MayoEventType, List<EventCategory>> getMayoEventTypeListMap() {
        return EVENT_TYPE_MAP;
    }
}
