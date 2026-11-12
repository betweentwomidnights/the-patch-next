#!/usr/bin/env bash
# Sync heavy media under public/ (gitignored: videos, audio, gifs) with the production VM.
#
#   npm run media:pull   copy media from the VM into this checkout (run once after cloning)
#   npm run media:push   copy media you added locally up to the VM (never deletes anything)
#
# Needs SSH access to the VM. Override the target with PATCH_VM=user@host.
set -euo pipefail

VM="${PATCH_VM:-kev@thecollabagepatch.com}"
REMOTE_DIR="${PATCH_VM_DIR:-/home/kev/the-patch-next}"
cd "$(dirname "$0")/.."

# Keep in sync with the media section of .gitignore.
filters=(
  --include='*/'
  --include='*.mp4' --include='*.webm' --include='*.mov'
  --include='*.wav' --include='*.mp3'
  --include='*.gif' --include='*.apng'
  --exclude='*'
  --prune-empty-dirs
)

case "${1:-}" in
  pull) rsync -av --itemize-changes "${filters[@]}" "$VM:$REMOTE_DIR/public/" public/ ;;
  push) rsync -av --itemize-changes "${filters[@]}" public/ "$VM:$REMOTE_DIR/public/" ;;
  *) echo "usage: $0 pull|push" >&2; exit 1 ;;
esac
