# teach-workspace-web

Public GitHub Pages deployment target for Learning Studio.

This repository is **not** the source of truth for courses, learner state, session history, or progress rules. Canonical implementation and private data remain in the private `jiatsenK/teach-workspace` repository and Google Learning Data.

## Runtime model

- `site/` is a generated/static deployment mirror of the existing Learning Studio UI.
- `site/data/snapshot.json` is a sanitized deployment snapshot, not canonical learner state.
- `scripts/validate-snapshot.mjs` enforces a nested field allowlist and rejects credential-, contact-, URL-, and private-data shaped values before Pages deployment.
- Detailed learner evidence, raw `STATE.md`, corrections, answers, credentials, and private data are not part of the public payload.
- The current snapshot is regenerated from the canonical sources when the public deployment is updated.

The existing GAS Learning Studio remains private. Its deployment is not made public just to feed GitHub Pages.

If the canonical Learning Studio UI changes, regenerate the static mirror from `teach-workspace`; do not redesign the public copy independently.
