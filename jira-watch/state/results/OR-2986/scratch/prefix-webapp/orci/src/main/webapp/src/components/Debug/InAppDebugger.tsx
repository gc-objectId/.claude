import React, { Dispatch, SetStateAction, useState } from "react";
import { Button, Container, Modal } from "react-bootstrap";
import { useHotkeys } from "react-hotkeys-hook";
import { ApplicationLaunchContext } from "../../types/ApplicationLaunchContext";
import { GuidanceTabsHook } from "../../hooks/useGuidanceTabs";
import { DebuggerTabs } from "./DebuggerTabs";

export type PatientDetailsProps = {
  context: ApplicationLaunchContext;
  tabState: GuidanceTabsHook;
  setContext: Dispatch<SetStateAction<ApplicationLaunchContext | undefined>>;
};

function InAppDebugger({ context, tabState, setContext }: PatientDetailsProps) {
  const [show, setShow] = useState(false);

  useHotkeys("ctrl+d", () => setShow(!show));

  return (
    <Modal
      aria-label="debugger-modal"
      show={show}
      onHide={() => setShow(false)}
      keyboard={false}
      fullscreen={true}
    >
      <Modal.Header closeButton>
        <Modal.Title>{context?.patient?.fullName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container fluid="lg">
          {show && (
            <DebuggerTabs
              context={context}
              setContext={setContext}
              guidance={
                tabState.getSelectedTab()?.dosingFormState?.guidance || []
              }
            />
          )}
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InAppDebugger;
