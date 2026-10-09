import type { BusinessSettings } from '../types';

/**
 * Currency and locale helpers.
 *
 * Every monetary amount in PrintCore is stored as a plain number in the
 * workshop's own currency. `BusinessSettings` decides which currency that is
 * (`currencyCode`) and how numbers are grouped and dated (`currencyLocale`), so
 * the same data set works for Chile, Mexico, the US or anywhere else.
 */

export interface CurrencyPreset {
  /** ISO 4217 code, e.g. 'CLP'. */
  code: string;
  /** Human readable name shown in the settings picker. */
  name: string;
  /** BCP-47 locale used to format amounts and dates. */
  locale: string;
  /** Decimals the currency normally uses, for the settings preview. */
  decimals: number;
}

export const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: 'CLP', name: 'Peso chileno', locale: 'es-CL', decimals: 0 },
  { code: 'USD', name: 'Dólar estadounidense', locale: 'en-US', decimals: 2 },
  { code: 'EUR', name: 'Euro', locale: 'es-ES', decimals: 2 },
  { code: 'MXN', name: 'Peso mexicano', locale: 'es-MX', decimals: 2 },
  { code: 'ARS', name: 'Peso argentino', locale: 'es-AR', decimals: 2 },
  { code: 'COP', name: 'Peso colombiano', locale: 'es-CO', decimals: 2 },
  { code: 'PEN', name: 'Sol peruano', locale: 'es-PE', decimals: 2 },
  { code: 'UYU', name: 'Peso uruguayo', locale: 'es-UY', decimals: 2 },
  { code: 'BOB', name: 'Boliviano', locale: 'es-BO', decimals: 2 },
  { code: 'BRL', name: 'Real brasileño', locale: 'pt-BR', decimals: 2 },
  { code: 'GBP', name: 'Libra esterlina', locale: 'en-GB', decimals: 2 },
  { code: 'JPY', name: 'Yen japonés', locale: 'ja-JP', decimals: 0 }
];

export const DEFAULT_CURRENCY_CODE = 'CLP';
export const DEFAULT_CURRENCY_LOCALE = 'es-CL';

/** Currencies quoted without decimals, so previews and rounding stay honest. */
const ZERO_DECIMAL_CURRENCIES = new Set(['CLP', 'JPY', 'KRW', 'VND', 'ISK']);

export function currencyCodeOf(settings?: Partial<BusinessSettings> | null): string {
  const code = settings?.currencyCode?.trim().toUpperCase();
  return code || DEFAULT_CURRENCY_CODE;
}

export function currencyLocaleOf(settings?: Partial<BusinessSettings> | null): string {
  const locale = settings?.currencyLocale?.trim();
  return locale || DEFAULT_CURRENCY_LOCALE;
}

export function currencyPresetOf(settings?: Partial<BusinessSettings> | null): CurrencyPreset | undefined {
  const code = currencyCodeOf(settings);
  return CURRENCY_PRESETS.find((preset) => preset.code === code);
}

/** Locale that matches the selected currency, falling back to the saved one. */
function resolveLocale(settings?: Partial<BusinessSettings> | null): string {
  const preset = currencyPresetOf(settings);
  if (preset) return preset.locale;
  return currencyLocaleOf(settings);
}

function decimalsFor(code: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
}

/** Formatted amount with the workshop currency, e.g. "$1.250.000" or "US$1,250.00". */
export function formatMoney(value: number, settings?: Partial<BusinessSettings> | null): string {
  const amount = Number.isFinite(value) ? value : 0;
  const code = currencyCodeOf(settings);
  const locale = resolveLocale(settings);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimalsFor(code),
      maximumFractionDigits: decimalsFor(code)
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(decimalsFor(code))}`;
  }
}

/** Localized plain number, for quantities that are not money. */
export function formatNumber(value: number, settings?: Partial<BusinessSettings> | null, decimals = 0): string {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(resolveLocale(settings), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  } catch {
    return amount.toFixed(decimals);
  }
}

/**
 * Formatted unit rate (per gram, per hour, per kWh). Keeps two decimals even in
 * zero-decimal currencies so small rates do not collapse to a rounded amount.
 */
export function formatRate(value: number, settings?: Partial<BusinessSettings> | null): string {
  const amount = Number.isFinite(value) ? value : 0;
  const code = currencyCodeOf(settings);
  const locale = resolveLocale(settings);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function formatDate(value: string | Date, settings?: Partial<BusinessSettings> | null): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(resolveLocale(settings), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatDateTime(value: string | Date, settings?: Partial<BusinessSettings> | null): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(resolveLocale(settings), {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/** Name of the sales tax applied on top of net prices ("IVA", "VAT", …). */
export function taxLabelOf(settings?: Partial<BusinessSettings> | null): string {
  return settings?.taxLabel?.trim() || 'IVA';
}

/** Label of the business tax identifier ("RUT", "RFC", "NIT", "Tax ID", …). */
export function taxIdLabelOf(settings?: Partial<BusinessSettings> | null): string {
  return settings?.taxIdLabel?.trim() || 'RUT';
}

/** Label of the sub-national division ("Comuna", "Estado", "Provincia", …). */
export function regionLabelOf(settings?: Partial<BusinessSettings> | null): string {
  return settings?.regionLabel?.trim() || 'Comuna';
}
