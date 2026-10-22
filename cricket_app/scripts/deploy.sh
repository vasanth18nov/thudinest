#!/usr/bin/env bash
#
# Build CricketHub and publish it into the thudinest GitHub Pages site.
#
#   npm run deploy
#
# What it does:
#   1. Checks .env, runs the type check, unit tests and production build.
#   2. Copies dist/ into <repo root>/<base path>/ (default: crickethub/).
#      It refuses to write into an existing folder it didn't create, so /cricket/ (the
#      Floodlit Over game) and the homestay pages can never be overwritten.
#   3. Adds a site-wide 404.html with the single-page-app redirect if the site has none.
#      An existing 404.html that isn't ours is left alone (you get instructions instead).
# It does not commit or push: review the changes and push from VS Code (or git) yourself.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
MARKER=".crickethub-build"

cd "$APP_DIR"
if [[ ! -f .env ]]; then
  echo "✗ No .env file. Copy .env.example to .env and fill in your Firebase web config first." >&2
  exit 1
fi
if grep -qE '^VITE_USE_EMULATORS=true' .env; then
  echo "✗ .env has VITE_USE_EMULATORS=true. Set it to false for a production build." >&2
  exit 1
fi

# Base path from .env (default /crickethub/), normalised to "crickethub"
BASE_RAW="$(grep -E '^VITE_BASE_PATH=' .env | tail -1 | cut -d= -f2- | tr -d '"' || true)"
BASE_NAME="$(echo "${BASE_RAW:-/crickethub/}" | sed -E 's#^/+##; s#/+$##')"
if [[ -z "$BASE_NAME" || "$BASE_NAME" == *"/"* || "$BASE_NAME" == "cricket_app" ]]; then
  echo "✗ VITE_BASE_PATH must be a single folder name such as /crickethub/ (got '${BASE_RAW}')." >&2
  exit 1
fi
TARGET="$REPO_DIR/$BASE_NAME"

if [[ -d "$TARGET" && -n "$(ls -A "$TARGET")" && ! -f "$TARGET/$MARKER" ]]; then
  echo "✗ $TARGET already exists and wasn't created by this script. Refusing to overwrite it." >&2
  echo "  Pick a different VITE_BASE_PATH in .env." >&2
  exit 1
fi

echo "▸ Testing"
npm test --silent
echo "▸ Building for /$BASE_NAME/"
npm run build --silent

echo "▸ Copying dist/ → $BASE_NAME/"
mkdir -p "$TARGET"
rsync -a --delete dist/ "$TARGET/"
echo "Built by cricket_app/scripts/deploy.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ). Safe to replace." > "$TARGET/$MARKER"

FOUR04="$REPO_DIR/404.html"
if [[ ! -f "$FOUR04" ]] || grep -q "crickethub-spa-fallback" "$FOUR04"; then
  sed "s#__BASE__#/$BASE_NAME/#g" scripts/spa-404.html > "$FOUR04"
  echo "▸ Wrote 404.html (deep-link fallback for /$BASE_NAME/)"
else
  echo "! The site already has its own 404.html, so it was left unchanged."
  echo "  Deep links such as /$BASE_NAME/teams/abc need the redirect script from"
  echo "  cricket_app/scripts/spa-404.html added to it (or deploy the og-worker, which also handles this)."
fi

cat <<MSG

✓ Ready. Review and publish from the repo root:
    git add $BASE_NAME 404.html cricket_app
    git commit -m "CricketHub: deploy"
    git push
  Then open https://thudinest.com/$BASE_NAME/ once GitHub Pages has rebuilt (about a minute).
MSG
