# Contributing

pinprompt has two plug points, and both follow the same recipe: **one file, one build entry, one test.** The core never changes for a new framework or a new AI.

| You want to support... | Add a | Reference implementation |
|---|---|---|
| A frontend framework (React, Vue, Solid...) | **resolver** in `src/resolvers/` | `svelte.ts` |
| An AI tool (Cursor, Codex, Copilot...) | **target** in `src/targets/` | `claude-code.ts` |

Try yours locally first, without forking. Paths are relative to your Vite root; keep `'svelte'` in the list, since setting `resolvers` replaces the default:
```ts
pinprompt({ resolvers: ['./my-resolver.ts', 'svelte'], target: './my-target.ts' })
```
Shared helpers like `numberRefs` aren't part of the public package yet, so a local target copies what it needs.

## Adding a framework (resolver)

1. **Create** `src/resolvers/<id>.ts` exporting a `Resolver`:
   ```ts
   import type { Resolver } from './types.js';

   const vue: Resolver = {
     id: 'vue',
     name: 'Vue',
     resolve(el) { /* return a Ref, or null if this element isn't yours */ },
   };
   export default vue;
   ```
   Return `file` as the framework reports it (relative to the dev server's working directory, or absolute). The core makes it repo-relative.
   If the framework doesn't expose source locations in the browser, document which of its own Vite plugins users must add. Don't build one here.
2. **Add** it as a build entry in `vite.config.ts` (`'resolvers/<id>': 'src/resolvers/<id>.ts'`).
3. **Test** it by mounting real components compiled in dev mode (see `svelte.svelte.test.ts` and `fixtures/`): a plain element, a loop item (`Frame.index`), nested loops, a nested component (`chain`), an item added after mount, and an element the framework didn't create.
4. **In the PR**, show a real `Ref` from a real app, and which framework versions you tested.

Rules:
- `resolve` only reads the element. No side effects.
- Map framework concepts onto the generic `Frame.kind`s (`component`, `loop`, `condition`, `other`). Don't add framework-specific fields to `Ref`.

## Adding an AI (target)

1. **Create** `src/targets/<id>.ts` exporting a `Target`:
   ```ts
   import type { Target } from './types.js';

   const cursor: Target = {
     id: 'cursor',
     name: 'Cursor',
     render(intent, ctx) { /* return a string */ },
   };
   export default cursor;
   ```
2. **Add** it as a build entry in `vite.config.ts` (`'targets/<id>': 'src/targets/<id>.ts'`).
3. **Test** it: copy `claude-code.test.ts` to `<id>.test.ts` and change its import to your target. It snapshots your output for every shared fixture in `fixtures.ts`.
4. **In the PR**, explain why this AI needs a different format from existing targets (path style, mention syntax, length limits), with a real example.

Rules:
- `render` is pure: no DOM, network or clipboard access.
- Ignore `Ref` fields you don't use.

## Both

- Don't change `Intent`, `Ref`, `Frame`, shared helpers or fixtures in the same PR as a new resolver/target. Propose those separately.
- Contract changes only add optional fields. Nothing is renamed or removed outside a major version.

## License

By contributing, you agree that your contributions are licensed under [AGPL-3.0-only](LICENSE), the same as the project.
