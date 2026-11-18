---
paths:
  - "tests/**"
  - "tools/**"
---

# Long Test Rules

Before running any test or simulation, estimate its duration.

## Estimate first

```
duration ≈ number of runs × seconds per run
```

If the estimate is over **60 seconds**, say so before starting, in one line:

> This will run ~240 simulations at ~0.4 s each — about 100 seconds. Options:
> (a) run it with checkpoints, (b) shard it across cores, (c) reduce the sweep.

Then wait for the user to choose. Never start a long run silently.

## Checkpoints

- Every long harness writes a resumable checkpoint at a fixed cadence (every N
  runs or every 30 seconds) and exposes progress as a percentage with ETA.
- Rerunning the same job resumes from its checkpoint instead of starting over.
- Checkpoint files go to `tests/tmp-*` or `production/` and are never committed
  by hand.
- `node tools/balance-progress.mjs` reports per-job and overall progress.

## Cores

On a hybrid CPU (Intel 12th gen and newer, or Apple silicon):

- fast shards (random, passive) → E-cores
- long shards (perfect, mixed, exhaustive) → P-cores
- keep workers within 8 (E) and 12 (P)
- fast-only runs may use every core, up to 20 workers
- unknown topology → let the OS schedule

```bash
tools/run-affinity.ps1 -Class e -Command "npm run test:shard:random"
tools/run-affinity.ps1 -Class p -Command "npm run test:shard:perfect"
```

## Reporting

- Report wall time, not just pass/fail.
- If a run takes more than twice its estimate, stop and report the anomaly
  instead of waiting it out.
