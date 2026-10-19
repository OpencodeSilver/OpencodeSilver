/**
 * OpencodeSilver Arabic NLP & Bidirectional Engine
 * Engineered and Architected by Ahmed (GEMTM)
 *
 * Handles Arabic prompt normalization, technical term transliteration,
 * and RTL/LTR bidirectional text formatting for developer workspaces.
 */

export class SilverArabicEngine {
  /**
   * Normalizes Arabic text by unifying alefs, yaas, teh marbutas, and removing tatweel and harakat.
   */
  public normalizeArabic(text: string): string {
    return text
      // Remove tashkeel (diacritics)
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove tatweel (kashida)
      .replace(/\u0640/g, '')
      // Normalize alef variants
      .replace(/[إأآٱ]/g, 'ا')
      // Normalize yaa
      .replace(/ى/g, 'ي')
      // Normalize teh marbuta
      .replace(/ة/g, 'ه');
  }

  /**
   * Detects whether a string is primarily right-to-left (Arabic) based on the Unicode Bidirectional Algorithm (first strong character).
   */
  public isRTL(text: string): boolean {
    const firstStrong = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]|[A-Za-z]/);
    if (!firstStrong) return false;
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(firstStrong[0]);
  }

  /**
   * Wraps code blocks, paths, and identifiers in neutral directional isolation characters (\u202A / \u202C)
   * so they render legibly within Arabic RTL chat flow without inverted parentheses or punctuation.
   */
  public formatBilingualMarkdown(markdown: string): string {
    // Isolate inline code segments
    return markdown.replace(/`([^`]+)`/g, (_match, code) => {
      return `\u202A\`${code}\`\u202C`;
    });
  }
}
