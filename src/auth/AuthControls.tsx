'use client';

import { useState } from 'react';

import { LogIn, LogOut, Sparkles } from 'lucide-react';

import { useAuth } from './AuthContext';

import './AuthControls.css';

export default function AuthControls() {
    const {
        account,
        isAuthReady,
        isBillingBusy,
        isPro,
        openBillingPortal,
        signInWithEmail,
        signOut,
        startCheckout,
        user,
    } = useAuth();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const result = await signInWithEmail(email);
        setMessage(result.ok ? 'Check your email for a sign-in link.' : (result.error ?? 'Sign-in failed.'));
    };

    if (!isAuthReady) {
        return <div className='auth-controls auth-controls-loading'>Loading</div>;
    }

    if (!user) {
        return (
            <form className='auth-controls auth-controls-form' onSubmit={handleSubmit}>
                <input
                    type='email'
                    value={email}
                    placeholder='Email'
                    aria-label='Email'
                    autoComplete='email'
                    required
                    onChange={event => setEmail(event.target.value)}
                />
                <button type='submit' title='Sign in'>
                    <LogIn size={16} aria-hidden='true' />
                    <span>Sign in</span>
                </button>
                {message ? <span className='auth-controls-message'>{message}</span> : null}
            </form>
        );
    }

    return (
        <div className='auth-controls'>
            <span className='auth-plan-chip'>{isPro ? 'Pro' : `${account?.usageCount ?? 0}/50 free`}</span>
            <button
                type='button'
                className='auth-controls-button'
                disabled={isBillingBusy}
                onClick={isPro ? openBillingPortal : () => void startCheckout('year')}
            >
                <Sparkles size={16} aria-hidden='true' />
                <span>{isPro ? 'Manage' : 'Get Pro'}</span>
            </button>
            <button
                type='button'
                className='auth-controls-button auth-controls-icon'
                title='Sign out'
                onClick={() => void signOut()}
            >
                <LogOut size={16} aria-hidden='true' />
            </button>
        </div>
    );
}
