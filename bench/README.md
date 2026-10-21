# Benchmarks

Same task, same codebase snapshot, same model: a normal prompt (A) vs the pinprompt prompt (C), run through headless Claude Code.

## How

- Snapshot the app into a fresh git repo (`base/`), so runs never touch real work and every run starts identical.
- `BENCH_DIR=<dir> APP_DIR=<app path in the snapshot> bench/run.sh <arm> <n>` (dir holds `base/`, `prompt-A.txt`, `prompt-C.txt`; the 2026-10-21 run used `APP_DIR=apps/dashboard`): copies the snapshot, runs `claude -p` from the app directory (`--permission-mode acceptEdits --strict-mcp-config --setting-sources project,local`), saves the JSON result and the diff.
- Correctness is judged by reading each diff.
- Medians of 3 runs per arm.

## 2026-10-21: real SvelteKit 2 dashboard, Opus 5.5

Task: make the buy-in label in every PC tile smaller and dimmer. The element lives in a ~3,700-line `+page.svelte`, inside a snippet rendered by nested loops. Its text is live data, so it can't be found by grepping for it.

- **A:** `make the buy-in label (e.g. "0.5,2") in every PC tile on the Ops page smaller and dimmer`. Written by someone who knows the code, which favors A.
- **C:**
  ```
  make [1] in every PC tile smaller and dimmer

  [1] <span> "0.5,2" apps/dashboard/src/routes/+page.svelte:2196
      in each (1st item) :3085 › each (1st item) :3077 › each (1st item) :3054
  ```

| | A | C | |
|---|---|---|---|
| Cost | $0.170 | $0.103 | −39% |
| Time | 26 s | 11 s | −58% |
| Turns | 6 | 3 | −50% |
| Input tokens | 133k | 60k | −55% |
| Output tokens | 1,447 | 683 | −53% |
| Correct edit | 3/3 | 3/3 | |

Caveats: one task. Accuracy didn't differ (A also found the line every time); ambiguous targets weren't tested. Most input tokens are cache reads, so cost drops less than tokens. ~60k tokens per run are fixed overhead (system prompt, project CLAUDE.md).
