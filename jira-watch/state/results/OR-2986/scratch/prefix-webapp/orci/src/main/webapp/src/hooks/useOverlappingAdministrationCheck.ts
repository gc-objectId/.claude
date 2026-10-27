import { useEffect, useState } from "react";
import { OverlappingAdministrationsController } from "@api";
import type { OverlappingAdministrationsResponseDto } from "@api";
import { useDebouncedCallback } from "use-debounce";
import { CaseID, NDC, PatientID, TenantID } from "../types/identifiers";
import { TimeHook } from "../components/dosing-form/TimeInput";

export function useOverlappingAdministrationCheck(
  tabIsSelected: boolean,
  tenantId: TenantID,
  patientId: PatientID,
  caseId: CaseID,
  ndc: NDC | null,
  timeInput: TimeHook,
) {
  const [overlappingAdministration, setOverlappingAdministration] = useState<
    OverlappingAdministrationsResponseDto | undefined
  >();

  useEffect(() => {
    // clear whenever the date changes
    setOverlappingAdministration(undefined);
  }, [timeInput.state.asDate]);

  const fetchOverlappingMedAdmin = useDebouncedCallback(
    async (
      tenantId: TenantID,
      patientId: PatientID,
      caseId: CaseID,
      ndc: NDC,
      date: Date,
    ) => {
      if (!timeInput.state.isValid) {
        return;
      }
      const { data } =
        await OverlappingAdministrationsController.checkOverlappingAdministrations(
          {
            path: { patientId, caseId, ndc },
            body: { date: date.toISOString() },
            headers: { "X-Tenant-Id": tenantId },
          },
        );
      setOverlappingAdministration(
        data && typeof data === "object" ? data : undefined,
      );
    },
    500,
    { trailing: true, leading: false },
  );

  useEffect(() => {
    if (tabIsSelected && ndc) {
      fetchOverlappingMedAdmin(
        tenantId,
        patientId,
        caseId,
        ndc,
        timeInput.state.asDate,
      );
    }
  }, [
    tabIsSelected,
    caseId,
    tenantId,
    fetchOverlappingMedAdmin,
    ndc,
    patientId,
    timeInput.state.asDate,
  ]);

  return overlappingAdministration;
}
