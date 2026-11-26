import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "react-bootstrap";

const meta: Meta = {
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj;

function ButtonSet() {
  return (
    <div style={{ display: "grid", gap: "var(--guided-space-3)" }}>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <Button>Primary</Button>
        <Button variant="outline-primary">Outline primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  );
}

export const AdminShell: Story = {
  render: () => <ButtonSet />,
};

export const ClinicalShell: Story = {
  render: () => (
    <div className="clinical-shell">
      <ButtonSet />
    </div>
  ),
};
