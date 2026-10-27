import path = require("path");
import { orciPlugin } from "./brandPlugin";
import { sortFieldsPlugin } from "./sortFieldsPlugin";

const openApiUrl =
  process.env.OPENAPI_URL || "http://localhost:8080/v3/api-docs";
const outputDir = path.join(__dirname, "..", "src", "api", "generated");

export default {
  input: openApiUrl,
  output: outputDir,
  plugins: [
    "@hey-api/client-axios",
    "@tanstack/react-query",
    {
      asClass: true,
      name: "@hey-api/sdk",
    },
    orciPlugin(),
    "@hey-api/typescript",
    sortFieldsPlugin(),
  ],
};
