#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT/codex-agents"
DEST_DIR="${CODEX_AGENTS_DIR:-$HOME/.codex/agents}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Project agent definitions not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

installed=0
for source in "$SOURCE_DIR"/*.toml; do
  [[ -e "$source" ]] || continue
  name="$(basename "$source")"
  target="$DEST_DIR/digital-insight-ai-$name"

  if [[ -e "$target" ]] && ! cmp -s "$source" "$target"; then
    backup="$target.backup.$(date +%Y%m%d%H%M%S)"
    cp "$target" "$backup"
    echo "Backed up existing $target to $backup"
  fi

  cp "$source" "$target"
  echo "Installed $target"
  installed=$((installed + 1))
done

if [[ "$installed" -eq 0 ]]; then
  echo "No .toml agent files were found in $SOURCE_DIR" >&2
  exit 1
fi

echo "Installed $installed Digital Insight AI Codex agents into $DEST_DIR"
echo "Restart or reload Codex if the new agents are not visible immediately."
