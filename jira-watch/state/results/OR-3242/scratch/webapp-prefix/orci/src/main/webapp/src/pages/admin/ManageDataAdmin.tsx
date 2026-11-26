import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { TenantScope } from "../../components/Admin/TenantScope";
import { Tab, Tabs } from "react-bootstrap";
import React, { useState } from "react";
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
      <AdminPageHeader
        title="Manage Data"
        meta="The clinical configuration in effect for a tenant: imported files, dosing, citations and practitioners."
      />
      <div className="admin-toolbar">
        <TenantScope value={tenant} onChange={setTenant} />
      </div>
      {!tenant && (
        <div className="admin-empty">Select a tenant to manage its data.</div>
      )}
      {tenant && (
        <TenantContext.Provider value={tenant}>
          <Tabs
            activeKey={activeTab}
            className="admin-tabs mb-3"
            onSelect={(t) => setActiveTab(t ?? DEFAULT_TAB)}
          >
            <Tab eventKey="config-files" title="Config Files">
              <p className="admin-section__lede">
                Upload a clinical configuration file to import it into{" "}
                <strong>{tenant}</strong> immediately. Imports take effect
                without a restart.
              </p>
              <ConfigFilesTab isActive={activeTab === "config-files"} />
            </Tab>

            <Tab eventKey="dosing-configurations" title="Dosing">
              <p className="admin-section__lede">
                Dosing configurations currently in effect for{" "}
                <strong>{tenant}</strong>.
              </p>
              <DosingConfigurationTab
                isActive={activeTab === "dosing-configurations"}
              />
            </Tab>

            <Tab eventKey="citations" title="Citations">
              <p className="admin-section__lede">
                Citations currently in effect for <strong>{tenant}</strong>.
              </p>
              <CitationsTab isActive={activeTab === "citations"} />
            </Tab>

            <Tab eventKey="practitioners" title="Practitioners">
              <p className="admin-section__lede">
                Practitioner records for <strong>{tenant}</strong>.
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
    <AdminPage>
      <ManageDataAdminContent />
    </AdminPage>
  );
}
