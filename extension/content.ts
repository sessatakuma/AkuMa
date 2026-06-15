(function registerAkumaExtensionContent(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    const namespace = runtimeScope.AKUMA_EXTENSION;
    const POPOVER_ID = 'akuma-crx-page-popover';
    const SELECTION_POPOVER_ID = 'akuma-crx-selection-popover';
    const ANNOTATED_ATTR = 'data-akuma-crx-annotated';
    const MIN_JAPANESE_CHARS = 40;
    const JAPANESE_RATIO_THRESHOLD = 0.28;
    const MAX_NODE_TEXT_LENGTH = 600;
    const JAPANESE_CHECK_DELAY_MS = 400;
    const PAGE_SIGNATURE_LENGTH = 2048;
    let pagePopover: HTMLElement | undefined;
    let selectionPopover: HTMLElement | undefined;
    let currentSelectionRange: Range | undefined;
    let accountPromise: Promise<AkumaExtensionAccount | null> | undefined;
    let dismissedDetectionSignature = '';
    let japaneseCheckTimer: number | undefined;
    let currentLocation = window.location.href;
    let mutationObserver: MutationObserver | undefined;

    initialize();

    function initialize() {
        if (document.documentElement.dataset.akumaCrxLoaded === 'true') {
            return;
        }

        document.documentElement.dataset.akumaCrxLoaded = 'true';
        chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
            if (isRuntimeMessage(message, 'akuma:ping')) {
                sendResponse({ ok: true });
                return;
            }

            if (isRuntimeMessage(message, 'akuma:show-page-popover')) {
                accountPromise = undefined;
                void showPagePopover({ forced: true, detectionSignature: getCurrentPageSignature() });
            }
        });
        chrome?.storage?.onChanged?.addListener((changes, areaName) => {
            if (areaName === 'local' && 'akumaExtensionToken' in changes) {
                accountPromise = undefined;
                scheduleJapanesePageCheck(100);
            }
        });
        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('pointerdown', handleDocumentPointerDown, true);
        window.addEventListener('hashchange', handleLocationChange);
        window.addEventListener('popstate', handleLocationChange);
        observePageChanges();
        scheduleJapanesePageCheck();
    }

    async function checkJapanesePage() {
        if (pagePopover) {
            return;
        }

        const pageText = document.body?.innerText ?? '';
        const detectionSignature = getPageSignature(pageText);
        if (!detectionSignature || detectionSignature === dismissedDetectionSignature) {
            return;
        }

        const account = await getAccount();
        if (account?.plan === 'pro' && isMostlyJapanese(pageText)) {
            await showPagePopover({ forced: false, detectionSignature });
        }
    }

    async function showPagePopover({
        detectionSignature,
        forced,
    }: {
        detectionSignature: string;
        forced: boolean;
    }) {
        const account = await getAccount();
        removePagePopover();
        pagePopover = document.createElement('section');
        pagePopover.id = POPOVER_ID;
        pagePopover.className = 'akuma-crx-popover akuma-crx-page-popover';
        pagePopover.setAttribute('aria-label', 'AkuMa Japanese annotation');
        pagePopover.dataset.akumaDetectionSignature = detectionSignature;
        if (account?.plan !== 'pro') {
            pagePopover.innerHTML = `
                <div class="akuma-crx-popover-title">Pro required</div>
                <div class="akuma-crx-popover-copy">Free supports selected single-word annotation. Pro unlocks whole-page and sentence annotation.</div>
                <div class="akuma-crx-popover-actions">
                    <button type="button" data-akuma-action="upgrade">Get Pro</button>
                    <button type="button" data-akuma-action="dismiss">Not this time</button>
                </div>
            `;
            document.body.append(pagePopover);
            pagePopover.addEventListener('click', handlePagePopoverClick);
            return;
        }

        pagePopover.innerHTML = `
            <div class="akuma-crx-popover-title">${forced ? 'Annotate this page?' : 'Japanese detected'}</div>
            <div class="akuma-crx-popover-copy">Add AkuMa annotations to the page.</div>
            <div class="akuma-crx-popover-actions">
                <button type="button" data-akuma-action="furigana">Furi only</button>
                <button type="button" data-akuma-action="accent">With accent</button>
                <button type="button" data-akuma-action="dismiss">Not this time</button>
            </div>
        `;
        document.body.append(pagePopover);
        pagePopover.addEventListener('click', handlePagePopoverClick);
    }

    function removePagePopover() {
        pagePopover?.removeEventListener('click', handlePagePopoverClick);
        pagePopover?.remove();
        pagePopover = undefined;
    }

    function handlePagePopoverClick(event: MouseEvent) {
        if (!event.isTrusted) {
            return;
        }

        const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
        const action = target?.dataset.akumaAction;
        if (!action) {
            return;
        }

        if (action === 'dismiss') {
            dismissCurrentPageDetection();
            removePagePopover();
            return;
        }

        if (action === 'upgrade') {
            dismissCurrentPageDetection();
            window.open(`${namespace.config?.appUrl || namespace.config?.apiBaseUrl || 'https://akuma.sessatakuma.dev'}/extension`, '_blank', 'noopener,noreferrer');
            removePagePopover();
            return;
        }

        target.setAttribute('aria-busy', 'true');
        dismissCurrentPageDetection();
        annotateWholePage({ showAccent: action === 'accent' }).finally(removePagePopover);
    }

    async function annotateWholePage(options: AkumaAnnotateOptions) {
        const textNodes = collectTextNodes(document.body);

        for (const textNode of textNodes) {
            await annotateTextNode(textNode, options);
        }
    }

    function collectTextNodes(root: HTMLElement | null) {
        if (!root) {
            return [];
        }

        const nodes: Text[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (!node.textContent || !hasJapanese(node.textContent)) {
                    return NodeFilter.FILTER_REJECT;
                }

                const parent = node.parentElement;
                if (!parent || shouldSkipElement(parent)) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            },
        });

        while (walker.nextNode()) {
            const textNode = walker.currentNode as Text;
            if (textNode.textContent && textNode.textContent.trim().length <= MAX_NODE_TEXT_LENGTH) {
                nodes.push(textNode);
            }
        }

        return nodes;
    }

    async function annotateTextNode(textNode: Text, options: AkumaAnnotateOptions) {
        const text = textNode.textContent ?? '';
        if (!namespace.annotate || text.trim().length === 0) {
            return;
        }

        try {
            const leading = text.match(/^\s*/u)?.[0] ?? '';
            const trailing = text.match(/\s*$/u)?.[0] ?? '';
            const coreText = text.slice(leading.length, text.length - trailing.length);
            const fragment = await namespace.annotate.annotateText(coreText, options);
            const wrapper = document.createElement('span');
            wrapper.setAttribute(ANNOTATED_ATTR, 'true');
            wrapper.append(document.createTextNode(leading));
            wrapper.append(fragment);
            wrapper.append(document.createTextNode(trailing));
            textNode.replaceWith(wrapper);
        } catch (error) {
            console.error('AkuMa annotation failed:', error);
        }
    }

    function handleSelectionChange() {
        window.setTimeout(() => {
            void updateSelectionPopover();
        }, 0);
    }

    async function updateSelectionPopover() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
            removeSelectionPopover();
            return;
        }

        const selectedText = selection.toString().trim();
        const account = await getAccount();
        if (
            !account ||
            !selectedText ||
            !hasJapanese(selectedText) ||
            (account.plan !== 'pro' && !isSingleJapaneseWord(selectedText))
        ) {
            removeSelectionPopover();
            return;
        }

        currentSelectionRange = selection.getRangeAt(0).cloneRange();
        showSelectionPopover(currentSelectionRange);
    }

    function showSelectionPopover(range: Range) {
        removeSelectionPopover();
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return;
        }

        selectionPopover = document.createElement('div');
        selectionPopover.id = SELECTION_POPOVER_ID;
        selectionPopover.className = 'akuma-crx-popover akuma-crx-selection-popover';
        selectionPopover.innerHTML = `
            <button type="button" data-akuma-selection-action="accent">Mark accent</button>
            <button type="button" data-akuma-selection-action="furigana">Add furi only</button>
        `;
        selectionPopover.style.top = `${Math.max(8, window.scrollY + rect.top - 48)}px`;
        selectionPopover.style.left = `${Math.max(8, window.scrollX + rect.left)}px`;
        selectionPopover.addEventListener('click', handleSelectionPopoverClick);
        document.body.append(selectionPopover);
    }

    function removeSelectionPopover() {
        selectionPopover?.removeEventListener('click', handleSelectionPopoverClick);
        selectionPopover?.remove();
        selectionPopover = undefined;
    }

    function handleSelectionPopoverClick(event: MouseEvent) {
        if (!event.isTrusted) {
            return;
        }

        const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
        const action = target?.dataset.akumaSelectionAction;
        if (!action || !currentSelectionRange) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        target.setAttribute('aria-busy', 'true');
        annotateRange(currentSelectionRange, { showAccent: action === 'accent' }).finally(() => {
            window.getSelection()?.removeAllRanges();
            removeSelectionPopover();
        });
    }

    async function annotateRange(range: Range, options: AkumaAnnotateOptions) {
        const text = range.toString();
        if (!namespace.annotate || text.trim().length === 0) {
            return;
        }

        const fragment = await namespace.annotate.annotateText(text, options);
        const wrapper = document.createElement('span');
        wrapper.setAttribute(ANNOTATED_ATTR, 'true');
        wrapper.append(fragment);
        range.deleteContents();
        range.insertNode(wrapper);
    }

    function handleDocumentPointerDown(event: PointerEvent) {
        const target = event.target instanceof Node ? event.target : null;
        if (!target) {
            return;
        }

        if (selectionPopover && !selectionPopover.contains(target)) {
            removeSelectionPopover();
        }
    }

    function shouldSkipElement(element: Element): boolean {
        if (element.closest(`[${ANNOTATED_ATTR}], #${POPOVER_ID}, #${SELECTION_POPOVER_ID}`)) {
            return true;
        }

        return Boolean(
            element.closest(
                'script, style, noscript, textarea, input, select, option, code, pre, kbd, samp, ruby, rt, button',
            ),
        );
    }

    function isMostlyJapanese(text: string) {
        const compact = text.replace(/\s+/gu, '');
        if (compact.length === 0) {
            return false;
        }

        const japaneseChars = countMatches(compact, /[\u3040-\u30ff\u3400-\u9fff]/gu);
        const latinChars = countMatches(compact, /[A-Za-z]/gu);
        const comparableChars = japaneseChars + latinChars;
        const ratio = comparableChars > 0 ? japaneseChars / comparableChars : 0;

        return japaneseChars >= MIN_JAPANESE_CHARS && ratio >= JAPANESE_RATIO_THRESHOLD;
    }

    function hasJapanese(text: string) {
        return /[\u3040-\u30ff\u3400-\u9fff]/u.test(text);
    }

    function isSingleJapaneseWord(text: string) {
        const trimmed = text.trim();
        if (!hasJapanese(trimmed) || /\s/u.test(trimmed)) {
            return false;
        }

        const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
        const wordLikeSegments = [...segmenter.segment(trimmed)].filter(segment => segment.isWordLike);

        return wordLikeSegments.length === 1 && wordLikeSegments[0]?.segment === trimmed;
    }

    function countMatches(text: string, pattern: RegExp) {
        return [...text.matchAll(pattern)].length;
    }

    function scheduleJapanesePageCheck(delay = JAPANESE_CHECK_DELAY_MS) {
        window.clearTimeout(japaneseCheckTimer);
        japaneseCheckTimer = window.setTimeout(() => void checkJapanesePage(), delay);
    }

    function observePageChanges() {
        if (mutationObserver) {
            return;
        }

        mutationObserver = new MutationObserver(() => {
            handleLocationChange();
            scheduleJapanesePageCheck();
        });
        mutationObserver.observe(document.documentElement, {
            characterData: true,
            childList: true,
            subtree: true,
        });
    }

    function handleLocationChange() {
        if (window.location.href === currentLocation) {
            return;
        }

        currentLocation = window.location.href;
        accountPromise = undefined;
        dismissedDetectionSignature = '';
        removePagePopover();
        removeSelectionPopover();
        scheduleJapanesePageCheck(100);
    }

    function dismissCurrentPageDetection() {
        dismissedDetectionSignature =
            pagePopover?.dataset.akumaDetectionSignature || getCurrentPageSignature();
    }

    function getCurrentPageSignature() {
        return getPageSignature(document.body?.innerText ?? '');
    }

    function getPageSignature(text: string) {
        return text.replace(/\s+/gu, ' ').trim().slice(0, PAGE_SIGNATURE_LENGTH);
    }

    function isRuntimeMessage(message: unknown, type: string): message is { type: string } {
        return Boolean(message && typeof message === 'object' && 'type' in message && message.type === type);
    }

    async function getAccount() {
        accountPromise ??= fetchAccount();
        return accountPromise;
    }

    async function fetchAccount(): Promise<AkumaExtensionAccount | null> {
        const storage = chrome?.storage?.local;
        const apiBaseUrl = namespace.config?.apiBaseUrl || 'https://akuma.sessatakuma.dev';
        if (!storage) {
            return null;
        }

        const stored = await storage.get<{ akumaExtensionToken?: AkumaExtensionToken }>({
            akumaExtensionToken: undefined,
        });
        const session = stored.akumaExtensionToken;
        if (!session || session.expiresAt <= Date.now()) {
            await storage.remove('akumaExtensionToken');
            return null;
        }

        const response = await fetch(`${apiBaseUrl.replace(/\/$/u, '')}/api/account`, {
            headers: {
                Authorization: `Bearer ${session.token}`,
            },
        });

        if (!response.ok) {
            return null;
        }

        return (await response.json()) as AkumaExtensionAccount;
    }
})(globalThis);
