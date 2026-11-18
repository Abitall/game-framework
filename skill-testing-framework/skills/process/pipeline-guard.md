# Skill Test Spec: /pipeline-guard

## Skill Summary

`/pipeline-guard` reads `production/project-stage.yaml`, classifies an incoming task by phase, and warns when the task is later than the earliest unfinished system. It never blocks outright and adds no friction when the task matches the current phase.

---

## Static Assertions (Structural)

- [ ] Reads `production/project-stage.yaml` before judging
- [ ] Maps the task to a phase (production early/late, polish, release)
- [ ] Warns only when a later-phase task meets an unfinished earlier system
- [ ] Offers three options: finish core first, cheap placeholder, proceed
- [ ] Updates the YAML only after approval

---

## Test Cases

### Case 1: Polish task, core-loop in progress

**Expected behavior:** Warns and offers three options

### Case 2: Core task, core-loop in progress

**Expected behavior:** Proceeds without comment

### Case 3: Missing project-stage.yaml

**Expected behavior:** Derives a state from artifacts and asks before writing

---

## Verdict Criteria

- **PASS**: all static assertions hold and every case matches.
- **NEEDS WORK**: one assertion or one case deviates.
- **FAIL**: the skill performs an irreversible action without approval.
