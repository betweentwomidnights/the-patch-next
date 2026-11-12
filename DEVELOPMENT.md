# Developing the-patch-next

Work happens on your PC (WSL2). `main` deploys itself: push or merge to `main`, and
GitHub Actions builds the site and ships it to the VM. Don't edit or build on the VM.

## One-time setup (WSL2 Ubuntu)

```bash
# Node 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20

sudo apt install -y git rsync

# Clone inside the WSL filesystem, not /mnt/c (much faster, and file watching works)
cd ~
git clone https://github.com/betweentwomidnights/the-patch-next.git
cd the-patch-next
npm ci
cp .env.example .env.local
```

The first clone is about 800 MB because old media is in git history.

Open it in VS Code with `code .` from WSL (needs the WSL extension).

### Media

Large media files (demo videos, gifs, new audio) are not in git. They live on the VM.
Pull them once so the landing page videos work locally:

```bash
npm run media:pull
```

This uses SSH to `kev@thecollabagepatch.com` (override with `PATCH_VM=user@host`), so
WSL needs an SSH key the VM accepts. Without it the site still runs; only the
gitignored videos and gifs will be missing.

## Day to day

```bash
npm run dev          # http://localhost:3000, hot reload (radio + socket.io included)
```

WSL forwards port 3000, so open it in your normal Windows browser.

1. Branch off `main`, work, commit.
2. Open a PR, or merge to `main` when it's ready.
3. Merging to `main` deploys. Watch it under the repo's **Actions** tab (takes a few minutes).

**Adding media:** drop the file in `public/`, run `npm run media:push` to copy it to the VM,
then merge the code that uses it. Push never deletes anything on the VM.

**Rolling back:** revert the commit and push, or open an older successful run in
**Actions** and re-run it. Any commit on `main` can be redeployed.

## How deploys work

`.github/workflows/deploy.yml` runs `npm ci && npm run build` on GitHub's runner, then
pipes the built `.next` (about 5 MB) over SSH to `scripts/deploy-remote.sh` on the VM. That script:

- refuses if the VM checkout has uncommitted changes, or the commit isn't on `origin/main`
- moves the VM checkout to the commit (`git reset --hard`; untracked media is untouched)
- reinstalls dependencies only if `package-lock.json` changed
- swaps in the new `.next` (the previous one is kept as `.next.prev`) and restarts pm2
- checks the site answers on `:3000` and rolls back automatically if not

### One-time deploy setup (on the VM)

The workflow needs an SSH key it can use to reach the VM. That key is locked to
`scripts/deploy-remote.sh`, so it can deploy but can't open a shell.

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions deploy" -f ~/.ssh/github_actions_deploy
echo "command=\"/home/kev/the-patch-next/scripts/deploy-remote.sh\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $(cat ~/.ssh/github_actions_deploy.pub)" >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_deploy   # paste into GitHub as the VM_DEPLOY_KEY secret
```

Add the private key at **Settings → Secrets and variables → Actions → New repository
secret**, named `VM_DEPLOY_KEY`. The Azure network security group must allow inbound
SSH (port 22) from GitHub's runners.

## Other pieces

Server config outside the Next app (nginx, Rare Numbers static pages, the status
service) is in [`infra/`](infra/README.md).
