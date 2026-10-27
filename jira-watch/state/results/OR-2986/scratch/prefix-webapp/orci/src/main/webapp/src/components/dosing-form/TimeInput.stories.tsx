import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimeInput, useTimeInput } from "./TimeInput";
import { Card } from "react-bootstrap";
import { useRef } from "react";

const meta: Meta<typeof TimeInput> = {
  component: TimeInput,
};

export default meta;

type Story = StoryObj<typeof TimeInput>;

function TimeInputWithHook() {
  const scanTimeRef = useRef(new Date());
  const timeHook = useTimeInput(scanTimeRef.current);
  return (
    <>
      <div>
        <TimeInput timeHook={timeHook} />
      </div>

      <Card className="p-3 mt-3">
        <pre>{JSON.stringify(timeHook.state, null, 1)}</pre>
      </Card>
    </>
  );
}

export const Info: Story = {
  render: () => <TimeInputWithHook />,
};
