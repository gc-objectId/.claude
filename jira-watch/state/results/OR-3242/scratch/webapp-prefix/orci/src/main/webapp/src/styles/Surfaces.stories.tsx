import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj;

const panelPadding = { padding: "var(--guided-space-4)" };

export const Page: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="guided-page" style={panelPadding}>
      <div className="guided-panel" style={panelPadding}>
        <p className="guided-eyebrow">Page</p>
        <p className="mb-0">
          The cream ground every signed-in screen sits on, with content carried
          on a white panel.
        </p>
      </div>
    </div>
  ),
};

export const Panel: Story = {
  render: () => (
    <div
      className="guided-panel"
      style={{ ...panelPadding, maxWidth: "32rem" }}
    >
      <p className="guided-eyebrow">Panel</p>
      <p className="mb-0">
        A white card with the muted border, the large radius and the resting
        elevation. Pages, forms and interstitials are built from it.
      </p>
    </div>
  ),
};

export const ProductMark: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--guided-space-3)" }}>
      <p
        className="guided-product-mark m-0"
        style={{ fontSize: "var(--guided-font-size-display)" }}
      >
        GuidedOR
      </p>
      <p
        className="guided-product-mark m-0"
        style={{ fontSize: "var(--guided-font-size-h3)" }}
      >
        GuidedOR
      </p>
      <p
        className="guided-product-mark m-0"
        style={{ fontSize: "var(--guided-font-size-h5)" }}
      >
        GuidedOR
      </p>
    </div>
  ),
};

export const Eyebrow: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--guided-space-2)" }}>
      <span className="guided-eyebrow">Admin</span>
      <span className="guided-eyebrow">Signed in as</span>
      <span className="guided-eyebrow">Tenant</span>
    </div>
  ),
};

export const Tag: Story = {
  render: () => (
    <div className="d-flex flex-wrap gap-1">
      <span className="guided-tag">IV</span>
      <span className="guided-tag">Antibiotic</span>
      <span className="guided-tag">2 g</span>
      <span className="guided-tag">12</span>
      <span className="guided-tag guided-tag--warning">Replaces all</span>
    </div>
  ),
};
