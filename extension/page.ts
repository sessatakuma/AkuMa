(function registerAkumaExtensionPage(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    const namespace = runtimeScope.AKUMA_EXTENSION;
    const config = namespace?.config;
    const storage = chrome?.storage?.local;
    const CONTENT_CSS_FILE = 'content.css';
    const CONTENT_SCRIPT_FILES = [
        'config.js',
        'accent-types.js',
        'accent-mappers.js',
        'annotation-renderer.js',
        'api.js',
        'content.js',
    ];
    const authSection = document.querySelector<HTMLElement>('#akuma-auth');
    const actionsSection = document.querySelector<HTMLElement>('#akuma-actions');
    const signInButton = document.querySelector<HTMLButtonElement>('#akuma-signin');
    const planNode = document.querySelector<HTMLElement>('#akuma-plan');
    const messageNode = document.querySelector<HTMLElement>('#akuma-message');
    const annotateButton = document.querySelector<HTMLButtonElement>('#akuma-annotate');
    const upgradeButton = document.querySelector<HTMLButtonElement>('#akuma-upgrade');
    const signOutButton = document.querySelector<HTMLButtonElement>('#akuma-signout');

    initialize();

    async function initialize() {
        if (!storage || !config?.appUrl) {
            setMessage('Extension auth is not configured.');
            return;
        }

        signInButton?.addEventListener('click', () => void signInWithHostedFlow());
        annotateButton?.addEventListener('click', () => void requestPagePopover());
        upgradeButton?.addEventListener('click', () => void openUpgrade());
        signOutButton?.addEventListener('click', () => void signOut());
        chrome?.storage?.onChanged?.addListener((changes, areaName) => {
            if (areaName === 'local' && 'akumaExtensionToken' in changes) {
                void refreshUi();
            }
        });
        await refreshUi();
    }

    async function signInWithHostedFlow() {
        if (!storage || !chrome?.identity || !config?.appUrl) {
            return;
        }

        const redirectUrl = chrome.identity.getRedirectURL('akuma');
        const authUrl = new URL('/extension/auth', config.appUrl);
        authUrl.searchParams.set('redirect_url', redirectUrl);
        setMessage('Opening AkuMa sign-in.');

        const responseUrl = await launchWebAuthFlow(authUrl.toString());
        const code = responseUrl ? new URL(responseUrl).searchParams.get('code') : null;
        if (!code) {
            setMessage('Sign-in was cancelled.');
            return;
        }

        const response = await fetch(`${getApiBaseUrl()}/api/extension/session`, {
            body: JSON.stringify({ code, redirectUrl }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });
        const result = (await response.json()) as AkumaExtensionToken & { error?: string };

        if (!response.ok || !result.token) {
            setMessage(result.error ?? 'Authentication failed.');
            return;
        }

        await storage.set({ akumaExtensionToken: result });
        await refreshUi();
        setMessage('Signed in.');
    }

    async function refreshUi() {
        const token = await readExtensionToken();
        const account = token ? await fetchAccount(token) : null;
        const isSignedIn = Boolean(token);

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

    async function fetchAccount(token: string) {
        const response = await fetch(`${getApiBaseUrl()}/api/account`, {
            headers: {
                Authorization: `Bearer ${token}`,
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
            setMessage('No active tab found.');
            return;
        }

        setMessage('Opening page controls.');

        try {
            await ensureContentScript(tabId);
            await chrome?.tabs?.sendMessage(tabId, { type: 'akuma:show-page-popover' });
            window.close();
        } catch (error) {
            console.error('AkuMa could not run on the active tab:', error);
            setMessage('AkuMa cannot run on this tab. Try a normal web page.');
        }
    }

    async function openUpgrade() {
        const token = await readExtensionToken();
        if (!token) {
            return;
        }

        const account = await fetchAccount(token);
        const isPro = account?.plan === 'pro';
        const route = isPro ? '/api/billing/portal' : '/api/billing/checkout';
        const response = await fetch(`${getApiBaseUrl()}${route}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...(!isPro ? { 'Content-Type': 'application/json' } : {}),
            },
            method: 'POST',
            ...(!isPro ? { body: JSON.stringify({ interval: 'year' }) } : {}),
        });
        const result = (await response.json()) as { url?: string };
        if (response.ok && result.url) {
            await chrome?.tabs?.create({ url: result.url });
            window.close();
        }
    }

    async function signOut() {
        await storage?.remove('akumaExtensionToken');
        await refreshUi();
        setMessage('Signed out.');
    }

    async function ensureContentScript(tabId: number) {
        if (await isContentScriptLoaded(tabId)) {
            return;
        }

        if (!chrome?.scripting) {
            throw new Error('Chrome scripting API is not available');
        }

        await chrome.scripting.insertCSS({
            files: [CONTENT_CSS_FILE],
            target: { tabId },
        });
        await chrome.scripting.executeScript({
            files: CONTENT_SCRIPT_FILES,
            target: { tabId },
        });
    }

    async function isContentScriptLoaded(tabId: number) {
        try {
            await chrome?.tabs?.sendMessage(tabId, { type: 'akuma:ping' });
            return true;
        } catch {
            return false;
        }
    }

    async function readExtensionToken() {
        const stored = await storage?.get<{ akumaExtensionToken?: AkumaExtensionToken }>({
            akumaExtensionToken: undefined,
        });
        const session = stored?.akumaExtensionToken;

        if (!session || session.expiresAt <= Date.now()) {
            await storage?.remove('akumaExtensionToken');
            return null;
        }

        return session.token;
    }

    function getApiBaseUrl() {
        return (config?.apiBaseUrl || 'https://akuma.sessatakuma.dev').replace(/\/$/u, '');
    }

    function setMessage(message: string) {
        if (messageNode) {
            messageNode.textContent = message;
        }
    }

    function launchWebAuthFlow(url: string) {
        return new Promise<string | undefined>(resolve => {
            chrome?.identity?.launchWebAuthFlow({ interactive: true, url }, responseUrl => {
                resolve(responseUrl);
            });
        });
    }
})(globalThis);
