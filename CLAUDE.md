# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Early: the plugin, injection, config pipeline and Svelte resolver work and are tested. The Claude Code target renders prompts (snapshots in `src/targets/__snapshots__/`). The overlay works end to end in the browser (Alt+P, click to reference, ↑/↓ widen, Enter copies). Read `docs/IDEA.md` (why, promises, what lasts) and `docs/ARCHITECTURE.md` (how) before proposing anything.

## Release

- License: **AGPL-3.0-only** (chosen to keep pinprompt and derivatives open). Contributions are inbound=outbound under the same license.
- Versions are prereleases for now (`0.0.1-alpha.N`). Publish with `npm publish` (npm 10 tags it `latest`; `publishConfig.tag` was ignored, so don't rely on it), then `npm dist-tag add pinprompt@<version> alpha`. `latest` must point at it, because `npx pinprompt init` and plain `npm i pinprompt` resolve `latest`. `init` installs its own exact version.
- `prepublishOnly` builds and runs tests. Before a release, verify the packed tarball in fresh SvelteKit 2 (Vite 6) and SvelteKit 3 (Vite 8) apps: install, `svelte-check`, the overlay flow, and no trace of pinprompt in `vite build` output.
- Benchmarks and their method: `bench/README.md`.

## Commands

pnpm workspace: the root is the `pinprompt` package, `playground/` is a SvelteKit 3 app that uses it via `workspace:*`.

- `pnpm dev`: builds the library, then runs `vite build --watch` and the playground dev server in parallel.
- `pnpm build`: library build to `dist/` (Vite) + type declarations (`tsc -p tsconfig.build.json`).
- `pnpm test`: Vitest (happy-dom). Single file: `pnpm vitest run src/vite.test.ts`. Single test: add `-t "<name>"`.
- `pnpm check`: svelte-check (types for `.ts` and `.svelte`). Playground: `pnpm --filter playground check`.

The playground consumes `dist/`, so library changes need a rebuild (`pnpm dev` does it on save). Plugin changes in `src/vite.ts` also need a dev server restart.

## Key facts

- pinprompt is a **dev-only Vite plugin** that injects an overlay where the developer types a prompt and clicks elements to insert source references, then copies the result for an AI. Installed as a dev dependency, runs inside `vite dev`, no separate process.
- **Two plug points around a small core:**
  - **Resolvers** (`src/resolvers/`, one file per framework): `resolve(el) → Ref | null`. We build **Svelte** only; it reads dev-mode `__svelte_meta`. The core (`src/client/resolve.ts`) runs resolvers in order, falls back to tag + text, and makes paths repo-relative.
  - **Targets** (`src/targets/`, one file per AI): pure `render(intent, ctx) → string`, optional `deliver()`. We build **Claude Code** only.
  - The core must never contain framework- or AI-specific logic.
- **`npx pinprompt init`** (`src/cli.ts` + pure `src/init.ts`): installs via the nearest lockfile's package manager and edits `vite.config` only when it has exactly one plain `plugins: [...]`; otherwise prints manual steps. Never guess when editing user config.
- **Config reaches the browser via `virtual:pinprompt/config`**, which imports resolvers/targets by file path (built-ins from `dist/`, custom ones relative to the Vite root). Built-ins are separate entries in `vite.config.ts`; unknown ids fail at startup.
- **Paths:** Svelte reports dev files relative to `process.cwd()` (its `rootDir` default), usually the Vite root but not always. The plugin sends `root` (repo, via `.git`) and `base` (cwd relative to repo); the core, not resolvers, makes `Ref.file` repo-relative.
- SvelteKit 3 uses `#lib` (package.json `imports`) instead of `$lib`.
- Tests that use runes must be named `*.svelte.test.ts`. Resolver tests mount real dev-compiled fixture components (`src/resolvers/fixtures/`); Vitest resolves the `browser` condition so `mount` works.
- **`Intent`, `Ref`, `Frame` are the public contract** between resolvers and targets: framework-neutral, only optional fields added, never renamed or removed outside a major version.
- Adding a framework or an AI = one file + one build entry + one test. See `CONTRIBUTING.md`.

## Principles

- **Audience: experienced developers only.** Keyboard-first, terse, precise. No onboarding, tutorials or explanatory copy, and no instructions injected into prompts: the user writes intent, we add references. Never design for beginners or non-developers.
- **Simple and modern.** Few files, few dependencies, no abstractions beyond the two plug points. TypeScript, ESM, pnpm, Svelte 5 (overlay), Vite, Vitest.
- **Invest only where it lasts:** deep Svelte resolution, Claude Code output tuned for tokens, intent capture. Keep generic parts (picking, clipboard) thin. Run new ideas through the "what lasts" table in `docs/IDEA.md`.
- We don't write resolvers or targets beyond Svelte and Claude Code unless the author asks; the architecture is there so contributors can.
