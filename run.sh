#!/bin/bash

mkdir -p /root/.gemini
mkdir -p /app/persist

if [ ! -f "/root/.gemini/settings.json" ]; then
  cat > /root/.gemini/settings.json << 'EOF'
{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    },
    "enablePermanentToolApproval": true,
    "folderTrust": {
      "enabled": false
    }
  },
  "general": {
    "defaultApprovalMode": "default"
  },
  "ui": {
    "inlineThinkingMode": "full",
    "showHomeDirectoryWarning": false,
    "showCompatibilityWarnings": false,
    "hideTips": true,
    "compactToolOutput": false,
    "showShortcutsHint": false,
    "footer": {
      "hideContextPercentage": false
    },
    "showMemoryUsage": true,
    "showModelInfoInChat": true,
    "errorVerbosity": "full",
    "accessibility": {
      "screenReader": false
    }
  },
  "billing": {
    "overageStrategy": "never"
  },
  "model": {
    "compressionThreshold": 0.8
  }
EOF
fi

if [ ! -f "/root/.gemini/trustedFolders.json" ]; then
  cat > /root/.gemini/trustedFolders.json << 'EOF'
{
  "/app": "TRUST_FOLDER"
}
EOF
fi

if [ ! -f "/root/.gemini/projects.json" ]; then
  cat > /root/.gemini/projects.json << 'EOF'
{
  "projects": {
    "/app": "app"
  }
}
EOF
fi

if [ ! -f "/app/persist/NOTES.md" ]; then
  cat > /app/persist/NOTES.md << 'EOF'

EOF
fi

CREDS_FILE="/root/.gemini/oauth_creds.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "Credentials not found. SSH into this container and run 'gemini' to authenticate."
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
  timeout "${TIMEOUT:-600}s" gemini -y -p "Trade as per the playbook defined in GEMINI.md. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address')"
fi
exit 0
