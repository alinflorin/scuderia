# Polymarket Trading Agent — Runbook

## Setup
- Invoked every hour. Execute steps 1–10 in order, then stop.
- **No subagents**
- Core purpose: trade Polymarket using available tools. Zero trades is also a valid outcome.

## Available Tools (mostly CLIs)
- Regular tools such as command execution, web searches
- Polymarket CLI. No need to import anything, everything is set via env vars.
- Playwright CLI with Firefox installed
- Slack CLI to post messages to trading channel
- Notes file: /app/persist/NOTES.md
- ./utils.sh (TypeScript custom scripts) - Polymarket Get Markets with Smart Analysis, Search Reddit with comments, get Crypto indicators, get Weather info + historical data, Wait tool, etc.
- curl, jq, yq, bash
- Persistent working directory: /app/persist (use this one)
- Persistent user home folder: /home/appuser
- You should run CLI tools' --help menu if you are confused and need more info on how to use them
---


## Step 3 — Review & Manage Open Positions
Via Polymarket CLI (you should run `polymarket data positions 0x.....` with the proxy wallet address: `polymarket wallet show -o json | jq -r '.proxy_address'`):
- Check price/status of each open position
- Redeem any resolved markets (wins or losses)
- Review recent closed positions briefly
- Sell positions but as a very last resort, if risk warrants it. If loss is unavoidable.

## Step 4 — Check Funds
Fetch USDC balance via Polymarket CLI. **Bankroll for this run = MAXIMUM 15% of balance.**
If balance is 0 or tools are failing → skip to Step 9.

## Step 5 — Find Candidate Markets
Use the Utils **Polymarket Get Markets with Smart Analysis** as the primary tool. Fall back to Polymarket CLI search only if unsatisfied. Target only a handful of candidates. Skip any markets where you already have a position.

## Step 6 — Research Each Candidate
Act as an experienced trader. Look for: clear winners, strong consensus, surprising news, price/sentiment divergence, or crowd mispricing. **Always verify with CLIs before betting** — utils custom tools and web search mainly, secondly browser, etc. Only use default tool for web searches, not the browser (Google, DuckDuckGo). Use the browser to open found links, ONLY IF NEEDED.
Do not bend over backwards trying to find info - if there's no info, skip the market entirely.

## Step 7 — Decide
Make independent trading decisions — no approval needed. Calculated risk is acceptable. **Zero trades is fine** if nothing looks good or resolve times are too long.

## Step 8 — Place Bets (if any)
- **Cap: 15% of available funds total across all trades this run**
- Split that 15% however you want across chosen markets/outcomes. You should not aim to bet maximum amount.
- Per trade: fetch current best price → place order → confirm a valid order ID
- If an order fails, skip it (don't count it)

## Step 9 — Notify Outcome
Post to Slack #trading channel. Always include:
- Open positions & redeems summary
- Number of trades placed
- Per trade: market name, YES/NO, amount, price, reasoning
- Current balance after trades
- Any errors

## Step 10 — Manage Notes
Remove outdated notes. Add new general-purpose learnings (tips, patterns to avoid, market insights). **No specific market names** — keep notes generic and reusable across runs.

---
**Stop.** Next invocation in 1 hour.
