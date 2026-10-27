import {
  AddCitation,
  Guidance,
  GuidanceAction,
  SetDefaultDose,
  SetDoseOptions,
  SetMaxDose,
  ShowAlert,
  ShowBanner,
} from "../../../../types/Guidance";
import Accordion from "react-bootstrap/Accordion";
import React, { useEffect, useMemo, useState } from "react";
import { Card, Form, Table } from "react-bootstrap";
import { RuleCitation } from "../../../Alert/RuleCitation";
import { sanitizedHtml } from "../../../../utils/markup";
import Stack from "react-bootstrap/Stack";
import { groupBy } from "lodash";
import GuidanceAlert from "../../../GuidanceAlert";
import { DosingFormBanner } from "../../../dosing-form/DosingFormBanner";
import { DoseOption } from "../../../../types/DoseOption";
import type { RuleFailureResultDto, RuleNotFiredResultDto } from "@api";
import { RuleController } from "@api";

export type GuidanceDebuggerProps = {
  guidance: Guidance[];
  isActive: boolean;
};

function ShowBannerView({
  action: { bannerDefinition },
}: {
  action: ShowBanner;
}) {
  const { evaluationResultId, type, body, citations, ruleId } =
    bannerDefinition;
  return (
    <div>
      {body ? (
        <DosingFormBanner
          evaluationResultId={evaluationResultId}
          citations={citations}
          content={body}
          type={type}
          ruleId={ruleId}
        />
      ) : (
        <i>empty body</i>
      )}
    </div>
  );
}

function ShowAlertView({ action: { alertDefinition } }: { action: ShowAlert }) {
  const alerts = useMemo(() => [alertDefinition], [alertDefinition]);
  return (
    <div>
      <GuidanceAlert
        acceptAlert={() => {}}
        rejectAlert={async () => {
          return {};
        }}
        alerts={alerts}
        title=""
      />
    </div>
  );
}

function ShowSetDoseOptions({
  action: { target, doseOptions },
}: {
  action: SetDoseOptions;
}) {
  return (
    <div>
      <div className="mb-3">
        Target: <b>{target}</b>
      </div>
      <Stack direction="horizontal" gap={3}>
        {doseOptions.length === 0 && <i>Empty list</i>}
        {doseOptions.map((doseOption: DoseOption) => (
          <Card style={{ width: "18rem" }} key={doseOption.calculatedLabel}>
            <Card.Body>
              <Card.Title>
                {doseOption.calculatedDoseAmount}
                {doseOption.calculatedDoseUnits}
              </Card.Title>
              <Card.Text>
                <span
                  dangerouslySetInnerHTML={sanitizedHtml(
                    doseOption.weightBasedDoseCalculation,
                  )}
                ></span>
              </Card.Text>
            </Card.Body>
          </Card>
        ))}
      </Stack>
    </div>
  );
}

function ShowAddCitation({ action }: { action: AddCitation }) {
  return (
    <div>
      <RuleCitation citation={action.citation} />
      <hr />
      Location: <b>{action.location}</b>
    </div>
  );
}

function ShowSetDefaultDose({
  action: { defaultDose },
}: {
  action: SetDefaultDose;
}) {
  return (
    <div>
      Value:{" "}
      <b>
        {defaultDose.calculatedDoseAmount}
        {defaultDose.calculatedDoseUnits}
      </b>
    </div>
  );
}

function ShowSetMaxDose({ action: { maxDose } }: { action: SetMaxDose }) {
  const allowableOverage: any = maxDose.allowableOverage;
  const dose: any = maxDose.maxDose;
  return (
    <div>
      Value:{" "}
      <b>
        {dose.quantity.value}
        {dose.quantity.unit}
      </b>
      {allowableOverage && (
        <span>
          {" "}
          (with{" "}
          <b>
            {allowableOverage.quantity.value}
            {allowableOverage.quantity.unit}
          </b>{" "}
          allowable overage)
        </span>
      )}
    </div>
  );
}

function ShowJson({ action }: { action: GuidanceAction }) {
  return (
    <div>
      <pre>{JSON.stringify(action, null, 1)}</pre>
    </div>
  );
}

function GuidanceActionView({
  action,
  showJson,
}: {
  action: GuidanceAction;
  showJson: boolean;
}) {
  if (showJson) {
    return <ShowJson action={action} />;
  }

  if (action.type === "PREDICATE") {
    return (
      <div>
        <GuidanceActionView action={action.action} showJson={showJson} />
      </div>
    );
  }

  if (action.type === "SET_MAX_DOSE") {
    return <ShowSetMaxDose action={action} />;
  }

  if (action.type === "SET_DEFAULT_DOSE") {
    return <ShowSetDefaultDose action={action} />;
  }

  if (action.type === "ADD_CITATION") {
    return <ShowAddCitation action={action} />;
  }

  if (action.type === "SET_DOSE_OPTIONS") {
    return <ShowSetDoseOptions action={action} />;
  }

  if (action.type === "SHOW_BANNER") {
    return <ShowBannerView action={action} />;
  }

  if (action.type === "SHOW_ALERT") {
    return <ShowAlertView action={action} />;
  }

  return <ShowJson action={action} />;
}

export function GuidanceDebuggerTab({
  isActive,
  guidance,
}: GuidanceDebuggerProps) {
  const [showJson, setShowJson] = useState(false);
  const [abstainedRules, setAbstainedRules] = useState<RuleNotFiredResultDto[]>(
    [],
  );
  const [failedRules, setFailedRules] = useState<RuleFailureResultDto[]>([]);
  const [loadingAbstentions, setLoadingAbstentions] = useState(false);
  const [loadingFailures, setLoadingFailures] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      if (!isActive) return;

      // Fetch abstained rules and failed rules when guidance changes
      if (guidance.length <= 0) {
        setAbstainedRules([]);
        setFailedRules([]);
        return;
      }

      const firstGuidance = guidance[0];
      let executionId = firstGuidance.executionId;

      if (!executionId) {
        setLoadingAbstentions(false);
        setLoadingFailures(false);
        return;
      }

      try {
        setLoadingAbstentions(true);
        setLoadingFailures(true);

        const [abstainedResponse, failedResponse] = await Promise.all([
          RuleController.getAbstainedRules({
            path: { executionId },
          }),
          RuleController.getFailedRules({
            path: { executionId },
          }),
        ]);

        setAbstainedRules(abstainedResponse.data ?? []);
        setFailedRules(failedResponse.data ?? []);
      } catch (error) {
        console.error("Failed to fetch rules:", error);
      } finally {
        setLoadingAbstentions(false);
        setLoadingFailures(false);
      }
    };

    fetchRules();
  }, [isActive, guidance]);
  return (
    <div>
      <Form.Check // prettier-ignore
        type="switch"
        id="custom-switch"
        label="Show JSON"
        onChange={(e) => setShowJson(e.target.checked)}
      />
      <Accordion alwaysOpen={true}>
        {guidance.length === 0 && "No guidance"}
        {guidance.map((g) => {
          const groupedActions = groupBy(
            g.actions,
            (g) => (g as any).criteria?.applicableRoutes,
          );
          return (
            <Accordion.Item eventKey={g.ruleId} key={g.ruleId}>
              <Accordion.Header>{g.ruleId}</Accordion.Header>
              <Accordion.Body>
                <Stack direction={"vertical"} gap={3}>
                  {Object.entries(groupedActions).map(([key, actions]) => (
                    <React.Fragment key={key}>
                      <div className="fs-5">
                        {key !== "undefined" ? (
                          <div>
                            For route <b>{key}</b>
                            <hr />
                          </div>
                        ) : (
                          <div>
                            For all routes
                            <hr />
                          </div>
                        )}
                      </div>
                      {actions.map((action, i) => (
                        <Card className={"ms-3"} key={`${i}_${action.type}`}>
                          <Card.Header style={{ textTransform: "capitalize" }}>
                            {describeAction(action)}
                          </Card.Header>
                          <Card.Body>
                            <GuidanceActionView
                              action={action}
                              showJson={showJson}
                            />
                          </Card.Body>
                        </Card>
                      ))}
                    </React.Fragment>
                  ))}
                  <Card className="ms-3">
                    <Card.Header style={{ textTransform: "capitalize" }}>
                      Details
                    </Card.Header>
                    <Card.Body>
                      <pre>{JSON.stringify(g.details, null, 1)}</pre>
                    </Card.Body>
                  </Card>
                </Stack>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>

      {failedRules.length > 0 && (
        <Accordion alwaysOpen={true} className="mt-5">
          <Accordion.Item eventKey="errors">
            <Accordion.Header className="text-danger">
              Rules That Failed With Errors ({failedRules.length}){" "}
              {loadingFailures && "- loading..."}
            </Accordion.Header>
            {!loadingFailures && failedRules.length > 0 && (
              <Accordion.Body>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th style={{ width: "30%" }}>Rule ID</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRules
                      .sort((a, b) =>
                        a.ruleIdentifier.localeCompare(b.ruleIdentifier),
                      )
                      .map((rule) => (
                        <tr key={rule.id} className="table-danger">
                          <td>
                            <strong>{rule.ruleIdentifier}</strong>
                            <br />
                            <small className="text-muted">
                              {rule.exceptionClass}
                            </small>
                          </td>
                          <td>
                            <div className="mb-2">
                              <strong>Message:</strong> {rule.errorMessage}
                            </div>
                            <details>
                              <summary style={{ cursor: "pointer" }}>
                                Full Stack Trace
                              </summary>
                              <pre
                                style={{
                                  whiteSpace: "pre-wrap",
                                  fontSize: "0.85rem",
                                  margin: "0.5rem 0 0 0",
                                  maxHeight: "400px",
                                  overflow: "auto",
                                }}
                              >
                                {rule.error}
                              </pre>
                            </details>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            )}
          </Accordion.Item>
        </Accordion>
      )}

      {abstainedRules.length > 0 && (
        <Accordion alwaysOpen={true} className="mt-5">
          <Accordion.Item eventKey="abstained">
            <Accordion.Header>
              Rules That Abstained ({abstainedRules.length}){" "}
              {loadingAbstentions && "- loading..."}
            </Accordion.Header>
            {!loadingAbstentions && abstainedRules.length > 0 && (
              <Accordion.Body>
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Rule ID</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abstainedRules
                      .sort((a, b) =>
                        a.ruleIdentifier.localeCompare(b.ruleIdentifier),
                      )
                      .map((rule) => (
                        <tr key={rule.id}>
                          <td>{rule.ruleIdentifier}</td>
                          <td>{rule.explanation}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </Accordion.Body>
            )}
          </Accordion.Item>
        </Accordion>
      )}
    </div>
  );
}

function describeAction(action: GuidanceAction): string {
  if (action.type === "PREDICATE") {
    return describeAction(action.action);
  }

  return action.type
    .split("_")
    .map((it: string) => it.toLowerCase())
    .join(" ");
}
