import type { Currency } from "@/types";

/** UTC calendar day `YYYY-MM-DD` for ECB alignment */
export function utcDayString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addUtcDays(isoDay: string, deltaDays: number): string {
  const [y, mo, da] = isoDay.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da + deltaDays));
  return utcDayString(dt);
}

type EcbJson = {
  dataSets?: Array<{
    series?: Record<
      string,
      { observations?: Record<string, [number, ...unknown[]]> }
    >;
  }>;
  structure?: {
    dimensions?: {
      observation?: Array<{ values?: Array<{ id: string }> }>;
    };
  };
};

/** ECB EXR: observation value is units of quoted currency per 1 EUR (e.g. USD per EUR, ILS per EUR). */
export function parseEcbExrSeries(json: unknown): Map<string, number> {
  const m = new Map<string, number>();
  const j = json as EcbJson;
  const timeDim = j.structure?.dimensions?.observation?.[0];
  const dates = timeDim?.values?.map((v) => v.id) ?? [];
  const series = j.dataSets?.[0]?.series;
  if (!series) return m;
  const firstKey = Object.keys(series)[0];
  const obs = series[firstKey]?.observations;
  if (!obs) return m;
  for (let i = 0; i < dates.length; i++) {
    const tuple = obs[String(i)];
    if (tuple && typeof tuple[0] === "number") m.set(dates[i], tuple[0]);
  }
  return m;
}

function sortedSeriesKeys(series: Map<string, number>): string[] {
  return Array.from(series.keys()).sort();
}

/** Value on the last observation date ≤ `day` (ISO dates sort lexicographically). */
function valueOnOrBefore(
  day: string,
  sortedKeys: string[],
  series: Map<string, number>,
): number | undefined {
  let lo = 0;
  let hi = sortedKeys.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = sortedKeys[mid];
    if (k <= day) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best === -1) return undefined;
  return series.get(sortedKeys[best]);
}

export async function fetchEcbUsdEurAndIlsEur(
  startPeriod: string,
  endPeriod: string,
): Promise<{ usdPerEur: Map<string, number>; ilsPerEur: Map<string, number> }> {
  const base = "https://data-api.ecb.europa.eu/service/data/EXR";
  const q = `?startPeriod=${encodeURIComponent(startPeriod)}&endPeriod=${encodeURIComponent(endPeriod)}&format=jsondata`;
  const fetchOpts = {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(8000),
  } as const;
  const [usdRes, ilsRes] = await Promise.all([
    fetch(`${base}/D.USD.EUR.SP00.A${q}`, fetchOpts),
    fetch(`${base}/D.ILS.EUR.SP00.A${q}`, fetchOpts),
  ]);
  if (!usdRes.ok)
    throw new Error(`ECB USD/EUR request failed (${usdRes.status})`);
  if (!ilsRes.ok)
    throw new Error(`ECB ILS/EUR request failed (${ilsRes.status})`);
  const [usdJson, ilsJson] = await Promise.all([usdRes.json(), ilsRes.json()]);
  return {
    usdPerEur: parseEcbExrSeries(usdJson),
    ilsPerEur: parseEcbExrSeries(ilsJson),
  };
}

/** ILS per 1 USD using ECB triangulation: (ILS/EUR) / (USD/EUR). */
export function ilsPerUsdForUtcDays(
  usdPerEur: Map<string, number>,
  ilsPerEur: Map<string, number>,
  requiredUtcDays: string[],
): { rates: Map<string, number>; missingDays: string[] } {
  const rates = new Map<string, number>();
  const missingDays: string[] = [];
  const usdKeys = sortedSeriesKeys(usdPerEur);
  const ilsKeys = sortedSeriesKeys(ilsPerEur);
  for (const day of requiredUtcDays) {
    const u = valueOnOrBefore(day, usdKeys, usdPerEur);
    const ils = valueOnOrBefore(day, ilsKeys, ilsPerEur);
    if (u == null || u === 0 || ils == null || ils === 0) {
      missingDays.push(day);
      continue;
    }
    rates.set(day, ils / u);
  }
  return { rates, missingDays };
}

export function convertAmountToDisplay(
  amount: number,
  from: Currency,
  to: Currency,
  ilsPerUsd: number,
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "ILS") return amount * ilsPerUsd;
  if (from === "ILS" && to === "USD")
    return ilsPerUsd !== 0 ? amount / ilsPerUsd : amount;
  return amount;
}

export function buildRequiredUtcDays(dates: Date[]): string[] {
  const set = new Set<string>();
  for (const d of dates) set.add(utcDayString(d));
  return Array.from(set).sort();
}

/** Fetch window starts before first tx day so weekend rows can carry ECB Friday rates */
export function ecbFetchWindow(
  requiredDays: string[],
): { start: string; end: string } | null {
  if (requiredDays.length === 0) return null;
  return {
    start: addUtcDays(requiredDays[0], -21),
    end: requiredDays[requiredDays.length - 1],
  };
}
