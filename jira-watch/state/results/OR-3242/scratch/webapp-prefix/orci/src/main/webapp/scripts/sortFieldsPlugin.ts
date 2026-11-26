import type { Symbol } from "@hey-api/codegen-core";
import {
  type Client,
  clientDefaultConfig,
  clientDefaultMeta,
  type DefinePlugin,
  definePluginConfig,
} from "@hey-api/openapi-ts";

/**
 * Alphabetically sorts fields in type definitions to ensure deterministic output
 */
const sortFieldsPluginHandler: SortFieldsPlugin["Handler"] = ({ plugin }) => {
  const schemas = plugin.context.spec.components?.schemas;
  if (!schemas) {
    return;
  }

  // Process all schema definitions
  for (const schemaName of Object.keys(schemas)) {
    const schemaSymbol = plugin.querySymbol({
      category: "type",
      pluginName: "@hey-api/typescript",
      resource: "definition",
      resourceId: `#/components/schemas/${schemaName}`,
      tool: "typescript",
    });

    if (!schemaSymbol) {
      continue;
    }

    sortTypeProperties(schemaSymbol);
  }

  // Also process operation types (request/response types)
  plugin.forEach("operation", ({ operation }) => {
    if (!operation.id) return;

    // Sort data (request) type properties
    const dataSymbol = plugin.querySymbol({
      category: "type",
      resource: "operation",
      resourceId: operation.id,
      role: "data",
      tool: "typescript",
    });
    if (dataSymbol) {
      sortTypeProperties(dataSymbol);
    }

    // Sort response type properties
    const responseSymbol = plugin.querySymbol({
      category: "type",
      resource: "operation",
      resourceId: operation.id,
      role: "response",
      tool: "typescript",
    });
    if (responseSymbol) {
      sortTypeProperties(responseSymbol);
    }

    // Sort error type properties
    const errorSymbol = plugin.querySymbol({
      category: "type",
      resource: "operation",
      resourceId: operation.id,
      role: "error",
      tool: "typescript",
    });
    if (errorSymbol) {
      sortTypeProperties(errorSymbol);
    }
  });
};

const sortTypeProperties = (symbol: Symbol): void => {
  sortTypeNode(symbol.node);
};

// The DSL wraps child nodes in `{ "~ref": node }` envelopes, so every hop
// through the type graph has to unwrap before inspecting the node.
const deref = (node: any): any =>
  node && typeof node === "object" && "~ref" in node ? node["~ref"] : node;

// Recursively sorts every property map reachable from a node, covering object
// types, union/intersection members, and nested type wrappers.
const sortTypeNode = (node: any): void => {
  const target = deref(node);
  if (!target || typeof target !== "object") return;

  if (target._props instanceof Map) {
    sortPropsMap(target);
  }

  // Union and intersection members live in a plain array; `types` is a builder
  // method rather than data, so only the underscore-prefixed field is read.
  if (Array.isArray(target._types)) {
    for (const type of target._types) {
      sortTypeNode(type);
    }
  }

  sortTypeNode(target._type);
  sortTypeNode(target.value);
};

// Property order is the Map's insertion order, so sorting means rebuilding it.
const sortPropsMap = (target: any): void => {
  const entries: Array<[string, any]> = [...target._props.entries()];
  entries.sort(([, a], [, b]) =>
    String(a?.propName ?? "").localeCompare(String(b?.propName ?? "")),
  );
  target._props.clear();
  for (const [key, prop] of entries) {
    target._props.set(key, prop);
  }

  for (const [, prop] of entries) {
    sortTypeNode(prop?._type);
  }
};

export type Config = Client.Config & {
  /**
   * Plugin name. Must be unique.
   */
  name: "orci-sort-fields";
};

export type SortFieldsPlugin = DefinePlugin<Config, Config>;

export const defaultConfig: SortFieldsPlugin["Config"] = {
  ...clientDefaultMeta,
  config: {
    ...clientDefaultConfig,
    bundle: false,
  },
  // This plugin should run after the typescript plugin generates types
  dependencies: ["@hey-api/typescript"],
  handler: sortFieldsPluginHandler,
  name: "orci-sort-fields",
  tags: ["client"],
};

export const sortFieldsPlugin = definePluginConfig(defaultConfig);
