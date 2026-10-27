import "bootstrap/dist/css/bootstrap.min.css";
import type { Preview } from "@storybook/react-vite";
import "../src/index.scss";
import "../src/App.scss";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
