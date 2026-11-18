/**
 * Generates .framework/modules/*.json from the single source of truth below.
 *
 * Run: node .framework/tools/build-manifests.mjs
 *
 * Module composition is data, not code: edit SPEC and re-run. The installer
 * only ever reads the generated JSON, so this file can be deleted once the
 * manifests are stable.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const OUT = path.join(ROOT, ".framework", "modules")

/** Recursively lists files under a directory. */
function walkDir(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkDir(full))
    else out.push(full)
  }
  return out
}

/** Every file under a library docs folder, relative to `docs/`. */
function docsFor(prefix) {
  const dir = path.join(ROOT, ".framework", "library", "docs", prefix)
  if (!fs.existsSync(dir)) return []
  return walkDir(dir)
    .map((file) => path.join(prefix, path.relative(dir, file)).split(path.sep).join("/"))
    .sort()
}

/** @type {Array<{name:string,description:string,default?:boolean,depends?:string[],agents?:string[],skills?:string[],rules?:string[],triggers:string[]}>} */
const SPEC = [
  // ── Default set ────────────────────────────────────────────────────────────
  {
    name: "core",
    default: true,
    description: "Framework skeleton: directors, onboarding, workflow, architecture planning, and shared utilities.",
    agents: ["creative-director", "producer", "technical-director"],
    skills: [
      "start", "help", "init-template", "setup-engine", "project-stage-detect",
      "concept-brainstorm", "map-systems", "create-architecture",
      "architecture-decision", "gate-check",
      "code-review", "tech-debt", "onboard", "reverse-document", "adopt",
      "pipeline-guard", "capture-solution", "publish-play",
    ],
    rules: ["encoding", "solutions", "web-hosting"],
    triggers: ["always installed"],
  },
  {
    name: "design",
    default: true,
    description: "Game mechanics, systems design, economy, balance analysis, design review.",
    depends: ["core"],
    agents: ["game-designer", "systems-designer", "economy-designer"],
    skills: [
      "design-system", "design-review", "quick-design", "review-all-gdds",
      "balance-check", "consistency-check", "content-audit", "scope-check",
      "estimate", "playtest-report",
    ],
    triggers: ["any project with mechanics to design"],
  },
  {
    name: "programming",
    default: true,
    description: "Programming agents and path-scoped coding rules. No skills.",
    depends: ["core"],
    agents: [
      "gameplay-programmer", "engine-programmer", "ai-programmer",
      "network-programmer", "tools-programmer",
    ],
    rules: ["gameplay-code", "engine-code", "ai-code", "network-code", "shader-code"],
    triggers: ["any project with code"],
  },
  {
    name: "qa",
    default: true,
    description: "Test scaffolding, smoke gate, regression mapping, security audit, skill validation.",
    depends: ["core"],
    agents: ["qa-lead", "qa-tester", "performance-analyst", "security-engineer"],
    skills: [
      "test-setup", "test-helpers", "smoke-check", "regression-suite",
      "test-evidence-review", "security-audit", "skill-test", "skill-improve",
      "gauntlet",
    ],
    rules: ["test-standards", "long-tests"],
    triggers: ["any project with tests"],
  },
  {
    name: "release",
    default: true,
    description: "Sprint planning, status, retrospectives, milestones, release checklist, changelog.",
    depends: ["core"],
    agents: ["release-manager", "devops-engineer"],
    skills: [
      "sprint-plan", "sprint-status", "retrospective", "milestone-review",
      "release-checklist", "changelog", "repo-init", "repo-sync",
    ],
    triggers: ["any project organised in sprints"],
  },

  // ── Engines ───────────────────────────────────────────────────────────────
  {
    name: "engine-phaser",
    description: "Phaser 4 specialist knowledge: scenes, systems, physics, tweens, WebAudio, TypeScript patterns.",
    depends: ["core"],
    skills: ["phaser-coder", "tuning-panel"],
    rules: ["phaser-code"],
    triggers: ["project stack is Phaser"],
  },
  {
    name: "engine-unity",
    description: "Unity 6.3 LTS specialists: DOTS/ECS, shaders, Addressables, UI Toolkit.",
    depends: ["core"],
    agents: [
      "unity-specialist", "unity-dots-specialist", "unity-shader-specialist",
      "unity-addressables-specialist", "unity-ui-specialist",
    ],
    triggers: ["project stack is Unity"],
  },
  {
    name: "engine-godot",
    description: "Godot 4 specialists: GDScript, C#, shaders, GDExtension.",
    depends: ["core"],
    agents: [
      "godot-specialist", "godot-gdscript-specialist", "godot-csharp-specialist",
      "godot-shader-specialist", "godot-gdextension-specialist",
    ],
    docs: docsFor("engine-reference/godot"),
    triggers: ["project stack is Godot 4"],
  },
  {
    name: "engine-unreal",
    description: "Unreal Engine 5 specialists: Blueprint, GAS, replication, UMG.",
    depends: ["core"],
    agents: [
      "unreal-specialist", "ue-blueprint-specialist", "ue-gas-specialist",
      "ue-replication-specialist", "ue-umg-specialist",
    ],
    docs: docsFor("engine-reference/unreal"),
    triggers: ["project stack is Unreal Engine"],
  },
  {
    name: "engine-sfml3",
    description: "SFML 3 specialist: Graphics, Audio, Network, Window, System.",
    depends: ["core"],
    agents: ["sfml-specialist"],
    docs: docsFor("engine-reference/sfml3"),
    triggers: ["project stack is SFML 3"],
  },
  {
    name: "engine-raylib",
    description: "Raylib specialist: core, rlgl, raudio, raymath, raygui.",
    depends: ["core"],
    agents: ["raylib-specialist"],
    docs: docsFor("engine-reference/raylib"),
    triggers: ["project stack is Raylib"],
  },
  {
    name: "engine-bevy",
    description: "Bevy specialist: ECS, 2D/3D rendering, bevy_ui, assets, audio.",
    depends: ["core"],
    agents: ["bevy-specialist"],
    docs: docsFor("engine-reference/bevy"),
    triggers: ["project stack is Bevy"],
  },

  {
    name: "ui-editor",
    description: "Dev-only in-game UI editor for Phaser: select, drag, nudge, edit properties, export layout JSON.",
    depends: ["engine-phaser"],
    skills: ["ui-editor"],
    triggers: ["the user wants to move UI elements without asking the agent", "layout tuning by feel"],
  },

  {
    name: "obsidian",
    default: true,
    description: "Write ideas, concepts, plans and documents into an Obsidian vault in Russian, with wikilinks and generated map cards.",
    depends: ["core"],
    skills: ["obsidian"],
    triggers: ["the user wants notes, ideas or plans in Obsidian", "a thinking space outside the project docs"],
  },

  {
    name: "shutdown",
    default: true,
    description: "Shut the machine down after a long task finishes, only when the user asked. Two-step guard: arm, then fire on success.",
    depends: ["core"],
    skills: ["shutdown"],
    triggers: ["the user leaves a long task overnight and asks the machine to power off when done"],
  },

  // ── Domains ───────────────────────────────────────────────────────────────
  {
    name: "architecture",
    description: "Architecture review, control manifest, design change propagation, design doc rules.",
    depends: ["core"],
    agents: ["lead-programmer"],
    skills: ["architecture-review", "create-control-manifest", "propagate-design-change"],
    rules: ["design-docs"],
    triggers: ["more than 5 architectural modules", "more than 5 ADRs", "multiple contributors"],
  },
  {
    name: "ui",
    description: "UX design, UI programming, accessibility, UI code rules.",
    depends: ["core"],
    agents: ["ux-designer", "ui-programmer", "accessibility-specialist"],
    skills: ["ux-design", "ux-review"],
    rules: ["ui-code"],
    triggers: ["more than 3 screens", "accessibility requirements"],
  },
  {
    name: "localization",
    description: "i18n architecture, string extraction, translation pipeline, locale testing.",
    depends: ["core"],
    agents: ["localization-lead"],
    skills: ["localize"],
    triggers: ["second language", "player-facing text"],
  },
  {
    name: "art",
    description: "Art direction, art bible, asset specs, Aseprite pipeline.",
    depends: ["core"],
    agents: ["art-director", "technical-artist"],
    skills: ["art-bible", "asset-spec", "art-generate", "asset-audit"],
    triggers: ["external art assets", "sprite pipeline"],
  },
  {
    name: "audio",
    description: "Audio direction and sound design.",
    depends: ["core"],
    agents: ["audio-director", "sound-designer"],
    triggers: ["recorded audio or music"],
  },
  {
    name: "narrative",
    description: "Story architecture, world building, characters, dialogue.",
    depends: ["core"],
    agents: ["narrative-director", "world-builder", "writer"],
    rules: ["narrative"],
    triggers: ["story, lore, or dialogue"],
  },
  {
    name: "level-design",
    description: "Level layout, encounter pacing, spatial design.",
    depends: ["core"],
    agents: ["level-designer"],
    triggers: ["discrete levels or rooms"],
  },
  {
    name: "live-ops",
    description: "Post-launch content, seasonal events, community.",
    depends: ["core"],
    agents: ["live-ops-designer", "community-manager"],
    triggers: ["game already shipped", "live service"],
  },
  {
    name: "data",
    description: "Data file conventions and validation rules.",
    depends: ["core"],
    rules: ["data-files"],
    triggers: ["external data files", "content tables"],
  },
  {
    name: "prototyping",
    description: "Rapid prototypes, exploration, fast-lane validation.",
    depends: ["core"],
    agents: ["prototyper"],
    skills: ["prototype", "hybrid-prototype", "explore"],
    rules: ["prototype-code"],
    triggers: ["idea search", "mechanic validation"],
  },

  // ── Processes ─────────────────────────────────────────────────────────────
  {
    name: "stories",
    description: "Heavy requirement pipeline: epics, stories, readiness, implementation, acceptance.",
    depends: ["core"],
    skills: ["create-epics", "create-stories", "story-readiness", "dev-story", "story-done"],
    triggers: ["large project", "more than 20 systems", "multiple contributors"],
  },
  {
    name: "qa-advanced",
    description: "Test planning, bug files, profiling, soak testing, flakiness, engine-specific smoke.",
    depends: ["qa"],
    skills: [
      "qa-plan", "bug-report", "bug-triage", "perf-profile", "soak-test",
      "test-flakiness", "automated-smoke-test", "autopilot-playtest",
    ],
    triggers: ["bugs tracked as files", "profiling needed", "pre-release hardening"],
  },
  {
    name: "release-launch",
    description: "Public launch: store, marketing, legal, day-one patch, hotfix, player patch notes.",
    depends: ["release"],
    skills: ["launch-checklist", "patch-notes", "hotfix", "day-one-patch"],
    triggers: ["public launch", "live players"],
  },
  {
    name: "team-orchestration",
    description: "Multi-agent team orchestration. Redundant for solo development.",
    depends: ["core"],
    skills: [
      "team-combat", "team-qa", "team-polish", "team-release",
      "team-ui", "team-audio", "team-narrative", "team-level", "team-live-ops",
    ],
    triggers: ["team of 3 or more people"],
  },
  {
    name: "analytics",
    description: "Telemetry, player behaviour tracking, A/B tests, dashboards.",
    depends: ["core"],
    agents: ["analytics-engineer"],
    triggers: ["telemetry data exists", "A/B testing", "analytics backend"],
  },
]

fs.mkdirSync(OUT, { recursive: true })

// Clean stale manifests so removed modules do not linger.
for (const file of fs.readdirSync(OUT)) {
  if (file.endsWith(".json")) fs.rmSync(path.join(OUT, file))
}

let count = 0
for (const mod of SPEC) {
  // Commands are 1:1 with skills: a skill ships its slash command if one exists.
  const commands = (mod.skills ?? []).filter((skill) =>
    fs.existsSync(path.join(ROOT, ".framework", "library", "commands", `${skill}.md`)),
  )
  const manifest = {
    name: mod.name,
    version: "1.0.0",
    description: mod.description,
    default: Boolean(mod.default),
    depends: mod.depends ?? [],
    agents: mod.agents ?? [],
    skills: mod.skills ?? [],
    commands,
    rules: mod.rules ?? [],
    docs: mod.docs ?? [],
    triggers: mod.triggers,
  }
  fs.writeFileSync(
    path.join(OUT, `${mod.name}.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  )
  count++
}

// Integrity: every declared item must exist in the library, and every library
// item must belong to exactly one module.
const library = path.join(ROOT, ".framework", "library")
const seen = { agents: new Map(), skills: new Map(), rules: new Map() }
const errors = []

for (const mod of SPEC) {
  for (const [kind, list] of [
    ["agents", mod.agents ?? []],
    ["skills", mod.skills ?? []],
    ["rules", mod.rules ?? []],
  ]) {
    for (const name of list) {
      const target = kind === "skills"
        ? path.join(library, "skills", name, "SKILL.md")
        : path.join(library, kind, `${name}.md`)
      if (!fs.existsSync(target)) errors.push(`missing ${kind}/${name} (module ${mod.name})`)
      if (seen[kind].has(name)) errors.push(`duplicate ${kind}/${name}: ${seen[kind].get(name)} + ${mod.name}`)
      else seen[kind].set(name, mod.name)
    }
  }
}

for (const kind of ["agents", "skills", "rules"]) {
  const onDisk = kind === "skills"
    ? fs.readdirSync(path.join(library, kind)).filter((n) => fs.statSync(path.join(library, kind, n)).isDirectory())
    : fs.readdirSync(path.join(library, kind)).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3))
  for (const name of onDisk) {
    if (!seen[kind].has(name)) errors.push(`unassigned ${kind}/${name}`)
  }
}

// Docs: every engine reference file must be claimed by exactly one module.
const seenDocs = new Map()
for (const mod of SPEC) {
  for (const doc of mod.docs ?? []) {
    if (!fs.existsSync(path.join(library, "docs", doc))) {
      errors.push(`missing docs/${doc} (module ${mod.name})`)
    }
    if (seenDocs.has(doc)) errors.push(`duplicate docs/${doc}: ${seenDocs.get(doc)} + ${mod.name}`)
    else seenDocs.set(doc, mod.name)
  }
}
const docsRoot = path.join(library, "docs")
if (fs.existsSync(docsRoot)) {
  for (const file of walkDir(docsRoot)) {
    const rel = path.relative(docsRoot, file).split(path.sep).join("/")
    if (!seenDocs.has(rel)) errors.push(`unassigned docs/${rel}`)
  }
}

console.log(`Wrote ${count} manifests to .framework/modules/`)
console.log(`Assigned: ${seen.agents.size} agents, ${seen.skills.size} skills, ${seen.rules.size} rules, ${seenDocs.size} docs`)
if (errors.length) {
  console.error(`\nIntegrity errors (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exitCode = 1
} else {
  console.log("Integrity: OK")
}
