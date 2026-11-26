import { createContext, useContext } from "react";
import { TenantID } from "../types/identifiers";
import { useAppQueryParams } from "../hooks/hooks";

export const TenantContext = createContext<TenantID | null>(null);

export const useTenantId = () => {
  const { tenantId } = useAppQueryParams();
  const tenantFromContext = useContext(TenantContext);
  return tenantFromContext || tenantId;
};
