import "../../App.scss";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Container, Tab, Tabs } from "react-bootstrap";
import React, { useState } from "react";
import { TenantPicker } from "../../components/Admin/TenantPicker";
import { TenantID } from "../../types/identifiers";
import { TenantContext } from "../../context/TenantContext";
import { ConfigFilesTab } from "../../components/Admin/ManageData/ConfigFilesTab";
import { CitationsTab } from "../../components/Admin/ManageData/CitationsTab";
import { DosingConfigurationTab } from "../../components/Admin/ManageData/DosingConfigurationTab";
import { PractitionersTab } from "../../components/Admin/ManageData/PractitionersTab";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

const DEFAULT_TAB = "config-files";

export function ManageDataAdminContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
  const [tenant, setTenant] = useState<TenantID | undefined>(ctxTenantId);

  return (
    <>
      <h1>Manage Data</h1>
      <div className="mb-2">
        <TenantPicker value={tenant} onChange={setTenant} />
      </div>
      {!tenant && <div>pick a tenant</div>}
      {tenant && (
        <TenantContext.Provider value={tenant}>
          <Tabs
            activeKey={activeTab}
            className="mb-3"
            onSelect={(t) => setActiveTab(t ?? DEFAULT_TAB)}
          >
            <Tab eventKey="config-files" title="Config Files">
              <p>
                Upload a clinical configuration file to import it into{" "}
                <code>{tenant}</code> immediately. Imports take effect without a
                restart.
              </p>
              <ConfigFilesTab isActive={activeTab === "config-files"} />
            </Tab>

            <Tab eventKey="dosing-configurations" title="Dosing">
              <p>
                Dosing configurations currently in effect for{" "}
                <code>{tenant}</code>.
              </p>
              <DosingConfigurationTab
                isActive={activeTab === "dosing-configurations"}
              />
            </Tab>

            <Tab eventKey="citations" title="Citations">
              <p>
                Citations currently in effect for <code>{tenant}</code>.
              </p>
              <CitationsTab isActive={activeTab === "citations"} />
            </Tab>

            <Tab eventKey="practitioners" title="Practitioners">
              <p>
                View practitioners records for <code>{tenant}</code>.
              </p>
              <PractitionersTab isActive={activeTab === "practitioners"} />
            </Tab>
          </Tabs>
        </TenantContext.Provider>
      )}
    </>
  );
}

export function ManageDataAdmin() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" className="admin-main">
        <ManageDataAdminContent />
      </main>
      <Footer />
    </Container>
  );
}
