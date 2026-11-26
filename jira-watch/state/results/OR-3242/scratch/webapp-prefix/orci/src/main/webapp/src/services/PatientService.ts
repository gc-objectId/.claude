import {
  CaseID,
  EncounterID,
  OperationUUID,
  PatientID,
  PatientUUID,
  TenantID,
} from "../types/identifiers";
import { $request } from "../utils/request";
import { DosingFormPayload } from "../types/DosingFormPayload";
import { MedicationDosingDTO } from "../types/MedicationDosingDTO";
import { MedicationDosingCheckResponse } from "../types/MedicationDosingCheckResponse";
import { MedicationSelectionCheckResponse } from "../types/MedicationSelectionCheckResponse";
import { ApplicationLaunchContext } from "../types/ApplicationLaunchContext";

export class PatientService {
  async launchOperation(p: {
    patientId: PatientID;
    caseId: CaseID;
    clientId: TenantID;
    encounterId: EncounterID;
    forceLaunch?: boolean;
  }) {
    return await $request(
      {
        url: `/api/app-launch`,
        method: "POST",
        data: p,
        headers: {
          "X-Tenant-Id": p.clientId,
          "Content-Type": "application/json",
        },
      },
      ApplicationLaunchContext,
    );
  }

  /**
   * Deliberately hand-rolled rather than routed through the generated client: the
   * generated ApplicationLaunchContext marks every field optional, so it cannot satisfy
   * the runtypes shape the debugger tabs consume. `npm run generate:api` will still emit
   * a PatientController.getOperationContext accessor for this path; prefer this one.
   */
  async getOperationContext(
    patientUuid: PatientUUID,
    operationUuid: OperationUUID,
  ) {
    return await $request(
      {
        url: `/api/admin/patients/${patientUuid}/operations/${operationUuid}/context`,
        method: "GET",
      },
      ApplicationLaunchContext,
    );
  }

  async evaluateMedication(p: {
    patientId: PatientID;
    caseId: CaseID;
    clientId: TenantID;
    barcodeValue?: string;
    medicationIdentifier?: string;
    isReselection?: boolean;
  }) {
    return await $request(
      {
        url: `/api/cds/medication-selection/${p.patientId}/${p.caseId}`,
        method: "POST",
        data: {
          barcode: p.barcodeValue,
          medicationIdentifier: p.medicationIdentifier,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isReselection: p.isReselection,
        },
        headers: {
          "X-Tenant-Id": p.clientId,
          "Content-Type": "application/json",
        },
      },
      MedicationSelectionCheckResponse,
    );
  }

  async saveMedicationAdministration(p: {
    patientId: PatientID;
    caseId: CaseID;
    clientId: TenantID;
    dosingForm: DosingFormPayload;
  }) {
    return $request(
      {
        url: `/api/patient/${p.patientId}/${p.caseId}/medication-administration`,
        data: p.dosingForm,
        method: "POST",
        headers: {
          "X-Tenant-Id": p.clientId,
          "Content-Type": "application/json",
        },
      },
      MedicationDosingDTO,
    );
  }

  async submitMedicationDose(p: {
    patientId: PatientID;
    caseId: CaseID;
    clientId: TenantID;
    payload: DosingFormPayload;
  }) {
    return $request(
      {
        url: `/api/cds/medication-dose/${p.patientId}/${p.caseId}`,
        data: p.payload,
        method: "POST",
        headers: {
          "X-Tenant-Id": p.clientId,
          "Content-Type": "application/json",
        },
      },
      MedicationDosingCheckResponse,
    );
  }
}

export default PatientService;
