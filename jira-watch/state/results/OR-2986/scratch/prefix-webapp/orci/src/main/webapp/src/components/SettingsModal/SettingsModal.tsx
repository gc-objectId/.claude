import "./SettingsModal.scss";
import { Modal, Tab, Tabs } from "react-bootstrap";
import { CaseID, RuleID } from "../../types/identifiers";
import type { VitalSignSettingsDto } from "@api";
import { Loadable } from "../../types/Loadable";
import React, { useRef } from "react";
import { VitalSignAlertsTab } from "./VitalSignsAlertsTab";
import { AllergySettingsTab } from "./AllergySettingsTab";
import { ToleratedMedicationsTab } from "./ToleratedMedicationsTab";

export type SettingsModalProps = {
  caseId: CaseID;
  enableVitalSignOptIn: boolean;
  notifyOnVitalSignAlerts: boolean;
  setVitalSignAlerts(b: boolean): void;
  updateSuppressionSetting(ruleIds: RuleID[], suppressed: boolean): void;
  onHide(): void;
  ruleSettings: Loadable<VitalSignSettingsDto[]>;
  show: boolean;
};

export function SettingsModal({
  enableVitalSignOptIn,
  notifyOnVitalSignAlerts,
  setVitalSignAlerts,
  updateSuppressionSetting,
  onHide,
  ruleSettings,
  show,
}: SettingsModalProps) {
  const showToleratedMedicationsTab = useRef<boolean>(false);
  return (
    <Modal show={show} keyboard={false} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Settings</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ minHeight: "500px" }}>
        {show && (
          <Tabs className="settings-tabs">
            {enableVitalSignOptIn && (
              <Tab eventKey="vital-sign-alerts" title="Vital Sign Alerts">
                <VitalSignAlertsTab
                  onChanged={(checked) => setVitalSignAlerts(checked)}
                  checked={notifyOnVitalSignAlerts}
                  ruleSettings={ruleSettings}
                  updateSuppressionSetting={updateSuppressionSetting}
                />
              </Tab>
            )}
            <Tab eventKey="allergies" title="Allergies">
              <AllergySettingsTab />
            </Tab>
            <Tab
              eventKey="alerts"
              title="Alerts"
              tabClassName={
                !showToleratedMedicationsTab.current ? "d-none" : ""
              }
            >
              <ToleratedMedicationsTab
                showTabRef={showToleratedMedicationsTab}
              />
            </Tab>
          </Tabs>
        )}
      </Modal.Body>
    </Modal>
  );
}
