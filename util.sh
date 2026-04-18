#!/bin/bash
set -e

cmd="$1"
shift
npm run tsx "${cmd}.ts" -- "$@"
