# Polymarket CLI
Rust CLI for Polymarket. Browse markets, place orders, manage positions, and interact with onchain contracts — from a terminal or as a JSON API for scripts and agents.
Example commands:
- `polymarket markets list --closed false --limit 50 --offset 25`
- `polymarket data positions 0xWALLET_ADDRESS`
- `polymarket data trades 0xWALLET_ADDRESS --limit 50`
- `polymarket clob balance --asset-type collateral`
- `polymarket profiles get 0xf5E6...`
- `polymarket clob market-order --token 48331043336612883... --side buy --amount 5`
Help menu: `polymarket --help`

# Slack CLI
CLI for sending Slack messages to channels.
Send message command: `slack chat send --text 'Text here' --channel '#channel_here'`
Help menu: `slack --help`

# Verdict CLI - browser
Your own Chromium browser as a CLI tool.
Example commands:
- `verdict goto https://example.com`
- `verdict snapshot`
- `verdict click @e3`
- `verdict press Enter`
- `verdict scroll @e10`
- `verdict select @e7 "Option A"`
- `verdict wait 2000`
- `verdict closetab`
Help menu: `verdict`

# ./utils.sh Custom utils
The custom TypeScript tools for market discovery and research. Specialized.
Example commands:
- `./utils.sh smart-analysis -l 30 -o 0`
Help menu: ./utils.sh

