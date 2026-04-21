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












# playwright-cli

Playwright CLI with firefox

## Commands

### Core

```bash
playwright-cli open [url]               # open browser, optionally navigate to url
playwright-cli goto <url>               # navigate to a url
playwright-cli close                    # close the page
playwright-cli type <text>              # type text into editable element
playwright-cli click <ref> [button]     # perform click on a web page
playwright-cli dblclick <ref> [button]  # perform double click on a web page
playwright-cli fill <ref> <text>        # fill text into editable element
playwright-cli fill <ref> <text> --submit # fill and press Enter
playwright-cli drag <startRef> <endRef> # perform drag and drop between two elements
playwright-cli hover <ref>              # hover over element on page
playwright-cli select <ref> <val>       # select an option in a dropdown
playwright-cli upload <file>            # upload one or multiple files
playwright-cli check <ref>              # check a checkbox or radio button
playwright-cli uncheck <ref>            # uncheck a checkbox or radio button
playwright-cli snapshot                 # capture page snapshot to obtain element ref
playwright-cli snapshot --filename=f    # save snapshot to specific file
playwright-cli snapshot <ref>           # snapshot a specific element
playwright-cli snapshot --depth=N       # limit snapshot depth for efficiency
playwright-cli eval <func> [ref]        # evaluate javascript expression on page or element
playwright-cli dialog-accept [prompt]   # accept a dialog
playwright-cli dialog-dismiss           # dismiss a dialog
playwright-cli resize <w> <h>           # resize the browser window
```

### Navigation

```bash
playwright-cli go-back                  # go back to the previous page
playwright-cli go-forward               # go forward to the next page
playwright-cli reload                   # reload the current page
```

### Keyboard

```bash
playwright-cli press <key>              # press a key on the keyboard, `a`, `arrowleft`
playwright-cli keydown <key>            # press a key down on the keyboard
playwright-cli keyup <key>              # press a key up on the keyboard
```

### Mouse

```bash
playwright-cli mousemove <x> <y>        # move mouse to a given position
playwright-cli mousedown [button]       # press mouse down
playwright-cli mouseup [button]         # press mouse up
playwright-cli mousewheel <dx> <dy>     # scroll mouse wheel
```

### Save as

```bash
playwright-cli screenshot [ref]         # screenshot of the current page or element
playwright-cli screenshot --filename=f  # save screenshot with specific filename
playwright-cli pdf                      # save page as pdf
playwright-cli pdf --filename=page.pdf  # save pdf with specific filename
```

### Tabs

```bash
playwright-cli tab-list                 # list all tabs
playwright-cli tab-new [url]            # create a new tab
playwright-cli tab-close [index]        # close a browser tab
playwright-cli tab-select <index>       # select a browser tab
```

### Storage

```bash
playwright-cli state-save [filename]    # save storage state
playwright-cli state-load <filename>    # load storage state

# Cookies
playwright-cli cookie-list [--domain]   # list cookies
playwright-cli cookie-get <name>        # get a cookie
playwright-cli cookie-set <name> <val>  # set a cookie
playwright-cli cookie-delete <name>     # delete a cookie
playwright-cli cookie-clear             # clear all cookies

# LocalStorage
playwright-cli localstorage-list        # list localStorage entries
playwright-cli localstorage-get <key>   # get localStorage value
playwright-cli localstorage-set <k> <v> # set localStorage value
playwright-cli localstorage-delete <k>  # delete localStorage entry
playwright-cli localstorage-clear       # clear all localStorage

# SessionStorage
playwright-cli sessionstorage-list      # list sessionStorage entries
playwright-cli sessionstorage-get <k>   # get sessionStorage value
playwright-cli sessionstorage-set <k> <v> # set sessionStorage value
playwright-cli sessionstorage-delete <k>  # delete sessionStorage entry
playwright-cli sessionstorage-clear     # clear all sessionStorage
```

### Network

```bash
playwright-cli route <pattern> [opts]   # mock network requests
playwright-cli route-list               # list active routes
playwright-cli unroute [pattern]        # remove route(s)
```

### DevTools

```bash
playwright-cli console [min-level]      # list console messages
playwright-cli network                  # list all network requests since loading the page
playwright-cli run-code <code>          # run playwright code snippet
playwright-cli run-code --filename=f    # run playwright code from a file
playwright-cli tracing-start            # start trace recording
playwright-cli tracing-stop             # stop trace recording
playwright-cli video-start [filename]   # start video recording
playwright-cli video-chapter <title>    # add a chapter marker to the video
playwright-cli video-stop               # stop video recording
```

### Open parameters

```bash
playwright-cli open --browser=chrome    # use specific browser
playwright-cli attach --extension       # connect via browser extension
playwright-cli attach --cdp=chrome      # attach to running Chrome/Edge by channel
playwright-cli attach --cdp=<url>       # attach via CDP endpoint
playwright-cli open --persistent        # use persistent profile
playwright-cli open --profile=<path>    # use custom profile directory
playwright-cli open --config=file.json  # use config file
playwright-cli close                    # close the browser
playwright-cli delete-data              # delete user data for default session
```

### Snapshots

After each command, playwright-cli provides a snapshot of the current browser state.

```bash
> playwright-cli goto https://example.com
### Page
- Page URL: https://example.com/
- Page Title: Example Domain
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

You can also take a snapshot on demand using `playwright-cli snapshot` command. All the options below can be combined as needed.

```bash
# default - save to a file with timestamp-based name
playwright-cli snapshot

# save to file, use when snapshot is a part of the workflow result
playwright-cli snapshot --filename=after-click.yaml

# snapshot an element instead of the whole page
playwright-cli snapshot "#main"

# limit snapshot depth for efficiency, take a partial snapshot afterwards
playwright-cli snapshot --depth=4
playwright-cli snapshot e34
```

### Targeting elements

By default, use refs from the snapshot to interact with page elements.

```bash
# get snapshot with refs
playwright-cli snapshot

# interact using a ref
playwright-cli click e15
```

You can also use css selectors or Playwright locators.

```bash
# css selector
playwright-cli click "#main > button.submit"

# role locator
playwright-cli click "getByRole('button', { name: 'Submit' })"

# test id
playwright-cli click "getByTestId('submit-button')"
```

### Sessions

```bash
playwright-cli -s=name <cmd>            # run command in named session
playwright-cli -s=name close            # stop a named browser
playwright-cli -s=name delete-data      # delete user data for named browser
playwright-cli list                     # list all sessions
playwright-cli close-all                # close all browsers
playwright-cli kill-all                 # forcefully kill all browser processes
```











# Slack CLI
---
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


