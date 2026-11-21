import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Enforces the layering rules written in `AGENTS.md` and `src/AGENTS.md`.
 *
 * A rule that exists only as prose is ignored without cost; the same rule as a
 * non-zero exit costs one turn to fix. This tool is that exit: it reads
 * `tools/boundaries.json` and fails when a file imports a module its layer
 * forbids, or when a test file sits where tests must not live.
 *
 * Run with `npm run check:boundaries`; `npm test` runs it too.
 *
 * Known limitation, deliberate: imports are found by pattern, not by a
 * TypeScript parser, so this tool adds no dependency. A line that begins with
 * `//`, `*` or `/*` is skipped, which covers commented-out imports and JSDoc.
 */

const CONFIG_PATH = "tools/boundaries.json";
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|jsx)$/i;
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-play", ".git", ".vite", "coverage"]);

const FROM_CLAUSE = /\bfrom\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const REQUIRE_CALL = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Turns a glob into a regular expression anchored at both ends.
 * `**` matches across directories, `*` and `?` stay inside one segment.
 * A trailing `/**` also matches the directory itself, so `src/view/**`
 * catches `import "../view"` and not only `"../view/x"`.
 */
function globToRegExp(glob) {
  const directoryTail = glob.endsWith("/**");
  const source = directoryTail ? glob.slice(0, -3) : glob;
  let pattern = "^";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "*") {
      if (source[index + 1] === "*") {
        pattern += ".*";
        index += 1;
      } else {
        pattern += "[^/]*";
      }
    } else if (char === "?") {
      pattern += "[^/]";
    } else if ("\\^$+(){}[]|.".includes(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
  }
  return new RegExp(`${pattern}${directoryTail ? "(?:/.*)?" : ""}$`);
}

function toPosix(path) {
  return path.replaceAll("\\", "/");
}

function readConfig() {
  let raw;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    console.error(`Boundary check cannot run: ${CONFIG_PATH} is missing.`);
    console.error("The rules file is committed on purpose — deleting it is how the bar gets lowered.");
    process.exit(1);
  }
  const config = JSON.parse(raw);
  return {
    roots: config.roots ?? ["src"],
    importRules: (config.imports ?? []).map((rule) => ({
      ...rule,
      matcher: globToRegExp(rule.from),
    })),
    fileRules: (config.files ?? []).map((rule) => ({
      ...rule,
      matcher: globToRegExp(rule.from),
      rejecters: (rule.reject ?? []).map(globToRegExp),
    })),
  };
}

function collectFiles(rootPath, files) {
  let entries;
  try {
    entries = readdirSync(rootPath);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(rootPath, name);
    if (statSync(path).isDirectory()) {
      collectFiles(path, files);
      continue;
    }
    files.push(toPosix(relative(process.cwd(), path)));
  }
}

/** Resolves an import specifier to something a repo-relative glob can match. */
function normalizeSpecifier(specifier, fromFile) {
  if (specifier.startsWith(".")) {
    const absolute = resolve(dirname(join(process.cwd(), fromFile)), specifier);
    let path = toPosix(relative(process.cwd(), absolute));
    path = path.replace(/\.(ts|tsx|js|mjs|cjs|jsx)$/i, "");
    path = path.replace(/\/index$/, "");
    return { kind: "path", value: path };
  }
  if (specifier.startsWith("/")) {
    return { kind: "path", value: specifier.replace(/^\/+/, "") };
  }
  return { kind: "package", value: specifier };
}

/** `phaser` also catches `phaser/whatever`; `@scope/name` keeps its scope. */
function packageRoots(specifier) {
  const segments = specifier.split("/");
  const rootLength = specifier.startsWith("@") ? 2 : 1;
  return [specifier, segments.slice(0, rootLength).join("/")];
}

function hitsForbidden(specifier, forbidden, fromFile) {
  const normalized = normalizeSpecifier(specifier, fromFile);
  const candidates =
    normalized.kind === "package" ? packageRoots(normalized.value) : [normalized.value];
  const culprit = candidates.find((candidate) => forbidden.some((matcher) => matcher.test(candidate)));
  return culprit === undefined ? null : culprit;
}

function scanImports(fromFile, text, importRules, violations) {
  for (const rule of importRules) {
    if (!rule.matcher.test(fromFile)) continue;
    const forbidden = rule.forbid.map(globToRegExp);
    const lines = text.split(/\r?\n/);
    const matchers = [FROM_CLAUSE, DYNAMIC_IMPORT, REQUIRE_CALL];
    for (const matcher of matchers) {
      matcher.lastIndex = 0;
      let match = matcher.exec(text);
      while (match !== null) {
        const specifier = match[1];
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        const trimmed = (lines[line - 1] ?? "").trimStart();
        const isComment = trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
        if (!isComment) {
          const culprit = hitsForbidden(specifier, forbidden, fromFile);
          if (culprit !== null) {
            violations.push({
              file: fromFile,
              line,
              detail: `imports "${specifier}"`,
              rule: `${rule.from} must not import ${rule.forbid.join(", ")}`,
              why: rule.why,
            });
          }
        }
        match = matcher.exec(text);
      }
    }
  }
}

function scanFileRules(fromFile, fileRules, violations) {
  for (const rule of fileRules) {
    if (!rule.matcher.test(fromFile)) continue;
    if (rule.rejecters.some((rejecter) => rejecter.test(fromFile))) {
      violations.push({
        file: fromFile,
        line: 1,
        detail: "file kind is not allowed here",
        rule: `${rule.from} rejects ${rule.reject.join(", ")}`,
        why: rule.why,
      });
    }
  }
}

const { roots, importRules, fileRules } = readConfig();
const files = [];
for (const root of roots) collectFiles(root, files);
const sources = files.filter((file) => SOURCE_EXTENSIONS.test(file));

const violations = [];
for (const file of files) {
  scanFileRules(file, fileRules, violations);
}
for (const file of sources) {
  const text = readFileSync(file, "utf8");
  scanImports(file, text, importRules, violations);
}

if (violations.length > 0) {
  console.error("Boundary check failed:\n");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  ${violation.detail}`);
    console.error(`    rule: ${violation.rule}`);
    console.error(`    why: ${violation.why}`);
  }
  const affected = new Set(violations.map((violation) => violation.file)).size;
  console.error(
    `\n${violations.length} violation(s) in ${affected} file(s). Fix the import or change tools/boundaries.json on purpose.`,
  );
  process.exit(1);
}

const ruleCount = importRules.length + fileRules.length;
console.log(
  `Boundary check passed (${ruleCount} rule(s), ${sources.length} source file(s) scanned)`,
);
