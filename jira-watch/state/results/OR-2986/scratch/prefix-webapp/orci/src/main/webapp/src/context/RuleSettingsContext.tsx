import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from "react";
import { isLoading, Loadable, loading } from "../types/Loadable";
import {
  CaseID,
  PatientID,
  RuleID,
  TenantID,
  UserID,
} from "../types/identifiers";
import { RuleSettingsController } from "@api";
import type { VitalSignSettingsDto } from "@api";

import { logger } from "../utils/logger";
export type RuleSettingsContext_ = {
  ruleSettings: Loadable<VitalSignSettingsDto[]>;
  fetchRuleSettings(): Promise<void>;
  updateSuppressionSetting(
    ruleIds: RuleID[],
    suppressed: boolean,
  ): Promise<void>;
  updateVitalSignRulesOptInSetting(vitalSignRulesOptIn: boolean): Promise<void>;
  settingForRuleId(ruleId: RuleID): VitalSignSettingsDto | undefined;
  isRuleSuppressed(ruleId: RuleID): boolean;
};

export const RuleSettingsContext = createContext<RuleSettingsContext_>({
  ruleSettings: loading(),
  async fetchRuleSettings(): Promise<void> {
    throw new Error("Not Ready Yet");
  },
  async updateSuppressionSetting(): Promise<void> {},
  async updateVitalSignRulesOptInSetting(): Promise<void> {},
  settingForRuleId() {
    return undefined;
  },
  isRuleSuppressed() {
    return false;
  },
});

export function RuleSettingsContextProvider({
  children,
  patientId,
  caseId,
  userId,
  tenantId,
}: PropsWithChildren<{
  patientId: PatientID;
  caseId: CaseID;
  userId: UserID;
  tenantId: TenantID;
}>) {
  const [ruleSettings, setRuleSettings] = useState<
    Loadable<VitalSignSettingsDto[]>
  >(loading());

  const fetchRuleSettings = useCallback(async () => {
    const { data } = await RuleSettingsController.getRuleSettings({
      query: { patientId, caseId },
      headers: { "X-Tenant-Id": tenantId },
    });
    logger.debug("result of fetching rule settings", data);
    if (data) {
      setRuleSettings(Object.values(data));
    }
  }, [patientId, caseId, tenantId]);

  const updateSuppressionSetting = useCallback(
    async (ruleIds: RuleID[], suppressed: boolean) => {
      for (let ruleId of ruleIds) {
        await RuleSettingsController.setRuleSuppressed({
          path: { ruleId },
          query: { patientId, caseId },
          body: suppressed,
          headers: { "X-Tenant-Id": tenantId },
        });
      }
    },
    [patientId, caseId, tenantId],
  );

  const updateVitalSignRulesOptInSetting = useCallback(
    async (vitalSignRulesOptIn: boolean) => {
      await RuleSettingsController.updateVitalSignsRuleSettings({
        body: {
          patientId,
          caseId,
          userId,
          vitalSignRulesOptIn,
        },
        headers: { "X-Tenant-Id": tenantId },
      });
    },
    [patientId, caseId, userId, tenantId],
  );

  const value = useMemo<RuleSettingsContext_>(
    () => ({
      ruleSettings,
      fetchRuleSettings,
      updateSuppressionSetting,
      updateVitalSignRulesOptInSetting,
      settingForRuleId(ruleId: RuleID): VitalSignSettingsDto | undefined {
        if (isLoading(ruleSettings)) return undefined;
        return ruleSettings.find((it) => it.ruleIds.includes(ruleId));
      },
      isRuleSuppressed(ruleId: RuleID): boolean {
        return this.settingForRuleId(ruleId)?.suppressed || false;
      },
    }),
    [
      ruleSettings,
      fetchRuleSettings,
      updateSuppressionSetting,
      updateVitalSignRulesOptInSetting,
    ],
  );

  return (
    <RuleSettingsContext.Provider value={value}>
      {children}
    </RuleSettingsContext.Provider>
  );
}
