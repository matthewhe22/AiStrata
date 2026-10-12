#!/usr/bin/env bash
# Deploy the StrataFlow marketing site to Cloudflare Pages.
#
# IMPORTANT: run this from INSIDE website/. Wrangler resolves Pages Functions
# relative to the *working directory*, not the directory being uploaded. Running
# `wrangler pages deploy website` from the repo root silently uploads only the
# static assets and skips the functions — /api/* then 404s with no warning
# beyond the missing "Uploading Functions bundle" line.
#
# A correct deploy prints:
#   ✨ Compiled Worker successfully
#   ✨ Uploading Functions bundle
#
# Usage:  bash website/deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

TOKEN_FILE="${CLOUDFLARE_TOKEN_FILE:-$HOME/cf_token.txt}"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  CLOUDFLARE_API_TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
  export CLOUDFLARE_API_TOKEN
fi
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-2cbce9c1dba758a4a824d9a777ddc8b2}"

echo "Deploying from $(pwd) -> project strataflow"
npx wrangler pages deploy . \
  --project-name=strataflow \
  --branch=main \
  --commit-dirty=true

echo
echo "Verify the API is wired (should be JSON, not the 404 page):"
curl -s -o /dev/null -w '  /api/auth-me -> HTTP %{http_code}  %{content_type}\n' \
  https://strataflow.work/api/auth-me
