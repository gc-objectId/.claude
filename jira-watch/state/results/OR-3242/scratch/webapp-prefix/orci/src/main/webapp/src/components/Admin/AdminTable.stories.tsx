import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "react-bootstrap";
import { CaretDownFill } from "react-bootstrap-icons";
import { AdminTable } from "./AdminTable";

const meta: Meta<typeof AdminTable> = {
  component: AdminTable,
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof AdminTable>;

const rows = [
  {
    name: "Cefazolin",
    id: "m-cefazolin",
    routes: ["IV"],
    doses: ["1 g", "2 g"],
  },
  {
    name: "Vancomycin",
    id: "m-vancomycin",
    routes: ["IV"],
    doses: ["1 g", "1.5 g"],
  },
  {
    name: "Metronidazole",
    id: "m-metronidazole",
    routes: ["IV", "PO"],
    doses: ["500 mg"],
  },
];

export const Default: Story = {
  render: () => (
    <AdminTable>
      <thead>
        <tr>
          <th aria-sort="descending">
            <button type="button" className="admin-table__sort">
              Medication <CaretDownFill aria-hidden="true" />
            </button>
          </th>
          <th>Routes</th>
          <th>Doses</th>
          <th className="visually-hidden">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <a href="#medication">{row.name}</a>
              <span className="admin-table__secondary">{row.id}</span>
            </td>
            <td>
              <div className="admin-table__tags">
                {row.routes.map((route) => (
                  <span key={route} className="guided-tag">
                    {route}
                  </span>
                ))}
              </div>
            </td>
            <td>{row.doses.join(", ")}</td>
            <td>
              <div className="admin-table__actions">
                <Button size="sm" variant="outline-primary">
                  Edit
                </Button>
                <Button size="sm" variant="outline-danger">
                  Remove
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  ),
};

export const Selectable: Story = {
  render: () => (
    <AdminTable className="admin-table--selectable">
      <thead>
        <tr>
          <th>Version</th>
          <th>Published</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.42.0</td>
          <td>2026-10-14</td>
        </tr>
        <tr>
          <td>1.41.0</td>
          <td>2026-09-30</td>
        </tr>
      </tbody>
    </AdminTable>
  ),
};

export const Empty: Story = {
  render: () => (
    <AdminTable>
      <thead>
        <tr>
          <th>Medication</th>
          <th>Routes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={2} className="admin-table__empty">
            No medications match this search.
          </td>
        </tr>
      </tbody>
    </AdminTable>
  ),
};
