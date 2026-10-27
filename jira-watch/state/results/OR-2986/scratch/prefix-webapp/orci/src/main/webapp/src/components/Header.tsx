import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import React, { useEffect, useMemo, useState } from "react";
import { NavDropdown } from "react-bootstrap";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { isLoggedIn } from "../types/User";
import { getSamplePatientsOptions } from "@api/@tanstack/react-query.gen";
import type { SamplePatientDto } from "@api";

function Header() {
  const authUser = useAuth();
  const [userName, setUsername] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { data: samplePatientData = [] } = useQuery({
    ...getSamplePatientsOptions(),
    enabled: isLoggedIn(authUser.user),
  });

  const samplePatientGroups = useMemo(() => {
    if (!isLoggedIn(authUser.user)) return [];
    const byClientId = new Map(samplePatientData.map((g) => [g.clientId, g]));
    return authUser.user.allowedTenants.map(
      (tenantId) =>
        byClientId.get(tenantId) ?? {
          clientId: tenantId,
          title: tenantId,
          patients: [],
        },
    );
  }, [samplePatientData, authUser.user]);

  useEffect(() => {
    if (isLoggedIn(authUser.user)) {
      setUsername("(" + authUser.user.name + ")");
      setIsAdmin(authUser.user.roles.indexOf("ROLE_ADMIN") !== -1);
    } else {
      setUsername("");
      setIsAdmin(false);
    }
  }, [authUser]);

  return (
    <header className="border-bottom">
      <Navbar bg="light" expand={false} className="top ">
        <Navbar.Brand href="/"></Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto mt-2 mx-2">
            <Nav.Link href="/">Home</Nav.Link>
            {samplePatientGroups.map((group) => (
              <PatientLaunchDropdown
                key={group.clientId}
                clientId={group.clientId}
                title={group.title}
                patients={group.patients}
              />
            ))}
            {isAdmin && (
              <>
                <NavDropdown title="Admin Center" id="admin-center">
                  <NavDropdown.Item href="/admin/allergy-reactions">
                    Allergy Reactions
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/api-tokens">
                    API Tokens
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/medications">
                    Medications
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/manage-data">
                    Manage Data
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/reporting">
                    Reporting
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/feedback-submissions">
                    User Feedback
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/release-notes">
                    Release Notes
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/feature-flags">
                    Feature Flags
                  </NavDropdown.Item>
                </NavDropdown>
                <NavDropdown title="Test Utilities" id="test-utilites">
                  <NavDropdown.Item href="/admin/simulation/med-admin">
                    Document Med Admin Simulation
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/simulation/med-admins">
                    Document Med Admins Simulation
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/simulation/med-admin-default-ndcs">
                    Document Med Admin (Default NDCs) Simulation
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/simulation/med-admin-notification">
                    Med Admin Notifications
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/integration-harness">
                    Integration Harness
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/event-center">
                    Event Center
                  </NavDropdown.Item>
                  <NavDropdown.Item href="/admin/hl7-messages">
                    HL7 Messages
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            )}
            {userName && <Nav.Link href="/logout">Logout {userName}</Nav.Link>}
            {userName == "" && <Nav.Link href="/login">Login</Nav.Link>}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}

function PatientLaunchDropdown(props: {
  clientId: string;
  title: string;
  patients: SamplePatientDto[];
}) {
  return (
    <NavDropdown title={props.title} id={`sample-${props.clientId}-patients`}>
      {props.patients.map((patient) => (
        <NavDropdown.Item key={patient.launchUrl} href={patient.launchUrl}>
          {patient.label}
        </NavDropdown.Item>
      ))}
      <NavDropdown.Item href={`/admin/patients?client_id=${props.clientId}`}>
        Patients
      </NavDropdown.Item>
      <NavDropdown.Item
        href={`/admin/templates/patients?client_id=${props.clientId}`}
      >
        Patient Templates
      </NavDropdown.Item>
    </NavDropdown>
  );
}

export default Header;
