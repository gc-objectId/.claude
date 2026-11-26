import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "react-bootstrap";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  component: SectionHeader,
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof SectionHeader>;

export const TitleOnly: Story = {
  args: { title: "Operations" },
};

export const WithActions: Story = {
  args: {
    title: "Operations",
    actions: <Button size="sm">Add Operation</Button>,
  },
};
