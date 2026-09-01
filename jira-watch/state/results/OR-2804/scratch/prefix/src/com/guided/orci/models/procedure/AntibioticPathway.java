package com.guided.orci.models.procedure;

import com.guided.orci.models.UUIDBaseModel;
import com.guided.orci.models.medication.MedicationCategory;
import com.guided.orci.models.patient.CaseAcuity;
import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.hibernate.envers.Audited;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * One route through a procedure's antibiotic prophylaxis: an ordered list of steps, where each step
 * offers one or more options and an option names the drugs to give together.
 *
 * <p>A procedure may have several pathways. All of them are walked. Within one pathway the first
 * step whose options survive the patient's contraindications is the answer, and the steps below it
 * are never evaluated, so a step exists to say what to fall back to when the step above it is ruled
 * out. What separate pathways offer is co-equal: a step reached late in one carries no less weight
 * than the first step of another.
 *
 * <p>Two routes may share a first choice and still descend differently:
 * <pre>
 * pathway 0: CEFAZOLIN                    -> CIPROFLOXACIN AND VANCOMYCIN
 * pathway 1: CEFAZOLIN AND METRONIDAZOLE  -> CIPROFLOXACIN AND VANCOMYCIN AND METRONIDAZOLE
 * </pre>
 * Holding them apart is what lets the metronidazole route keep a metronidazole fallback. A step
 * number counts within its own pathway, so there is no ordering between one pathway's step and
 * another's.
 *
 * @see AntibioticPathwayOption
 */
@Audited
@Entity
@Table(name = "antibiotic_pathways")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class AntibioticPathway extends UUIDBaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "procedure_type_id", nullable = false)
    private ProcedureType procedureType;

    /**
     * Ordering among the procedure's pathways, taken from the order they were configured in.
     * Carries no preference: pathways are co-equal, and this exists so that what the application
     * offers is stable rather than whatever order the database returns.
     */
    @Column(nullable = false)
    private int position;

    /**
     * The procedure risk this pathway is written for, or null when it applies at every risk.
     * <p>
     * Every procedure on a case has a risk: ORCI rates it rather than reading it from a feed, and an
     * unrated procedure reads as {@link ProcedureRisk#DEFAULT}. So a pathway naming a risk really is
     * scoped out of the procedures rated at the other one, rather than left unresolved.
     *
     * @see ProcedureRisk#ATTRIBUTE_KEY
     */
    @Nullable
    @Enumerated(EnumType.STRING)
    private ProcedureRisk risk;

    /**
     * The case acuities this pathway is written for, or empty when it applies at every acuity.
     * <p>
     * Fetched eagerly because every pathway that is loaded is immediately tested against the case's
     * acuity, so there is no path that reads a pathway without this, and lazily loading a set of at
     * most four values only opens the collection to being read outside its session.
     *
     * @see com.guided.orci.models.patient.Operation#getAcuity()
     */
    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "antibiotic_pathway_acuities",
            joinColumns = @JoinColumn(name = "pathway_id"))
    @Column(name = "acuity", nullable = false)
    @Enumerated(EnumType.STRING)
    private Set<CaseAcuity> acuities = new HashSet<>();

    /**
     * True when this pathway is the statement that no antibiotic is wanted. Such a pathway has no
     * options. Standing beside pathways that do offer drugs, it means prophylaxis is optional:
     * giving nothing is one valid answer, and the other pathways describe the rest.
     */
    @Column(name = "no_prophylaxis", nullable = false)
    private boolean noProphylaxis;

    @Builder.Default
    @OneToMany(mappedBy = "pathway", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("stepNumber ASC, position ASC")
    private List<AntibioticPathwayOption> options = new ArrayList<>();

    /**
     * Whether this pathway is written for a procedure rated at this risk on a case carrying this
     * acuity. Every scope the pathway names must match, and a scope it leaves blank does not
     * constrain.
     * <p>
     * The two scopes sit at different levels and differ in what a missing value means. Risk is rated
     * per procedure and always resolves, so a risk-scoped pathway is genuinely scoped out of the
     * procedures rated at another risk. Acuity belongs to the case, is fed rather than derived and may
     * arrive absent or unmapped, and a null acuity then matches only the pathways naming none: a
     * procedure describing only known acuities has said nothing about a case whose acuity it does not
     * know.
     * <p>
     * Lives here rather than on the resolution because two callers must agree on it - the walk that
     * decides what a case is offered, and the import-time check for scopes no case can reach. A
     * second copy of this predicate would let those two drift apart silently.
     */
    public boolean appliesTo(@Nullable ProcedureRisk risk, @Nullable CaseAcuity acuity) {
        System.out.println("OR2804_PREFIX_PREDICATE_RISK_ONLY pathway=" + this.position + " ignoringAcuities=" + acuities);
        return this.risk == null || this.risk == risk;
    }

    /** Adds an option and sets both ends of the association, which Hibernate will not do for us. */
    public void addOption(AntibioticPathwayOption option) {
        option.setPathway(this);
        options.add(option);
    }

    /**
     * The pathway written in the notation it was configured in, as in
     * {@code CEFAZOLIN -> (CIPROFLOXACIN AND METRONIDAZOLE) OR CLINDAMYCIN}.
     *
     * <p>Storage splits one configured cell across three tables, so nothing about the stored rows
     * reads as the regimen a person wrote. This puts it back, for a log line, a test assertion, or
     * anyone comparing what is stored against the CSV. Kept off {@code toString}, which identifies
     * the row rather than describing it.
     *
     * <p>Empty for a {@link #noProphylaxis} pathway, which has nothing to give.
     */
    public String toNotation() {
        return options.stream()
                .sorted(Comparator.comparingInt(AntibioticPathwayOption::getStepNumber)
                        .thenComparingInt(AntibioticPathwayOption::getPosition))
                .collect(Collectors.groupingBy(AntibioticPathwayOption::getStepNumber,
                        LinkedHashMap::new, Collectors.toList()))
                .values().stream()
                .map(AntibioticPathway::renderStep)
                .collect(Collectors.joining(" -> "));
    }

    /** One step: its options joined by OR, each option's categories joined by AND. */
    private static String renderStep(List<AntibioticPathwayOption> options) {
        return options.stream()
                .map(option -> {
                    String drugs = option.getMedicationCategories().stream()
                            .map(MedicationCategory::getCategoryName)
                            .collect(Collectors.joining(" AND "));
                    // Parenthesised only where the notation asks for it: an AND set standing beside
                    // an alternative. A step with one option needs no brackets to be unambiguous.
                    return options.size() > 1 && option.getMedicationCategories().size() > 1
                            ? "(" + drugs + ")"
                            : drugs;
                })
                .collect(Collectors.joining(" OR "));
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this)
                .append("procedureType", procedureType == null ? null : procedureType.getIdentifier())
                .append("position", position)
                .append("risk", risk)
                .append("acuities", acuities)
                .append("noProphylaxis", noProphylaxis)
                .toString();
    }
}
