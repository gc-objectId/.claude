import { createContext, useContext } from "react";
import { CaseID, PatientID, TenantID } from "../types/identifiers";

type AdminPanelContextValue = {
  tenantId?: TenantID;
  patientId?: PatientID;
  caseId?: CaseID;
};

const AdminPanelContext = createContext<AdminPanelContextValue>({});

export const AdminPanelProvider = AdminPanelContext.Provider;

export function useAdminPanelContext(): AdminPanelContextValue {
  return useContext(AdminPanelContext);
}
