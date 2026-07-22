import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LocaleMessages = Record<string, string>;

export interface I18nOptions {
  locale?: string;
  messages?: LocaleMessages;
  fallbackMessages?: LocaleMessages;
}

/**
 * Lightweight i18n helper for CLI prompts and messages.
 */
export class I18n {
  private readonly locale: string;
  private readonly messages: LocaleMessages;
  private readonly fallback: LocaleMessages;

  constructor(options: I18nOptions = {}) {
    this.locale = options.locale ?? 'en';
    this.messages = options.messages ?? {};
    this.fallback = options.fallbackMessages ?? {};
  }

  getLocale(): string {
    return this.locale;
  }

  t(key: string, params?: Record<string, string>): string {
    let text = this.messages[key] ?? this.fallback[key] ?? key;
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        text = text.replaceAll(`{${paramKey}}`, value);
      }
    }
    return text;
  }

  has(key: string): boolean {
    return key in this.messages || key in this.fallback;
  }
}

export function createI18n(options?: I18nOptions): I18n {
  return new I18n(options);
}

export function parseLocaleFile(content: string): LocaleMessages {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Locale file must contain a JSON object');
  }
  return parsed as LocaleMessages;
}

export function loadLocaleSync(localesDir: string, locale: string): LocaleMessages {
  const filePath = join(localesDir, `${locale}.json`);
  if (!existsSync(filePath)) {
    if (locale !== 'en') {
      return loadLocaleSync(localesDir, 'en');
    }
    return {};
  }
  return parseLocaleFile(readFileSync(filePath, 'utf8'));
}

export function createI18nFromDir(localesDir: string, locale = 'en'): I18n {
  const fallback = loadLocaleSync(localesDir, 'en');
  const messages = locale === 'en' ? fallback : loadLocaleSync(localesDir, locale);
  return createI18n({ locale, messages, fallbackMessages: fallback });
}
