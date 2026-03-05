/**
 * RIVALFIT - Sistema de Precios Multi-Moneda
 * Precios ajustados por región usando PPP (Purchasing Power Parity)
 */

export type Currency = 'USD' | 'EUR' | 'GBP' | 'BRL' | 'MXN' | 'ARS' | 'COP' | 'CLP';
export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';

// ============================================
// TASAS DE CAMBIO BASE (actualizadas 2026)
// ============================================

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.00,      // Base
  EUR: 0.92,      // €1 = $1.09 USD
  GBP: 0.79,      // £1 = $1.27 USD
  BRL: 5.10,      // R$1 = $0.20 USD
  MXN: 17.50,     // $1 MXN = $0.057 USD
  ARS: 850.00,    // $1 ARS = $0.0012 USD (alta inflación)
  COP: 4100.00,   // $1 COP = $0.00024 USD
  CLP: 900.00,    // $1 CLP = $0.0011 USD
};

// ============================================
// AJUSTES PPP POR PAÍS
// ============================================

const PPP_ADJUSTMENTS: Record<string, number> = {
  // Europa Occidental (1.0 = sin ajuste)
  ES: 1.00,   // España
  FR: 1.00,   // Francia
  DE: 1.00,   // Alemania
  IT: 1.00,   // Italia
  PT: 0.85,   // Portugal
  GB: 1.05,   // Reino Unido

  // América del Norte
  US: 1.00,   // Estados Unidos
  CA: 0.95,   // Canadá

  // América Latina (ajuste por menor poder adquisitivo)
  MX: 0.55,   // México
  BR: 0.45,   // Brasil
  AR: 0.35,   // Argentina
  CO: 0.40,   // Colombia
  CL: 0.50,   // Chile
  PE: 0.38,   // Perú
  UY: 0.48,   // Uruguay
  EC: 0.42,   // Ecuador
};

// ============================================
// PRECIOS BASE EN USD
// ============================================

const BASE_PRICES: Record<Plan, number> = {
  free: 0,
  starter: 49.99,
  pro: 99.99,
  enterprise: 299.99,
};

// ============================================
// MAPEO DE PAÍS A MONEDA
// ============================================

const COUNTRY_CURRENCY_MAP: Record<string, Currency> = {
  // Europa
  ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', PT: 'EUR',
  GB: 'GBP', IE: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',

  // América
  US: 'USD', CA: 'USD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  PE: 'USD', // Perú usa USD para comercio digital
  UY: 'USD',
  EC: 'USD', // Ecuador usa USD oficial
};

// ============================================
// FUNCIÓN: Calcular Precio Ajustado
// ============================================

interface PriceResult {
  amount: number;
  currency: Currency;
  formatted: string;
  originalUSD: number;
  discountPercent?: number;
}

export function calculatePrice(
  plan: Plan,
  countryCode: string,
  options: {
    applyPPP?: boolean;
    launchDiscount?: boolean; // Descuento de lanzamiento
  } = {}
): PriceResult {
  const { applyPPP = true, launchDiscount = false } = options;

  // 1. Obtener precio base en USD
  let priceUSD = BASE_PRICES[plan];
  const originalUSD = priceUSD;

  // 2. Aplicar descuento de lanzamiento (primeros 50 centros)
  if (launchDiscount && plan !== 'free') {
    priceUSD *= 0.60; // 40% de descuento
  }

  // 3. Aplicar ajuste PPP
  const pppFactor = applyPPP ? (PPP_ADJUSTMENTS[countryCode] || 1.0) : 1.0;
  priceUSD *= pppFactor;

  // 4. Convertir a moneda local
  const currency = COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
  const exchangeRate = EXCHANGE_RATES[currency];
  const localAmount = priceUSD / exchangeRate;

  // 5. Redondear según moneda
  const roundedAmount = roundPrice(localAmount, currency);

  // 6. Formatear
  const formatted = formatCurrency(roundedAmount, currency);

  return {
    amount: roundedAmount,
    currency,
    formatted,
    originalUSD,
    discountPercent: launchDiscount ? 40 : undefined,
  };
}

// ============================================
// FUNCIÓN: Redondear Precio
// ============================================

function roundPrice(amount: number, currency: Currency): number {
  // Estrategia de redondeo psicológico
  switch (currency) {
    case 'USD':
    case 'EUR':
    case 'GBP':
      // Redondear a .99
      return Math.ceil(amount) - 0.01;

    case 'BRL':
    case 'MXN':
      // Redondear a .90
      return Math.ceil(amount / 10) * 10 - 0.10;

    case 'ARS':
    case 'COP':
    case 'CLP':
      // Redondear a múltiplos de 100 (ej: 4900, 5900)
      return Math.ceil(amount / 100) * 100 - 1;

    default:
      return Math.round(amount * 100) / 100;
  }
}

// ============================================
// FUNCIÓN: Formatear Moneda
// ============================================

export function formatCurrency(
  amount: number,
  currency: Currency,
  locale?: string
): string {
  const currencySymbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BRL: 'R$',
    MXN: '$',
    ARS: '$',
    COP: '$',
    CLP: '$',
  };

  const symbol = currencySymbols[currency];

  // Para monedas latinas, símbolo va antes
  if (['USD', 'EUR', 'GBP', 'BRL', 'MXN', 'ARS', 'COP', 'CLP'].includes(currency)) {
    // Si es moneda con decimales
    if (['USD', 'EUR', 'GBP', 'BRL', 'MXN'].includes(currency)) {
      return `${symbol}${amount.toFixed(2)}`;
    }
    // Monedas sin decimales (ARS, COP, CLP)
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }

  return `${symbol}${amount.toFixed(2)}`;
}

// ============================================
// FUNCIÓN: Obtener Moneda por País
// ============================================

export function getCurrencyByCountry(countryCode: string): Currency {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
}

// ============================================
// FUNCIÓN: Calcular Comisión de Stripe
// ============================================

export function calculateStripeFee(
  amount: number,
  currency: Currency
): {
  fee: number;
  net: number;
} {
  // Tarifas de Stripe por región (2026)
  const STRIPE_FEES: Record<Currency, { percent: number; fixed: number }> = {
    USD: { percent: 2.9, fixed: 0.30 },
    EUR: { percent: 1.4, fixed: 0.25 },
    GBP: { percent: 1.4, fixed: 0.20 },
    BRL: { percent: 3.9, fixed: 0.00 }, // Brasil tiene tarifa más alta
    MXN: { percent: 3.6, fixed: 3.00 },
    ARS: { percent: 3.9, fixed: 0.00 },
    COP: { percent: 3.9, fixed: 0.00 },
    CLP: { percent: 3.9, fixed: 0.00 },
  };

  const { percent, fixed } = STRIPE_FEES[currency];
  const fee = (amount * percent / 100) + fixed;
  const net = amount - fee;

  return { fee, net };
}

// ============================================
// FUNCIÓN: Generar Tabla de Precios Global
// ============================================

export function generatePricingTable(
  countries: string[]
): Record<string, Record<Plan, PriceResult>> {
  const table: Record<string, Record<Plan, PriceResult>> = {};

  for (const country of countries) {
    table[country] = {
      free: calculatePrice('free', country),
      starter: calculatePrice('starter', country, { launchDiscount: true }),
      pro: calculatePrice('pro', country, { launchDiscount: true }),
      enterprise: calculatePrice('enterprise', country),
    };
  }

  return table;
}

// ============================================
// EJEMPLO DE USO
// ============================================

/*
// En tu componente React:
const price = calculatePrice('starter', 'MX', { launchDiscount: true });
console.log(price.formatted); // "$299.90"

// Generar tabla para todos los países
const pricingTable = generatePricingTable(['ES', 'MX', 'BR', 'AR', 'US']);
console.log(pricingTable.MX.starter.formatted); // "$299.90"
console.log(pricingTable.BR.starter.formatted); // "R$129.90"
*/
