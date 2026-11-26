import { Static, String } from "runtypes";

export const NDC = String.withBrand("NDC");
export type NDC = Static<typeof NDC>;

export const RuleID = String.withBrand("RuleId");
export type RuleID = Static<typeof RuleID>;

export const PatientID = String.withBrand("PatientId");
export type PatientID = Static<typeof PatientID>;

export const PatientUUID = String.withBrand("PatientUUID");
export type PatientUUID = Static<typeof PatientUUID>;

export const PatientTemplateUUID = String.withBrand("PatientTemplateUUID");
export type PatientTemplateUUID = Static<typeof PatientTemplateUUID>;

export const CaseID = String.withBrand("CaseId");
export type CaseID = Static<typeof CaseID>;

export const OperationUUID = String.withBrand("OperationUUID");
export type OperationUUID = Static<typeof OperationUUID>;

export const ConditionID = String.withBrand("ConditionID");
export type ConditionID = Static<typeof ConditionID>;

export const ConditionUUID = String.withBrand("ConditionUUID");
export type ConditionUUID = Static<typeof ConditionUUID>;

export const TenantID = String.withBrand("TenantID");
export type TenantID = Static<typeof TenantID>;

export const EncounterID = String.withBrand("EncounterID");
export type EncounterID = Static<typeof EncounterID>;

export const AllergenID = String.withBrand("AllergenID");
export type AllergenID = Static<typeof AllergenID>;

export const AllergyReactionID = String.withBrand("AllergyReactionID");
export type AllergyReactionID = Static<typeof AllergyReactionID>;

export const AllergyID = String.withBrand("AllergyID");
export type AllergyID = Static<typeof AllergyID>;

export const AllergenName = String.withBrand("AllergenName");
export type AllergenName = Static<typeof AllergenName>;

export const APITokenString = String.withBrand("APITokenID");
export type APITokenString = Static<typeof APITokenString>;

// the database ID of a medication
export const MedicationUUID = String.withBrand("MedicationUUID");
export type MedicationUUID = Static<typeof MedicationUUID>;

// the string ID of a medication
export const MedicationIdentifier = String.withBrand("MedicationIdentifier");
export type MedicationIdentifier = Static<typeof MedicationIdentifier>;

export const MedicationAdministrationID = String.withBrand(
  "MedicationAdministrationID",
);
export type MedicationAdministrationID = Static<
  typeof MedicationAdministrationID
>;

export const MedicationNoteID = String.withBrand("MedicationNoteID");
export type MedicationNoteID = Static<typeof MedicationNoteID>;

export const UserID = String.withBrand("UserID");
export type UserID = Static<typeof UserID>;

export const AlertResultID = String.withBrand("AlertResultID");
export type AlertResultID = Static<typeof AlertResultID>;

export const TabID = String.withBrand("TabID");
export type TabID = Static<typeof TabID>;

export const TrackingTabID = String.withBrand("TrackingTabID");
export type TrackingTabID = Static<typeof TrackingTabID>;
