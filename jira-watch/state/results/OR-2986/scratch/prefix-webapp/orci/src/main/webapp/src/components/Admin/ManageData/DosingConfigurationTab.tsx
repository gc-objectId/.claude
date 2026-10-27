import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "../../../context/TenantContext";
import {
  Badge,
  OverlayTrigger,
  Popover,
  Spinner,
  Table,
} from "react-bootstrap";
import React from "react";
import { ArrowRight } from "react-bootstrap-icons";
import {
  AgeRangeCriteria,
  DoseAttemptCriteria,
  DosingConfigDto,
  DosingConfigurationsController,
  FlatDoseOption,
  MedicationDosingConfig,
  PediatricStatusCriteria,
  PostmenstrualAgeCriteria,
  WeightBasedDoseOption,
  WeightRangeCriteria,
} from "@api";

export function DosingConfigurationTab({ isActive }: { isActive: boolean }) {
  const tenantId = useTenantId();
  const dosingConfigQ = useQuery<DosingConfigDto[]>({
    queryKey: ["dosing-configurations", tenantId],
    queryFn: async () => {
      const response =
        await DosingConfigurationsController.getDosingConfigurations({
          headers: {
            "X-Tenant-Id": tenantId,
          },
        });
      if (response.data) {
        return response.data;
      }

      throw response.error ?? new Error("Failed to load dosing configurations");
    },
    enabled: isActive,
  });

  if (dosingConfigQ.status === "pending") {
    return <Spinner />;
  }
  if (dosingConfigQ.status === "error") {
    return (
      <div>
        Error loading
        <pre>{String(dosingConfigQ.error)}</pre>
      </div>
    );
  }

  return (
    <div>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>Criteria</th>
            <th>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Popover id="ndc-header-popover">
                    <Popover.Body>
                      There may be multiple NDCs, one per concentration. A
                      bolded NDC indicates the default concentration/NDC for the
                      medication.
                    </Popover.Body>
                  </Popover>
                }
              >
                <span
                  style={{ textDecoration: "underline dotted", cursor: "help" }}
                >
                  Default NDC(s)
                </span>
              </OverlayTrigger>
            </th>
            <th>Dosing config</th>
          </tr>
        </thead>
        <tbody>
          {dosingConfigQ.data.map(({ medId, config }, index) => {
            if (config == null) {
              return <></>;
            }
            return (
              <tr key={medId + "-" + index} className="align-middle pointer">
                <td>{medId}</td>
                <td>
                  <ul>
                    {config.criteria?.map((criterion, i) => (
                      <li key={`${criterion.type ?? "criterion"}-${i}`}>
                        {renderCriterionDetails(criterion)}
                      </li>
                    )) ?? <span>-</span>}
                  </ul>
                </td>
                <td>
                  <DefaultNDCDisplay config={config} />
                </td>
                <td>
                  {config.routeOptions?.map((route, i) => (
                    <OverlayTrigger
                      key={route}
                      placement="right"
                      overlay={
                        <Popover id="popover-basic">
                          <Popover.Header as="h3">Dosing config</Popover.Header>
                          <Popover.Body>
                            <ConfigPopover route={route} config={config} />
                          </Popover.Body>
                        </Popover>
                      }
                    >
                      <Badge bg="secondary" className="me-2">
                        {route}
                      </Badge>
                    </OverlayTrigger>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

type Criterion =
  | AgeRangeCriteria
  | DoseAttemptCriteria
  | PediatricStatusCriteria
  | PostmenstrualAgeCriteria
  | WeightRangeCriteria
  | { type?: string; [key: string]: unknown };

const renderRange = (label: string, lower?: string, upper?: string) =>
  `${label}: ${lower ?? "-"} to ${upper ?? "-"}`;

function renderCriterionDetails(criterion: Criterion) {
  switch (criterion?.type) {
    case "AgeRangeCriteria":
    case "age_range":
      return renderRange(
        "Age",
        (criterion as AgeRangeCriteria).ageLowerThreshold,
        (criterion as AgeRangeCriteria).ageUpperThreshold,
      );
    case "WeightRangeCriteria":
    case "weight_range":
      return renderRange(
        "Weight",
        (criterion as WeightRangeCriteria).weightLowerThreshold,
        (criterion as WeightRangeCriteria).weightUpperThreshold,
      );
    case "PostmenstrualAgeCriteria":
    case "postmenstrual_age":
      return renderRange(
        "PMA",
        (criterion as PostmenstrualAgeCriteria).pmaLowerThreshold,
        (criterion as PostmenstrualAgeCriteria).pmaUpperThreshold,
      );
    case "DoseAttemptCriteria":
    case "dose_attempt":
      return `Dose attempt: ${
        (criterion as DoseAttemptCriteria).doseAttempt ?? "-"
      }`;
    case "PediatricStatusCriteria":
    case "pediatric_status":
      return `Pediatric status: ${
        (criterion as PediatricStatusCriteria).pediatricStatus ?? "-"
      }`;
    default:
      return criterion?.type ?? "Unknown criterion";
  }
}

function ConfigPopover({
  config,
  route,
}: {
  config: MedicationDosingConfig;
  route: string;
}) {
  const routeDoseOptions = config.routeDoseOptions?.[route];
  const wtRouteDoseOptions = config.routeWeightBasedDoseOptions?.[route];
  const concentrationConfig = config.concentrationOptions;
  const doses1 =
    routeDoseOptions?.map(
      (dose: FlatDoseOption) => dose.doseAmount + " " + dose.doseUnits,
    ) || [];
  const doses2 =
    wtRouteDoseOptions?.map(
      (dose: WeightBasedDoseOption) => dose.doseAmount + " " + dose.doseUnits,
    ) || [];

  return (
    <div>
      <div>
        <b>Doses:</b>
        <br />
        {[...doses1, ...doses2].map((dose) => (
          <Badge key={dose} bg="secondary" className="me-2">
            {dose}
          </Badge>
        ))}
      </div>

      {concentrationConfig && concentrationConfig.length > 0 && (
        <div className="mt-2">
          <b>Concentrations:</b>
          <br />
          {concentrationConfig.map((it, i) => (
            <div key={i}>
              {it.concentrations
                ?.map((conc) => conc.amount + " " + conc.unit)
                .join(", ")}{" "}
              <ArrowRight /> {it.defaultNDC}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getNDCTooltipContent(
  ndc: string,
  config: MedicationDosingConfig,
): string {
  const isMainDefault = config.defaultNDC === ndc;

  // Find concentration option that matches this NDC
  const concentrationOption = config.concentrationOptions?.find(
    (option) => option.defaultNDC === ndc,
  );

  let content = "";

  if (isMainDefault) {
    content = "Default NDC for medication";
  }

  if (
    concentrationOption?.concentrations &&
    concentrationOption?.concentrations?.length > 0
  ) {
    const concentrationText = concentrationOption?.concentrations
      ?.map((conc) => `${conc.amount} ${conc.unit}`)
      .join(", ");

    if (content) {
      content += ` - Concentration: ${concentrationText}`;
    } else {
      content = `Concentration: ${concentrationText}`;
    }
  }

  return content || "NDC";
}

function DefaultNDCDisplay({ config }: { config: MedicationDosingConfig }) {
  const allNDCs: string[] = [];

  // Add the main default NDC if it exists
  if (config.defaultNDC) {
    allNDCs.push(config.defaultNDC);
  }

  // Add all concentration default NDCs
  config.concentrationOptions?.forEach((concentrationOption) => {
    if (concentrationOption.defaultNDC) {
      allNDCs.push(concentrationOption.defaultNDC);
    }
  });

  // Remove duplicates (in case the main default NDC is also in concentration options)
  const uniqueNDCs = [...new Set(allNDCs)];

  if (uniqueNDCs.length === 0) {
    return <span></span>;
  }

  return (
    <span>
      {uniqueNDCs.map((ndc: string, index: number) => (
        <span key={ndc}>
          <OverlayTrigger
            placement="top"
            overlay={
              <Popover id={`ndc-popover-${ndc}`}>
                <Popover.Body>{getNDCTooltipContent(ndc, config)}</Popover.Body>
              </Popover>
            }
          >
            <span style={{ cursor: "help" }}>
              {index === 0 && config.defaultNDC === ndc ? (
                <strong>{ndc}</strong>
              ) : (
                ndc
              )}
            </span>
          </OverlayTrigger>
          {index < uniqueNDCs.length - 1 && ", "}
        </span>
      ))}
    </span>
  );
}
