// eslint.config.js
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslintParser from "@typescript-eslint/parser";

export default defineConfig([
  globalIgnores(["src/api/generated/**"]),
  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        ecmaVersion: "latest", // or specific ES version
        sourceType: "module", // if using ES modules
        project: ["./tsconfig.json"], // Path to your tsconfig.json, enables type-aware linting
      },
    },
    files: ["src/**/*.js", "src/**/*.ts", "src/**/*.tsx"],
    rules: {
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      ...reactHooks.configs["recommended-latest"].rules,
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
]);
