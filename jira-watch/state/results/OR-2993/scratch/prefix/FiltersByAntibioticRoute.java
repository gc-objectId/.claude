package com.guided.orci.engine;

import com.google.common.collect.Sets;
import com.guided.orci.models.medication.MedicationRoute;

import java.util.Collections;
import java.util.Set;

public interface FiltersByAntibioticRoute {
    Set<MedicationRoute> RECOGNIZED_ANTIBIOTIC_ROUTES = Collections.unmodifiableSet(Sets.newHashSet(
            MedicationRoute.INTRAVENOUS,
            MedicationRoute.INTRAOSSEOUS,
            MedicationRoute.ORAL,
            MedicationRoute.GASTROSTOMY_TUBE,
            MedicationRoute.INJECTION,
            MedicationRoute.INTRAMUSCULAR));
}
