import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import eslintPlugin from "@nabla/vite-plugin-eslint";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "node:path";

export default defineConfig((command, mode) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");
  const proxyHost = env.VITE_PROXY_HOST_URL || "http://localhost:8080";

  return {
    base: "/",
    plugins: [
      react(),
      eslintPlugin(),
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: "guided-clinical-solutions",
        project: "guidedor",
        sourcemaps: {
          assets: "./build/**",
          filesToDeleteAfterUpload: ["./build/**/*.map"],
        },
        release: {
          finalize: false,
        },
      }),
    ],

    root: "./",
    server: {
      open: true, // Opens the browser on server start
      port: env.VITE_PORT || 3000, // Use the PORT environment variable or fallback to 3000
      proxy: {
        "/api": {
          target: proxyHost,
        },
        "/csrf": {
          target: proxyHost,
        },
        "/actuator": {
          target: proxyHost,
        },
        "/websocket": {
          target: proxyHost,
          ws: true,
        },
        "/ws": {
          target: proxyHost,
          ws: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ["import"],
        },
      },
    },
    build: {
      outDir: "./build", // Specify the output directory (similar to CRA)
      sourcemap: "hidden",
      rollupOptions: {
        output: {
          // Change 'assets' to 'static'
          assetFileNames: "static/[name].[hash].[ext]",
          chunkFileNames: "static/[name].[hash].js",
          entryFileNames: "static/[name].[hash].js",
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
        "@api": path.resolve(__dirname, "src/api/generated"),
      },
    },
  };
});
