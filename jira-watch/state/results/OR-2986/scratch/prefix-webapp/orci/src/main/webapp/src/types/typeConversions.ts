import type {
  AlertDefinition as GeneratedAlertDefinition,
  PatientDto,
} from "@api";
import { AlertResultID, PatientID, RuleID } from "./identifiers";
import { PromptTypeEnum } from "./PromptType";
import { AlertDefinition } from "./AlertDefinition";
import { Patient } from "./Patient";

// The hand-rolled, runtypes-checked AlertDefinition and Patient contracts predate the
// generated API client; these adapters bridge the generated DTOs back onto them. Remove
// both once every call site is converted to the generated client and the hand-rolled
// contracts are retired.

export const toHandRolledAlert = (
  alert: GeneratedAlertDefinition,
): AlertDefinition => ({
  resultId: alert.resultId as AlertResultID,
  ruleIdentifier: alert.ruleIdentifier as RuleID,
  ruleTrigger: alert.ruleTrigger ?? null,
  title: alert.title,
  tabName: alert.tabName ?? null,
  description: alert.description,
  acceptText: alert.acceptText,
  rejectText: alert.rejectText,
  rejectReasons: alert.rejectReasons.map((reason) => ({
    rejectionReason: reason.rejectionReason,
    reason: reason.reason,
    customInput: reason.customInput,
    customInputLabel: reason.customInputLabel ?? null,
  })),
  citations: alert.citations.map((citation) => ({
    id: citation.id,
    label: citation.label,
    url: citation.url,
    citation: citation.citation ?? null,
    ruleId: citation.ruleId,
  })),
  promptText: alert.promptText
    ? {
        promptType: (alert.promptText.promptType ??
          PromptTypeEnum.INFO) as PromptTypeEnum,
        displayText: alert.promptText.displayText ?? null,
      }
    : null,
  allowSuppression: alert.allowSuppression,
  allowAllergySuppression: alert.allowAllergySuppression,
  allowMarkTolerated: alert.allowMarkTolerated,
  relevantAllergies: alert.relevantAllergies.map((allergy) => ({
    id: allergy.id,
    allergen: allergy.allergen,
    reaction: allergy.reaction ?? "",
    displayReaction: allergy.displayReaction ?? "",
    severity: allergy.severity ?? "",
  })),
});

export function toHandRolledPatient(patient: PatientDto): Patient {
  return {
    id: patient.id,
    firstName: patient.firstName ?? "",
    lastName: patient.lastName ?? "",
    fullName: patient.fullName ?? "",
    mrn: patient.mrn,
    age: patient.age ?? 0,
    height: patient.height ?? "",
    weight: patient.weight ?? "",
    heightInCustomaryFormat: patient.heightInCustomaryFormat ?? "",
    weightInCustomaryFormat: patient.weightInCustomaryFormat ?? "",
    weightValue: patient.weightValue ?? 0,
    weightUnits: patient.weightUnits ?? "",
    gender: patient.gender ?? "UNKNOWN",
    genderIdentity: patient.genderIdentity ?? null,
    pmrn: patient.pmrn as PatientID,
    dob: patient.dob ?? "",
    epicPatientId: patient.epicPatientId ?? null,
    birthWeight: patient.birthWeight ?? null,
    birthHeight: patient.birthHeight ?? null,
    gestationalAgeAtBirth: patient.gestationalAgeAtBirth ?? null,
    postmenstrualAge: patient.postmenstrualAge ?? null,
    pediatricStatus: patient.pediatricStatus ?? null,
    pregnant: patient.pregnant,
  };
}
