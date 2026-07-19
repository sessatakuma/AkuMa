import { describe, expect, test } from 'bun:test';

import {
    CONSENT_STORAGE_KEY,
    readConsent,
    shouldReloadAfterConsentChange,
    writeConsent,
} from './analyticsConsentState';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

const blockedStorage = () => {
    throw new DOMException('Storage is blocked', 'SecurityError');
};

describe('analytics consent state', () => {
    test('recognizes granted and denied preferences', () => {
        const storage = new MemoryStorage();

        expect(readConsent([() => storage])).toBe('pending');
        storage.setItem(CONSENT_STORAGE_KEY, 'granted');
        expect(readConsent([() => storage])).toBe('granted');
        storage.setItem(CONSENT_STORAGE_KEY, 'denied');
        expect(readConsent([() => storage])).toBe('denied');
    });

    test('uses fallback storage when primary storage is blocked', () => {
        const fallback = new MemoryStorage();

        expect(writeConsent('granted', blockedStorage, () => fallback)).toBe(true);
        expect(readConsent([blockedStorage, () => fallback])).toBe('granted');
    });

    test('returns pending instead of throwing when all storage is blocked', () => {
        expect(readConsent([blockedStorage, blockedStorage])).toBe('pending');
        expect(writeConsent('denied', blockedStorage, blockedStorage)).toBe(false);
    });

    test('reloads only when granted consent is withdrawn', () => {
        expect(shouldReloadAfterConsentChange('granted', 'denied')).toBe(true);
        expect(shouldReloadAfterConsentChange('pending', 'denied')).toBe(false);
        expect(shouldReloadAfterConsentChange('denied', 'denied')).toBe(false);
        expect(shouldReloadAfterConsentChange('denied', 'granted')).toBe(false);
        expect(shouldReloadAfterConsentChange('granted', 'granted')).toBe(false);
    });
});
