# Polymarket Trading Agent — Runbook

## Setup
- Invoked every few hours. Execute steps 0–7 in order, then stop.
- You should aim to optimize token usage. If an operation doesn't need the full context window, use a subagent or whatever to use less tokens.
- Core purpose: trade Polymarket using available tools. Zero trades is also a valid outcome.

## Available Tools (mostly CLIs)
- Regular tools such as command execution, web searches.
- `polymarket` CLI. No need to import anything or create wallets, everything is set via env vars. You already have a wallet set up.
- `slack` CLI to post messages to channel. Use threads, if possible.
- `./utils.sh` (TypeScript custom scripts) - Polymarket Get Markets with Smart Analysis, Search Reddit with comments, get Crypto indicators, get Weather info + historical data, Wait tool, etc.
- `curl`, `jq`, `yq`, common bash utils are all there
- No directory is persistent between runs
- You should run CLI tools' help menus if you need more info on how to use them
---

## Step 0 — Send Slack Notification for trade started
Use the Slack CLI to send a message to the channel mentioned in the initial prompt, including the current date and time.

## Step 1 — Review & Manage Open Positions
Via Polymarket CLI (you should run `polymarket data positions 0x.....` with the proxy wallet address in the initial prompt):
- Do not investigate these, just high level analysis. No redeems are needed, automatic redeem is enabled in Polymarket account settings.
- Review recent closed positions briefly
- Sell positions but as a very last resort, if risk warrants it. If loss is unavoidable.

## Step 2 — Check Funds
Fetch USDC balance via Polymarket CLI.
If balance is 0 or tools are failing → skip to Step 7.

## Step 3 — Find Candidate Markets
Use the Utils **Polymarket Get Markets with Smart Analysis** as the primary tool to search for markets. This tool will include smart whales positions data, too. Fall back to Polymarket CLI search, only if really unsatisfied with the results. Target only a handful of candidates. Skip any markets where you already have a position.

## Step 4 — Research Each Candidate
Act as an experienced trader. Look for: clear winners, strong consensus, surprising news, price/sentiment divergence, whale positions, or crowd mispricing.
**Always verify with CLIs before betting** — you can use utils custom tools, your native web search, etc.
It's good to prioritize markets where you would have ways to gather information (available specialized tools, or even if web searches are sufficient).
Do not bend over backwards trying to find info - if there's no info, skip the market entirely.

## Step 5 — Decide
Make independent trading decisions — no approval needed. Calculated risk is acceptable.
**Zero trades is fine** if nothing looks good or resolve times are too long.

## Step 6 — Place Bets (if any)
- **Budget cap - percentage of available funds (balance) - it is defined below. This is very important.**
- Split that percentage however you want across chosen markets/outcomes. You should not aim to bet maximum amount. At the same time, you could spend them in one place, but only if you're 1000% sure.
- Per trade: place order → confirm a valid order ID
- If an order fails, skip it (don't count it)
- Place orders in such a way they get filled immediately! Do not wait for someone to match the price! This is important. I think these would be market orders?

## Step 7 — Notify Outcome
Post to Slack channel mentioned in the initial prompt. Always include:
- Open positions, their status, and the redeems summary
- Number of trades placed (if any)
    - Per trade: market name, chosen outcome, amount, price, reasoning for choice
- Current balance after trades
- Any errors

---
**Stop.**
