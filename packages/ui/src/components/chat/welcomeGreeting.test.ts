import { describe, expect, test } from 'bun:test';
import { GREETING_KEYS, pickGreetingIndex } from './welcomeGreeting';

describe('pickGreetingIndex', () => {
    test('stays within range', () => {
        for (const seed of [0, 0.25, 0.5, 0.999, 7, 123456]) {
            const index = pickGreetingIndex(null, GREETING_KEYS.length, seed);
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(GREETING_KEYS.length);
        }
    });

    test('never repeats the previous greeting', () => {
        for (let previous = 0; previous < GREETING_KEYS.length; previous += 1) {
            for (const seed of [0, 0.1, 0.5, 0.99]) {
                expect(pickGreetingIndex(previous, GREETING_KEYS.length, seed)).not.toBe(previous);
            }
        }
    });

    test('a single greeting is always index 0', () => {
        expect(pickGreetingIndex(0, 1, 0.7)).toBe(0);
    });
});
