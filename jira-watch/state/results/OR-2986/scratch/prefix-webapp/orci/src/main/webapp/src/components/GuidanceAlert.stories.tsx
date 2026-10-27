import type { Meta, StoryObj } from "@storybook/react-vite";
import GuidanceAlert from "./GuidanceAlert";
import { AlertResultID, RuleID } from "../types/identifiers";

import { AlertDefinition } from "../types/AlertDefinition";

const meta: Meta<typeof GuidanceAlert> = {
  component: GuidanceAlert,
  decorators: [
    (Story) => (
      <div style={{ marginTop: "6em" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof GuidanceAlert>;

const alert1: AlertDefinition = {
  resultId: "af670930-5ca1-4198-b978-f67eafedf22e" as AlertResultID,
  ruleIdentifier: "a-eras-preop" as RuleID,
  title: "Administer Acetaminophen and Celecoxib for ERAS Patient",
  tabName: null,
  description:
    "Patient is on ERAS protocol and should receive Acetaminophen and Celecoxib. Recommend Acetaminophen and Celecoxib.",
  acceptText: "Will Give Medications",
  rejectText: "Reject Suggestion",
  rejectReasons: [
    {
      reason: "Patient not on ERAS",
      rejectionReason: "PATIENT_NOT_ON_ERAS",
      customInput: false,
      customInputLabel: null,
    },
    {
      reason: "Allergy to Acetaminophen",
      rejectionReason: "ALLERGY_TO_ACETAMINOPHEN",
      customInput: false,
      customInputLabel: null,
    },
    {
      reason: "Allergy to Celecoxib",
      rejectionReason: "ALLERGY_TO_CELECOXIB",
      customInput: false,
      customInputLabel: null,
    },
    {
      reason: "Allergy to Both",
      rejectionReason: "ALLERGY_TO_BOTH",
      customInput: false,
      customInputLabel: null,
    },
    {
      reason: "History of GI Bleed",
      rejectionReason: "HISTORY_OF_GI_BLEED",
      customInput: false,
      customInputLabel: null,
    },
    {
      reason: "Medication was given",
      rejectionReason: "MEDICATION_WAS_GIVEN",
      customInput: false,
      customInputLabel: null,
    },
  ],
  citations: [
    {
      id: "r-foo",
      label: "ERAS Society Guidelines",
      citation:
        "See Table 1, Row 2: Preoperative medications, which are the most important?",
      url: "https://erassociety.org/wp-content/uploads/2023/04/PIIS0090825823001804.pdf",
    },
  ],
  promptText: null,
  allowSuppression: false,
  relevantAllergies: [],
  allowAllergySuppression: false,
  allowMarkTolerated: false,
};

const alert2: AlertDefinition = {
  resultId: "d7c1158d-0c68-4746-b3ed-446d29c663b3" as AlertResultID,
  ruleIdentifier: "a-preop-glucose" as RuleID,
  title: "Check Glucose",
  tabName: null,
  description:
    "Patients with diabetes should have a glucose check on the day of surgery.",
  acceptText: "Will Check Glucose",
  rejectText: "Reject Suggestion",
  rejectReasons: [
    {
      reason: "Glucose check already documented",
      rejectionReason: "GLUCOSE_CHECK_ALREADY_DOCUMENTED",
      customInput: false,
      customInputLabel: null,
    },
  ],
  citations: [
    {
      id: "r-foo",
      label: "Hospital Guidelines",
      citation:
        'See Peri-operative blood glucose monitoring: "Check POC (point of care) glucose upon arrival to the hospital and every 4 hours while in the pre-op and post-op areas" (page 1)',
      url: "https://hospitalpolicies.ellucid.com/documents/view/2534",
    },
  ],
  promptText: null,
  allowSuppression: false,
  relevantAllergies: [],
  allowAllergySuppression: false,
  allowMarkTolerated: false,
};

export const SingleAlert: Story = {
  args: {
    alerts: [alert1],
    title: "Example Alert",
  },
};

export const MultiAlert: Story = {
  args: {
    alerts: [alert1, alert2],
    title: "Example Alert",
  },
};
