export type Consent = 'granted' | 'denied' | 'pending';

export const CONSENT_STORAGE_KEY = 'akuma-analytics-consent';

interface ConsentStorage {
    getItem(key: string): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
}

export type StorageAccessor = () => ConsentStorage;

function parseConsent(value: string | null): Consent {
    return value === 'granted' || value === 'denied' ? value : 'pending';
}

export function readConsent(storageAccessors: readonly StorageAccessor[]): Consent {
    for (const getStorage of storageAccessors) {
        try {
            const consent = parseConsent(getStorage().getItem(CONSENT_STORAGE_KEY));
            if (consent !== 'pending') {
                return consent;
            }
        } catch {
            // Continue to the next storage option when browser storage is blocked.
        }
    }

    return 'pending';
}

export function writeConsent(
    value: Exclude<Consent, 'pending'>,
    primaryStorage: StorageAccessor,
    fallbackStorage: StorageAccessor,
): boolean {
    try {
        primaryStorage().setItem(CONSENT_STORAGE_KEY, value);

        try {
            fallbackStorage().removeItem(CONSENT_STORAGE_KEY);
        } catch {
            // Keep both stores aligned if the fallback cannot be cleared.
            try {
                fallbackStorage().setItem(CONSENT_STORAGE_KEY, value);
            } catch {
                // The primary write succeeded, so the preference is still durable.
            }
        }

        return true;
    } catch {
        try {
            fallbackStorage().setItem(CONSENT_STORAGE_KEY, value);
            return true;
        } catch {
            return false;
        }
    }
}

export function shouldReloadAfterConsentChange(
    previousConsent: Consent,
    nextConsent: Exclude<Consent, 'pending'>,
): boolean {
    return previousConsent === 'granted' && nextConsent === 'denied';
}
