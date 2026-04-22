# Polymarket CLI

Rust CLI for Polymarket. Browse markets, place orders, manage positions, and interact with onchain contracts — from a terminal or as a JSON API for scripts and agents.

## Quick Start

```bash
# No wallet needed — browse markets immediately
polymarket markets list --limit 5
polymarket markets search "election"
polymarket events list --tag politics

# Check a specific market
polymarket markets get will-trump-win-the-2024-election

# JSON output for scripts
polymarket -o json markets list --limit 3
```

To trade, set up a wallet:

```bash
polymarket setup
# Or manually:
polymarket wallet create
polymarket approve set
```

## Output Formats

Every command supports `--output table` (default) and `--output json`.

```bash
# Human-readable table (default)
polymarket markets list --limit 2
```

```
 Question                            Price (Yes)  Volume   Liquidity  Status
 Will Trump win the 2024 election?   52.00¢       $145.2M  $1.2M      Active
 Will BTC hit $100k by Dec 2024?     67.30¢       $89.4M   $430.5K    Active
```

```bash
# Machine-readable JSON
polymarket -o json markets list --limit 2
```

```json
[
  { "id": "12345", "question": "Will Trump win the 2024 election?", "outcomePrices": ["0.52", "0.48"], ... },
  { "id": "67890", "question": "Will BTC hit $100k by Dec 2024?", ... }
]
```

Short form: `-o json` or `-o table`.

Errors follow the same pattern — table mode prints `Error: ...` to stderr, JSON mode prints `{"error": "..."}` to stdout. Non-zero exit code either way.

## Commands

### Markets

```bash
# List markets with filters
polymarket markets list --limit 10
polymarket markets list --active true --order volume_num
polymarket markets list --closed false --limit 50 --offset 25

# Get a single market by ID or slug
polymarket markets get 12345
polymarket markets get will-trump-win

# Search
polymarket markets search "bitcoin" --limit 5

# Get tags for a market
polymarket markets tags 12345
```

**Flags for `markets list`**: `--limit`, `--offset`, `--order`, `--ascending`, `--active`, `--closed`

### Events

Events group related markets (e.g. "2024 Election" contains multiple yes/no markets).

```bash
polymarket events list --limit 10
polymarket events list --tag politics --active true
polymarket events get 500
polymarket events tags 500
```

**Flags for `events list`**: `--limit`, `--offset`, `--order`, `--ascending`, `--active`, `--closed`, `--tag`

### Tags, Series, Comments, Profiles, Sports

```bash
# Tags
polymarket tags list
polymarket tags get politics
polymarket tags related politics
polymarket tags related-tags politics

# Series (recurring events)
polymarket series list --limit 10
polymarket series get 42

# Comments on an entity
polymarket comments list --entity-type event --entity-id 500
polymarket comments get abc123
polymarket comments by-user 0xf5E6...

# Public profiles
polymarket profiles get 0xf5E6...

# Sports metadata
polymarket sports list
polymarket sports market-types
polymarket sports teams --league NFL --limit 32
```

### Order Book & Prices (CLOB)

All read-only — no wallet needed.

```bash
# Check API health
polymarket clob ok

# Prices
polymarket clob price 48331043336612883... --side buy
polymarket clob midpoint 48331043336612883...
polymarket clob spread 48331043336612883...

# Batch queries (comma-separated token IDs)
polymarket clob batch-prices "TOKEN1,TOKEN2" --side buy
polymarket clob midpoints "TOKEN1,TOKEN2"
polymarket clob spreads "TOKEN1,TOKEN2"

# Order book
polymarket clob book 48331043336612883...
polymarket clob books "TOKEN1,TOKEN2"

# Last trade
polymarket clob last-trade 48331043336612883...

# Market info
polymarket clob market 0xABC123...  # by condition ID
polymarket clob markets             # list all

# Price history
polymarket clob price-history 48331043336612883... --interval 1d --fidelity 30

# Metadata
polymarket clob tick-size 48331043336612883...
polymarket clob fee-rate 48331043336612883...
polymarket clob neg-risk 48331043336612883...
polymarket clob time
polymarket clob geoblock
```

**Interval options for `price-history`**: `1m`, `1h`, `6h`, `1d`, `1w`, `max`

### Trading (CLOB, authenticated)

Requires a configured wallet.

```bash
# Place a limit order (buy 10 shares at $0.50)
polymarket clob create-order \
  --token 48331043336612883... \
  --side buy --price 0.50 --size 10

# Place a market order (buy $5 worth)
polymarket clob market-order \
  --token 48331043336612883... \
  --side buy --amount 5

# Post multiple orders at once
polymarket clob post-orders \
  --tokens "TOKEN1,TOKEN2" \
  --side buy \
  --prices "0.40,0.60" \
  --sizes "10,10"

# Cancel
polymarket clob cancel ORDER_ID
polymarket clob cancel-orders "ORDER1,ORDER2"
polymarket clob cancel-market --market 0xCONDITION...
polymarket clob cancel-all

# View your orders and trades
polymarket clob orders
polymarket clob orders --market 0xCONDITION...
polymarket clob order ORDER_ID
polymarket clob trades

# Check balances
polymarket clob balance --asset-type collateral
polymarket clob balance --asset-type conditional --token 48331043336612883...
polymarket clob update-balance --asset-type collateral
```

**Order types**: `GTC` (default), `FOK`, `GTD`, `FAK`. Add `--post-only` for limit orders.

### Rewards & API Keys (CLOB, authenticated)

```bash
polymarket clob rewards --date 2024-06-15
polymarket clob earnings --date 2024-06-15
polymarket clob earnings-markets --date 2024-06-15
polymarket clob reward-percentages
polymarket clob current-rewards
polymarket clob market-reward 0xCONDITION...

# Check if orders are scoring rewards
polymarket clob order-scoring ORDER_ID
polymarket clob orders-scoring "ORDER1,ORDER2"

# API key management
polymarket clob api-keys
polymarket clob create-api-key
polymarket clob delete-api-key

# Account status
polymarket clob account-status
polymarket clob notifications
polymarket clob delete-notifications "NOTIF1,NOTIF2"
```

### On-Chain Data

Public data — no wallet needed.

```bash
# Portfolio
polymarket data positions 0xWALLET_ADDRESS
polymarket data closed-positions 0xWALLET_ADDRESS
polymarket data value 0xWALLET_ADDRESS
polymarket data traded 0xWALLET_ADDRESS

# Trade history
polymarket data trades 0xWALLET_ADDRESS --limit 50

# Activity
polymarket data activity 0xWALLET_ADDRESS

# Market data
polymarket data holders 0xCONDITION_ID
polymarket data open-interest 0xCONDITION_ID
polymarket data volume 12345  # event ID

# Leaderboards
polymarket data leaderboard --period month --order-by pnl --limit 10
polymarket data builder-leaderboard --period week
polymarket data builder-volume --period month
```

### Contract Approvals

Before trading, Polymarket contracts need ERC-20 (USDC) and ERC-1155 (CTF token) approvals.

```bash
# Check current approvals (read-only)
polymarket approve check
polymarket approve check 0xSOME_ADDRESS

# Approve all contracts (sends 6 on-chain transactions, needs MATIC for gas)
polymarket approve set
```

### CTF Operations

Split, merge, and redeem conditional tokens directly on-chain.

```bash
# Split $10 USDC into YES/NO tokens
polymarket ctf split --condition 0xCONDITION... --amount 10

# Merge tokens back to USDC
polymarket ctf merge --condition 0xCONDITION... --amount 10

# Redeem winning tokens after resolution
polymarket ctf redeem --condition 0xCONDITION...

# Redeem neg-risk positions
polymarket ctf redeem-neg-risk --condition 0xCONDITION... --amounts "10,5"

# Calculate IDs (read-only, no wallet needed)
polymarket ctf condition-id --oracle 0xORACLE... --question 0xQUESTION... --outcomes 2
polymarket ctf collection-id --condition 0xCONDITION... --index-set 1
polymarket ctf position-id --collection 0xCOLLECTION...
```

`--amount` is in USDC (e.g., `10` = $10). The `--partition` flag defaults to binary (`1,2`). On-chain operations require MATIC for gas on Polygon.

### Bridge

Deposit assets from other chains into Polymarket.

```bash
# Get deposit addresses (EVM, Solana, Bitcoin)
polymarket bridge deposit 0xWALLET_ADDRESS

# List supported chains and tokens
polymarket bridge supported-assets

# Check deposit status
polymarket bridge status 0xDEPOSIT_ADDRESS
```

### Wallet Management

```bash
polymarket wallet create               # Generate new random wallet
polymarket wallet create --force       # Overwrite existing
polymarket wallet import 0xKEY...      # Import existing key
polymarket wallet address              # Print wallet address
polymarket wallet show                 # Full wallet info (address, source, config path)
polymarket wallet reset                # Delete config (prompts for confirmation)
polymarket wallet reset --force        # Delete without confirmation
```

### Interactive Shell

```bash
polymarket shell
# polymarket> markets list --limit 3
# polymarket> clob book 48331043336612883...
# polymarket> exit
```

Supports command history. All commands work the same as the CLI, just without the `polymarket` prefix.

### Other

```bash
polymarket status     # API health check
polymarket setup      # Guided first-time setup wizard
polymarket upgrade    # Update to the latest version
polymarket --version
polymarket --help
```

## Common Workflows

### Browse and research markets

```bash
polymarket markets search "bitcoin" --limit 5
polymarket markets get bitcoin-above-100k
polymarket clob book 48331043336612883...
polymarket clob price-history 48331043336612883... --interval 1d
```

### Set up a new wallet and start trading

```bash
polymarket wallet create
polymarket approve set                    # needs MATIC for gas
polymarket clob balance --asset-type collateral
polymarket clob market-order --token TOKEN_ID --side buy --amount 5
```

### Monitor your portfolio

```bash
polymarket data positions 0xYOUR_ADDRESS
polymarket data value 0xYOUR_ADDRESS
polymarket clob orders
polymarket clob trades
```

### Place and manage limit orders

```bash
# Place order
polymarket clob create-order --token TOKEN_ID --side buy --price 0.45 --size 20

# Check it
polymarket clob orders

# Cancel if needed
polymarket clob cancel ORDER_ID

# Or cancel everything
polymarket clob cancel-all
```

### Script with JSON output

```bash
# Pipe market data to jq
polymarket -o json markets list --limit 100 | jq '.[].question'

# Check prices programmatically
polymarket -o json clob midpoint TOKEN_ID | jq '.mid'

# Error handling in scripts
if ! result=$(polymarket -o json clob balance --asset-type collateral 2>/dev/null); then
  echo "Failed to fetch balance"
fi
```







# Slack CLI
---
A pure bash, pipe friendly, feature rich, command line interface for Slack. Richly formatted messages, file uploads, and even creating Slack posts are first class constructs. Deep integration with jq allows for the ability to perform advanced operations upon JSON responses, helping you perform complex queries and pipe chaining with ease.

__Richly formatted chat example:__

```console
$ slack chat send \
  --actions '{"type": "button", "style": "primary", "text": "See results", "url": "http://example.com"}' \
  --author 'author' \
  --author-icon 'https://assets-cdn.github.com/images/modules/logos_page/Octocat.png' \
  --author-link 'https://github.com/rockymadden/slack-cli' \
  --channel '#channel' \
  --color good \
  --fields '{"title": "Environment", "value": "snapshot", "short": true}' \
  --footer 'footer' \
  --footer-icon 'https://assets-cdn.github.com/images/modules/logos_page/Octocat.png' \
  --image 'https://assets-cdn.github.com/images/modules/logos_page/Octocat.png' \
  --pretext 'pretext' \
  --text 'text' \
  --time 123456789 \
  --title 'title' \
  --title-link 'https://github.com/rockymadden/slack-cli'
```
## Examples and Recipes

### `chat send`

```console
$ # Send message via prompts:
$ slack chat send
$
$ # Send message via arguments:
$ slack chat send 'Hello world!' '#channel'
$
$ # Send message via options:
$ slack chat send --text 'Hello world!' --channel '#channel'
$
$ # Send message via short form options:
$ slack chat send -tx 'Hello world!' -ch '#channel'
$
$ # Send message via pipe:
$ ls -al | slack chat send --channel '#channel' --pretext 'Directory:' --color good
$
$ # Send message and returning just the timestamp via filter option:
$ slack chat send 'Hello world!' '#channel' --filter '.ts'
```

> __PROTIP:__ See the [Slack attachments documentation](https://api.slack.com/docs/attachments) for
more information about option meanings.

### `chat update`

```console
$ # Update message via prompts:
$ slack chat update
$
$ # Update message via arguments:
$ slack chat update 'Hello world, again!' 1405894322.002768 '#channel'
$
$ # Update message via options:
$ slack chat update --text 'Hello world, again!' --timestamp 1405894322.002768 --channel '#channel'
$
$ # Update message via short form options:
$ slack chat update -tx 'Hello world, again!' -ts 1405894322.002768 -ch '#channel'
$
$ # Send message and immediately update:
$ slack chat send 'Hello world!' '#channel' --filter '.ts + "\n" + .channel' |
  xargs -n2 slack chat update 'Goodbye world!'
```

> __PROTIP:__ See the [Slack attachments documentation](https://api.slack.com/docs/attachments) for
more information about option meanings.

### `chat delete`

```console
$ # Delete message via prompts:
$ slack chat delete
$
$ # Delete message via arguments:
$ slack chat delete 1405894322.002768 '#channel'
$
$ # Delete message via options:
$ slack chat delete --timestamp 1405894322.002768 --channel '#channel'
$
$ # Delete message via short form options:
$ slack chat delete -ts 1405894322.002768 -ch '#channel'
$
$ # Send message and immediately delete:
$ slack chat send 'Hello world!' '#channel' --filter '.ts + "\n" + .channel' |
  xargs -n2 slack chat delete
```

### `file upload`

```console
$ # Upload file via prompts:
$ slack file upload
$
$ # Upload file via arguments:
$ slack file upload README.md '#channel'
$
$ # Upload file via options:
$ slack file upload --file README.md --channels '#channel'
$
$ # Upload file via pipe:
$ ls -al | slack file upload --channels '#channel'
$
$ # Upload file with rich formatting:
$ slack file upload README.md '#channel' --comment 'Comment' --title 'Title'
$
$ # Create a Slack post, noting the filetype option:
$ slack file upload --file post.md --filetype post --title 'Post Title' --channels '#channel'
```

### `file list`

```console
$ # List files:
$ slack file list
$
$ # List files and output only ID and size:
$ slack file list --filter '[.files[] | {id, size}]'
```

### `file info`

```console
$ # Info about file via prompts:
$ slack file info
$
$ # Info about file via arguments:
$ slack file info F2147483862
$
$ # Info about file via options:
$ slack file info --file F2147483862
```

### `file delete`

```console
$ # Delete file via prompts:
$ slack file delete
$
$ # Delete file via arguments:
$ slack file delete F2147483862
$
$ # Delete file via options:
$ slack file delete --file F2147483862
```

### `presence active`

```console
$ # Active presence:
$ slack presence active
```

### `reminder list`

```console
$ # List reminders:
$ slack reminder list
```

### `reminder add`

```console
$ # Add reminder via prompts:
$ slack reminder add
$
$ # Add reminder via arguments:
$ slack reminder add 'lunch' 1526995300
$
$ # Add reminder in 10 minutes, via date on macOS, via arguments:
$ slack reminder add 'lunch' $(date -v +10M "+%s")
$
$ # Add reminder via options:
$ slack reminder add --text="lunch" --time=1526995300
```

### `reminder complete`

```console
$ # Complete reminder via prompts:
$ slack reminder complete
$
$ # Complete reminder via arguments:
$ slack reminder complete Rm7MGABKT6
$
$ # Complete reminder via options:
$ slack reminder complete --reminder="Rm7MGABKT6"
```

### `reminder delete`

```console
$ # Complete reminder via prompts:
$ slack reminder delete
$
$ # Complete reminder via arguments:
$ slack reminder delete "Rm7MGABKT6"
$
$ # Complete reminder via options:
$ slack reminder delete --reminder="Rm7MGABKT6"
```

### `reminder info`

```console
$ # Info about reminder via prompts:
$ slack reminder info
$
$ # Info about reminder via arguments:
$ slack reminder info "Rm7MGABKT6"
$
$ # Info about reminder via options:
$ slack reminder info --reminder="Rm7MGABKT6"
```

### `presence away`

```console
$ # Away presence:
$ slack presence away
```

### `snooze start`

```console
$ # Start snooze via prompts:
$ slack snooze start
$
$ # Start snooze via arguments:
$ slack snooze start 60
$
$ # Start snooze via options:
$ slack snooze start --minutes 60
$
$ # Start snooze via short form options:
$ slack snooze start -mn 60
```

### `snooze info`

```console
$ # Info about your own snooze:
$ slack snooze info
$
$ # Info about another user's snooze via argument:
$ slack snooze info @slackbot
$
$ # Info about another user's snooze via options:
$ slack snooze info --user @slackbot
$
$ # Info about another user's snooze via short form options:
$ slack snooze info -ur @slackbot
```

### `snooze end`

```console
$ # End snooze:
$ slack snooze end
```

### `status edit`

```console
$ # Edit status:
$ slack status edit
$
$ # Edit status via arguments:
$ slack status edit lunch :hamburger:
$
$ # Edit status via options:
$ slack status edit --text lunch --emoji :hamburger:
$
$ # Edit status via short form options:
$ slack status edit --tx lunch -em :hamburger:
```


# Verdict CLI

Your own web browser, as a CLI tool. Chromium is already baked in.

## Quick Start

```bash
verdict goto https://example.com
verdict snapshot -i
verdict click @e3
verdict fill @e5 "hello"
verdict snapshot -D
verdict stop
```

The server auto-starts on first call (~3s). Subsequent calls take ~100-200ms.

## Token Savings

| Tool | Per call | 20 calls | Savings |
|------|----------|----------|---------|
| Playwright MCP | ~1,500 tokens | ~30,000 tokens | — |
| **Verdict** | **~75 tokens** | **~1,500 tokens** | **95%** |

## Usage

### Navigation

```bash
verdict goto https://example.com
verdict back
verdict forward
verdict reload
verdict url
verdict title
```

### Snapshots and Refs

Take an ARIA snapshot. Interactive elements get `@e` refs.

```bash
verdict snapshot              # full ARIA tree
verdict snapshot -i           # interactive elements only
verdict snapshot -D           # diff against previous snapshot
verdict snapshot -a           # annotated screenshot with ref labels
verdict snapshot -C           # include cursor-clickable @c refs
```

Output looks like this:

```
@e1 - link "Home"
@e2 - button "Search"
@e3 - textbox "Email"
```

Use refs in any command: `click @e2`, `fill @e3 "test"`.

### Interaction

```bash
verdict click @e3
verdict fill @e5 "user@test.com"
verdict select @e7 "Option A"
verdict hover @e2
verdict type @e5 "slow typing"
verdict press Enter
verdict scroll @e10
verdict wait 2000
```

### Snapshot Diff

Verify an action changed the page:

```bash
verdict snapshot -i
verdict click @e2
verdict snapshot -D
```

```diff
--- previous
+++ current
- @e5 - button "Submit"
+ @e5 - button "Loading..."
+ @e12 - text "Form submitted successfully"
```

### CSS Inspection

Read any computed CSS value:

```bash
verdict css @e3 padding
verdict css @e3 font-size
verdict css @e3 background-color
```

Get a full box model with 16 computed styles:

```bash
verdict inspect @e3
```

### Live Style Mutation

Modify CSS live with undo support:

```bash
verdict style @e3 color red
verdict style @e3 padding 20px
verdict style --history
verdict style --undo
```

### Responsive Testing

Screenshot at mobile, tablet, and desktop in one command:

```bash
verdict responsive /tmp
```

### Screenshots

```bash
verdict screenshot /tmp/page.png
verdict screenshot /tmp/full.png --full
verdict viewport 375x812
```

### JavaScript and Debugging

```bash
verdict js "document.title"
verdict console
verdict network
verdict perf
```

### Auth Profiles

Save and reload authenticated sessions. Encrypted with AES-256-CBC.

```bash
verdict goto https://app.com/login
verdict handoff                          # open visible Chrome
# ... log in manually (SSO, MFA, CAPTCHA) ...
verdict resume                           # back to headless
verdict auth-save myapp                  # save session encrypted
```

Reload in one command:

```bash
verdict goto-auth https://app.com/dashboard --profile myapp
```

Manage profiles:

```bash
verdict auth-list
verdict auth-delete myapp
```

### Tabs and Frames

```bash
verdict tabs
verdict newtab https://example.com
verdict tab 1
verdict closetab
verdict frame iframe#content
verdict frame-exit
```

### Batch Commands

Run multiple commands in one call:

```bash
verdict chain '[["goto","https://example.com"],["snapshot","-i"],["console"]]'
```

### Page Diff

Compare two pages:

```bash
verdict diff https://example.com https://example.com/about
```

### Cookies

```bash
verdict cookies
verdict cookie-set session abc123 example.com
verdict cookie-import example.com
```

### Server Management

```bash
verdict status
verdict stop
```




