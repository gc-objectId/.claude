import { Modal, Tab, Tabs } from "react-bootstrap";
import { MedsTab } from "./MedsTab";
import { MacrosTab } from "./MacrosTab";
import { FeatureKeyEnum, useFeatureFlag } from "../../../hooks/useFeatureFlag";

interface FavoritesEditModalProps {
  show: boolean;
  onHide: () => void;
}

export function FavoritesEditModal({ show, onHide }: FavoritesEditModalProps) {
  const macrosEnabled = useFeatureFlag(FeatureKeyEnum.MEDICATION_MACROS);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Favorite Medications</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey="meds" className="mb-3">
          <Tab eventKey="meds" title="Medications">
            <MedsTab />
          </Tab>
          {macrosEnabled && (
            <Tab eventKey="macros" title="Macros">
              <MacrosTab />
            </Tab>
          )}
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}
