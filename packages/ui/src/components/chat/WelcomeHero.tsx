import React from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { GREETING_KEYS, pickGreetingIndex, readLastGreetingIndex, writeLastGreetingIndex, type GreetingKey } from './welcomeGreeting';

const BRAND_NAME = 'OpencodeSilver';

// One greeting per session for the lifetime of the page, so re-renders and
// remounts of the composer keep the same line.
const greetingBySession = new Map<string, GreetingKey>();

interface WelcomeLogoProps {
    size?: number;
    className?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
    showGlow?: boolean;
}

/** Isometric cube mark with the infinity glyph on its top face. */
export const WelcomeLogo: React.FC<WelcomeLogoProps> = ({
    size = 56,
    className,
    'aria-hidden': ariaHidden = true,
    showGlow = true,
}) => (
    <div
        className={cn('relative flex shrink-0 select-none items-center justify-center', className)}
        style={{ width: size, height: size }}
    >
        {showGlow ? (
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-25%] -z-10 rounded-full"
                style={{
                    background: 'radial-gradient(circle, color-mix(in srgb, var(--primary, currentColor) 14%, transparent) 0%, transparent 70%)',
                }}
            />
        ) : null}
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full text-foreground transition-transform duration-200"
            aria-hidden={ariaHidden}
        >
            <g transform="translate(256, 256) scale(4)">
                <path d="M0 0 L-41.568 -24 L-41.568 24 L0 48 Z" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
                <path d="M0 0 L41.568 -24 L41.568 24 L0 48 Z" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
                <path d="M0 -48 L-41.568 -24 L0 0 L41.568 -24 Z" fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
                <g transform="matrix(0.866, 0.5, -0.866, 0.5, 0, -24) rotate(-45) scale(1.3)">
                    <path
                        d="M 0 0 c -2 -2.67 -4 -4 -6 -4 a 4 4 0 1 0 0 8 c 2 0 4 -1.33 6 -4 Z m 0 0 c 2 2.67 4 4 6 4 a 4 4 0 0 0 0 -8 c -2 0 -4 1.33 -6 4 Z"
                        fill="currentColor"
                        fillOpacity={0.4}
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </g>
            </g>
        </svg>
    </div>
);

interface WelcomeHeroProps {
    sessionId?: string | null;
    className?: string;
    /** Deterministic greeting choice (tests). */
    seed?: number;
}

/**
 * Brand hero shown above the composer while a conversation is empty: cube
 * mark, product name and a rotating one-line greeting.
 */
export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ sessionId, className, seed }) => {
    const { t } = useI18n();
    const sessionKey = sessionId || 'draft';

    const greetingKey = React.useMemo<GreetingKey>(() => {
        const cached = greetingBySession.get(sessionKey);
        if (cached) return cached;
        const index = pickGreetingIndex(readLastGreetingIndex(), GREETING_KEYS.length, seed);
        const key = GREETING_KEYS[index] ?? GREETING_KEYS[0];
        writeLastGreetingIndex(index);
        greetingBySession.set(sessionKey, key);
        return key;
    }, [sessionKey, seed]);

    return (
        <div
            data-testid="welcome-hero"
            className={cn(
                'welcome-hero-block mb-6 flex select-none flex-col items-center pt-2 text-center sm:mb-8',
                'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 ease-out',
                'motion-reduce:animate-none motion-reduce:transition-none',
                className,
            )}
        >
            <WelcomeLogo size={56} className="size-11 text-foreground transition-transform duration-200 sm:size-14" aria-hidden="true" showGlow />
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                <bdi>{BRAND_NAME}</bdi>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-balance px-2 text-[14px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-[15.5px]">
                {t(greetingKey)}
            </p>
        </div>
    );
};

export default React.memo(WelcomeHero);
