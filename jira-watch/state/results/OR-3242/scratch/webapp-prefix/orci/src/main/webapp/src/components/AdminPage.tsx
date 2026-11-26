import { ReactNode } from "react";
import { Breadcrumb, Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import "./AdminPage.scss";

export function AdminPage({
  children,
  fluid = false,
}: {
  children: ReactNode;
  fluid?: boolean;
}) {
  return (
    <div className="guided-page admin-page">
      <Header fluid={fluid} />
      <Container fluid={fluid || "md"}>
        <main role="main" className="guided-panel admin-page__main">
          {children}
        </main>
      </Container>
      <Footer />
    </div>
  );
}

export type AdminCrumb = { label: ReactNode; to: string };

export function AdminPageHeader({
  title,
  trail = [],
  meta,
  actions,
}: {
  title: ReactNode;
  trail?: AdminCrumb[];
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="admin-page__header">
      <div className="admin-page__heading">
        {trail.length > 0 && (
          <Breadcrumb className="admin-page__trail">
            {trail.map((crumb) => (
              <Breadcrumb.Item
                key={crumb.to}
                linkAs={Link}
                linkProps={{ to: crumb.to }}
              >
                {crumb.label}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        )}
        <h1 className="admin-page__title">{title}</h1>
        {meta && <p className="admin-page__meta">{meta}</p>}
      </div>
      {actions && <div className="admin-page__actions">{actions}</div>}
    </header>
  );
}
