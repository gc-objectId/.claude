import { useAppQueryParams } from "../hooks/hooks";
import { PropsWithChildren } from "react";
import { RuleSettingsContextProvider } from "../context/RuleSettingsContext";

export function AppLaunchWrapper({ children }: PropsWithChildren<{}>) {
  const appQueryParams = useAppQueryParams();
  return (
    <RuleSettingsContextProvider
      caseId={appQueryParams.caseId}
      userId={appQueryParams.userId}
      patientId={appQueryParams.patientId}
      tenantId={appQueryParams.tenantId}
    >
      {children}
    </RuleSettingsContextProvider>
  );
}
