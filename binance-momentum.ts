import axios from 'axios';
import { Command } from 'commander';

const BINANCE_API = 'https://api.binance.com/api/v3';

interface Ticker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

// Kline format: [ openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignore ]
type Kline = [number, string, string, string, string, string, number, string, number, string, string, string];

async function fetch24hrTickers(symbols: string[]): Promise<Ticker24hr[]> {
  const symbolsParam = JSON.stringify(symbols);
  const res = await axios.get<Ticker24hr[]>(`${BINANCE_API}/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`);
  return res.data;
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const res = await axios.get<Kline[]>(`${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return res.data;
}

function calculateMomentum(klines: Kline[]): { changePct: number; isUp: boolean } {
  if (klines.length === 0) return { changePct: 0, isUp: false };
  const firstOpen = parseFloat(klines[0][1]);
  const lastClose = parseFloat(klines[klines.length - 1][4]);
  const changePct = ((lastClose - firstOpen) / firstOpen) * 100;
  return { changePct, isUp: changePct >= 0 };
}

export function makeBinanceMomentumCommand(): Command {
  return new Command('binance-momentum')
    .description('Fetch real-time momentum data from Binance for crypto assets')
    .option('-s, --symbols <symbols>', 'Comma-separated list of symbols', 'BTCUSDT,ETHUSDT,SOLUSDT')
    .option('-i, --interval <interval>', 'Kline interval (e.g., 1m, 5m, 15m)', '15m')
    .action(async (options) => {
      try {
        const symbols = options.symbols.split(',').map((s: string) => s.trim().toUpperCase());
        const interval = options.interval;

        const tickers = await fetch24hrTickers(symbols);
        const results = [];

        for (const ticker of tickers) {
          const symbol = ticker.symbol;
          // Fetch 1 kline for current momentum and 4 klines for broader momentum (e.g. 1 hour if 15m)
          const klinesCurrent = await fetchKlines(symbol, interval, 1);
          const klinesPast4 = await fetchKlines(symbol, interval, 4);

          const currentMomentum = calculateMomentum(klinesCurrent);
          const past4Momentum = calculateMomentum(klinesPast4);

          const lastPrice = parseFloat(ticker.lastPrice);
          const volume = parseFloat(ticker.quoteVolume);
          const priceChangePercent24h = parseFloat(ticker.priceChangePercent);

          let signal = 'NEUTRAL';
          if (currentMomentum.changePct > 0.5 && past4Momentum.changePct > 1) {
             signal = 'STRONG_UP';
          } else if (currentMomentum.changePct < -0.5 && past4Momentum.changePct < -1) {
             signal = 'STRONG_DOWN';
          } else if (currentMomentum.changePct > 0.2) {
             signal = 'UP';
          } else if (currentMomentum.changePct < -0.2) {
             signal = 'DOWN';
          }

          results.push({
            symbol,
            price: lastPrice,
            priceChange24hPct: priceChangePercent24h,
            volume24hUsdt: Math.round(volume),
            momentum: {
                interval,
                currentIntervalPct: Number(currentMomentum.changePct.toFixed(3)),
                past4IntervalsPct: Number(past4Momentum.changePct.toFixed(3)),
            },
            signal
          });
        }

        console.log(JSON.stringify({
            success: true,
            generatedAt: new Date().toISOString(),
            data: results
        }, null, 2));

      } catch (error: any) {
        console.error(JSON.stringify({
            success: false,
            error: 'Failed to fetch data from Binance',
            details: error.message
        }, null, 2));
      }
    });
}
