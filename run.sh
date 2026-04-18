#!/bin/bash

mkdir -p /root/.gemini

if [ ! -f "/root/.gemini/settings.json" ]; then
  cat > /root/.gemini/settings.json << 'EOF'
{
  "security": {
    "auth": {
      "selectedType": "oauth-personal"
    }
  }
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

CREDS_FILE="/root/.gemini/oauth_creds.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "Credentials not found. SSH into this container and run 'gemini' to authenticate."
  while [ ! -f "$CREDS_FILE" ]; do
    sleep 5
  done
  echo "Credentials detected. Exiting."
  exit 0
fi

sleep infinity
#gemini -y -p "Trade as per the playbook defined in GEMINI.md"
exit 0
