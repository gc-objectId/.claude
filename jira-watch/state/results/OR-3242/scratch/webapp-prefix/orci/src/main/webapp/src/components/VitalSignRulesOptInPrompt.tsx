import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";
import { RuleSettingsController } from "@api";
import { UserID } from "../types/identifiers";
import { ApplicationLaunchContext } from "../types/ApplicationLaunchContext";
import { useAppQueryParams } from "../hooks/hooks";

export type VitalSignRulesOptOutPromptProps = {
  context: ApplicationLaunchContext;
  userId: UserID;
  onOptInResponse(optIn: boolean): void;
};
const VitalSignRulesOptOutPrompt = ({
  context,
  userId,
  onOptInResponse,
}: VitalSignRulesOptOutPromptProps) => {
  const handleResponse = async (optIn: boolean) => {
    await RuleSettingsController.updateVitalSignsRuleSettings({
      body: {
        patientId: context.patient.pmrn,
        caseId: context.operation.caseId,
        userId,
        vitalSignRulesOptIn: optIn,
      },
    });
    onOptInResponse(optIn);
  };

  const handleOptIn = () => {
    handleResponse(true);
  };

  const handleOptOpt = () => {
    handleResponse(false);
  };

  const formatPrompt = (
    conditions: string[],
    baselineMAP: number | null,
    thresholdMAP: number,
  ) => {
    let baselineMAPText = "";
    if (baselineMAP) {
      baselineMAPText = ` and baseline MAP ${baselineMAP} mmHg`;
    }
    // default text
    let formattedPrompt = `MAP < ${thresholdMAP} mmHg for more than 6 minutes has been shown to increase risk of poor outcomes (myocardial and renal injury).`;
    let secondPhrase = formattedPrompt;
    if (thresholdMAP > 55) {
      secondPhrase =
        "Decreases of more than 30% from baseline may lead to poor outcomes.";
    }
    // cardiac risk specific text
    if (conditions.length == 1) {
      formattedPrompt = `Patient has cardiac risk (${conditions[0]})${baselineMAPText}. ${secondPhrase}`;
    } else if (conditions.length == 2) {
      formattedPrompt = `Patient has cardiac risk (${conditions[0]} and ${conditions[1]})${baselineMAPText}. ${secondPhrase}`;
    } else if (conditions.length >= 3) {
      formattedPrompt = `Patient has cardiac risk (${conditions[0]}, ${conditions[1]}, and others)${baselineMAPText}. ${secondPhrase}`;
    }

    return (
      <>
        <p>{formattedPrompt}</p>
        <p>
          Would you like reminders if the patient&apos;s vital signs are out of
          range?
        </p>
      </>
    );
  };

  // we may not have a MAP
  let baselineMAP =
    context.operation.baselineMAP &&
    context.operation.baselineMAP.value !== null
      ? Math.floor(context.operation.baselineMAP.value)
      : null;
  // assume the threshold is 55 for non-cardiac patients or if we don't have a MAP.
  let thresholdMAP =
    baselineMAP && context.conditionProfile.cardiacRiskConditions?.length > 0
      ? Math.floor(baselineMAP * 0.7)
      : 55;
  if (thresholdMAP < 55) {
    thresholdMAP = 55;
  }
  const title = `Maintain MAP ≥ ${thresholdMAP} mmHg`;
  const prompt = formatPrompt(
    context.conditionProfile.cardiacRiskConditions,
    baselineMAP,
    thresholdMAP,
  );

  return (
    <Container fluid>
      <Row className="d-flex justify-content-center">
        <Col sm={8}>
          <Card>
            <Card.Header>
              <div className="mb-2">
                <FontAwesomeIcon
                  icon={faHeartPulse}
                  className="pt-2 pe-2 guided-maroon"
                  beat
                  size="2x"
                />
                <h3 className="d-inline">{title}</h3>
              </div>
            </Card.Header>
            <Card.Body className="mt-2 container-fluid">
              <div className="row">
                <div className="col">{prompt}</div>
              </div>
              <div className="row mt-5">
                <div className="col-6 d-flex justify-content-center">
                  <Button variant="primary" onClick={handleOptIn}>
                    Opt In
                  </Button>
                </div>
                <div className="col-6 d-flex justify-content-center">
                  <Button variant="secondary" onClick={handleOptOpt}>
                    Opt Out
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VitalSignRulesOptOutPrompt;
