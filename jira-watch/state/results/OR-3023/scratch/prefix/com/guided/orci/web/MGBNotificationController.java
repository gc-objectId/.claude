package com.guided.orci.web;

import com.guided.integration.mgb.Event;
import com.guided.orci.models.integration.mgb.MGBEventNotification;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.service.PatientCacheService;
import com.guided.orci.service.PatientService;
import com.guided.orci.service.PractitionerService;
import com.guided.orci.service.TracingService;
import com.guided.orci.service.mgh.MGBNotificationService;
import com.guided.orci.types.wrappers.PatientId;
import com.guided.orci.types.wrappers.TenantKey;
import com.guided.orci.utils.mgb.NotificationConstants;
import com.guided.orci.utils.mgb.NotificationUtils;
import com.guided.orci.web.websocket.NotificationsWebsocketService;
import io.opentelemetry.context.Context;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.Unmarshaller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.util.Pair;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.StringReader;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executor;

@RestController

@ConditionalOnProperty(value = "mgb.notifications.enabled", havingValue = "true", matchIfMissing = false)
@RequestMapping("/api")
public class MGBNotificationController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MGBNotificationController.class);


    @Autowired
    private MGBNotificationService mgbNotificationService;


    @Qualifier("asyncTaskExecutor")
    @Autowired
    private Executor taskExecutor;

    @Autowired
    private TracingService tracingService;

    @Autowired
    private PatientService patientService;
    @Autowired
    private NotificationsWebsocketService notificationsWebsocketService;
    @Autowired
    private PatientCacheService patientCacheService;
    @Autowired
    private PractitionerService practitionerService;

    public static final List<String> IGNORED_LOCATIONS = List.of(
            "MGH DANVERS OR",
            "MGH WALTHAM OR"
    );

    /**
     * /v2/services/ReceiveOptimeNotification is legacy Periop endpoint
     *
     * @param body
     * @return
     * @throws IOException
     */
    @PostMapping({"/integration/mgh/event", "/integration/mgb/event", "/v2/services/ReceiveOptimeNotification"})
    public ResponseEntity<String> notify(@RequestBody String body) {
        log.info("Request body: {}", body);

        var notification = MGBEventNotification.builder().body(body).build();

        Optional<Event> event = Optional.empty();
        Optional<TenantKey> optionalTenantKey = Optional.empty();
        try {
            JAXBContext jc = JAXBContext.newInstance(Event.class);
            Unmarshaller jaxbUnmarshaller = jc.createUnmarshaller();
            event = Optional.of((Event) jaxbUnmarshaller.unmarshal(new StringReader(body)));
        } catch (Exception e) {
            log.error("Error parsing as Event XML event notification", e);
        }
        if (event.isPresent()) {
            var notificationEvent = event.get();
            notification.setDisplayName(determineDisplayName(notificationEvent));
            notification.setEventType(notificationEvent.getType());
            notification.setPrimaryEntityId(notificationEvent.getPrimaryEntity().getID());
            notification.setPrimaryEntityType(notificationEvent.getPrimaryEntity().getType());
            notification.setTimeGenerated(notificationEvent.getTimeGenerated());
            findEntityWithId(notificationEvent, "LOCATION_NAME").ifPresent(locationEntity ->
                    notification.setLocationName(locationEntity.getDisplayName())
            );
            var userId = notificationEvent.getUser().getID();
            optionalTenantKey = determineTenant(notificationEvent);

            optionalTenantKey.ifPresent(tenantKey -> {
                TenantContextHolder.withTenant(tenantKey, () -> {
                    var displayName = notificationEvent.getUser().getDisplayName();
                    var practitioner = practitionerService.findOrCreateByEpicUserIdAndName(userId, displayName);
                    if(practitioner != null) {
                        notification.setPractitioner(practitioner);
                        notification.setUser(practitioner.getUser());
                    }
                });
            });
        }

        if (optionalTenantKey.isEmpty()) {
            // TODO archive these somehow
            log.error("Unable to determine tenant for notification: {}", body);
            return ResponseEntity.ok().build();
        }

        var tenantKey = optionalTenantKey.get();

        TenantContextHolder.withTenant(tenantKey, () -> {
            this.mgbNotificationService.saveNotification(notification);
        });

        if (event.isEmpty()) {
            log.info("No event parsed");
            return ResponseEntity.ok().build();
        }
        if (IGNORED_LOCATIONS.contains(notification.getLocationName())) {
            log.debug("Notification comes from an ignored location, ignoring it. {}", notification.getLocationName());
            return ResponseEntity.ok().build();
        }

        Event finalEvent = event.get();

        Context currentTracingContext = Context.current();
        taskExecutor.execute(() -> {
            TenantContextHolder.withTenant(tenantKey, () -> {
                tracingService.withSpan("process event (async)", currentTracingContext, () -> {
                    tracingService.getMeters().getIncomingEventTimer(tenantKey.value(), notification.getEventType(), notification.getDisplayName()).record(() -> {
                        try {
                            // TODO handle this logic async to give up the thread?
                            var type = finalEvent.getType().toUpperCase();
                            Optional<PatientId> patientId = switch (type) {
                                case NotificationConstants.FLOWSHEET_ADD,
                                     NotificationConstants.FLOWSHEET_UPDATE,
                                     NotificationConstants.FLOWSHEET_DELETE ->
                                        mgbNotificationService.handleFlowsheet(finalEvent, notification);

                                case NotificationConstants.OR_TIMING_EVENT ->
                                        mgbNotificationService.handleTimingEvent(finalEvent, notification);
                                case NotificationConstants.MED_ADMIN_GIVEN,
                                     NotificationConstants.MED_ADMIN_NEW_BAG,
                                     NotificationConstants.MED_ADMIN_RATE_CHANGE,
                                     NotificationConstants.MED_ADMIN_RESTARTED,
                                     NotificationConstants.MED_ADMIN_STOPPED,
                                     NotificationConstants.MED_ADMIN_PAUSED,
                                     NotificationConstants.MED_ADMIN_CANCEL -> {
                                    try {
                                        yield mgbNotificationService.handleMedicationAdministrationEvent(finalEvent, notification).map(Pair::getFirst);
                                    } catch (ObjectOptimisticLockingFailureException e) {
                                        // if we get two back to back cancel notifications, one may complete before the other one finishes which causes this exception.
                                        // should be safe to ignore though because the net effect will be the same.
                                        // Alternative is to add @Version to med admins
                                        if (NotificationConstants.MED_ADMIN_CANCEL.equals(type)) {
                                            log.warn("Processing {} had a locking failure - ignoring with the expectation that another transaction processed this", finalEvent.getType());
                                            yield Optional.empty();
                                        } else {
                                            throw e;
                                        }
                                    }
                                }

                                case NotificationConstants.RESULT_UPDATED ->
                                        mgbNotificationService.handleResultUpdated(finalEvent, notification);
                                default -> {
                                    log.warn("Unable to handle notification: {}", finalEvent.getType());
                                    yield Optional.empty();
                                }
                            };

                            if (patientId.isPresent()) {
                                patientCacheService.clearCache(patientId.get());
                                var patient = patientService.getReferenceByPMRN(patientId.get());

                                patient.ifPresent(p -> {
                                    mgbNotificationService.setPatientForNotification(notification, p);
                                });
                                notificationsWebsocketService.sendNotification(patientId.get(), notification);
                            }
                        } catch (Exception e) {
                            log.warn("Unable to handle notification: {}", finalEvent.getType(), e);
                            notification.captureException(e);
                            this.mgbNotificationService.saveNotification(notification);
                        }
                    });
                });
            });
        });

        return ResponseEntity.ok().build();
    }

    private Optional<TenantKey> determineTenant(Event event) {
        var hospital = findEntityWithId(event, "HOSPITAL")
                .map(Event.Entity::getDisplayName).orElse(null);
        if ("MGH".equals(hospital)) {
            return Optional.of(TenantKey.MGH);
        }
        if ("ICARE".equals(hospital)) {
            return Optional.of(TenantKey.ICARE);
        }
        if ("DEMO".equals(hospital)) {
            return Optional.of(TenantKey.DEMO);
        }
        return Optional.empty();

    }

    private String determineDisplayName(Event event) {
        var type = NotificationUtils.getNotificationType(event);
        return switch (type) {
            case OR_EVENT -> findEntityWithId(event, "OR_EVENT_NAME")
                    .map(it -> it.getDisplayName())
                    .orElse("Unknown");
            case FLOWSHEET -> findEntityWithType(event, "FLO")
                    .map(it -> it.getDisplayName())
                    .orElse("Unknown");
            case MED_ADMIN -> findEntityWithId(event, "MED_NAME")
                    .map(it -> it.getDisplayName())
                    .orElse("Unknown");
            case LAB_RESULT -> findEntityWithId(event, "ORD_LAB_COMPONENT")
                    .map(it -> it.getDisplayName())
                    .orElse("Unknown");
            case null -> "Unknown";
        };

    }

    private Optional<Event.Entity> findEntityWithId(Event event, String id) {
        return event.getOtherEntities().getEntity().stream()
                .filter(it -> it.getID().equals(id))
                .findFirst();
    }

    private Optional<Event.Entity> findEntityWithType(Event event, String type) {
        return event.getOtherEntities().getEntity().stream()
                .filter(it -> it.getType().equals(type))
                .findFirst();
    }
}
