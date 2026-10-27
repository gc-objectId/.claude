import { ChangeEvent, Ref, useEffect, useState } from "react";
import { DebounceInput } from "react-debounce-input";
import { useHotkeys } from "react-hotkeys-hook";
import { CaseID, PatientID, TenantID, UserID } from "../types/identifiers";
import { MedicationSelectionCheckResponse } from "../types/MedicationSelectionCheckResponse";
import PatientService from "../services/PatientService";
import { APIUnknownError } from "../errors/APIError";
import { parseBarcode } from "../utils/barcodes";

import { logger } from "../utils/logger";
export type BarcodeInputProps = {
  patientId: PatientID;
  caseId: CaseID;
  clientId: TenantID;
  inputRef: Ref<any>;
  onNdcSelection(data: MedicationSelectionCheckResponse): void;
  onInvalidMedication(error: APIUnknownError, barcode?: string): void;
};
const BarcodeInput = ({
  patientId,
  caseId,
  clientId,
  inputRef,
  onNdcSelection,
  onInvalidMedication,
}: BarcodeInputProps) => {
  const [barcodeValue, setBarcodeValue] = useState("");
  const [show, setShow] = useState(false);

  useHotkeys("ctrl+b", () => setShow(!show));

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    logger.debug("input change: ", e);
    const val = e.target.value;
    if (val != null && val != "") {
      let barcode = parseBarcode(val);
      logger.debug("input change value: ", barcode);
      setBarcodeValue(barcode);
    }
  };

  useEffect(() => {
    if (barcodeValue == null || barcodeValue == "") {
      return;
    }

    const patientService = new PatientService();

    (async () => {
      const response = await patientService.evaluateMedication({
        caseId,
        barcodeValue: barcodeValue,
        clientId,
        patientId,
      });

      response.ifRight((data) => {
        if (!data) {
          console.warn(
            "No data in medication selection response for " + barcodeValue,
          );
        } else {
          logger.debug("Sending medication selection response: ");
          logger.debug(data);
          onNdcSelection(data);
        }
      });

      response.ifLeft((error) => {
        console.error(
          "Error getting medication selection response for ndc: ",
          barcodeValue,
          " error: ",
          error,
        );
        if (error instanceof APIUnknownError) {
          onInvalidMedication(error, barcodeValue);
        }
      });

      setBarcodeValue("");
    })();
  }, [barcodeValue]);

  return (
    <>
      {show && (
        <DebounceInput
          inputRef={inputRef}
          minLength={8}
          debounceTimeout={300}
          onChange={onInputChange}
          value={barcodeValue}
          autoFocus
          placeholder="NDC"
        />
      )}
    </>
  );
};

export default BarcodeInput;
