# teach-workspace-web

Public GitHub Pages deployment target for Learning Studio.

This repository is **not** the source of truth for courses, learner state, session history, or progress rules. Canonical implementation and private data remain in the private `jiatsenK/teach-workspace` repository and Google Learning Data.

## Runtime model

- `site/` is a generated/static deployment mirror of the existing Learning Studio UI.
- The Pages workflow fetches only the sanitized `pages-snapshot` payload from the existing GAS deployment.
- `scripts/validate-snapshot.mjs` blocks unexpected or sensitive-looking fields before Pages deployment.
- Detailed learner evidence, raw `STATE.md`, corrections, answers, credentials, and private data are not part of the public payload.
- Public data refreshes hourly and on manual workflow dispatch.

If the canonical Learning Studio UI changes, regenerate the static mirror from `teach-workspace`; do not redesign the public copy independently.
