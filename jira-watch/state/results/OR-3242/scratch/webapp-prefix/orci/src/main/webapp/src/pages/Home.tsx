import { Button, Container, Dropdown, Modal } from "react-bootstrap";
import { ThreeDots } from "react-bootstrap-icons";
import { Link, Navigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import React, { useState } from "react";
import {
  isAdmin,
  isLoggedIn,
  LoadingUser,
  UserCheckFailed,
} from "../types/User";
import { QuickPatientLauncher } from "../components/Admin/QuickPatientLauncher";
import { AccountMenu } from "../components/AccountMenu";
import { SectionHeader } from "../components/SectionHeader";
import { PageLoading } from "../components/PageLoading";
import ErrorPage from "./ErrorPage";
import {
  adminIndex,
  LaunchTenant,
  NavGroup,
  useLaunchTenants,
} from "../components/adminIndex";
import "./Home.scss";

function LaunchRow({
  tenant,
  showAdminMenu,
}: {
  tenant: LaunchTenant;
  showAdminMenu: boolean;
}) {
  return (
    <li className="launch-row">
      <h3 className="guided-eyebrow launch-row__title">{tenant.title}</h3>
      <div className="launch-row__patients">
        {tenant.samplePatients.length > 0 ? (
          tenant.samplePatients.map((patient) => (
            <Button
              key={patient.href}
              href={patient.href}
              variant="outline-primary"
              size="sm"
            >
              {patient.label}
            </Button>
          ))
        ) : (
          <span className="launch-row__empty">
            No sample patients configured
          </span>
        )}
      </div>
      {showAdminMenu && (
        <Dropdown align="end" className="launch-row__menu">
          <Dropdown.Toggle
            variant="link"
            className="launch-row__menu-toggle"
            aria-label={`${tenant.title} actions`}
          >
            <ThreeDots size={18} aria-hidden="true" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item as={Link} to={tenant.patientsHref}>
              Patients
            </Dropdown.Item>
            <Dropdown.Item as={Link} to={tenant.templatesHref}>
              Patient Templates
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      )}
    </li>
  );
}

function LaunchByIdButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline-primary" size="sm" onClick={() => setOpen(true)}>
        Launch by ID
      </Button>
      <Modal show={open} onHide={() => setOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Launch by ID</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <QuickPatientLauncher />
        </Modal.Body>
      </Modal>
    </>
  );
}

function IndexPanel({ group }: { group: NavGroup }) {
  return (
    <section className="guided-panel index-panel">
      <h2 className="guided-eyebrow index-panel__title">{group.title}</h2>
      <ul className="index-list">
        {group.links.map((link) => (
          <li key={link.href}>
            <Link className="index-link" to={link.href}>
              <span className="index-link__title">{link.label}</span>
              <span className="index-link__description">
                {link.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const Home = () => {
  const { user } = useAuth();
  const tenants = useLaunchTenants();
  if (user === LoadingUser) {
    return <PageLoading />;
  }
  if (user === UserCheckFailed) {
    return <ErrorPage />;
  }
  if (!isLoggedIn(user)) {
    return <Navigate to="/login" replace />;
  }
  const admin = isAdmin(user);
  return (
    <div className="guided-page home-page">
      <Container>
        <main role="main" className="home-content">
          <section className="guided-panel home-hero">
            <h1 className="home-hero__title">
              <span className="guided-eyebrow">Welcome to</span>
              <span className="guided-product-mark home-hero__product">
                GuidedOR
              </span>
            </h1>
            <AccountMenu user={user} />
          </section>
          <section>
            <SectionHeader title="Launch" actions={<LaunchByIdButton />} />
            <ul className="guided-panel launch-list">
              {tenants.map((tenant) => (
                <LaunchRow
                  key={tenant.clientId}
                  tenant={tenant}
                  showAdminMenu={admin}
                />
              ))}
            </ul>
          </section>
          {admin && (
            <section>
              <SectionHeader title="Administration" />
              <div className="index-grid">
                {adminIndex.map((group) => (
                  <IndexPanel key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}
        </main>
      </Container>
      <Footer />
    </div>
  );
};
export default Home;
