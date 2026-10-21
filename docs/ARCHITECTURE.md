# Architecture

Small on purpose. One package, a few files, no framework of our own.

## Shape: two plug points around a small core

```
              resolvers (one file per framework)        targets (one file per AI)
                         │                                       │
click / type  →  resolver.resolve(el) → Ref  →  Intent  →  target.render()  →  deliver()
  (client)        svelte today                    (data)     claude-code today    clipboard today
```

- **Resolvers** know frameworks. **Targets** know AIs. **The core** knows neither: it picks elements, holds the `Intent` and delivers text.
- We build **Svelte** and **Claude Code**. Everything else is added by contribution, one file at a time, without touching the core.
- Anyone can point the config at their own resolver or target file to try it locally before opening a PR.

## Form: a Vite plugin

Installed as a dev dependency, runs inside the existing `vite dev`. No extra command, no parallel process.

```sh
npm i -D pinprompt
```

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { pinprompt } from 'pinprompt/vite';

export default {
  plugins: [sveltekit(), pinprompt()],
  // defaults: resolvers: ['svelte'], target: 'claude-code'
};
```

Why a plugin:
- **Runs in any browser**, including the built-in browsers of AI editors.
- **Knows the project root**, so paths come out right in monorepos with zero config.
- **Already has a server** (the Vite dev server) for a future MCP endpoint.
- **Covers most modern frameworks:** Svelte, React, Vue, Solid, Astro, Qwik all have Vite setups.
- **Dev only:** `apply: 'serve'`, never ships to production.
- Injection follows Svelte Inspector: append a dynamic `import()` of our client to Vite's dev client (`vite/dist/client/client.mjs`) in `transform`.

Non-Vite setups (Next.js on webpack/Turbopack, Angular CLI) would need another thin integration. Not planned.

### `npx pinprompt init`

`src/cli.ts` (I/O) + `src/init.ts` (pure, tested). Installs with the package manager of the nearest lockfile, walking up to a monorepo root, falling back to the one running `npx`, then npm. Adds the import and `pinprompt()` to the single `plugins: [...]`, keeping quote/semicolon/trailing-comma style. A small scanner skips strings, comments and regex literals to find the matching bracket. Anything else (no `plugins` array, several, `plugins` as a variable) is left untouched with manual instructions: never guess in someone's config. Idempotent. If the install fails, the config isn't edited.

## Data: the stable contract

`Ref` and `Intent` sit between resolvers and targets, so they must not leak any one framework's vocabulary, and must not break.

```ts
type Ref = {
  tag: string;               // 'div'
  text: string;              // short visible text, for humans and disambiguation
  file?: string;             // repo-relative: src/routes/+page.svelte
  line?: number;
  column?: number;           // 1-based
  chain: Frame[];            // innermost → outermost source context
  framework?: string;        // resolver id that produced it, e.g. 'svelte'
};

type Frame = {
  kind: 'component' | 'loop' | 'condition' | 'other';
  name?: string;             // 'StatCard', 'each', 'if'
  file: string;
  line: number;
  index?: number;            // loops only: which item contains the element, 0-based
};

type Intent = (string | Ref)[];   // free text interleaved with refs
```

Contract rules:
- **Only add optional fields.** Never rename or remove without a major version.
- Resolvers map framework concepts onto these generic `kind`s; targets ignore what they don't use.
- A `Ref` with only `tag` + `text` and an empty `chain` is valid: that's the DOM fallback when no resolver knows the element.
- Loop indexes live on each loop `Frame`, so nested loops get one per level ("row 2, cell 1").

## Resolvers: one file per framework

```ts
// src/resolvers/types.ts
export interface Resolver {
  id: string;                               // 'svelte', used in config
  name: string;                             // 'Svelte'
  resolve(el: Element): Ref | null;         // browser side; null = "not mine"
}
```

- **Per element, first match wins.** The core (`client/resolve.ts`) tries configured resolvers in order, then falls back to tag + text. Mixed pages (e.g. Astro with Svelte and React islands) work naturally.
- **`resolve` is side-effect free:** reads the element, returns data.
- **Paths as the framework reports them.** Resolvers return `file` as the framework reports it: Svelte uses paths relative to the dev server's working directory (its `rootDir` defaults to `process.cwd()`, usually but not always the Vite root), or absolute. The core turns it into a repo-relative path using `base` from the plugin, so resolvers never deal with monorepo layout.
- **Build-time help is not our job.** If a framework doesn't expose source locations in the browser (e.g. React 19 dropped `_debugSource`), its resolver docs tell users to add that framework's own Vite plugin that does.
- **Shared fixtures:** each resolver ships DOM fixtures (Vitest + happy-dom) asserting the exact `Ref` produced, including loop index and the no-meta case.

### Svelte resolver

Svelte 5 in dev sets `element.__svelte_meta = { loc: { file, line, column }, parent }` on every element it creates. `parent` is a linked list of dev-stack entries (`type`, `file`, `line`, `column`, plus `componentTag` for components). Entry types are `component`, `each`, `if`, `key`, `await` and `render`. The resolver maps them to `Frame.kind` (`component`, `each` → `loop`, `if` → `condition`, the rest → `other`). No source maps, no parsing. Effects save and restore the dev stack, so elements created after mount (new loop items) get the right chain too.

- **Only the user's code:** frames from `node_modules` or `.svelte-kit` (SvelteKit's root component wraps every page: in Kit 3 it's in `node_modules`, in Kit 2 it's generated into `.svelte-kit/generated/root.svelte` and reported as a relative path) are dropped, as are `{@render}` sites like a layout's `children`. Without this every page element carried ~6 framework frames with 200-character paths. An element inside a library component points at where the user's code uses that component.
- **Loop index:** Svelte doesn't record it. The resolver climbs to the item's outermost element (still inside the same `each` entry, compared by reference), then counts earlier siblings created by the same template node in that loop.
- **Elements without meta** (e.g. `{@html}` content) point at the nearest ancestor that has it, keeping their own tag and text.
- **Tests** mount real fixture components compiled in dev mode (`src/resolvers/fixtures/`), so a Svelte change to `__svelte_meta` breaks them immediately.

#### Known limitations

**Loop index can be wrong** when loop items don't all render the same top-level element. The index counts earlier items rendered *by the same template node*, so:

| Case | Example | Index |
|---|---|---|
| Same top-level element per item | `{#each}<li>…</li>{/each}`, `{#each}<Card />{/each}` | ✅ correct |
| Several top-level elements per item | `{#each}<dt/><dd/>{/each}` | ✅ correct |
| Top-level element differs per item | `{#each}{#if x}<h2/>{:else}<p/>{/if}{/each}` | ❌ counts only same-tag items |
| Some items render nothing | `{#each}{#if x}<p/>{/if}{/each}` | ❌ skips empty items |

Wrapping the item in one element (`<li>{#if}…{/if}</li>`) avoids both. The ❌ cases are `test.fails` in `svelte.svelte.test.ts`, so a fix shows up as a test failure to flip.

If we hit this in practice: the mixed-element case is fixable (block entries like `if` are distinct objects per item, so counting distinct ones among siblings gives the right index). The empty-item case isn't, because nothing in the DOM marks an item that rendered nothing.

## Targets: one file per AI

```ts
// src/targets/types.ts
export interface Target {
  id: string;                                           // 'claude-code'
  name: string;                                         // 'Claude Code'
  render(intent: Intent, ctx: RenderContext): string;   // pure
  deliver?(text: string): Promise<void>;                // optional own channel; default is clipboard
}

export interface RenderContext {
  root: string;                                         // project root
}
```

- **Pure:** no DOM, network or clipboard in `render`.
- **Shared fixtures** (`src/targets/fixtures.ts`): the same sample intents (edit, create, remove, multi-ref, loop item, DOM fallback) snapshot-tested for every target, so a PR shows exactly what the new AI receives.
- **Shared helpers** (`src/targets/helpers.ts`): `numberRefs` (sentence with `[n]` markers + ref list) and `ordinal`.

### Claude Code target

- Paths relative to the repo root (where Claude Code usually runs).
- `file:line`, not `@file`: `@` pulls the whole file into context, which defeats the token savings.
- Compact refs. Claude Code reads the exact lines itself.
- The sentence keeps `[n]` markers, refs are listed below it. The same element twice gets the same number.
- Context shows only **components** (where the element is used) and **loops** (which item). Conditions and other blocks are left out: the element's own line already says which branch. A context identical to an earlier ref's renders as `same as [n]` (compared by frames, not text).
- No column (Claude edits by line). Repeated files shorten to `:line`. Loop items as ordinals ("3rd item"), so 0- vs 1-based can't be misread.

```
add a card like [1] right after [2]

[1] <div> "Revenue $12,400" apps/web/src/lib/StatCard.svelte:5
    in <StatCard> apps/web/src/routes/+page.svelte:15 › each (1st item) :14
[2] <div> "Orders 318" apps/web/src/lib/StatCard.svelte:5
    in <StatCard> apps/web/src/routes/+page.svelte:15 › each (3rd item) :14
```

All outputs: `src/targets/__snapshots__/claude-code.test.ts.snap`.

## Overlay

- **Alt+P** (Option+P) toggles the bar; a small launcher button does the same. While open, the page is inert: clicks pick instead of reaching the app.
- **The prompt is a plain textarea.** Clicking an element inserts `[n]` at the cursor, like a cell reference in a spreadsheet formula, and the same `[n]` markers appear in the output. Deleting a marker drops the reference. No rich-text editor.
- **↑/↓ while hovering** widens to the parent / narrows back, so whole cards and sections can be picked.
- **Picked elements get numbered, colored outlines** (repositioned every frame while open), the way a spreadsheet colors referenced cells. A hover box shows `Component <tag> "text" · file:line` before you click.
- **The draft survives reloads** (text, resolved refs, open state; `sessionStorage`, per tab). Reloads are constant while an AI edits the code, and SvelteKit does full reloads when it regenerates `.svelte-kit/generated`. Refs survive; outlines come back only for elements picked again.
- **Enter** renders with the target, delivers (clipboard, with an `execCommand` fallback for non-secure LAN dev URLs) and **shows the result** in the bar. Clicking it copies again; it stays until dismissed (✕ or Esc), survives closing the bar and reloads, and pauses picking while shown.
- **Esc** in the prompt closes the bar and keeps the draft.

## How the pieces load

The plugin passes config to the browser through a virtual module, `virtual:pinprompt/config`, which **imports** the configured resolvers and target by file path:

```ts
pinprompt()                                                     // built-ins: dist/resolvers/svelte.js, dist/targets/claude-code.js
pinprompt({ resolvers: ['./my-resolver.ts', 'svelte'], target: './my-target.ts' })   // local files, relative to the Vite root
```

Paths rather than objects, because config is created in Node and used in the browser; functions can't cross that line. Vite compiles local files like any app code.

The config also carries `root` (absolute repo root, found by walking up to `.git`; the working directory when there's no repo) and `base` (the dev server's working directory relative to it, e.g. `apps/web`). Unknown built-in ids and missing custom files fail at startup with a clear message.

## Files

```
src/
  vite.ts                plugin: dev-only, injects client, serves the config module
  cli.ts  init.ts        `npx pinprompt init` (I/O / pure)
  index.ts               public type exports
  types.ts               Intent, Ref, Frame
  client/
    index.ts             mounts the overlay in a shadow root (isolated from app styles)
    Overlay.svelte       prompt bar (textarea), outlines, result view
    types.ts             ClientConfig
    config.d.ts          types for the `virtual:pinprompt/config` module
    picker.ts            makes the page inert and reports hover/pick
    intent.ts            textarea text + picks → Intent; widen()
    draft.ts             draft persistence across reloads
    deliver.ts           clipboard
    resolve.ts           Element → Ref: runs resolvers, DOM fallback, repo-relative paths
  resolvers/
    types.ts  helpers.ts Resolver, shared helpers (visibleText)
    svelte.ts            + svelte.svelte.test.ts, fixtures/
  targets/
    types.ts             Target, RenderContext
    helpers.ts           numberRefs, ordinal
    fixtures.ts          shared sample intents (snapshot-tested per target)
    claude-code.ts
playground/              SvelteKit app using the plugin: dev target and demo
vite.config.ts           library build; each built-in resolver/target is one entry
```

## Stack

- TypeScript, ESM, pnpm.
- Overlay written in Svelte 5, compiled into the package. It runs on any framework's page; users don't need Svelte.
- Vite library build (one entry per built-in resolver/target) + `tsc` for type declarations. Vitest + happy-dom.
- Supports Vite ≥ 6 as a peer. Developed on Vite 8, SvelteKit 3, Svelte 5.57.
- No other runtime dependencies unless one clearly earns its place.

## Later (not now)

- MCP endpoint on the dev server (via optional `Target.deliver`).
- More resolvers and targets, contributed via [CONTRIBUTING.md](../CONTRIBUTING.md).
