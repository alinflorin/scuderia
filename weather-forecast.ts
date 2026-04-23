import axios from "axios";
import { Command } from "commander";

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

interface GeoResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface HourlyData {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability?: number[];
  precipitation: number[];
  weathercode: number[];
}

interface NOAAHourlyPeriod {
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  shortForecast: string;
  probabilityOfPrecipitation?: { value: number | null };
}

interface CDOStation {
  id: string;
  name: string;
}

interface CDODataPoint {
  datatype: string;
  value: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

async function geocode(baseUrl: string, location: string): Promise<GeoResult> {
  const params = new URLSearchParams({
    name: location,
    count: "1",
    language: "en",
    format: "json",
  });
  const res = await axios.get<{ results?: GeoResult[] }>(
    `${baseUrl}/v1/search?${params}`,
    { timeout: 15000 },
  );
  const data = res.data;
  if (!data.results?.length) throw new Error(`Location not found: ${location}`);
  return data.results[0];
}

async function fetchForecast(
  baseUrl: string,
  geo: GeoResult,
  targetDate: string,
): Promise<HourlyData> {
  const params = new URLSearchParams({
    latitude: String(geo.latitude),
    longitude: String(geo.longitude),
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode",
    timezone: geo.timezone,
    start_date: targetDate,
    end_date: targetDate,
  });
  const res = await axios.get<{ hourly: HourlyData }>(
    `${baseUrl}/v1/forecast?${params}`,
    { timeout: 15000 },
  );
  return res.data.hourly;
}

async function fetchArchive(
  baseUrl: string,
  geo: GeoResult,
  date: string,
): Promise<HourlyData> {
  const params = new URLSearchParams({
    latitude: String(geo.latitude),
    longitude: String(geo.longitude),
    start_date: date,
    end_date: date,
    hourly: "temperature_2m,apparent_temperature,precipitation,weathercode",
    timezone: geo.timezone,
  });
  const res = await axios.get<{ hourly: HourlyData }>(
    `${baseUrl}/v1/archive?${params}`,
    { timeout: 15000 },
  );
  return res.data.hourly;
}

async function fetchNOAANWSForecast(
  lat: number,
  lon: number,
  targetDate: string,
  targetHour: number,
): Promise<{
  temp_c: number;
  temp_f: number;
  pop_pct: number | null;
  condition: string;
  wind: string;
} | null> {
  const headers = { "User-Agent": "weather-forecast-tool/1.0 (polymarket-agent)" };
  const pointRes = await axios.get<{
    properties: { forecastHourly: string };
  }>(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
    timeout: 15000,
    headers,
  });
  const { forecastHourly } = pointRes.data.properties;

  const fcRes = await axios.get<{
    properties: { periods: NOAAHourlyPeriod[] };
  }>(forecastHourly, { timeout: 15000, headers });

  const periods = fcRes.data.properties.periods;
  const targetMs = new Date(
    `${targetDate}T${String(targetHour).padStart(2, "0")}:00:00`,
  ).getTime();
  const period = periods.find((p) => {
    const s = new Date(p.startTime).getTime();
    const e = new Date(p.endTime).getTime();
    return targetMs >= s && targetMs < e;
  });

  if (!period) return null;

  const isF = period.temperatureUnit === "F";
  const temp_f = isF
    ? period.temperature
    : Math.round((period.temperature * 9) / 5 + 32);
  const temp_c = isF
    ? round2(((period.temperature - 32) * 5) / 9)
    : period.temperature;

  return {
    temp_c,
    temp_f,
    pop_pct: period.probabilityOfPrecipitation?.value ?? null,
    condition: period.shortForecast,
    wind: period.windSpeed,
  };
}

async function fetchNOAACDOHistory(
  lat: number,
  lon: number,
  targetDate: string,
  apiKey: string,
): Promise<{
  station: string;
  n: number;
  tmax_c: number | null;
  tmin_c: number | null;
  precip_mm: number | null;
  rainy_pct: number | null;
} | null> {
  const base = "https://www.ncdc.noaa.gov/cdo-web/api/v2";
  const headers = { token: apiKey };
  const [yearStr, month, day] = targetDate.split("-");
  const year = parseInt(yearStr);

  // Find nearest GHCND station that was actually active during our historical window
  // (date-range filter prevents picking brand-new stations with no past data)
  const d = 1.0;
  const stRes = await axios.get<{ results?: CDOStation[] }>(
    `${base}/stations`,
    {
      params: {
        datasetid: "GHCND",
        datatypeid: "TMAX",
        units: "metric",
        extent: `${lat - d},${lon - d},${lat + d},${lon + d}`,
        startdate: `${year - 6}-01-01`,
        enddate: `${year - 1}-12-31`,
        limit: 1,
        sortfield: "datacoverage",
        sortorder: "desc",
      },
      headers,
      timeout: 15000,
    },
  );

  const stations = stRes.data?.results ?? [];
  if (!stations.length) return null;
  const station = stations[0];

  // Fetch same calendar date across 5 prior years in parallel.
  // Use URLSearchParams to repeat datatypeid — CDO requires separate params, not a comma string.
  const yearData = await Promise.all(
    Array.from({ length: 5 }, (_, i) => {
      const y = year - 1 - i;
      const date = `${y}-${month}-${day}`;
      const p = new URLSearchParams({
        datasetid: "GHCND",
        stationid: station.id,
        startdate: date,
        enddate: date,
        units: "metric",
      });
      p.append("datatypeid", "TMAX");
      p.append("datatypeid", "TMIN");
      p.append("datatypeid", "PRCP");
      return axios
        .get<{ results?: CDODataPoint[] }>(`${base}/data?${p.toString()}`, {
          headers,
          timeout: 15000,
        })
        .then((r) => r.data?.results ?? [])
        .catch(() => [] as CDODataPoint[]);
    }),
  );

  const tmaxVals: number[] = [];
  const tminVals: number[] = [];
  const prcpVals: number[] = [];

  yearData.forEach((records) => {
    const byType: Record<string, number> = {};
    records.forEach((r) => {
      byType[r.datatype] = r.value;
    });
    if (byType.TMAX !== undefined) tmaxVals.push(byType.TMAX);
    if (byType.TMIN !== undefined) tminVals.push(byType.TMIN);
    if (byType.PRCP !== undefined) prcpVals.push(byType.PRCP);
  });

  return {
    station: station.name,
    n: Math.max(tmaxVals.length, tminVals.length),
    tmax_c: tmaxVals.length ? round2(mean(tmaxVals)) : null,
    tmin_c: tminVals.length ? round2(mean(tminVals)) : null,
    precip_mm: prcpVals.length ? round2(mean(prcpVals)) : null,
    rainy_pct: prcpVals.length
      ? Math.round(
          (prcpVals.filter((p) => p > 0.5).length / prcpVals.length) * 100,
        )
      : null,
  };
}

function extractHour(hourly: HourlyData, targetHour: number) {
  const idx = hourly.time.findIndex(
    (t) => new Date(t).getHours() === targetHour,
  );
  if (idx === -1) throw new Error(`Hour ${targetHour} not found in data`);
  return {
    temp_c: hourly.temperature_2m[idx],
    feels_c: hourly.apparent_temperature[idx],
    precip_mm: hourly.precipitation[idx],
    pop_pct: hourly.precipitation_probability?.[idx] ?? null,
    condition:
      WMO_DESCRIPTIONS[hourly.weathercode[idx]] ??
      `WMO ${hourly.weathercode[idx]}`,
  };
}

export function makeWeatherForecastCommand(): Command {
  return new Command("weather-forecast")
    .description(
      "Get weather forecast + historical comparison for Polymarket weather market analysis. " +
        "Sources: Open-Meteo, NOAA NWS (US only), NOAA CDO (requires NOAA_CDO_API_KEY env var).",
    )
    .argument(
      "<location>",
      'City or location name (e.g. "Hong Kong", "London")',
    )
    .argument("<target_date>", "Date in YYYY-MM-DD format")
    .argument("<target_hour>", "Hour in local time (0-23)", parseInt)
    .action(
      async (location: string, targetDate: string, targetHour: number) => {
        const omGeoBase = "https://geocoding-api.open-meteo.com";
        const omFcBase = "https://api.open-meteo.com";
        const omArchBase = "https://archive-api.open-meteo.com";
        const cdoKey = process.env.NOAA_CDO_API_KEY ?? null;

        const geo = await geocode(omGeoBase, location);

        const [year, month, day] = targetDate.split("-").map(Number);
        const archiveDates = Array.from({ length: 5 }, (_, i) => {
          const y = year - 1 - i;
          return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        });

        // All sources in parallel
        const [omForecastHourly, noaaNWS, noaaCDO, ...omArchiveHourlies] =
          await Promise.all([
            fetchForecast(omFcBase, geo, targetDate),
            fetchNOAANWSForecast(
              geo.latitude,
              geo.longitude,
              targetDate,
              targetHour,
            ).catch(() => null),
            cdoKey
              ? fetchNOAACDOHistory(
                  geo.latitude,
                  geo.longitude,
                  targetDate,
                  cdoKey,
                ).catch(() => null)
              : Promise.resolve(null),
            ...archiveDates.map((date) =>
              fetchArchive(omArchBase, geo, date).catch(() => null as unknown as HourlyData),
            ),
          ]);

        // Open-Meteo forecast
        const omHour = extractHour(omForecastHourly, targetHour);
        const omForecast = {
          ...omHour,
          temp_f: Math.round(((omHour.temp_c * 9) / 5 + 32) * 10) / 10,
        };

        // Open-Meteo historical stats
        const omHistRecords = omArchiveHourlies
          .map((hourly) => {
            if (!hourly) return null;
            try {
              return extractHour(hourly, targetHour);
            } catch {
              return null;
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        let omHist = null;
        if (omHistRecords.length > 0) {
          const temps = omHistRecords.map((r) => r.temp_c);
          const precips = omHistRecords.map((r) => r.precip_mm);
          const wcodes = omHistRecords.map((r) => r.condition);
          const tempMean = mean(temps);
          const tempStd = stddev(temps);
          const condCounts: Record<string, number> = {};
          wcodes.forEach((w) => {
            condCounts[w] = (condCounts[w] || 0) + 1;
          });
          const dominantCond = Object.entries(condCounts).sort(
            (a, b) => b[1] - a[1],
          )[0][0];

          const zScore =
            tempStd > 0
              ? round2((omHour.temp_c - tempMean) / tempStd)
              : null;
          const percentile = Math.round(
            (temps.filter((t) => t < omHour.temp_c).length / temps.length) *
              100,
          );
          let anomaly = "Normal";
          if (zScore !== null) {
            if (zScore > 2) anomaly = "Unusually hot";
            else if (zScore > 1) anomaly = "Warmer than usual";
            else if (zScore < -2) anomaly = "Unusually cold";
            else if (zScore < -1) anomaly = "Cooler than usual";
          }

          omHist = {
            n: omHistRecords.length,
            temp_mean_c: round2(tempMean),
            temp_std_c: round2(tempStd),
            temp_min_c: round2(Math.min(...temps)),
            temp_max_c: round2(Math.max(...temps)),
            precip_mean_mm: round2(mean(precips)),
            rainy_pct: Math.round(
              (precips.filter((p) => p > 0.5).length / precips.length) * 100,
            ),
            condition: dominantCond,
            z_score: zScore,
            percentile,
            anomaly,
            delta_c: round2(omHour.temp_c - tempMean),
          };
        }

        const result = {
          location: `${geo.name}, ${geo.country}`,
          target: `${targetDate}T${String(targetHour).padStart(2, "0")}:00`,
          forecast: {
            open_meteo: omForecast,
            noaa_nws: noaaNWS,
          },
          history: {
            open_meteo: omHist,
            noaa_cdo: noaaCDO,
          },
        };

        console.log(JSON.stringify(result, null, 2));
      },
    );
}
