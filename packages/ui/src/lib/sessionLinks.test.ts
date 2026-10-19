import { describe, expect, test } from 'bun:test';

import { buildMessageLink, isSessionDeepLink, parseSessionLink } from './sessionLinks';

describe('buildMessageLink', () => {
    test('builds the native deep link', () => {
        expect(buildMessageLink('ses_a', 'msg_1', { kind: 'deep-link' })).toBe('opencodesilver://session/ses_a?message=msg_1');
    });

    test('builds the web link on this page, keeping its path', () => {
        expect(buildMessageLink('ses_a', 'msg_1', { kind: 'web', origin: 'https://codesilver.example', pathname: '/oc/' }))
            .toBe('https://codesilver.example/oc/?session=ses_a&message=msg_1');
    });

    test('refuses identifiers outside the link alphabet', () => {
        expect(buildMessageLink('ses a', 'msg_1', { kind: 'deep-link' })).toBeNull();
        expect(buildMessageLink('ses_a', 'msg"]', { kind: 'deep-link' })).toBeNull();
    });
});

describe('parseSessionLink', () => {
    test('reads native session and message links', () => {
        expect(parseSessionLink('opencodesilver://session/ses_a?message=msg_1', [])).toEqual({ sessionId: 'ses_a', messageId: 'msg_1' });
        expect(parseSessionLink('opencodesilver://session/ses_a', [])).toEqual({ sessionId: 'ses_a', messageId: null });
    });

    test('reads web links only on an address of this instance', () => {
        const href = 'https://codesilver.example/?session=ses_a&message=msg_1';
        expect(parseSessionLink(href, ['https://codesilver.example'])).toEqual({ sessionId: 'ses_a', messageId: 'msg_1' });
        // The desktop page lives on its own scheme; the connected instance's address counts too.
        expect(parseSessionLink(href, ['opencodesilver-ui://app', 'https://codesilver.example'])).toEqual({ sessionId: 'ses_a', messageId: 'msg_1' });
        expect(parseSessionLink(href, ['https://other.example'])).toBeNull();
        expect(parseSessionLink(href, [])).toBeNull();
    });

    test('reads a link that is just a session id', () => {
        expect(parseSessionLink('ses_efdbcde57ffeWPNoQ8p0LyWi3X', [])).toEqual({ sessionId: 'ses_efdbcde57ffeWPNoQ8p0LyWi3X', messageId: null });
        expect(parseSessionLink('/ses_a', [])).toEqual({ sessionId: 'ses_a', messageId: null });
        expect(parseSessionLink('docs/ses_a', [])).toBeNull();
        expect(parseSessionLink('ses_a.md', [])).toBeNull();
        expect(isSessionDeepLink('ses_a')).toBe(false);
    });

    test('ignores other routes and malformed IDs', () => {
        expect(parseSessionLink('opencodesilver://connect?v=2&p=x', [])).toBeNull();
        expect(parseSessionLink('opencodesilver://session/ses_a/extra', [])).toBeNull();
        expect(parseSessionLink('opencodesilver://session/ses_a?message=bad%22', [])).toBeNull();
        expect(parseSessionLink('not a url', [])).toBeNull();
    });

    test('recognises only session deep links as keepable chat links', () => {
        expect(isSessionDeepLink('opencodesilver://session/ses_a?message=msg_1')).toBe(true);
        expect(isSessionDeepLink('opencodesilver://connect?v=2')).toBe(false);
        expect(isSessionDeepLink('https://codesilver.example/?session=ses_a')).toBe(false);
    });
});
