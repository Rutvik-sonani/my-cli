import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createI18n, createI18nFromDir, loadLocaleSync } from '../src/i18n.js';

describe('I18n', () => {
  it('translates keys with fallback', () => {
    const i18n = createI18n({
      locale: 'es',
      messages: { hello: 'Hola' },
      fallbackMessages: { goodbye: 'Goodbye' },
    });
    expect(i18n.t('hello')).toBe('Hola');
    expect(i18n.t('goodbye')).toBe('Goodbye');
    expect(i18n.t('missing')).toBe('missing');
  });

  it('interpolates parameters', () => {
    const i18n = createI18n({
      messages: { greet: 'Hello {name}' },
    });
    expect(i18n.t('greet', { name: 'World' })).toBe('Hello World');
  });

  it('loads locale files from directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mycli-i18n-'));
    await writeFile(join(dir, 'en.json'), JSON.stringify({ key: 'value' }));
    await writeFile(join(dir, 'fr.json'), JSON.stringify({ key: 'valeur' }));

    expect(loadLocaleSync(dir, 'en').key).toBe('value');
    expect(createI18nFromDir(dir, 'fr').t('key')).toBe('valeur');
    expect(createI18nFromDir(dir, 'de').t('key')).toBe('value');

    await rm(dir, { recursive: true, force: true });
  });

  it('loads Hindi doctor intro from repo locales', async () => {
    const localesRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../locales');
    const i18n = createI18nFromDir(localesRoot, 'hi');
    expect(i18n.t('doctor_intro')).toBe('MyCLI डॉक्टर');
    expect(i18n.t('doctor_attention', { count: '2' })).toContain('2');
  });
});
