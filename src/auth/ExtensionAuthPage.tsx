'use client';

import { useEffect, useMemo, useState } from 'react';

import { Chrome, LogIn } from 'lucide-react';

import { useAuth } from './AuthContext';

import './ExtensionAuthPage.css';

export default function ExtensionAuthPage() {
    const { accessToken, isAuthReady, signInWithEmail, user } = useAuth();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('Preparing secure extension sign-in.');
    const redirectUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            return '';
        }

        return new URLSearchParams(window.location.search).get('redirect_url') ?? '';
    }, []);

    useEffect(() => {
        if (!isAuthReady) {
            return;
        }

        if (!redirectUrl) {
            setMessage('Missing extension redirect URL.');
            return;
        }

        if (!user || !accessToken) {
            setMessage('Sign in to connect AkuMa with Chrome.');
            return;
        }

        let cancelled = false;
        const createCode = async () => {
            setMessage('Connecting Chrome.');
            const response = await fetch('/api/extension/auth-code', {
                body: JSON.stringify({ redirectUrl }),
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            });
            const result = (await response.json()) as { redirectUrl?: string; error?: string };

            if (cancelled) {
                return;
            }

            if (!response.ok || !result.redirectUrl) {
                setMessage(result.error ?? 'Unable to connect Chrome.');
                return;
            }

            window.location.assign(result.redirectUrl);
        };

        void createCode();

        return () => {
            cancelled = true;
        };
    }, [accessToken, isAuthReady, redirectUrl, user]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const result = await signInWithEmail(email);
        setMessage(result.ok ? 'Check your email, then return here automatically.' : (result.error ?? 'Sign-in failed.'));
    };

    return (
        <main className='extension-auth-page'>
            <section className='extension-auth-panel' aria-labelledby='extension-auth-heading'>
                <span className='extension-auth-icon'>
                    <Chrome size={28} aria-hidden='true' />
                </span>
                <h1 id='extension-auth-heading'>Connect AkuMa to Chrome</h1>
                <p>{message}</p>
                {!user ? (
                    <form onSubmit={handleSubmit}>
                        <input
                            type='email'
                            value={email}
                            placeholder='Email'
                            autoComplete='email'
                            required
                            aria-label='Email'
                            onChange={event => setEmail(event.target.value)}
                        />
                        <button type='submit'>
                            <LogIn size={18} aria-hidden='true' />
                            <span>Send sign-in link</span>
                        </button>
                    </form>
                ) : null}
            </section>
        </main>
    );
}
