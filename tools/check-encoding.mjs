import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guards UTF-8 source files against common mojibake produced when a UTF-8 file
 * is read or written with a legacy Windows code page (for example PowerShell
 * `Get-Content` / `Set-Content` without `-Encoding utf8`).
 *
 * Run with `npm run check:encoding`. The build and test scripts call it too.
 */

const ROOTS = ["src", "tests", "design", "docs", "tools", "production", ".framework", ".opencode"];
const EXTENSIONS = /\.(ts|tsx|js|mjs|json|md|css|html|ya?ml|ps1)$/i;
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-play", ".git", ".vite", "coverage"]);
/** Generated long-run output; never authored by hand. */
const SKIP_PREFIX = "tests/tmp-";
/** This file lists the patterns it forbids. */
const SKIP_FILES = new Set(["tools/check-encoding.mjs"]);

const MOJIBAKE = [
  { token: "\uFFFD", label: "replacement character U+FFFD" },
  { token: "Г—", label: "Г— (UTF-8 × read as CP1251)" },
  { token: "Ð", label: "Ð (UTF-8 read as Latin-1)" },
  { token: "Ñ", label: "Ñ (UTF-8 read as Latin-1)" },
  { token: "â€", label: "â€ (UTF-8 read as CP1252)" },
  { token: "вЂ", label: "вЂ (UTF-8 read as CP1251)" },
];

const hits = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const normalized = relative(process.cwd(), path).replaceAll("\\", "/");
    if (normalized.startsWith(SKIP_PREFIX) || SKIP_FILES.has(normalized)) {
      continue;
    }
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(path);
      continue;
    }
    if (!EXTENSIONS.test(name)) continue;

    const buffer = readFileSync(path);
    if (
      buffer.length >= 2 &&
      ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
        (buffer[0] === 0xfe && buffer[1] === 0xff))
    ) {
      hits.push(`${normalized}: UTF-16 file; source files must be UTF-8`);
      continue;
    }
    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { token, label } of MOJIBAKE) {
        if (line.includes(token)) {
          hits.push(`${normalized}:${index + 1}: ${label}`);
        }
      }
    });
  }
}

for (const root of ROOTS) {
  try {
    if (statSync(root).isDirectory()) walk(root);
  } catch {
    // Optional root (for example absent production/); skip it.
  }
}

if (hits.length > 0) {
  console.error("Encoding check failed:\n");
  for (const hit of hits) console.error(`  ${hit}`);
  console.error(
    "\nRebuild the affected text as UTF-8. Prefer the edit/write tools, or Node fs with 'utf8'.",
  );
  process.exit(1);
}
console.log("Encoding check passed (UTF-8, no mojibake)");
