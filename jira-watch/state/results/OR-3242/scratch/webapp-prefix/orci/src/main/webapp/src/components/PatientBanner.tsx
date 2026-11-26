import { Col, Container, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { ApplicationLaunchContext } from "../types/ApplicationLaunchContext";
import { formatGender } from "../utils/formatting";
import { isEmpty } from "lodash";

export type PatientBannerProps = {
  context: ApplicationLaunchContext;
  setShowSettings(showSettings: boolean): void;
  showSettings: boolean;
};

const PatientBanner = ({
  context,
  setShowSettings,
  showSettings,
}: PatientBannerProps) => {
  const patient = context?.patient;
  return (
    <Container fluid>
      <Row>
        <Col>
          <h3 className="mb-1">{patient?.fullName}</h3>
        </Col>
      </Row>
      <Row>
        <Col>
          <span className="text-capitalize">
            {patient?.gender?.toLowerCase()}
          </span>
          , {patient?.age ? patient?.age + " y.o." : ""}, {patient?.dob}
        </Col>
      </Row>
      {context.patient.genderIdentity &&
        context.patient.gender !== context.patient.genderIdentity && (
          <Row>
            <Col>
              <span>Gender Identity:</span>{" "}
              {patient?.genderIdentity && formatGender(patient?.genderIdentity)}
            </Col>
          </Row>
        )}

      <Row>
        <Col>
          <span>
            <span className="fw-lighter">Ht:</span>{" "}
            {isEmpty(patient?.height)
              ? "-"
              : `${patient?.height} (${patient?.heightInCustomaryFormat})`}
          </span>
        </Col>
      </Row>
      <Row>
        <Col>
          <span className="fw-lighter">Wt:</span>{" "}
          {isEmpty(patient?.weight)
            ? "-"
            : `${patient?.weight} (${patient?.weightInCustomaryFormat})`}
        </Col>
      </Row>
      <Row>
        <Col>
          <span className="fw-lighter">MRN:</span> {patient?.mrn}
          <a
            role="button"
            onClick={() => {
              setShowSettings(!showSettings);
            }}
          >
            <FontAwesomeIcon className="mx-2" icon={faGear} />
          </a>
        </Col>
      </Row>

      {false && (
        <Row>
          <Col>
            <span className="fw-lighter">Case ID:</span>{" "}
            <OverlayTrigger
              placement="right"
              overlay={
                <Tooltip>
                  {context?.operation?.procedureTypes.length == 1 ? (
                    context?.operation?.procedureTypes[0].procedureName
                  ) : (
                    <ul>
                      {context?.operation?.procedureTypes.map(
                        (procedureType) => (
                          <li key={procedureType.procedureId}>
                            {procedureType.procedureName}
                          </li>
                        ),
                      )}
                    </ul>
                  )}
                </Tooltip>
              }
            >
              <span>{context?.operation?.caseId}</span>
            </OverlayTrigger>
          </Col>
        </Row>
      )}
    </Container>
  );
};
export default PatientBanner;
