#!/bin/bash

mkdir -p /app/persist || true

for var in CLAUDE_CODE_OAUTH_TOKEN POLYMARKET_PRIVATE_KEY; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

PROMPT="$(cat ./RUNBOOK.md)

---

## CLI Guide

$(cat ./CLI_GUIDE.md)

---

## ./utils.sh help menu

\`\`\`
$(./utils.sh help-all 2>&1)
\`\`\`

---

Current command is the following!
Trade as per the playbook defined above. IMPORTANT: The budget cap (percentage of total balance) for this run is: ${BUDGETCAPPERCENT} percent. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address'). The Slack channel name is #${SLACK_CHANNEL}"

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
  slack chat send --text "Trading run starting... $(date -u +%Y-%m-%dT%H:%M:%SZ)" --channel "#${SLACK_CHANNEL}"
  CLAUDE_ERROR=$(claude \
    --verbose \
    --allow-dangerously-skip-permissions \
    --dangerously-skip-permissions \
    --permission-mode bypassPermissions \
    --no-chrome \
    --no-session-persistence \
    --add-dir /root \
    --model "${CLAUDE_MODEL}" \
    --effort "${CLAUDE_EFFORT}" \
    --output-format stream-json \
    -p "$PROMPT" 2>&1)
  CLAUDE_EXIT=$?
  if [ $CLAUDE_EXIT -ne 0 ]; then
    slack chat send --text "Claude command failed (exit $CLAUDE_EXIT): $CLAUDE_ERROR" --channel "#${SLACK_CHANNEL}"
    exit $CLAUDE_EXIT
  fi
fi
