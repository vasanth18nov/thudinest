# ThudinestHosting publish worker

A small Cloudflare Worker that backs the on-site publish form at
[`/publish/`](../publish/index.html). It validates the access code, renders a
static business page, and commits it (plus any uploaded photos) directly to
`p/<slug>/` in this repo via the GitHub Contents API — GitHub Pages then
serves it at `thudinest.com/p/<slug>/`.

## Deploy (one-time)

1. **Create a GitHub token** (Settings → Developer settings → Fine-grained
   tokens → Generate new): scope it to **this repository only**
   (`vasanth18nov/thudinest`), with **Contents: Read and write** permission
   and nothing else. Copy the token.
2. Install Wrangler and log in to Cloudflare (free account is fine):
   ```bash
   cd worker
   npx wrangler login
   ```
3. Store the GitHub token as a secret (paste it when prompted — it is never
   written to any file):
   ```bash
   npx wrangler secret put GITHUB_TOKEN
   ```
4. Deploy:
   ```bash
   npx wrangler deploy
   ```
   Wrangler prints a URL like `https://thudinesthosting-publish.<your-subdomain>.workers.dev`.
5. Open [`../publish/index.html`](../publish/index.html) and replace the
   `WORKER_URL` placeholder near the top of the `<script>` block with that
   URL + `/api/publish`.
6. Commit and push the updated `publish/index.html`.

## Notes

- The access code (`thudinest`) is checked in `src/index.js` (`ACCESS_CODE`).
  Change it there and redeploy to rotate it.
- Each published page gets a random **edit key**, returned once at publish
  time and hashed into `p/<slug>/meta.json`. Re-publishing to the same slug
  requires that edit key — this is the only thing preventing someone else
  from overwriting your page (there's no login system).
- Photos are resized/compressed client-side (max 1280px wide, JPEG ~0.82
  quality) before upload, capped at 6 per page.
