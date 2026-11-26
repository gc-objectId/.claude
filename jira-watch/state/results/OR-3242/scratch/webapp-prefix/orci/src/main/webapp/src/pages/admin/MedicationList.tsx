import "../../App.scss";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { AdminTable } from "../../components/Admin/AdminTable";
import { TenantScope } from "../../components/Admin/TenantScope";
import { useEffect, useMemo, useState } from "react";
import { Form, Modal, Spinner, Tab, Tabs } from "react-bootstrap";

import type { MedicationFullDetailsDto } from "@api";
import { MedicationsController } from "@api";
import { isLoaded, Loadable, loading } from "../../types/Loadable";
import { TenantID } from "../../types/identifiers";
import { MedicationRoute } from "../../types/MedicationRoute";
import { useAdminPanelContext } from "../../context/AdminPanelContext";

import { logger } from "../../utils/logger";
export function MedicationListContent() {
  const { tenantId: ctxTenantId } = useAdminPanelContext();
  const [medications, setMedications] = useState<
    Loadable<MedicationFullDetailsDto[]>
  >(loading());

  const [tenant, setTenant] = useState<TenantID | undefined>(ctxTenantId);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (tenant) {
      setMedications(loading());
      getMedications(tenant);
    }
  }, [tenant]);

  const getMedications = async function (tenantId: TenantID) {
    logger.debug("getting medications for tenant:", tenantId);
    const { data, error } =
      await MedicationsController.getFullDetailsMedications({
        headers: { "X-Tenant-Id": tenantId },
      });
    if (data) {
      setMedications(data);
    } else {
      logger.debug("Error getting medications: ", error);
      alert("Error: " + error);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Medications"
        meta="Every medication a tenant can administer, with its NDCs and dose options."
      />
      <div className="admin-toolbar">
        <TenantScope value={tenant} onChange={setTenant} />
        {tenant && (
          <Form.Control
            type="search"
            className="admin-toolbar__search"
            placeholder="Search by name, identifier or category"
            aria-label="Search medications"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />
        )}
      </div>
      {!tenant ? (
        <div className="admin-empty">
          Select a tenant to see its medications.
        </div>
      ) : isLoaded(medications) ? (
        <MedicationTable medications={medications} searchQuery={searchQuery} />
      ) : (
        <div className="admin-empty">
          <Spinner size="sm" aria-hidden="true" />
          Loading medications…
        </div>
      )}
    </>
  );
}

function MedicationList() {
  return (
    <AdminPage>
      <MedicationListContent />
    </AdminPage>
  );
}

function DoseOptionList({
  label,
  options,
}: {
  label: string;
  options: { doseAmount: number; doseUnits: string }[];
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="guided-eyebrow">{label}</div>
      <div className="admin-table__tags mt-1">
        {options.map((option, index) => (
          <span key={index} className="guided-tag">
            {option.doseAmount} {option.doseUnits}
          </span>
        ))}
      </div>
    </div>
  );
}

function MedicationInfoModal({
  medication,
  onClose,
}: {
  medication: MedicationFullDetailsDto;
  onClose: () => void;
}) {
  const [selectedExpandedRowTab, setSelectedExpandedRowTab] = useState<
    string | null
  >("");
  const [pediatricStatus, setPediatricStatus] = useState<"ADULT" | "PEDIATRIC">(
    "ADULT",
  );

  const getRouteName = (routeValue: string) =>
    routeValue.toLowerCase().replace("_", " ");

  const currentDosingConfig =
    pediatricStatus === "ADULT"
      ? medication.adultDosingConfig
      : medication.pediatricDosingConfig;

  const routeDoseTabs = useMemo(() => {
    if (!currentDosingConfig) return [];

    const routes = Object.keys(
      currentDosingConfig.routeDoseOptions,
    ) as MedicationRoute[];
    return routes.map((route: MedicationRoute) => {
      const doseOptions = currentDosingConfig.routeDoseOptions[route] || [];
      const weightBasedOptions =
        currentDosingConfig.routeWeightBasedDoseOptions[route] || [];

      return (
        <Tab
          tabClassName="text-capitalize"
          key={medication.medicationIdentifier + "-" + route}
          eventKey={route}
          title={getRouteName(route) + " Route/Dose"}
        >
          <DoseOptionList label="Flat dose options" options={doseOptions} />
          <DoseOptionList
            label="Weight-based dose options"
            options={weightBasedOptions}
          />
          {doseOptions.length === 0 && weightBasedOptions.length === 0 && (
            <div className="admin-empty">
              No dose options available for this route
            </div>
          )}
        </Tab>
      );
    });
  }, [currentDosingConfig, medication.medicationIdentifier]);

  const hasPediatricDosing = medication.pediatricDosingConfig != null;

  return (
    <Modal centered show={true} onHide={() => onClose()}>
      <Modal.Header closeButton>
        <Modal.Title>
          {medication.medicationName}
          <span className="admin-table__secondary">
            {medication.medicationIdentifier}
          </span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <Form.Check
            inline
            type="radio"
            id="dosing-adult"
            name="pediatricStatus"
            label="Adult dosing"
            value="ADULT"
            checked={pediatricStatus === "ADULT"}
            onChange={() => setPediatricStatus("ADULT")}
          />
          <Form.Check
            inline
            type="radio"
            id="dosing-pediatric"
            name="pediatricStatus"
            label={
              hasPediatricDosing
                ? "Pediatric dosing"
                : "Pediatric dosing (not available)"
            }
            value="PEDIATRIC"
            checked={pediatricStatus === "PEDIATRIC"}
            onChange={() => setPediatricStatus("PEDIATRIC")}
            disabled={!hasPediatricDosing}
          />
        </div>
        {pediatricStatus === "PEDIATRIC" && !hasPediatricDosing && (
          <div className="admin-empty mb-3">
            No pediatric dosing information available for this medication.
          </div>
        )}
        <Tabs
          defaultActiveKey="ndcs"
          className="admin-tabs mb-3"
          activeKey={selectedExpandedRowTab || undefined}
          onSelect={(tab) => setSelectedExpandedRowTab(tab)}
        >
          <Tab eventKey="ndcs" title="NDC(s)" key="ndcs-tab">
            {medication.associatedNDCs.length === 0 ? (
              <div className="admin-empty">No NDCs</div>
            ) : (
              <div className="admin-table__tags">
                {medication.associatedNDCs.map((ndc) => (
                  <span key={ndc} className="guided-tag">
                    {ndc}
                  </span>
                ))}
              </div>
            )}
          </Tab>
          {routeDoseTabs}
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}

function MedicationTable({
  medications,
  searchQuery,
}: {
  medications: MedicationFullDetailsDto[];
  searchQuery: string;
}) {
  const [selectedMedication, setSelectedMedication] =
    useState<MedicationFullDetailsDto | null>(null);

  const filteredMedications = useMemo(
    () =>
      medications.filter((it) => {
        if (searchQuery.trim().length === 0) return true;
        return (
          it.medicationName.toLowerCase().includes(searchQuery) ||
          it.medicationIdentifier.includes(searchQuery) ||
          it.medicationCategories.some((category: string) =>
            category.toLowerCase().includes(searchQuery),
          )
        );
      }),
    [searchQuery, medications],
  );

  return (
    <>
      {selectedMedication && (
        <MedicationInfoModal
          medication={selectedMedication}
          onClose={() => setSelectedMedication(null)}
        />
      )}
      <AdminTable className="admin-table--selectable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Categories</th>
            <th>ID</th>
          </tr>
        </thead>
        <tbody>
          {filteredMedications.length === 0 ? (
            <tr>
              <td colSpan={3} className="admin-table__empty">
                {searchQuery.trim()
                  ? `No medications match “${searchQuery}”.`
                  : "No medications for this tenant."}
              </td>
            </tr>
          ) : (
            filteredMedications.map((med) => (
              <tr key={med.id} onClick={() => setSelectedMedication(med)}>
                <td>
                  {med.medicationName}
                  <span className="admin-table__secondary">
                    {med.medicationIdentifier}
                  </span>
                </td>
                <td>
                  <div className="admin-table__tags">
                    {med.medicationCategories.map((category) => (
                      <span key={category} className="guided-tag">
                        {category}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="admin-table__id">{med.id}</td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </>
  );
}

export default MedicationList;
