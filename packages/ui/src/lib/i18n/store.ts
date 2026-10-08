import { create } from 'zustand';

import { dict as enDict, type I18nKey } from './messages/en';
import { DEFAULT_LOCALE, detectInitialLocale, type Locale, writeStoredLocale } from './runtime';

export type I18nParams = Record<string, string | number | boolean | null | undefined>;
export type I18nDictionary = Record<I18nKey, string>;

type I18nState = {
  locale: Locale;
  dictionary: I18nDictionary;
  loadingLocale: Locale | null;
  setLocale: (locale: Locale) => void;
};

const dictionaries = new Map<Locale, I18nDictionary>([['en', enDict]]);

export function resetI18nDictionaryCacheForTests(): void {
  dictionaries.clear();
  dictionaries.set('en', enDict);
}

async function loadDictionary(locale: Locale): Promise<I18nDictionary> {
  const cached = dictionaries.get(locale);
  if (cached) {
    return cached;
  }

  const mod = locale === 'ar'
    ? await import('./messages/ar') as { dict: I18nDictionary }
    : locale === 'zh-CN'
    ? await import('./messages/zh-CN') as { dict: I18nDictionary }
    : locale === 'fr'
      ? await import('./messages/fr') as { dict: I18nDictionary }
      : locale === 'nl'
        ? await import('./messages/nl') as { dict: I18nDictionary }
    : locale === 'zh-TW'
      ? await import('./messages/zh-TW') as { dict: I18nDictionary }
      : locale === 'es'
        ? await import('./messages/es') as { dict: I18nDictionary }
        : locale === 'pt-BR'
          ? await import('./messages/pt-BR') as { dict: I18nDictionary }
          : locale === 'uk'
            ? await import('./messages/uk') as { dict: I18nDictionary }
            : locale === 'ko'
              ? await import('./messages/ko') as { dict: I18nDictionary }
              : locale === 'pl'
                ? await import('./messages/pl') as { dict: I18nDictionary }
                : locale === 'de'
                  ? await import('./messages/de') as { dict: I18nDictionary }
                  : locale === 'ja'
                    ? await import('./messages/ja') as { dict: I18nDictionary }
                    : locale === 'tr'
                      ? await import('./messages/tr') as { dict: I18nDictionary }
                      : { dict: enDict };
  dictionaries.set(locale, mod.dict);
  return mod.dict;
}

export const useI18nStore = create<I18nState>()((set, get) => ({
  locale: DEFAULT_LOCALE,
  dictionary: enDict,
  loadingLocale: null,
  setLocale: (locale) => {
    const current = get();
    const cached = dictionaries.get(locale);
    if (current.locale === locale && current.loadingLocale !== locale && cached) {
      return;
    }

    writeStoredLocale(locale);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = 'ltr';
    }

    set({
      locale,
      dictionary: cached ?? current.dictionary,
      loadingLocale: cached ? null : locale,
    });

    if (cached) {
      return;
    }

    void loadDictionary(locale).then((dictionary) => {
      if (get().locale !== locale) {
        return;
      }
      set({ dictionary, loadingLocale: null });
    }).catch((error) => {
      console.error(`[i18n] failed to load locale ${locale}`, error);
      if (get().locale === locale) {
        set({ dictionary: enDict, loadingLocale: null });
      }
    });
  },
}));

export function initializeLocale(): void {
  const initial = detectInitialLocale();
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial;
    document.documentElement.dir = 'ltr';
  }
  useI18nStore.getState().setLocale(initial);
}

export function formatMessage(dictionary: I18nDictionary, key: I18nKey, params?: I18nParams): string {
  const template = dictionary[key] ?? enDict[key] ?? key;
  if (!params) {
    return template;
  }

  return template.replace(/\{([^{}]+)\}/g, (match, rawKey) => {
    const value = params[rawKey.trim()];
    return value === null || value === undefined ? match : String(value);
  });
}

export type { I18nKey, Locale };
