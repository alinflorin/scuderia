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

async function fetchMarkets(limit: number, offset: number): Promise<MarketRaw[]> {
  const now = new Date();
  const endMin = new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString();
  const endMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    end_date_min: endMin,
    end_date_max: endMax,
    liquidity_num_min: '3000',
    volume_num_min: '5000',
    order: 'volume24hr',
    ascending: 'false',
    limit: String(limit),
    offset: String(offset),
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
): { pts: number; smartMoneyHolders: SmartMoneyHolder[] } {
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
  for (const sm of smartMoneyHolders) {
    const rankBonus = sm.rank <= 10 ? 3 : sm.rank <= 25 ? 1.5 : 0;
    pts += 10 + rankBonus;
  }
  return { pts: clamp(pts, 0, 30), smartMoneyHolders };
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

function scoreMomentum(oneDayChange: number, oneHourChange: number): number {
  const absDay = Math.abs(oneDayChange);
  const absHour = Math.abs(oneHourChange);
  const sameDir = (oneDayChange >= 0 && oneHourChange >= 0) || (oneDayChange < 0 && oneHourChange < 0);
  const dayPts = clamp(absDay / 0.2, 0, 1) * 8;
  const hourPts = clamp(absHour / 0.1, 0, 1) * 7;
  return clamp((dayPts + hourPts) * (sameDir ? 1.3 : 1.0), 0, 15);
}

function scoreVolumeSpike(volume24hr: number, volumeNum: number): number {
  if (!volumeNum || volumeNum <= 0) return 0;
  return clamp((volume24hr / volumeNum) / 0.4 * 15, 0, 15);
}

function scoreLiquidity(liquidityNum: number): number {
  if (!liquidityNum || liquidityNum <= 0) return 0;
  return clamp(Math.log10(clamp(liquidityNum, 1, 1e9) / 1000) / Math.log10(200) * 10, 0, 10);
}

function scorePriceBoundary(lastTradePrice: number | null | undefined, bestBid: number | null | undefined, bestAsk: number | null | undefined): number {
  const price = lastTradePrice ?? ((bestBid != null && bestAsk != null) ? (bestBid + bestAsk) / 2 : null);
  if (price === null) return 0;
  if (price <= 0.05 || price >= 0.95) return 2;
  if (price <= 0.15 || price >= 0.85) return 5;
  if (price <= 0.25 || price >= 0.75) return 3;
  if (price <= 0.4 || price >= 0.6) return 2;
  return 1;
}

function scoreCompetitive(competitive: number | undefined): number {
  if (!competitive) return 0;
  return clamp(competitive * 5, 0, 5);
}

export function makeSmartAnalysisCommand(): Command {
  return new Command('smart-analysis')
    .description('Fetch, score and rank active markets using leaderboard smart-money signals (mirrors the n8n smart-analysis workflow).')
    .option('-l, --limit <number>', 'number of markets to fetch', '30')
    .option('-o, --offset <number>', 'pagination offset', '0')
    .action(async (options) => {
      const limit = parseInt(options.limit, 10);
      const offset = parseInt(options.offset, 10);

      const [leaderboardWallets, rawMarkets] = await Promise.all([
        fetchLeaderboard(),
        fetchMarkets(limit, offset),
      ]);

      const markets = deduplicateMarkets(rawMarkets);
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
        const mom = scoreMomentum(market.oneDayPriceChange ?? 0, market.oneHourPriceChange ?? 0);
        const vol = scoreVolumeSpike(market.volume24hr ?? 0, market.volumeNum ?? 0);
        const liq = scoreLiquidity(market.liquidityNum ?? 0);
        const edge = scorePriceBoundary(market.lastTradePrice, market.bestBid, market.bestAsk);
        const comp = scoreCompetitive(market.competitive);
        const totalScore = lb.pts + time + mom + vol + liq + edge + comp;
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
          score: Math.round(totalScore * 10) / 10,
          scoreBreakdown: {
            leaderboardOverlap: Math.round(lb.pts * 10) / 10,
            timeUrgency: Math.round(time * 10) / 10,
            priceMomentum: Math.round(mom * 10) / 10,
            volumeSpike: Math.round(vol * 10) / 10,
            liquidity: Math.round(liq * 10) / 10,
            priceBoundary: Math.round(edge * 10) / 10,
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

        const yesCount = m.smartMoneyHolders.filter(h => h.outcome === 0).length;
        const noCount = m.smartMoneyHolders.filter(h => h.outcome === 1).length;
        let smartMoneySide: string | null = null;
        if (yesCount > noCount) smartMoneySide = 'YES';
        else if (noCount > yesCount) smartMoneySide = 'NO';
        else if (yesCount > 0) smartMoneySide = 'SPLIT';

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
            smartMoneySide,
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