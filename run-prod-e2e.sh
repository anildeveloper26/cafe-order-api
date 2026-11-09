#!/usr/bin/env bash
# End-to-end tests against the DEPLOYED app (default: live Vercel frontend + Render API).
#
#   ./run-prod-e2e.sh               # full flow: also places test orders + admin CRUD, then cleans up
#   ./run-prod-e2e.sh --read-only   # never writes to production
#   ./run-prod-e2e.sh --project=prod-ui --headed
#
# Config (env vars or e2e/.env.prod — see e2e/.env.prod.example):
#   PROD_WEB_URL, PROD_API_URL                 (default to the live URLs)
#   PROD_ADMIN_EMAIL, PROD_ADMIN_PASSWORD      (required for the full flow)
#
# Test data is marked (customer "E2E Smoke Test", phone 9000000000, menu items "[E2E] …") and is
# cancelled/deleted after every run — real customer orders are never touched.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f e2e/.env.prod ]; then
  set -a
  # shellcheck disable=SC1091
  . e2e/.env.prod
  set +a
fi

args=()
export E2E_READ_ONLY=0
for a in "$@"; do
  if [ "$a" = "--read-only" ]; then E2E_READ_ONLY=1; else args+=("$a"); fi
done

if [ "$E2E_READ_ONLY" = "0" ] && { [ -z "${PROD_ADMIN_EMAIL:-}" ] || [ -z "${PROD_ADMIN_PASSWORD:-}" ]; }; then
  echo "PROD_ADMIN_EMAIL / PROD_ADMIN_PASSWORD are not set."
  echo "Set them in your shell or e2e/.env.prod, or run: ./run-prod-e2e.sh --read-only"
  exit 2
fi

[ -d e2e/node_modules ] || (cd e2e && npm ci --no-audit --no-fund)
(cd e2e && npx playwright install chromium >/dev/null)

grep_args=()
[ "$E2E_READ_ONLY" = "1" ] && grep_args=(--grep-invert @write)

set +e
(cd e2e && npx playwright test -c playwright.prod.config.ts ${grep_args[@]+"${grep_args[@]}"} ${args[@]+"${args[@]}"})
status=$?
set -e
echo
echo "HTML report: e2e/playwright-report-prod/index.html  (open with: cd e2e && npm run report:prod)"
exit $status
