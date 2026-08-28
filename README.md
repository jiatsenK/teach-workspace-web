# teach-workspace-web

Public GitHub Pages deployment target for Learning Studio.

This repository is **not** the source of truth for courses, learner state, session history, progress rules, or frontend architecture. Canonical implementation and private data remain in the private `jiatsenK/teach-workspace` repository and Google Learning Data.

## Runtime model

- `site/` is a generated/static deployment mirror of `teach-workspace/pages/src/`.
- `site/data/snapshot.json` is a sanitized deployment snapshot, not canonical learner state.
- `scripts/validate-snapshot.mjs` enforces the public schema and rejects credential-, contact-, and URL-shaped values before deployment.
- `scripts/validate-architecture.mjs` protects the view boundaries: Home stays summary-only, Course owns Project progress, and Progress/History owns review/history.
- Progress/History may publish the explicitly whitelisted `SESSION_LOG` fields used for review/history, including `Review Needed` and `Learning Scope`.
- Course Workspace receives only normalized progress-model data. Raw `STATE.md`, `LEARNER_STATE.md`, corrections, answers, credentials, and private source files are not published.

The existing GAS Learning Studio remains private. Public Pages does not fetch that private deployment directly.

If Learning Studio changes, regenerate this deployment mirror from `teach-workspace`; do not redesign the public copy independently.
