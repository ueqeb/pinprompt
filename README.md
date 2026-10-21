# pinprompt

**Click your UI, type what you want, paste an exact prompt into your AI.**

A dev-only Vite plugin for SvelteKit. Instead of describing elements in words, you click them, and pinprompt writes where they live in your code. Built for Claude Code; the output is plain text, so any AI can read it.

```
move [click] above [click]
```

↓ Enter, copied:

```
move [1] above [2]

[1] <div> "Orders 318" src/lib/StatCard.svelte:5
    in <StatCard> src/routes/+page.svelte:16 › each (3rd item) :15
[2] <h1> "Dashboard" src/routes/+page.svelte:12
```

> **For developers.** pinprompt is for people who already work with AI coding agents and know their codebase. It is not a no-code or visual-editing tool.

## Why

**For you**
- Point instead of describing. No hunting for file names and line numbers.
- Pick the exact instance: which card, which loop item, which component usage.
- Works where you already are: your running app, your AI tool, your clipboard.

**For your AI**
- Goes straight to `file:line` instead of searching the codebase.
- Fewer turns, fewer tokens, fewer edits to the wrong element.
- Compact on purpose: no framework internals, no whole files pulled into context.

## Benchmark

Same task on a real SvelteKit app, Claude Code, 3 runs each:

| | Hand-written prompt | pinprompt | |
|---|---|---|---|
| Cost | $0.170 | $0.103 | **−39%** |
| Time | 26 s | 11 s | **2.4× faster** |
| Agent turns | 6 | 3 | **−50%** |
| Tokens | 133k | 60k | **−55%** |
| Correct edit | 3/3 | 3/3 | |

One task, so read it as a signal, not a guarantee. [Method and caveats](bench/README.md).

## Install

In your SvelteKit app folder:

```sh
npx pinprompt init
```

This installs it as a dev dependency with your package manager and adds it to `vite.config`. [Manual setup](docs/ARCHITECTURE.md#form-a-vite-plugin) is just one import and one plugin line.

## Use

Start your dev server, then:

| | |
|---|---|
| **Alt+P** | open the prompt bar |
| click | reference an element |
| **↑ / ↓** | widen to the parent element / narrow back |
| **Enter** | copy the prompt |
| **Esc** | close (your draft is kept) |

## Feedback wanted

pinprompt is an alpha with one open question: **does it make AI-assisted frontend work faster and cheaper for you?** Help answer it:

- **Try it on your app** and [tell us how it went](https://github.com/ueqeb/pinprompt/issues/new?template=feedback.yml): what helped, what got in the way. Five minutes of feedback shapes what gets built next.
- **Share a before/after.** Ran the same task with and without pinprompt? Your numbers make the benchmark more than one data point. [How we measure](bench/README.md).
- **Add your AI or framework.** Cursor, Codex, React, Vue… each is a single file with shared tests, so it's a small, well-scoped PR. [CONTRIBUTING.md](CONTRIBUTING.md)

## Good to know

- **Dev only.** Runs inside `vite dev`, never ships in a build.
- **Supports** SvelteKit 2 & 3, Svelte 5, Vite 6+, Chrome.
- **Alpha.** Expect rough edges. [Report a bug](https://github.com/ueqeb/pinprompt/issues/new?template=bug.yml).
- **AI-assisted.** Designed, directed and tested by a human; the code was written with Claude Code.

## License

[AGPL-3.0-only](LICENSE). Using it as a dev tool creates no obligations for your project.
