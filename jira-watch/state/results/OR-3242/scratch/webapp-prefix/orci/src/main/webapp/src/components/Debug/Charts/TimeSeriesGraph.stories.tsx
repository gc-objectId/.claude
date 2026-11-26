import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimeSeriesGraph } from "./TimeSeriesGraph";

const start = Date.UTC(2024, 2, 5, 7, 0);

function at(minutes: number, value: number) {
  return { time: new Date(start + minutes * 60_000), value };
}

const points = [
  at(0, 0.52),
  at(75, 0.61),
  at(150, 0.48),
  at(225, 0.7),
  at(300, 0.66),
];

const meta: Meta<typeof TimeSeriesGraph> = {
  component: TimeSeriesGraph,
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj<typeof TimeSeriesGraph>;

export const Line: Story = {
  args: { points, yAxisLabel: "ISC", width: 640, height: 200 },
};

export const Step: Story = {
  args: {
    points,
    yAxisLabel: "Rate (mL/h)",
    width: 640,
    height: 200,
    lineStyle: "step",
    lineColor: "var(--guided-color-chart-series-2)",
  },
};

export const Empty: Story = {
  args: { points: [], yAxisLabel: "ISC", width: 640, height: 200 },
};
