#!/bin/bash
npm --prefix "$(dirname "$0")" run exec -- "$@"
