import MedicationForm from "./MedicationForm";
import { useEffect } from "react";
import { SettingsModal } from "./SettingsModal/SettingsModal";
import {
  CaseID,
  PatientID,
  RuleID,
  TenantID,
  UserID,
} from "../types/identifiers";
import { useRuleSettings } from "../hooks/hooks";
import { APIUnknownError } from "../errors/APIError";
import { RecentlyAdministeredMeds } from "./RecentlyAdministeredMeds/RecentlyAdministeredMeds";
import PatientService from "../services/PatientService";
import { FeatureKeyEnum, useFeatureFlag } from "../hooks/useFeatureFlag";

export type HomeProps = {
  patientId: PatientID;
  caseId: CaseID;
  userId: UserID;
  clientId: TenantID;
  medicationSelection(data: unknown): void;
  enableVitalSignOptIn: boolean;
  handleVitalSignsRuleOptIn(optIn: boolean): void;
  notifyOnVitalSignAlerts: boolean;
  showSettings: boolean;
  setShowSettings(showSettings: boolean): void;
  medicationScanError: string;
  onMedicationDropdownSelect(): void;
  onInvalidMedication(error: APIUnknownError): void;
  onDismissMedicationScanError?: () => void;
  isSelected: boolean;
};

const Home = ({
  patientId,
  caseId,
  clientId,
  medicationSelection,
  enableVitalSignOptIn,
  handleVitalSignsRuleOptIn,
  notifyOnVitalSignAlerts,
  showSettings,
  setShowSettings,
  medicationScanError,
  onMedicationDropdownSelect,
  onInvalidMedication,
  onDismissMedicationScanError,
  isSelected,
}: HomeProps) => {
  const ruleSettings = useRuleSettings();
  const showRecentlyAdministeredMeds = useFeatureFlag(
    FeatureKeyEnum.RECENTLY_ADMINISTERED_MEDS,
  );

  useEffect(() => {
    if (showSettings) {
      ruleSettings.fetchRuleSettings();
    }
  }, [showSettings]);

  const updateSuppressionSetting = async (
    ruleIds: RuleID[],
    suppressed: boolean,
  ) => {
    await ruleSettings.updateSuppressionSetting(ruleIds, suppressed);
    return ruleSettings.fetchRuleSettings();
  };

  const updateOptInSetting = async (optIn: boolean) => {
    await ruleSettings.updateVitalSignRulesOptInSetting(optIn);
    handleVitalSignsRuleOptIn(optIn);
  };
  return (
    <>
      <MedicationForm
        patientId={patientId}
        caseId={caseId}
        clientId={clientId}
        medicationSelection={medicationSelection}
        medicationScanError={medicationScanError}
        onMedicationDropdownSelect={onMedicationDropdownSelect}
        onInvalidMedication={onInvalidMedication}
        onDismissMedicationScanError={onDismissMedicationScanError}
      ></MedicationForm>
      {showRecentlyAdministeredMeds && (
        <RecentlyAdministeredMeds
          isSelected={isSelected}
          onSelectMed={async ({ medicationIdentifier, barcodeValue }) => {
            const patientService = new PatientService();
            const response = await patientService.evaluateMedication({
              caseId,
              patientId,
              clientId,
              medicationIdentifier,
              barcodeValue,
              isReselection: true,
            });
            medicationSelection(response.unsafeCoerce()); // intentional throw
          }}
        />
      )}

      <SettingsModal
        enableVitalSignOptIn={enableVitalSignOptIn}
        updateSuppressionSetting={updateSuppressionSetting}
        show={showSettings}
        onHide={() => setShowSettings(false)}
        caseId={caseId}
        setVitalSignAlerts={updateOptInSetting}
        notifyOnVitalSignAlerts={notifyOnVitalSignAlerts}
        ruleSettings={ruleSettings.ruleSettings}
      />
    </>
  );
};
export default Home;
