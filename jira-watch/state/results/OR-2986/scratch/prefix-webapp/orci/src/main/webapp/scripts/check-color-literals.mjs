#!/usr/bin/env node
// Every file outside the token layer is held to its recorded literal count; --update regenerates the baseline.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEBAPP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_ROOT = join(WEBAPP_ROOT, "src");
const BASELINE_PATH = join(
  WEBAPP_ROOT,
  "scripts",
  "color-literal-baseline.json",
);
const EXTENSIONS = new Set([".ts", ".tsx", ".scss", ".css"]);
const EXCLUDED_PREFIXES = ["src/api/generated/"];
const TOKEN_LAYER = "src/styles/_tokens.scss";
const HEX_LITERAL =
  /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
    } else if (EXTENSIONS.has(extname(entry))) {
      yield path;
    }
  }
}

function isScanned(relPath) {
  if (relPath === TOKEN_LAYER) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function literalsIn(path) {
  const found = [];
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const match of line.matchAll(HEX_LITERAL)) {
        found.push({
          line: index + 1,
          column: match.index + 1,
          literal: match[0],
        });
      }
    });
  return found;
}

function scan() {
  const counts = new Map();
  const details = new Map();
  for (const path of sourceFiles(SCAN_ROOT)) {
    const relPath = relative(WEBAPP_ROOT, path).split("\\").join("/");
    if (!isScanned(relPath)) continue;
    const found = literalsIn(path);
    if (found.length > 0) {
      counts.set(relPath, found.length);
      details.set(relPath, found);
    }
  }
  return { counts, details };
}

function readBaseline() {
  try {
    return new Map(
      Object.entries(JSON.parse(readFileSync(BASELINE_PATH, "utf8"))),
    );
  } catch {
    return new Map();
  }
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(
    [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(BASELINE_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

const { counts, details } = scan();
const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

if (process.argv.includes("--update")) {
  writeBaseline(counts);
  console.log(
    `Color literal baseline written — ${total} literals in ${counts.size} files.`,
  );
  process.exit(0);
}

const baseline = readBaseline();
const errors = [];

for (const [file, count] of counts) {
  const allowed = baseline.get(file) ?? 0;
  if (count > allowed) {
    errors.push(
      `${file} — ${count} color literal(s), baseline allows ${allowed}. Use a token from ${TOKEN_LAYER}:`,
    );
    for (const { line, column, literal } of details.get(file)) {
      errors.push(`    ${file}:${line}:${column} ${literal}`);
    }
  } else if (count < allowed) {
    errors.push(
      `${file} — ${count} color literal(s), baseline records ${allowed}. Baseline is stale; run with --update.`,
    );
  }
}

for (const [file, allowed] of baseline) {
  if (!counts.has(file)) {
    errors.push(
      `${file} — baseline records ${allowed} color literal(s) but the file has none. Baseline is stale; run with --update.`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Color literal guard failed:\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `Color literal guard passed — ${total} literals in ${counts.size} files, all within baseline.`,
);
