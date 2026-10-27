import { useWebsocketOperationHeartbeat } from "../context/WebsocketContext";
import { PropsWithChildren } from "react";
import { useAppQueryParams } from "../hooks/hooks";

export function OperationHeartbeat({ children }: PropsWithChildren) {
  const queryParams = useAppQueryParams();
  useWebsocketOperationHeartbeat(
    queryParams.tenantId,
    queryParams.patientId,
    queryParams.caseId,
  );
  return <>{children}</>;
}
