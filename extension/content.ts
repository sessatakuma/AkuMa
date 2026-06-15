(function registerAkumaExtensionContent(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    const namespace = runtimeScope.AKUMA_EXTENSION;
    const POPOVER_ID = 'akuma-crx-page-popover';
    const SELECTION_POPOVER_ID = 'akuma-crx-selection-popover';
    const ANNOTATED_ATTR = 'data-akuma-crx-annotated';
    const MIN_JAPANESE_CHARS = 40;
    const JAPANESE_RATIO_THRESHOLD = 0.28;
    const MAX_STREAM_CHUNK_CHARS = 280;
    const MAX_FULL_PAGE_CHARS = 30_000;
    const MAX_FULL_PAGE_CHUNKS = 140;
    const JAPANESE_CHECK_DELAY_MS = 400;
    const PAGE_SIGNATURE_LENGTH = 2048;
    const NEAR_VIEWPORT_MULTIPLIER = 1.5;
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
            <div class="akuma-crx-popover-status" data-akuma-status></div>
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
        const candidates = collectTextCandidates(document.body);
        const { isLimited, tasks } = prepareViewportFirstTasks(candidates);
        const totalCount = tasks.length;

        if (totalCount === 0) {
            updatePagePopoverStatus('No Japanese text found.');
            return;
        }

        for (let index = 0; index < tasks.length; index += 1) {
            updatePagePopoverStatus(`Annotating ${index + 1}/${totalCount}`);
            await annotateTextNode(tasks[index].textNode, options);
        }

        updatePagePopoverStatus(
            isLimited
                ? `Annotated ${totalCount} visible-first chunks. Reopen AkuMa to continue.`
                : `Annotated ${totalCount} chunks.`,
        );
    }

    interface TextCandidate {
        distanceFromViewport: number;
        isInViewport: boolean;
        text: string;
        textNode: Text;
        top: number;
    }

    interface AnnotationTask {
        textNode: Text;
    }

    interface AnnotationTaskPlan {
        isLimited: boolean;
        tasks: AnnotationTask[];
    }

    function collectTextCandidates(root: HTMLElement | null) {
        if (!root) {
            return [];
        }

        const candidates: TextCandidate[] = [];
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
            const text = textNode.textContent ?? '';
            if (text.trim().length === 0) {
                continue;
            }

            const position = getTextNodeViewportPosition(textNode);
            if (!position.isRenderable) {
                continue;
            }
            candidates.push({
                distanceFromViewport: position.distanceFromViewport,
                isInViewport: position.isInViewport,
                text,
                textNode,
                top: position.top,
            });
        }

        return candidates.sort(compareTextCandidates);
    }

    function compareTextCandidates(left: TextCandidate, right: TextCandidate) {
        if (left.isInViewport !== right.isInViewport) {
            return left.isInViewport ? -1 : 1;
        }

        if (left.distanceFromViewport !== right.distanceFromViewport) {
            return left.distanceFromViewport - right.distanceFromViewport;
        }

        return left.top - right.top;
    }

    function prepareViewportFirstTasks(candidates: TextCandidate[]): AnnotationTaskPlan {
        const tasks: AnnotationTask[] = [];
        let isLimited = false;
        let selectedCharacters = 0;

        for (const candidate of candidates) {
            if (tasks.length >= MAX_FULL_PAGE_CHUNKS || selectedCharacters >= MAX_FULL_PAGE_CHARS) {
                isLimited = true;
                break;
            }

            const remainingCharacters = MAX_FULL_PAGE_CHARS - selectedCharacters;
            const chunks = splitTextForStreaming(candidate.text, remainingCharacters);
            if (chunks.length === 0) {
                continue;
            }

            const remainingTaskSlots = MAX_FULL_PAGE_CHUNKS - tasks.length;
            const selectedChunks = chunks.slice(0, remainingTaskSlots);
            if (selectedChunks.length < chunks.length) {
                isLimited = true;
            }
            const textNodes = replaceTextNodeWithChunks(candidate.textNode, selectedChunks);

            selectedCharacters += selectedChunks.reduce((total, chunk) => total + chunk.trim().length, 0);
            textNodes.forEach(textNode => tasks.push({ textNode }));
        }

        return { isLimited, tasks };
    }

    function splitTextForStreaming(text: string, characterBudget: number) {
        const chunks: string[] = [];
        let remaining = text;
        let usedCharacters = 0;

        while (remaining.trim().length > 0 && usedCharacters < characterBudget) {
            const remainingBudget = characterBudget - usedCharacters;
            const nextChunk = takeStreamingChunk(remaining, Math.min(MAX_STREAM_CHUNK_CHARS, remainingBudget));
            if (!nextChunk) {
                break;
            }

            chunks.push(nextChunk);
            usedCharacters += nextChunk.trim().length;
            remaining = remaining.slice(nextChunk.length);
        }

        return chunks;
    }

    function takeStreamingChunk(text: string, maxCharacters: number) {
        if (maxCharacters <= 0) {
            return '';
        }

        const characters = [...text];
        if (characters.length <= maxCharacters) {
            return text;
        }

        const candidate = characters.slice(0, maxCharacters).join('');
        const sentenceBreakIndex = Math.max(
            candidate.lastIndexOf('。'),
            candidate.lastIndexOf('！'),
            candidate.lastIndexOf('？'),
            candidate.lastIndexOf('\n'),
        );

        if (sentenceBreakIndex >= Math.floor(maxCharacters * 0.45)) {
            return candidate.slice(0, sentenceBreakIndex + 1);
        }

        const softBreakIndex = Math.max(
            candidate.lastIndexOf('、'),
            candidate.lastIndexOf(' '),
            candidate.lastIndexOf('　'),
        );

        if (softBreakIndex >= Math.floor(maxCharacters * 0.6)) {
            return candidate.slice(0, softBreakIndex + 1);
        }

        return candidate;
    }

    function replaceTextNodeWithChunks(textNode: Text, chunks: string[]) {
        if (chunks.length === 1 && chunks[0] === textNode.textContent) {
            return [textNode];
        }

        const parent = textNode.parentNode;
        if (!parent) {
            return [];
        }

        const textNodes = chunks.map(chunk => document.createTextNode(chunk));
        textNodes.forEach(chunkNode => parent.insertBefore(chunkNode, textNode));

        const originalText = textNode.textContent ?? '';
        const usedLength = chunks.reduce((length, chunk) => length + chunk.length, 0);
        const remainder = originalText.slice(usedLength);
        if (remainder.length > 0) {
            parent.insertBefore(document.createTextNode(remainder), textNode);
        }
        textNode.remove();

        return textNodes;
    }

    function getTextNodeViewportPosition(textNode: Text) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const rect = range.getBoundingClientRect();
        range.detach();

        const isRenderable = rect.width > 0 || rect.height > 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const top = rect.top + window.scrollY;
        const isInViewport = rect.bottom >= 0 && rect.top <= viewportHeight;
        const distanceFromViewport = isInViewport ? 0 : getDistanceFromViewport(rect, viewportHeight);

        return {
            distanceFromViewport,
            isInViewport,
            isRenderable,
            top,
        };
    }

    function getDistanceFromViewport(rect: DOMRect, viewportHeight: number) {
        if (rect.top > viewportHeight) {
            return rect.top - viewportHeight;
        }

        return Math.abs(rect.bottom) + viewportHeight * NEAR_VIEWPORT_MULTIPLIER;
    }

    function updatePagePopoverStatus(message: string) {
        pagePopover?.querySelector('[data-akuma-status]')?.replaceChildren(document.createTextNode(message));
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
