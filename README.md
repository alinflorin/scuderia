# scuderia

## MetaMask Setup

### 1. Install MetaMask

Download the browser extension from [metamask.io](https://metamask.io). On first launch, choose **Create a new wallet** and save your 12-word seed phrase somewhere safe.

If you already have a wallet, choose **Import wallet** and enter your seed phrase or private key instead.

### 2. Buy POL (for gas)

POL is the native gas token on Polygon. You need a small amount to pay for any transaction.

1. In MetaMask, make sure you're on the **Polygon** network
2. Click **Buy** → select a provider (e.g. MoonPay, Transak)
3. Purchase a small amount — **1–2 POL** is enough for many transactions

### 3. Buy USDC on Polygon (for trading)

USDC is the currency used on Polymarket. Make sure you get **USDC on Polygon**, not on Ethereum.

1. In MetaMask on the **Polygon** network, click **Buy**
2. Search for **USDC** and confirm the network is Polygon before completing the purchase
3. Alternatively, if you already have USDC on Ethereum, bridge it to Polygon via [app.polygon.technology](https://app.polygon.technology)

> If you buy USDC on the wrong network it won't show up in Polymarket. Always double-check the network before purchasing.

---

## Polymarket Setup

### 0. Romania restrictions
In order to bypass and visit the website in your browser, set your DNS servers on your machine or router to 8.8.8.8, 8.8.4.4.  
Or, use a Swedish VPN.  
For API access, Romania still works (this is what scuderia uses).  
   
### 1. Create an account

Go to [polymarket.com](https://polymarket.com) and sign up with your email (no social, no MetaMask login. Only email.). Polymarket will create a **proxy wallet** for you — this is the wallet that actually holds your funds and places bets on-chain.  
Enable automatic redeems in Settings! (important)  

### 2. Get your private key

Your `POLYMARKET_PRIVATE_KEY` is the private key of your Polymarket proxy wallet, not your MetaMask wallet.

To find it:

1. Log in to Polymarket
2. Click your profile → **Settings** → **Export Private Key**
3. Copy the `0x...` key and use it as `POLYMARKET_PRIVATE_KEY`

> **Keep this key secret.** Anyone with it can move your funds.

### 3. Fund with USDC (for trading)

Polymarket runs on Polygon and only accepts USDC. Funds go into your proxy wallet.

1. On Polymarket, click **Deposit** → select **Polygon** as the network
2. Copy the deposit address shown (this is your deposit address, only for USDC)
3. In MetaMask on the **Polygon** network, send USDC to that address

If you only have USDC on Ethereum, bridge it first via [app.polygon.technology](https://app.polygon.technology). Sending USDC on the wrong network will result in lost funds.

### 4. Fund with POL (for gas)

Transactions on Polygon require **POL** (formerly MATIC) for gas fees. This goes to your proxy wallet >>>EOA<<< address (you can find it in https://polymarket.com/settings?tab=api-keys - Signer Address field).

1. Switch MetaMask to the **Polygon** network
2. Send a small amount of POL (e.g. 1–2 POL is plenty) to your proxy wallet address (see first time setup on how to find out the address)

> Without POL, transactions will fail even if you have USDC.

---

## Slack Setup

### 1. Create a Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**
2. Choose **From scratch**, give it a name, and select your workspace

### 2. Grant bot permissions

1. In the left sidebar, go to **OAuth & Permissions**
2. Under **Scopes → Bot Token Scopes**, add the following:

| Scope | Purpose |
|---|---|
| `chat:write` | Send messages to channels |
| `chat:write.public` | Send messages to public channels without joining |

### 3. Install the app to your workspace

1. Scroll up on the **OAuth & Permissions** page and click **Install to Workspace**
2. Approve the permissions prompt
3. Copy the **Bot User OAuth Token** — it starts with `xoxb-`
4. Use it as `SLACK_CLI_TOKEN`
5. Create a public channel called trading 

### 4. Invite the bot to channels (if needed)

If you want the bot to post to a specific private channel, invite it first:

```
/invite @your-app-name
```

Public channels work without an invite if you added the `chat:write.public` scope.

---

## Claude Code Oauth Token

1. Open Claude Code in terminal, somewhere you are already logged in: `claude setup-token`
2. Log in in the browser
3. Token will be displayed in the terminal. Store it, to be used for the env var CLAUDE_CODE_OAUTH_TOKEN. It is valid for 1 year.

---

## Environment Variables

**Required:**

| Variable | Example |
|---|---|
| `POLYMARKET_PRIVATE_KEY` | `0x...` |
| `CLAUDE_CODE_OAUTH_TOKEN` | `sk-ant-...` |

**Optional (with defaults):**

| Variable | Default | Options |
|---|---|---|
| `SLACK_CLI_TOKEN` | - | |
| `SLACK_CHANNEL` | `trading` | |
| `DEBUG` | `0` | `1` |
| `NOAA_CDO_API_KEY` | - | |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | |
| `CLAUDE_EFFORT` | `medium` | |
| `REDDIT_CLIENT_ID` | — | |
| `REDDIT_CLIENT_SECRET` | — | |
| `BUDGETCAPPERCENT` | 20 | |

---

## Running

```sh
docker pull ghcr.io/alinflorin/scuderia:latest && docker run --rm \
  --name scuderia \
  -e POLYMARKET_PRIVATE_KEY=0x... \
  -e SLACK_CLI_TOKEN=xoxb-... \
  -e CLAUDE_CODE_OAUTH_TOKEN=... \
  -e OTHER_ENV_VARS=values \
  ghcr.io/alinflorin/scuderia:latest
```

> **Important:** When running on a schedule, ensure only one instance is active at a time. Starting a second container while one is already running will cause conflicting trades and unpredictable behavior. Use `docker ps` to check before starting, or use `--name scuderia` (as shown above) so Docker prevents duplicate containers automatically.  
Do not schedule these more often than every 15 minutes!  


## Scheduling with cron (Debian/Ubuntu VPS)

Open the crontab editor:

```sh
crontab -e
```

Add a line to run the container on your desired schedule. The example below runs every hour. The `--rm` flag ensures the container is removed after it exits, so a new one can start next time. The `--name scuderia` flag prevents Docker from starting a duplicate if the previous run is still active (Docker will refuse to start and the cron job will simply exit).

```
* */1 * * * docker pull ghcr.io/alinflorin/scuderia:latest && docker run --rm \
  --name scuderia \
  -e POLYMARKET_PRIVATE_KEY=0x... \
  -e SLACK_CLI_TOKEN=xoxb-... \
  -e CLAUDE_CODE_OAUTH_TOKEN=... \
  -e OTHER_ENV_VARS=values \
  ghcr.io/alinflorin/scuderia:latest
```