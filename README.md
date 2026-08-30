# teach-workspace-web

Public GitHub Pages deployment target for Learning Studio.

This repository is a generated deployment mirror. Canonical frontend source, product decisions, and private learner state live in the private `jiatsenK/teach-workspace` repository.

## Runtime model

- `site/` is static public output generated from the canonical Git source.
- `site/data/snapshot.json.gz.b64` is the sanitized last-known-good deployment data; CI materializes and validates `snapshot.json` before publishing.
- `scripts/validate-snapshot.mjs` rejects non-whitelisted or sensitive public data.
- `scripts/validate-architecture.mjs` protects frontend information boundaries.
- The learner shell renders from embedded public display config, uses the published snapshot immediately when available, and refreshes from the public read-only Learning API in the background.

## Publishing

The public pipeline is Git-only:

`validated sanitized projection → commit to teach-workspace-web → GitHub Actions → GitHub Pages`

GAS transport affects freshness only; it does not block the home page, navigation, course entry, or the published fallback. A push that changes `site/**` immediately starts validation and Pages deployment.

Do not edit this mirror as an independent product source. Generate public output from the canonical private repository and publish only sanitized data.
