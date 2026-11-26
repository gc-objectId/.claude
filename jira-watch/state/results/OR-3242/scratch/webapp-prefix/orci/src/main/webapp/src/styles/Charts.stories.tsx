import type { Meta, StoryObj } from "@storybook/react-vite";
import { CSSProperties } from "react";

const SERIES = [1, 2, 3, 4, 5, 6, 7, 8];

const swatch = (name: string): CSSProperties => ({
  height: "3rem",
  background: `var(--guided-color-chart-${name})`,
  border: "1px solid var(--guided-color-border-muted)",
  borderRadius: "var(--guided-radius-md)",
});

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
  gap: "var(--guided-space-3)",
};

function Specimen({ name }: { name: string }) {
  return (
    <div style={{ display: "grid", gap: "var(--guided-space-1)" }}>
      <div style={swatch(name)} />
      <span className="font-monospace small">chart-{name}</span>
    </div>
  );
}

const meta: Meta = {
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj;

export const Series: Story = {
  render: () => (
    <div style={grid}>
      {SERIES.map((slot) => (
        <Specimen key={slot} name={`series-${slot}`} />
      ))}
    </div>
  ),
};

export const Frame: Story = {
  render: () => (
    <div style={grid}>
      <Specimen name="ground" />
      <Specimen name="grid" />
      <Specimen name="axis" />
    </div>
  ),
};
