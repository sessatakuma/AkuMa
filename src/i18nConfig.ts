export type Locale = 'en' | 'ja' | 'zh';

export interface TranslationSet {
    accentMarkerLabel: string;
    accentResultLabel: string;
    accentToggle: string;
    temporaryIssuesBody: string;
    temporaryIssuesClose: string;
    temporaryIssuesTitle: string;
    collapseResult: string;
    copyAsText: string;
    copyFailed: string;
    copied: string;
    dismissResultHint: string;
    editFurigana: string;
    expandResult: string;
    exportHtml: string;
    exportHtmlSuccess: string;
    exportImage: string;
    exportOptions: string;
    exportThemeDark: string;
    exportThemeLight: string;
    fallbackStatus: string;
    footerFacebookLabel: string;
    footerGithubLabel: string;
    footerInstagramLabel: string;
    footerMailLabel: string;
    footerSocialHeading: string;
    footerThreadsLabel: string;
    footerWhatBody: string;
    footerWhatHeading: string;
    faviconAltBrand: string;
    furiganaInputWarning: string;
    heading: string;
    htmlExportAriaLabel: string;
    htmlExportTitle: string;
    inputAriaLabel: string;
    inputDescription: string;
    inputLabel: string;
    inputPanelLabel: string;
    inputPlaceholder: string;
    inputTools: string;
    pageDescription: string;
    randomSample: string;
    result: string;
    resultActions: string;
    resultHint: string;
    resultPanelLabel: string;
    resultsAndInput: string;
    saveAndCopy: string;
    statusAnalyzing: string;
    statusUpdated: (count: number) => string;
    switchAccent: string;
    title: string;
    toggleImageTheme: (isDarkResult: boolean) => string;
    pasteFromClipboard: string;
    usageEyebrow: string;
    usageHeading: string;
    usageIntro: string;
    usagePitchFallBody: string;
    usagePitchFallTitle: string;
    usagePitchFlatBody: string;
    usagePitchFlatTitle: string;
    usagePitchHeading: string;
    usagePitchIntro: string;
    usagePitchNoneBody: string;
    usagePitchNoneTitle: string;
    usageStepAccentBody: string;
    usageStepAccentHint: string;
    usageStepAccentTitle: string;
    usageStepEditBody: string;
    usageStepEditTitle: string;
    usageStepFuriganaBody: string;
    usageStepFuriganaHint: string;
    usageStepFuriganaTitle: string;
    usageStepShareBody: string;
    usageStepShareHint: string;
    usageStepShareTitle: string;
    usageStepStartBody: string;
    usageStepStartHint: string;
    usageStepStartTitle: string;
    usageStepOne: string;
    usageStepThree: string;
    usageStepTwo: string;
}

export const DEFAULT_LOCALE: Locale = 'en';

export const translations: Record<Locale, TranslationSet> = {
    en: {
        accentMarkerLabel: 'Accent Marker',
        accentResultLabel: 'Pitch accent analysis result',
        accentToggle: 'Accent',
        temporaryIssuesBody:
            'The system is encountering temporary issues, so accent rendering could not be completed right now. Please try again shortly.',
        temporaryIssuesClose: 'Close',
        temporaryIssuesTitle: 'Temporary system issue',
        collapseResult: 'Collapse result',
        copyAsText: 'Copy as text',
        copyFailed: 'Copy failed',
        copied: 'Copied',
        dismissResultHint: 'Dismiss edit hint',
        editFurigana: 'Edit furigana',
        expandResult: 'Expand result',
        exportHtml: 'HTML',
        exportHtmlSuccess: 'HTML exported',
        exportImage: 'Image',
        exportOptions: 'Export options',
        exportThemeDark: 'dark',
        exportThemeLight: 'light',
        fallbackStatus:
            'The server did not respond, so a simplified analysis result is shown instead.',
        footerFacebookLabel: 'Facebook',
        footerGithubLabel: 'GitHub',
        footerInstagramLabel: 'Instagram',
        footerMailLabel: 'Email',
        footerSocialHeading: 'Social media',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'Sessatakuma is developing tools around Japanese learning and preparing a tool-assisted speaking practice community with learning groups, structured plans, and guided practice. The goal is not just a forum, but a place where learners can build speaking confidence through useful tools and a clear practice rhythm.',
        footerWhatHeading: 'What are we',
        faviconAltBrand: 'せっさたくま',
        furiganaInputWarning: 'Only kana can be entered for furigana',
        heading: 'Accent Marker | Japanese Pitch Accent & Furigana Tool',
        htmlExportAriaLabel: 'Accent-marked text export',
        htmlExportTitle: 'Accent Marker Export',
        inputAriaLabel: 'Japanese text to analyze',
        inputDescription:
            'Analysis results appear in the panel on the right. While editing, you can change pitch accent and edit furigana directly.',
        inputLabel: 'Japanese text to analyze',
        inputPanelLabel: 'Input',
        inputPlaceholder: 'Enter Japanese text...',
        inputTools: 'Input tools',
        pageDescription:
            'Paste Japanese text to add furigana and pitch-accent markings automatically, then edit and export the result.',
        pasteFromClipboard: 'Paste from clipboard',
        randomSample: 'Insert sample text',
        result: 'Result',
        resultActions: 'Result actions',
        resultHint: 'Analysis complete. Click furigana or accent marks to edit',
        resultPanelLabel: 'Result',
        resultsAndInput: 'Input and analysis result',
        saveAndCopy: 'Export and copy',
        statusAnalyzing: 'Analyzing',
        statusUpdated: count => `Analysis updated. Displaying ${count} words.`,
        switchAccent: 'Toggle accent',
        title: 'Accent Marker | Japanese Pitch Accent & Furigana Tool',
        toggleImageTheme: isDarkResult =>
            `Switch image theme to ${isDarkResult ? 'light' : 'dark'}`,
        usageEyebrow: 'Usage',
        usageHeading: 'Make Japanese pronunciation natural and clear',
        usageIntro:
            'Accent Marker turns Japanese text into pronunciation-ready study material with furigana, pitch accent, edits, and export.',
        usagePitchFallBody:
            'A vertical drop marks downstep; following sounds and particles stay low.',
        usagePitchFallTitle: 'High, then fall',
        usagePitchFlatBody:
            'The marked span stays high, with no fall inside the word.',
        usagePitchFlatTitle: 'High, no fall',
        usagePitchHeading: 'Why the accent line matters',
        usagePitchIntro:
            'Japanese pitch accent tracks high, low, and downstep. Seeing it helps pronunciation sound natural and keeps similar words distinct.',
        usagePitchNoneBody:
            'Particles like の, で, and は follow the previous word instead of carrying their own high mark.',
        usagePitchNoneTitle: 'Following unit',
        usageStepAccentBody:
            'Click an accent line to switch the pitch pattern, or place the caret at the end of a furigana cell and use Up or Down to cycle the accent.',
        usageStepAccentHint: 'Click line or Up/Down',
        usageStepAccentTitle: 'Adjust accent',
        usageStepEditBody:
            'Correct furigana, move between reading cells, and switch pitch patterns in place.',
        usageStepEditTitle: 'Edit readings and accent',
        usageStepFuriganaBody:
            'Click the furigana text to edit it directly. Use Left and Right to jump across reading cells while keeping your hands on the keyboard.',
        usageStepFuriganaHint: 'Type kana, then Left/Right',
        usageStepFuriganaTitle: 'Edit furigana',
        usageStepShareBody:
            'Copy text for notes, export images for sharing, or save HTML to preserve markup.',
        usageStepShareHint: 'Copy, image, or HTML',
        usageStepShareTitle: 'Save in the right format',
        usageStepStartBody:
            'Enter Japanese or insert a sample to start reading and accent analysis.',
        usageStepStartHint: 'Paste or sample',
        usageStepStartTitle: 'Start analysis',
        usageStepOne: 'Paste Japanese text or insert a sample sentence to start a new analysis.',
        usageStepThree:
            'Export the result as text, HTML, or an image depending on how you want to study or share it.',
        usageStepTwo:
            'Review the generated reading, then click furigana or accent lines to correct details directly in the result panel.',
    },
    ja: {
        accentMarkerLabel: 'アクセントマーカー',
        accentResultLabel: 'アクセント解析結果',
        accentToggle: 'アクセント',
        temporaryIssuesBody:
            '現在システムで一時的な問題が発生しており、アクセント表示を完了できませんでした。少し時間をおいて再度お試しください。',
        temporaryIssuesClose: '閉じる',
        temporaryIssuesTitle: '一時的なシステム障害',
        collapseResult: '結果の拡大表示を閉じる',
        copyAsText: 'テキスト形式でコピー',
        copyFailed: 'コピーに失敗しました',
        copied: 'コピーしました',
        dismissResultHint: '編集ヒントを閉じる',
        editFurigana: 'ふりがなを編集',
        expandResult: '結果を拡大表示',
        exportHtml: 'HTML',
        exportHtmlSuccess: 'HTMLを書き出しました',
        exportImage: '画像',
        exportOptions: '保存オプション',
        exportThemeDark: 'ダーク',
        exportThemeLight: 'ライト',
        fallbackStatus: 'サーバーからの応答がないため、簡易解析結果を表示しています。',
        footerFacebookLabel: 'Facebook',
        footerGithubLabel: 'GitHub',
        footerInstagramLabel: 'Instagram',
        footerMailLabel: 'メール',
        footerSocialHeading: 'SNS',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'せっさたくまは、日本語学習のためのツールを開発しながら、ツールで支援される会話練習コミュニティを準備しています。単なる掲示板ではなく、学習グループ、練習計画、ガイド付きの実践を通じて、話す自信を育てられる場所を目指しています。',
        footerWhatHeading: '私たちについて',
        faviconAltBrand: 'せっさたくま',
        furiganaInputWarning: 'ふりがなにはかなのみ入力できます',
        heading: '日本語アクセントマーカー',
        htmlExportAriaLabel: 'アクセント付きテキスト書き出し',
        htmlExportTitle: 'Accent Marker Export',
        inputAriaLabel: '解析する日本語テキスト',
        inputDescription:
            '解析結果は右側の結果領域に表示されます。編集中はアクセントを切り替えたり、ふりがなを直接修正できます。',
        inputLabel: '解析する日本語テキスト',
        inputPanelLabel: '入力',
        inputPlaceholder: '文章を入力...',
        inputTools: '入力補助',
        pageDescription:
            '日本語テキストにふりがなとピッチアクセントを自動で付与し、編集して書き出せる学習ツールです。',
        pasteFromClipboard: 'クリップボードから貼り付け',
        randomSample: 'サンプル文を生成',
        result: '結果',
        resultActions: '結果の操作',
        resultHint: '分析完了。ふりがな・アクセントをクリックして編集',
        resultPanelLabel: '結果',
        resultsAndInput: '入力と解析結果',
        saveAndCopy: '書き出しとコピー',
        statusAnalyzing: '分析中',
        statusUpdated: count => `解析結果を更新しました。${count}件の語を表示しています。`,
        switchAccent: 'アクセントを切り替え',
        title: 'Accent Marker | Japanese Pitch Accent & Furigana Tool',
        toggleImageTheme: isDarkResult =>
            `画像テーマを${isDarkResult ? 'ライト' : 'ダーク'}に切り替え`,
        usageEyebrow: '使い方',
        usageHeading: '日本語の発音を自然に、意味を明確に',
        usageIntro:
            'Accent Marker は日本語テキストに、ふりがな・ピッチアクセント・修正・書き出しをまとめます。',
        usagePitchFallBody:
            '縦線はダウンステップを表し、その後の音や助詞は低く続きます。',
        usagePitchFallTitle: '高く、あとで下がる',
        usagePitchFlatBody:
            '横線の範囲は高いまま続き、語の中では下がりません。',
        usagePitchFlatTitle: '高いまま下がらない',
        usagePitchHeading: 'アクセント線を見る理由',
        usagePitchIntro:
            '日本語アクセントは高低とダウンステップで聞こえ方が変わります。見える化すると、より自然に発音できます。',
        usagePitchNoneBody:
            'の・で・は などの助詞は、自分ではなく前の語の高さに続きます。',
        usagePitchNoneTitle: '前に続く単位',
        usageStepAccentBody:
            'アクセント線をクリックすると音調を切り替えられます。ふりがなの末尾にカーソルを置いた状態なら、上下キーでも切り替えできます。',
        usageStepAccentHint: '線をクリック / 上下キー',
        usageStepAccentTitle: 'アクセントを直す',
        usageStepEditBody:
            'ふりがなを直し、読みセルを移動し、アクセント線をその場で切り替えます。',
        usageStepEditTitle: '読みとアクセントを直す',
        usageStepFuriganaBody:
            'ふりがな部分をクリックしてそのまま編集できます。左右キーを使うと、読みの区切りをまたいで次のセルへ移動できます。',
        usageStepFuriganaHint: 'かなを入力 / 左右キー',
        usageStepFuriganaTitle: 'ふりがなを直す',
        usageStepShareBody:
            'テキストはメモ、画像は共有、HTML はふりがなとアクセントの保存に向いています。',
        usageStepShareHint: 'コピー / 画像 / HTML',
        usageStepShareTitle: '用途に合わせて保存',
        usageStepStartBody:
            '日本語を入力、またはサンプル文を入れて読みとアクセントを解析します。',
        usageStepStartHint: '貼り付け / サンプル',
        usageStepStartTitle: '解析を始める',
        usageStepOne: '日本語テキストを貼り付けるか、サンプル文を入れて解析を始めます。',
        usageStepThree:
            '学習メモや共有方法に合わせて、テキスト・HTML・画像のいずれかで書き出します。',
        usageStepTwo:
            '生成された読みとアクセントを確認し、必要な箇所は結果パネル上で直接修正します。',
    },
    zh: {
        accentMarkerLabel: 'Accent Marker',
        accentResultLabel: '音調分析結果',
        accentToggle: '音調',
        temporaryIssuesBody:
            '系統目前暫時無法進行分析，開發團隊正在積極搶救，請稍後再試一次。',
        temporaryIssuesClose: '關閉',
        temporaryIssuesTitle: '系統發生問題',
        collapseResult: '收合結果面板',
        copyAsText: '複製為文字',
        copyFailed: '複製失敗',
        copied: '已複製',
        dismissResultHint: '關閉編輯提示',
        editFurigana: '編輯振假名',
        expandResult: '展開結果面板',
        exportHtml: 'HTML',
        exportHtmlSuccess: '已匯出 HTML',
        exportImage: '圖片',
        exportOptions: '匯出選項',
        exportThemeDark: '深色',
        exportThemeLight: '淺色',
        fallbackStatus: '伺服器沒有回應，因此改為顯示簡化分析結果。',
        footerFacebookLabel: 'Facebook',
        footerGithubLabel: 'GitHub',
        footerInstagramLabel: 'Instagram',
        footerMailLabel: '電子郵件',
        footerSocialHeading: '社群媒體',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'Sessatakuma 正在開發日語學習相關工具，也在規劃以工具輔助的口說練習社群。這不只是論壇，而是結合學習小組、練習計畫與引導式實作的練習環境，幫助學習者更有效地累積開口說日語的信心。',
        footerWhatHeading: '我們是誰',
        faviconAltBrand: 'せっさたくま',
        furiganaInputWarning: '振假名只能輸入假名',
        heading: 'Accent Marker | 日語音調與振假名工具',
        htmlExportAriaLabel: '音調標註文字匯出',
        htmlExportTitle: 'Accent Marker Export',
        inputAriaLabel: '要分析的日語文字',
        inputDescription:
            '分析結果會顯示在右側結果區域。編輯時可以切換音調，也可以直接修改振假名。',
        inputLabel: '要分析的日語文字',
        inputPanelLabel: '輸入',
        inputPlaceholder: '輸入日語文字...',
        inputTools: '輸入工具',
        pageDescription:
            '貼上日語文字，自動加入振假名與音高音調標記，之後還可編輯並匯出結果。',
        pasteFromClipboard: '從剪貼簿貼上',
        randomSample: '插入隨機範文',
        result: '結果',
        resultActions: '結果操作',
        resultHint: '分析完成，點擊振假名或音調可進行編輯',
        resultPanelLabel: '結果',
        resultsAndInput: '輸入與分析結果',
        saveAndCopy: '匯出與複製',
        statusAnalyzing: '分析中',
        statusUpdated: count => `分析結果已更新，目前顯示 ${count} 個詞語。`,
        switchAccent: '切換音調',
        title: 'Accent Marker | Japanese Pitch Accent & Furigana Tool',
        toggleImageTheme: isDarkResult =>
            `將圖片主題切換為${isDarkResult ? '淺色' : '深色'}`,
        usageEyebrow: '使用方式',
        usageHeading: '讓日語發音更自然、意思更清楚',
        usageIntro:
            'Accent Marker 將日語文字整理成可複習、可校對、可分享的發音素材。',
        usagePitchFallBody: '後段詞語或接續的助詞會轉為低音。',
        usagePitchFallTitle: '高音後下降',
        usagePitchFlatBody:
            '水平線範圍維持高音，詞內沒有下降。',
        usagePitchFlatTitle: '高音不下降',
        usagePitchHeading: '為什麼需要音調線',
        usagePitchIntro:
            '日語音調不僅影響發音自然度，更會影響詞彙的含義。\n掌握音調，讓你不再詢問店員「不好意思，店裡有橋嗎？」',
        usagePitchNoneBody:
            '像 の、で、は 這類助詞，本身不帶高音標記，會接續前詞音高。',
        usagePitchNoneTitle: '低音/接續前音',
        usageStepAccentBody:
            '點一下音調線即可切換音型。若游標停在振假名格的尾端，也可以用上下方向鍵循環切換音調。',
        usageStepAccentHint: '點線 / 上下方向鍵',
        usageStepAccentTitle: '調整音調',
        usageStepEditBody:
            '點擊振假名或音調以編輯，音調會在三種模式循環切換、支援上下方向鍵。',
        usageStepEditTitle: '確認讀音與音調',
        usageStepFuriganaBody:
            '直接點振假名文字就能編輯。用左右方向鍵可在不同讀音格之間移動，方便逐格校對。',
        usageStepFuriganaHint: '輸入假名 / 左右方向鍵',
        usageStepFuriganaTitle: '修改振假名',
        usageStepShareBody:
            '文字適合筆記或備忘稿，圖片適合分享或製作文件，HTML 輸出可以 Markdown 等形式進一步運用。',
        usageStepShareHint: '複製 / 圖片 / HTML',
        usageStepShareTitle: '依用途儲存',
        usageStepStartBody:
            '輸入詞句、貼上文章或插入隨機範文，系統會開始進行讀音與音調分析。',
        usageStepStartHint: '貼上 / 隨機範文',
        usageStepStartTitle: '開始分析',
        usageStepOne: '貼上日語文字，或先插入隨機範文開始新的分析。',
        usageStepThree: '依照用途匯出成文字、HTML 或圖片，方便整理筆記或分享。',
        usageStepTwo: '檢查產生的讀音與音調，必要時直接在結果面板中修正細節。',
    },
};

export const localeToLang: Record<Locale, string> = {
    en: 'en',
    ja: 'ja',
    zh: 'zh-Hant',
};

export function normalizeLocale(rawLocale: string | null | undefined): Locale | null {
    if (!rawLocale) {
        return null;
    }

    const value = rawLocale.toLowerCase();
    if (value.startsWith('ja')) {
        return 'ja';
    }
    if (value.startsWith('zh')) {
        return 'zh';
    }
    if (value.startsWith('en')) {
        return 'en';
    }

    return null;
}
