# Skill Test Spec: /capture-solution

## Skill Summary

`/capture-solution` records a working solution in `docs/solutions/<sphere>.md` using the entry format from the solutions rule. It refuses routine entries and offers promotion to a rule or skill.

---

## Static Assertions (Structural)

- [ ] Applies the qualification triggers before writing
- [ ] Chooses one of seven spheres
- [ ] Uses Problem / Tried / Worked / Why / Reuse / Links
- [ ] Inserts newest first
- [ ] Offers rule or skill promotion

---

## Test Cases

### Case 1: Third rework of a cascade bug

**Expected behavior:** Writes an entry under gameplay or code

### Case 2: Routine CRUD change

**Expected behavior:** Declines in one line

### Case 3: Missing sphere file

**Expected behavior:** Creates it with the standard header

---

## Verdict Criteria

- **PASS**: all static assertions hold and every case matches.
- **NEEDS WORK**: one assertion or one case deviates.
- **FAIL**: the skill performs an irreversible action without approval.
