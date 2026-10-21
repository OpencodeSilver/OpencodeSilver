# خطة إصلاح تطبيق سطح المكتب OpencodeSilver (Windows)

> **إلى المساعد (Antigravity):** نفّذ هذه الخطة بالترتيب داخل هذا المستودع.
> بعض الإصلاحات طُبّقت مسبقاً في الكود. مهمتك أن **تتحقق منها**، وتكمل ما بقي، وتبني المثبِّت، وتختبره.
> لا تحذف أي إصلاح موصوف هنا. لا تغيّر مسار التثبيت ولا `appId`.
> بعد كل مرحلة شغّل أمر التحقق المذكور فيها، ولا تنتقل إلى المرحلة التالية قبل أن ينجح.

---

## 0. ملخص المشاكل

| # | العَرَض عند المستخدم | السبب الجذري | الحالة |
|---|---|---|---|
| 1 | البرنامج يفتح ثم يُغلق فوراً | `web/server/lib/silver-intelligence/index.js` كان يستورد `../../../../core/src/index.ts` (ملف TypeScript). داخل `app.asar` يفشل Node بالخطأ `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`، فيفشل التشغيل ويُغلق التطبيق | ✅ أُصلح، ويحتاج تحققاً |
| 2 | نافذة خطأ: `TypeError: Object has been destroyed` | فشل التشغيل يُغلق النافذة بينما صفحتها ما زالت ترسل الحدثين `dom-ready` و`did-finish-load`. المعالِجات كانت تقرأ `browserWindow.webContents` من نافذة مُدمَّرة | ✅ أُصلح، ويحتاج تحققاً |
| 3 | المثبِّت لا يغلق البرنامج ويطلب «إعادة المحاولة» دائماً | التطبيق يختبئ في شريط النظام (tray) بدل أن يُغلق، ويشغّل `opencode.exe` في الخلفية. مثبِّت NSIS لم يكن فيه خطوة تغلقهما | ✅ أُصلح، ويحتاج تحققاً |
| 4 | فشل البناء: `EBUSY: resource busy or locked, rm ...\dist\win-unpacked` | نسخة من التطبيق، أو `opencode.exe` التابع لها، تعمل من مجلد `dist\win-unpacked` وتقفله | ✅ أُصلح، ويحتاج تحققاً |

---

## المرحلة 1: التحقق من إصلاح التشغيل (المشكلة 1)

**الملف:** `packages/web/server/lib/silver-intelligence/index.js`

يجب أن يكون الاستيراد هكذا:
```js
import {
  SilverMissionOrchestrator,
  SilverConsensusMatrix,
  SilverCodeInspector,
  SilverClaudeBridge,
  SilverArabicEngine,
} from '@opencodesilver/core';
```

**المهام:**
1. تأكد من أن `packages/core/package.json` يحتوي `"main": "./dist/index.js"` و`exports["."].default = "./dist/index.js"`.
2. ابحث في كل الكود الذي يعمل وقت التشغيل عن أي استيراد آخر لملف `.ts`، أو أي استيراد مباشر لـ `core/src`، وأصلحه بنفس الطريقة. ابحث في `packages/web/server/**` و`packages/web/bin/**` و`packages/electron/*.mjs`:
   ```bash
   grep -rnE "from ['\"][^'\"]*\.ts['\"]|core/src" packages/web/server packages/web/bin packages/electron/*.mjs --include=*.js --include=*.mjs | grep -v node_modules | grep -v "\.test\."
   ```
   **النتيجة المطلوبة:** لا يظهر أي سطر.
3. ابنِ مكتبة `core`:
   ```bash
   bun run --cwd packages/core build
   ```
   **النتيجة المطلوبة:** يوجد الملف `packages/core/dist/index.js`، ويصدّر الأسماء الخمسة المذكورة أعلاه.
4. **ملاحظة اختيارية:** `package.json` في `core` يذكر `"types": "./dist/index.d.ts"` لكن هذا الملف لا يُولَّد. أضف توليده بـ `tsc --emitDeclarationOnly`، أو احذف الإشارة إليه، بشرط ألا يكسر ذلك `type-check`.

---

## المرحلة 2: التحقق من إصلاح «Object has been destroyed» (المشكلة 2)

**الملف:** `packages/electron/main.mjs`

تحقّق من الدالتين `createBrowserWindow` (النافذة الرئيسية) ودالة إنشاء نافذة Mini Chat:
- يُحفَظ `const contents = browserWindow.webContents;` و`const isGone = () => browserWindow.isDestroyed() || contents.isDestroyed();` قبل تسجيل المعالِجات.
- كل معالِج للأحداث `will-frame-navigate` و`zoom-changed` و`dom-ready` و`did-finish-load`، ومعالج `ready-to-show` في النافذة الرئيسية، يبدأ بالسطر `if (isGone()) return;`.
- داخل هذه المعالِجات يُستخدم `contents` وليس `browserWindow.webContents`.

**مهمة إضافية:** ابحث عن أي مكان آخر يقرأ `browserWindow.webContents` أو `state.mainWindow.webContents` داخل callback غير متزامن (مثل `setTimeout`، أو `.then`، أو حدث) بدون فحص `isDestroyed()`، وأضف الفحص.

**التحقق:**
```bash
bun run --cwd packages/electron type-check
bun run --cwd packages/electron test
```

> الملفات `packages/electron/dist-bundle/*.mjs` تُعاد كتابتها عند كل بناء بالأمر `bun run bundle:main` (هو جزء من `package`). لا تعدّلها يدوياً. المصدر الصحيح هو `main.mjs`.

---

## المرحلة 3: التحقق من إغلاق البرنامج أثناء التثبيت (المشكلة 3)

**الملفات:**
- `packages/electron/resources/installer.nsh`: يعرّف الماكرو `customCheckAppRunning`، وهو يفعل الآتي:
  1. يعدّ العمليات التي تعمل: `opencodesilver.exe`، وأي عملية مسارها داخل `$INSTDIR`، و`resources\opencode-cli\opencode.exe`.
  2. إذا وجد عمليات تعمل، يعرض رسالة «موافق / إلغاء». «موافق» يغلق البرنامج، و«إلغاء» يوقف التثبيت.
  3. يغلق البرنامج بالأمر `taskkill /F /T` ثم `Stop-Process`، ويتحقق حتى 5 مرات. إذا فشل يعرض «إعادة المحاولة / إلغاء».
- `packages/electron/package.json`: داخل `build.nsis` يوجد السطر `"include": "resources/installer.nsh"`.

**قيود:**
- لا تُغلق أي `opencode.exe` مثبّت بشكل مستقل خارج مجلد التطبيق.
- يجب أن يُترجَم السكربت بدون تحذيرات، لأن electron-builder يعامل التحذيرات كأخطاء.

**التحقق:** في سجل البناء لا يظهر أي خطأ NSIS. ثم اختبر يدوياً كما في المرحلة 6.

---

## المرحلة 4: التحقق من سكربت البناء (المشكلة 4)

**الملف:** `packages/electron/scripts/package.mjs`

على Windows، وقبل تشغيل electron-builder:
1. يُغلق كل عملية مسارها داخل `packages/electron/dist\`.
2. يحذف `dist\win-unpacked`، مع حتى 10 محاولات.
3. إذا بقي المجلد مقفولاً، يبني في مجلد بديل باسم `dist-YYYYMMDDHHMMSS` عبر `-c.directories.output=...`، ويطبع رسالة بذلك.

**مهمة تنظيف:**
1. أغلق كل نسخ التطبيق.
2. احذف مجلدات البناء القديمة: `packages/electron/dist` وكل `packages/electron/dist-*`. إذا كانت مقفولة، أعد تشغيل الجهاز ثم احذفها.
3. تأكد من أن `.gitignore` يتجاهل `dist-*/`، وأضفه إن لم يكن موجوداً.

---

## المرحلة 5: البناء الكامل

من جذر المستودع:
```bash
bun install
bun run type-check
bun run test
bun run electron:build
```
السكربت `package` في `packages/electron/package.json` يجب أن يبدأ بالأمر `bun run --cwd ../core build && ...`.

**النتيجة المطلوبة:**
- يُنشأ الملف `packages/electron/dist*/OpencodeSilver-3.0.0-win-x64.exe` بدون أخطاء.
- يوجد المجلد `win-unpacked/resources/app.asar/node_modules/@opencodesilver/core/dist/index.js`.

---

## المرحلة 6: اختبار تشغيلي إلزامي (لا يُعتبر العمل منتهياً بدونه)

مسار سجل البرنامج: `%APPDATA%\opencodesilver\logs\main.log`

1. **تشغيل النسخة غير المثبّتة:** شغّل `dist*\win-unpacked\opencodesilver.exe`.
   - يجب أن تبقى النافذة مفتوحة وتظهر الواجهة.
   - يجب ألا يظهر في آخر `main.log` السطر `startup failed`.
   - يجب ألا تظهر نافذة "A JavaScript error occurred in the main process".
2. **التثبيت فوق نسخة تعمل:**
   1. ثبّت النسخة الجديدة وشغّلها.
   2. أغلق نافذتها، فتختبئ في شريط النظام.
   3. شغّل المثبِّت مرة أخرى.
   - يجب أن تظهر رسالة «البرنامج يعمل… اضغط موافق لإغلاقه».
   - بعد «موافق» يجب أن يكتمل التثبيت بدون «إعادة المحاولة».
3. **التثبيت والبرنامج مغلق:** يجب أن يتم بدون أي رسالة.
4. **إلغاء التثبيت والبرنامج يعمل:** يجب أن تظهر نفس رسالة الإغلاق، ثم يُزال البرنامج.
5. **الإغلاق السريع:** افتح البرنامج ثم أغلقه بسرعة، وكرّر ذلك 5 مرات. يجب ألا تظهر أي نافذة خطأ.
6. **البحث في السجل:** ابحث في `main.log` عن الكلمات `Object has been destroyed` و`startup failed` و`ERR_`. يجب ألا تظهر أي منها في التشغيلات الجديدة.

---

## المرحلة 7: تحسينات اختيارية (فقط بعد نجاح كل ما سبق)

- **اسم مجلد التثبيت:** حالياً `%LOCALAPPDATA%\Programs\@opencodesilverelectron`، وهو مشتق من اسم الحزمة `@opencodesilver/electron`. تغييره يغيّر مسار التثبيت ويحتاج ترحيلاً للنسخ القديمة. لا تغيّره إلا بطلب صريح.
- **رسالة الخطأ عند فشل التشغيل:** إذا فشل التشغيل (`startup failed`)، اعرض للمستخدم رسالة واضحة فيها مسار ملف السجل، بدل أن يُغلق البرنامج بصمت. استخدم `dialog.showErrorBox` قبل `app.quit()`.
- **ملفات `dist-bundle`:** حالياً `entry.mjs` يحتوي كل كود `main.mjs` بداخله، لأن `external: ['./main.mjs']` في `scripts/bundle-main.mjs` لا يُطبَّق على نقاط الدخول. هذا يعمل، لكنه يجعل الحجم مضاعفاً. راجعه فقط إن أردت تقليل حجم الحزمة.

---

## قائمة التسليم

- [ ] لا يوجد أي استيراد لملف `.ts` أو لـ `core/src` في الكود الذي يعمل وقت التشغيل
- [ ] `type-check` و`test` ينجحان
- [ ] `electron:build` ينجح ويُنتج المثبِّت
- [ ] البرنامج المثبّت يفتح ويبقى مفتوحاً
- [ ] المثبِّت يغلق البرنامج تلقائياً بعد تأكيد المستخدم
- [ ] لا تظهر أي نافذة خطأ عند فتح البرنامج وإغلاقه بسرعة
- [ ] اكتب تقريراً قصيراً بما تغيّر، والملفات المعدّلة، ونتائج الاختبارات
