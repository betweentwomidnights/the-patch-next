# infra

Everything on the production VM that isn't the Next app itself, kept here so
the server can be rebuilt from git. These files are **copies**: the server does
not read them from this folder. Edit here, then apply with the commands below.

## VM layout (Ubuntu 24.04, 1 vCPU / 1.8 GB)

| What | Lives on the VM at | Copy in repo |
| --- | --- | --- |
| Next app + radio socket server (`server.js`), pm2 process `the-patch`, `:3000` | `/home/kev/the-patch-next` | repo root |
| Status service (maintenance banner API), systemd `status-service`, `:3001` | `/home/kev/services/status-service` | `infra/status-service`, `infra/systemd` |
| nginx for `thecollabagepatch.com` (+ www) | `/etc/nginx/sites-available/the-patch` | `infra/nginx/the-patch.conf` |
| nginx for `video.thecollabagepatch.com` | `/etc/nginx/sites-available/video-subdomain` | `infra/nginx/video-subdomain.conf` |
| Rare Numbers pages, privacy policy, `app-ads.txt`, app-store redirect | `/var/www/static` | `infra/www/static` |
| gary4live demo playlist page | `/var/www/video` | `infra/www/video` |
| Let's Encrypt webroot | `/var/www/html/.well-known` | not tracked (certbot manages it) |

TLS certs are managed by certbot (`/etc/letsencrypt/live/...`); the `# managed by Certbot`
lines in the nginx configs are its edits.

### Routing (`the-patch.conf`)

- `/socket.io/`, `/api/`, `/` → Next/Express on `:3000`
- `/status-api/` → status service on `:3001` (`/api/`)
- `/worklet/` → served from disk with COOP/COEP headers (radio FFT worklet)
- `/privacy-policy.html`, `/app-ads.txt`, `/redirect.html`, `/redirect.js`, `/rarenumbers/` → `/var/www/static`

## Applying changes

```bash
# nginx
sudo cp infra/nginx/the-patch.conf /etc/nginx/sites-available/the-patch
sudo nginx -t && sudo systemctl reload nginx

# static pages
sudo rsync -a infra/www/static/ /var/www/static/

# status service
rsync -a --exclude node_modules --exclude dist --exclude data infra/status-service/ ~/services/status-service/
cd ~/services/status-service && npm ci && npm run build && sudo systemctl restart status-service
```

Status service runtime state is `data/status.json` on the VM (not tracked).
Set maintenance mode from `~/services/status-service`, see `src/example-cli-commands.txt`.

## Media

Large media under `public/` (radio audio, demo videos, gifs) is being moved out of
git. New `.mp4/.webm/.mov/.wav/.mp3/.gif/.apng` files under `public/` are gitignored;
files already tracked stay tracked for now. Those files exist only on the VM until
the media sync from the dev-workflow phase is set up.
