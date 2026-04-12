import type { Currency } from "@/types";

const USD_HINTS = /^(usd|us\$|\$|dollar)s?$/i;
const ILS_HINTS = /^(ils|nis|₪|sheqel|shekel|ש"ח|שח)s?$/i;

/** Normalize spreadsheet / bank text to supported ISO codes; unknown → USD */
export function normalizeCurrency(raw: string | undefined | null): Currency {
  if (raw == null) return "USD";
  const s = String(raw).trim();
  if (!s) return "USD";
  const compact = s.replace(/\s+/g, "");
  if (USD_HINTS.test(compact) || compact === "US") return "USD";
  if (ILS_HINTS.test(compact) || compact === "IL" || compact === "ISR")
    return "ILS";
  return "USD";
}

export function isValidCurrencyParam(v: string | null): v is Currency {
  return v === "USD" || v === "ILS";
}
