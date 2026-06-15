'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { createSupabaseBrowserClient } from '../lib/supabase/client';

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

interface AccountSnapshot {
    email: string | null;
    plan: 'free' | 'pro';
    usageCount: number;
    usageLimit: number;
}

interface AuthContextValue {
    account: AccountSnapshot | null;
    accessToken: string | null;
    isAuthReady: boolean;
    isBillingBusy: boolean;
    isPro: boolean;
    session: Session | null;
    signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
    signOut: () => Promise<void>;
    startCheckout: () => Promise<void>;
    openBillingPortal: () => Promise<void>;
    supabase: SupabaseClient;
    user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [supabase] = useState(() => createSupabaseBrowserClient());
    const [session, setSession] = useState<Session | null>(null);
    const [account, setAccount] = useState<AccountSnapshot | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isBillingBusy, setIsBillingBusy] = useState(false);
    const accessToken = session?.access_token ?? null;

    const refreshAccount = useCallback(
        async (token: string | null) => {
            if (!token) {
                setAccount(null);
                return;
            }

            const response = await fetch('/api/account', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                setAccount(null);
                return;
            }

            setAccount((await response.json()) as AccountSnapshot);
        },
        [],
    );

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!isMounted) {
                return;
            }

            setSession(data.session);
            setIsAuthReady(true);
            void refreshAccount(data.session?.access_token ?? null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession);
            setIsAuthReady(true);
            void refreshAccount(nextSession?.access_token ?? null);
        });

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, [refreshAccount, supabase]);

    const signInWithEmail = useCallback(
        async (email: string) => {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.href,
                },
            });

            if (error) {
                return { ok: false, error: error.message };
            }

            return { ok: true };
        },
        [supabase],
    );

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setAccount(null);
    }, [supabase]);

    const startCheckout = useCallback(async () => {
        if (!accessToken) {
            return;
        }

        setIsBillingBusy(true);
        try {
            const response = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const result = (await response.json()) as { url?: string };
            if (response.ok && result.url) {
                window.location.assign(result.url);
            }
        } finally {
            setIsBillingBusy(false);
        }
    }, [accessToken]);

    const openBillingPortal = useCallback(async () => {
        if (!accessToken) {
            return;
        }

        setIsBillingBusy(true);
        try {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const result = (await response.json()) as { url?: string };
            if (response.ok && result.url) {
                window.location.assign(result.url);
            }
        } finally {
            setIsBillingBusy(false);
        }
    }, [accessToken]);

    const value = useMemo<AuthContextValue>(
        () => ({
            account,
            accessToken,
            isAuthReady,
            isBillingBusy,
            isPro: account?.plan === 'pro',
            openBillingPortal,
            session,
            signInWithEmail,
            signOut,
            startCheckout,
            supabase,
            user: session?.user ?? null,
        }),
        [
            account,
            accessToken,
            isAuthReady,
            isBillingBusy,
            openBillingPortal,
            session,
            signInWithEmail,
            signOut,
            startCheckout,
            supabase,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
