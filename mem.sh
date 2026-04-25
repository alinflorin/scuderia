#!/bin/bash

# mem.sh - A wrapper for mem0 CLI
# Uses 'agent' as the default user-id and always calls with --agent flag for structured JSON output.

AGENT_ID="claude"
MEM0_BIN="mem0"
APP_ID="scuderia"

# Function to execute mem0 with the agent flag
exec_mem0() {
    $MEM0_BIN --agent "$@"
}

function show_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all             Get all memories for the agent"
    echo "  list            List memories for the agent"
    echo "  get <id>        Get a specific memory by ID"
    echo "  delete <id>     Delete a specific memory by ID"
    echo "  update <id> <t> Update a specific memory with new text"
    echo "  search <query>  Semantic search for memories"
    echo "  add <text>      Add a new memory"
}

case "$1" in
    all|list)
        exec_mem0 list --agent-id "$AGENT_ID" --app-id "$APP_ID" --page-size 200 --page 1 
        ;;
    get)
        if [ -z "$2" ]; then
            echo '{"status": "error", "message": "Memory ID required"}'
            exit 1
        fi
        exec_mem0 get "$2"
        ;;
    delete)
        if [ -z "$2" ]; then
            echo '{"status": "error", "message": "Memory ID required"}'
            exit 1
        fi
        exec_mem0 delete "$2" --agent-id "$AGENT_ID" --app-id "$APP_ID" --force
        ;;
    update)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo '{"status": "error", "message": "Memory ID and new text required"}'
            exit 1
        fi
        exec_mem0 update "$2" "$3"
        ;;
    search)
        if [ -z "$2" ]; then
            echo '{"status": "error", "message": "Search query required"}'
            exit 1
        fi
        exec_mem0 search "$2" --agent-id "$AGENT_ID" --app-id "$APP_ID"
        ;;
    add)
        if [ -z "$2" ]; then
            echo '{"status": "error", "message": "Memory text required"}'
            exit 1
        fi
        exec_mem0 add "$2" --agent-id "$AGENT_ID" --app-id "$APP_ID" --no-infer --expires $(date -u -d "+14 days" +%Y-%m-%d)

        ;;
    *)
        show_help
        exit 1
        ;;
esac
