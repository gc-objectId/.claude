#!/usr/bin/env node

import { readFileSync } from "node:fs";
import postcss from "postcss";

const [baseFile, headFile, ...flags] = process.argv.slice(2);
if (!baseFile || !headFile) {
  console.error("usage: cascade-diff.mjs base.css head.css [--all-flips]");
  process.exit(2);
}
const allFlips = flags.includes("--all-flips");

function specificity(selector) {
  const stripped = selector.replace(/::?[a-z-]+\(([^)]*)\)/g, (m, inner) =>
    /^::?(not|is|where|has)/.test(m) ? inner : ":x",
  );
  const ids = (stripped.match(/#[\w-]+/g) || []).length;
  const classes = (stripped.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || [])
    .length;
  const elements =
    (stripped.match(/(^|[\s>+~(,])[a-zA-Z][\w-]*/g) || []).length +
    (stripped.match(/::[\w-]+/g) || []).length;
  return ids * 10000 + classes * 100 + elements;
}

const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g;

function rootCustomProperties(root) {
  const properties = new Map();
  root.walkRules((rule) => {
    if (rule.parent.type !== "root" || !rule.selectors.includes(":root"))
      return;
    rule.walkDecls(/^--/, (d) => properties.set(d.prop, d.value));
  });
  return properties;
}

function resolveVars(value, properties) {
  let resolved = value;
  for (let depth = 0; depth < 10; depth++) {
    const next = resolved.replace(
      VAR_REFERENCE,
      (reference, name, fallback) =>
        properties.get(name) ?? fallback?.trim() ?? reference,
    );
    if (next === resolved) break;
    resolved = next;
  }
  return resolved;
}

function rules(file) {
  const root = postcss.parse(readFileSync(file, "utf8"));
  const properties = rootCustomProperties(root);
  const out = [];
  root.walkRules((rule) => {
    let context = "";
    for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
      if (p.type !== "atrule") continue;
      if (p.name === "keyframes") return;
      context = `@${p.name} ${p.params} ${context}`;
    }
    const decls = new Map();
    rule.walkDecls((d) => {
      if (d.parent === rule)
        decls.set(
          d.prop,
          resolveVars(d.value, properties) + (d.important ? " !important" : ""),
        );
    });
    if (!decls.size) return;
    for (const selector of rule.selectors) {
      const sel = selector.replace(/\s+/g, " ").trim();
      out.push({
        key: context + sel,
        sel,
        context,
        spec: specificity(sel),
        decls,
      });
    }
  });
  return out;
}

function effective(list) {
  const map = new Map();
  for (const r of list) {
    const merged = map.get(r.key) ?? new Map();
    for (const [p, v] of r.decls) merged.set(p, v);
    map.set(r.key, merged);
  }
  return map;
}

function rightmostCompound(sel) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sel.length; i++) {
    const char = sel[i];
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(char)) start = i + 1;
  }
  return sel.slice(start);
}

const PSEUDO_ELEMENT = /::[\w-]+|:(?:before|after|first-line|first-letter)\b/g;

function pseudoElements(compound) {
  return (compound.match(PSEUDO_ELEMENT) ?? [])
    .map((pseudo) => pseudo.replace(/^:+/, ""))
    .join();
}

const sameComponent = (a, b) =>
  a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`);

function couldShareElement(a, b) {
  const ca = rightmostCompound(a);
  const cb = rightmostCompound(b);
  if (pseudoElements(ca) !== pseudoElements(cb)) return false;
  const classesA = ca.match(/\.[\w-]+/g) ?? [];
  const classesB = cb.match(/\.[\w-]+/g) ?? [];
  if (classesA.length && classesB.length)
    return classesA.some((x) => classesB.some((y) => sameComponent(x, y)));
  const tagA = ca.match(/^[a-z][\w-]*/i)?.[0];
  const tagB = cb.match(/^[a-z][\w-]*/i)?.[0];
  return !tagA || !tagB || tagA === tagB;
}

const isImportant = (value) => value.endsWith(" !important");

const base = rules(baseFile);
const head = rules(headFile);
const baseEff = effective(base);
const headEff = effective(head);

const changed = [];
const removed = [];
const added = [];
for (const [key, b] of baseEff) {
  const h = headEff.get(key);
  if (!h) {
    removed.push(key);
    continue;
  }
  const diffs = [];
  for (const [p, v] of b)
    if (h.get(p) !== v) diffs.push(`${p}: ${v} -> ${h.get(p) ?? "(none)"}`);
  for (const [p, v] of h) if (!b.has(p)) diffs.push(`${p}: (none) -> ${v}`);
  if (diffs.length) changed.push([key, diffs]);
}
for (const key of headEff.keys()) if (!baseEff.has(key)) added.push(key);

const lastIndex = (list) => {
  const m = new Map();
  list.forEach((r, i) => m.set(r.key, i));
  return m;
};
const baseIndex = lastIndex(base);
const headIndex = lastIndex(head);
const headByKey = new Map(head.map((r) => [r.key, r]));
const shared = [...baseIndex.keys()].filter((k) => headIndex.has(k));
const flips = [];
for (let i = 0; i < shared.length; i++) {
  for (let j = i + 1; j < shared.length; j++) {
    const a = headByKey.get(shared[i]);
    const b = headByKey.get(shared[j]);
    if (a.spec !== b.spec || a.context !== b.context) continue;
    const conflicts = [...a.decls.keys()].filter(
      (p) =>
        b.decls.has(p) &&
        a.decls.get(p) !== b.decls.get(p) &&
        isImportant(a.decls.get(p)) === isImportant(b.decls.get(p)),
    );
    if (!conflicts.length) continue;
    const aFirstBefore = baseIndex.get(a.key) < baseIndex.get(b.key);
    const aFirstAfter = headIndex.get(a.key) < headIndex.get(b.key);
    if (aFirstBefore === aFirstAfter) continue;
    if (!allFlips && !couldShareElement(a.sel, b.sel)) continue;
    const winner = aFirstAfter ? b : a;
    const loser = aFirstAfter ? a : b;
    flips.push({
      winner: winner.key,
      loser: loser.key,
      props: conflicts.map(
        (p) => `${p}: ${winner.decls.get(p)} (was ${loser.decls.get(p)})`,
      ),
    });
  }
}

console.log(
  `selectors: base=${baseEff.size} head=${headEff.size} changed=${changed.length} removed=${removed.length} added=${added.length} order-flips=${flips.length}`,
);
console.log("\n=== CHANGED (base -> head) ===");
for (const [key, diffs] of changed)
  console.log(`${key}\n    ${diffs.join("\n    ")}`);
console.log("\n=== REMOVED ===");
for (const key of removed) console.log(key);
console.log("\n=== ADDED ===");
for (const key of added) console.log(key);
console.log(
  `\n=== ORDER FLIPS${
    allFlips
      ? ""
      : " (pairs that can match one element; --all-flips for every pair)"
  } ===`,
);
for (const f of flips)
  console.log(
    `now wins: ${f.winner}\n    over: ${f.loser}\n    ${f.props.join(
      "\n    ",
    )}`,
  );

process.exit(changed.length || removed.length || flips.length ? 1 : 0);
