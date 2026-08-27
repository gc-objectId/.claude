package com.guided.orci.web;

import com.google.common.base.Stopwatch;
import com.guided.orci.context.UserContextHolder;
import com.guided.orci.dto.AppLaunchRequestDTO;
import com.guided.orci.dto.ApplicationLaunchContext;
import com.guided.orci.dto.LaunchBlockedDTO;
import com.guided.orci.dto.patient.PatientEMRInfo;
import com.guided.orci.exceptions.OperationNotFoundException;
import com.guided.orci.integration.PatientInfoResponse;
import com.guided.orci.models.observation.Observation;
import com.guided.orci.models.observation.ObservationType;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.service.*;
import com.guided.orci.engine.ScheduledRuleEngine;
import com.guided.orci.service.rules.diabetes.InsulinManagementService;
import com.guided.orci.service.sessions.UserActivityService;
import com.guided.orci.types.wrappers.AppLaunchKey;
import com.guided.orci.types.wrappers.TenantKey;
import com.guided.orci.units.Units;
import com.guided.orci.utils.Calculator;
import com.guided.orci.utils.LoggingContextUtils;
import com.guided.orci.utils.PediatricClassifier;
import com.guided.orci.web.websocket.AppLaunchWebsocketService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;

import javax.measure.quantity.Mass;
import java.time.LocalDate;
import java.util.Date;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api")
public class AppLaunchController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppLaunchController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private AppLaunchService appLaunchService;

    @Autowired
    private UserActivityService userActivityService;

    @Autowired
    private TenantService tenantService;

    @Autowired
    private PatientService patientService;

    @Autowired
    private InsulinManagementService insulinManagementService;

    @Autowired
    private ScheduledRuleEngine scheduledRuleEngine;

    private static final String APP_LAUNCH_KEY = "APP_LAUNCH_KEY";
    @Autowired
    private AppLaunchWebsocketService appLaunchWebsocketService;

    @Autowired
    private PractitionerService practitionerService;

    @Autowired
    private TracingService tracingService;

    @Autowired
    private OperationService operationService;

    @Value("${case-launcher.enabled:false}")
    private boolean useCaseLauncher;

    @Value("${application.hostname:}")
    private String applicationHostname;

    /**
     * Generate a key for the client to use to receive progress notifications during app launch
     * The client should use the returned value to subscribe to a websocket channel
     */
    @PostMapping("/generate-app-launch-key")
    public String generateAppLaunchKey(HttpSession httpSession) {
        var appLaunchKey = new AppLaunchKey();
        httpSession.setAttribute(APP_LAUNCH_KEY, appLaunchKey.toString());
        return appLaunchKey.toString();
    }

    /**
     * Setups up a new patient operation. Invokes integrations to pull all the relevant data at the start of the case
     */
    @PostMapping("/app-launch")
    public ApplicationLaunchContext initializeAppLaunch(HttpSession httpSession, @RequestBody AppLaunchRequestDTO request) {
        var stopwatch = Stopwatch.createStarted();
        String tenant = TenantContextHolder.hasTenant() ? TenantContextHolder.getTenant().toString() : "unknown";
        String outcome = "error";
        try {
            var appLaunchKey = AppLaunchKey.parse((String) httpSession.getAttribute(APP_LAUNCH_KEY));
            if (appLaunchKey.isEmpty()) {
                log.warn("Unable to parse appLaunchKey: {}", httpSession.getAttribute(APP_LAUNCH_KEY));
            }
            LoggingContextUtils.setContext(UserContextHolder.getClientUserId(), null, null);
            var user = userService.getCurrentUser();
            log.info("App launch request: {}", request);
            var patientId = request.getPatientId();
            var caseId = request.getCaseId();
            var encounterId = request.getEncounterId();

            if (useCaseLauncher) {
                // TODO implement this
                throw new UnsupportedOperationException("need to implement this");
            }
            var progressMonitor = new ProgressMonitor(progressEvent ->
                    appLaunchKey.ifPresent(key ->
                            appLaunchWebsocketService.sendProgressEvent(key, progressEvent.toString())));

            progressMonitor.registerTasks(ProgressEvent.values());

            var launchBlockedReason = checkTenantAppLaunchBlocked();
            if (launchBlockedReason != null) {
                log.warn("Launch blocked for tenant {} on host {}. Reason: {}", TenantContextHolder.hasTenant() ? TenantContextHolder.getTenant() : "unknown", applicationHostname, launchBlockedReason);
                outcome = "blocked";
                return ApplicationLaunchContext.blockAppLaunch(launchBlockedReason);
            }

            // create patient and operation
            var patientInfoResponse = patientService.getPatientInfo(patientId, caseId, progressMonitor);
            PatientEMRInfo patientInfo = Optional.ofNullable(patientInfoResponse).map(PatientInfoResponse::patientInfo)
                    .orElseThrow(() -> new RuntimeException(
                            "Unable to get patient info from patient: %s, case: %s".formatted(patientId, caseId)));

            launchBlockedReason = checkPediatricAppLaunchBlocked(patientInfo);
            if (launchBlockedReason != null && !Boolean.TRUE.equals(request.getForceLaunch())) {
                log.warn("Launch blocked. Reason: {}", launchBlockedReason);
                outcome = "blocked";
                return ApplicationLaunchContext.blockAppLaunch(launchBlockedReason);
            }

            var practitioner = practitionerService.findForUser(user).orElse(null);
            var operation = progressMonitor.wrap(ProgressEvent.PatientOperationSetup, () ->
                    appLaunchService.getOrCreatePatientAndOperation(user, patientId, caseId, encounterId, patientInfo, practitioner)
            );
            LoggingContextUtils.setContext(UserContextHolder.getClientUserId(),
                    operation.getPatient() != null ? operation.getPatient().getId() : null, operation.getId());

            // get/create a operation session
            var session = appLaunchService.getSession(user, operation);
            userActivityService.markCaseActivity(user, httpSession.getId(), patientId, caseId);
            insulinManagementService.handleCaseStart(patientId, caseId, Objects.requireNonNullElseGet(operation.getStartTime(), () -> new Date()));
            scheduledRuleEngine.handleCaseStart(patientId, caseId);

            // launch app context
            var result = progressMonitor.wrap(ProgressEvent.Finalize, () ->
                    appLaunchService.createAppLaunchContext(user, patientId, caseId, session, httpSession.getId(), patientInfoResponse.failures()));
            outcome = "success";
            return result;
        } finally {
            tracingService.getMeters().getAppLaunchTimer(tenant, outcome).record(stopwatch.elapsed(TimeUnit.NANOSECONDS), TimeUnit.NANOSECONDS);
        }
    }

    /**
     * Redirects to the standard app launch URL using the internal operation UUID (non-PHI).
     * Looks up the patient and case information from the operation, then redirects to /app-launch
     * with the standard query parameters.
     */
    @GetMapping("/launch-by-operation/{operationId}")
    public RedirectView launchByOperationId(
            @PathVariable UUID operationId) {
        var operation = operationService.getOperationWithPatient(operationId)
                .orElseThrow(() -> new OperationNotFoundException(operationId));

        var builder = UriComponentsBuilder.fromPath("/app-launch")
                .queryParam("patient_id", operation.getPatient().getPmrn())
                .queryParam("case_id", operation.getCaseId().value());

        if (operation.getEncounterId() != null && operation.getEncounterId().value() != null) {
            builder.queryParam("encounter_id", operation.getEncounterId().value());
        }
        if (TenantContextHolder.hasTenant()) {
            builder.queryParam("client_id", TenantContextHolder.getTenant().value());
        }

        return new RedirectView(builder.toUriString());
    }

    /**
     * Returns a LaunchBlockedDTO if the app launch should be blocked due to a tenant/domain mismatch
     * Return null otherwise
     */
    private LaunchBlockedDTO checkTenantAppLaunchBlocked() {
        if (!TenantContextHolder.hasTenant()) {
            return null;
        }

        TenantKey tenantKey = TenantContextHolder.getTenant();
        if (!tenantKey.isMgb()) {
            return null;
        }

        if (applicationHostname != null && applicationHostname.endsWith(".guidedclinical.com")) {
            // purposely vague message
            return new LaunchBlockedDTO("Launch Disabled", "Launch is disabled");
        }

        return null;
    }

    /**
     * Returns a LaunchBlockedDTO if the app launch should be blocked due to the patient being pediatric
     * Return null otherwise
     */
    private LaunchBlockedDTO checkPediatricAppLaunchBlocked(PatientEMRInfo patientInfo) {
        var weight = Optional.ofNullable(patientInfo.getWeight())
                .flatMap(valueUnit -> Units.getQuantity(valueUnit, Mass.class));

        var maybeGestationalAgeObs = patientInfo.getObservations().stream()
                .filter(obs -> ObservationType.GESTATIONAL_AGE_BIRTH.equals(obs.getType())).min(Observation.ORDER_BY_TIME_NEWEST_FIRST);
        var gestationalAge = maybeGestationalAgeObs.flatMap(Calculator::gestationalAgeObservationToDays);

        LocalDate now = LocalDate.now();

        var pediatricStatus = PediatricClassifier.getPediatricStatus(
                tenantService.getConfig(),
                patientInfo.getDob(),
                now,
                gestationalAge.map(ga -> Calculator.calculatePostmenstrualAge(now, patientInfo.getDob(), ga)).orElse(null),
                weight.orElse(null)
        );
        if (pediatricStatus.isAdult()) {
            return null;
        }

        String title = "Not for Pediatric Use";
        if (weight.isEmpty()) {
            return new LaunchBlockedDTO(title, "Patient is <" + tenantService.getPediatricAgeThreshold() + " years old with unknown weight. GuidedOR is not for use in pediatric cases.");
        }

        var weightQuantity = Units.getQuantity(tenantService.getPediatricWeightThresholdKg(), Units.KILOGRAM);
        String formattedWeight = Units.formatQuantity(weightQuantity, Units.Formats.PATIENT_WEIGHT_FORMAT);
        return new LaunchBlockedDTO(title, "Patient is <" + tenantService.getPediatricAgeThreshold() + " years old and <" + formattedWeight + ". GuidedOR is not for use in pediatric cases.");
    }

    private enum ProgressEvent implements ProgressMonitor.IProgressEvent {
        PatientOperationSetup("Setting up patient & operation"),
        Finalize("Finalizing");

        public final String name;

        ProgressEvent(String name) {
            this.name = name;
        }

        public String getName() {
            return name;
        }
    }
}
