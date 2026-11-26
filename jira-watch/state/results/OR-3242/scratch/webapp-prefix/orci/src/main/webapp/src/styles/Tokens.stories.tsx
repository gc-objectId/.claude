import type { Meta, StoryObj } from "@storybook/react-vite";
import { CSSProperties, ReactNode, useEffect, useState } from "react";

const PREFIX = "--guided-";

function useColorMode() {
  const root = document.documentElement;
  const [mode, setMode] = useState(root.dataset.bsTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setMode(root.dataset.bsTheme));
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-bs-theme"],
    });
    return () => observer.disconnect();
  }, [root]);
  return mode;
}

function appliesToRoot(rule: CSSStyleRule) {
  return rule.selectorText
    .split(",")
    .some((selector) => selector.trim() === ":root");
}

function readGuidedTokens(): Map<string, string> {
  const properties = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule) || !appliesToRoot(rule)) {
        continue;
      }
      for (const property of Array.from(rule.style)) {
        if (property.startsWith(PREFIX)) {
          properties.add(property);
        }
      }
    }
  }
  const computed = getComputedStyle(document.documentElement);
  return new Map(
    Array.from(properties, (property) => [
      property.slice(PREFIX.length),
      computed.getPropertyValue(property).trim(),
    ]),
  );
}

function tokensMatching(prefixes: string[]) {
  return Array.from(readGuidedTokens()).filter(([name]) =>
    prefixes.some((prefix) => name.startsWith(prefix)),
  );
}

function cssVar(name: string) {
  return `var(${PREFIX}${name})`;
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
  gap: "var(--guided-space-3)",
};

function Specimen({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "var(--guided-space-1)" }}>
      {children}
      <span className="font-monospace small">{name}</span>
      <span className="small text-secondary">{value}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--guided-space-4)" }}>
      <h2 className="guided-section-title mb-2">{title}</h2>
      <div style={grid}>{children}</div>
    </section>
  );
}

const swatch = (name: string): CSSProperties => ({
  height: "4rem",
  background: cssVar(name),
  border: "1px solid var(--guided-color-border-muted)",
  borderRadius: "var(--guided-radius-md)",
});

function PaletteSpecimens() {
  useColorMode();
  const brand = tokensMatching(["brand-"]);
  const semantic = tokensMatching(["color-"]);
  return (
    <>
      <Group title="Brand">
        {brand.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <div style={swatch(name)} />
          </Specimen>
        ))}
      </Group>
      <Group title="Semantic">
        {semantic.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <div style={swatch(name)} />
          </Specimen>
        ))}
      </Group>
    </>
  );
}

function TypeScaleSpecimens() {
  const sizes = tokensMatching(["font-size-"]);
  const weights = tokensMatching(["font-weight-"]);
  const lineHeights = tokensMatching(["line-height-"]);
  return (
    <>
      <Group title="Size">
        {sizes.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <p style={{ margin: 0, fontSize: cssVar(name), lineHeight: 1.2 }}>
              GuidedOR Aa
            </p>
          </Specimen>
        ))}
      </Group>
      <Group title="Weight">
        {weights.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <p
              style={{
                margin: 0,
                fontSize: "var(--guided-font-size-lg)",
                fontWeight: cssVar(name),
              }}
            >
              GuidedOR Aa
            </p>
          </Specimen>
        ))}
      </Group>
      <Group title="Line height">
        {lineHeights.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <p style={{ margin: 0, lineHeight: cssVar(name) }}>
              Recommendations are not a substitute for clinical judgment. Every
              line of this paragraph sits on the same measure.
            </p>
          </Specimen>
        ))}
      </Group>
    </>
  );
}

function SpacingSpecimens() {
  return (
    <Group title="Space">
      {tokensMatching(["space-"]).map(([name, value]) => (
        <Specimen key={name} name={name} value={value}>
          <div
            style={{
              width: cssVar(name),
              height: "1rem",
              background: "var(--guided-color-heading)",
            }}
          />
        </Specimen>
      ))}
    </Group>
  );
}

function ShapeSpecimens() {
  useColorMode();
  const radii = tokensMatching(["radius-"]);
  const elevations = tokensMatching(["elevation-", "focus-ring"]);
  return (
    <>
      <Group title="Radius">
        {radii.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <div
              style={{
                height: "4rem",
                border: "1px solid var(--guided-color-heading)",
                borderRadius: cssVar(name),
              }}
            />
          </Specimen>
        ))}
      </Group>
      <Group title="Elevation and focus">
        {elevations.map(([name, value]) => (
          <Specimen key={name} name={name} value={value}>
            <div
              style={{
                height: "4rem",
                margin: "var(--guided-space-2)",
                background: "var(--guided-color-surface)",
                borderRadius: "var(--guided-radius-md)",
                boxShadow: cssVar(name),
              }}
            />
          </Specimen>
        ))}
      </Group>
    </>
  );
}

const meta: Meta = {
  parameters: { controls: { disable: true } },
};

export default meta;

type Story = StoryObj;

export const Palette: Story = { render: () => <PaletteSpecimens /> };
export const TypeScale: Story = { render: () => <TypeScaleSpecimens /> };
export const Spacing: Story = { render: () => <SpacingSpecimens /> };
export const Shape: Story = { render: () => <ShapeSpecimens /> };
