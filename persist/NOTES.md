# Trading Notes

## Smart Money Signals

- **Rank quality > position size**: Top-10 ranked traders backing an underdog is a stronger signal than a large position from a rank 30+ trader. Prioritize PnL rank over raw USDC amount when evaluating whale consensus.
- **smartMoneySide "YES"/"NO" maps to outcome index 0/1**: In the smart-analysis output, "YES" = outcome index 0, "NO" = outcome index 1. Verify by cross-checking with the outcomes array and prices.
- **smartMoneySide is by count, not dollar**: 2 whales with small amounts can override 1 whale with $85k. Always check the individual holder amounts and ranks manually before deciding direction.
- **Rank #1 whale ($7M+ PnL) = strongest possible signal**: When the top-ranked trader by PnL puts $90k+ on one outcome of a near-50/50 market, it's the highest-conviction signal available. Treat as actionable even without secondary confirmation.
- **4+ top-10 whales on same side**: When 4+ of the top 10 PnL traders converge on one side, even if it's the underdog, that's a strong contrarian signal worth a small bet.
- **Whale positions under $1,000 each = low conviction**: When top-10 whales are on the same side but each holds <$1,000, treat it as noise or hedging — not a tradeable signal. Look for at least $2,000+ per whale to indicate real conviction.

## Market Selection

- **Live sports (5-8 hours out)**: Good candidates if smart money is aligned and series/game context is clear. Avoid if game is already in-progress (prices near 0.0005/0.9995).
- **Prices near extremes (0.001 or 0.999)**: Usually means market is already effectively resolved. Skip — no edge.
- **STRONG_DOWN momentum + smart money YES**: Conflicting signal — the market crowd disagrees with smart money. Proceed cautiously or skip.
- **Series markets (BO3/BO7)**: Much longer resolution times — avoid unless edge is very clear.

## Sizing

- Small bets ($3-5) are appropriate for contrarian underdog plays.
- Cap at 15% of balance total per run; don't need to use the full cap.

## Portfolio Management

- **Position title truncation in table view**: `polymarket data positions` table truncates market titles. When multiple same-team markets exist (e.g., Man City Apr 21 vs Apr 22, Atletico Apr 21 vs Apr 22), always use `polymarket data positions -o json` to get the full title, conditionId, and slug before deciding if you already have a position in a given market.
- **Cross-check slugs before researching candidates**: After getting smart-analysis results, immediately extract slugs from open positions and cross-check against candidate market slugs. Skips wasted research time on markets already in portfolio — a common trap when the same team/event appears in both.

## Order Execution

- Use `polymarket clob market-order` with `--order-type FOK` (default) for immediate execution.
- Use `polymarket clob price --side buy <TOKEN_ID>` to confirm current best ask before ordering.
- Token IDs are in `clobTokenIds` field from `polymarket events get <slug>`.
- CLI flag is `--token`, NOT `--token-id` (common mistake to avoid).
- `market-order` also requires `--side buy` — don't forget it or command will fail.
- If `polymarket markets search` returns stale/wrong results for a game slug, get tokens directly from the search JSON output's `clobTokenIds` field instead of using `events get`.
- **DELAYED status can still fill**: A `market-order` returning `Status: DELAYED` with making/taking=0 may still ultimately fill. Always check positions and balance after to confirm — do not double-order assuming it failed.
- **`polymarket clob market <conditionId>`**: Fastest way to get token IDs when conditionId is known from smart-analysis output. More reliable than markets search for live markets.

## Cross-Market Price Divergence

- **Sportsbook vs Polymarket divergence**: Cross-check Polymarket prices against sportsbook moneylines. A 5-6% gap (e.g., Polymarket at 26% vs sportsbook-implied 32%) is actionable for a small underdog bet, even when smart money consensus is on the other side.
- **Use sportsbook threads on Reddit** (r/sportsbook, r/nba) to get same-day ML lines for NBA/NHL games. These are a fast way to check if Polymarket is mispriced relative to sharp money markets.

## La Liga / European Soccer

- **Cross-market neg-risk whale analysis**: In a 3-outcome neg-risk soccer event (home win/draw/away win), always check whale positions across ALL three markets before betting on any one of them. A whale's $128k position on "Atletico YES" in market A is an implicit ~$128k bet against "Elche YES" in market B. The smartMoneyHolders in one market often cross-references with opposing positions in the adjacent markets of the same event.

- **Real Madrid at home vs weak opponent**: Reliable 0.75-0.80 YES price when both top whales agree. La Liga home games vs bottom-table sides are clean bets.
- **Relegation team vs top-4 club**: Be skeptical of YES prices above 35% for relegation-zone teams even with 2-3 whale consensus, unless there's a concrete edge (opponent rotating squad, opponent in terrible form 1W in 5, cup scheduling congestion). A 39% price for a bottom-3 team vs a top-4 opponent is likely overpriced unless elkmonkey or 4+ top-10 whales are on YES with $5k+ each.
- **DFB-Pokal / European cup semi-finals**: High-stakes knock-out format motivates big clubs to field full squads. A dominant club vs a struggling opponent in a cup semi is a cleaner -1.5 spread bet than in regular league play (no sandbagging incentive).
- **Neg-risk soccer markets** (3-outcome: home win/draw/away win): Token IDs from `polymarket markets search "<team name>" -o json` → `clobTokenIds` field. `polymarket events get <slug>` often returns 404 for soccer slugs — use markets search as fallback. Price `clob price --side buy <token>` before ordering.
- **CTF redeem failures**: Even when `redeemable: true`, the `polymarket ctf redeem` command can fail. Retry on next run — likely an on-chain timing/settlement delay.
- **MLB in-game prices**: Late-night UTC (01:00-04:00 UTC) MLB markets with STRONG_DOWN/UP momentum are often live West Coast games in progress. Check price extremes — skip if near 0.001/0.999.
- **MLB market "hoursLeft" is resolution deadline, not game time**: MLB game winner markets show ~167-168 hoursLeft even for tonight's games — Polymarket sets the resolve deadline 7 days out for MLB. Always cross-reference the URL slug (e.g., `mlb-min-nym-2026-04-21`) to confirm the actual game date. A game can be starting NOW even with 167 hours showing.
- **6+ top-10 whale consensus = bet even early in game**: When 6 top-10 whales ($100k+ combined) all back one side of an MLB moneyline, it's worth a $5 min bet even if the game just started (first inning), since early scoring rarely changes the fundamental quality edge.

## Smart Money Dollar vs. Count Divergence

- **Single whale with massive $ vs. multiple smaller whales**: When one rank-10 to rank-15 whale puts $100k+ on one side while 2-3 lower-ranked whales put $1-5k each on the other, favor the massive-dollar bet. `smartMoneySide` is count-based and can mislead in these cases.
- **elkmonkey (rank#9) pattern**: This whale frequently takes large contrarian positions ($50-110k) on underdogs or "Yes" outcomes. When elkmonkey is alone against crowd with a huge position, it's worth a small bet following them. Note: rank may vary run-to-run — identify by address `0xead152b855effa6b5b5837f53b24c0756830c76a`.

## Playoff Context

- In NHL playoffs, #1 seeds vs wild card opponents are solid favorites — 0.57-0.62 is reasonable fair value for a single game.
- Reddit NHL standings threads are useful for confirming seedings and playoff bracket context quickly.
- When smart money is conflicted (e.g., one rank-17 whale going big contrarian vs 3 top-10 whales on favorite), default to trusting the higher-ranked whales unless dollar divergence is extreme.
- **Series momentum vs. smart money**: A blowout Game 1 win doesn't guarantee Game 2 — smart money whales betting the loser of Game 1 at 0.55 is a viable contrarian play. Don't over-weight series momentum vs. per-game edge.
- **Game start times**: "Hours left" in smart analysis = time until market closes, not game start. NHL markets often close at puck drop. Check the description for the scheduled start time to confirm game hasn't started.
- **NBA playoffs: 3 top whales on same underdog**: When 2+ top-10 whales AND a rank-25+ whale all back the same playoff underdog (e.g., 14.5% priced team), it's worth a small bet ($2-3). Majority-losing seed doesn't invalidate the signal — injury news or series dynamics may not be fully priced in.
- **Spread markets via `polymarket markets get <slug>`**: For NBA spread markets (e.g., `nba-hou-lal-2026-04-21-spread-away-4pt5`), use `polymarket markets get <slug>` directly to get `clobTokenIds`. `polymarket events get` returns 404 for spread-specific slugs — use markets get instead.
- **Sportsbook spread vs Polymarket spread line comparison**: Check if Polymarket's spread line matches sportsbook line. If Polymarket is tighter (e.g., -4.5 vs sportsbook -5.5), the underdog position on Polymarket is actually less favorable than at sportsbooks — weigh this against whale signal strength before betting.
- **Star player injury + large spread**: Even when a team's star is out (and the absence is already priced in), top-ranked whales betting on a large-underdog covering a big spread (13.5+) can be a valid play in playoffs. Blowouts are rarer in playoff settings regardless of roster deficits.

## Tennis (Madrid Open / WTA/ATP)

- **In-progress match price divergence from mid-price**: The `clob price --side buy` can deviate significantly from the displayed mid-price when a match is in progress. E.g., Kalinina mid-price showed 0.495 but actual buy was 0.37 — indicating Stephens was winning. Always check CLOB live price, not just the smart-analysis displayed price.
- **All-whale consensus + massive ranking gap = mid-match value**: If all 4 top whales backed the superior player pre-match at 50/50, and the price drops mid-match to 0.37-0.40 (suggesting the underdog is currently winning a set), buying the favored-by-form player at a discount can be a positive EV play. Tennis sets don't determine match outcome.
- **gameStartTime field in market JSON**: Check `gameStartTime` (UTC) from `polymarket markets search -o json` output to know if a match has started vs. close time being `endDate` (usually set 7 days out for delays).
- **Tennis prop markets reveal live score without browser**: The Set 1 Winner, Total Sets O/U 2.5, and game O/U markets all settle near 0.9995/0.0005 once resolved. Checking these alongside the winner market is the fastest way to determine current score (e.g., Set 1 Winner at 0.9995 = Player A won Set 1; Total Sets O/U 2.5 at 0.9995 = match going to 3 sets = currently in Set 3).
- **Set 3 winner bet at rising price = valid entry**: If a player won Set 1, lost Set 2, and is now in Set 3 with a rising buy price (e.g., 0.545 → 0.60 → 0.665) plus pre-match whale consensus (3+ top-10 whales), the entry at ~0.60 can be positive EV given superior form.
- **`polymarket clob market` with conditionId**: Use this to get token IDs from the condition ID available in smart-analysis output. This is faster than markets search for finding winner market token IDs.
- **Qualification matches resolve slowly**: Market end dates are typically set 7 days after the scheduled match date to accommodate rain delays and rescheduling.

## NBA Playoff Series Context

- **Reddit team subs have daily playoff discussion threads**: r/denvernuggets and similar team subreddits post day-by-day playoff discussion threads that include a table showing series status (W-L), upcoming game dates/times, and TV network. Fastest way to get series context for individual game markets.
- **Series score + venue is the key signal for per-game markets**: A team that won Game 2 on the road (at the opponent's home court) should not be priced at 45% to win Game 3 at their own home. Always check (1) who won the previous game, (2) where Game 3 is, and (3) whether the market price reflects that context.
- **Series-level vs per-game market**: A series market at 31.5% for a team doesn't mean the per-game price should reflect that — in a tied 1-1 series with the next game at home, the per-game price should be much closer to 50%. Check both the series market and the individual game market for divergence.

## NHL Playoffs

- **Shot disparity as quality signal**: When a team was dramatically outshot in Game 1 (e.g., 38-20) despite briefly leading, it signals they got lucky — fade them in Game 2 even if a bounce-back narrative exists. The underlying shot share reflects true team quality better than scoreline.
- **Series underdog home-court momentum** doesn't fully offset talent gap: A 1-0 series lead by the statistically better team (50-23-9 vs 45-27-10) with dominant shot share is a strong signal the favorite will extend the series lead.

## MLB Live Game Detection via Price History

- **Use 6h price-history to detect game start**: Before betting any MLB market, run `polymarket clob price-history <token> --interval 6h --fidelity 30`. If the price was flat (e.g., 0.50) for hours then suddenly moved 20%+ in a single 30-min candle, the game has started and one team is dominating. Cross-reference the move direction with your bet — if you're betting the losing team, skip.
- **Whale pre-game signals don't override live-game momentum**: Even 4 top-10 ranked whales (ranks 6, 7, 8, 9) all betting pre-game on an underdog team can be completely wrong if the game goes badly. When the price crashes 30%+ against whale signals in-game, skip — the live score dominates.
- **In-game price rising = safe entry signal**: If a team's price rises during the game (e.g., 0.485 → 0.565), combined with a pre-game whale endorsement, it confirms the bet is going the right way. More defensible entry than buying against momentum.

## Esports (Dota 2 / LoL)

- **GosuGamers shows world ranking for LPL/LCK teams**: When using GosuGamers to verify a match, the match page shows each team's current world ranking. A rank-90 vs rank-11 matchup is a massive quality gap that significantly lowers the edge on the underdog even with a large whale position.

- **Per-game markets resolve mid-series**: Game 2 Winner markets can price to 0.99+ while the market is still "open" — the game already happened. Always `clob price` before betting any per-game market.
- **BO3 price drop between smart-analysis and CLOB check**: If the smart analysis shows ~50/50 but the actual CLOB buy price has shifted 5-7% since, the match may have started mid-run. Skip without live score verification.
- **Flat price then sharp drop = esports match just started**: For LoL/Dota2 BO3s, if price history shows hours of flat price (e.g., 0.885) then a sudden 3-7% drop in the last 30-60 min (e.g., 0.885 → 0.825), it almost certainly means a game is in progress. Don't enter without live score confirmation.
- **BO3 token IDs**: Use `polymarket events get <base-slug>` (e.g., `dota2-flc-gl-2026-04-21`) not the game-specific slug to find the BO3 winner market tokens. Game-specific slugs (e.g., `-game2`) return 404.
- **Reddit useless for Dota 2 specific match research**: Reddit search returns irrelevant results for Dota 2 matchups. Skip Reddit for esports research; rely on whale signals and Liquipedia via web search instead.
- **H2H + rank 4 whale = strong signal**: Xtreme Gaming 8-2 H2H advantage over Vici Gaming confirms rank 4 whale signal. For esports, cross-check whale signal with H2H record and recent form via Liquipedia.
- **BO3 price lagging after series completion**: When a BO3 series concludes, the main BO3 winner market can stay at non-extreme prices (e.g., 0.27 for loser) for some minutes before settling. Always do a web search for the final result before betting into an active BO3 market — whale signals predate the result and are no longer informative once the match ended.
- **Smart-analysis BO3 prices heavily lag live markets**: The smart-analysis tool showed 0.865 for HLE in a BO3 but the real live price was 0.54 (after series went 1-1). Always verify BO3 winner prices with `polymarket markets search -o json` or `clob price` directly — never rely solely on smart-analysis prices for in-progress series.
- **`polymarket events get` returns prop/side markets, not just winner**: The events get JSON returns every related market (kill totals, daytime, rampage, etc.). Filter for the BO3 winner market by looking for the question matching the team names directly.
- **`clob price --side buy` returns the bid, not the ask**: When the returned "buy" price (e.g., 0.57) is significantly below the mid-price (e.g., 0.63), it may be the bid side. Actual market-order fill price may be higher (e.g., 0.69 ask). Always expect fill price to be at or above mid, not below.
- **Group stage: teams reset after losses**: In a tournament group stage, two teams who both lost in the previous round face each other in a "reset" scenario — prior round results don't affect this match. When checking form for esports BO3, look for the specific round results, not just overall record.

## Neg-Risk Whale Position Ratio

- **Small vs large position by same whale in linked neg-risk markets**: When a whale has $148k on "Atletico YES" and also $3k on "Elche YES" in the same neg-risk game, the $3k is noise/hedge — the $148k dominates their true view. Always compare position sizes across linked markets from the same whale before concluding they're on "both sides."
- **Heavy favorite pricing ceiling**: An NBA playoff #1 seed vs #8 seed at 0.925 is near-efficiently priced — true win probability is unlikely to be more than 2-3% above market. Betting heavy favorites in blowout playoff series rarely offers positive EV regardless of whale consensus. Skip unless sportsbook divergence is 5%+.

## La Liga / European Cup Rotation Risk

- **Price inversion signals rotation**: If a relegation-zone La Liga team is priced HIGHER than a top-4 club in the same fixture, check the top club's Copa del Rey / UCL schedule. A top-4 club playing a cup final or UCL leg within ~4 days of a La Liga fixture will almost certainly rotate, making the relegation team the logical favorite.
- **Neg-risk market price inversion as schedule signal**: In a neg-risk La Liga match (home/draw/away 3-outcome), the mid-price distribution (not just who has the higher price) encodes squad rotation expectations. A 40%/25%/33% split for home relegation team / draw / away top-4 club implies the market expects heavy rotation. Use this as a checklist item before any La Liga bet involving UCL/Copa del Rey clubs.
- **Don't bet opposing outcomes in same neg-risk match**: If you hold "Team A YES" in a neg-risk game, skip "Team B YES" from the same fixture even with strong whale signal — the positions partially cancel, waste capital, and guarantee one of them loses.
