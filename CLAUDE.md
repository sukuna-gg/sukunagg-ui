# sukuna-ui — operating rules

Read this every session, then `docs/plan-human.md`, `docs/plan-agentic.md`, and
`docs/roadmap.md`. **Start from the first unchecked box in `docs/roadmap.md`**, not the top
of the plan. If the roadmap and the code disagree, the code is the truth — fix the roadmap.

## Non-negotiables

1. **Bun only.** `bun` for install/run/test. Never `npm`/`pnpm`/`yarn`, never Node scripts.
2. **Never `git push` and never publish without an explicit human "push"/"publish".** Agents
   open PRs; humans merge to `main` and create release tags.
3. **SSR is mandatory.** Zero runtime styling. No `window`/`document`/`navigator`/`localStorage`
   outside `useEffect` or event handlers.
4. **Docs first.** A component's `docs/component-<name>.md` must exist and follow the
   `docs/component-button.md` template before its code is written.
5. **Three files per component** in `packages/ui/src/components/<name>/`:
   `<name>.styles.tsx` (pure variant/class map, server-safe, no hooks/DOM),
   `<name>.logic.tsx` (`forwardRef` component + hooks + a11y; `'use client'` **only** if stateful),
   `index.tsx` (re-exports component + `Props` type). Plus `<name>.test.tsx`, `<name>.stories.tsx`.
6. **Props extend the native element** (`ComponentPropsWithoutRef<'button'>`) and add only what
   native lacks. Ref typed via `forwardRef`.
7. **Tailwind v4 + `tailwind-variants`.** No runtime CSS-in-JS, no per-component `.css`. If a style
   can't be a utility, add a `@utility` to `theme.css`. **Never interpolate class names**
   (`bg-${x}`) — every utility string must appear literally in source.
8. Colors/spacing/radius come from `@theme` tokens (`--sk-*`), never raw hex in a utility. Ask the
   human if a token is missing from `docs/tokens.md`; don't invent one.
9. **Document in the source.** Every exported component and every prop carries TSDoc per
   `docs/tsdoc.md` (purpose, `@remarks` for SSR/a11y/variants, `@default`, a copy-pasteable
   `@example`). The README component table, `llms.txt`, `llms-full.txt` and `docs/llms/*.md` are
   **generated** by `bun run docs:build` from `docs/component-*.md` + `packages/ui/src/index.ts` —
   never edit them by hand; `bun run docs:check` fails CI if they drift.

## Every unit of work ends green

```
bun run check && bun run test:coverage && bun run build && bun run check:pkg
```

(Run from the repo root: each script fans out to every workspace package via `bun run --filter`.
`test:coverage` = `bun test src --coverage` inside each `packages/<pkg>/`. Real-browser tests are
`bun run test:browser`, run against a built Storybook — not part of coverage.)

**Repo layout (Bun workspaces, Q27):** publishable packages live in `packages/*` — `packages/ui`
is `@sukunagg/ui`, `packages/video` is `@sukunagg/video` (repo `sukuna-gg/sukuna-ui`, Q29). Repo-level tooling stays at the root: `docs/`, `.storybook/`, `test/` (shared
unit helpers + `test/browser`), `scripts/` (shared build/docs scripts), `examples/`, `.changeset/`.

Coverage floor is **90%** on lines, functions, and statements (enforced by each package's
`bunfig.toml`), per component's own files. Never raise coverage by excluding component code. If a branch is
unreachable from the public API, delete the branch.

## Roadmap & questions discipline

- Keep `docs/roadmap.md` current **in the same PR as the work**: flip boxes only when the gate
  passes (never ahead of evidence), append one update-log line.
- Log every question the owner asks in `docs/questions.md` the same session — question as worded,
  answer, and any decision. Keep its decision/waiting tables current.

## Breaking-change table (from `docs/questions.md` Q6)

| Change | Bump |
|---|---|
| Remove/rename a prop, variant, export, or CSS entry (`theme.css`/`styles.css`) | major |
| Change a prop's default value | major |
| Visual change that alters layout (height, padding, token value) | major (minor + note if it's a fix toward the spec) |
| Rename a `--sk-*` token | major |
| Add a prop, variant, component, or token | minor |
| Bug fix with no API/layout change; a11y fix | patch |
| Raise minimum React or Tailwind peer version | major |
| Internal headless-lib bump, no API change | patch |

**Pre-1.0:** stay on `0.x` until all ten v1 components ship in a real app. On `0.x`,
minor = breaking, patch = everything else. Classify with this table *before* writing the
changeset. If CI's `api-diff`/`visual-diff`/`token-diff`/`peer-diff` disagrees, CI is right.

When an OPEN decision in `docs/plan-agentic.md` §1 is unresolved, use the default assumption and
leave a `// DECISION(open): ...` comment at the touch point.

## Docs map

- `docs/plan-human.md` — plain-English overview and what the owner signs off on.
- `docs/plan-agentic.md` — phases, gates, file contract, agent rules (§3).
- `docs/roadmap.md` — **living** status board (phase gates + per-component checklist).
- `docs/questions.md` — Q&A log + recorded decisions + open questions.
- `docs/tokens.md` — Sukuna → `--sk-*` token values, dark + light.
- `docs/motion.md` — motion rules, tokens and what animates (CSS-only, reduced-motion fallbacks).
- `docs/theming.md` — built-in themes (dark/light/midnight/paper/system), theme files, the app config + CLI.
- `docs/styling.md` — Tailwind v4 + `tailwind-variants` engine, the `.styles.tsx` pattern, CSS files.
- `docs/releasing.md` — Changesets flow, breaking-change table, CI gates, owner-only publish.
- `docs/ai-decisions.md` — decisions the agent made on its own (open items, spec fixes, missing values).
- `docs/charts-and-stats.md` — charts & stats wave spec: shared missing-data rules, `@sukunagg/charts` plan, pending additions to existing components.
- `docs/testing.md` — `bun test` harness, coverage policy, required cases.
- `docs/storybook.md` — Storybook 10 setup and story conventions.
- `docs/tsdoc.md` — source-level TSDoc convention (what every component/prop comment must carry).
- `docs/known-issues-and-audit.md` — ecosystem lessons + the library's own a11y/perf audit.
- `docs/improvements.md` — prioritized improvement backlog.
- `docs/llms/*.md`, `llms.txt`, `llms-full.txt` — **generated** agent-facing docs (`bun run docs:build`).
- `docs/component-button.md` — the component-doc template (every component copies its sections).
