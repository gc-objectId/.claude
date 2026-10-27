import { Button, Card, Col, Container, Row } from "react-bootstrap";

import React, { useState } from "react";
import {
  RestorePromptType,
  RestorePromptTypeEnum,
} from "../types/RestorePromptType";

export type RestoreMedsPromptProps = {
  type: RestorePromptType;
  restorePreviousTabs(): void;
  ignorePreviousTabs(): void;
};

const RestoreMedsPrompt = ({
  type,
  restorePreviousTabs,
  ignorePreviousTabs,
}: RestoreMedsPromptProps) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleRestore = () => {
    if (!isClicked) {
      setIsClicked(true);
      restorePreviousTabs();
    }
  };
  const handleIgnore = () => {
    if (!isClicked) {
      setIsClicked(true);
      ignorePreviousTabs();
    }
  };
  return (
    <Container fluid>
      <Row className="justify-content-center">
        <Col xs={8}>
          <Card className="mb-3 guidance-alert">
            <Card.Header>
              <h3 className="pt-2 pe-2">Restore Medications</h3>
            </Card.Header>
            <Card.Body className="mt-2">
              <div>
                <div>
                  <div className="alert-body-container">
                    {type === RestorePromptTypeEnum.FROM_CURRENT_USER && (
                      <div>
                        GuidedOR was closed with unsaved meds. Would you like to
                        restore these unsaved medications?
                      </div>
                    )}
                    {type === RestorePromptTypeEnum.FROM_OTHER_USERS && (
                      <div>
                        Another user has unsaved medications for this case.
                        Would you like to restore the unsaved medications before
                        completing documentation?
                      </div>
                    )}
                  </div>
                </div>

                <div className="row mt-5">
                  <div className="col-6 d-flex justify-content-center">
                    <Button
                      variant="primary"
                      onClick={handleRestore}
                      disabled={isClicked}
                      value="restore"
                    >
                      Restore Meds
                    </Button>
                  </div>
                  <div className="col-6 d-flex justify-content-center">
                    <Button
                      variant="secondary"
                      onClick={handleIgnore}
                      disabled={isClicked}
                      value="ignore"
                    >
                      Delete Meds
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RestoreMedsPrompt;
