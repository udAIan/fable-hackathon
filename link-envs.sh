#!/bin/bash
# usage: run from the worktree root directory

set -e

WORKTREE=$(pwd)
SOURCE=/Users/udayan/dev/fable-hackathon

ln -sf "$SOURCE/apps/server/.env" "$WORKTREE/apps/server/.env"
ln -sf "$SOURCE/apps/web/.env.local" "$WORKTREE/apps/web/.env.local"

echo "✅ Env files linked to $WORKTREE"

pnpm install
pnpm build

echo "✅ Dependencies installed and packages built"
