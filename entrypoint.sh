#!/bin/bash
set -e

# Fix ownership of mounted volumes — must run as root before dropping to appuser
chown -R appuser:appuser /app/persist
chown -R appuser:appuser /home/appuser

exec gosu appuser "$@"
