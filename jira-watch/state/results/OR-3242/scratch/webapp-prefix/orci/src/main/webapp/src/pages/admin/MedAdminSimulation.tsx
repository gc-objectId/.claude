import { useEffect, useState } from "react";
import { Nav } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { SimulationController } from "@api";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage";
import { useAdminPanelContext } from "../../context/AdminPanelContext";
import { CaseID, PatientID } from "../../types/identifiers";
import { BatchMode } from "./med-admin-simulation/BatchMode";
import { CaseFieldsProps } from "./med-admin-simulation/CaseFields";
import { DefaultNdcsMode } from "./med-admin-simulation/DefaultNdcsMode";
import {
  SIMULATION_MODES,
  SimulationMode,
  toSimulationMode,
} from "./med-admin-simulation/modes";
import { NotificationMode } from "./med-admin-simulation/NotificationMode";
import { SingleMode } from "./med-admin-simulation/SingleMode";

type SimulationSite = "checking" | "usable" | "unavailable";

function useSimulationSite(): SimulationSite {
  const [site, setSite] = useState<SimulationSite>("checking");

  useEffect(() => {
    SimulationController.getSimulationSite()
      .then(({ data }) =>
        setSite(data?.available === false ? "unavailable" : "usable"),
      )
      .catch(() => setSite("usable"));
  }, []);

  return site;
}

type FileModeProps = {
  mode: Exclude<SimulationMode, "notification">;
  site: SimulationSite;
  caseFields: CaseFieldsProps;
};

function FileMode({ mode, site, caseFields }: FileModeProps) {
  if (site === "checking") return null;
  if (site === "unavailable") {
    return (
      <div className="admin-empty">
        Simulation is not available on this host
      </div>
    );
  }
  switch (mode) {
    case "single":
      return <SingleMode {...caseFields} />;
    case "batch":
      return <BatchMode {...caseFields} />;
    case "default-ndcs":
      return <DefaultNdcsMode {...caseFields} />;
  }
}

type MedAdminSimulationContentProps = {
  mode: SimulationMode;
  onModeChange: (mode: SimulationMode) => void;
};

export function MedAdminSimulationContent({
  mode,
  onModeChange,
}: MedAdminSimulationContentProps) {
  const { patientId: ctxPatientId, caseId: ctxCaseId } = useAdminPanelContext();
  const site = useSimulationSite();
  const [patientId, setPatientId] = useState<PatientID | "">(
    ctxPatientId ?? "",
  );
  const [caseId, setCaseId] = useState<CaseID | "">(ctxCaseId ?? "");
  const caseFields: CaseFieldsProps = {
    patientId,
    caseId,
    onPatientIdChange: setPatientId,
    onCaseIdChange: setCaseId,
  };

  return (
    <>
      <AdminPageHeader
        title="Med Admin Simulation"
        meta="Simulate medication administrations and notifications against a case in a test tenant."
      />
      <Nav
        variant="tabs"
        role="tablist"
        className="admin-tabs mb-4"
        activeKey={mode}
        onSelect={(key) => onModeChange(toSimulationMode(key))}
      >
        {SIMULATION_MODES.map((option) => (
          <Nav.Item key={option.key}>
            <Nav.Link eventKey={option.key}>{option.label}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      {mode === "notification" ? (
        <NotificationMode
          patientId={patientId}
          onPatientIdChange={setPatientId}
        />
      ) : (
        <FileMode mode={mode} site={site} caseFields={caseFields} />
      )}
    </>
  );
}

export function MedAdminSimulationPanelTab() {
  const [mode, setMode] = useState<SimulationMode>("single");
  return <MedAdminSimulationContent mode={mode} onModeChange={setMode} />;
}

function MedAdminSimulation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = toSimulationMode(searchParams.get("mode"));
  return (
    <AdminPage>
      <MedAdminSimulationContent
        mode={mode}
        onModeChange={(next) =>
          setSearchParams({ mode: next }, { replace: true })
        }
      />
    </AdminPage>
  );
}

export default MedAdminSimulation;
