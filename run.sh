#!/bin/bash
trap 'exit 0' SIGINT SIGTERM

slack_upload_file() {
  local log_file="$1"
  local run_date="$2"
  local timestamp=$(date +%s)
  
  # Resolve channel ID from name (required for new file upload API)
  local channel_id=$(curl -s -X POST https://slack.com/api/conversations.list \
    -H "Authorization: Bearer ${SLACK_CLI_TOKEN}" \
    -d "types=public_channel,private_channel" | \
    jq -r ".channels[] | select(.name == \"${SLACK_CHANNEL#\#}\") | .id")

  if [ -n "$channel_id" ] && [ "$channel_id" != "null" ]; then
    local file_size=$(stat -c%s "$log_file" 2>/dev/null || stat -f%z "$log_file" 2>/dev/null)
    
    # 1. Get upload URL
    local upload_res=$(curl -s -X POST https://slack.com/api/files.getUploadURLExternal \
      -H "Authorization: Bearer ${SLACK_CLI_TOKEN}" \
      -d "filename=$(basename "$log_file")" \
      -d "length=$file_size")
    
    local upload_url=$(echo "$upload_res" | jq -r .upload_url)
    local file_id=$(echo "$upload_res" | jq -r .file_id)

    if [ -n "$upload_url" ] && [ "$upload_url" != "null" ]; then
      # 2. Upload file content
      curl -s -F "file=@$log_file" "$upload_url" > /dev/null

      # 3. Complete upload and share to channel
      curl -s -X POST https://slack.com/api/files.completeUploadExternal \
        -H "Authorization: Bearer ${SLACK_CLI_TOKEN}" \
        -d "files=[{\"id\":\"$file_id\"}]" \
        -d "channel_id=$channel_id" \
        -d "initial_comment=Claude session logs - $run_date" > /dev/null
    fi
  fi
}

mkdir -p /app/persist || true

for var in CLAUDE_CODE_OAUTH_TOKEN POLYMARKET_PRIVATE_KEY; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

RUN_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

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

## Your long-term memory (limit 14 days):

\`\`\`
$(./mem.sh all 2>&1)
\`\`\`

---

Current command is the following!
Trade as per the playbook defined above. IMPORTANT: The budget cap (percentage of total balance) for this run is: ${BUDGETCAPPERCENT} percent. POTENTIAL sell threshold: ${LOSSTHRESHOLDPERCENT} percent. Current datetime (UTC): $RUN_DATE. Your Polymarket Proxy Wallet address is: $(polymarket wallet show -o json | jq -r '.proxy_address'). The Slack channel name is #${SLACK_CHANNEL}. Custom instructions: ${CUSTOM_INSTRUCTIONS}"


if [ "${DEBUG}" = "1" ]; then
  echo DEBUGSLEEPING
  sleep infinity
else
  slack chat send --text "Trading run starting... $RUN_DATE" --channel "#${SLACK_CHANNEL}" || true
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

  echo "$CLAUDE_OUTPUT"

  LOG_FILE="/app/persist/claude_${RUN_DATE}.log"
  echo "$CLAUDE_OUTPUT" > "$LOG_FILE"
  
  slack_upload_file "$LOG_FILE" "$RUN_DATE" || true
  exit 0
fi
