# Workflow Modes

### Hybrid Workflow (recommended for indie teams)

- **Discovery**: rapid prototyping to find the fun. Low overhead, throwaway code
  in `prototypes/`.
- **Production**: full discipline once the design is proven. Formal GDDs, ADRs,
  tests, quality gates.
- **Best for**: teams of 1–5, unknown designs, iterating to find the fun.
- **See**: `docs/hybrid-workflow.md`.

### Full Workflow

- Every feature goes through design → architecture → stories → code → tests →
  review.
- **Best for**: teams of 5–15, known designs, long timelines, publisher
  requirements. Requires the `stories` module.
