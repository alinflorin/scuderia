import axios from 'axios';
import { Command } from 'commander';

const symbolMap: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  avax: 'avalanche-2',
  dot: 'polkadot',
  matic: 'matic-network',
  link: 'chainlink',
  uni: 'uniswap',
  ltc: 'litecoin',
  atom: 'cosmos',
  near: 'near',
  apt: 'aptos',
  sui: 'sui',
  ton: 'the-open-network',
  shib: 'shiba-inu',
  pepe: 'pepe',
  trx: 'tron',
};

function normalizeCoin(input: string): string {
  const raw = input.toLowerCase().trim();
  return symbolMap[raw] ?? raw;
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function last(arr: (number | null)[]): number | null {
  const filtered = arr.filter((v): v is number => v !== null && v !== undefined);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

function sma(arr: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    result.push(avg(arr.slice(i - period + 1, i + 1)));
  }
  return result;
}

function ema(arr: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let emaVal: number | null = null;
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) {
      emaVal = avg(arr.slice(0, period));
    } else {
      emaVal = arr[i] * k + emaVal! * (1 - k);
    }
    result.push(emaVal);
  }
  return result;
}

function safeFix(val: number | null | undefined, digits: number): number | null {
  return val != null ? parseFloat(val.toFixed(digits)) : null;
}

interface MarketChartData {
  prices: [number, number][];
  total_volumes: [number, number][];
}

interface CoinDetails {
  name?: string;
  symbol?: string;
  market_cap_rank?: number;
  market_data?: {
    market_cap?: { usd?: number };
    ath?: { usd?: number };
    ath_change_percentage?: { usd?: number };
    high_24h?: { usd?: number };
    low_24h?: { usd?: number };
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
    total_volume?: { usd?: number };
    circulating_supply?: number;
    max_supply?: number;
  };
}

async function fetchMarketChart(baseUrl: string, coinId: string): Promise<MarketChartData> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: '30',
    interval: 'daily',
  });
  const res = await axios.get<MarketChartData>(`${baseUrl}/api/v3/coins/${coinId}/market_chart?${params}`, { timeout: 15000 });
  return res.data;
}

async function fetchCoinDetails(baseUrl: string, coinId: string): Promise<CoinDetails> {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
  });
  const res = await axios.get<CoinDetails>(`${baseUrl}/api/v3/coins/${coinId}?${params}`, { timeout: 15000 });
  return res.data;
}

function computeIndicators(chartData: MarketChartData, coinDetails: CoinDetails, coinId: string) {
  const prices = chartData.prices.map(p => p[1]);
  const volumes = chartData.total_volumes.map(v => v[1]);
  const timestamps = chartData.prices.map(p => new Date(p[0]).toISOString().split('T')[0]);

  // RSI (14)
  const rsiPeriod = 14;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }
  let avgGain = avg(gains.slice(0, rsiPeriod));
  let avgLoss = avg(losses.slice(0, rsiPeriod));
  const rsiSeries: number[] = [];
  for (let i = rsiPeriod; i < gains.length; i++) {
    avgGain = (avgGain * (rsiPeriod - 1) + gains[i]) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + losses[i]) / rsiPeriod;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiSeries.push(100 - 100 / (1 + rs));
  }
  const rsi = last(rsiSeries);

  let rsiSignal = 'NEUTRAL';
  if (rsi != null) {
    if (rsi < 30) rsiSignal = 'OVERSOLD_BULLISH';
    else if (rsi < 45) rsiSignal = 'MILDLY_BULLISH';
    else if (rsi > 70) rsiSignal = 'OVERBOUGHT_BEARISH';
    else if (rsi > 55) rsiSignal = 'MILDLY_BEARISH';
  }

  // MACD (12, 26, 9)
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine: (number | null)[] = ema12.map((v, i) =>
    v !== null && ema26[i] !== null ? v - ema26[i]! : null,
  );
  const macdLineClean = macdLine.filter((v): v is number => v !== null);
  const signalLineSeries = ema(macdLineClean, 9);

  const macdValue = last(macdLineClean);
  const macdSignalValue = last(signalLineSeries);
  const macdHistogram =
    macdValue != null && macdSignalValue != null ? macdValue - macdSignalValue : null;

  let macdSignal = 'NEUTRAL';
  if (macdValue != null && macdSignalValue != null && macdHistogram != null) {
    if (macdValue > macdSignalValue && macdHistogram > 0) macdSignal = 'BULLISH';
    else if (macdValue < macdSignalValue && macdHistogram < 0) macdSignal = 'BEARISH';
  }

  // Bollinger Bands (20, 2σ)
  const bbPeriod = 20;
  const bbSMAArr = sma(prices, bbPeriod);
  const currentPrice = prices[prices.length - 1];
  const bbSMALast = last(bbSMAArr)!;
  const window20 = prices.slice(-bbPeriod);
  const stddev = Math.sqrt(avg(window20.map(p => Math.pow(p - bbSMALast, 2))));
  const bbUpper = bbSMALast + 2 * stddev;
  const bbLower = bbSMALast - 2 * stddev;
  const bbWidth = (bbUpper - bbLower) / bbSMALast;
  const bbPercent = (currentPrice - bbLower) / (bbUpper - bbLower);

  let bbSignal = 'NEUTRAL';
  if (currentPrice > bbUpper) bbSignal = 'OVERBOUGHT_BEARISH';
  else if (currentPrice < bbLower) bbSignal = 'OVERSOLD_BULLISH';
  else if (bbPercent > 0.7) bbSignal = 'APPROACHING_UPPER_BEARISH';
  else if (bbPercent < 0.3) bbSignal = 'APPROACHING_LOWER_BULLISH';

  // Moving Averages
  const sma7 = last(sma(prices, 7));
  const sma14 = last(sma(prices, 14));
  const sma21 = last(sma(prices, Math.min(21, prices.length)));
  const ema7 = last(ema(prices, 7));
  const ema14 = last(ema(prices, 14));

  let maSignal = 'NEUTRAL';
  const bullishCrossCount = [
    currentPrice > sma7!,
    currentPrice > sma14!,
    sma7! > sma14!,
    ema7! > ema14!,
  ].filter(Boolean).length;
  if (bullishCrossCount >= 3) maSignal = 'BULLISH';
  else if (bullishCrossCount <= 1) maSignal = 'BEARISH';

  // ATR (14)
  const highs = chartData.prices.map(p => p[1] * 1.005);
  const lows = chartData.prices.map(p => p[1] * 0.995);
  const trSeries: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - prices[i - 1]);
    const lc = Math.abs(lows[i] - prices[i - 1]);
    trSeries.push(Math.max(hl, hc, lc));
  }
  const atr = avg(trSeries.slice(-14));
  const atrPercent = (atr / currentPrice) * 100;

  let volatilitySignal = 'MODERATE';
  if (atrPercent > 5) volatilitySignal = 'HIGH_VOLATILITY';
  else if (atrPercent > 3) volatilitySignal = 'ELEVATED_VOLATILITY';
  else if (atrPercent < 1.5) volatilitySignal = 'LOW_VOLATILITY';

  // Volume Analysis
  const avgVolume7 = avg(volumes.slice(-7));
  const avgVolume30 = avg(volumes);
  const latestVolume = volumes[volumes.length - 1];
  const volumeRatio = latestVolume / avgVolume30;

  let volumeSignal = 'NORMAL';
  if (volumeRatio > 1.5) volumeSignal = 'HIGH_VOLUME_CONFIRMATION';
  else if (volumeRatio < 0.5) volumeSignal = 'LOW_VOLUME_WEAK_MOVE';

  // Price Momentum (ROC)
  const roc7 =
    prices.length > 7
      ? ((currentPrice - prices[prices.length - 8]) / prices[prices.length - 8]) * 100
      : null;
  const roc14 =
    prices.length > 14
      ? ((currentPrice - prices[prices.length - 15]) / prices[prices.length - 15]) * 100
      : null;
  const roc30 =
    prices.length > 1 ? ((currentPrice - prices[0]) / prices[0]) * 100 : null;

  // Market Data from CoinGecko
  const md = coinDetails.market_data ?? {};
  const marketCap = md.market_cap?.usd ?? null;
  const marketCapRank = coinDetails.market_cap_rank ?? null;
  const ath = md.ath?.usd ?? null;
  const athChangePercent = md.ath_change_percentage?.usd ?? null;
  const high24h = md.high_24h?.usd ?? null;
  const low24h = md.low_24h?.usd ?? null;
  const priceChange24h = md.price_change_percentage_24h ?? null;
  const priceChange7d = md.price_change_percentage_7d ?? null;
  const priceChange30d = md.price_change_percentage_30d ?? null;
  const totalVolume24h = md.total_volume?.usd ?? null;
  const circulatingSupply = md.circulating_supply ?? null;
  const maxSupply = md.max_supply ?? null;

  // Composite Score
  const signalScores = {
    rsi: rsiSignal.includes('BULLISH') ? 1 : rsiSignal.includes('BEARISH') ? -1 : 0,
    macd: macdSignal === 'BULLISH' ? 1 : macdSignal === 'BEARISH' ? -1 : 0,
    bb: bbSignal.includes('BULLISH') ? 1 : bbSignal.includes('BEARISH') ? -1 : 0,
    ma: maSignal === 'BULLISH' ? 1 : maSignal === 'BEARISH' ? -1 : 0,
    volume:
      volumeSignal === 'HIGH_VOLUME_CONFIRMATION'
        ? 0.5
        : volumeSignal === 'LOW_VOLUME_WEAK_MOVE'
          ? -0.25
          : 0,
    momentum: roc7 != null ? (roc7 > 3 ? 0.5 : roc7 < -3 ? -0.5 : 0) : 0,
  };
  const compositeScore = Object.values(signalScores).reduce((a, b) => a + b, 0);

  let overallBias = 'NEUTRAL';
  if (compositeScore >= 2) overallBias = 'STRONGLY_BULLISH';
  else if (compositeScore >= 1) overallBias = 'BULLISH';
  else if (compositeScore <= -2) overallBias = 'STRONGLY_BEARISH';
  else if (compositeScore <= -1) overallBias = 'BEARISH';

  // Candlestick summary (last 7 days)
  const candlesticks = timestamps.slice(-7).map((date, i) => {
    const idx = prices.length - 7 + i;
    return {
      date,
      close: safeFix(prices[idx], 4),
      volume: safeFix(volumes[idx], 0),
      approxHigh: safeFix(prices[idx] * 1.005, 4),
      approxLow: safeFix(prices[idx] * 0.995, 4),
    };
  });

  return {
    meta: {
      coinId,
      name: coinDetails.name ?? coinId,
      symbol: (coinDetails.symbol ?? coinId).toUpperCase(),
      analysisTimestamp: new Date().toISOString(),
      dataPoints: prices.length,
    },
    currentMarket: {
      price_usd: currentPrice,
      high24h,
      low24h,
      priceChange_24h_pct: priceChange24h,
      priceChange_7d_pct: priceChange7d,
      priceChange_30d_pct: priceChange30d,
      volume_24h_usd: totalVolume24h,
      marketCap_usd: marketCap,
      marketCapRank,
      circulatingSupply,
      maxSupply,
      ath_usd: ath,
      athChange_pct: athChangePercent,
    },
    indicators: {
      rsi: {
        value: safeFix(rsi, 2),
        signal: rsiSignal,
        interpretation: 'Below 30 = oversold/bullish, Above 70 = overbought/bearish',
      },
      macd: {
        macdLine: safeFix(macdValue, 4),
        signalLine: safeFix(macdSignalValue, 4),
        histogram: safeFix(macdHistogram, 4),
        signal: macdSignal,
        interpretation: 'MACD above signal = bullish momentum',
      },
      bollingerBands: {
        upper: safeFix(bbUpper, 4),
        middle: safeFix(bbSMALast, 4),
        lower: safeFix(bbLower, 4),
        bandWidth_pct: safeFix(bbWidth * 100, 2),
        percentB: safeFix(bbPercent * 100, 2),
        signal: bbSignal,
        interpretation: '%B > 100 = above upper band, < 0 = below lower band',
      },
      movingAverages: {
        sma7: safeFix(sma7, 4),
        sma14: safeFix(sma14, 4),
        sma21: safeFix(sma21, 4),
        ema7: safeFix(ema7, 4),
        ema14: safeFix(ema14, 4),
        signal: maSignal,
        bullishCrossCount,
      },
      atr: {
        value: safeFix(atr, 4),
        atrPercent_pct: safeFix(atrPercent, 2),
        signal: volatilitySignal,
        interpretation: 'Higher ATR% = more volatile = higher risk/reward',
      },
      volume: {
        latest_24h: safeFix(latestVolume, 0),
        avg_7d: safeFix(avgVolume7, 0),
        avg_30d: safeFix(avgVolume30, 0),
        volumeRatio: safeFix(volumeRatio, 2),
        signal: volumeSignal,
      },
      momentum: {
        roc_7d_pct: safeFix(roc7, 2),
        roc_14d_pct: safeFix(roc14, 2),
        roc_30d_pct: safeFix(roc30, 2),
      },
    },
    polymarketSignals: {
      compositeScore: safeFix(compositeScore, 2),
      overallBias,
      scoreBreakdown: signalScores,
      interpretation:
        'Score range: -4.75 (max bearish) to +4.5 (max bullish). Use with market context.',
      suggestion:
        compositeScore >= 1
          ? 'Indicators lean BULLISH — consider YES on price-up markets'
          : compositeScore <= -1
            ? 'Indicators lean BEARISH — consider NO on price-up markets'
            : 'Mixed signals — high uncertainty, smaller position sizing recommended',
    },
    candlesticks_last7d: candlesticks,
  };
}

export function makeCryptoCoinIndicatorsCommand(): Command {
  return new Command('crypto-coin-indicators')
    .description(
      'Fetch 30-day CoinGecko market data and compute technical indicators (RSI, MACD, Bollinger Bands, MAs, ATR, Volume) for a given coin.',
    )
    .argument('<coin>', 'Coin symbol (BTC, ETH) or CoinGecko ID (bitcoin, ethereum)')
    .action(async (coin: string) => {
      const coinGeckoBaseUrl = `https://api.coingecko.com`;
      const coinId = normalizeCoin(coin);

      const [chartData, coinDetails] = await Promise.all([
        fetchMarketChart(coinGeckoBaseUrl, coinId),
        fetchCoinDetails(coinGeckoBaseUrl, coinId),
      ]);

      const result = computeIndicators(chartData, coinDetails, coinId);
      console.log(JSON.stringify(result, null, 2));
    });
}