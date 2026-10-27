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
    <div>
      <h3>
        Operation Info
        <OverlayTrigger
          overlay={
            <Tooltip>
              <small>Copy launch-link to clipboard</small>
            </Tooltip>
          }
        >
          <Button
            variant="link"
            className="link-dark"
            onClick={handleCopyLaunchLink}
          >
            <Link45deg />
          </Button>
        </OverlayTrigger>
      </h3>
      {message && (
        <Alert
          variant={message.type}
          dismissible
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      <div>
        <div className="row mb-3">
          <dt className="col-3">Case ID</dt>
          <dd className="col-9">{context.operation.caseId}</dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">Acuity</dt>
          <dd className="col-9">
            {editingAcuity ? (
              <Form.Select
                size="sm"
                autoFocus
                defaultValue={context.operation.acuity ?? ""}
                onChange={(e) => handleAcuityChange(e.target.value)}
                onBlur={() => setEditingAcuity(false)}
                style={{ display: "inline-block", width: "auto" }}
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
                className="text-decoration-underline"
                style={{ cursor: "pointer" }}
                onClick={() => setEditingAcuity(true)}
              >
                {context.operation.acuity ?? "-- None --"}
              </span>
            )}
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">ASA Status</dt>
          <dd className="col-9">
            {editingAsaStatus ? (
              <Form.Select
                size="sm"
                autoFocus
                defaultValue={context.operation.asaStatus ?? ""}
                onChange={(e) => handleAsaStatusChange(e.target.value)}
                onBlur={() => setEditingAsaStatus(false)}
                style={{ display: "inline-block", width: "auto" }}
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
                className="text-decoration-underline"
                style={{ cursor: "pointer" }}
                onClick={() => setEditingAsaStatus(true)}
              >
                {asaStatusLabel(context.operation.asaStatus)}
              </span>
            )}
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">Start Date</dt>
          <dd className="col-9">
            <Form.Control
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">End Date</dt>
          <dd className="col-9">
            <Form.Control
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">Admission Date</dt>
          <dd className="col-9">
            <Form.Control
              type="datetime-local"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
            />
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">Induction Start Time</dt>
          <dd className="col-9">
            <Form.Control
              type="datetime-local"
              value={inductionStartTime}
              onChange={(e) => setInductionStartTime(e.target.value)}
            />
          </dd>
        </div>
        <div className="row mb-3">
          <dd className="col-9 offset-3">
            <Button onClick={handleSave} disabled={saving} variant="primary">
              {saving ? "Saving..." : "Save Dates"}
            </Button>
          </dd>
        </div>
        <div className="row mb-3">
          <dt className="col-3">Primary Practitioner</dt>
          <dd className="col-9">
            {context.operation.primaryPractitionerName || "--"}
          </dd>
        </div>
        <div className="row">
          <dt className="col-3">Procedure Types</dt>
          <dd className="col-9">
            {!isEmpty(context.operation.procedureTypes) ? (
              <ul>
                {context.operation.procedureTypes.map((type) => {
                  const catalog = procedureTypeCatalog.find(
                    (p) => p.procedureId === type.procedureId,
                  );
                  const availableQualifiers =
                    catalog?.availableQualifiers ?? [];
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
                                style={{
                                  display: "inline-block",
                                  width: "auto",
                                }}
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
                                className="text-decoration-underline"
                                style={{ cursor: "pointer" }}
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
          </dd>
        </div>
        <div className="row">
          <dt className="col-3">Baseline MAP</dt>
          <dd className="col-9">
            {context.operation.baselineMAP &&
            context.operation.baselineMAP.value
              ? context.operation.baselineMAP.value +
                " " +
                context.operation.baselineMAP.units
              : "--"}
          </dd>
        </div>
      </div>
    </div>
  );
}
