import { beforeEach, describe, expect, test } from 'bun:test';
import { DEFAULT_LOCALE, isRtlLocale, type Locale } from './runtime';
import { initializeLocale, resetI18nDictionaryCacheForTests, useI18nStore } from './store';

const defaultDictionary = useI18nStore.getState().dictionary;

const resetStore = () => {
  resetI18nDictionaryCacheForTests();
  useI18nStore.setState({
    locale: DEFAULT_LOCALE,
    dictionary: defaultDictionary,
    loadingLocale: null,
  });
};

const waitForLocaleLoadToSettle = async (locale: Locale) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (useI18nStore.getState().loadingLocale !== locale) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${locale} dictionary load`);
};

describe('i18n store', () => {
  beforeEach(resetStore);

  test('retries loading the active locale when it is not cached', async () => {
    useI18nStore.setState({
      locale: 'es',
      dictionary: defaultDictionary,
      loadingLocale: null,
    });

    try {
      useI18nStore.getState().setLocale('es');

      expect(useI18nStore.getState().loadingLocale).toBe('es');
      await waitForLocaleLoadToSettle('es');
    } finally {
      resetStore();
    }
  });

  test('loads the french dictionary', async () => {
    try {
      useI18nStore.getState().setLocale('fr');

      expect(useI18nStore.getState().loadingLocale).toBe('fr');
      await waitForLocaleLoadToSettle('fr');
      expect(useI18nStore.getState().dictionary['common.language.french']).toBe('Français');
    } finally {
      resetStore();
    }
  });

  test('loads the arabic dictionary', async () => {
    try {
      useI18nStore.getState().setLocale('ar');

      expect(useI18nStore.getState().loadingLocale).toBe('ar');
      await waitForLocaleLoadToSettle('ar');
      expect(useI18nStore.getState().dictionary['common.language.arabic']).toBe('العربية');
    } finally {
      resetStore();
    }
  });

  test('arabic dictionary covers every key defined in english', async () => {
    const { dict: enDict } = await import('./messages/en');
    const { dict: arDict } = await import('./messages/ar');

    const missingKeys: string[] = [];
    for (const key of Object.keys(enDict)) {
      if (!(key in arDict) || (arDict as Record<string, string>)[key] === undefined) {
        missingKeys.push(key);
      }
    }

    expect(missingKeys).toEqual([]);
  });

  test('isRtlLocale returns false to preserve LTR workspace layout', () => {
    expect(isRtlLocale('ar')).toBe(false);
    expect(isRtlLocale('fa')).toBe(false);
    expect(isRtlLocale('he')).toBe(false);
    expect(isRtlLocale('ur')).toBe(false);
    expect(isRtlLocale('en')).toBe(false);
    expect(isRtlLocale('ja')).toBe(false);
  });

  test('keeps document.documentElement.dir as ltr across all locales', () => {
    const originalDoc = globalThis.document;
    const mockDoc = {
      documentElement: {
        lang: 'en',
        dir: 'ltr',
      },
    };
    (globalThis as unknown as { document: typeof mockDoc }).document = mockDoc;

    try {
      useI18nStore.getState().setLocale('ar');
      expect(mockDoc.documentElement.dir).toBe('ltr');
      expect(mockDoc.documentElement.lang).toBe('ar');

      useI18nStore.getState().setLocale('en');
      expect(mockDoc.documentElement.dir).toBe('ltr');
      expect(mockDoc.documentElement.lang).toBe('en');

      useI18nStore.getState().setLocale('ja');
      expect(mockDoc.documentElement.dir).toBe('ltr');
      expect(mockDoc.documentElement.lang).toBe('ja');
    } finally {
      (globalThis as unknown as { document: typeof originalDoc }).document = originalDoc;
      resetStore();
    }
  });
});
