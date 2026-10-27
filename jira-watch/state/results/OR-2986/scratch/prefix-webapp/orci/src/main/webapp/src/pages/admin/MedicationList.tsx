import "../../App.scss";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Container,
  Modal,
  ModalBody,
  Spinner,
  Tab,
  Table,
  Tabs,
} from "react-bootstrap";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import type { MedicationFullDetailsDto } from "@api";
import { MedicationsController } from "@api";
import { isLoaded, Loadable, loading } from "../../types/Loadable";
import { TenantPicker } from "../../components/Admin/TenantPicker";
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
      // create set of distinct category options
      let allCategories: Set<string> = new Set();
      data.forEach((med) => {
        med.medicationCategories.forEach((category) =>
          allCategories.add(category),
        );
      });

      const opts = [...allCategories].sort();
      const categoryOpts: Record<string, string> = {};
      opts.forEach((opt) => {
        categoryOpts[opt] = opt;
      });
      setMedications(data);
    } else {
      logger.debug("Error getting medications: ", error);
      alert("Error: " + error);
    }
  };

  return (
    <>
      <h1>Medications</h1>
      <div className="mb-3">
        <label className="form-label">Select Tenant:</label>
        <TenantPicker value={tenant} onChange={setTenant} />
      </div>
      {!tenant && (
        <div className="alert alert-info">
          Please select a tenant to view medications.
        </div>
      )}
      {tenant && isLoaded(medications) ? (
        <MedicationTable medications={medications} />
      ) : tenant ? (
        <Spinner />
      ) : null}
    </>
  );
}

function MedicationList() {
  return (
    <Container fluid="md">
      <Header />
      <main role="main" style={{ marginBottom: "100px", marginTop: "125px" }}>
        <MedicationListContent />
      </main>
      <Footer />
    </Container>
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
          {doseOptions.length > 0 && (
            <div>
              <h6>Flat Dose Options:</h6>
              <ul>
                {doseOptions.map(
                  (
                    doseOption: { doseAmount: number; doseUnits: string },
                    index: number,
                  ) => (
                    <li key={index}>
                      {doseOption.doseAmount} {doseOption.doseUnits}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
          {weightBasedOptions.length > 0 && (
            <div>
              <h6>Weight-Based Dose Options:</h6>
              <ul>
                {weightBasedOptions.map(
                  (
                    doseOption: { doseAmount: number; doseUnits: string },
                    index: number,
                  ) => (
                    <li key={index}>
                      {doseOption.doseAmount} {doseOption.doseUnits}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
          {doseOptions.length === 0 && weightBasedOptions.length === 0 && (
            <div>No dose options available for this route</div>
          )}
        </Tab>
      );
    });
  }, [currentDosingConfig, medication.medicationIdentifier]);

  const hasPediatricDosing = medication.pediatricDosingConfig != null;

  return (
    <Modal centered show={true} onHide={() => onClose()}>
      <ModalBody>
        <h5>{medication.medicationName}</h5>
        <div className="mb-3">
          <label className="me-3">
            <input
              type="radio"
              name="pediatricStatus"
              value="ADULT"
              checked={pediatricStatus === "ADULT"}
              onChange={() => setPediatricStatus("ADULT")}
              className="me-1"
            />
            Adult Dosing
          </label>
          <label>
            <input
              type="radio"
              name="pediatricStatus"
              value="PEDIATRIC"
              checked={pediatricStatus === "PEDIATRIC"}
              onChange={() => setPediatricStatus("PEDIATRIC")}
              className="me-1"
              disabled={!hasPediatricDosing}
            />
            Pediatric Dosing
            {!hasPediatricDosing && " (not available)"}
          </label>
        </div>
        {pediatricStatus === "PEDIATRIC" && !hasPediatricDosing && (
          <div className="alert alert-info">
            No pediatric dosing information available for this medication.
          </div>
        )}
        <Tabs
          defaultActiveKey="ndcs"
          className="mb-3"
          activeKey={selectedExpandedRowTab || undefined}
          onSelect={(tab) => setSelectedExpandedRowTab(tab)}
        >
          <Tab eventKey="ndcs" title="NDC(s)" key="ndcs-tab">
            <div>
              {medication.associatedNDCs.length === 0 ? (
                "No NDCs"
              ) : (
                <div>
                  NDC(s):
                  <ul>
                    {medication.associatedNDCs.map((ndc) => (
                      <li key={ndc}>{ndc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Tab>
          {routeDoseTabs}
        </Tabs>
      </ModalBody>
    </Modal>
  );
}

function MedicationTable({
  medications,
}: {
  medications: MedicationFullDetailsDto[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
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
    <div>
      <input onChange={(e) => setSearchQuery(e.currentTarget.value)} />
      {selectedMedication && (
        <MedicationInfoModal
          medication={selectedMedication}
          onClose={() => setSelectedMedication(null)}
        />
      )}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>MedID</th>
            <th>Name</th>
            <th>Categories</th>
          </tr>
        </thead>
        <tbody>
          {filteredMedications.map((med) => (
            <tr key={med.id} onClick={() => setSelectedMedication(med)}>
              <td>{med.id}</td>
              <td>{med.medicationIdentifier}</td>
              <td>{med.medicationName}</td>
              <td>
                {med.medicationCategories.map((category) => (
                  <Badge key={category} bg="secondary" className="me-2">
                    {category}
                  </Badge>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default MedicationList;
