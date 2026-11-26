import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Button, Col, Modal, Nav, Row, Tab } from "react-bootstrap";
import { adminIndex } from "../adminIndex";
import { adminPanels } from "./adminPanels";
import { DebuggerTabs } from "../Debug/DebuggerTabs";
import { AdminPanelProvider } from "../../context/AdminPanelContext";
import { ApplicationLaunchContext } from "../../types/ApplicationLaunchContext";
import { Guidance } from "../../types/Guidance";
import { CaseID, PatientID, TenantID } from "../../types/identifiers";
import { isFormField } from "../../utils/keyboard";
import "./InCaseOverlay.scss";

const CASE_KEY = "case";

export type InCaseOverlayProps = {
  show: boolean;
  onHide(): void;
  tenantId: TenantID;
  patientId: PatientID;
  caseId: CaseID;
  context: ApplicationLaunchContext;
  setContext: Dispatch<SetStateAction<ApplicationLaunchContext | undefined>>;
  guidance: Guidance[];
};

export function InCaseOverlay({
  show,
  onHide,
  tenantId,
  patientId,
  caseId,
  context,
  setContext,
  guidance,
}: InCaseOverlayProps) {
  const [activeKey, setActiveKey] = useState<string>(CASE_KEY);
  const scope = useMemo(
    () => ({ tenantId, patientId, caseId }),
    [tenantId, patientId, caseId],
  );

  return (
    <Modal
      aria-label="in-case-overlay"
      className="in-case-overlay"
      show={show}
      onHide={onHide}
      onEscapeKeyDown={(event) => {
        if (isFormField(event.target)) event.preventDefault();
      }}
      onExited={() => setActiveKey(CASE_KEY)}
      fullscreen
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {context.patient.fullName}
          <span className="in-case-overlay__case-id">Case {caseId}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {show && (
          <Tab.Container
            activeKey={activeKey}
            onSelect={(key) => setActiveKey(key ?? CASE_KEY)}
          >
            <Row className="in-case-overlay__layout g-0">
              <Col md={3} lg={2} className="in-case-overlay__nav">
                <Nav variant="pills" className="flex-column">
                  <Nav.Item>
                    <Nav.Link eventKey={CASE_KEY}>Case</Nav.Link>
                  </Nav.Item>
                  {adminIndex.map((group) => (
                    <Nav.Item key={group.id}>
                      <div className="in-case-overlay__group guided-eyebrow">
                        {group.title}
                      </div>
                      {group.links.map((link) => (
                        <Nav.Link key={link.href} eventKey={link.href}>
                          {link.label}
                        </Nav.Link>
                      ))}
                    </Nav.Item>
                  ))}
                </Nav>
              </Col>
              <Col className="in-case-overlay__content">
                <Tab.Content className="guided-panel in-case-overlay__panel">
                  <Tab.Pane
                    eventKey={CASE_KEY}
                    className="in-case-overlay__case"
                  >
                    <DebuggerTabs
                      context={context}
                      setContext={setContext}
                      guidance={guidance}
                    />
                  </Tab.Pane>
                  <AdminPanelProvider value={scope}>
                    {adminIndex.flatMap((group) =>
                      group.links.map((link) => {
                        const Panel = adminPanels[link.href];
                        return (
                          <Tab.Pane key={link.href} eventKey={link.href}>
                            {activeKey === link.href && <Panel />}
                          </Tab.Pane>
                        );
                      }),
                    )}
                  </AdminPanelProvider>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
