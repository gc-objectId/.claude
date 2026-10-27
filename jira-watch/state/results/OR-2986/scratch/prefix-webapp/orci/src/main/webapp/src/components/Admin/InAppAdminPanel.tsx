import React, { useMemo, useState } from "react";
import { Button, Container, Modal, Tab, Tabs } from "react-bootstrap";
import { useHotkeys } from "react-hotkeys-hook";
import { AllergyReactionListContent } from "../../pages/admin/AllergyReactionList";
import { APITokenAdminContent } from "../../pages/admin/APIToken";
import { MedicationListContent } from "../../pages/admin/MedicationList";
import { ManageDataAdminContent } from "../../pages/admin/ManageDataAdmin";
import { ReportingContent } from "../../pages/admin/Reporting";
import { FeedbackContent } from "../../pages/admin/Feedback";
import { ReleaseNotesContent } from "../../pages/admin/ReleaseNotes";
import { FeatureFlagsContent } from "../../pages/admin/FeatureFlags";
import { EventCenterContent } from "../../pages/admin/EventCenter";
import { MedicationAdministrationSimulationContent } from "../../pages/admin/MedicationAdministrationSimulation";
import { MedicationAdministrationsSimulationContent } from "../../pages/admin/MedicationAdministrationsSimulation";
import { MedicationAdministrationDefaultNDCsSimulationContent } from "../../pages/admin/MedicationAdministrationDefaultNDCsSimulation";
import { MedicationAdministrationNotificationFormContent } from "../../pages/admin/MedicationAdministrationNotificationForm";
import { CaseID, PatientID, TenantID } from "../../types/identifiers";
import { AdminPanelProvider } from "../../context/AdminPanelContext";
import { JobQueueContent } from "../../pages/admin/JobQueue";

type InAppAdminPanelProps = {
  tenantId?: TenantID;
  patientId?: PatientID;
  caseId?: CaseID;
};

export function InAppAdminPanel({
  tenantId,
  patientId,
  caseId,
}: InAppAdminPanelProps) {
  const [show, setShow] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("feature-flags");

  useHotkeys("ctrl+shift+a", (e) => {
    e.preventDefault();
    setShow((prev) => !prev);
  });

  const contextValue = useMemo(
    () => ({ tenantId, patientId, caseId }),
    [tenantId, patientId, caseId],
  );

  return (
    <Modal
      aria-label="admin-panel-modal"
      show={show}
      onHide={() => setShow(false)}
      keyboard={false}
      fullscreen={true}
    >
      <Modal.Header closeButton>
        <Modal.Title>Admin Panel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <AdminPanelProvider value={contextValue}>
          <Container fluid="lg">
            <Tabs
              activeKey={activeTab}
              className="mb-3"
              onSelect={(t) => setActiveTab(t ?? "feature-flags")}
            >
              <Tab eventKey="feature-flags" title="Feature Flags">
                {activeTab === "feature-flags" && <FeatureFlagsContent />}
              </Tab>
              <Tab eventKey="job-queue" title="Job Queue">
                {activeTab === "job-queue" && <JobQueueContent />}
              </Tab>
              <Tab eventKey="event-center" title="Event Center">
                {activeTab === "event-center" && <EventCenterContent />}
              </Tab>
              <Tab eventKey="allergy-reactions" title="Allergy Reactions">
                {activeTab === "allergy-reactions" && (
                  <AllergyReactionListContent />
                )}
              </Tab>
              <Tab eventKey="api-tokens" title="API Tokens">
                {activeTab === "api-tokens" && <APITokenAdminContent />}
              </Tab>
              <Tab eventKey="medications" title="Medications">
                {activeTab === "medications" && <MedicationListContent />}
              </Tab>
              <Tab eventKey="manage-data" title="Manage Data">
                {activeTab === "manage-data" && <ManageDataAdminContent />}
              </Tab>
              <Tab eventKey="reporting" title="Reporting">
                {activeTab === "reporting" && <ReportingContent />}
              </Tab>
              <Tab eventKey="feedback" title="User Feedback">
                {activeTab === "feedback" && <FeedbackContent />}
              </Tab>
              <Tab eventKey="release-notes" title="Release Notes">
                {activeTab === "release-notes" && <ReleaseNotesContent />}
              </Tab>
              <Tab eventKey="sim-med-admin" title="Sim: Med Admin">
                {activeTab === "sim-med-admin" && (
                  <MedicationAdministrationSimulationContent />
                )}
              </Tab>
              <Tab eventKey="sim-med-admins" title="Sim: Med Admins">
                {activeTab === "sim-med-admins" && (
                  <MedicationAdministrationsSimulationContent />
                )}
              </Tab>
              <Tab eventKey="sim-default-ndcs" title="Sim: Default NDCs">
                {activeTab === "sim-default-ndcs" && (
                  <MedicationAdministrationDefaultNDCsSimulationContent />
                )}
              </Tab>
              <Tab
                eventKey="med-admin-notifications"
                title="Med Admin Notifications"
              >
                {activeTab === "med-admin-notifications" && (
                  <MedicationAdministrationNotificationFormContent />
                )}
              </Tab>
            </Tabs>
          </Container>
        </AdminPanelProvider>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShow(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
