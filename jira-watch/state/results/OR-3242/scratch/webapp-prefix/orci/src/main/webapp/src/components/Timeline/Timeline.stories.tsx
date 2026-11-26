import type { Meta, StoryObj } from "@storybook/react-vite";

import { Timeline } from "./Timeline";
import { DateTime } from "luxon";

import { logger } from "../../utils/logger";
//👇 This default export determines where your story goes in the story list
let key = 0;
const meta: Meta<typeof Timeline> = {
  component: Timeline,
  decorators: [
    (Story, context) => {
      logger.debug("new key:", key);

      return <Story key={++key} />;
    },
    (Story) => (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "400px",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Timeline>;

export const Example: Story = {
  args: {
    timelineEvents: [
      {
        type: "instantaneous",
        date: DateTime.now().minus({ seconds: 1 }),
        label: "foo",
        category: "foo",
        id: "1",
      },
      {
        type: "instantaneous",
        date: DateTime.now().minus({ seconds: 5 }),
        label: "foo2",
        category: "foo",
        id: "2",
      },
      {
        type: "instantaneous",
        date: DateTime.now().minus({ seconds: 3 }),
        label: "bar",
        category: "bar",
        id: "3",
      },
      {
        type: "span",
        startDate: DateTime.now().minus({ seconds: 8 }),
        endDate: DateTime.now().minus({ seconds: 6 }),
        label: "baz",
        category: "baz",
        id: "4",
      },
      {
        type: "span",
        startDate: DateTime.now().minus({ seconds: 7 }),
        endDate: DateTime.now().minus({ seconds: 4 }),
        label: "baz2",
        category: "baz",
        id: "5",
      },
    ],
  },
};
