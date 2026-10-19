/**
 * Discover categories: the cards under the Discover lists and how an item is
 * filed under them (explicit categories, then tags, then keywords in its
 * name and description).
 */

import type React from 'react';

import type { I18nKey } from '@/lib/i18n';
import {
    EngineeringIllustration,
    CodeIllustration,
    FilesDocumentsIllustration,
    DesignsMediaIllustration,
    PipelinesJobsIllustration,
    TicketsTasksIllustration,
    ApisIllustration,
    NotesMemoryIllustration,
    AiModelsAgentsIllustration,
    DataAnalyticsIllustration,
    DevopsIllustration,
    SecurityIllustration,
    TestingIllustration,
    OtherIllustration,
    type IllustrationProps,
} from './discoverIllustrations';

export interface DiscoverCategory {
    id: string;
    labelKey: I18nKey;
    illustration: React.FC<IllustrationProps>;
    keywords: readonly string[];
}

export const DISCOVER_CATEGORIES: readonly DiscoverCategory[] = [
    {
        id: 'engineering',
        labelKey: 'settings.customize.discover.category.engineering',
        illustration: EngineeringIllustration,
        keywords: ["engineer", "engineering", "architecture", "system", "build", "framework", "protocol", "runtime", "infrastructure", "backend", "frontend", "fullstack", "compile", "toolchain", "sdk", "lib", "library", "web", "browser"],
    },
    {
        id: 'code',
        labelKey: 'settings.customize.discover.category.code',
        illustration: CodeIllustration,
        keywords: ["code", "coding", "refactor", "syntax", "typescript", "javascript", "python", "rust", "go", "java", "c++", "csharp", "php", "ruby", "git", "diff", "lint", "formatter", "function", "class", "method"],
    },
    {
        id: 'files-documents',
        labelKey: 'settings.customize.discover.category.files-documents',
        illustration: FilesDocumentsIllustration,
        keywords: ["file", "files", "document", "documents", "doc", "docs", "pdf", "markdown", "sheet", "csv", "read", "write", "filesystem", "directory", "folder", "wiki", "documentation"],
    },
    {
        id: 'designs-media',
        labelKey: 'settings.customize.discover.category.designs-media',
        illustration: DesignsMediaIllustration,
        keywords: ["design", "media", "ui", "ux", "css", "tailwind", "style", "color", "icon", "image", "photo", "svg", "canvas", "video", "audio", "figma", "layout", "graphic", "art", "asset"],
    },
    {
        id: 'pipelines-jobs',
        labelKey: 'settings.customize.discover.category.pipelines-jobs',
        illustration: PipelinesJobsIllustration,
        keywords: ["pipeline", "pipelines", "job", "jobs", "workflow", "workflows", "ci", "cd", "action", "actions", "deploy", "deployment", "orchestration", "batch", "queue", "cron", "schedule", "stream"],
    },
    {
        id: 'tickets-tasks',
        labelKey: 'settings.customize.discover.category.tickets-tasks',
        illustration: TicketsTasksIllustration,
        keywords: ["ticket", "tickets", "task", "tasks", "issue", "issues", "linear", "jira", "todo", "checklist", "backlog", "sprint", "board", "bug tracking", "project management"],
    },
    {
        id: 'apis',
        labelKey: 'settings.customize.discover.category.apis',
        illustration: ApisIllustration,
        keywords: ["api", "apis", "rest", "graphql", "grpc", "endpoint", "endpoints", "http", "fetch", "webhook", "request", "response", "client", "server", "curl", "route", "routes"],
    },
    {
        id: 'notes-memory',
        labelKey: 'settings.customize.discover.category.notes-memory',
        illustration: NotesMemoryIllustration,
        keywords: ["note", "notes", "memory", "remember", "context", "scratchpad", "journal", "log", "history", "persistent", "storage", "knowledge", "recall", "brain", "store"],
    },
    {
        id: 'ai-models-agents',
        labelKey: 'settings.customize.discover.category.ai-models-agents',
        illustration: AiModelsAgentsIllustration,
        keywords: ["ai", "model", "models", "agent", "agents", "llm", "prompt", "prompts", "reasoning", "think", "thinking", "subagent", "assistant", "intelligence", "gpt", "claude", "gemini", "embedding", "vector"],
    },
    {
        id: 'data-analytics',
        labelKey: 'settings.customize.discover.category.data-analytics',
        illustration: DataAnalyticsIllustration,
        keywords: ["data", "analytics", "database", "sql", "query", "postgres", "mysql", "sqlite", "redis", "metric", "metrics", "chart", "bi", "bigquery", "analysis", "stats", "statistics"],
    },
    {
        id: 'devops',
        labelKey: 'settings.customize.discover.category.devops',
        illustration: DevopsIllustration,
        keywords: ["devops", "docker", "container", "kubernetes", "cloud", "aws", "gcp", "azure", "server", "linux", "ssh", "terminal", "bash", "shell", "infra", "cluster"],
    },
    {
        id: 'security',
        labelKey: 'settings.customize.discover.category.security',
        illustration: SecurityIllustration,
        keywords: ["security", "auth", "oauth", "token", "secret", "crypto", "encrypt", "vulnerability", "audit", "permission", "rbac", "credential", "cert", "ssl", "tls"],
    },
    {
        id: 'testing',
        labelKey: 'settings.customize.discover.category.testing',
        illustration: TestingIllustration,
        keywords: ["test", "tests", "testing", "playwright", "jest", "vitest", "cypress", "mock", "e2e", "unit test", "integration test", "qa", "benchmark", "coverage", "assert"],
    },
    {
        id: 'other',
        labelKey: 'settings.customize.discover.category.other',
        illustration: OtherIllustration,
        keywords: [],
    },
];

const CATEGORY_IDS = new Set(DISCOVER_CATEGORIES.map((category) => category.id));
export const DISCOVER_CATEGORY_BY_ID = new Map(DISCOVER_CATEGORIES.map((category) => [category.id, category]));
const isCategoryId = (value: string): boolean => CATEGORY_IDS.has(value);

/** Anything Discover can list: a catalog skill, an MCP connector, a plugin. */
export interface CategorizableItem {
    categories?: readonly string[];
    tags?: readonly string[];
    skillName?: string;
    frontmatterName?: string;
    name?: string;
    displayName?: string;
    label?: string;
    id?: string;
    description?: string;
    sourceId?: string;
}

/** The categories an item belongs to; never empty (falls back to "other"). */
export function categoriesForItem(item: CategorizableItem | null | undefined): string[] {
    if (!item) return ['other'];
    if (Array.isArray(item.categories) && item.categories.length > 0) {
        const explicit = Array.from(new Set(item.categories.filter(isCategoryId)));
        if (explicit.length > 0) return explicit;
    }
    if (Array.isArray(item.tags) && item.tags.length > 0) {
        const fromTags: string[] = [];
        for (const tag of item.tags) {
            const normalized = String(tag).toLowerCase().trim().replace(/\s+/g, '-');
            if (isCategoryId(normalized) && !fromTags.includes(normalized)) fromTags.push(normalized);
        }
        if (fromTags.length > 0) return fromTags;
    }
    const text = [
        item.skillName ?? '', item.frontmatterName ?? '', item.name ?? '', item.displayName ?? '',
        item.label ?? '', item.id ?? '', item.description ?? '', item.sourceId ?? '',
    ].filter(Boolean).join(' ').toLowerCase();
    if (!text) return ['other'];
    const matched: string[] = [];
    for (const category of DISCOVER_CATEGORIES) {
        if (category.id === 'other') continue;
        if (category.keywords.some((keyword) => text.includes(keyword))) matched.push(category.id);
    }
    return matched.length > 0 ? matched : ['other'];
}

export interface CategoryCount {
    category: DiscoverCategory;
    count: number;
}

/** Non-empty categories, largest first, ties by translated name. */
export function countCategories(
    items: readonly CategorizableItem[],
    options?: { locale?: string; translate?: (key: I18nKey) => string },
): CategoryCount[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        for (const id of categoriesForItem(item)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const result: CategoryCount[] = [];
    for (const category of DISCOVER_CATEGORIES) {
        const count = counts.get(category.id) ?? 0;
        if (count > 0) result.push({ category, count });
    }
    const collator = new Intl.Collator(options?.locale || 'en', { sensitivity: 'base' });
    const label = (category: DiscoverCategory) => (options?.translate ? options.translate(category.labelKey) : category.id);
    result.sort((a, b) => (b.count !== a.count ? b.count - a.count : collator.compare(label(a.category), label(b.category))));
    return result;
}

export function formatCount(value: number, locale?: string): string {
    try {
        return new Intl.NumberFormat(locale || 'en').format(value);
    } catch {
        return value.toLocaleString();
    }
}

type Translate = (key: I18nKey, params?: Record<string, string | number>) => string;

/** A plural-aware message, falling back to the generic key for locales without plural forms. */
function pluralMessage(base: string, fallback: I18nKey, category: string, count: number, locale: string, t: Translate): string {
  try {
    const key = `${base}.${new Intl.PluralRules(locale).select(count)}` as I18nKey;
    const value = t(key, { category, count });
    if (value && !value.startsWith('settings.')) return value;
  } catch {
    // An unknown locale tag; use the generic form.
  }
  return t(fallback, { category, count });
}

export const categoryCardAria = (category: string, count: number, locale: string, t: Translate): string => (
  pluralMessage('settings.customize.discover.categories.cardAria', 'settings.customize.discover.categories.cardAria', category, count, locale, t)
);

export const categoryResultsAnnouncement = (category: string, count: number, locale: string, t: Translate): string => (
  pluralMessage('settings.customize.discover.categories.results', 'settings.customize.discover.categories.resultsAnnouncement', category, count, locale, t)
);
