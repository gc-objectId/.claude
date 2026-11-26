import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fact, FactList } from "./FactList";

const meta: Meta<typeof FactList> = {
  component: FactList,
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof FactList>;

export const Default: Story = {
  render: () => (
    <FactList>
      <Fact label="PMRN" wide>
        Z1234567
      </Fact>
      <Fact label="MRN" wide>
        000123456
      </Fact>
      <Fact label="DOB">1961-04-02 (65 y.o.)</Fact>
      <Fact label="Gender">Female</Fact>
      <Fact label="Weight">72 kg</Fact>
      <Fact label="Height">168 cm</Fact>
    </FactList>
  ),
};

export const Invalid: Story = {
  render: () => (
    <FactList>
      <Fact label="DOB">1961-04-02</Fact>
      <Fact label="Weight *" invalid>
        seventy kilos
      </Fact>
    </FactList>
  ),
};
