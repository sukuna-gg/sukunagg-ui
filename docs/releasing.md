# Releasing — `@sukunagg/ui`

Changesets + semver, with the extra rules a UI library needs. **Agents never push to `main`,
never publish; a human merges the Version Packages PR and creates the release tag.**

## Breaking-change table (source: `docs/questions.md` Q6)

| Change | Bump |
|---|---|
| Remove/rename a prop, variant, export, or CSS entry (`theme.css`/`styles.css`) | major |
| Change a prop's default value | major |
| Visual change that alters layout (height, padding, token value) | major (minor + note if it's a fix toward the spec) |
| Rename a `--sk-*` token | major |
| Add a prop, variant, component, or token | minor |
| Bug fix with no API/layout change; a11y fix | patch |
| Raise minimum React or Tailwind peer version | major |
| Internal headless-lib (Base UI) bump, no API change | patch |

**Pre-1.0:** stay on `0.x` until all ten v1 components ship and are used in one real app. On `0.x`,
**minor = breaking, patch = everything else**. `1.0.0` means the props API and token names are stable.

## Every PR

1. `bun run changeset` — select the package(s) the change ships in (`@sukunagg/ui`,
   `@sukunagg/video`, `@sukunagg/charts`, `@sukunagg/fx`; the repo is a Bun workspace, Q27), then pick the bump using the table above; write a one-line reason. Docs/CI-only
   PRs may use an empty changeset or the `no-release` label.
2. Classify **before** writing the changeset. If a CI classifier disagrees, CI is right — raise the
   bump or fix the regression; never edit the check.

## Channels

- `latest` from `main` via the Changesets GitHub Action: merging opens/updates a **Version Packages**
  PR; merging that PR publishes — still gated on explicit owner approval.
- `next` for pre-releases during breaking work: `bunx changeset pre enter next` … `bunx changeset pre exit`.
- Deprecation window: one minor with a `@deprecated` JSDoc + dev-only console warning before removal
  in the next major.

## CI gates (`.github/workflows/ci.yml`)

Runs on every PR: `check` (Biome + tsc), `test:coverage` (fails < 90%), `build`, `check:pkg`
(publint + attw), `size`, `storybook:build` + `test:browser`, and the enforcement jobs:

- **api-diff** — commit an `api-extractor`/`.d.ts` snapshot at `etc/`; any removal/rename requires `major`.
- **visual-diff** — Chromatic (or Playwright screenshots); any diff requires ≥ `minor` + an ack in the changeset.
- **token-diff** — a Bun script diffs `--sk-*` names in `dist/theme.css` vs the last published version; removal/rename requires `major`.
- **peer-diff** — a `peerDependencies` change requires `major`.
- **changeset-bot** — no changeset → blocked, unless the `no-release` label is set.

> These enforcement jobs are specified here and in `docs/plan-agentic.md` Phase 9; wiring them into
> the workflow is tracked as remaining Phase 9 work (see `docs/roadmap.md`). The base CI (check,
> test, build, check:pkg, size, storybook, browser) is live.

## CD pipeline (`.github/workflows/release.yml`)

Publishing is automated with the **Changesets GitHub Action**, and stays owner-gated:

1. **Push to `main` with pending changesets** → the action opens/updates a **Version Packages** PR
   that bumps `package.json` and writes `CHANGELOG.md`. **Nothing is published.**
2. **The owner reviews and merges that PR.** That merge is the human publish gate.
3. The next run on `main` has bumped versions and no changesets, so the action runs
   `bunx changeset publish` → `npm publish` with provenance (`NPM_CONFIG_PROVENANCE`,
   `publishConfig.access: public`). Only `dist/` ships (`files`), freshly built in the job.

### One-time setup (owner)

- Create the `@sukuna` npm scope/org and grant publish rights.
- Add repo secret **`NPM_TOKEN`** — an npm **Automation** token with publish access to the `@sukunagg` scope (`@sukunagg/ui`, `@sukunagg/video`, `@sukunagg/charts`, `@sukunagg/fx`). A granular token limited to named packages can't publish a *new* package (`@sukunagg/charts` 0.1.0, `@sukunagg/fx` 0.1.0) — scope it to the org or add the package. After a package's first publish, add it to the loops in `.github/workflows/npm-token-check.yml` (its `npm view` fails on an unpublished name).
- The workflow has `id-token: write` for npm provenance; the repo must be public for provenance.
- **Allow GitHub Actions to create and approve pull requests** — org (`sukuna-gg`) → Settings →
  Actions → General → Workflow permissions, then the same box on the repo. It is off by default;
  without it the Release run fails with "GitHub Actions is not permitted to create or approve pull
  requests" and no Version Packages PR appears (Q35).
- Every `package.json` `repository.url` must name the real repo (`sukuna-gg/sukunagg-ui`): npm
  provenance rejects a publish built from a different repo. Update them on any rename (Q35).

### First release (0.1.0)

The initial changeset (`.changeset/initial-v1-components.md`, minor → `0.1.0`) is committed. On the
first push to `main`, the action opens the Version Packages PR; merging it publishes `0.1.0`.

**Nothing reaches npm until the owner merges the Version Packages PR.** Agents never merge it.

## GitHub Pages

Deploy `storybook-static` on release (separate workflow, not yet wired) — doubles as the docs site.
