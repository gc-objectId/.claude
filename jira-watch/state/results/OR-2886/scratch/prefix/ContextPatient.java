package com.guided.orci.dto.rule.context;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.guided.orci.models.allergy.IAllergy;
import com.guided.orci.models.audit.AuditJsonIgnore;
import com.guided.orci.models.medication.IMedicationAdministration;
import com.guided.orci.models.patient.Gender;
import com.guided.orci.models.patient.IPatient;
import com.guided.orci.models.patient.ValueUnit;
import com.guided.orci.types.PediatricStatus;
import com.guided.orci.types.TenantContext;
import com.guided.orci.units.serialization.QuantityDeserializer;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import lombok.*;
import org.jetbrains.annotations.NotNull;
import tech.units.indriya.ComparableQuantity;

import javax.annotation.Nullable;
import javax.measure.quantity.Mass;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import static com.guided.orci.utils.FunctionalUtils.pipe;
import static java.util.function.Predicate.not;

@Value
@Builder(toBuilder = true)
@AllArgsConstructor
@NoArgsConstructor(force = true)
@JsonAutoDetect(
        fieldVisibility = JsonAutoDetect.Visibility.ANY,
        getterVisibility = JsonAutoDetect.Visibility.NONE)
public class ContextPatient implements IPatient {
    UUID id;
    String pmrn;
    String mrn;
    String epicPatientId;
    String fhirDSTU2PatientId;
    String fhirDSTU3PatientId;
    String fhirR4PatientId;
    String firstName;
    String preferredFirstName;
    String lastName;
    String preferredLastName;
    LocalDate dob;
    Gender gender;
    Gender genderIdentity;
    ValueUnit weight;
    ValueUnit height;
    ValueUnit creatinine;
    PediatricStatus pediatricStatus;
    boolean pregnant;

    @Nullable
    Double crCl;

    @Getter
    @JsonDeserialize(using = QuantityDeserializer.class)
    ComparableQuantity<Mass> idealWeight;

    @Getter
    @JsonDeserialize(using = QuantityDeserializer.class)
    ComparableQuantity<Mass> actualWeight;

    @Getter
    @JsonDeserialize(using = QuantityDeserializer.class)
    ComparableQuantity<Mass> adjustedWeight;

    @Getter
    @JsonDeserialize(using = QuantityDeserializer.class)
    ComparableQuantity<Mass> leanWeight;

    @AuditJsonIgnore
    List<ContextEncounter> encounters;

    @Getter
    @AuditJsonIgnore
    List<ContextMedicationOrder> medicationOrders;

    @AuditJsonIgnore
    List<ContextCondition> conditions;

    @AuditJsonIgnore
    List<ContextFamilyMemberHistory> familyMemberHistories;

    @AuditJsonIgnore
    Set<ContextMedicationAllergy> medicationAllergies;

    @AuditJsonIgnore
    Set<ContextAllergy> allergies;


    @WithSpan("Build ContextPatient")
    public ContextPatient(IPatient patient, TenantContext tenantContext) {
        this.id = patient.getId();
        this.pmrn = patient.getPmrn();
        this.mrn = patient.getMrn();
        this.epicPatientId = patient.getEpicPatientId();
        this.fhirDSTU2PatientId = patient.getFhirDSTU2PatientId();
        this.fhirDSTU3PatientId = patient.getFhirDSTU3PatientId();
        this.fhirR4PatientId = patient.getFhirR4PatientId();
        this.firstName = patient.getFirstName();
        this.preferredFirstName = patient.getPreferredFirstName();
        this.lastName = patient.getLastName();
        this.preferredLastName = patient.getPreferredLastName();
        this.dob = patient.getDob();
        this.gender = patient.getGender();
        this.genderIdentity = patient.getGenderIdentity();
        this.weight = patient.getWeight();
        this.height = patient.getHeight();
        this.creatinine = patient.getCreatinine();
        this.encounters = ContextEncounter.fromEncounters(patient.getEncounters());
        this.medicationOrders = ContextMedicationOrder.fromMedicationOrders(patient.getMedicationOrders());
        this.conditions = ContextCondition.fromConditions(patient.getConditions());
        this.familyMemberHistories = ContextFamilyMemberHistory.fromFamilyMemberHistories(patient.getFamilyMemberHistories());
        this.medicationAllergies = ContextMedicationAllergy.fromMedicationAllergies(patient.getMedicationAllergies());
        this.allergies = ContextAllergy.fromAllergies(patient.getAllergies());
        this.crCl = patient.calculateCrCl(tenantContext).orElse(null);
        this.idealWeight = patient.getIdealWeight();
        this.actualWeight = patient.getActualWeight();
        this.adjustedWeight = patient.getAdjustedWeight();
        this.leanWeight = patient.getLeanWeight();
        this.pediatricStatus = patient.getPediatricStatus(tenantContext);
        this.pregnant = patient.isPregnant();
    }

    public Optional<Double> getCrCl() {
        return Optional.ofNullable(crCl);
    }

    public ContextPatient withAllergiesSuppressed(Set<String> suppressedAllergies) {
        Predicate<IAllergy> notSuppressed = pipe(IAllergy::getAllergenName, not(suppressedAllergies::contains))::apply;

        var filteredAllergies = getAllergies()
                .stream().filter(notSuppressed).collect(Collectors.toSet());

        var filteredMedAllergies = getMedicationAllergies()
                .stream().filter(notSuppressed).collect(Collectors.toSet());

        return toBuilder()
                .allergies(filteredAllergies)
                .medicationAllergies(filteredMedAllergies)
                .build();
    }


    public List<ContextMedicationAdministration> getBolusMedicationAdministrations() {
        return this.medicationOrders.stream().flatMap(order -> order.getBolusMedicationAdministrations().stream()).toList();
    }

    @Override
    public List<ContextInfusionMedicationAdministration> getInfusionMedicationAdministrations() {
        return this.medicationOrders.stream()
                .flatMap(order -> order.getInfusionMedicationAdministrations().stream()).toList();
    }

    @Override
    public Optional<Double> calculateCrCl(TenantContext tenantContext) {
        return getCrCl();
    }

    @Override
    public PediatricStatus getPediatricStatus(TenantContext tenantConfig /*ignored*/) {
        return pediatricStatus;
    }

    @JsonIgnore
    public boolean isAdult() {
        // assume not having a status means adult
        return getPediatricStatus() == null || getPediatricStatus().isAdult();
    }

    @JsonIgnore
    public boolean isPediatric() {
        // we must have a pediatric status
        return getPediatricStatus() != null && getPediatricStatus().isPediatric();
    }

    public List<? extends IMedicationAdministration> getMedicationAdministrations() {
        return this.medicationOrders.stream().flatMap(order -> order.getMedicationAdministrations().stream()).toList();
    }

    /**
     * Returns the most recent medication administration for the given medication category and since date. If since is null, no med admin is returned.
     *
     * @param medicationCategory
     * @param since
     * @return the most recent medication administration for the given medication category and since date. If since is null, no med admin is returned.
     */
    public Optional<? extends IMedicationAdministration> getMostRecentIntraopMedicationAdministration(String medicationCategory, @NotNull Date since) {
        return getMedicationAdministrations().stream()
                .filter(medAdmin -> medAdmin.hasMedicationCategory(medicationCategory) &&
                                    (since.before(medAdmin.getStartOfAdministrationDate()) || (since.equals(medAdmin.getStartOfAdministrationDate()))))
                .min(IMedicationAdministration.ORDERED_BY_LATEST_FIRST);
    }
}
