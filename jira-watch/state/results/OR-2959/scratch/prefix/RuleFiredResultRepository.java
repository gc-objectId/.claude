package com.guided.orci.repository;

import com.guided.orci.models.patient.Operation;
import com.guided.orci.models.rules.RuleFiredResult;
import io.hypersistence.utils.spring.repository.BaseJpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public interface RuleFiredResultRepository extends BaseJpaRepository<RuleFiredResult, UUID> {
    @Query("SELECT r FROM RuleFiredResult r JOIN FETCH r.ruleExecutionContext rec JOIN FETCH rec.operation WHERE rec.operation = :operation")
    List<RuleFiredResult> findAllByRuleExecutionContext_Operation(@Param("operation") Operation operation);


    List<RuleFiredResult> findAllByRuleExecutionContext_TrackingId(UUID trackingId);

    @Query("select r from RuleFiredResult r left join ComplianceResult c on r.id = c.ruleFiredResult.id where c.id is null")
    List<RuleFiredResult> findAllWithoutComplianceResult();

    @Query("SELECT e FROM RuleFiredResult e where e.createdDate >= :since")
    Stream<RuleFiredResult> streamAll(@Param("since") Instant since);

    @Query("select r from RuleFiredResult r left join ComplianceResult c on r.id = c.ruleFiredResult.id where c.id is null and r.createdDate >= :since")
    Stream<RuleFiredResult> streamAllWithoutComplianceResult(@Param("since") Instant since);

    @Query("""
            SELECT r FROM RuleFiredResult r
            WHERE r.ruleExecutionContext.operation.caseId = :caseId
              AND (:ruleIdentifierPattern IS NULL OR r.ruleIdentifier LIKE :ruleIdentifierPattern ESCAPE '\\')
            """)
    List<RuleFiredResult> findAllByCaseIdAndRuleIdentifierLike(
            @Param("caseId") String caseId,
            @Param("ruleIdentifierPattern") String ruleIdentifierPattern,
            Pageable pageable);

    @Query("""
            SELECT r FROM RuleFiredResult r
            WHERE r.ruleExecutionContext.operation.id = :operationId
              AND r.ruleIdentifier = :ruleIdentifier
            """)
    List<RuleFiredResult> findAllByOperationIdAndRuleIdentifier(
            @Param("operationId") UUID operationId,
            @Param("ruleIdentifier") String ruleIdentifier);

    @Query("""
            SELECT r FROM RuleFiredResult r
            WHERE r.ruleExecutionContext.operation.id = :operationId
              AND r.ruleIdentifier IN :ruleIdentifiers
            """)
    List<RuleFiredResult> findAllByOperationIdAndRuleIdentifierIn(
            @Param("operationId") UUID operationId,
            @Param("ruleIdentifiers") Set<String> ruleIdentifiers);
}
