package com.guided.orci.service.mgh;

import com.guided.integration.mgb.Event;
import com.guided.orci.models.operation.EventCategory;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.utils.mgb.DateUtils;
import org.jetbrains.annotations.Nullable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MGHOperationEventService {
    public enum MghEventType {
        OUT_OF_ROOM("110"),
        ANESTHESIA_STOP("100"),
        IN_ROOM("60"),
        ANESTHESIA_START("70"),
        START_DATA_COLLECTION("1120000014"),
        EXTUBATION("1120000045"),
        STOP_DATA_COLLECTION("1120000015"),
        PROCEDURE_END("390"),
        INCISION_TIME("1080"),
        PROCEDURE_START("80"),
        INDUCTION_START("1120000008");

        public final String value;

        MghEventType(String value) {
            this.value = value;
        }

        public static Optional<MghEventType> parse(String eventType) {
            return Arrays.stream(MghEventType.values()).filter(it -> it.value.equals(eventType)).findFirst();
        }
    }

    public Map<MghEventType, List<EventCategory>> getMghEventTypeListMap() {
        return Map.ofEntries(
                Map.entry(MghEventType.OUT_OF_ROOM, List.of(
                        EventCategory.OUT_OF_ROOM,
                        EventCategory.CLOSE_APP)),

                Map.entry(MghEventType.ANESTHESIA_STOP, List.of(
                        EventCategory.CLOSE_APP)),

                Map.entry(MghEventType.IN_ROOM, List.of(
                        EventCategory.START_OPERATION_TRACKING,
                        EventCategory.START_MONITORING)),

                Map.entry(MghEventType.START_DATA_COLLECTION, List.of(
                        EventCategory.START_MONITORING,
                        EventCategory.START_OPERATION_TRACKING_FORCE_UPDATE)),

                Map.entry(MghEventType.ANESTHESIA_START, List.of(
                        EventCategory.START_MONITORING)),

                Map.entry(MghEventType.EXTUBATION, List.of(
                        EventCategory.NMB_REVERSAL,
                        EventCategory.CANCEL_ANTIBIOTIC_REDOSE_REMINDERS,
                        EventCategory.ERAS_OPERATION_END,
                        EventCategory.EXTUBATION_TIME)),

                Map.entry(MghEventType.INCISION_TIME, List.of(
                        EventCategory.PROCEDURE_START,
                        EventCategory.INCISION_TIME)),

                Map.entry(MghEventType.PROCEDURE_START, List.of(
                        EventCategory.PROCEDURE_START)),

                Map.entry(MghEventType.STOP_DATA_COLLECTION, List.of(
                        EventCategory.NMB_REVERSAL,
                        EventCategory.STOP_MONITORING,
                        EventCategory.ERAS_OPERATION_END)),

                Map.entry(MghEventType.PROCEDURE_END, List.of(
                        EventCategory.ERAS_OPERATION_END,
                        EventCategory.CANCEL_ANTIBIOTIC_REDOSE_REMINDERS,
                        EventCategory.PROCEDURE_END)),

                Map.entry(MghEventType.INDUCTION_START, List.of(
                        EventCategory.INDUCTION_START))
        );
    }

    public MGHOperationEvent convertTimingEventToOperationEvent(Event event) {
        CaseId caseId = getCaseId(event);
        var otherEntities = event.getOtherEntities();
        Date phsTimestamp = null;
        Date orNewInstant = null;
        Set<String> eventTypes = new HashSet<>();
        Set<EventCategory> eventCategories = new HashSet<>();

        if (otherEntities != null) {
            List<Event.Entity> entities = otherEntities.getEntity();
            for (Event.Entity entity : entities) {
                if ("OR_EVENT_ID".equals(entity.getID())) {
                    eventTypes.add(entity.getDisplayName());
                }
                if ("PHS_TIME_STAMP".equals(entity.getID())) {
                    phsTimestamp = DateUtils.parsePHSTimestamp(entity.getDisplayName());
                }
                if ("OR_NEW_INSTANT".equals(entity.getID())) {
                    orNewInstant = DateUtils.parseOrNewInstant(entity.getDisplayName());
                }
            }
        }


        Date date = Objects.requireNonNullElse(orNewInstant, phsTimestamp);

        var mghEventTypeListMap = getMghEventTypeListMap();
        for (String eventType : eventTypes) {
            Optional<MghEventType> key = MghEventType.parse(eventType);
            key.ifPresent(mghEventType -> eventCategories.addAll(mghEventTypeListMap.getOrDefault(mghEventType, List.of())));
        }

        return MGHOperationEvent.builder()
                .caseId(caseId)
                .eventCategories(eventCategories)
                .eventDate(date)
                .build();
    }

    private static @Nullable CaseId getCaseId(Event event) {
        if ("ORL".equals(event.getPrimaryEntity().getType())) {
            String internalId = event.getPrimaryEntity().getID();
            return new CaseId(internalId);
        }
        return null;
    }
}
