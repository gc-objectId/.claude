import React, { Dispatch, SetStateAction, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import { PatientInfoTab } from "./Tabs/PatientInfo/PatientInfoTab";
import { ApplicationLaunchContext } from "../../types/ApplicationLaunchContext";
import { UserDetailsTab } from "./Tabs/UserDetails/UserDetailsTab";
import { AppDetailsTab } from "./Tabs/AppDetails/AppDetailsTab";
import { AntibioticCandidatesTab } from "./Tabs/AntibioticCandidates/AntibioticCandidatesTab";
import { RuleManagementTab } from "./Tabs/RuleManagement/RuleManagementTab";
import { GuidanceDebuggerTab } from "./Tabs/Guidance/GuidanceDebuggerTab";
import { AllergiesTab } from "./Tabs/Allergies/AllergiesTab";
import { ConditionsTab } from "./Tabs/Conditions/ConditionsTab";
import { MedicationAdministrationTab } from "./Tabs/MedicationAdministrations/MedicationAdministrationTab";
import { TimelineTab } from "./Tabs/Timeline/TimelineTab";
import { MedicationNotesListingTab } from "./Tabs/MedicationNotes/MedicationNotesListingTab";
import { OperationTab } from "./Tabs/Operation/OperationTab";
import { ObservationsListingTab } from "./Tabs/Observations/ObservationsListingTab";
import { InsulinManagementTab } from "./Tabs/InsulinManagement/InsulinManagementTab";
import { TrackedValuesTab } from "./Tabs/TrackedValues/TrackedValuesTab";
import { RuleEvaluationsTab } from "./Tabs/RuleEvaluations/RuleEvaluationsTab";
import { JobQueueTab } from "./Tabs/JobQueue/JobQueueTab";
import { Guidance } from "../../types/Guidance";

export type DebuggerTabsProps = {
  context: ApplicationLaunchContext;
  setContext: Dispatch<SetStateAction<ApplicationLaunchContext | undefined>>;
  guidance: Guidance[];
};

export function DebuggerTabs({
  context,
  setContext,
  guidance,
}: DebuggerTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <Tabs
      defaultActiveKey="demographics"
      className="mb-3"
      mountOnEnter
      onSelect={(t) => setActiveTab(t)}
    >
      <Tab eventKey="demographics" title="Patient Demographics">
        <PatientInfoTab
          context={context}
          setPatient={(patient) => setContext({ ...context, patient })}
          isActive={activeTab === "demographics"}
        />
      </Tab>
      <Tab eventKey="operation" title="Operation">
        <OperationTab
          context={context}
          setContext={setContext}
          isActive={activeTab === "operation"}
        />
      </Tab>
      <Tab
        eventKey="medication-administrations"
        title="Medication Administrations"
      >
        <MedicationAdministrationTab
          context={context}
          isActive={activeTab === "medication-administrations"}
        />
      </Tab>
      <Tab eventKey="medication-notes" title="Medication Notes">
        <MedicationNotesListingTab
          context={context}
          isActive={activeTab === "medication-notes"}
        />
      </Tab>
      <Tab eventKey="insulin-management" title="Insulin Management">
        <InsulinManagementTab
          context={context}
          isActive={activeTab === "insulin-management"}
        />
      </Tab>
      <Tab eventKey="allergies" title="Allergies">
        <AllergiesTab context={context} isActive={activeTab === "allergies"} />
      </Tab>
      <Tab eventKey="conditions" title="Conditions">
        <ConditionsTab
          context={context}
          isActive={activeTab === "conditions"}
        />
      </Tab>
      <Tab eventKey="observations" title="Observations">
        <ObservationsListingTab
          context={context}
          isActive={activeTab === "observations"}
        />
      </Tab>
      <Tab eventKey="tracked-values" title="Tracked Values">
        <TrackedValuesTab
          context={context}
          isActive={activeTab === "tracked-values"}
        />
      </Tab>
      <Tab eventKey="user" title="User">
        <UserDetailsTab isActive={activeTab === "user"} />
      </Tab>
      <Tab eventKey="antibiotic-candidates" title="Antibiotic Candidates">
        <AntibioticCandidatesTab
          context={context}
          isActive={activeTab === "antibiotic-candidates"}
        />
      </Tab>
      <Tab eventKey="app" title="App">
        <AppDetailsTab isActive={activeTab === "app"} />
      </Tab>
      <Tab eventKey="rule-management" title="Rule Management">
        <RuleManagementTab
          context={context}
          isActive={activeTab === "rule-management"}
        />
      </Tab>
      <Tab eventKey="guidance-debugger" title="Guidance Debugger">
        <GuidanceDebuggerTab
          isActive={activeTab === "guidance-debugger"}
          guidance={guidance}
        />
      </Tab>
      <Tab eventKey="timeline" title="Timeline">
        <TimelineTab context={context} isActive={activeTab === "timeline"} />
      </Tab>
      <Tab eventKey="rule-evaluations" title="Rule Evaluations">
        <RuleEvaluationsTab
          isActive={activeTab === "rule-evaluations"}
          caseId={context.operation.caseId}
        />
      </Tab>
      <Tab eventKey="job-queue" title="Job Queue">
        <JobQueueTab
          isActive={activeTab === "job-queue"}
          caseId={context.operation.caseId}
        />
      </Tab>
    </Tabs>
  );
}
