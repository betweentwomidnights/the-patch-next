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

This uses SSH to `kev@thecollabagepatch.com` (or over the tailnet: `PATCH_VM=kev@the-patch npm run media:pull`), so
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

**Radio metadata:** the added tracks have editable titles, descriptions, and YouTube
links in `src/app/radio/catalog/2026.json` and `development.json`. See
[`src/app/radio/catalog/README.md`](src/app/radio/catalog/README.md) for the fallback
text and how to mark a track as having no video.

**Radio rotation:** all folders share one weighted pool. Edit `radio-rotation.json`
for track weights and repeat spacing, then restart the server. `1` is normal,
smaller values are rarer, and `0` disables a track. The catalog README explains
the settings and the explicit timezone/eligibility hook for future scheduling.

**Payments (Stripe):** put a sandbox secret key in `.env.local` as `STRIPE_SECRET_KEY=sk_test_...`
(Dashboard → account menu → Sandboxes → Developers → API keys), then run `npm run stripe:seed` once
to create the pay-what-you-want products in that sandbox. Pay with test card `4242 4242 4242 4242`.
Without a key the site still runs; the pay button just shows as unavailable. Software products and
download links live in `src/app/lib/catalog.ts`; prices live in Stripe, found by lookup key
(e.g. `gary4juce_pwyw`). The VM's `.env.local` holds the live key.

**Rolling back:** revert the commit and push, or open an older successful run in
**Actions** and re-run it. Any commit on `main` can be redeployed.

## How the site is put together

Three things live in the root layout (`src/app/layout.tsx`) and never unmount, which is
what makes the site feel like one place:

- **the ink** (`src/app/visual/`): one canvas over the whole site. On WebGPU it's a fluid
  of particles (`gpu/`, our own MLS-MPM sim and an ink-style renderer); without WebGPU it
  falls back to a simpler WebGL particle cloud (`gl/`); with "reduce motion" on it doesn't
  run at all and pages show plain images. Pages don't talk to it. They place a
  `<StageAnchor shape="ball|patch|gary">` and the ink goes to the most important anchor
  on screen, or back to the radio dock when there isn't one.
- **the radio** (`src/app/radio/`): `radio.ts` follows the server's clock and keeps playing
  across navigation. `RadioDock` is the round button in the corner; `/radio` is the big version.
  The ink listens through `visual/features.ts`.
- **the header**.

The look (colours, fonts, the hand-drawn outlines and buttons) is all in
`src/app/globals.css` and `tailwind.config.js`.

Handy while working on the ink (dev only): `?engine=gl` forces the WebGL fallback,
`?ink=150000` sets the particle count, and `window.__ink` in the console shows fps.

## How deploys work

`.github/workflows/deploy.yml` runs `npm ci && npm run build` on GitHub's runner. A
second job (which is the only one with deploy credentials) joins the tailnet as a
temporary `tag:ci` device and pipes the built `.next` (about 5 MB) over SSH to
`scripts/deploy-remote.sh` on the VM. Public SSH stays closed to everyone but Kevin's
IP; CI only reaches the VM through Tailscale. The deploy script:

- refuses if the VM checkout has uncommitted changes, or the commit isn't on `origin/main`
- moves the VM checkout to the commit (`git reset --hard`; untracked media is untouched)
- reinstalls dependencies only if `package-lock.json` changed
- swaps in the new `.next` (the previous one is kept as `.next.prev`) and restarts pm2
- checks the site answers on `:3000` and rolls back automatically if not

### One-time deploy setup

1. **Tailnet policy:** apply [`infra/tailscale/policy.hujson`](infra/tailscale/policy.hujson)
   in the Tailscale admin console (Access controls). It adds `tag:web` (the VM) and
   `tag:ci` (deploy runners); CI can reach only the VM's port 22, and the VM can't reach
   anything. Its built-in tests check that on save.
2. **VM joins the tailnet** (do this after step 1, never before):
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --advertise-tags=tag:web --hostname=the-patch
   ```
   Don't pass `--ssh`. Tailscale SSH would take over port 22 on the tailnet address and
   bypass the restricted deploy key below.
3. **Federated identity for GitHub Actions:** in the Tailscale admin console → Settings →
   Trust credentials, add an OpenID Connect credential for GitHub with subject
   `repo:betweentwomidnights/the-patch-next:ref:refs/heads/main`, scope `auth_keys`
   (write), tag `tag:ci`. Save its client ID and audience as repository secrets
   `TS_OAUTH_CLIENT_ID` and `TS_AUDIENCE`.
4. **Deploy SSH key** (locked to `scripts/deploy-remote.sh`, so it can deploy but can't open a shell):
   ```bash
   ssh-keygen -t ed25519 -N "" -C "github-actions deploy" -f ~/.ssh/github_actions_deploy
   echo "command=\"/home/kev/the-patch-next/scripts/deploy-remote.sh\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $(cat ~/.ssh/github_actions_deploy.pub)" >> ~/.ssh/authorized_keys
   cat ~/.ssh/github_actions_deploy   # paste into GitHub as the VM_DEPLOY_KEY secret
   rm ~/.ssh/github_actions_deploy    # the VM doesn't need its own copy of the private key
   ```

Secrets live at **Settings → Secrets and variables → Actions**.

## Other pieces

Server config outside the Next app (nginx, Rare Numbers static pages, the status
service) is in [`infra/`](infra/README.md).
