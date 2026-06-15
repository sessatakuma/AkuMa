(function registerAkumaExtensionPage(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    const namespace = runtimeScope.AKUMA_EXTENSION;
    const config = namespace?.config;
    const storage = chrome?.storage?.local;
    const authSection = document.querySelector<HTMLElement>('#akuma-auth');
    const actionsSection = document.querySelector<HTMLElement>('#akuma-actions');
    const authForm = document.querySelector<HTMLFormElement>('#akuma-auth-form');
    const emailInput = document.querySelector<HTMLInputElement>('#akuma-email');
    const passwordInput = document.querySelector<HTMLInputElement>('#akuma-password');
    const planNode = document.querySelector<HTMLElement>('#akuma-plan');
    const messageNode = document.querySelector<HTMLElement>('#akuma-message');
    const annotateButton = document.querySelector<HTMLButtonElement>('#akuma-annotate');
    const upgradeButton = document.querySelector<HTMLButtonElement>('#akuma-upgrade');
    const signOutButton = document.querySelector<HTMLButtonElement>('#akuma-signout');

    initialize();

    async function initialize() {
        if (!storage || !config?.supabaseUrl || !config.supabasePublishableKey) {
            setMessage('Extension auth is not configured.');
            return;
        }

        authForm?.addEventListener('submit', event => {
            event.preventDefault();
            const submitter = event.submitter instanceof HTMLButtonElement ? event.submitter : null;
            void authenticate(submitter?.dataset.mode === 'signup' ? 'signup' : 'signin');
        });
        annotateButton?.addEventListener('click', () => void requestPagePopover());
        upgradeButton?.addEventListener('click', () => void openUpgrade());
        signOutButton?.addEventListener('click', () => void signOut());
        await refreshUi();
    }

    async function authenticate(mode: 'signin' | 'signup') {
        const localStorageArea = storage;
        const email = emailInput?.value.trim() ?? '';
        const password = passwordInput?.value ?? '';
        if (!localStorageArea || !email || !password || !config?.supabaseUrl || !config.supabasePublishableKey) {
            return;
        }

        setMessage(mode === 'signup' ? 'Creating account' : 'Signing in');
        const endpoint = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
        const response = await fetch(`${config.supabaseUrl.replace(/\/$/u, '')}${endpoint}`, {
            body: JSON.stringify({ email, password }),
            headers: {
                apikey: config.supabasePublishableKey,
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });
        const result = (await response.json()) as AkumaExtensionSession & {
            error_description?: string;
            msg?: string;
        };

        if (!response.ok || !result.access_token) {
            setMessage(result.error_description || result.msg || 'Authentication failed.');
            return;
        }

        await localStorageArea.set({ akumaSession: result });
        await refreshUi();
        setMessage('Signed in.');
    }

    async function refreshUi() {
        const session = await readSession();
        const account = session ? await fetchAccount(session) : null;
        const isSignedIn = Boolean(session);

        if (authSection) {
            authSection.hidden = isSignedIn;
        }
        if (actionsSection) {
            actionsSection.hidden = !isSignedIn;
        }
        if (upgradeButton) {
            upgradeButton.textContent = account?.plan === 'pro' ? 'Manage Pro' : 'Get Pro';
        }
        if (planNode) {
            planNode.textContent = account
                ? account.plan === 'pro'
                    ? 'Pro: unlimited annotation'
                    : `Free: ${account.usageCount}/${account.usageLimit} today`
                : 'Sign in to use AkuMa';
        }
    }

    async function fetchAccount(session: AkumaExtensionSession) {
        const response = await fetch(`${getApiBaseUrl()}/api/account`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as AkumaExtensionAccount;
    }

    async function requestPagePopover() {
        const tabs = await chrome?.tabs?.query({ active: true, currentWindow: true });
        const tabId = tabs?.[0]?.id;
        if (typeof tabId !== 'number') {
            return;
        }

        await chrome?.tabs?.sendMessage(tabId, { type: 'akuma:show-page-popover' });
        window.close();
    }

    async function openUpgrade() {
        const session = await readSession();
        if (!session) {
            return;
        }

        const account = await fetchAccount(session);
        const route = account?.plan === 'pro' ? '/api/billing/portal' : '/api/billing/checkout';
        const response = await fetch(`${getApiBaseUrl()}${route}`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
            method: 'POST',
        });
        const result = (await response.json()) as { url?: string };
        if (response.ok && result.url) {
            await chrome?.tabs?.create({ url: result.url });
            window.close();
        }
    }

    async function signOut() {
        await storage?.remove('akumaSession');
        await refreshUi();
        setMessage('Signed out.');
    }

    async function readSession() {
        const stored = await storage?.get<{ akumaSession?: AkumaExtensionSession }>({
            akumaSession: undefined,
        });

        return stored?.akumaSession ?? null;
    }

    function getApiBaseUrl() {
        return (config?.apiBaseUrl || 'https://akuma.sessatakuma.dev').replace(/\/$/u, '');
    }

    function setMessage(message: string) {
        if (messageNode) {
            messageNode.textContent = message;
        }
    }
})(globalThis);
