import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Spinner, Table } from "react-bootstrap";
import {
  type AntibioticCandidateDebugDto,
  type OptionDebug,
  type PathwayDebug,
  type ProcedureDebug,
  type ProcedureAntibioticOptionDto,
  PatientController,
} from "@api";
import { isLoading, Loadable, loading } from "../../../../types/Loadable";
import { ApplicationLaunchContext } from "../../../../types/ApplicationLaunchContext";

export type AntibioticCandidatesProps = {
  context: ApplicationLaunchContext;
  isActive: boolean;
};

type OptionStatus = NonNullable<OptionDebug["status"]>;

const STATUS_VARIANT: Record<OptionStatus, string> = {
  RECOMMENDED: "success",
  CONTRAINDICATED: "danger",
  NOT_SELECTED: "secondary",
};

const STATUS_LABEL: Record<OptionStatus, string> = {
  RECOMMENDED: "recommended",
  CONTRAINDICATED: "contraindicated",
  NOT_SELECTED: "not selected",
};

export function AntibioticCandidatesTab({
  context,
  isActive,
}: AntibioticCandidatesProps) {
  const patientId = context.patient.pmrn;
  const caseId = context.operation.caseId;
  const [resolution, setResolution] = useState<
    Loadable<AntibioticCandidateDebugDto>
  >(loading());

  const loadAntibioticCandidates = useCallback(() => {
    setResolution(loading());
    PatientController.getAntibioticCandidates({
      path: { patientId, caseId },
    }).then(({ data }) => setResolution(data ?? {}));
  }, [patientId, caseId]);

  useEffect(() => {
    if (isActive) loadAntibioticCandidates();
  }, [loadAntibioticCandidates, isActive]);

  const display = useMemo(() => {
    if (isLoading(resolution)) {
      return <Spinner />;
    }
    return (
      <>
        <Outcome resolution={resolution} />
        {(resolution.procedures ?? []).map((procedure) => (
          <Procedure
            key={procedure.procedure?.procedureId ?? ""}
            procedure={procedure}
          />
        ))}
      </>
    );
  }, [resolution]);

  return (
    <div>
      <Button className="mb-3" onClick={() => loadAntibioticCandidates()}>
        reload
      </Button>
      {display}
    </div>
  );
}

/** What the case resolved to: the outcome, the candidates offered, and what was ruled out. */
function Outcome({ resolution }: { resolution: AntibioticCandidateDebugDto }) {
  const recommended = resolution.recommended ?? [];
  const contraindicated = resolution.contraindicated ?? [];
  const unmapped = resolution.unmappedSourceProcedures ?? [];
  return (
    <div className="mb-4">
      <h5>
        Outcome <Badge bg="primary">{resolution.outcome ?? "unknown"}</Badge>{" "}
        {resolution.caseAcuity && (
          <Badge bg="info">case acuity: {resolution.caseAcuity}</Badge>
        )}
      </h5>
      <div>
        <strong>Recommended candidates: </strong>
        {recommended.length === 0 ? (
          <span className="text-muted">none</span>
        ) : (
          recommended.map((option, index) => (
            <Badge key={index} bg="success" className="me-1">
              {optionLabel(option)}
            </Badge>
          ))
        )}
      </div>
      <div>
        <strong>Contraindicated categories: </strong>
        {contraindicated.length === 0 ? (
          <span className="text-muted">none</span>
        ) : (
          contraindicated.map((category) => (
            <Badge key={category} bg="danger" className="me-1">
              {category}
            </Badge>
          ))
        )}
      </div>
      {unmapped.length > 0 && (
        <div>
          <strong>Source procedures that mapped to nothing: </strong>
          {unmapped.map((sourceValue) => (
            <Badge key={sourceValue} bg="warning" text="dark" className="me-1">
              {sourceValue}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** One procedure on the case, with every pathway configured for it. */
function Procedure({ procedure }: { procedure: ProcedureDebug }) {
  const pathways = procedure.pathways ?? [];
  return (
    <div className="mb-4">
      <h6>
        {procedure.procedure?.procedureName ?? "unnamed"}{" "}
        <code>{procedure.procedure?.procedureId}</code>{" "}
        {procedure.procedureRisk && (
          <Badge bg="info">procedure risk: {procedure.procedureRisk}</Badge>
        )}
      </h6>
      {pathways.length === 0 ? (
        <div className="text-muted">no pathways configured</div>
      ) : (
        pathways.map((pathway) => (
          <Pathway key={pathway.position} pathway={pathway} />
        ))
      )}
    </div>
  );
}

/**
 * One pathway: the notation it was configured in, then a row per option so a reader can see which
 * step answered and which options were ruled out.
 */
function Pathway({ pathway }: { pathway: PathwayDebug }) {
  const steps = pathway.steps ?? [];
  const acuities = pathway.acuities ?? [];
  return (
    <div className={pathway.appliesToCase ? "mb-3" : "mb-3 opacity-50"}>
      <div>
        <Badge bg="light" text="dark">
          pathway {pathway.position}
        </Badge>{" "}
        <Badge bg="secondary">
          {pathway.risk
            ? `${pathway.risk} procedure risk only`
            : "any procedure risk"}
        </Badge>{" "}
        <Badge bg="secondary">
          {acuities.length === 0
            ? "any case acuity"
            : `${acuities.join(", ")} case acuity only`}
        </Badge>{" "}
        {!pathway.appliesToCase && (
          <Badge bg="warning" text="dark">
            not applicable to this case
          </Badge>
        )}
        {pathway.noProphylaxis && <Badge bg="dark">no prophylaxis</Badge>}
      </div>
      {pathway.notation && (
        <div>
          <code>{pathway.notation}</code>
        </div>
      )}
      {steps.length > 0 && (
        <Table size="sm" bordered className="mt-1 mb-0">
          <thead>
            <tr>
              <th style={{ width: "5rem" }}>step</th>
              <th>option</th>
              <th style={{ width: "10rem" }}>status</th>
            </tr>
          </thead>
          <tbody>
            {steps.flatMap((step) =>
              (step.options ?? []).map((option, index) => (
                <tr key={`${step.stepNumber}-${index}`}>
                  {index === 0 && (
                    <td rowSpan={(step.options ?? []).length}>
                      {step.stepNumber}
                    </td>
                  )}
                  <td>
                    {(option.medicationCategories ?? []).join(" AND ") ||
                      "<empty>"}
                  </td>
                  <td>
                    <Badge bg={statusVariant(option.status)}>
                      {statusLabel(option.status)}
                    </Badge>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/** The drugs of one offered option, as the configuration named them. */
function optionLabel(option: ProcedureAntibioticOptionDto): string {
  const drugs = (option.medicationCandidates ?? [])
    .map((candidate) => candidate.medicationCategory)
    .filter((category): category is string => Boolean(category));
  return `step ${option.stepNumber}: ${drugs.join(" AND ") || "<empty>"}`;
}

function statusVariant(status: OptionDebug["status"]): string {
  return status ? STATUS_VARIANT[status] : "secondary";
}

function statusLabel(status: OptionDebug["status"]): string {
  return status ? STATUS_LABEL[status] : "unknown";
}
