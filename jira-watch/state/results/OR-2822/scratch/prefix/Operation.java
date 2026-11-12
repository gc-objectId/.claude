package com.guided.orci.models.patient;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.guided.orci.events.EvaluationMode;
import com.guided.orci.models.UUIDBaseModel;
import com.guided.orci.models.operation.OperationProcedureType;
import com.guided.orci.models.procedure.ProcedureType;
import com.guided.orci.models.procedure.QualifiedProcedureType;
import com.guided.orci.models.user.Practitioner;
import com.guided.orci.types.PediatricStatus;
import com.guided.orci.types.wrappers.CaseId;
import com.guided.orci.types.wrappers.EncounterId;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.Type;
import org.hibernate.envers.Audited;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Audited
@Entity
@NamedEntityGraph(name = "Operation.procedureAndCandidates",
        attributeNodes = {
                @NamedAttributeNode("patient"),
                @NamedAttributeNode("procedureTypes"),
        })
@Table(name = "operations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"case_id", "patient_id"})}, indexes = {
        @Index(columnList = "internal_id")})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@DynamicUpdate
public class Operation extends UUIDBaseModel {

    @Column(name = "case_id")
    private String caseId;

    @Column(name = "internal_id")
    private String internalId;

    // the id we use to document. In Epic this is the visitContactNumber for MGH
    private String documentationTargetId;

    /**
     * Time first time the application was launched (either in silent or interactive) for this operation
     */
    private Date initialAppLaunchTime;

    private Date startTime;

    private Date endTime;

    private Date reportableStartTime;
    private Date reportableEndTime;
    private Date procedureStartTime;
    private Date procedureEndTime;
    private Date inductionStartTime;
    private Date extubationTime;

    /**
     * Current anesthesia start time, overwritten whenever the source system revises it. This is what
     * {@link #startTime} is set to when a case has one. It is kept in its own column because the case
     * start has other writers, so it is the only place the milestone time itself survives.
     */
    private Date anesthesiaStartTime;

    /**
     * Estimated case window from the scheduling feed (Epic SIU CASE_START_TIME / CASE_END_TIME), the
     * booked slot rather than the live projection. Snapshotted at case start (In Room / Anes Start) and
     * never overwritten afterward, so it reflects the schedule as it stood when the case actually began.
     */
    private Date scheduledStartTime;
    private Date scheduledEndTime;

    private Date admissionDate;

    private String operatingRoomName;

    @Column(name = "service_name")
    private String serviceName;

    private String encounterId;

    private boolean erasOperation;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EvaluationMode evaluationMode = EvaluationMode.INTERACTIVE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_practitioner_id")
    private Practitioner primaryPractitioner;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "operation", fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private Set<OperationProcedureType> procedureTypes = new HashSet<>();

    /**
     * What the source system called each of this case's procedures, against the procedure type it
     * resolved to, or null where nothing matched. {@link #procedureTypes} holds only what resolved, so
     * this is the only place an unmapped procedure is visible.
     */
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Type(JsonType.class)
    @Column(name = "source_procedure_mappings", columnDefinition = "jsonb")
    private Map<String, String> sourceProcedureMappings;

    private String acuity;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private String classification;

    public String getAcuity() {
        return acuity != null ? acuity : classification;
    }

    public void setAcuity(String acuity) {
        this.acuity = acuity;
        if (acuity == null) {
            this.classification = null;
        }
    }


    @Type(JsonType.class)
    @Column(name = "baseline_map", columnDefinition = "json")
    private ValueUnit baselineMAP;

    @Enumerated(EnumType.STRING)
    private PediatricStatus pediatricStatus;

    @Enumerated(EnumType.STRING)
    private AsaStatus asaStatus;

    public ValueUnit getBaselineMAP() {
        return this.baselineMAPOverride != null && this.baselineMAPOverride.getValue().floatValue() > 0
                ? this.baselineMAPOverride
                : this.baselineMAP;
    }

    @Type(JsonType.class)
    @Column(name = "baseline_map_override", columnDefinition = "json")
    private ValueUnit baselineMAPOverride;

    @ToString.Include
    public OperationStatus getStatus() {
        Date now = new Date();
        return getStatus(now);
    }

    public OperationStatus getStatus(Date referenceDate) {
        Date now = new Date();
        if (this.startTime == null || this.startTime.after(referenceDate)) {
            return OperationStatus.NOT_STARTED;
        } else if (!this.startTime.after(now) && (this.endTime == null || this.endTime.before(now))) {
            return OperationStatus.IN_PROGRESS;
        } else {
            return OperationStatus.COMPLETE;
        }
    }

    public EncounterId getEncounterId() {
        return new EncounterId(encounterId);
    }

    public CaseId getCaseId() {
        return new CaseId(caseId);
    }

    public boolean wasStarted() {
        return !getStatus().equals(OperationStatus.NOT_STARTED);
    }

    /**
     * @deprecated This method was originally available when we assumed only one procedure type per operation which is no longer the case
     * <p> Use {@link Operation#getProcedureTypes()}  instead
     */
    public ProcedureType getProcedureType() {
        if (this.procedureTypes.isEmpty()) {
            return null;
        }
        return this.procedureTypes.iterator().next().getProcedureType();
    }

    public void addProcedureType(QualifiedProcedureType procedureType) {
        OperationProcedureType operationProcedureType = new OperationProcedureType(this, procedureType);
        this.procedureTypes.add(operationProcedureType);
    }

    public void addProcedureType(ProcedureType procedureType) {
        OperationProcedureType operationProcedureType = new OperationProcedureType(this, procedureType);
        this.procedureTypes.add(operationProcedureType);
    }

    /**
     * @param procedureType
     * @deprecated This method was originally available when we assumed only one procedure type per operation which is no longer the case
     * <p> Use {@link Operation#setProcedureTypes(Set)} ()} instead
     */
    public void setProcedureType(ProcedureType procedureType) {
        addProcedureType(procedureType);
    }

    public Set<ProcedureType> getProcedureTypes() {
        return this.procedureTypes.stream().map(OperationProcedureType::getProcedureType).collect(Collectors.toSet());
    }

    public Set<QualifiedProcedureType> getQualifiedProcedureTypes() {
        return this.procedureTypes.stream().map(it -> new QualifiedProcedureType(it.getProcedureType(), it.getQualifier())).collect(Collectors.toSet());
    }

    /**
     * @deprecated There can be multiple procedure types per operation, but we still have places that assume just one.
     * Exposing this method and marking as deprecated so we can more easily find and update them in the future.
     */
    public Optional<QualifiedProcedureType> getOneQualifiedProcedureType() {
        return getQualifiedProcedureTypes().stream().findFirst();
    }

    /** Empty where the resolving lookup has not run, which is "nothing known", not "nothing missing". */
    public Map<String, String> getSourceProcedureMappings() {
        return sourceProcedureMappings == null ? Map.of() : Collections.unmodifiableMap(sourceProcedureMappings);
    }

    /** A message states every procedure on the case, so this holds what the latest message named. */
    public void recordSourceProcedureMappings(Map<String, String> resolvedBySourceValue) {
        sourceProcedureMappings = new HashMap<>(resolvedBySourceValue);
    }

    public void updateProcedureTypeQualifier(String procedureTypeIdentifier, String qualifier) {
        procedureTypes.stream()
                .filter(opt -> opt.getProcedureType().getIdentifier().equals(procedureTypeIdentifier))
                .findFirst()
                .ifPresent(opt -> opt.setQualifier(qualifier));
    }

    /**
     * Records a derived attribute against one of this operation's procedures.
     *
     * @return true when the stored value changed, so callers can skip an unnecessary save
     */
    public boolean setProcedureTypeCalculatedAttribute(String procedureTypeIdentifier, String key, String value) {
        return procedureTypes.stream()
                .filter(opt -> opt.getProcedureType().getIdentifier().equals(procedureTypeIdentifier))
                .findFirst()
                .map(opt -> opt.setCalculatedAttribute(key, value))
                .orElse(false);
    }

    /**
     * A read-only view of the attributes derived for one of this operation's procedures, empty when
     * there are none. Write through {@link #setProcedureTypeCalculatedAttribute} so persisted state is
     * never mutated behind the entity's back.
     */
    public Map<String, String> getProcedureTypeCalculatedAttributes(String procedureTypeIdentifier) {
        return procedureTypes.stream()
                .filter(opt -> opt.getProcedureType().getIdentifier().equals(procedureTypeIdentifier))
                .findFirst()
                .map(opt -> Map.copyOf(opt.getCalculatedAttributes()))
                .orElseGet(Map::of);
    }

    @JsonIgnore
    public PediatricStatus getPediatricStatusOrDefault(PediatricStatus defaultPediatricStatus) {
        return this.pediatricStatus == null ? defaultPediatricStatus : this.pediatricStatus;
    }
}
