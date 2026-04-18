#!/bin/bash

SETTINGS_FILE="/root/.gemini/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
  mkdir -p /root/.gemini
  cp /app/gemini_settings.json "$SETTINGS_FILE"
fi

TRUSTED_FILE="/root/.gemini/trustedFolders.json"
if [ ! -f "$TRUSTED_FILE" ]; then
  cp /app/gemini_trusted_folders.json "$TRUSTED_FILE"
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

gemini -y -p "bla bla"
exit 0
