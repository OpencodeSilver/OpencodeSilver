import { requestSmallModel } from '@/lib/smallModelRequest';
import { useConfigStore } from '@/stores/useConfigStore';
import { getSessionLastAssistantModel } from '@/sync/session-actions';

const PROMPT_OPTIMIZER_SYSTEM_PROMPT = [
  'You are an elite software architect, principal systems engineer, and world-class AI prompt strategist.',
  'Your mission is to convert the user’s idea or brief into an exhaustive, fully-detailed, end-to-end, multi-phase production blueprint and coding specification (from 0 to 100% finished project).',
  '',
  'CRITICAL ARCHITECTURAL GUIDELINES:',
  '1. COMPREHENSIVE END-TO-END COVERAGE (From 0 to Complete):',
  '   - Never summarize or omit crucial steps. Provide a rich, unabridged blueprint.',
  '   - Phase 0: System Architecture, Tech Stack Selection & Project Scaffold / Directory Tree.',
  '   - Phase 1: Core Domain Models, Type Schemas, Data Contracts & State Management.',
  '   - Phase 2: Complete Implementation of business logic, backend/frontend APIs, UI components, and integrations.',
  '   - Phase 3: Edge Cases, Security Protocols, Concurrency, Error Handling, and Resilience.',
  '   - Phase 4: Full Automated Testing Suite (Unit, Integration, E2E) and Validation Criteria.',
  '   - Phase 5: Build, Packaging, Deployment, CI/CD, Documentation, and Operational Runbook.',
  '2. LANGUAGE MATCHING & TRANSLATION (100% Native Fidelity):',
  '   - Respond strictly in the EXACT SAME LANGUAGE as the user prompt (e.g. if the user input is in Arabic, generate the entire detailed architecture and prompts in clear, authoritative, professional Arabic; if English, in English, etc.).',
  '   - Understand the full context, technical nuances, and translate high-level intent into technical perfection.',
  '3. READY FOR AUTONOMOUS EXECUTION:',
  '   - Structure the prompt so an autonomous AI coding agent can follow it step-by-step without hallucinating or stopping prematurely.',
  '4. OUTPUT FORMAT:',
  '   - Return ONLY the complete, structured prompt specification directly in markdown.',
  '   - DO NOT include conversational chat, introductory pleasantries ("Sure, here is..."), or concluding remarks.',
].join('\n');

export interface PromptOptimizationResult {
  optimizedPrompt: string;
  success: boolean;
}

/**
 * Optimizes user input into a structured, high-grade, end-to-end AI coding blueprint.
 */
export async function optimizePromptWithAI(
  input: string,
  sessionId?: string | null,
  options?: { fullProjectBlueprint?: boolean }
): Promise<PromptOptimizationResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { optimizedPrompt: input, success: false };
  }

  try {
    const sessionModel = sessionId ? getSessionLastAssistantModel(sessionId) : null;
    const { currentProviderId, currentModelId } = useConfigStore.getState();
    const preferredProviderID = sessionModel?.providerID || currentProviderId || '';
    const preferredModelID = sessionModel?.modelID || currentModelId || '';

    const systemPrompt = PROMPT_OPTIMIZER_SYSTEM_PROMPT;

    const response = await requestSmallModel({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: trimmed,
        system: systemPrompt,
        sessionID: sessionId || undefined,
        restrictToPreferredProvider: true,
        ...(preferredProviderID ? { preferredProviderID } : {}),
        ...(preferredModelID ? { preferredModelID } : {}),
      }),
    }, { silentStatuses: [404] });

    if (!response.ok) {
      // Fallback deep blueprint when background small model server is offline
      return {
        optimizedPrompt: fallbackHeuristicEnhancement(trimmed),
        success: true,
      };
    }

    const payload = await response.json().catch(() => null) as { text?: unknown } | null;
    const optimized = typeof payload?.text === 'string' ? payload.text.trim() : '';

    if (optimized) {
      return { optimizedPrompt: optimized, success: true };
    }

    return {
      optimizedPrompt: fallbackHeuristicEnhancement(trimmed),
      success: true,
    };
  } catch {
    return {
      optimizedPrompt: fallbackHeuristicEnhancement(trimmed),
      success: true,
    };
  }
}

/**
 * Comprehensive blueprint generator when small-model endpoint is unavailable.
 * Generates an exhaustive from-zero-to-complete specification.
 */
export function fallbackHeuristicEnhancement(input: string): string {
  const isArabic = /[\u0600-\u06FF]/.test(input);

  if (isArabic) {
    return [
      `# 🚀 المخطط الشامل لتنفيذ المشروع بالكامل من الصفر حتى الاكتمال`,
      ``,
      `## 1. فكرة المشروع والهدف العام:`,
      `${input}`,
      ``,
      `## 2. النطاق الفني والمعمارية المستهدفة (Architecture & Stack):`,
      `- **نمط المعمارية:** معمارية برمجية قياسية ونظيفة (Clean Architecture / Modular Structure) قابلة للتوسع والصيانة.`,
      `- **اللغات والتقنيات:** اختيار الحزم والمكتبات الأكثر استقراراً وملاءمة للبنية، مع الالتزام ببيئة العمل الحالية.`,
      `- **هيكلية المجلدات المقترحة:** تنظيم المسارات، ملفات التكوين، الواجهات، والوحدات الأساسية بدقة.`,
      ``,
      `## 3. مراحل التنفيذ التفصيلية خطوة بخطوة (Step-by-Step Execution):`,
      `### المرحلة 0: التهيئة وبناء الهيكل الأولي (Scaffolding & Setup):`,
      `- إنشاء وتجهيز ملفات المشروع الأساسية وحزم التبعيات (Dependencies & Config).`,
      `- تعريف النماذج البيانية والأنواع المشتركة (Data Models, Types & Schemas).`,
      ``,
      `### المرحلة 1: بناء المنطق الأساسي والمحركات (Core Implementation):`,
      `- برمجة الوظائف والمحركات البرمجية المطلوبة بالكامل دون أي توقف أو استقطاع.`,
      `- ربط مسارات التدفق البرمجي وإدارة الحالة (State Management) والتعامل مع المدخلات والمخرجات.`,
      ``,
      `### المرحلة 2: واجهة المستخدم والتفاعل (UI/UX & Integration):`,
      `- دمج المكونات التفاعلية بتصميم موحد وسلس، ودعم كامل للغات وسهولة الاستخدام.`,
      `- معالجة حالات التحميل والأخطاء والاستجابة الفورية للمستخدم.`,
      ``,
      `### المرحلة 3: التوافق وحالات الاستثناء (Resilience & Edge Cases):`,
      `- معالجة شاملة لكافة الأخطاء الاستثنائية والمدخلات غير المتوقعة وانقطاع الاتصال.`,
      `- ضمان التوافق العكسي التام (Backward Compatibility) وعدم إحداث أي خلل في الأنظمة القائمة.`,
      ``,
      `## 4. معايير القبول والفحص والاختبار (Verification & Testing):`,
      `- بناء اختبارات الوحدة (Unit Tests) والاختبارات التكاملية للتحقق من صحة كل جزء برمجي.`,
      `- تنفيذ أمر البناء النهائي والتأكد من انعدام أخطاء التحليل والترجمة (Lint & Build).`,
      `- توثيق التغييرات وكتابة دليل تشغيل أو ملاحظات الإصدار بوضوح.`,
      ``,
      `---`,
      `**تعليمات للمساعد الذكي:** ابدأ التنفيذ البرمجي الكامل والمباشر استناداً لهذا المخطط حتى إنجاز كافة المراحل بنسبة 100%.`,
    ].join('\n');
  }

  return [
    `# 🚀 Complete End-to-End Project Execution Specification`,
    ``,
    `## 1. Project Objective & Core Concept:`,
    `${input}`,
    ``,
    `## 2. Technical Scope & System Architecture:`,
    `- **Architecture Style:** Clean, modular, decoupled architecture adhering to industry best practices.`,
    `- **Technology Stack:** Fully typed, robust dependencies aligned with the project environment.`,
    `- **Folder & File Topology:** Strict organization of components, libraries, schemas, and configurations.`,
    ``,
    `## 3. Phased Implementation Roadmap (From 0 to Complete):`,
    `### Phase 0: Scaffolding & Foundations:`,
    `- Initialize dependencies, configuration manifests, and environment setup.`,
    `- Define domain models, contracts, and strict TypeScript/data schemas.`,
    ``,
    `### Phase 1: Core Engine & Business Logic Implementation:`,
    `- Build out comprehensive business logic without shortcuts or placeholders.`,
    `- Implement state management, data pipelines, API integrations, and handlers.`,
    ``,
    `### Phase 2: Interfaces & Integration:`,
    `- Complete frontend/interaction layer with responsive design and accessibility.`,
    `- Handle all loading states, progress feedback, and user interaction states.`,
    ``,
    `### Phase 3: Resilience, Security & Edge Cases:`,
    `- Full coverage of network failures, corrupted inputs, timeouts, and boundary conditions.`,
    `- Maintain strict backwards compatibility and zero regression policy.`,
    ``,
    `## 4. Acceptance Criteria & Automated Verification:`,
    `- Execute unit and integration tests to validate all critical execution paths.`,
    `- Run project builds, typecheck, and lint verification cleanly.`,
    `- Provide complete documentation and usage instructions.`,
    ``,
    `---`,
    `**Instruction for AI Agent:** Autonomously implement the entire specification from Phase 0 to completion until 100% finished.`,
  ].join('\n');
}
