#!/bin/bash

for var in CLAUDE_CODE_OAUTH_TOKEN POLYMARKET_PRIVATE_KEY SLACK_CLI_TOKEN; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

PROMPT="$(cat ./RUNBOOK.md)

---

## CLI Readmes

$(cat ./CLI_READMES.md)

---

Current command is the following!
Trade as per the playbook defined above. IMPORTANT: The budget cap (percentage of total balance) for this run is: ${BUDGETCAPPERCENT} percent. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address'). The Slack channel name is #${SLACK_CHANNEL}"

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
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
    -p "$PROMPT"
fi
