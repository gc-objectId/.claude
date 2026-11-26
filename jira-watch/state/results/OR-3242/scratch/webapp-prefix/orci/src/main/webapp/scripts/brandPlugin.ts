import type { Symbol } from "@hey-api/codegen-core";
import {
  $,
  type Client,
  clientDefaultConfig,
  clientDefaultMeta,
  type DefinePlugin,
  definePluginConfig,
} from "@hey-api/openapi-ts";

/**
 * Generate branded types for the API client, so that for example `PatientId` gets a unique non-interchangeable type, instead of `string`
 * (branded types aka nominal types)
 * Uses the custom x-brand openAPI extension to determine whether a type should be branded.
 */
const orciBrandPluginHandler: BrandPlugin["Handler"] = ({ plugin }) => {
  const schemas = plugin.context.spec.components?.schemas;
  if (!schemas) {
    console.log("no schemas");
    return;
  }

  const brandedSchemas = collectBrandedSchemas(schemas);
  if (!brandedSchemas.length) return;

  const { brandSymbols, runtypesStatic } = registerBrandSymbols(
    plugin,
    brandedSchemas,
  );

  const brandTypeSymbols = brandSchemaDefinitions(
    plugin,
    brandedSchemas,
    brandSymbols,
    runtypesStatic,
  );

  if (brandTypeSymbols.size !== brandedSchemas.length) {
    const unbranded = brandedSchemas
      .map(({ identifierName }) => identifierName)
      .filter((identifierName) => !brandTypeSymbols.has(identifierName));
    throw new Error(
      `orci-brands: expected ${
        brandedSchemas.length
      } branded type aliases, produced ${
        brandTypeSymbols.size
      }. Unbranded: ${unbranded.join(
        ", ",
      )}. Port brandSchemaDefinitions to the current @hey-api/openapi-ts node shape before regenerating.`,
    );
  }

  applyPathBranding(plugin, brandTypeSymbols);
};

export type Config = Client.Config & {
  /**
   * Plugin name. Must be unique.
   */
  name: "orci-brands";
};

export type BrandPlugin = DefinePlugin<Config, Config>;

export const defaultConfig: BrandPlugin["Config"] = {
  ...clientDefaultMeta,
  config: {
    ...clientDefaultConfig,
    bundle: false,
  },
  dependencies: ["@hey-api/typescript"],
  handler: orciBrandPluginHandler,
  name: "orci-brands",
  tags: ["client"],
};

export const orciPlugin = definePluginConfig(defaultConfig);

interface BrandedSchema {
  schemaName: string;
  identifierName: string;
}

type SchemaMap = NonNullable<
  NonNullable<
    BrandPlugin["Instance"]["context"]["spec"]["components"]
  >["schemas"]
>;

type BrandSymbolMap = Map<string, Symbol>;

const collectBrandedSchemas = (schemas: SchemaMap): BrandedSchema[] =>
  Object.entries(schemas)
    .map(([schemaName, schema]) => {
      const brand = schema?.["x-brand"];
      if (typeof brand !== "string") return undefined;
      return { schemaName, identifierName: brand };
    })
    .filter((item): item is BrandedSchema => item !== undefined);

const registerBrandSymbols = (
  plugin: BrandPlugin["Instance"],
  brandedSchemas: BrandedSchema[],
): { brandSymbols: BrandSymbolMap; runtypesStatic: Symbol } => {
  const brandNames: string[] = Array.from(
    new Set(brandedSchemas.map(({ identifierName }) => identifierName)),
  ).sort();

  const runtypesString = plugin.registerSymbol({
    external: "runtypes",
    meta: {
      category: "external",
      resource: "runtypes.String",
    },
    name: "String",
  });

  const runtypesStatic = plugin.registerSymbol({
    external: "runtypes",
    kind: "type",
    meta: {
      category: "external",
      resource: "runtypes.Static",
    },
    name: "Static",
  });

  const brandSymbols: BrandSymbolMap = new Map(
    brandNames.map((identifierName) => {
      const symbol = plugin.registerSymbol({
        exported: true,
        getFilePath: () => "types",
        meta: {
          category: "brand",
          resource: "brand",
          resourceId: identifierName,
          tool: "typescript",
        },
        name: `Brand${identifierName}`,
      });
      const node = $.const(symbol)
        .export(symbol.exported)
        .assign(
          $(runtypesString).attr("withBrand").call($.literal(identifierName)),
        );
      plugin.node(node);

      return [identifierName, symbol];
    }),
  );

  return { brandSymbols, runtypesStatic };
};

const brandSchemaDefinitions = (
  plugin: BrandPlugin["Instance"],
  brandedSchemas: BrandedSchema[],
  brandSymbols: BrandSymbolMap,
  runtypesStatic: Symbol,
): Map<string, Symbol> => {
  const brandTypeSymbols: Map<string, Symbol> = new Map();

  for (const { identifierName, schemaName } of brandedSchemas) {
    const schemaSymbol = plugin.querySymbol({
      category: "type",
      pluginName: "@hey-api/typescript",
      resource: "definition",
      resourceId: `#/components/schemas/${schemaName}`,
      tool: "typescript",
    });

    const brandSymbol = brandSymbols.get(identifierName);
    if (!schemaSymbol || !brandSymbol) {
      continue;
    }

    const brandedType = $.type(runtypesStatic).generic(
      $.type.query(brandSymbol),
    );

    const aliasNode = schemaSymbol.node as any;
    if (!aliasNode?.type) continue;

    aliasNode.type(brandedType);
    brandTypeSymbols.set(identifierName, schemaSymbol);
  }

  return brandTypeSymbols;
};

const applyPathBranding = (
  plugin: BrandPlugin["Instance"],
  brandTypeSymbols: Map<string, Symbol>,
) => {
  if (!brandTypeSymbols.size) return;

  let expected = 0;
  let branded = 0;

  plugin.forEach("operation", ({ method, operation, path }) => {
    const paramBrands = collectPathParameterBrands(plugin, path, method);
    if (!paramBrands.size) return;

    expected += [...paramBrands.values()].filter((brandName) =>
      brandTypeSymbols.has(brandName),
    ).length;

    const dataSymbol = plugin.querySymbol({
      category: "type",
      resource: "operation",
      resourceId: operation.id,
      role: "data",
      tool: "typescript",
    });
    if (!dataSymbol) return;

    branded += updatePathTypes(dataSymbol, paramBrands, brandTypeSymbols);
  });

  if (expected && !branded) {
    throw new Error(
      `orci-brands: ${expected} path parameter(s) carry a brand but none were applied. Port updatePathTypes to the current @hey-api/openapi-ts node shape before regenerating.`,
    );
  }
};

const collectPathParameterBrands = (
  plugin: BrandPlugin["Instance"],
  path: string,
  method: string,
): Map<string, string> => {
  const result = new Map<string, string>();

  const pathItem = plugin.context.spec.paths?.[path];
  if (!pathItem) return result;

  const operation = (pathItem as Record<string, unknown>)[method] as
    | { parameters?: Array<unknown> }
    | undefined;

  const parameters: Array<unknown> = [
    ...(Array.isArray((pathItem as any).parameters)
      ? (pathItem as any).parameters
      : []),
    ...(Array.isArray(operation?.parameters) ? operation!.parameters! : []),
  ];

  for (const parameter of parameters) {
    const resolved = resolveParameter(parameter, plugin);
    if (!resolved || resolved.in !== "path") continue;

    const brand = extractBrandFromSchema(resolved.schema, plugin);
    if (!brand) continue;

    result.set(resolved.name, brand);
  }

  return result;
};

const resolveRef = (ref: string, spec: unknown): any => {
  if (!ref.startsWith("#/") || typeof spec !== "object" || !spec) return;
  const path = ref
    .replace(/^#\//, "")
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current: any = spec;
  for (const segment of path) {
    current = current?.[segment];
    if (current === undefined) return;
  }
  return current;
};

const resolveParameter = (
  parameter: unknown,
  plugin: BrandPlugin["Instance"],
): { in?: string; name: string; schema?: unknown } | undefined => {
  if (parameter && typeof parameter === "object" && "$ref" in parameter) {
    const ref = (parameter as { $ref: string }).$ref;
    const resolved = resolveRef(ref, plugin.context.spec);
    if (!resolved || typeof resolved !== "object") return undefined;
    return resolved as any;
  }

  if (
    !parameter ||
    typeof parameter !== "object" ||
    typeof (parameter as any).name !== "string"
  ) {
    return undefined;
  }

  return parameter as any;
};

const extractBrandFromSchema = (
  schema: any,
  plugin: BrandPlugin["Instance"],
): string | undefined => {
  if (!schema) return undefined;
  if (typeof schema["x-brand"] === "string") {
    return schema["x-brand"];
  }
  if (schema.$ref && typeof schema.$ref === "string") {
    const resolved = resolveRef(schema.$ref, plugin.context.spec);
    if (resolved && typeof resolved["x-brand"] === "string") {
      return resolved["x-brand"];
    }
  }
  return undefined;
};

// The DSL wraps child nodes in `{ "~ref": node }` envelopes, so the path
// property's type has to be unwrapped before its own properties are reachable.
const deref = (node: any): any =>
  node && typeof node === "object" && "~ref" in node ? node["~ref"] : node;

const updatePathTypes = (
  dataSymbol: Symbol,
  paramBrands: Map<string, string>,
  brandTypeSymbols: Map<string, Symbol>,
): number => {
  const dataType = deref((dataSymbol.node as any)?.value);
  if (!(dataType?._props instanceof Map)) return 0;

  const pathType = deref(dataType._props.get("prop:path")?._type);
  if (!(pathType?._props instanceof Map)) return 0;

  let branded = 0;
  for (const prop of pathType._props.values()) {
    const brandName = paramBrands.get(String(prop?.propName));
    if (!brandName) continue;

    const brandType = brandTypeSymbols.get(brandName);
    if (!brandType) continue;

    prop.type($.type(brandType));
    branded += 1;
  }

  return branded;
};
