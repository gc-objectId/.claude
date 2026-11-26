import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { getSamplePatientsOptions } from "@api/@tanstack/react-query.gen";

export type NavLinkItem = { label: string; href: string; description: string };
export type NavGroup = {
  id: string;
  title: string;
  links: readonly NavLinkItem[];
};

export type LaunchTenant = {
  clientId: string;
  title: string;
  samplePatients: { label: string; href: string }[];
  patientsHref: string;
  templatesHref: string;
};

export const adminIndex = [
  {
    id: "clinical-data",
    title: "Clinical Data",
    links: [
      {
        label: "Medications",
        href: "/admin/medications",
        description: "Formulary, dosing options, and NDC mappings",
      },
      {
        label: "Allergy Reactions",
        href: "/admin/allergy-reactions",
        description: "Reaction vocabulary and severity mapping",
      },
      {
        label: "Manage Data",
        href: "/admin/manage-data",
        description: "Practitioners, citations, and reference data",
      },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    links: [
      {
        label: "Feature Flags",
        href: "/admin/feature-flags",
        description: "Per-tenant rule and feature enablement",
      },
      {
        label: "API Tokens",
        href: "/admin/api-tokens",
        description: "Integration credentials",
      },
      {
        label: "Release Notes",
        href: "/admin/release-notes",
        description: "What changed in each release",
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring",
    links: [
      {
        label: "Reporting",
        href: "/admin/reporting",
        description: "Case, rule, and usage reports",
      },
      {
        label: "User Feedback",
        href: "/admin/feedback-submissions",
        description: "Submissions from the in-app feedback widget",
      },
      {
        label: "Event Center",
        href: "/admin/event-center",
        description: "Send timing events to a case as if from the EHR",
      },
      {
        label: "HL7 Messages",
        href: "/admin/hl7-messages",
        description: "Inbound message log",
      },
      {
        label: "Job Queue",
        href: "/admin/job-queue",
        description: "Scheduled and in-flight background jobs",
      },
    ],
  },
  {
    id: "test-utilities",
    title: "Test Utilities",
    links: [
      {
        label: "Med Admin Simulation",
        href: "/admin/simulation",
        description:
          "Simulate medication administrations and notifications against a case",
      },
      {
        label: "Integration Harness",
        href: "/admin/integration-harness",
        description: "Drive HL7 and FHIR flows against a tenant",
      },
      {
        label: "Email Test",
        href: "/admin/email-test",
        description: "Send a test email to confirm outbound email works",
      },
    ],
  },
] as const satisfies readonly NavGroup[];

export type AdminHref = (typeof adminIndex)[number]["links"][number]["href"];

export function useLaunchTenants(): LaunchTenant[] {
  const { user } = useAuth();
  const { data: samplePatientData = [] } = useQuery({
    ...getSamplePatientsOptions(),
    enabled: isLoggedIn(user),
  });

  return useMemo(() => {
    if (!isLoggedIn(user)) return [];
    const byClientId = new Map(samplePatientData.map((g) => [g.clientId, g]));
    return user.allowedTenants.map((tenantId) => {
      const sample = byClientId.get(tenantId);
      return {
        clientId: tenantId,
        title: sample?.title ?? tenantId,
        samplePatients: (sample?.patients ?? []).map((p) => ({
          label: p.label,
          href: p.launchUrl,
        })),

        patientsHref: `/admin/patients?client_id=${tenantId}`,
        templatesHref: `/admin/templates/patients?client_id=${tenantId}`,
      };
    });
  }, [samplePatientData, user]);
}
