#!/bin/bash
chown -R appuser:appuser /app/persist /home/appuser
exec gosu appuser ./run.sh
