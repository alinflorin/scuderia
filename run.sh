#!/bin/bash
trap 'exit 0' SIGINT SIGTERM

mkdir -p /app/persist || true

for var in CLAUDE_CODE_OAUTH_TOKEN POLYMARKET_PRIVATE_KEY; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

PROMPT="hi bro"

if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
  slack chat send --text "Trading run starting... $(date -u +%Y-%m-%dT%H:%M:%SZ)" --channel "#${SLACK_CHANNEL}"
  echo "=== PROMPT ==="
  echo "$PROMPT"
  echo "==============="

  CLAUDE_OUTPUT=$(claude \
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
  echo $CLAUDE_OUTPUT
  slack chat send --text "Claude command failed (exit $CLAUDE_EXIT): $CLAUDE_OUTPUT" --channel "#${SLACK_CHANNEL}"
  exit 0
fi
