#!/bin/bash
# Link this worktree's .env files to the canonical repo so every new Conductor
# workspace gets the real env vars instantly, then install deps.
#
# Usage: ./link-envs.sh   (run from anywhere — paths resolve to the script)

set -euo pipefail

# Canonical checkout that holds the real .env files (the main worktree).
SOURCE="/Users/udayan/dev/fable-hackathon"

# This worktree = the directory this script lives in.
WORKTREE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$WORKTREE" = "$SOURCE" ]; then
  echo "↪︎  Already in the source repo — nothing to link."
  exit 0
fi

# Gitignored .env files to symlink (paths relative to the repo root).
# Note: apps/web/.env is git-tracked, so it already ships with every worktree —
# linking it would only create a symlink typechange. The web app's gitignored
# local override is .env.local, which is what actually needs linking.
ENV_FILES=(
  "apps/server/.env"
  "apps/web/.env.local"
)

for rel in "${ENV_FILES[@]}"; do
  src="$SOURCE/$rel"
  if [ ! -e "$src" ]; then
    echo "⚠️  Missing in source, skipping: $src"
    continue
  fi
  mkdir -p "$WORKTREE/$(dirname "$rel")"
  ln -sf "$src" "$WORKTREE/$rel"
  echo "🔗 $rel"
done

echo "✅ Env files linked from $SOURCE"

cd "$WORKTREE"
pnpm install

echo "✅ Ready — run 'pnpm dev' (server :3001, web :5173)"
