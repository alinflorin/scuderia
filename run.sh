#!/bin/bash

mkdir -p /root/.claude
mkdir -p /app/persist

if [ ! -f "/app/persist/NOTES.md" ]; then
  cat > /app/persist/NOTES.md << 'EOF'

EOF
fi

if ! claude auth status 2>/dev/null | jq -e '.loggedIn' > /dev/null 2>&1; then
  echo "Not logged in. SSH into this container and run 'claude' to authenticate interactively."
  while ! claude auth status 2>/dev/null | jq -e '.loggedIn' > /dev/null 2>&1; do
    sleep 5
  done
  echo "Logged in. Exiting."
  exit 0
fi

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGMODE
  sleep infinity
else
  timeout "${TIMEOUT:-600}s" claude --allow-dangerously-skip-permissions --dangerously-skip-permissions --permission-mode bypassPermissions --no-chrome --no-session-persistence --model "${MODEL:-claude-sonnet-4-6}" --output-format stream-json -p "$(cat ./RUNBOOK.md)

Trade as per the playbook defined above. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address')"
fi
exit 0
