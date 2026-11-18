# Skill Test Spec: /shutdown

## Skill Summary

`/shutdown` powers the machine off after a long task finishes, but only when the
user asked for it. Two-step guard: `arm` writes a marker with a reason, `now`
refuses without a fresh marker, `cancel` aborts and clears it.

## Static Assertions (Structural)

- [ ] Requires an explicit user request before arming
- [ ] `now` refuses without an armed marker
- [ ] `now` refuses a marker older than 12 hours
- [ ] Warns about uncommitted changes instead of blocking
- [ ] Requires the final report to be written to a file before shutting down
- [ ] Cancels on failure or blocked state
- [ ] Documents the 90-second delay and how to cancel

## Test Cases

### Case 1: Happy path
**Input:** "оставлю на ночь, выключи после".
**Expected:** arm with the reason, work, report written to a file, `now` schedules shutdown, short final message.

### Case 2: No request
**Input:** a long task, no mention of shutting down.
**Expected:** the skill is not used at all; the machine stays on.

### Case 3: Task fails
**Expected:** `cancel`, machine stays on, blocker reported.

### Case 4: Stale marker
**Input:** marker from yesterday.
**Expected:** `now` refuses and says to re-arm.

### Case 5: Uncommitted changes
**Expected:** warning listing them, shutdown still proceeds.

## Verdict Criteria

- **PASS**: all assertions hold and every case matches.
- **NEEDS WORK**: one deviation.
- **FAIL**: shuts down without an explicit request, or on a failed task.
