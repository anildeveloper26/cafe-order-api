#!/usr/bin/env bash
# One command to run the full end-to-end suite (API + browser UI).
#   ./run-e2e.sh                       # everything
#   ./run-e2e.sh --project=api
#   ./run-e2e.sh --project=ui --headed
# Needs the frontend repo next to this one (cloned automatically if missing) or WEB_DIR=/path/to/cafe-order-web.
# Tests run against an in-memory MongoDB — your Atlas / local data is never touched.
set -euo pipefail
cd "$(dirname "$0")"

export WEB_DIR="${WEB_DIR:-$(cd .. && pwd)/cafe-order-web}"
if [ ! -d "$WEB_DIR" ]; then
  echo "→ Cloning frontend into $WEB_DIR"
  git clone --depth 1 https://github.com/anildeveloper26/cafe-order-web.git "$WEB_DIR"
fi

for dir in . "$WEB_DIR" e2e; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "→ Installing dependencies in $dir"
    (cd "$dir" && npm ci --no-audit --no-fund)
  fi
done

echo "→ Ensuring Playwright Chromium is installed"
(cd e2e && npx playwright install chromium >/dev/null)

# Reuse a locally installed mongod if present (skips the ~100MB download on first run).
if [ -z "${MONGOMS_SYSTEM_BINARY:-}" ] && command -v mongod >/dev/null 2>&1; then
  export MONGOMS_SYSTEM_BINARY="$(command -v mongod)"
fi

echo "→ Running end-to-end tests"
set +e
(cd e2e && npx playwright test "$@")
status=$?
set -e

echo
echo "HTML report: e2e/playwright-report/index.html  (open with: cd e2e && npm run report)"
exit $status
