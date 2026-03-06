/**
 * RIVALFIT - Configuración de Internacionalización (i18n)
 * Soporta múltiples idiomas y regiones
 */

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// ============================================
// IDIOMAS SOPORTADOS
// ============================================

export const locales = ['en', 'es', 'pt', 'fr', 'de', 'it'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// ============================================
// CONFIGURACIÓN DE REGIONES
// ============================================

export const localeConfig = {
  en: {
    name: 'English',
    flag: '🇬🇧',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
  },
  pt: {
    name: 'Português',
    flag: '🇧🇷',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
  },
  it: {
    name: 'Italiano',
    flag: '🇮🇹',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
  },
} as const;

// ============================================
// NEXT-INTL CONFIG
// ============================================

export default getRequestConfig(async ({ locale }) => {
  // Validar locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale: locale as string,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'Europe/Madrid',
    now: new Date(),
  };
});
