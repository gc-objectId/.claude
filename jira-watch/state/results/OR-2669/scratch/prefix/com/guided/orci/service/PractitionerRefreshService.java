package com.guided.orci.service;

import com.guided.orci.dto.PractitionerDTO;
import com.guided.orci.integration.base.CommandFactory;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.PractitionerRepository;
import com.guided.orci.types.wrappers.TenantKey;
import io.sentry.Sentry;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;
import java.util.function.Supplier;

@Service
public class PractitionerRefreshService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PractitionerRefreshService.class);

    private final PractitionerRepository practitionerRepository;
    private final CommandFactoryProvider commandFactoryProvider;
    private final TransactionTemplate transactionTemplate;

    public PractitionerRefreshService(
            PractitionerRepository practitionerRepository,
            CommandFactoryProvider commandFactoryProvider,
            TransactionTemplate transactionTemplate) {
        this.practitionerRepository = practitionerRepository;
        this.commandFactoryProvider = commandFactoryProvider;
        this.transactionTemplate = transactionTemplate;
    }

    /** What a refresh attempt did, so callers can tell an Epic outage from an id Epic simply has no record for. */
    public enum RefreshOutcome {
        /** Fresh data was fetched and applied. */
        REFRESHED,
        /** The lookup ran but the tenant's Epic has no Practitioner for this id. */
        NO_MATCH,
        /** The practitioner has neither a linked user nor an epicUserId, so there is nothing to look up. */
        INSUFFICIENT_DATA,
        /** The tenant has no FHIR integration wired. */
        UNSUPPORTED_TENANT,
        /** The lookup or the save failed. */
        FAILED
    }

    /** The outcome plus the practitioner as it now stands (saved, when the attempt was recorded). */
    public record RefreshResult(RefreshOutcome outcome, Practitioner practitioner) {}

    /**
     * Asynchronously refreshes practitioner data from Epic/FHIR.
     *
     * @param practitioner The practitioner to refresh
     * @param tenantKey The tenant context for the async refresh execution
     */
    @Async("practitionerRefreshExecutor")
    public void refreshPractitionerAsync(Practitioner practitioner, TenantKey tenantKey) {
        TenantContextHolder.withTenant(tenantKey, () -> refreshPractitioner(practitioner));
    }

    /**
     * Fetches fresh data from the tenant's Epic FHIR API and updates the practitioner record. Runs for
     * any tenant with a FHIR integration ({@link CommandFactoryProvider#forTenant} present); tenants
     * without one are skipped.
     *
     * Every attempt is recorded, matched or not and successful or not, which resets the staleness
     * clock in {@code PractitionerService.refreshPractitionerIfStale}. That keeps ids a tenant can
     * never resolve (Mayo service-account PERIDs) from being re-queried on every request, and keeps a
     * failing Epic from being retried on every request. The cost is that a transient failure suppresses
     * the automatic retry for a full staleness window; recovering sooner needs a manual refresh.
     */
    public RefreshResult refreshPractitioner(Practitioner practitioner) {
        TenantKey tenantKey = TenantContextHolder.getTenant();
        Optional<CommandFactory> commandFactory = commandFactoryProvider.forTenant(tenantKey);
        if (commandFactory.isEmpty()) {
            log.debug("Skipping refresh for practitioner {} - tenant {} has no FHIR integration",
                    practitioner.getEpicUserId(), tenantKey.value());
            return new RefreshResult(RefreshOutcome.UNSUPPORTED_TENANT, practitioner);
        }

        Optional<Lookup> lookup = chooseLookup(practitioner, commandFactory.get());
        if (lookup.isEmpty()) {
            log.debug("Unable to refresh practitioner {} - no linked user and no epic user id",
                    practitioner.getId());
            return new RefreshResult(RefreshOutcome.INSUFFICIENT_DATA, practitioner);
        }

        RefreshOutcome outcome = applyFreshData(practitioner, lookup.get());

        try {
            return new RefreshResult(outcome, saveAndMarkRefreshed(practitioner));
        } catch (Exception e) {
            log.error("Unable to save practitioner refresh attempt for epic user id: {}",
                    practitioner.getEpicUserId(), e);
            return new RefreshResult(RefreshOutcome.FAILED, practitioner);
        }
    }

    /**
     * Picks the lookup for a practitioner:
     * 1. A linked User means Epic's login id is known, so query by clientUserId (MGB).
     * 2. Otherwise use the practitioner's own epicUserId via the tenant's practitioner search.
     *
     * The name is passed along but not required. Each tenant's command decides what it needs: MGB
     * searches by name and filters to the user id, so a nameless practitioner yields no match; Mayo
     * treats the epicUserId as a PERID and looks it up directly, where the name is irrelevant.
     */
    private Optional<Lookup> chooseLookup(Practitioner practitioner, CommandFactory commandFactory) {
        if (practitioner.getUser() != null) {
            String clientUserId = practitioner.getUser().getClientUserId();
            return Optional.of(new Lookup(
                    () -> commandFactory.getPractitioner(clientUserId).execute(),
                    "clientUserId: " + clientUserId));
        }

        String epicUserId = practitioner.getEpicUserId();
        if (epicUserId == null || epicUserId.isBlank()) {
            return Optional.empty();
        }

        String searchName = Practitioner.reformatDisplayName(practitioner.getName());
        return Optional.of(new Lookup(
                () -> commandFactory.searchPractitioner(searchName, epicUserId).execute(),
                "epicUserId: " + epicUserId + ", name: " + practitioner.getName()));
    }

    private RefreshOutcome applyFreshData(Practitioner practitioner, Lookup lookup) {
        try {
            Optional<PractitionerDTO> freshData = lookup.command().get();
            if (freshData.isEmpty()) {
                log.warn("Unable to fetch fresh data for practitioner '{}' during refresh (method: {})",
                        practitioner.getEpicUserId(), lookup.description());
                return RefreshOutcome.NO_MATCH;
            }

            if (hasChanges(practitioner, freshData.get())) {
                log.info("Successfully refreshed practitioner: {}", lookup.description());
            }
            practitioner.updateDetails(freshData.get());
            return RefreshOutcome.REFRESHED;
        } catch (Exception e) {
            Sentry.captureException(e);
            log.warn("Failed to refresh practitioner with epic user id: {}",
                    practitioner.getEpicUserId(), e);
            return RefreshOutcome.FAILED;
        }
    }

    /** A chosen FHIR lookup, paired with a description of how it was chosen for logging. */
    private record Lookup(Supplier<Optional<PractitionerDTO>> command, String description) {}

    public Practitioner saveAndMarkRefreshed(Practitioner practitioner) {
        return transactionTemplate.execute(status -> {
            Practitioner saved = practitionerRepository.save(practitioner);
            practitionerRepository.markAsRefreshed(saved.getId());
            return saved;
        });
    }

    private boolean hasChanges(Practitioner practitioner, PractitionerDTO freshData) {
        if (freshData.getName() != null && !freshData.getName().equals(practitioner.getName())) {
            return true;
        }
        if (freshData.getFhirId() != null && !freshData.getFhirId().equals(practitioner.getFhirId())) {
            return true;
        }
        if (freshData.getClientUserId() != null && !freshData.getClientUserId().equals(practitioner.getClientUserId())) {
            return true;
        }
        if (freshData.getEpicProviderId() != null && !freshData.getEpicProviderId().equals(practitioner.getEpicProviderId())) {
            return true;
        }
        if (freshData.getEpicUserId() != null && !freshData.getEpicUserId().equals(practitioner.getEpicUserId())) {
            return true;
        }
        if (freshData.getRole() != null && !freshData.getRole().equals(practitioner.getRole())) {
            return true;
        }
        if (freshData.getSpecialities() != null && !freshData.getSpecialities().equals(practitioner.getSpecialities())) {
            return true;
        }
        if (freshData.getEmail() != null && !freshData.getEmail().equals(practitioner.getEmail())) {
            return true;
        }
        return false;
    }
}
