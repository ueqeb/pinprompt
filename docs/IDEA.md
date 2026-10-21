# Idea

## One line

**Point at your app, say what you want, and paste a prompt that tells your AI exactly which code you mean.**

Svelte and Claude Code first. Other frameworks and AIs plug in as one-file contributions.

## Who it's for

**Experienced developers** who already work with AI coding agents and know their codebase. Not juniors learning the stack, not non-developers. Nobody else is a design target.

What that means:
- **The value isn't "find the code for me".** They know where it lives. The value is not typing paths and line numbers, pointing at the exact instance (which loop item, which usage of a component), and fewer tokens and agent turns.
- **No hand-holding.** No onboarding, tutorials, wizards or explanatory UI copy. No instructions added to the prompt: the developer writes the intent, pinprompt only adds precise references.
- **Keyboard-first, terse, precise.** Never guess on the user's behalf.

## Pains

Frontend work with AI today:
- Describing UI in words is slow and vague ("the second card, the blue one").
- Typing file paths and line numbers by hand breaks flow, and still doesn't say which loop item you mean.
- The AI edits the wrong element or file, and you go back and forth fixing it.
- The AI burns tokens and time searching the codebase for what you meant.
- Screenshots are expensive and still don't tell the AI which code made which pixels.
- The AI invents new markup and styles instead of reusing yours.

## Core promises

1. **Point, don't describe.** Create, edit, move, remove or fix anything by clicking on it while you type.
2. **Right code, first time.** Every reference resolves to source: `file:line`, component chain, which loop item.
3. **Cheaper, faster AI.** No codebase search, no screenshots.
4. **Matches your code.** "Like <this>" makes the AI copy your existing patterns.
5. **Any AI.** Plain text out, readable by any AI. Built and tuned for Claude Code first.

## What lasts (and what doesn't)

The test: *if Cursor or Claude shipped a perfect element picker tomorrow, would this still matter?*

| | Lasts? | Our stance |
|---|---|---|
| Generic "click element → copy DOM" | ❌ Already done (Agentation) and being built into AI tools | Keep thin |
| Clipboard / screenshot replacement | ❌ Anyone can copy it | Keep thin |
| Multi-reference prompts | ⚠️ Partly exists | Do well, don't bet on it |
| **Svelte-deep source resolution** | ✅ Nobody does it; big tools serve React first | **Invest here.** Other frameworks via contributed resolvers |
| **Works with any AI** | ✅ Built-in pickers only serve their own AI | **Never lock in** |
| **Capturing human intent** (which element, where, like what) | ✅ An AI that can see the page still can't read your mind | **The core.** Delivery (clipboard today, MCP later) is a swappable detail |

## Positioning

"React Grab for Svelte, plus composition", with an open plug-in model for any framework and any AI. Open source, dev-only, one line to install.

Related tools: [React Grab](https://github.com/aidenybai/react-grab) (React, source-aware, single element), Agentation (any site, DOM-only annotations), Svelte Inspector (click → open in editor, no AI).

## Out of scope

Non-developers and beginners (no-code flows, guided UIs, tutorials), production sites, non-Vite build setups, browser extensions, screenshots, an AI of our own. We don't write resolvers or targets beyond Svelte and Claude Code ourselves.
