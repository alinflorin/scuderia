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

function extractHour(hourly: HourlyData, targetHour: number) {
  const idx = hourly.time.findIndex(
    (t) => new Date(t).getHours() === targetHour,
  );
  if (idx === -1) throw new Error(`Hour ${targetHour} not found in data`);
  return {
    time: hourly.time[idx],
    temperature_c: hourly.temperature_2m[idx],
    apparent_temperature_c: hourly.apparent_temperature[idx],
    precipitation_mm: hourly.precipitation[idx],
    precipitation_probability_pct:
      hourly.precipitation_probability?.[idx] ?? null,
    weathercode: hourly.weathercode[idx],
    weather_description:
      WMO_DESCRIPTIONS[hourly.weathercode[idx]] ??
      `WMO code ${hourly.weathercode[idx]}`,
  };
}

export function makeWeatherForecastCommand(): Command {
  return new Command("weather-forecast")
    .description(
      "Get weather forecast for a location/date/hour with historical comparison (last 5 years). " +
        "Outputs forecast, historical stats, and anomaly analysis.",
    )
    .argument(
      "<location>",
      'City or location name (e.g. "Hong Kong", "London")',
    )
    .argument("<target_date>", "Date in YYYY-MM-DD format")
    .argument("<target_hour>", "Hour in local time (0-23)", parseInt)
    .action(
      async (location: string, targetDate: string, targetHour: number) => {
        const openMeteoGeocodingBase = `https://geocoding-api.open-meteo.com`;
        const openMeteoForecastBase = `https://api.open-meteo.com`;
        const openMeteoArchiveBase = `https://archive-api.open-meteo.com`;
        // Geocode
        const geo = await geocode(openMeteoGeocodingBase, location);

        // Forecast + historical in parallel
        const [forecastHourly, ...archiveHourlies] = await Promise.all([
          fetchForecast(openMeteoForecastBase, geo, targetDate),
          ...((): Promise<HourlyData>[] => {
            const [year, month, day] = targetDate.split("-").map(Number);
            const yearsBack = 5;
            return Array.from({ length: yearsBack }, (_, i) => {
              const y = year - 1 - i;
              const date = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              return fetchArchive(openMeteoArchiveBase, geo, date);
            });
          })(),
        ]);

        // Extract forecast hour
        const forecast = {
          location,
          resolved_name: geo.name,
          country: geo.country,
          timezone: geo.timezone,
          target_date: targetDate,
          target_hour: targetHour,
          ...extractHour(forecastHourly, targetHour),
          temperature_f: null as number | null,
          summary: "",
        };
        forecast.temperature_f =
          Math.round(((forecast.temperature_c * 9) / 5 + 32) * 10) / 10;
        forecast.summary = `${geo.name} (${geo.country}) on ${targetDate} at ${String(targetHour).padStart(2, "0")}:00 local → ${forecast.temperature_c}°C (feels ${forecast.apparent_temperature_c}°C), ${forecast.weather_description}, precip ${forecast.precipitation_probability_pct}% / ${forecast.precipitation_mm}mm`;

        // Extract historical hours
        const [year, month, day] = targetDate.split("-").map(Number);
        const historicalRecords = archiveHourlies
          .map((hourly, i) => {
            const y = year - 1 - i;
            try {
              const h = extractHour(hourly, targetHour);
              return {
                year: y,
                date: `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                ...h,
              };
            } catch {
              return null;
            }
          })
          .filter(
            (r): r is NonNullable<typeof r> =>
              r !== null && r.temperature_c !== undefined,
          );

        // Compute statistics
        if (historicalRecords.length === 0) {
          console.log(
            JSON.stringify(
              {
                forecast,
                historical: null,
                error: "No valid historical records",
              },
              null,
              2,
            ),
          );
          return;
        }

        const temps = historicalRecords.map((r) => r.temperature_c);
        const precips = historicalRecords.map((r) => r.precipitation_mm);
        const wcodes = historicalRecords.map((r) => r.weathercode);

        const tempMean = mean(temps);
        const tempStd = stddev(temps);
        const tempMin = Math.min(...temps);
        const tempMax = Math.max(...temps);
        const precipMean = mean(precips);
        const precipMax = Math.max(...precips);
        const rainyDays = precips.filter((p) => p > 0.5).length;
        const rainyPct = Math.round(
          (rainyDays / historicalRecords.length) * 100,
        );

        const zScore =
          tempStd > 0
            ? round2((forecast.temperature_c - tempMean) / tempStd)
            : null;
        const coolerYears = temps.filter(
          (t) => t < forecast.temperature_c,
        ).length;
        const forecastPercentile = Math.round(
          (coolerYears / temps.length) * 100,
        );

        const wcodeCounts: Record<number, number> = {};
        wcodes.forEach((w) => {
          wcodeCounts[w] = (wcodeCounts[w] || 0) + 1;
        });
        const dominantWcode = Number(
          Object.entries(wcodeCounts).sort((a, b) => b[1] - a[1])[0][0],
        );

        let anomalyLabel = "Normal";
        if (zScore !== null) {
          if (zScore > 2) anomalyLabel = "Unusually hot";
          else if (zScore > 1) anomalyLabel = "Warmer than usual";
          else if (zScore < -2) anomalyLabel = "Unusually cold";
          else if (zScore < -1) anomalyLabel = "Cooler than usual";
        }

        const result = {
          forecast,
          historical: {
            years_sampled: historicalRecords.length,
            records: historicalRecords,
            temperature: {
              mean_c: round2(tempMean),
              stddev_c: round2(tempStd),
              min_c: round2(tempMin),
              max_c: round2(tempMax),
            },
            precipitation: {
              mean_mm: round2(precipMean),
              max_mm: round2(precipMax),
              rainy_days_pct: rainyPct,
            },
            dominant_condition:
              WMO_DESCRIPTIONS[dominantWcode] ?? `WMO ${dominantWcode}`,
          },
          analysis: {
            z_score: zScore,
            forecast_percentile: forecastPercentile,
            anomaly_label: anomalyLabel,
            forecast_vs_mean_delta_c: round2(forecast.temperature_c - tempMean),
            summary: `Forecast ${forecast.temperature_c}°C is ${anomalyLabel.toLowerCase()} (historical mean ${round2(tempMean)}°C ± ${round2(tempStd)}°C over ${historicalRecords.length} years, ${forecastPercentile}th percentile). Historically ${rainyPct}% chance of rain on this date/hour.`,
          },
        };

        console.log(JSON.stringify(result, null, 2));
      },
    );
}
