#!/usr/bin/env bash
# Runs ON THE VM. Called by .github/workflows/deploy.yml over SSH:
#
#   ssh kev@vm "deploy <commit-sha>" < build.tgz
#
# The GitHub Actions key in ~/.ssh/authorized_keys is locked to this script
# (command="..."), so that key can only ever deploy, never open a shell.
#
# Steps: check the commit is on origin/main, unpack the prebuilt .next from stdin,
# move the checkout to that commit, reinstall deps only if the lockfile changed,
# swap .next, restart pm2, health-check, and roll back if the site doesn't come up.
#
# Everything lives inside main() so bash has parsed the whole script before
# `git reset` can replace this file on disk.

main() {
  set -euo pipefail

  local app=/home/kev/the-patch-next
  local pm2_name=the-patch
  local port=3000

  local verb sha
  read -r verb sha <<<"${SSH_ORIGINAL_COMMAND:-$*}"
  if [[ "$verb" != deploy || ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
    echo "usage: deploy <40-char commit sha>  (build tarball on stdin)" >&2
    exit 2
  fi

  cd "$app"

  if ! git diff --quiet HEAD --; then
    echo "Refusing to deploy: the VM checkout has uncommitted changes to tracked files." >&2
    git status --short --untracked-files=no >&2
    exit 1
  fi

  git fetch --quiet origin main
  if ! git merge-base --is-ancestor "$sha" origin/main; then
    echo "Refusing to deploy: $sha is not on origin/main." >&2
    exit 1
  fi

  local old_sha old_lock new_lock
  old_sha=$(git rev-parse HEAD)
  old_lock=$(git rev-parse HEAD:package-lock.json)

  DEPLOY_STAGE=$(mktemp -d "$app/.deploy-XXXXXX")
  trap 'rm -rf "${DEPLOY_STAGE:-}"' EXIT
  tar xzf - -C "$DEPLOY_STAGE"
  if [[ ! -f "$DEPLOY_STAGE/.next/BUILD_ID" ]]; then
    echo "Build tarball has no .next/BUILD_ID; aborting before touching anything." >&2
    exit 1
  fi

  echo "Deploying $old_sha -> $sha"
  git reset --hard --quiet "$sha"

  new_lock=$(git rev-parse HEAD:package-lock.json)
  if [[ "$old_lock" != "$new_lock" ]]; then
    echo "package-lock.json changed; reinstalling dependencies"
    npm ci --omit=dev --no-audit --no-fund
  fi

  rm -rf .next.prev
  [[ -d .next ]] && mv .next .next.prev
  mv "$DEPLOY_STAGE/.next" .next

  pm2 restart "$pm2_name" --update-env >/dev/null

  if wait_for_site "$port"; then
    echo "Deployed $sha (build $(cat .next/BUILD_ID))"
    return 0
  fi

  echo "Site did not come back up; rolling back to $old_sha" >&2
  git reset --hard --quiet "$old_sha"
  if [[ -d .next.prev ]]; then
    rm -rf .next && mv .next.prev .next
  fi
  if [[ "$old_lock" != "$new_lock" ]]; then
    npm ci --omit=dev --no-audit --no-fund
  fi
  pm2 restart "$pm2_name" --update-env >/dev/null
  wait_for_site "$port" && echo "Rollback is serving." >&2 || echo "Rollback is NOT serving, check pm2 logs $pm2_name" >&2
  exit 1
}

wait_for_site() {
  local port=$1 i
  for i in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$port/"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

main "$@"
exit
