#!/bin/bash
chown -R appuser:appuser /app/persist /home/appuser || true
exec gosu appuser ./run.sh
