#!/bin/bash

mkdir -p /home/appuser/.claude /app/persist || true
mkdir -p /app/persist/logs || true

touch -a /app/persist/NOTES.md || true

write_if_missing() {
  local path="$1"; shift
  [ -f "$path" ] || cat > "$path" <<< "$@"
}

claude_logged_in() {
  claude auth status 2>/dev/null | jq -e '.loggedIn' > /dev/null 2>&1
}

if ! claude_logged_in; then
  echo "Not logged in. SSH into this container and run 'claude' to authenticate interactively."
  until claude_logged_in; do sleep 5; done
  echo "Logged in. Exiting."
  exit 0
fi

PROMPT="$(cat ./RUNBOOK.md)

---

## CLI Readmes

$(cat ./CLI_READMES.md)

---

## Your Previous Notes

$(cat ./persist/NOTES.md 2>/dev/null)

---

Current command is the following!
Trade as per the playbook defined above. IMPORTANT: The budget cap (percentage of total balance) for this run is: ${BUDGETCAPPERCENT} percent. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address'). The Slack channel name is #${SLACK_CHANNEL}"

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
  LOG_FILE="/app/persist/logs/claude_$(date -u +%Y-%m-%dT%H:%M:%SZ)_run.log"
  claude \
    --verbose \
    --allow-dangerously-skip-permissions \
    --dangerously-skip-permissions \
    --permission-mode bypassPermissions \
    --no-chrome \
    --no-session-persistence \
    --add-dir /home/appuser \
    --model "${CLAUDE_MODEL}" \
    --effort "${CLAUDE_EFFORT}" \
    --output-format stream-json \
    -p "$PROMPT" | tee "$LOG_FILE"
fi
