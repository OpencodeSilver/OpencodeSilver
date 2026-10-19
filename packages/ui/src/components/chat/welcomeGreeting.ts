/** Rotating welcome-hero greetings: keys and the no-repeat picker. */

export const GREETING_KEYS = [
    'chat.welcome.greeting.1',
    'chat.welcome.greeting.2',
    'chat.welcome.greeting.3',
    'chat.welcome.greeting.4',
    'chat.welcome.greeting.5',
    'chat.welcome.greeting.6',
    'chat.welcome.greeting.7',
    'chat.welcome.greeting.8',
    'chat.welcome.greeting.9',
    'chat.welcome.greeting.10',
    'chat.welcome.greeting.11',
    'chat.welcome.greeting.12',
    'chat.welcome.greeting.13',
    'chat.welcome.greeting.14',
    'chat.welcome.greeting.15',
    'chat.welcome.greeting.16',
] as const;

export type GreetingKey = (typeof GREETING_KEYS)[number];

const LAST_GREETING_STORAGE_KEY = 'opencodesilver:last_welcome_greeting_index';

/**
 * Picks a greeting index, never repeating the previous one. `seed` makes the
 * choice deterministic (tests); otherwise Math.random() is used.
 */
export function pickGreetingIndex(previous: number | null, count: number = GREETING_KEYS.length, seed?: number): number {
    if (count <= 1) return 0;
    const hasSeed = Number.isFinite(seed);
    const raw = seed ?? 0;
    const r = hasSeed
        ? (raw >= 0 && raw < 1 ? raw : (Math.abs(raw) % 1000) / 1000)
        : Math.random();
    if (previous !== null && previous >= 0 && previous < count) {
        const index = Math.floor(r * (count - 1));
        return index >= previous ? index + 1 : index;
    }
    return Math.floor(r * count);
}

function getStorage(): Storage | null {
    try {
        const storage = globalThis.localStorage;
        if (storage && 'getItem' in storage && 'setItem' in storage) return storage;
    } catch {
        // storage unavailable (private mode, sandbox)
    }
    return null;
}

export function readLastGreetingIndex(): number | null {
    try {
        const raw = getStorage()?.getItem(LAST_GREETING_STORAGE_KEY);
        if (raw != null) {
            const parsed = Number.parseInt(raw, 10);
            if (Number.isFinite(parsed) && parsed >= 0 && parsed < GREETING_KEYS.length) return parsed;
        }
    } catch {
        // ignore
    }
    return null;
}

export function writeLastGreetingIndex(index: number): void {
    try {
        getStorage()?.setItem(LAST_GREETING_STORAGE_KEY, String(index));
    } catch {
        // ignore
    }
}

