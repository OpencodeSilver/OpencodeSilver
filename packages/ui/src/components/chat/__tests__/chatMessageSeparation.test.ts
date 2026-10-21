import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Chat Message & Turn Separation', () => {
    test('ChatMessage computes non-zero top padding for assistant responses to prevent sticking', () => {
        const computeAssistantTopPadding = ({
            isUser,
            shouldShowHeader,
            previousIsHiddenUserMessage,
            stickyUserHeader,
            isMobile,
        }: {
            isUser: boolean;
            shouldShowHeader: boolean;
            previousIsHiddenUserMessage: boolean;
            stickyUserHeader: boolean;
            isMobile: boolean;
        }): string => {
            return !isUser && shouldShowHeader && !previousIsHiddenUserMessage
                ? (stickyUserHeader && isMobile ? 'pt-4' : 'pt-3 md:pt-4')
                : 'pt-0';
        };

        // Desktop with sticky user header: must NOT be pt-0 anymore
        const desktopPadding = computeAssistantTopPadding({
            isUser: false,
            shouldShowHeader: true,
            previousIsHiddenUserMessage: false,
            stickyUserHeader: true,
            isMobile: false,
        });
        expect(desktopPadding).toBe('pt-3 md:pt-4');

        // Mobile with sticky user header
        const mobilePadding = computeAssistantTopPadding({
            isUser: false,
            shouldShowHeader: true,
            previousIsHiddenUserMessage: false,
            stickyUserHeader: true,
            isMobile: true,
        });
        expect(mobilePadding).toBe('pt-4');

        // Without sticky user header: still non-zero padding
        const nonStickyPadding = computeAssistantTopPadding({
            isUser: false,
            shouldShowHeader: true,
            previousIsHiddenUserMessage: false,
            stickyUserHeader: false,
            isMobile: false,
        });
        expect(nonStickyPadding).toBe('pt-3 md:pt-4');
    });

    test('User message container reserves non-zero bottom padding when hover row is inactive', () => {
        const computeUserBubbleBottomPadding = (showStickyInlineHoverRow: boolean): string => {
            return showStickyInlineHoverRow ? 'pb-11' : 'pb-3';
        };

        expect(computeUserBubbleBottomPadding(false)).toBe('pb-3');
        expect(computeUserBubbleBottomPadding(true)).toBe('pb-11');
    });

    test('index.css provides generous line-height, word-break, and RTL alignment for user bubbles', () => {
        const cssPath = resolve(__dirname, '../../../index.css');
        const cssContent = readFileSync(cssPath, 'utf8');

        // Verify typography and word wrapping
        expect(cssContent).toContain('line-height: 1.75 !important;');
        expect(cssContent).toContain('word-break: break-word !important;');
        expect(cssContent).toContain('overflow-wrap: break-word !important;');
        expect(cssContent).toContain('unicode-bidi: plaintext !important;');

        // Verify border and shadow
        expect(cssContent).toContain('border: 1px solid var(--interactive-border');
        expect(cssContent).toContain('box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;');

        // Verify RTL alignment
        expect(cssContent).toContain('[dir="rtl"] .chat-message-column [data-user-message-bubble]');
        expect(cssContent).toContain('text-align: right !important;');
    });

    test('TurnItem and TurnAssistantBlock include explicit separation margins', () => {
        const turnItemPath = resolve(__dirname, '../components/TurnItem.tsx');
        const turnItemContent = readFileSync(turnItemPath, 'utf8');
        expect(turnItemContent).toContain('pb-6 md:pb-8');
        expect(turnItemContent).toContain("backgroundColor: 'var(--surface-background)'");

        const turnAssistantPath = resolve(__dirname, '../components/TurnAssistantBlock.tsx');
        const turnAssistantContent = readFileSync(turnAssistantPath, 'utf8');
        expect(turnAssistantContent).toContain('mt-3 md:mt-4');
    });
});
