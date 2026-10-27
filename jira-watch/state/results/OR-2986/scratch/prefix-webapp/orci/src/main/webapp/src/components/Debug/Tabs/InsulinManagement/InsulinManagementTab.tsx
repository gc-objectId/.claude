import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";
import type { InsulinDailyDoseCalculationDto, InsulinDailyDoseDto } from "@api";
import { PatientController } from "@api";
import { useTenantId } from "../../../../context/TenantContext";
import { ISCDebug } from "./ISCDebug";

export type InsulinManagementTabProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

function InsulinCalculationSection({
  title,
  calculation,
  variant,
}: {
  title: string;
  calculation: InsulinDailyDoseCalculationDto;
  variant: "primary" | "secondary" | "success";
}) {
  return (
    <div className="mb-4">
      <h5>{title}</h5>

      {calculation.totalDailyDose && (
        <Alert variant={variant}>
          <strong>Total Daily Dose:</strong> {calculation.totalDailyDose}
        </Alert>
      )}

      {calculation.hasInsulinButCalculationFailed && (
        <Alert variant="warning">
          Patient has insulin but calculation failed
        </Alert>
      )}

      {calculation.individualDoses?.length > 0 && (
        <div className="mb-3">
          <strong>Individual Doses:</strong>
          <ul>
            {calculation.individualDoses.map((dose, idx) => (
              <li key={idx}>{dose}</li>
            ))}
          </ul>
        </div>
      )}

      {calculation.trace?.length > 0 && (
        <details>
          <summary className="mb-2">
            <strong>Calculation Trace</strong>
          </summary>
          <pre className="p-2 bg-light border rounded">
            {calculation.trace.join("\n")}
          </pre>
        </details>
      )}

      {!calculation.totalDailyDose &&
        !calculation.hasInsulinButCalculationFailed && (
          <Alert variant="info">No data found</Alert>
        )}
    </div>
  );
}

export function InsulinManagementTab({
  context,
  isActive,
}: InsulinManagementTabProps) {
  const tenantId = useTenantId();
  const [insulinDose, setInsulinDose] = useState<InsulinDailyDoseDto | null>(
    null,
  );
  const [loadingInsulinDose, setLoadingInsulinDose] = useState(false);
  const [insulinDoseError, setInsulinDoseError] = useState<string | null>(null);

  const loadInsulinDose = useCallback(async () => {
    if (!context?.patient?.pmrn) return;

    setLoadingInsulinDose(true);
    setInsulinDoseError(null);
    try {
      const { data } = await PatientController.getInsulinDailyDose({
        path: { patientId: context.patient.pmrn },
        headers: { "X-Tenant-Id": tenantId },
      });
      setInsulinDose(data ?? null);
    } catch (e: any) {
      setInsulinDoseError(e.message);
    }
    setLoadingInsulinDose(false);
  }, [context?.patient?.pmrn, tenantId]);

  useEffect(() => {
    if (isActive && !insulinDose && !loadingInsulinDose) {
      loadInsulinDose();
    }
  }, [isActive, insulinDose, loadingInsulinDose, loadInsulinDose]);

  return (
    <div>
      <h3>Insulin Management</h3>

      <hr className="my-4" />

      <div className="mb-4">
        <h4>Insulin Daily Dose Calculation</h4>
        <div className="mb-3">
          <Button
            onClick={loadInsulinDose}
            disabled={loadingInsulinDose}
            variant="primary"
            size="sm"
          >
            {loadingInsulinDose ? (
              <>
                <Spinner size="sm" className="me-2" />
                Loading...
              </>
            ) : (
              "Calculate Insulin Daily Dose"
            )}
          </Button>
        </div>

        {insulinDoseError && (
          <Alert variant="danger" className="mt-2">
            Error: {insulinDoseError}
          </Alert>
        )}

        {insulinDose && (
          <>
            <div className="mt-3">
              <InsulinCalculationSection
                title="Total Daily Dose (Home)"
                calculation={insulinDose.home}
                variant="success"
              />
            </div>
            <div className="mt-3">
              <InsulinCalculationSection
                title="Total Daily Dose (Med Admins)"
                calculation={insulinDose.medAdmin}
                variant="success"
              />
            </div>
          </>
        )}
      </div>

      <hr className="my-4" />

      <ISCDebug context={context} isActive={isActive} />
    </div>
  );
}
