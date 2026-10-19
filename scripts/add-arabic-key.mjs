import fs from 'node:fs';

const ARABIC_LABELS = {
  'en.ts': "  'common.language.arabic': 'Arabic',",
  'de.ts': "  'common.language.arabic': 'Arabisch',",
  'fr.ts': "  'common.language.arabic': 'Arabe',",
  'es.ts': '  "common.language.arabic": "Árabe",',
  'nl.ts': "  'common.language.arabic': 'Arabisch',",
  'ja.ts': "  'common.language.arabic': 'アラビア語',",
  'ko.ts': "  'common.language.arabic': '아랍어',",
  'pl.ts': "  'common.language.arabic': 'Arabski',",
  'pt-BR.ts': '  "common.language.arabic": "Árabe",',
  'tr.ts': "  'common.language.arabic': 'Arapça',",
  'uk.ts': '  "common.language.arabic": "Арабська",',
  'zh-CN.ts': "  'common.language.arabic': '阿拉伯语',",
  'zh-TW.ts': "  'common.language.arabic': '阿拉伯語',",
};

for (const [file, line] of Object.entries(ARABIC_LABELS)) {
  const p = 'packages/ui/src/lib/i18n/messages/' + file;
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('common.language.arabic')) {
    content = content.replace(/(['"]common\.language\.english['"])/, line + '\n$1');
    fs.writeFileSync(p, content, 'utf8');
    console.log('Added to', file);
  } else {
    console.log('Already in', file);
  }
}
