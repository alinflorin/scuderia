#!/bin/bash
claude_logged_in() {
  claude auth status 2>/dev/null | jq -e '.loggedIn' > /dev/null 2>&1
}

if ! claude_logged_in; then
  echo "Not logged in. Please log in."

else
  echo "Claude Code already logged in. Nothing to do."
fi