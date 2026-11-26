import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, Button, Form, Nav } from "react-bootstrap";
import { Calendar3, Clipboard, Eye, Link45deg } from "react-bootstrap-icons";
import { withSignedInUser } from "../../.storybook/decorators";
import { TenantID } from "../types/identifiers";
import { TenantScope as TenantScopeField } from "./Admin/TenantScope";
import { AdminPage, AdminPageHeader } from "./AdminPage";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof AdminPage> = {
  component: AdminPage,
  decorators: [withSignedInUser],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof AdminPage>;

const trail = [
  { label: "Patients", to: "/admin/patients" },
  { label: "Jane Example", to: "/admin/patients/1" },
];

export const Shell: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader
        title="Medications"
        meta="Every medication a tenant can administer, with its NDCs and dose options."
      />
      <p className="mb-0">
        Page content renders on the panel, between the header bar and the bar
        footer.
      </p>
    </AdminPage>
  ),
};

export const Header: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader
        title="Operation 2026-10-14"
        trail={trail}
        meta="Started 07:42 · Room MGH OR 12"
        actions={
          <>
            <Button variant="outline-primary">Launch</Button>
            <Button>Edit</Button>
          </>
        }
      />
      <p className="mb-0">A trail, a title, its meta line and the actions.</p>
    </AdminPage>
  ),
};

export const Patterns: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader
        title="Patterns"
        meta="The page-level pieces admin pages are built from."
      />
      <section className="admin-section">
        <SectionHeader title="Toolbar" />
        <div className="admin-toolbar">
          <Form.Control
            type="search"
            placeholder="Search medications"
            className="admin-toolbar__search"
          />
          <Form.Select className="admin-toolbar__filter">
            <option>All routes</option>
          </Form.Select>
          <Button>Add medication</Button>
        </div>
      </section>
      <section className="admin-section">
        <SectionHeader title="Tabs" />
        <Nav variant="tabs" className="admin-tabs" activeKey="config">
          <Nav.Item>
            <Nav.Link eventKey="config">Config files</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="dosing">Dosing</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="citations">Citations</Nav.Link>
          </Nav.Item>
        </Nav>
      </section>
      <section className="admin-section">
        <SectionHeader title="Filters" />
        <div className="admin-filters">
          <Form.Group className="admin-field">
            <Form.Label className="guided-eyebrow">From</Form.Label>
            <Form.Control type="date" />
          </Form.Group>
          <Form.Group className="admin-field">
            <Form.Label className="guided-eyebrow">To</Form.Label>
            <Form.Control type="date" />
          </Form.Group>
          <Form.Group className="admin-field admin-field--wide">
            <Form.Label className="guided-eyebrow">Message type</Form.Label>
            <Form.Select>
              <option>Any</option>
            </Form.Select>
          </Form.Group>
          <div className="admin-filters__actions">
            <Button variant="secondary">Reset</Button>
            <Button>Apply</Button>
          </div>
        </div>
      </section>
      <section className="admin-section">
        <SectionHeader title="Detail panel" />
        <div className="admin-detail">
          <p className="guided-eyebrow mb-0">Selected record</p>
          <pre className="admin-pre admin-pre--scrolling mt-2">
            MSH|^~\&|EPIC|MGH|ORCI|GUIDED|20261014074200||RAS^O17|1|P|2.5
          </pre>
        </div>
      </section>
      <section className="admin-section">
        <SectionHeader title="Empty state" />
        <div className="admin-empty">No records match these filters.</div>
      </section>
      <section className="admin-section">
        <SectionHeader title="Accordion" />
        <Accordion className="admin-accordion" defaultActiveKey="0">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Open section</Accordion.Header>
            <Accordion.Body>
              The active header sits on the cream.
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>Closed section</Accordion.Header>
            <Accordion.Body>Collapsed content.</Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </section>
    </AdminPage>
  ),
};

export const TenantScope: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader title="Medications" />
      <div className="admin-toolbar">
        <TenantScopeField
          value={"demo" as TenantID}
          onChange={() => undefined}
        />
      </div>
    </AdminPage>
  ),
};

export const IconButton: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader title="API Tokens" />
      <div className="api-token">
        <span className="admin-code">gor_••••••••3f9a</span>
        <Button
          variant="outline-primary"
          size="sm"
          className="admin-icon-button"
          aria-label="Show token"
        >
          <Eye aria-hidden="true" />
        </Button>
        <Button
          variant="outline-primary"
          size="sm"
          className="admin-icon-button"
          aria-label="Copy token to clipboard"
        >
          <Clipboard aria-hidden="true" />
        </Button>
      </div>
    </AdminPage>
  ),
};

export const LinkButton: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader
        title="Operation Info"
        actions={
          <Button variant="link" className="admin-link-button">
            <Link45deg aria-hidden="true" /> Launch link
          </Button>
        }
      />
      <Button
        variant="link"
        size="sm"
        className="admin-link-button"
        aria-label="Pick date and time"
      >
        <Calendar3 size={13} aria-hidden="true" />
      </Button>
    </AdminPage>
  ),
};

export const CodeText: Story = {
  render: () => (
    <AdminPage>
      <AdminPageHeader title="Job Queue" />
      <p className="mb-0">
        Job <span className="admin-code">EvaluateRulesJob</span> ran for segment{" "}
        <span className="admin-code">MSH|^~\&|EPIC|MGH</span>.
      </p>
    </AdminPage>
  ),
};
