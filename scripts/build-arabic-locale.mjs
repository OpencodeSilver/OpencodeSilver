import fs from 'node:fs';
import path from 'node:path';
import { dict as enDict } from '../packages/ui/src/lib/i18n/messages/en.ts';
import { settingsDict as enSettingsDict } from '../packages/ui/src/lib/i18n/messages/en.settings.ts';

const CACHE_FILE = path.join(import.meta.dirname, 'ar-translations-cache.json');

const OVERRIDES = {
  'common.language.arabic': 'العربية',
  'common.language.english': 'الإنجليزية',
  'common.language.french': 'الفرنسية',
  'common.language.dutch': 'الهولندية',
  'common.language.simplifiedChinese': 'الصينية المبسطة',
  'common.language.traditionalChinese': 'الصينية التقليدية',
  'common.language.ukrainian': 'الأوكرانية',
  'common.language.spanish': 'الإسبانية',
  'common.language.brazilianPortuguese': 'البرتغالية (البرازيل)',
  'common.language.korean': 'الكورية',
  'common.language.polish': 'البولندية',
  'common.language.german': 'الألمانية',
  'common.language.japanese': 'اليابانية',
  'common.language.turkish': 'التركية',

  'settings.sourceControl.transport.anonymous': 'HTTPS مجهول، للقراءة فقط',
  'settings.opencodesilver.visual.option.largeTextPaste.inlineDoublePaste.label': 'لصق مضمن، لصق مزدوج للإرفاق',
  'settings.opencodesilver.visual.field.largeTextPasteHint': 'الصق النص الطويل مضمناً، أو الصق مرتين لإرفاقه كملف.',

  'chat.workStatus.telemetry.responseSpeed': 'الاستجابة',
  'chat.workStatus.telemetry.responseSpeedDescription': 'مدى سرعة وصول النص النهائي، باستثناء الانتظار الأولي والتفكير واستدعاءات الأدوات السابقة.',
  'chat.workStatus.telemetry.speed': 'الدورة كاملة',
  'chat.workStatus.telemetry.speedDescription': 'الرموز المولدة عبر جميع الخطوات، بما في ذلك التفكير، مقسومة على الوقت بعد استبعاد تشغيل الأدوات.',
  'chat.workStatus.telemetry.llmDuration': 'وقت النموذج',
  'chat.workStatus.telemetry.llmDurationDescription': 'الوقت المستغرق في جميع خطوات النموذج، بما في ذلك انتظار الاستجابات، دون وقت تشغيل الأدوات.',
  'chat.workStatus.telemetry.toolDuration': 'وقت الأدوات',
  'chat.workStatus.telemetry.toolDurationDescription': 'الوقت المستغرق في تشغيل الأدوات، بما في ذلك الاستدعاءات غير الناجحة، وتُحسب الأدوات المتزامنة مرة واحدة.',
  'chat.workStatus.telemetry.ttft': 'متوسط TTFT',
  'chat.workStatus.telemetry.ttftDescription': 'متوسط وقت الانتظار قبل بدء ظهور أول نص أو تفكير في كل خطوة من خطوات النموذج المستخدم.',
  'chat.workStatus.telemetry.steps': 'الخطوات',
  'chat.workStatus.telemetry.stepsDescription': 'عدد المرات التي تم فيها استدعاء النموذج لهذه المطالبة لقراءة نتائج الأدوات والتخطيط للخطوة التالية.',
  'chat.workStatus.telemetry.tokens': 'الرموز',
  'chat.workStatus.telemetry.tokens.inOut': '{input} إدخال · {output} إخراج',
  'chat.workStatus.telemetry.tokensDescription': '↑ الإدخال بدون المخزن مؤقتاً: {input}. ↓ الرموز المولدة: {output} للنص واستدعاءات الأدوات، بالإضافة إلى {reasoning} للتفكير. تغطي الإجماليات جميع خطوات هذه المطالبة.',
  'chat.workStatus.telemetry.cacheHit': 'ذاكرة التخزين',
  'chat.workStatus.telemetry.cacheHitDescription': 'نسبة رموز الإدخال المعاد استخدامها من ذاكرة التخزين المؤقت للمطالبات عبر جميع الخطوات.',
  'chat.workStatus.telemetry.cost': 'التكلفة',
  'chat.workStatus.telemetry.costDescription': 'التكلفة المبلغ عنها من المزود لجميع خطوات النموذج لهذه المطالبة بالدولار الأمريكي، باستثناء جلسات الوكلاء الفرعيين.',
};

let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached translations.`);
  } catch (e) {
    console.error('Failed reading cache:', e);
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

function maskVariables(text) {
  const vars = [];
  const masked = text.replace(/\{[a-zA-Z0-9_]+\}/g, (m) => {
    const idx = vars.length;
    vars.push(m);
    return `QVAR${idx}Q`;
  });
  return { masked, vars };
}

function unmaskVariables(translated, vars) {
  let result = translated;
  vars.forEach((v, idx) => {
    result = result.replace(new RegExp(`QVAR\\s*${idx}\\s*Q`, 'gi'), v);
  });
  for (const v of vars) {
    if (!result.includes(v)) {
      result += ` ${v}`;
    }
  }
  return result.trim();
}

async function translateWithClients5(text) {
  const url = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=ar&q=' + encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : String(data);
}

async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
  const data = await res.json();
  if (data.responseData && data.responseData.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('MyMemory returned no translation');
}

async function translateSingle(text) {
  if (!text || !text.trim() || /^[\d\s.,:;!?()[\]{}<>\/\\@#$%^&*+=\-_~`|'"]+$/.test(text)) {
    return text;
  }

  const { masked, vars } = maskVariables(text);

  // Try clients5
  try {
    const trans = await translateWithClients5(masked);
    return unmaskVariables(trans, vars);
  } catch (err) {
    // Try MyMemory
    try {
      const trans = await translateWithMyMemory(masked);
      return unmaskVariables(trans, vars);
    } catch (err2) {
      console.warn(`Translation failed for: "${text.slice(0, 30)}..."`);
      return text;
    }
  }
}

async function translateBatch(items) {
  const delimiter = '\n@@@\n';
  const maskedItems = [];
  const allVars = [];

  for (const it of items) {
    const { masked, vars } = maskVariables(it);
    maskedItems.push(masked);
    allVars.push(vars);
  }

  try {
    const raw = await translateWithClients5(maskedItems.join(delimiter));
    const parts = raw.split(/\s*@@@\s*/);
    if (parts.length === items.length) {
      return parts.map((p, i) => unmaskVariables(p, allVars[i]));
    }
  } catch (e) {
    // ignore, fall back to individual translation
  }

  // Fallback to individual
  const results = [];
  for (const it of items) {
    results.push(await translateSingle(it));
  }
  return results;
}

async function run() {
  const allKeys = Object.keys(enDict);
  console.log(`Total keys: ${allKeys.length}`);

  // Collect pending texts
  const pending = [];
  for (const key of allKeys) {
    if (OVERRIDES[key]) continue;
    const enText = enDict[key];
    if (typeof enText !== 'string' || !enText.trim()) continue;
    if (!cache[enText]) {
      pending.push(enText);
    }
  }

  const uniquePending = Array.from(new Set(pending));
  console.log(`Unique texts needing translation: ${uniquePending.length}`);

  const BATCH_SIZE = 12;
  const batches = [];
  for (let i = 0; i < uniquePending.length; i += BATCH_SIZE) {
    batches.push(uniquePending.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches...`);
  const CONCURRENCY = 4;
  let batchCursor = 0;
  let completed = 0;

  async function worker() {
    while (batchCursor < batches.length) {
      const idx = batchCursor++;
      const batch = batches[idx];
      const results = await translateBatch(batch);
      for (let i = 0; i < batch.length; i++) {
        cache[batch[i]] = results[i] || batch[i];
      }
      completed += batch.length;
      if (idx % 5 === 0 || completed >= uniquePending.length) {
        saveCache();
        process.stdout.write(`\rProgress: ${completed} / ${uniquePending.length} (${Math.round((completed / uniquePending.length) * 100)}%)`);
      }
      await new Promise(r => setTimeout(r, 150));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  saveCache();

  console.log('\nAll translations finished. Writing files...');

  const arDict = {};
  for (const key of allKeys) {
    if (OVERRIDES[key]) {
      arDict[key] = OVERRIDES[key];
    } else {
      const enVal = enDict[key];
      arDict[key] = cache[enVal] || enVal;
    }
  }

  for (const [k, v] of Object.entries(OVERRIDES)) {
    arDict[k] = v;
  }

  const settingsKeys = new Set(Object.keys(enSettingsDict));
  const arSettingsObj = {};
  const arMainObj = {};

  for (const key of allKeys) {
    if (settingsKeys.has(key)) {
      arSettingsObj[key] = arDict[key];
    } else {
      arMainObj[key] = arDict[key];
    }
  }

  const arSettingsPath = path.join(import.meta.dirname, '../packages/ui/src/lib/i18n/messages/ar.settings.ts');
  const arSettingsContent = `export const settingsDict = ${JSON.stringify(arSettingsObj, null, 2)} as const;\n`;
  fs.writeFileSync(arSettingsPath, arSettingsContent, 'utf8');
  console.log(`Wrote ar.settings.ts (${Object.keys(arSettingsObj).length} keys).`);

  const arPath = path.join(import.meta.dirname, '../packages/ui/src/lib/i18n/messages/ar.ts');
  const arMainContent = `import type { I18nKey } from './en';
import { settingsDict } from './ar.settings';

export const dict: Record<I18nKey, string> = {
  ...settingsDict,
${Object.entries(arMainObj)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n')}
};
`;
  fs.writeFileSync(arPath, arMainContent, 'utf8');
  console.log(`Wrote ar.ts (${Object.keys(arDict).length} keys).`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
