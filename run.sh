#!/bin/bash

if [ "$LLM" != "claude" ] && [ "$LLM" != "gemini" ]; then
  echo "Error: LLM must be 'claude' or 'gemini' (got: '$LLM')"
  exit 1
fi

mkdir -p /home/appuser/.claude /home/appuser/.gemini /app/persist || true

touch -a /app/persist/NOTES.md || true

write_if_missing() {
  local path="$1"; shift
  [ -f "$path" ] || cat > "$path" <<< "$@"
}

if [ ! -f "/home/appuser/.gemini/settings.json" ]; then
  cat > /home/appuser/.gemini/settings.json << 'EOF'
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
}
EOF
fi

if [ ! -f "/home/appuser/.gemini/trustedFolders.json" ]; then
  cat > /home/appuser/.gemini/trustedFolders.json << 'EOF'
{
  "/app": "TRUST_FOLDER"
}
EOF
fi

if [ ! -f "/home/appuser/.gemini/projects.json" ]; then
  cat > /home/appuser/.gemini/projects.json << 'EOF'
{
  "projects": {
    "/app": "app"
  }
}
EOF
fi

claude_logged_in() {
  claude auth status 2>/dev/null | jq -e '.loggedIn' > /dev/null 2>&1
}

if [ "$LLM" = "claude" ]; then
  if ! claude_logged_in; then
    echo "Not logged in. SSH into this container and run 'exec gosu appuser claude' to authenticate interactively."
    until claude_logged_in; do sleep 5; done
    echo "Logged in. Exiting."
    exit 0
  fi
else
  GEMINI_CREDS_FILE="/home/appuser/.gemini/oauth_creds.json"
  if [ ! -f "$GEMINI_CREDS_FILE" ]; then
    echo "Credentials not found. SSH into this container and run 'exec gosu appuser gemini' to authenticate."
    until [ -f "$GEMINI_CREDS_FILE" ]; do sleep 5; done
    echo "Credentials detected. Exiting."
    exit 0
  fi
fi

PROMPT="$(cat ./RUNBOOK.md)

---

## CLI Readmes

$(cat ./CLI_READMES.md)

---

## CLI Help Menus Reference

### utils.sh
\`\`\`
$(./utils.sh help-all 2>&1)
\`\`\`

### polymarket
\`\`\`
$(polymarket --help 2>&1)
\`\`\`

### slack
\`\`\`
$(slack --help 2>&1)
\`\`\`

### playwright-cli
\`\`\`
$(playwright-cli --help 2>&1)
\`\`\`

---

## Your Previous Notes

$(cat ./persist/NOTES.md 2>/dev/null)

---

Current command is the following!
Trade as per the playbook defined above. Current datetime (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ). Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address'). The Slack channel name is #${SLACK_CHANNEL}"

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
  MODEL="${CLAUDE_MODEL:-${GEMINI_MODEL}}"
  if [ "$LLM" = "claude" ]; then
    claude \
      --verbose \
      --allow-dangerously-skip-permissions \
      --dangerously-skip-permissions \
      --permission-mode bypassPermissions \
      --no-chrome \
      --add-dir /home/appuser \
      --model "${CLAUDE_MODEL}" \
      --effort "${CLAUDE_EFFORT}" \
      --output-format stream-json \
      -p "$PROMPT"
  else
    gemini -o stream-json --include-directories /home/appuser -m "${GEMINI_MODEL}" -y -p "$PROMPT"
  fi
fi
