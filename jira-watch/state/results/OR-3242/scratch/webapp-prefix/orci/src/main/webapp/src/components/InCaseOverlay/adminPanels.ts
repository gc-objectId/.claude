import { ComponentType } from "react";
import { AdminHref } from "../adminIndex";
import { MedicationListContent } from "../../pages/admin/MedicationList";
import { AllergyReactionListContent } from "../../pages/admin/AllergyReactionList";
import { ManageDataAdminContent } from "../../pages/admin/ManageDataAdmin";
import { FeatureFlagsContent } from "../../pages/admin/FeatureFlags";
import { APITokenAdminContent } from "../../pages/admin/APIToken";
import { ReleaseNotesContent } from "../../pages/admin/ReleaseNotes";
import { ReportingContent } from "../../pages/admin/Reporting";
import { FeedbackContent } from "../../pages/admin/Feedback";
import { EventCenterContent } from "../../pages/admin/EventCenter";
import { HL7MessagesContent } from "../../pages/admin/HL7Messages";
import { JobQueueContent } from "../../pages/admin/JobQueue";
import { MedAdminSimulationPanelTab } from "../../pages/admin/MedAdminSimulation";
import { IntegrationHarnessContent } from "../../pages/admin/IntegrationHarness";
import { EmailTestContent } from "../../pages/admin/EmailTest";

export const adminPanels: Record<AdminHref, ComponentType> = {
  "/admin/medications": MedicationListContent,
  "/admin/allergy-reactions": AllergyReactionListContent,
  "/admin/manage-data": ManageDataAdminContent,
  "/admin/feature-flags": FeatureFlagsContent,
  "/admin/api-tokens": APITokenAdminContent,
  "/admin/release-notes": ReleaseNotesContent,
  "/admin/reporting": ReportingContent,
  "/admin/feedback-submissions": FeedbackContent,
  "/admin/event-center": EventCenterContent,
  "/admin/hl7-messages": HL7MessagesContent,
  "/admin/job-queue": JobQueueContent,
  "/admin/simulation": MedAdminSimulationPanelTab,
  "/admin/integration-harness": IntegrationHarnessContent,
  "/admin/email-test": EmailTestContent,
};
