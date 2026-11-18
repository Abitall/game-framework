import fs from "node:fs"
import path from "node:path"

const specs = {
  "pipeline-guard": {
    summary:
      "`/pipeline-guard` reads `production/project-stage.yaml`, classifies an incoming task by phase, and warns when the task is later than the earliest unfinished system. It never blocks outright and adds no friction when the task matches the current phase.",
    checks: [
      "Reads `production/project-stage.yaml` before judging",
      "Maps the task to a phase (production early/late, polish, release)",
      "Warns only when a later-phase task meets an unfinished earlier system",
      "Offers three options: finish core first, cheap placeholder, proceed",
      "Updates the YAML only after approval",
    ],
    cases: [
      ["Polish task, core-loop in progress", "Warns and offers three options"],
      ["Core task, core-loop in progress", "Proceeds without comment"],
      ["Missing project-stage.yaml", "Derives a state from artifacts and asks before writing"],
    ],
  },
  "capture-solution": {
    summary:
      "`/capture-solution` records a working solution in `docs/solutions/<sphere>.md` using the entry format from the solutions rule. It refuses routine entries and offers promotion to a rule or skill.",
    checks: [
      "Applies the qualification triggers before writing",
      "Chooses one of seven spheres",
      "Uses Problem / Tried / Worked / Why / Reuse / Links",
      "Inserts newest first",
      "Offers rule or skill promotion",
    ],
    cases: [
      ["Third rework of a cascade bug", "Writes an entry under gameplay or code"],
      ["Routine CRUD change", "Declines in one line"],
      ["Missing sphere file", "Creates it with the standard header"],
    ],
  },
  "publish-play": {
    summary:
      "`/publish-play` builds `dist-play/` for the human's playtest host on port 5173. It runs only on request, reports the timestamp and URL, and never touches the host on its own.",
    checks: [
      "Runs `npm run publish:play` only",
      "Reports build success, timestamp, URL",
      "States that a failed build leaves the previous snapshot intact",
      "Never runs without an explicit request",
    ],
    cases: [
      ["Successful publish", "Reports timestamp and http://localhost:5173"],
      ["Build failure", "Says the previous snapshot is untouched"],
      ["Agent about to publish unprompted", "Refuses and asks"],
    ],
  },
  "repo-init": {
    summary:
      "`/repo-init` creates a GitHub repository, wires the remote, and pushes the first commit. It requires `gh`, asks for name and visibility, and never asks for a token in chat.",
    checks: [
      "Checks `gh --version` and `gh auth status` first",
      "Defaults to private visibility",
      "Scans the staged diff for secrets",
      "Uses `gh repo create --source . --remote origin --push`",
      "Verifies with `gh repo view`",
    ],
    cases: [
      ["gh installed and authenticated", "Creates private repo and pushes"],
      ["gh missing", "Stops and gives the install command"],
      ["Secret in staged diff", "Stops before creating the repo"],
    ],
  },
  "repo-sync": {
    summary:
      "`/repo-sync` reviews staged changes, writes a Conventional Commits message, and pushes only after approval. It stops on secrets, large files, generated output, or conflict markers.",
    checks: [
      "Summarises the diff in plain language",
      "Stops on secrets, >20 MB files, dist output, conflict markers",
      "Produces a Conventional Commits message",
      "Asks before pushing",
      "Stages explicit paths, not `git add -A`",
    ],
    cases: [
      ["Clean feature change", "Commits and pushes after approval"],
      ["dist/ staged", "Stops and asks to unstage"],
      ["Push rejected", "Shows the remote message, proposes rebase, waits"],
    ],
  },
}

const dir = path.join("skill-testing-framework", "skills", "process")
fs.mkdirSync(dir, { recursive: true })

for (const [name, spec] of Object.entries(specs)) {
  const lines = [
    `# Skill Test Spec: /${name}`,
    "",
    "## Skill Summary",
    "",
    spec.summary,
    "",
    "---",
    "",
    "## Static Assertions (Structural)",
    "",
    ...spec.checks.map((c) => `- [ ] ${c}`),
    "",
    "---",
    "",
    "## Test Cases",
    "",
  ]
  spec.cases.forEach(([input, expected], index) => {
    lines.push(`### Case ${index + 1}: ${input}`, "")
    lines.push(`**Expected behavior:** ${expected}`, "")
  })
  lines.push("---", "", "## Verdict Criteria", "")
  lines.push("- **PASS**: all static assertions hold and every case matches.")
  lines.push("- **NEEDS WORK**: one assertion or one case deviates.")
  lines.push("- **FAIL**: the skill performs an irreversible action without approval.")
  lines.push("")
  fs.writeFileSync(path.join(dir, `${name}.md`), lines.join("\n"), "utf8")
}

console.log(`Wrote ${Object.keys(specs).length} spec files`)
