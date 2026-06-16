export type Locale = 'en' | 'ja' | 'zh';

export interface TranslationSet {
    brandLabel: string;
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
    footerSocialPendingMessage: string;
    footerThreadsLabel: string;
    footerWhatBody: string;
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
    randomSampleButtonLabel: string;
    result: string;
    resultActions: string;
    resultHint: string;
    resultPanelLabel: string;
    resultsAndInput: string;
    restoreAllEdits: string;
    restoreAllEditsCancel: string;
    restoreAllEditsConfirm: string;
    restoreAllEditsDialogBody: string;
    restoreAllEditsDialogTitle: string;
    saveAndCopy: string;
    statusAnalyzing: string;
    statusUpdated: (count: number) => string;
    switchAccent: string;
    title: string;
    toggleImageTheme: (isDarkResult: boolean) => string;
    pasteFromClipboard: string;
    usageEyebrow: string;
    usageGuideButton: string;
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
        brandLabel: 'AkuMa',
        accentResultLabel: 'Pitch accent analysis result',
        accentToggle: 'Accent',
        temporaryIssuesBody:
            'The system is temporarily unable to analyze text. The development team is actively working on it, so please try again later.',
        temporaryIssuesClose: 'Close',
        temporaryIssuesTitle: 'System issue',
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
        footerSocialPendingMessage: 'We are working on this account.',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'Sessatakuma is developing tools for Japanese learning and planning a Japanese speaking practice community. By sharing the complete practice system our team members built in the past, along with tools designed for that system, we want to help learners make speaking practice more efficient and steadily build the confidence to speak Japanese.',
        faviconAltBrand: 'Sessatakuma',
        furiganaInputWarning: 'Only kana can be entered for furigana',
        heading: 'AkuMa | Japanese Pitch Accent & Furigana Tool',
        htmlExportAriaLabel: 'Accent-marked text export',
        htmlExportTitle: 'AkuMa Export',
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
        randomSample: 'Insert random sample',
        randomSampleButtonLabel: 'Insert sample',
        result: 'Result',
        resultActions: 'Result actions',
        resultHint: 'Analysis complete. Click furigana or accent marks to edit',
        resultPanelLabel: 'Result',
        resultsAndInput: 'Input and analysis result',
        restoreAllEdits: 'Restore all edits',
        restoreAllEditsCancel: 'Cancel',
        restoreAllEditsConfirm: 'Restore',
        restoreAllEditsDialogBody:
            'This will discard all furigana and accent edits and return the result to the latest analyzed state.',
        restoreAllEditsDialogTitle: 'Restore all edits?',
        saveAndCopy: 'Export and copy',
        statusAnalyzing: 'Analyzing',
        statusUpdated: count => `Analysis updated. Displaying ${count} words.`,
        switchAccent: 'Toggle accent',
        title: 'AkuMa | Japanese Pitch Accent & Furigana Tool',
        toggleImageTheme: isDarkResult =>
            `Switch image theme to ${isDarkResult ? 'light' : 'dark'}`,
        usageEyebrow: 'Usage',
        usageGuideButton: 'Guide',
        usageHeading: 'Make Japanese pronunciation natural and clear',
        usageIntro:
            'AkuMa turns Japanese text into pronunciation material you can review, check, and share.',
        usagePitchFallBody:
            'Following words or attached particles shift to low pitch.',
        usagePitchFallTitle: 'High, then fall',
        usagePitchFlatBody:
            'The marked span stays high, with no fall inside the word.',
        usagePitchFlatTitle: 'High, no fall',
        usagePitchHeading: 'Why the accent line matters',
        usagePitchIntro:
            'Beyond naturalness, pitch accent can also affect word meaning. Master the right pitch so you no longer ask a shop clerk, "Excuse me, does this store have any bridges?"',
        usagePitchNoneBody:
            'Particles like の, で, and は follow the previous word instead of carrying their own high mark.',
        usagePitchNoneTitle: 'Low / follows previous pitch',
        usageStepAccentBody:
            'Press Up from a furigana cell to focus its accent line. Move across the accent row with Left and Right, then press Enter or Space to switch the pitch pattern.',
        usageStepAccentHint: 'Up, Left/Right, Enter',
        usageStepAccentTitle: 'Adjust accent',
        usageStepEditBody:
            'Click furigana to edit readings, or focus accent marks to adjust pitch. Accent controls cycle through three modes with Enter or Space.',
        usageStepEditTitle: 'Check readings and accent',
        usageStepFuriganaBody:
            'Click the furigana text to edit it directly. Use Left and Right to move across reading cells while keeping your hands on the keyboard.',
        usageStepFuriganaHint: 'Type kana, then Left/Right',
        usageStepFuriganaTitle: 'Edit furigana',
        usageStepShareBody:
            'Text works well for notes or drafts, images for sharing or documents, and HTML output can be reused in formats such as Markdown.',
        usageStepShareHint: 'Copy, image, or HTML',
        usageStepShareTitle: 'Save in the right format',
        usageStepStartBody:
            'Enter words or sentences, paste an article, or insert a random sample to start reading and accent analysis.',
        usageStepStartHint: 'Paste or random sample',
        usageStepStartTitle: 'Start analysis',
        usageStepOne: 'Paste Japanese text or insert a random sample to start a new analysis.',
        usageStepThree:
            'Export the result as text, HTML, or an image depending on how you want to study or share it.',
        usageStepTwo:
            'Review the generated reading, then click furigana or accent lines to correct details directly in the result panel.',
    },
    ja: {
        brandLabel: 'AkuMa',
        accentResultLabel: 'アクセント解析結果',
        accentToggle: 'アクセント',
        temporaryIssuesBody:
            '現在システムで一時的に分析を実行できません。開発チームが対応中ですので、少し時間をおいて再度お試しください。',
        temporaryIssuesClose: '閉じる',
        temporaryIssuesTitle: 'システムの問題',
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
        footerSocialPendingMessage: 'このアカウントは準備中です。',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'Sessatakuma は日本語学習に関するツールを開発しながら、日本語の会話練習コミュニティの立ち上げを計画しています。チームメンバーが以前に築いた練習体系と、そのために開発した各種ツールを提供することで、学習者が会話練習の効率を高め、日本語を話す自信を着実に積み重ねられるよう支援します。',
        faviconAltBrand: 'Sessatakuma',
        furiganaInputWarning: 'ふりがなにはかなのみ入力できます',
        heading: 'AkuMa | 日本語アクセント・ふりがなツール',
        htmlExportAriaLabel: 'アクセント付きテキスト書き出し',
        htmlExportTitle: 'AkuMa Export',
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
        randomSample: 'ランダム例文を挿入',
        randomSampleButtonLabel: '例文を挿入',
        result: '結果',
        resultActions: '結果の操作',
        resultHint: '分析完了。ふりがな・アクセントをクリックして編集',
        resultPanelLabel: '結果',
        resultsAndInput: '入力と解析結果',
        restoreAllEdits: 'すべての編集を元に戻す',
        restoreAllEditsCancel: 'キャンセル',
        restoreAllEditsConfirm: '元に戻す',
        restoreAllEditsDialogBody:
            'ふりがなとアクセントの編集内容をすべて破棄し、最新の解析結果の状態に戻します。',
        restoreAllEditsDialogTitle: 'すべての編集を元に戻しますか？',
        saveAndCopy: '書き出しとコピー',
        statusAnalyzing: '分析中',
        statusUpdated: count => `解析結果を更新しました。${count}件の語を表示しています。`,
        switchAccent: 'アクセントを切り替え',
        title: 'AkuMa | 日本語アクセント・ふりがなツール',
        toggleImageTheme: isDarkResult =>
            `画像テーマを${isDarkResult ? 'ライト' : 'ダーク'}に切り替え`,
        usageEyebrow: '使い方',
        usageGuideButton: '使い方',
        usageHeading: '日本語の発音を自然に、意味を明確に',
        usageIntro:
            'AkuMa は日本語テキストを、復習・確認・共有しやすい発音素材に整えます。',
        usagePitchFallBody:
            '後ろに続く語や助詞は低くなります。',
        usagePitchFallTitle: '高く、あとで下がる',
        usagePitchFlatBody:
            '横線の範囲は高いまま続き、語の中では下がりません。',
        usagePitchFlatTitle: '高いまま下がらない',
        usagePitchHeading: 'アクセント線を見る理由',
        usagePitchIntro:
            '自然さだけでなく、アクセントは語の意味にも関わります。正しい音調を身につければ、店員さんに「すみません、この店に橋はありますか？」と聞いてしまうこともなくなります。',
        usagePitchNoneBody:
            'の・で・は などの助詞は、自分ではなく前の語の高さに続きます。',
        usagePitchNoneTitle: '低音 / 前の音に続く',
        usageStepAccentBody:
            'ふりがなセルで上キーを押すと、対応するアクセント線に移動します。アクセント行では左右キーで移動し、Enter または Space で音調を切り替えます。',
        usageStepAccentHint: '上キー / 左右 / Enter',
        usageStepAccentTitle: 'アクセントを直す',
        usageStepEditBody:
            'ふりがなをクリックして読みを編集し、アクセント線にフォーカスして音調を調整できます。アクセントは Enter または Space で3つのモードを循環します。',
        usageStepEditTitle: '読みとアクセントを確認',
        usageStepFuriganaBody:
            'ふりがな部分をクリックしてそのまま編集できます。左右キーを使うと、読みの区切りをまたいで次のセルへ移動できます。',
        usageStepFuriganaHint: 'かなを入力 / 左右キー',
        usageStepFuriganaTitle: 'ふりがなを直す',
        usageStepShareBody:
            'テキストはメモや下書き、画像は共有や資料作成に向いています。HTML 出力は Markdown などの形式でさらに活用できます。',
        usageStepShareHint: 'コピー / 画像 / HTML',
        usageStepShareTitle: '用途に合わせて保存',
        usageStepStartBody:
            '単語や文を入力するか、文章を貼り付けるか、ランダムな例文を入れると、読みとアクセントの解析が始まります。',
        usageStepStartHint: '貼り付け / ランダム例文',
        usageStepStartTitle: '解析を始める',
        usageStepOne: '日本語テキストを貼り付けるか、ランダム例文を入れて解析を始めます。',
        usageStepThree:
            '学習メモや共有方法に合わせて、テキスト・HTML・画像のいずれかで書き出します。',
        usageStepTwo:
            '生成された読みとアクセントを確認し、必要な箇所は結果パネル上で直接修正します。',
    },
    zh: {
        brandLabel: 'AkuMa',
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
        footerSocialPendingMessage: '這個帳號還在準備中。',
        footerThreadsLabel: 'Threads',
        footerWhatBody:
            'Sessatakuma 正在開發日語學習相關工具，也正計劃創立一個日文口說練習社群，透過提供團隊成員過去建立的完整練習體系與為其開發出的各式工具，幫助學習者提升口說練習效率、有效累積開口說日語的信心。',
        faviconAltBrand: 'Sessatakuma',
        furiganaInputWarning: '振假名只能輸入假名',
        heading: 'AkuMa | 日語音調與振假名工具',
        htmlExportAriaLabel: '音調標註文字匯出',
        htmlExportTitle: 'AkuMa Export',
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
        randomSampleButtonLabel: '插入範文',
        result: '結果',
        resultActions: '結果操作',
        resultHint: '分析完成，點擊振假名或音調可進行編輯',
        resultPanelLabel: '結果',
        resultsAndInput: '輸入與分析結果',
        restoreAllEdits: '還原所有編輯',
        restoreAllEditsCancel: '取消',
        restoreAllEditsConfirm: '還原',
        restoreAllEditsDialogBody:
            '這會捨棄目前所有振假名與音調編輯，並回到最近一次分析完成時的結果。',
        restoreAllEditsDialogTitle: '要還原所有編輯嗎？',
        saveAndCopy: '匯出與複製',
        statusAnalyzing: '分析中',
        statusUpdated: count => `分析結果已更新，目前顯示 ${count} 個詞語。`,
        switchAccent: '切換音調',
        title: 'AkuMa | 日文讀音與音調分析工具',
        toggleImageTheme: isDarkResult =>
            `將圖片主題切換為${isDarkResult ? '淺色' : '深色'}`,
        usageEyebrow: '使用方式',
        usageGuideButton: '使用說明',
        usageHeading: '讓日語發音更自然、意思更清楚',
        usageIntro:
            'AkuMa 將日語文字整理成可複習、可校對、可分享的發音素材。',
        usagePitchFallBody: '後段詞語或接續的助詞會轉為低音。',
        usagePitchFallTitle: '高音後下降',
        usagePitchFlatBody:
            '水平線範圍維持高音，詞內沒有下降。',
        usagePitchFlatTitle: '高音不下降',
        usagePitchHeading: '為什麼需要音調線',
        usagePitchIntro:
            '除了自然度，音調更會影響詞彙的含義。掌握正確音調，讓你不再詢問店員「不好意思，店裡有橋嗎？」',
        usagePitchNoneBody:
            '像 の、で、は 這類助詞，本身不帶高音標記，會接續前詞音高。',
        usagePitchNoneTitle: '低音/接續前音',
        usageStepAccentBody:
            '在振假名格按上方向鍵可移到對應的音調線。進入音調列後，用左右方向鍵移動，再按 Enter 或 Space 切換音型。',
        usageStepAccentHint: '上鍵 / 左右 / Enter',
        usageStepAccentTitle: '調整音調',
        usageStepEditBody:
            '點擊振假名可修改讀音，聚焦音調線後可調整音調。音調控制用 Enter 或 Space 在三種模式間切換。',
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
