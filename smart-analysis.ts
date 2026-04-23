import axios from 'axios';
import { Command } from 'commander';

const DATA_API = `https://data-api.polymarket.com`;
const GAMMA_API = `https://gamma-api.polymarket.com`;

interface LeaderboardEntry {
  proxyWallet?: string;
  userName?: string;
  xUsername?: string;
  rank?: string | number;
  pnl?: number;
  vol?: number;
}

interface LeaderboardWallet {
  rank: number;
  userName: string | null;
  pnl: number;
  vol: number;
}

interface MarketRaw {
  conditionId?: string;
  question?: string;
  endDate?: string;
  volume24hr?: number;
  volumeNum?: number;
  liquidityNum?: number;
  lastTradePrice?: number | null;
  bestBid?: number | null;
  bestAsk?: number | null;
  spread?: number | null;
  outcomes?: string;
  outcomePrices?: string;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  competitive?: number;
  slug?: string;
  archived?: boolean;
}

interface HolderEntry {
  proxyWallet?: string;
  amount?: number;
  outcomeIndex?: number;
}

interface HolderResponse {
  holders?: HolderEntry[];
}

interface SmartMoneyHolder {
  address: string;
  userName: string | null;
  rank: number;
  pnl: number;
  amount?: number;
  outcome?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

async function fetchLeaderboard(): Promise<Record<string, LeaderboardWallet>> {
  const url = `${DATA_API}/v1/leaderboard?timePeriod=WEEK&orderBy=PNL&limit=50`;
  const res = await axios.get<LeaderboardEntry[]>(url);
  const data = res.data;
  const wallets: Record<string, LeaderboardWallet> = {};
  for (const e of data) {
    if (e.proxyWallet) {
      wallets[e.proxyWallet.toLowerCase()] = {
        rank: parseInt(String(e.rank ?? 999)) || 999,
        userName: e.userName ?? e.xUsername ?? null,
        pnl: e.pnl ?? 0,
        vol: e.vol ?? 0,
      };
    }
  }
  return wallets;
}

interface FetchMarketsOptions {
  limit: number;
  offset: number;
  liquidityMin?: string;
  volumeMin?: string;
  order?: string;
  endMin?: string;
  endMax?: string;
}

async function fetchMarkets(opts: FetchMarketsOptions): Promise<MarketRaw[]> {
  const now = new Date();
  const endMin = opts.endMin ?? new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString();
  const endMax = opts.endMax ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    end_date_min: endMin,
    end_date_max: endMax,
    liquidity_num_min: opts.liquidityMin ?? '3000',
    volume_num_min: opts.volumeMin ?? '5000',
    order: opts.order ?? 'volume24hr',
    ascending: 'false',
    limit: String(opts.limit),
    offset: String(opts.offset),
  });

  const res = await axios.get<MarketRaw[]>(`${GAMMA_API}/markets?${params}`);
  return res.data;
}

function deduplicateMarkets(raw: MarketRaw[]): MarketRaw[] {
  const seen = new Set<string>();
  const out: MarketRaw[] = [];
  for (const m of raw) {
    if (!m.conditionId || seen.has(m.conditionId)) continue;
    if (m.archived) continue;
    if (!m.endDate) continue;
    seen.add(m.conditionId);
    out.push(m);
  }
  return out;
}

async function fetchHolders(conditionId: string): Promise<HolderResponse[]> {
  const params = new URLSearchParams({ market: conditionId, limit: '20', minBalance: '50' });
  try {
    const res = await axios.get<HolderResponse[]>(`${DATA_API}/holders?${params}`);
    return res.data;
  } catch {
    return [];
  }
}

function scoreLeaderboardOverlap(
  holdersData: HolderResponse[],
  leaderboardWallets: Record<string, LeaderboardWallet>,
): { pts: number; smartMoneyHolders: SmartMoneyHolder[]; consensusBonus: number; smartMoneySide: string | null } {
  const smartMoneyHolders: SmartMoneyHolder[] = [];
  const seenWallets = new Set<string>();

  for (const data of holdersData) {
    const holders = Array.isArray(data) ? (data as HolderEntry[]) : (data.holders ?? []);
    for (const h of holders) {
      const addr = (h.proxyWallet ?? '').toLowerCase();
      if (!addr || seenWallets.has(addr)) continue;
      seenWallets.add(addr);
      const lb = leaderboardWallets[addr];
      if (lb) {
        smartMoneyHolders.push({
          address: addr,
          userName: lb.userName,
          rank: lb.rank,
          pnl: lb.pnl,
          amount: h.amount,
          outcome: h.outcomeIndex,
        });
      }
    }
  }

  let pts = 0;
  let yesAmount = 0;
  let noAmount = 0;

  for (const sm of smartMoneyHolders) {
    const rankBonus = sm.rank <= 10 ? 3 : sm.rank <= 25 ? 1.5 : 0;
    const basePts = 5 + rankBonus;
    
    // Weight by position size
    const amt = sm.amount ?? 0;
    const sizeMultiplier = amt > 10000 ? 2.5 : amt > 5000 ? 2.0 : amt > 1000 ? 1.5 : amt > 250 ? 1.0 : 0.5;
    
    pts += basePts * sizeMultiplier;

    if (sm.outcome === 0) yesAmount += amt;
    else if (sm.outcome === 1) noAmount += amt;
  }

  pts = clamp(pts, 0, 40);

  let smartMoneySide: string | null = null;
  let consensusBonus = 0;
  
  if (yesAmount > 0 || noAmount > 0) {
    const totalAmount = yesAmount + noAmount;
    const maxSide = Math.max(yesAmount, noAmount);
    const consensusRatio = maxSide / totalAmount;
    
    if (yesAmount > noAmount * 1.5) smartMoneySide = 'YES';
    else if (noAmount > yesAmount * 1.5) smartMoneySide = 'NO';
    else smartMoneySide = 'SPLIT';

    if (consensusRatio > 0.75 && smartMoneyHolders.length >= 2) {
      consensusBonus = clamp(10 * consensusRatio, 0, 10);
    }
  }

  return { pts, smartMoneyHolders, consensusBonus, smartMoneySide };
}

function scoreTimeUrgency(endDateStr: string): number {
  const hoursLeft = (new Date(endDateStr).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < 1) return 0;
  if (hoursLeft < 6) return 10;
  if (hoursLeft <= 24) return 20;
  if (hoursLeft <= 48) return 18;
  if (hoursLeft <= 72) return 15;
  if (hoursLeft <= 120) return 10;
  return 6;
}

function scoreMomentum(oneDayChange: number, oneHourChange: number, volume24hr: number, volumeTotal: number): number {
  const absDay = Math.abs(oneDayChange);
  const absHour = Math.abs(oneHourChange);
  const sameDir = (oneDayChange >= 0 && oneHourChange >= 0) || (oneDayChange < 0 && oneHourChange < 0);
  const dayPts = clamp(absDay / 0.2, 0, 1) * 8;
  const hourPts = clamp(absHour / 0.1, 0, 1) * 7;
  const baseMom = (dayPts + hourPts) * (sameDir ? 1.3 : 1.0);

  const spikeRatio = volumeTotal > 0 ? (volume24hr / volumeTotal) : 0;
  const volMultiplier = clamp(spikeRatio / 0.2, 0.5, 2.0);
  
  return clamp(baseMom * volMultiplier, 0, 20);
}

function scoreVolumeSpike(volume24hr: number, volumeNum: number): number {
  if (!volumeNum || volumeNum <= 0) return 0;
  return clamp((volume24hr / volumeNum) / 0.4 * 10, 0, 10);
}

function scoreLiquidity(liquidityNum: number): number {
  if (!liquidityNum || liquidityNum <= 0) return 0;
  return clamp(Math.log10(clamp(liquidityNum, 1, 1e9) / 1000) / Math.log10(200) * 10, 0, 10);
}

function scoreSpread(spread: number | null | undefined): number {
  if (spread == null) return -5;
  if (spread <= 0.015) return 5;
  if (spread <= 0.025) return 2;
  if (spread <= 0.04) return -2;
  if (spread <= 0.06) return -5;
  return -10;
}

function scoreDirectionalROI(lastTradePrice: number | null | undefined, bestBid: number | null | undefined, bestAsk: number | null | undefined, smartMoneySide: string | null): number {
  const price = lastTradePrice ?? ((bestBid != null && bestAsk != null) ? (bestBid + bestAsk) / 2 : null);
  if (price === null || smartMoneySide === 'SPLIT' || smartMoneySide === null) {
    if (price && (price <= 0.1 || price >= 0.9)) return 1;
    return 0;
  }

  let riskRewardRatio = 0;
  if (smartMoneySide === 'YES') {
    if (price >= 0.98) return -5;
    riskRewardRatio = (1 - price) / price;
  } else if (smartMoneySide === 'NO') {
    if (price <= 0.02) return -5;
    const noPrice = 1 - price;
    riskRewardRatio = (1 - noPrice) / noPrice;
  }

  if (riskRewardRatio > 4) return 10;
  if (riskRewardRatio > 2) return 7;
  if (riskRewardRatio > 1) return 4;
  if (riskRewardRatio > 0.5) return 2;
  if (riskRewardRatio < 0.2) return -2;
  return 0;
}

function scoreCompetitive(competitive: number | undefined): number {
  if (!competitive) return 0;
  return clamp(competitive * 5, 0, 5);
}

export function makeSmartAnalysisCommand(): Command {
  return new Command('smart-analysis')
    .description('Fetch, score and rank active markets using leaderboard smart-money signals')
    .option('-l, --limit <number>', 'number of markets to fetch', '10')
    .option('-o, --offset <number>', 'pagination offset', '0')
    .action(async (options) => {
      const limit = parseInt(options.limit, 10);
      const offset = parseInt(options.offset, 10);

      const nowMs = Date.now();
      const [leaderboardWallets, rawMarketsMain, rawMarketsSmall, rawMarketsExpiringSoon] = await Promise.all([
        fetchLeaderboard(),
        fetchMarkets({ limit, offset }),
        fetchMarkets({ limit, offset: 0, liquidityMin: '300', volumeMin: '500', order: 'competitive' }),
        fetchMarkets({
          limit,
          offset: 0,
          liquidityMin: '100',
          volumeMin: '200',
          order: 'volume24hr',
          endMin: new Date(nowMs).toISOString(),
          endMax: new Date(nowMs + 60 * 60 * 1000).toISOString(),
        }),
      ]);

      const markets = deduplicateMarkets([...rawMarketsMain, ...rawMarketsSmall, ...rawMarketsExpiringSoon]);
      if (markets.length === 0) {
        console.log(JSON.stringify({ success: false, error: 'No qualifying markets found', markets: [] }, null, 2));
        return;
      }

      // Fetch holders for all markets in parallel
      const holdersPerMarket = await Promise.all(
        markets.map(m => fetchHolders(m.conditionId!)),
      );

      const now = Date.now();
      const scoredMarkets = markets.map((market, i) => {
        const holdersData = holdersPerMarket[i];
        const lb = scoreLeaderboardOverlap(holdersData, leaderboardWallets);
        const time = scoreTimeUrgency(market.endDate!);
        const mom = scoreMomentum(market.oneDayPriceChange ?? 0, market.oneHourPriceChange ?? 0, market.volume24hr ?? 0, market.volumeNum ?? 0);
        const vol = scoreVolumeSpike(market.volume24hr ?? 0, market.volumeNum ?? 0);
        const liq = scoreLiquidity(market.liquidityNum ?? 0);
        const spreadScore = scoreSpread(market.spread);
        const roiScore = scoreDirectionalROI(market.lastTradePrice, market.bestBid, market.bestAsk, lb.smartMoneySide);
        const comp = scoreCompetitive(market.competitive);
        const totalScore = lb.pts + lb.consensusBonus + time + mom + vol + liq + spreadScore + roiScore + comp;
        const hoursLeft = Math.round((new Date(market.endDate!).getTime() - now) / 3_600_000);

        let outcomesParsed: string[] | null = null;
        let outcomePricesParsed: string[] | null = null;
        try { outcomesParsed = JSON.parse(market.outcomes ?? ''); } catch (_) { /* ignore */ }
        try { outcomePricesParsed = JSON.parse(market.outcomePrices ?? ''); } catch (_) { /* ignore */ }

        return {
          conditionId: market.conditionId,
          question: market.question,
          slug: market.slug,
          endDate: market.endDate,
          hoursLeft,
          lastTradePrice: market.lastTradePrice,
          bestBid: market.bestBid,
          bestAsk: market.bestAsk,
          spread: market.spread,
          outcomes: outcomesParsed,
          outcomePrices: outcomePricesParsed,
          oneDayPriceChange: market.oneDayPriceChange,
          oneHourPriceChange: market.oneHourPriceChange,
          volume24hr: market.volume24hr,
          volumeTotal: market.volumeNum,
          liquidityNum: market.liquidityNum,
          smartMoneyHolders: lb.smartMoneyHolders,
          smartMoneyCount: lb.smartMoneyHolders.length,
          smartMoneySide: lb.smartMoneySide,
          score: Math.round(totalScore * 10) / 10,
          scoreBreakdown: {
            leaderboardOverlap: Math.round(lb.pts * 10) / 10,
            consensusBonus: Math.round(lb.consensusBonus * 10) / 10,
            timeUrgency: Math.round(time * 10) / 10,
            volumeWeightedMomentum: Math.round(mom * 10) / 10,
            volumeSpike: Math.round(vol * 10) / 10,
            liquidity: Math.round(liq * 10) / 10,
            spreadScore: Math.round(spreadScore * 10) / 10,
            directionalROI: Math.round(roiScore * 10) / 10,
            competitive: Math.round(comp * 10) / 10,
          },
        };
      });

      scoredMarkets.sort((a, b) => b.score - a.score);

      const output = scoredMarkets.map((m, idx) => {
        const dc = m.oneDayPriceChange ?? 0;
        const hc = m.oneHourPriceChange ?? 0;
        let momentumSignal = 'NEUTRAL';
        if (Math.abs(dc) > 0.15) momentumSignal = dc > 0 ? 'STRONG_UP' : 'STRONG_DOWN';
        else if (dc > 0.05 && hc >= 0) momentumSignal = 'TRENDING_UP';
        else if (dc < -0.05 && hc <= 0) momentumSignal = 'TRENDING_DOWN';

        const spikeRatio = (m.volumeTotal ?? 0) > 0 ? (m.volume24hr ?? 0) / m.volumeTotal! : 0;
        const activityLevel = spikeRatio > 0.5 ? 'HOT' : spikeRatio > 0.25 ? 'ACTIVE' : 'NORMAL';

        return {
          rank: idx + 1,
          score: m.score,
          question: m.question,
          conditionId: m.conditionId,
          url: `https://polymarket.com/event/${m.slug}`,
          hoursLeft: m.hoursLeft,
          endDate: m.endDate,
          pricing: {
            lastTradePrice: m.lastTradePrice,
            bestBid: m.bestBid,
            bestAsk: m.bestAsk,
            spread: m.spread,
            outcomes: m.outcomes,
            outcomePrices: m.outcomePrices,
            oneDayPriceChange: m.oneDayPriceChange,
            oneHourPriceChange: m.oneHourPriceChange,
          },
          activity: {
            volume24hr: m.volume24hr,
            volumeTotal: m.volumeTotal,
            liquidity: m.liquidityNum,
            volume24hrPct: Math.round(spikeRatio * 1000) / 10 + '%',
            activityLevel,
          },
          signals: {
            momentumSignal,
            smartMoneySide: m.smartMoneySide,
            smartMoneyCount: m.smartMoneyCount,
            smartMoneyHolders: m.smartMoneyHolders,
          },
          scoreBreakdown: m.scoreBreakdown,
        };
      });

      console.log(JSON.stringify({
        success: true,
        generatedAt: new Date().toISOString(),
        totalMarketsEvaluated: output.length,
        markets: output,
      }, null, 2));
    });
}