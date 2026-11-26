import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Alert, Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";

import { Link45deg } from "react-bootstrap-icons";
import { DateTime } from "luxon";
import { isEmpty } from "lodash";
import { TenantID } from "../../../../types/identifiers";
import { deriveTenantId } from "../../../../utils/tenant";
import { DataController, PatientController, ProcedureTypeDto } from "@api";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import { useAuth } from "../../../../context/AuthContext";
import { useCopyToClipboard } from "@uidotdev/usehooks";
import toast from "react-hot-toast";
import { Fact, FactList } from "../../../Admin/FactList";
import { SectionHeader } from "../../../SectionHeader";
import { cancelOnEscape } from "../../../../utils/keyboard";

const tenantId = deriveTenantId() as TenantID;

// Short clinical descriptors for the ASA physical status classes (ASA_1..ASA_6),
// so the editor shows what each class means rather than an opaque enum name.
const ASA_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ASA_1", label: "1 - Normal healthy patient" },
  { value: "ASA_2", label: "2 - Mild systemic disease" },
  { value: "ASA_3", label: "3 - Severe systemic disease" },
  {
    value: "ASA_4",
    label: "4 - Severe systemic disease, constant threat to life",
  },
  { value: "ASA_5", label: "5 - Moribund, not expected to survive" },
  { value: "ASA_6", label: "6 - Brain-dead, organs removed for donation" },
];

const asaStatusLabel = (value?: string | null) =>
  ASA_STATUS_OPTIONS.find((option) => option.value === value)?.label ??
  value ??
  "-- None --";

export type OperationTabProps = {
  isActive: boolean;
  context: ApplicationLaunchContext;
  setContext: Dispatch<SetStateAction<ApplicationLaunchContext | undefined>>;
};

const toDateTimeInputValue = (value?: string | null) =>
  value ? DateTime.fromISO(value).toFormat("yyyy-MM-dd'T'HH:mm") : "";

function OperationDateField({
  controlId,
  label,
  value,
  savedValue,
  onChange,
}: {
  controlId: string;
  label: string;
  value: string;
  savedValue?: string | null;
  onChange(value: string): void;
}) {
  const saved = toDateTimeInputValue(savedValue);
  return (
    <Form.Group className="admin-field" controlId={controlId}>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={
          value === saved ? undefined : cancelOnEscape(() => onChange(saved))
        }
      />
    </Form.Group>
  );
}

export function OperationTab({
  isActive,
  context,
  setContext,
}: OperationTabProps) {
  const [startTime, setStartTime] = useState<string>(
    toDateTimeInputValue(context.operation.startTime),
  );
  const [endTime, setEndTime] = useState<string>(
    toDateTimeInputValue(context.operation.endTime),
  );
  const [admissionDate, setAdmissionDate] = useState<string>(
    toDateTimeInputValue(context.operation.admissionDate),
  );
  const [inductionStartTime, setInductionStartTime] = useState<string>(
    toDateTimeInputValue(context.operation.inductionStartTime),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "danger";
    text: string;
  } | null>(null);
  const { user } = useAuth();
  const [_, copyToClipboard] = useCopyToClipboard();
  const [procedureTypeCatalog, setProcedureTypeCatalog] = useState<
    ProcedureTypeDto[]
  >([]);
  const [editingQualifierFor, setEditingQualifierFor] = useState<string | null>(
    null,
  );
  const [editingAcuity, setEditingAcuity] = useState(false);
  const [editingAsaStatus, setEditingAsaStatus] = useState(false);

  const syncFormFromOperation = (
    operation: ApplicationLaunchContext["operation"],
  ) => {
    setStartTime(toDateTimeInputValue(operation.startTime));
    setEndTime(toDateTimeInputValue(operation.endTime));
    setAdmissionDate(toDateTimeInputValue(operation.admissionDate));
    setInductionStartTime(toDateTimeInputValue(operation.inductionStartTime));
  };

  useEffect(() => {
    syncFormFromOperation(context.operation);
  }, [context.operation]);

  useEffect(() => {
    DataController.getProcedureTypes().then(({ data }) => {
      if (data) setProcedureTypeCatalog(data);
    });
  }, []);

  const handleAcuityChange = async (acuity: string) => {
    setEditingAcuity(false);
    try {
      await PatientController.updateOperationAcuity({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
        body: { acuity: acuity || undefined },
        headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
        throwOnError: true,
      });
      setContext((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          operation: {
            ...prev.operation,
            acuity: acuity || null,
          },
        };
      });
    } catch (error) {
      console.error("Error updating acuity:", error);
      setMessage({ type: "danger", text: "Failed to update acuity." });
    }
  };

  const handleAsaStatusChange = async (asaStatus: string) => {
    setEditingAsaStatus(false);
    try {
      await PatientController.updateOperationAsaStatus({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
        body: { asaStatus: asaStatus || undefined },
        headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
        throwOnError: true,
      });
      setContext((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          operation: {
            ...prev.operation,
            asaStatus: asaStatus || null,
          },
        };
      });
    } catch (error) {
      console.error("Error updating ASA status:", error);
      setMessage({ type: "danger", text: "Failed to update ASA status." });
    }
  };

  const handleQualifierChange = async (
    procedureTypeId: string,
    qualifier: string,
  ) => {
    setEditingQualifierFor(null);
    try {
      await PatientController.updateProcedureTypeQualifier({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
          procedureTypeId,
        },
        body: { qualifier: qualifier || undefined },
        headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
        throwOnError: true,
      });
      setContext((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          operation: {
            ...prev.operation,
            procedureTypes: prev.operation.procedureTypes.map((pt) =>
              pt.procedureId === procedureTypeId
                ? { ...pt, qualifier: qualifier || null }
                : pt,
            ),
          },
        };
      });
    } catch (error) {
      console.error("Error updating qualifier:", error);
      setMessage({ type: "danger", text: "Failed to update qualifier." });
    }
  };

  const handleCopyLaunchLink = async () => {
    const url = new URL(window.location.origin);
    url.pathname = `/api/launch-by-operation/${context.operation.operationId}`;
    if (tenantId) {
      url.searchParams.set("client_id", tenantId);
    }
    try {
      await copyToClipboard(url.toString());
      toast.success("Copied launch-link to clipboard.");
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Unable to copy link.");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const submittedStartTime = startTime
        ? new Date(startTime).toISOString()
        : null;
      const submittedEndTime = endTime ? new Date(endTime).toISOString() : null;
      const submittedAdmissionDate = admissionDate
        ? new Date(admissionDate).toISOString()
        : null;
      const submittedInductionStartTime = inductionStartTime
        ? new Date(inductionStartTime).toISOString()
        : null;

      const { data } = await PatientController.updateOperationDates({
        path: {
          patientId: context.patient.pmrn,
          caseId: context.operation.caseId,
        },
        body: {
          startTime: submittedStartTime ?? undefined,
          endTime: submittedEndTime ?? undefined,
          admissionDate: submittedAdmissionDate ?? undefined,
          inductionStartTime: submittedInductionStartTime ?? undefined,
        },
        headers: tenantId ? { "X-Tenant-Id": tenantId } : undefined,
        throwOnError: true,
      });

      // Only update the fields this endpoint is responsible for; keep everything else intact.
      const updatedOperation: ApplicationLaunchContext["operation"] = {
        ...context.operation,
        startTime:
          data?.startTime ?? submittedStartTime ?? context.operation.startTime,
        endTime: data?.endTime ?? submittedEndTime ?? context.operation.endTime,
        admissionDate:
          data?.admissionDate ??
          submittedAdmissionDate ??
          context.operation.admissionDate,
        inductionStartTime:
          data?.inductionStartTime ??
          submittedInductionStartTime ??
          context.operation.inductionStartTime,
      };
      setContext((prev) =>
        prev
          ? {
              ...prev,
              operation: updatedOperation,
            }
          : prev,
      );
      syncFormFromOperation(updatedOperation);
      setMessage({
        type: "success",
        text: "Operation dates updated successfully!",
      });
    } catch (error) {
      console.error("Error updating operation dates:", error);
      setMessage({
        type: "danger",
        text: `Failed to update operation dates: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-section">
      <SectionHeader
        title="Operation Info"
        actions={
          <OverlayTrigger
            overlay={
              <Tooltip>
                <small>Copy launch-link to clipboard</small>
              </Tooltip>
            }
          >
            <Button
              variant="link"
              className="admin-link-button"
              onClick={handleCopyLaunchLink}
            >
              <Link45deg aria-hidden="true" /> Launch link
            </Button>
          </OverlayTrigger>
        }
      />
      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      <FactList>
        <Fact label="Case ID">{context.operation.caseId}</Fact>
        <Fact label="Acuity">
          {editingAcuity ? (
            <Form.Select
              size="sm"
              autoFocus
              defaultValue={context.operation.acuity ?? ""}
              onChange={(e) => handleAcuityChange(e.target.value)}
              onBlur={() => setEditingAcuity(false)}
              onKeyDown={cancelOnEscape(() => setEditingAcuity(false))}
              className="w-auto"
            >
              <option value="">-- None --</option>
              <option value="ELECTIVE">ELECTIVE</option>
              <option value="NON_URGENT">NON_URGENT</option>
              <option value="URGENT">URGENT</option>
              <option value="EMERGENT">EMERGENT</option>
            </Form.Select>
          ) : (
            <span
              role="button"
              className="text-decoration-underline pointer"
              onClick={() => setEditingAcuity(true)}
            >
              {context.operation.acuity ?? "-- None --"}
            </span>
          )}
        </Fact>
        <Fact label="ASA Status" wide>
          {editingAsaStatus ? (
            <Form.Select
              size="sm"
              autoFocus
              defaultValue={context.operation.asaStatus ?? ""}
              onChange={(e) => handleAsaStatusChange(e.target.value)}
              onBlur={() => setEditingAsaStatus(false)}
              onKeyDown={cancelOnEscape(() => setEditingAsaStatus(false))}
              className="w-auto"
            >
              <option value="">-- None --</option>
              {ASA_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          ) : (
            <span
              role="button"
              className="text-decoration-underline pointer"
              onClick={() => setEditingAsaStatus(true)}
            >
              {asaStatusLabel(context.operation.asaStatus)}
            </span>
          )}
        </Fact>
        <Fact label="Primary Practitioner">
          {context.operation.primaryPractitionerName || "--"}
        </Fact>
        <Fact label="Baseline MAP">
          {context.operation.baselineMAP && context.operation.baselineMAP.value
            ? context.operation.baselineMAP.value +
              " " +
              context.operation.baselineMAP.units
            : "--"}
        </Fact>
      </FactList>
      <div className="admin-filters mt-4">
        <OperationDateField
          controlId="operation-start-time"
          label="Start Date"
          value={startTime}
          savedValue={context.operation.startTime}
          onChange={setStartTime}
        />
        <OperationDateField
          controlId="operation-end-time"
          label="End Date"
          value={endTime}
          savedValue={context.operation.endTime}
          onChange={setEndTime}
        />
        <OperationDateField
          controlId="operation-admission"
          label="Admission Date"
          value={admissionDate}
          savedValue={context.operation.admissionDate}
          onChange={setAdmissionDate}
        />
        <OperationDateField
          controlId="operation-induction"
          label="Induction Start Time"
          value={inductionStartTime}
          savedValue={context.operation.inductionStartTime}
          onChange={setInductionStartTime}
        />
        <div className="admin-filters__actions">
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? "Saving..." : "Save Dates"}
          </Button>
        </div>
      </div>
      <FactList>
        <Fact label="Procedure Types" wide>
          {!isEmpty(context.operation.procedureTypes) ? (
            <ul className="mb-0 ps-3">
              {context.operation.procedureTypes.map((type) => {
                const catalog = procedureTypeCatalog.find(
                  (p) => p.procedureId === type.procedureId,
                );
                const availableQualifiers = catalog?.availableQualifiers ?? [];
                const isEditing = editingQualifierFor === type.procedureId;

                return (
                  <li key={type.procedureId}>
                    {type.procedureName} ({type.procedureId})
                    {availableQualifiers.length > 0 && (
                      <ul>
                        <li>
                          {isEditing ? (
                            <Form.Select
                              size="sm"
                              autoFocus
                              defaultValue={type.qualifier ?? ""}
                              onChange={(e) =>
                                handleQualifierChange(
                                  type.procedureId,
                                  e.target.value,
                                )
                              }
                              onBlur={() => setEditingQualifierFor(null)}
                              onKeyDown={cancelOnEscape(() =>
                                setEditingQualifierFor(null),
                              )}
                              className="w-auto"
                            >
                              <option value="">-- None --</option>
                              {availableQualifiers.map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </Form.Select>
                          ) : (
                            <span
                              role="button"
                              className="text-decoration-underline pointer"
                              onClick={() =>
                                setEditingQualifierFor(type.procedureId)
                              }
                            >
                              {type.qualifier ?? "-- None --"}
                            </span>
                          )}
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            "--"
          )}
        </Fact>
      </FactList>
    </section>
  );
}
