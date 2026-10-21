import { describe, expect, it } from 'bun:test';
import { SilverArabicEngine } from '../i18n/arabic-nlp';

describe('SilverArabicEngine Unit Tests', () => {
  const engine = new SilverArabicEngine();

  describe('normalizeArabic', () => {
    it('removes diacritics (tashkeel)', () => {
      const text = 'مَرْحَبًا بِكُمْ فِي أُوبِن كُود سِلْفِر';
      expect(engine.normalizeArabic(text)).toBe('مرحبا بكم في اوبن كود سلفر');
    });

    it('removes tatweel (kashida)', () => {
      const text = 'ســـــلـــــفـــــر';
      expect(engine.normalizeArabic(text)).toBe('سلفر');
    });

    it('normalizes alef variants (إ, أ, آ, ٱ) to plain alef (ا)', () => {
      const text = 'إصدار أداة آمنة ٱستقرار';
      expect(engine.normalizeArabic(text)).toBe('اصدار اداه امنه استقرار');
    });

    it('normalizes yaa (ى) to (ي)', () => {
      const text = 'علي ومصطفى وهدى';
      expect(engine.normalizeArabic(text)).toBe('علي ومصطفي وهدي');
    });

    it('normalizes teh marbuta (ة) to (ه)', () => {
      const text = 'منصة برمجة ذكية متطورة';
      expect(engine.normalizeArabic(text)).toBe('منصه برمجه ذكيه متطوره');
    });
  });

  describe('isRTL', () => {
    it('identifies pure Arabic text as RTL', () => {
      expect(engine.isRTL('مرحبا بالعالم')).toBe(true);
      expect(engine.isRTL('منصة أوبن كود سيلفر')).toBe(true);
    });

    it('identifies English / Latin text as not RTL', () => {
      expect(engine.isRTL('Hello World')).toBe(false);
      expect(engine.isRTL('OpencodeSilver workspace')).toBe(false);
    });

    it('identifies text starting with Arabic followed by English code as RTL', () => {
      expect(engine.isRTL('قم بتشغيل الأمر `bun run build` الآن')).toBe(true);
    });

    it('identifies text starting with English followed by Arabic as not RTL', () => {
      expect(engine.isRTL('Run the command `bun run build` الآن')).toBe(false);
    });

    it('returns false for pure numbers, symbols, or empty string', () => {
      expect(engine.isRTL('12345')).toBe(false);
      expect(engine.isRTL('---')).toBe(false);
      expect(engine.isRTL('')).toBe(false);
    });
  });

  describe('formatBilingualMarkdown', () => {
    it('wraps inline code backticks in neutral Unicode directional isolates', () => {
      const input = 'استخدم الأمر `git status` لعرض الحالة.';
      const output = engine.formatBilingualMarkdown(input);
      expect(output).toContain('\u202A`git status`\u202C');
    });
  });
});
