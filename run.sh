#!/bin/bash

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
