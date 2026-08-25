package com.guided.orci.engine.rule;

import lombok.Getter;

public enum GuidanceCategory {
    UNCATEGORIZED("Uncategorized"),
    DELAYED_MISSED_OR_WRONG_ANTIBIOTIC("Delayed/Missed/Wrong Antibiotic"),
    VITAL_SIGNS("Vital Signs"),
    WRONG_DOSE("Wrong Dose"),
    WRONG_MED("Wrong Medication"),
    NMB("NMB"),
    ALLERGY_AND_INTERACTIONS("Allergy & Drug-Drug Interactions"),
    MONITORING("Monitoring"),
    DIABETES_MANAGEMENT("Diabetes Management"),
    ERAS("ERAS");

    @Getter
    private final String friendlyName;

    GuidanceCategory(String friendlyName) {
        this.friendlyName = friendlyName;
    }
}
