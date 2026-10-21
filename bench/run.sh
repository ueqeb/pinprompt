#!/bin/bash
# Usage: BENCH_DIR=<dir> [APP_DIR=<path in snapshot>] run.sh <arm> <n>
# Fresh copy of the snapshot, then headless Claude Code from APP_DIR (where you would run it).
S=${BENCH_DIR:?set BENCH_DIR to a dir with base/ and prompt-A.txt / prompt-C.txt}; arm=$1; n=$2; dir=$S/runs/$arm-$n
mkdir -p "$S/runs"
rm -rf "$dir" && cp -R "$S/base" "$dir"
cd "$dir/${APP_DIR:-.}" || exit 1
claude -p "$(cat "$S/prompt-$arm.txt")" --output-format json --permission-mode acceptEdits \
  --strict-mcp-config --setting-sources project,local --no-session-persistence > "$S/runs/$arm-$n.json" 2> "$S/runs/$arm-$n.err"
git -C "$dir" diff > "$S/runs/$arm-$n.diff"
