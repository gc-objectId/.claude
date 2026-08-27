package com.guided.orci.service;

import com.guided.orci.configuration.PractitionerSyncConfiguration;
import com.guided.orci.dto.PractitionerDTO;
import com.guided.orci.integration.RecordNotFoundException;
import com.guided.orci.mappers.PractitionerMapper;
import com.guided.orci.models.medication.AbstractMedicationAdministration;
import com.guided.orci.models.medication.MedicationOrder;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.models.user.User;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.repository.PractitionerRepository;
import com.guided.orci.types.wrappers.TenantKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class PractitionerService {

    private final PractitionerRepository practitionerRepository;
    private final PractitionerMapper practitionerMapper;
    private final PractitionerRefreshService practitionerRefreshService;
    private final PractitionerSyncConfiguration syncConfiguration;
    private final CommandFactoryProvider commandFactoryProvider;

    public PractitionerService(
            PractitionerRepository practitionerRepository,
            PractitionerMapper practitionerMapper,
            PractitionerRefreshService practitionerRefreshService,
            PractitionerSyncConfiguration syncConfiguration,
            CommandFactoryProvider commandFactoryProvider) {
        this.practitionerRepository = practitionerRepository;
        this.practitionerMapper = practitionerMapper;
        this.practitionerRefreshService = practitionerRefreshService;
        this.syncConfiguration = syncConfiguration;
        this.commandFactoryProvider = commandFactoryProvider;
    }

    public Optional<Practitioner> findForUser(User user) {
        return practitionerRepository.findByClientUserId(user.getClientUserId());
    }

    @Async
    public void createOrUpdateForUser(User user) {
        TenantKey tenantKey = TenantContextHolder.getTenant();
        if (!tenantKey.isMgb()) {
            throw new RuntimeException("Practitioner API currently only for MGB, not %s"
                    .formatted(tenantKey.value()));
        }

        Optional<PractitionerDTO> practitioner;
        try {
            practitioner = commandFactoryProvider.forTenant(tenantKey)
                    .map(commandFactory -> commandFactory.getPractitioner(user.getClientUserId()).execute())
                    .orElse(Optional.empty());
        } catch (Exception e) {
            log.error("Error during practitioner lookup", e);
            return;
        }
        if (practitioner.isEmpty()) {
            log.warn("Unable to determine practitioner for user '{}'", user.getClientUserId());
            return;
        }

        var existingPractitioner = findForUser(user);
        if (existingPractitioner.isEmpty()) {
            String epicUserId = practitioner.get().getEpicUserId();
            if (epicUserId != null && !epicUserId.isBlank()) {
                existingPractitioner = findByEpicUserId(epicUserId);
            }
        }

        if(existingPractitioner.isPresent()) {
            try {
                Practitioner existing = existingPractitioner.get();
                if (existing.getUser() != null && !existing.getUser().getId().equals(user.getId())) {
                    log.error("Practitioner user mismatch for epic user id '{}', existing user '{}', incoming user '{}'",
                            existing.getEpicUserId(), existing.getUser().getId(), user.getId());
                    return;
                }
                existing.updateDetails(practitioner.get());
                if (existing.getUser() == null) {
                    existing.setUser(user);
                }
                practitionerRefreshService.saveAndMarkRefreshed(existing);
            } catch(Exception e) {
                log.warn("Unable to update practitioner data for: {}", user.getClientUserId(), e);
            }
        } else {
            Practitioner entity = practitionerMapper.dtoToEntity(practitioner.get());
            entity.setUser(user);
            practitionerRefreshService.saveAndMarkRefreshed(entity);
        }
    }

    public Optional<Practitioner> findByNotificationUserIdWithAsyncRefresh(String notificationUserId) {
        var result = findByEpicUserId(notificationUserId);

        // Trigger async refresh if practitioner data is stale.
        // Calls through PractitionerRefreshService proxy so @Async/@Transactional are honored.
        result.ifPresent(this::refreshPractitionerIfStale);

        return result;
    }

    private Optional<Practitioner> findByEpicUserId(String epicUserId) {
        var matches = practitionerRepository.findAllByEpicUserIdOrderByLastModifiedDateDesc(epicUserId);
        if (matches.size() > 1) {
            log.error("Multiple practitioners found for epic user id '{}'", epicUserId);
        }
        return matches.stream().findFirst();
    }

    /**
     * Checks if a practitioner's data is stale and triggers an async refresh if needed.
     */
    private void refreshPractitionerIfStale(Practitioner practitioner) {
        try {
            if (!syncConfiguration.isEnabled()) {
                return;
            }

            if (practitioner.getLastRefreshedAt() == null) {
                log.debug("Practitioner {} has never been refreshed, triggering refresh",
                        practitioner.getEpicUserId());
                practitionerRefreshService.refreshPractitionerAsync(practitioner, TenantContextHolder.getTenant());
                return;
            }

            Instant stalenessThreshold = Instant.now()
                    .minus(syncConfiguration.getStalenessThresholdDays(), ChronoUnit.DAYS);
            Instant lastRefreshed = practitioner.getLastRefreshedAt();

            if (lastRefreshed.isBefore(stalenessThreshold)) {
                log.debug("Practitioner {} data is stale (last refreshed: {}), triggering refresh",
                        practitioner.getEpicUserId(), practitioner.getLastRefreshedAt());
                practitionerRefreshService.refreshPractitionerAsync(practitioner, TenantContextHolder.getTenant());
            }
        } catch (Exception e) {
            log.error("Error checking practitioner staleness for {} - ignoring",
                    practitioner.getEpicUserId(), e);
        }
    }

    /**
     * Fetches a practitioner from the tenant's Epic FHIR API to enrich a find-or-create. Each tenant's
     * {@code searchPractitioner} does the right lookup: MGB searches by name and filters to
     * {@code epicUserId}; Mayo looks up its PERID ({@code epicUserId}) directly by identifier. Returns
     * empty when unmatched or the tenant has no FHIR support.
     *
     * @param name       the name to search for (used by MGB; ignored by Mayo)
     * @param epicUserId the epic user id — MGB's numeric user id, or Mayo's PERID
     * @return the matching PractitionerDTO, or empty when unmatched / tenant has no FHIR support
     */
    public Optional<PractitionerDTO> searchByNameAndEpicUserId(String name, String epicUserId) {
        TenantKey tenantKey = TenantContextHolder.getTenant();
        try {
            return commandFactoryProvider.forTenant(tenantKey)
                    .map(commandFactory -> commandFactory.searchPractitioner(name, epicUserId).execute())
                    .orElseGet(() -> {
                        log.warn("Practitioner FHIR lookup not supported for tenant {}", tenantKey.value());
                        return Optional.empty();
                    });
        } catch (RecordNotFoundException e) {
            // No FHIR record for this id — return empty so the caller creates a name-only stub.
            log.info("No FHIR practitioner match for epicUserId {} (tenant {})", epicUserId, tenantKey.value());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error during practitioner FHIR lookup for epicUserId {} (tenant {})",
                    epicUserId, tenantKey.value(), e);
            return Optional.empty();
        }
    }

    /**
     * Find or create a practitioner by Epic user ID and optional display name.
     *
     * @param epicUserId The Epic user ID to search for
     * @param displayName The display name (format: "LAST, FIRST" or "FIRST LAST")
     * @return The found or created Practitioner
     */
    public Practitioner findOrCreateByEpicUserIdAndName(String epicUserId, String displayName) {
        // 1. Try direct lookup by epicUserId
        var existing = findByNotificationUserIdWithAsyncRefresh(epicUserId);
        if (existing.isPresent()) {
            return existing.get();
        }

        // 2. Try FHIR API search if we have a name
        Practitioner toSave = null;
        boolean fetchedFromFhir = false;
        if (displayName != null) {
            var searchName = Practitioner.reformatDisplayName(displayName);
            var practitionerDTO = searchByNameAndEpicUserId(searchName, epicUserId);
            if (practitionerDTO.isPresent()) {
                toSave = practitionerMapper.dtoToEntity(practitionerDTO.get());
                fetchedFromFhir = true; // We successfully fetched from FHIR
            }
        }

        if (toSave == null) {
            // 3. Fallback: create minimal practitioner (not verified against FHIR)
            toSave = Practitioner.builder()
                    .name(displayName)
                    .epicUserId(epicUserId)
                    .build();
            // Note: lastRefreshedAt remains null - will be refreshed on next staleness check
        }

        try {
            // attempt to save the new practitioner, if it fails, it may mean another thread created our practitioner so just attempt to requery
            if (fetchedFromFhir) {
                return practitionerRefreshService.saveAndMarkRefreshed(toSave);
            }
            return practitionerRepository.save(toSave);
        } catch (DataIntegrityViolationException e) {
            // Race condition: another thread created the practitioner first
            log.debug("Practitioner already exists for epicUserId '{}', re-fetching", epicUserId);
            return findByEpicUserId(epicUserId)
                    .orElseGet(() -> {
                        log.warn("Practitioner not found after re-fetch for epicUserId: {}", epicUserId, e);
                        return null;
                    });
        }
    }

    /**
     * Resolves practitioners for all medication administrations within a medication order.
     * Uses the transient documenter fields populated from SOAP to find or create practitioners.
     *
     * @param medicationOrder The medication order containing administrations to resolve
     */
    public void resolvePractitionersForMedicationOrder(MedicationOrder medicationOrder) {
        Map<String, Practitioner> cache = new HashMap<>();
        for (var bolus : medicationOrder.getBolusMedicationAdministrations()) {
            resolvePractitionerIfNeeded(bolus, cache);
        }
        for (var infusion : medicationOrder.getInfusionMedicationAdministrations()) {
            resolvePractitionerIfNeeded(infusion, cache);
        }
    }

    /**
     * Resolves practitioners for all medication administrations within multiple medication orders.
     *
     * @param medicationOrders The list of medication orders to process
     */
    public void resolvePractitionersForMedicationOrders(List<MedicationOrder> medicationOrders) {
        if (medicationOrders == null) {
            return;
        }
        medicationOrders.forEach(this::resolvePractitionersForMedicationOrder);
    }

    private void resolvePractitionerIfNeeded(AbstractMedicationAdministration admin, Map<String, Practitioner> cache) {
        if (admin.getDocumentingPractitioner() == null && admin.getDocumenterEpicUserId() != null && admin.getDocumenterName() != null) {
            var practitioner = cache.computeIfAbsent(
                    admin.getDocumenterEpicUserId(),
                    id -> findOrCreateByEpicUserIdAndName(id, admin.getDocumenterName())
            );
            admin.setDocumentingPractitioner(practitioner);
        }
    }
}
