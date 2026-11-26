import type { Meta, StoryObj } from "@storybook/react-vite";
import { withSignedInUser } from "../../.storybook/decorators";
import Footer from "./Footer";

const meta: Meta<typeof Footer> = {
  component: Footer,
  decorators: [withSignedInUser],
  parameters: { layout: "fullscreen", controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof Footer>;

export const Bar: Story = {
  render: () => (
    <div className="guided-page d-flex flex-column">
      <Footer />
    </div>
  ),
};

export const Clinical: Story = {
  render: () => (
    <div className="clinical-shell" style={{ minHeight: "100vh" }}>
      <Footer clinical />
    </div>
  ),
};
