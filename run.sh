#!/bin/bash

mkdir -p /root/.claude
mkdir -p /app/persist

if [ ! -f "/root/.gemini/trustedFolders.json" ]; then
  cat > /root/.gemini/trustedFolders.json << 'EOF'

EOF
fi

if [ ! -f "/app/persist/NOTES.md" ]; then
  cat > /app/persist/NOTES.md << 'EOF'

EOF
fi

CREDS_FILE="/root/.gemini/oauth_creds.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "Credentials not found. SSH into this container and run 'claude' to authenticate."
  while [ ! -f "$CREDS_FILE" ]; do
    sleep 5
  done
  echo "Credentials detected. Exiting."
  exit 0
fi

if [ "${DEBUG}" = "1" ]; then
  echo DEBUG
  sleep infinity
else
  timeout "${TIMEOUT:-600}s" gemini -y -o stream-json -p "$(cat ./RUNBOOK.md)

Trade as per the playbook defined above. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address')"
fi
exit 0
