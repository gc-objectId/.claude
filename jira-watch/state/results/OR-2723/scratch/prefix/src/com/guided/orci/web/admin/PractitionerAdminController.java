package com.guided.orci.web.admin;

import com.guided.orci.exceptions.NotFoundException;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.repository.PractitionerRepository;
import com.guided.orci.service.PractitionerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/practitioners")
public class PractitionerAdminController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PractitionerAdminController.class);

    @Autowired
    private PractitionerRepository practitionerRepository;

    @Autowired
    private PractitionerService practitionerService;

    @GetMapping(params = {"page", "size"})
    @Transactional(readOnly = true)
    public PagedModel<PractitionerListDTO> getPractitioners(
            @RequestParam("page") int page,
            @RequestParam("size") int size,
            @RequestParam(value = "search", required = false) String search
    ) {
        var pageable = PageRequest.of(page, size).withSort(Sort.by("name").ascending());

        var practitionersPage = (search != null && !search.isBlank())
                ? practitionerRepository.searchByTerm(search.trim(), pageable)
                : practitionerRepository.findAll(pageable);

        return new PagedModel<>(practitionersPage.map(PractitionerListDTO::new));
    }

    @PostMapping("/{id}/refresh")
    @Transactional
    public ResponseEntity<PractitionerListDTO> refreshPractitioner(@PathVariable("id") UUID id) {
        var practitioner = practitionerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Practitioner", id.toString()));

        try {
            var updated = practitionerService.refreshPractitioner(practitioner);
            return ResponseEntity.ok(new PractitionerListDTO(updated));
        } catch (IllegalStateException e) {
            log.warn("Failed to refresh practitioner {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/refresh")
    @Transactional
    public ResponseEntity<BulkRefreshResultDTO> bulkRefreshPractitioners(@RequestBody List<UUID> ids) {
        int succeeded = 0;
        int failed = 0;

        for (UUID id : ids) {
            try {
                var practitioner = practitionerRepository.findById(id)
                        .orElseThrow(() -> new NotFoundException("Practitioner", id.toString()));
                practitionerService.refreshPractitioner(practitioner);
                succeeded++;
            } catch (Exception e) {
                log.warn("Bulk refresh failed for practitioner {}: {}", id, e.getMessage());
                failed++;
            }
        }

        return ResponseEntity.ok(new BulkRefreshResultDTO(succeeded, failed));
    }

    public record BulkRefreshResultDTO(int succeeded, int failed) {}

    public record PractitionerListDTO(
            UUID id,
            String name,
            String clientUserId,
            String epicUserId,
            String epicProviderId,
            String role,
            String email
    ) {
        public PractitionerListDTO(Practitioner practitioner) {
            this(
                    practitioner.getId(),
                    practitioner.getName(),
                    practitioner.getClientUserId(),
                    practitioner.getEpicUserId(),
                    practitioner.getEpicProviderId(),
                    practitioner.getRole(),
                    practitioner.getEmail()
            );
        }
    }
}
