import Foundation
import NaturalLanguage
import SwiftUI
import UIKit

struct ContentView: View {
    @State private var paragraph = ContentView.initialParagraph()
    @State private var words: [AccentWord] = []
    @State private var analyzedWords: [AccentWord] = []
    @State private var pastWords: [[AccentWord]] = []
    @State private var futureWords: [[AccentWord]] = []
    @State private var showAccent = true
    @State private var isDarkResult = false
    @State private var isResultExpanded = false
    @State private var isAnalyzing = false
    @State private var isStreaming = false
    @State private var isAnalysisIssuePresented = false
    @State private var isGuidePresented = false
    @State private var resultStatusOverride: String?
    @State private var analysisTask: Task<Void, Never>?
    @State private var lastSampleIndex: Int?

    private static let analysisDebounceNanoseconds: UInt64 = 800_000_000
    private let text = AppText.current
    private let guideText = GuideText.current

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                NavigationBar(text: text, guideLabel: guideText.guide) {
                    isGuidePresented = true
                }

                ScrollView {
                    EditorSection(
                        paragraph: $paragraph,
                        words: $words,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        isAnalyzing: isAnalyzing,
                        isStreaming: isStreaming,
                        canRestore: words != analyzedWords,
                        canUndo: !pastWords.isEmpty,
                        canRedo: !futureWords.isEmpty,
                        statusText: resultStatusOverride,
                        text: text,
                        viewportSize: CGSize(
                            width: geometry.size.width,
                            height: max(geometry.size.height - AkumaTheme.navHeight, 0)
                        ),
                        onPaste: pasteFromClipboard,
                        onInsertSample: insertSample,
                        onUpdateUnit: updateUnit,
                        onUndo: undoResultEdit,
                        onRedo: redoResultEdit,
                        onRestore: restoreResultEdits
                    )
                    .frame(width: geometry.size.width)
                }
                .background(AkumaTheme.background)
                .scrollIndicators(.hidden)
            }
            .frame(width: geometry.size.width, height: geometry.size.height, alignment: .top)
            .background(AkumaTheme.background)
        }
        .sheet(isPresented: $isResultExpanded) {
            ExpandedResultView(
                words: $words,
                paragraph: paragraph,
                showAccent: $showAccent,
                isDarkResult: $isDarkResult,
                isResultExpanded: $isResultExpanded,
                text: text,
                canRestore: words != analyzedWords,
                canUndo: !pastWords.isEmpty,
                canRedo: !futureWords.isEmpty,
                onUpdateUnit: updateUnit,
                onUndo: undoResultEdit,
                onRedo: redoResultEdit,
                onRestore: restoreResultEdits
            )
        }
        .alert(text.temporaryIssuesTitle, isPresented: $isAnalysisIssuePresented) {
            Button(text.done, role: .cancel) {}
        } message: {
            Text(text.temporaryIssuesBody)
        }
        .sheet(isPresented: $isGuidePresented) {
            GuideView(text: guideText)
        }
        .onChange(of: paragraph) { _, newValue in
            resultStatusOverride = nil
            scheduleAnalysis(for: newValue)
        }
        .onDisappear {
            analysisTask?.cancel()
        }
        .task {
            if !paragraph.isEmpty {
                scheduleAnalysis(for: paragraph, debounceNanoseconds: 0)
            }
        }
    }

    private func scheduleAnalysis(
        for sourceParagraph: String,
        debounceNanoseconds: UInt64 = Self.analysisDebounceNanoseconds
    ) {
        analysisTask?.cancel()
        isAnalyzing = false
        isStreaming = false

        guard !sourceParagraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            words = []
            return
        }

        analysisTask = Task {
            if debounceNanoseconds > 0 {
                do {
                    try await Task.sleep(nanoseconds: debounceNanoseconds)
                } catch {
                    return
                }
            }

            if Task.isCancelled {
                return
            }

            await fetchAnalysis(for: sourceParagraph)
        }
    }

    @MainActor
    private func fetchAnalysis(for sourceParagraph: String) async {
        guard !sourceParagraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        isAnalyzing = false
        isStreaming = false
        resultStatusOverride = nil
        let visibleLoadingTask = Task { @MainActor in
            do {
                try await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                return
            }

            guard paragraph == sourceParagraph, !Task.isCancelled else {
                return
            }
            isAnalyzing = true
        }

        do {
            let analyzedWords = try await MarkAccentAPI.analyze(sourceParagraph) { streamedWords in
                guard paragraph == sourceParagraph, !Task.isCancelled else {
                    return
                }

                visibleLoadingTask.cancel()
                withAnimation(.easeOut(duration: 0.2)) {
                    words = streamedWords
                }
                isAnalyzing = false
                isStreaming = true
            }
            guard paragraph == sourceParagraph, !Task.isCancelled else {
                return
            }

            words = analyzedWords
            self.analyzedWords = analyzedWords
            pastWords = []
            futureWords = []
            isAnalyzing = false
            isStreaming = false
        } catch is CancellationError {
            visibleLoadingTask.cancel()
            if paragraph == sourceParagraph {
                isAnalyzing = false
                isStreaming = false
            }
        } catch {
            visibleLoadingTask.cancel()
            if paragraph == sourceParagraph, !Task.isCancelled {
                words = MockAccentAnalyzer.analyze(sourceParagraph)
                analyzedWords = words
                pastWords = []
                futureWords = []
                resultStatusOverride = text.analysisFailed
                isAnalysisIssuePresented = true
                isAnalyzing = false
                isStreaming = false
            }
        }
    }

    private func pasteFromClipboard() {
        guard let pastedText = UIPasteboard.general.string, !pastedText.isEmpty else {
            return
        }

        paragraph = pastedText
    }

    private func insertSample() {
        guard !Self.sampleParagraphs.isEmpty else {
            return
        }

        var nextIndex = Int.random(in: Self.sampleParagraphs.indices)
        if Self.sampleParagraphs.count > 1 {
            while nextIndex == lastSampleIndex {
                nextIndex = Int.random(in: Self.sampleParagraphs.indices)
            }
        }

        lastSampleIndex = nextIndex
        paragraph = Self.sampleParagraphs[nextIndex]
    }

    private func updateUnit(wordIndex: Int, unitIndex: Int, reading: String?, accent: AccentKind?) {
        guard words.indices.contains(wordIndex), words[wordIndex].units.indices.contains(unitIndex) else {
            return
        }

        var updatedWords = words
        if let reading {
            let normalizedReading = KanaReading.normalized(reading)
            let syllables = KanaReading.syllables(in: normalizedReading)
            let currentAccent = accent ?? updatedWords[wordIndex].units[unitIndex].accent

            if syllables.isEmpty {
                if updatedWords[wordIndex].units.count == 1 {
                    updatedWords[wordIndex].units[unitIndex] = AccentUnit(
                        reading: "",
                        accent: .none
                    )
                } else {
                    updatedWords[wordIndex].units.remove(at: unitIndex)
                }
            } else {
                let replacementUnits = syllables.enumerated().map { index, syllable in
                    AccentUnit(
                        reading: syllable,
                        accent: index == 0 ? currentAccent : .none
                    )
                }
                updatedWords[wordIndex].units.replaceSubrange(
                    unitIndex...unitIndex,
                    with: replacementUnits
                )
            }
        } else if let accent {
            updatedWords[wordIndex].units[unitIndex].accent = accent
        }
        commitResultEdit(updatedWords)
    }

    private func commitResultEdit(_ updatedWords: [AccentWord]) {
        guard updatedWords != words else {
            return
        }

        pastWords.append(words)
        if pastWords.count > 50 {
            pastWords.removeFirst(pastWords.count - 50)
        }
        futureWords = []
        words = updatedWords
    }

    private func undoResultEdit() {
        guard let previousWords = pastWords.popLast() else {
            return
        }

        futureWords.insert(words, at: 0)
        words = previousWords
    }

    private func redoResultEdit() {
        guard !futureWords.isEmpty else {
            return
        }

        pastWords.append(words)
        words = futureWords.removeFirst()
    }

    private func restoreResultEdits() {
        commitResultEdit(analyzedWords)
    }

    private static func initialParagraph() -> String {
        guard ProcessInfo.processInfo.arguments.contains("--showcase-data") else {
            return ""
        }

        return sampleParagraphs[0]
    }

    private static let sampleParagraphs = [
        "今日は朝から猫がベランダで日向ぼっこしていたので、つい一緒にゴロゴロしてしまった。",
        "近所のパン屋さんで新作のメロンパンを買ったら、予想以上にサクサクで感動した。",
        "図書館で偶然見つけた本が面白すぎて、気づいたら3時間も経っていた。",
        "雨の中を歩いていたら、傘を持っていない猫と目が合って、思わず傘を貸したくなった。",
    ]
}

private enum AkumaTheme {
    static let navHeight: CGFloat = 64
    static let maxContentWidth: CGFloat = 1_400
    static let editorPanelMinHeight: CGFloat = 192
    static let actionControlSize: CGFloat = 44

    static let space1: CGFloat = 4
    static let space2: CGFloat = 8
    static let space3: CGFloat = 12
    static let space4: CGFloat = 16
    static let space5: CGFloat = 24
    static let space6: CGFloat = 32
    static let space7: CGFloat = 48

    static let radiusSmall: CGFloat = 6
    static let radiusMedium: CGFloat = 8
    static let radiusLarge: CGFloat = 16
    static let radiusXLarge: CGFloat = 24

    static let background = Color(hex: 0xE8E3E3)
    static let surface = Color.white
    static let surfaceHover = Color(hex: 0xFAFAF9)
    static let text = Color(hex: 0x1F2937)
    static let secondaryText = Color(hex: 0x6B7280)
    static let invertedText = Color.white
    static let green = Color(hex: 0x619E83)
    static let greenHover = Color(hex: 0x4E7E69)
    static let greenLight = Color(hex: 0xEFF7F4)
    static let red = Color(hex: 0x9E4145)
    static let redLight = Color(hex: 0xFCF2F2)
    static let border = Color(hex: 0xE5E7EB)
    static let darkPanel = Color(hex: 0x1F2937)
    static let darkHover = Color(hex: 0x374151)
    static let darkText = Color(hex: 0xF9FAFB)
    static let darkSecondaryText = Color(hex: 0x9CA3AF)
    static let darkBorder = Color(hex: 0x4B5563)
}

private extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

private struct AppText {
    let brandLabel: String
    let inputPlaceholder: String
    let analyze: String
    let analyzing: String
    let analysisFailed: String
    let pasteFromClipboard: String
    let randomSample: String
    let insertSample: String
    let result: String
    let copyAsText: String
    let copied: String
    let accent: String
    let expandResult: String
    let collapseResult: String
    let share: String
    let darkResult: String
    let lightResult: String
    let resultHint: String
    let editReading: String
    let reading: String
    let accentNone: String
    let accentHigh: String
    let accentDrop: String
    let cancel: String
    let done: String
    let undo: String
    let redo: String
    let restoreAllEdits: String
    let restoreAllEditsTitle: String
    let restoreAllEditsBody: String
    let restore: String
    let furiganaInputWarning: String
    let temporaryIssuesTitle: String
    let temporaryIssuesBody: String
    let exportOptions: String
    let exportText: String
    let exportImage: String
    let exportHTML: String
    let dismissHint: String
    let cycleAccentHint: String

    static var current: AppText {
        let languageCode = Locale.current.language.languageCode?.identifier.lowercased()

        if languageCode == "zh" {
            return .zh
        }

        if languageCode == "ja" {
            return .ja
        }

        return .en
    }

    static let en = AppText(
        brandLabel: "AkuMa",
        inputPlaceholder: "Enter Japanese text...",
        analyze: "Analyze",
        analyzing: "Analyzing...",
        analysisFailed: "API unavailable. Showing a local preview.",
        pasteFromClipboard: "Paste from clipboard",
        randomSample: "Insert random sample",
        insertSample: "Insert sample",
        result: "Result",
        copyAsText: "Copy as text",
        copied: "Copied",
        accent: "accent",
        expandResult: "Expand result",
        collapseResult: "Collapse result",
        share: "Share",
        darkResult: "Dark result",
        lightResult: "Light result",
        resultHint: "Analysis complete. Tap a reading or accent mark to edit.",
        editReading: "Edit reading",
        reading: "Reading",
        accentNone: "Low",
        accentHigh: "High",
        accentDrop: "Drop",
        cancel: "Cancel",
        done: "Done",
        undo: "Undo edit",
        redo: "Redo edit",
        restoreAllEdits: "Restore all edits",
        restoreAllEditsTitle: "Restore all edits?",
        restoreAllEditsBody: "This will discard all reading and accent edits and return the result to the latest analyzed state.",
        restore: "Restore",
        furiganaInputWarning: "Only kana can be entered for a reading.",
        temporaryIssuesTitle: "System issue",
        temporaryIssuesBody: "The system is temporarily unable to analyze text. A simplified local result is shown; please try again later.",
        exportOptions: "Share or export",
        exportText: "Share text",
        exportImage: "Share image",
        exportHTML: "Share HTML",
        dismissHint: "Dismiss edit hint",
        cycleAccentHint: "Tap to change pitch accent"
    )

    static let ja = AppText(
        brandLabel: "AkuMa",
        inputPlaceholder: "文章を入力...",
        analyze: "解析",
        analyzing: "解析中...",
        analysisFailed: "API に接続できません。ローカルプレビューを表示しています。",
        pasteFromClipboard: "クリップボードから貼り付け",
        randomSample: "ランダム例文を挿入",
        insertSample: "例文を挿入",
        result: "結果",
        copyAsText: "テキスト形式でコピー",
        copied: "コピーしました",
        accent: "アクセント",
        expandResult: "結果を拡大表示",
        collapseResult: "結果の拡大表示を閉じる",
        share: "共有",
        darkResult: "ダーク表示",
        lightResult: "ライト表示",
        resultHint: "解析完了。ふりがな・アクセントをタップして編集できます。",
        editReading: "ふりがなを編集",
        reading: "ふりがな",
        accentNone: "低",
        accentHigh: "高",
        accentDrop: "下降",
        cancel: "キャンセル",
        done: "完了",
        undo: "編集を取り消す",
        redo: "編集をやり直す",
        restoreAllEdits: "すべての編集を元に戻す",
        restoreAllEditsTitle: "すべての編集を元に戻しますか？",
        restoreAllEditsBody: "ふりがなとアクセントの編集内容をすべて破棄し、最新の解析結果の状態に戻します。",
        restore: "元に戻す",
        furiganaInputWarning: "ふりがなにはかなのみ入力できます。",
        temporaryIssuesTitle: "システムの問題",
        temporaryIssuesBody: "現在システムで一時的に分析を実行できません。簡易結果を表示していますので、少し時間をおいて再度お試しください。",
        exportOptions: "共有・書き出し",
        exportText: "テキストを共有",
        exportImage: "画像を共有",
        exportHTML: "HTMLを共有",
        dismissHint: "編集ヒントを閉じる",
        cycleAccentHint: "タップしてアクセントを切り替え"
    )

    static let zh = AppText(
        brandLabel: "AkuMa",
        inputPlaceholder: "輸入日語文字...",
        analyze: "分析",
        analyzing: "分析中...",
        analysisFailed: "API 無法連線，正在顯示本機預覽。",
        pasteFromClipboard: "從剪貼簿貼上",
        randomSample: "插入隨機範文",
        insertSample: "插入範文",
        result: "結果",
        copyAsText: "複製為文字",
        copied: "已複製",
        accent: "音調",
        expandResult: "展開結果面板",
        collapseResult: "收合結果面板",
        share: "分享",
        darkResult: "深色結果",
        lightResult: "淺色結果",
        resultHint: "分析完成。點按假名或音調標記即可編輯。",
        editReading: "編輯假名",
        reading: "假名",
        accentNone: "低",
        accentHigh: "高",
        accentDrop: "下降",
        cancel: "取消",
        done: "完成",
        undo: "復原編輯",
        redo: "重做編輯",
        restoreAllEdits: "還原所有編輯",
        restoreAllEditsTitle: "要還原所有編輯嗎？",
        restoreAllEditsBody: "這會捨棄目前所有振假名與音調編輯，並回到最近一次分析完成時的結果。",
        restore: "還原",
        furiganaInputWarning: "振假名只能輸入假名。",
        temporaryIssuesTitle: "系統問題",
        temporaryIssuesBody: "系統目前暫時無法分析文字，已顯示簡化的本機結果，請稍後再試。",
        exportOptions: "分享或匯出",
        exportText: "分享文字",
        exportImage: "分享圖片",
        exportHTML: "分享 HTML",
        dismissHint: "關閉編輯提示",
        cycleAccentHint: "點按以切換音調"
    )
}

private struct GuideText {
    let guide: String
    let heading: String
    let intro: String
    let pitchHeading: String
    let pitchIntro: String
    let pitchNoneTitle: String
    let pitchNoneBody: String
    let pitchHighTitle: String
    let pitchHighBody: String
    let pitchDropTitle: String
    let pitchDropBody: String
    let startTitle: String
    let startBody: String
    let editTitle: String
    let editBody: String
    let shareTitle: String
    let shareBody: String
    let about: String
    let aboutBody: String
    let email: String
    let sourceCode: String
    let socialPending: String
    let close: String

    static var current: GuideText {
        let code = Locale.current.language.languageCode?.identifier.lowercased()
        if code == "zh" { return .zh }
        if code == "ja" { return .ja }
        return .en
    }

    static let en = GuideText(
        guide: "Guide",
        heading: "Make Japanese pronunciation natural and clear",
        intro: "AkuMa turns Japanese text into pronunciation material you can review, correct, and share.",
        pitchHeading: "Why the accent line matters",
        pitchIntro: "Pitch can affect both naturalness and word meaning. AkuMa marks where the voice stays high and where it falls.",
        pitchNoneTitle: "Low / follows",
        pitchNoneBody: "Particles can follow the previous word instead of carrying their own high mark.",
        pitchHighTitle: "High, no fall",
        pitchHighBody: "The marked span stays high with no fall inside the word.",
        pitchDropTitle: "High, then fall",
        pitchDropBody: "The voice falls after this mora; following particles shift low.",
        startTitle: "Start an analysis",
        startBody: "Type or paste Japanese text, or insert a random sample. Analysis starts automatically.",
        editTitle: "Correct the result",
        editBody: "Tap an accent lane to cycle its pitch. Tap a reading to edit both the kana and pitch in a focused sheet. Undo, redo, or restore from the actions menu.",
        shareTitle: "Save in the right format",
        shareBody: "Copy text for notes, or share a native image, HTML file, or plain text through the system share sheet.",
        about: "About Sessatakuma",
        aboutBody: "Sessatakuma develops Japanese-learning tools and is planning a speaking-practice community. We share the practice system and tools our team built to help learners practice efficiently and build confidence speaking Japanese.",
        email: "Email us",
        sourceCode: "Source code",
        socialPending: "More social accounts are coming soon.",
        close: "Close"
    )

    static let ja = GuideText(
        guide: "使い方",
        heading: "日本語の発音を、より自然に、より明瞭に",
        intro: "AkuMa は日本語テキストを、確認・修正・共有できる発音教材に変換します。",
        pitchHeading: "アクセント線の見方",
        pitchIntro: "ピッチアクセントは自然さだけでなく、単語の意味にも影響します。声が高い部分と下がる位置を線で示します。",
        pitchNoneTitle: "低い・前に従う",
        pitchNoneBody: "助詞などは独自の高い印を持たず、前の単語のピッチに従います。",
        pitchHighTitle: "高い・下降なし",
        pitchHighBody: "印のある範囲は高いままで、単語の途中では下がりません。",
        pitchDropTitle: "高い・その後下降",
        pitchDropBody: "この拍の後で声が下がり、後続する助詞も低くなります。",
        startTitle: "解析を始める",
        startBody: "日本語を入力・貼り付けするか、例文を挿入します。解析は自動で始まります。",
        editTitle: "結果を修正する",
        editBody: "アクセント線をタップして切り替え、ふりがなをタップして読みとピッチを編集します。操作メニューから取り消し・やり直し・全復元もできます。",
        shareTitle: "用途に合わせて保存する",
        shareBody: "ノート用にテキストをコピーしたり、画像・HTML・テキストをiOSの共有シートから保存できます。",
        about: "Sessatakuma について",
        aboutBody: "Sessatakuma は日本語学習ツールを開発しながら、会話練習コミュニティを計画しています。チームが築いた練習体系とツールを共有し、効率的な練習と話す自信づくりを支援します。",
        email: "メール",
        sourceCode: "ソースコード",
        socialPending: "その他のSNSアカウントは準備中です。",
        close: "閉じる"
    )

    static let zh = GuideText(
        guide: "指南",
        heading: "讓日語發音更自然、更清楚",
        intro: "AkuMa 將日語文字轉換成可以檢查、修正與分享的發音教材。",
        pitchHeading: "如何閱讀音調線",
        pitchIntro: "音調不只影響自然度，也可能改變詞義。線條會標示高音範圍與下降位置。",
        pitchNoneTitle: "低音／承接前詞",
        pitchNoneBody: "部分助詞沒有自己的高音標記，而是承接前一個詞的音調。",
        pitchHighTitle: "高音、不下降",
        pitchHighBody: "標記範圍維持高音，詞內不會下降。",
        pitchDropTitle: "高音、隨後下降",
        pitchDropBody: "聲音在這一拍之後下降，後接助詞也會轉為低音。",
        startTitle: "開始分析",
        startBody: "輸入或貼上日語，也可以插入隨機範文；分析會自動開始。",
        editTitle: "修正結果",
        editBody: "點按音調線即可循環切換；點按假名可在專用面板中修改讀音與音調。操作選單也支援復原、重做與全部還原。",
        shareTitle: "選擇合適的格式",
        shareBody: "可複製文字做筆記，也能透過 iOS 分享面板輸出圖片、HTML 或純文字。",
        about: "關於 Sessatakuma",
        aboutBody: "Sessatakuma 開發日語學習工具，並規劃日語口說練習社群。我們分享團隊建立的練習系統與工具，協助學習者有效練習並建立開口說日語的自信。",
        email: "寄送電子郵件",
        sourceCode: "原始碼",
        socialPending: "其他社群帳號正在準備中。",
        close: "關閉"
    )
}

private struct GuideView: View {
    let text: GuideText
    @Environment(\.dismiss) private var dismiss
    @State private var isAboutPresented = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: AkumaTheme.space7) {
                    VStack(alignment: .leading, spacing: AkumaTheme.space3) {
                        Text(text.heading)
                            .font(.system(size: 34, weight: .bold))
                            .foregroundStyle(AkumaTheme.text)
                        Text(text.intro)
                            .font(.system(size: 17))
                            .foregroundStyle(AkumaTheme.secondaryText)
                    }

                    VStack(alignment: .leading, spacing: AkumaTheme.space4) {
                        Text(text.pitchHeading)
                            .font(.system(size: 24, weight: .bold))
                        Text(text.pitchIntro)
                            .foregroundStyle(AkumaTheme.secondaryText)

                        PitchGuideCard(title: text.pitchNoneTitle, detail: text.pitchNoneBody, accent: .none)
                        PitchGuideCard(title: text.pitchHighTitle, detail: text.pitchHighBody, accent: .flat)
                        PitchGuideCard(title: text.pitchDropTitle, detail: text.pitchDropBody, accent: .drop)
                    }

                    VStack(spacing: AkumaTheme.space3) {
                        GuideStepCard(number: 1, title: text.startTitle, detail: text.startBody, icon: "text.cursor")
                        GuideStepCard(number: 2, title: text.editTitle, detail: text.editBody, icon: "slider.horizontal.3")
                        GuideStepCard(number: 3, title: text.shareTitle, detail: text.shareBody, icon: "square.and.arrow.up")
                    }
                }
                .padding(AkumaTheme.space5)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
            }
            .background(AkumaTheme.background)
            .navigationTitle(text.guide)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        isAboutPresented = true
                    } label: {
                        Label(text.about, systemImage: "info.circle")
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.close) { dismiss() }
                }
            }
            .sheet(isPresented: $isAboutPresented) {
                AboutView(text: text)
            }
        }
    }
}

private struct PitchGuideCard: View {
    let title: String
    let detail: String
    let accent: AccentKind

    var body: some View {
        HStack(alignment: .top, spacing: AkumaTheme.space4) {
            VStack(spacing: AkumaTheme.space2) {
                AccentLineView(accent: accent, isVisible: true)
                    .frame(width: 40, height: 16)
                Text("あ")
                    .font(.system(size: 24))
            }
            .frame(width: 48)

            VStack(alignment: .leading, spacing: AkumaTheme.space1) {
                Text(title).font(.system(size: 17, weight: .semibold))
                Text(detail)
                    .font(.system(size: 15))
                    .foregroundStyle(AkumaTheme.secondaryText)
            }
        }
        .padding(AkumaTheme.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AkumaTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous))
        .shadow(color: Color.black.opacity(0.06), radius: 8, y: 2)
    }
}

private struct GuideStepCard: View {
    let number: Int
    let title: String
    let detail: String
    let icon: String

    var body: some View {
        HStack(alignment: .top, spacing: AkumaTheme.space4) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(AkumaTheme.green)
                .frame(width: 44, height: 44)
                .background(AkumaTheme.greenLight)
                .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous))

            VStack(alignment: .leading, spacing: AkumaTheme.space1) {
                Text("\(number). \(title)")
                    .font(.system(size: 18, weight: .semibold))
                Text(detail)
                    .font(.system(size: 15))
                    .foregroundStyle(AkumaTheme.secondaryText)
            }
        }
        .padding(AkumaTheme.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AkumaTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous))
    }
}

private struct AboutView: View {
    let text: GuideText
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: AkumaTheme.space5) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 72, height: 72)
                    Text("Sessatakuma")
                        .font(.system(size: 28, weight: .bold))
                    Text(text.aboutBody)
                        .font(.system(size: 17))
                        .foregroundStyle(AkumaTheme.secondaryText)

                    Link(destination: URL(string: "mailto:contact@sessatakuma.dev")!) {
                        Label(text.email, systemImage: "envelope")
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AkumaTheme.green)

                    Link(destination: URL(string: "https://github.com/sessatakuma")!) {
                        Label(text.sourceCode, systemImage: "chevron.left.forwardslash.chevron.right")
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .buttonStyle(.bordered)

                    Text(text.socialPending)
                        .font(.system(size: 14))
                        .foregroundStyle(AkumaTheme.secondaryText)
                }
                .padding(AkumaTheme.space5)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .background(AkumaTheme.background)
            .navigationTitle(text.about)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.close) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

private struct NavigationBar: View {
    let text: AppText
    let guideLabel: String
    let onOpenGuide: () -> Void

    var body: some View {
        HStack(spacing: AkumaTheme.space2) {
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(width: 32, height: 32)
                .accessibilityHidden(true)

            Text(text.brandLabel)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(AkumaTheme.invertedText)

            Spacer(minLength: AkumaTheme.space4)

            Button(action: onOpenGuide) {
                Label(guideLabel, systemImage: "book")
                    .font(.system(size: 14, weight: .semibold))
                    .padding(.horizontal, AkumaTheme.space3)
                    .frame(height: AkumaTheme.actionControlSize)
            }
            .buttonStyle(NavigationButtonStyle())
            .accessibilityLabel(guideLabel)
        }
        .padding(.horizontal, AkumaTheme.space5)
        .frame(maxWidth: .infinity)
        .frame(height: AkumaTheme.navHeight)
        .background(AkumaTheme.green)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(AkumaTheme.border)
                .frame(height: 1)
        }
    }
}

private struct NavigationButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(AkumaTheme.invertedText)
            .background(AkumaTheme.invertedText.opacity(configuration.isPressed ? 0.2 : 0.12))
            .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

private struct EditorSection: View {
    @Binding var paragraph: String
    @Binding var words: [AccentWord]
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let isAnalyzing: Bool
    let isStreaming: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let statusText: String?
    let text: AppText
    let viewportSize: CGSize
    let onPaste: () -> Void
    let onInsertSample: () -> Void
    let onUpdateUnit: (Int, Int, String?, AccentKind?) -> Void
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void

    private var isCompact: Bool {
        viewportSize.width <= 768
    }

    private var isTwoColumn: Bool {
        viewportSize.width >= 1_024
    }

    var body: some View {
        Group {
            if isTwoColumn {
                HStack(alignment: .top, spacing: AkumaTheme.space6) {
                    InputPanel(
                        paragraph: $paragraph,
                        text: text,
                        isCompact: false,
                        onPaste: onPaste,
                        onInsertSample: onInsertSample
                    )

                    ResultPanel(
                        words: $words,
                        paragraph: paragraph,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        isAnalyzing: isAnalyzing,
                        isStreaming: isStreaming,
                        canRestore: canRestore,
                        canUndo: canUndo,
                        canRedo: canRedo,
                        statusText: statusText,
                        text: text,
                        isCompact: false,
                        onUpdateUnit: onUpdateUnit,
                        onUndo: onUndo,
                        onRedo: onRedo,
                        onRestore: onRestore
                    )
                }
                .frame(minHeight: max(viewportSize.height - (AkumaTheme.space6 * 2), 520))
                .padding(AkumaTheme.space6)
                .frame(maxWidth: AkumaTheme.maxContentWidth)
                .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: isCompact ? 0 : AkumaTheme.space2) {
                    InputPanel(
                        paragraph: $paragraph,
                        text: text,
                        isCompact: isCompact,
                        onPaste: onPaste,
                        onInsertSample: onInsertSample
                    )
                    .frame(minHeight: compactPanelHeight)

                    ResultPanel(
                        words: $words,
                        paragraph: paragraph,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        isAnalyzing: isAnalyzing,
                        isStreaming: isStreaming,
                        canRestore: canRestore,
                        canUndo: canUndo,
                        canRedo: canRedo,
                        statusText: statusText,
                        text: text,
                        isCompact: isCompact,
                        onUpdateUnit: onUpdateUnit,
                        onUndo: onUndo,
                        onRedo: onRedo,
                        onRestore: onRestore
                    )
                    .frame(minHeight: compactPanelHeight)
                }
                .padding(isCompact ? 0 : AkumaTheme.space5)
                .frame(maxWidth: AkumaTheme.maxContentWidth)
                .frame(maxWidth: .infinity)
            }
        }
        .frame(minHeight: viewportSize.height, alignment: .top)
        .background(AkumaTheme.background)
    }

    private var compactPanelHeight: CGFloat {
        if isCompact {
            return max(viewportSize.height / 2, 280)
        }

        return AkumaTheme.editorPanelMinHeight
    }
}

private struct InputPanel: View {
    @Binding var paragraph: String
    let text: AppText
    let isCompact: Bool
    let onPaste: () -> Void
    let onInsertSample: () -> Void

    var body: some View {
        PanelContainer(isCompact: isCompact) {
            VStack(spacing: 0) {
                ZStack(alignment: .topLeading) {
                    if paragraph.isEmpty {
                        Text(text.inputPlaceholder)
                            .font(.system(size: 24, weight: .regular))
                            .foregroundStyle(AkumaTheme.secondaryText.opacity(0.6))
                            .padding(.top, 40)
                            .padding(.horizontal, AkumaTheme.space5)
                            .allowsHitTesting(false)
                    }

                    TextEditor(text: $paragraph)
                        .font(.system(size: 24, weight: .regular))
                        .foregroundStyle(AkumaTheme.text)
                        .lineSpacing(24)
                        .scrollContentBackground(.hidden)
                        .background(Color.clear)
                        .padding(.top, AkumaTheme.space5)
                        .padding(.horizontal, AkumaTheme.space4)
                        .accessibilityLabel(text.inputPlaceholder)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                HStack(spacing: AkumaTheme.space3) {
                    Spacer(minLength: 0)

                    if paragraph.isEmpty {
                        IconButton(
                            title: text.pasteFromClipboard,
                            systemName: "doc.on.clipboard",
                            style: .plain,
                            action: onPaste
                        )
                    }

                    Button(action: onInsertSample) {
                        if isCompact {
                            Image(systemName: "dice")
                                .font(.system(size: 18, weight: .semibold))
                                .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                        } else {
                            Label(text.insertSample, systemImage: "dice")
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                                .frame(height: AkumaTheme.actionControlSize)
                                .padding(.horizontal, AkumaTheme.space3)
                        }
                    }
                    .buttonStyle(PanelButtonStyle())
                    .accessibilityLabel(text.randomSample)
                }
                .padding(.horizontal, AkumaTheme.space5)
                .padding(.bottom, AkumaTheme.space5)
            }
        }
    }
}

private struct ResultPanel: View {
    @Binding var words: [AccentWord]
    let paragraph: String
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let isAnalyzing: Bool
    let isStreaming: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let statusText: String?
    let text: AppText
    let isCompact: Bool
    let onUpdateUnit: (Int, Int, String?, AccentKind?) -> Void
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void
    @State private var copyFeedbackVisible = false
    @State private var isStatusDismissed = false

    var body: some View {
        PanelContainer(isCompact: isCompact, isDark: isDarkResult) {
            VStack(spacing: 0) {
                Group {
                    if isAnalyzing {
                        SkeletonResultView(
                            paragraph: paragraph,
                            isDarkResult: isDarkResult,
                            analyzingText: text.analyzing
                        )
                    } else {
                        ResultContentView(
                            words: words,
                            showAccent: showAccent,
                            isDarkResult: isDarkResult,
                            emptyText: text.result,
                            text: text,
                            isInteractive: !isStreaming,
                            onUpdateUnit: onUpdateUnit
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .transition(.opacity.combined(with: .offset(y: 8)))

                if !words.isEmpty && !isAnalyzing && !isStreaming {
                    ResultActions(
                        words: words,
                        paragraph: paragraph,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        text: text,
                        isCompact: isCompact,
                        canRestore: canRestore,
                        canUndo: canUndo,
                        canRedo: canRedo,
                        copyFeedbackVisible: $copyFeedbackVisible,
                        onCopy: copyResult,
                        onUndo: onUndo,
                        onRedo: onRedo,
                        onRestore: onRestore
                    )
                }
            }
        }
        .overlay(alignment: .top) {
            if (isAnalyzing || isStreaming || !words.isEmpty) && !isStatusDismissed {
                ResultStatusChip(
                    text: isAnalyzing || isStreaming ? text.analyzing : (statusText ?? text.resultHint),
                    isDark: isDarkResult,
                    dismissLabel: text.dismissHint,
                    onDismiss: isAnalyzing || isStreaming ? nil : { isStatusDismissed = true }
                )
                    .padding(.top, AkumaTheme.space3)
                    .padding(.horizontal, AkumaTheme.space3)
            }
        }
        .overlay(alignment: .bottom) {
            if copyFeedbackVisible {
                Text(text.copied)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(AkumaTheme.invertedText)
                    .padding(.horizontal, AkumaTheme.space4)
                    .frame(height: 36)
                    .background(
                        RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous)
                            .fill(AkumaTheme.green)
                    )
                    .padding(.bottom, AkumaTheme.space7)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.2), value: isAnalyzing)
        .onChange(of: isAnalyzing) { _, newValue in
            if newValue {
                isStatusDismissed = false
            }
        }
        .onChange(of: isStreaming) { oldValue, newValue in
            if oldValue && !newValue {
                isStatusDismissed = false
            }
        }
    }

    private func copyResult() {
        UIPasteboard.general.string = ResultExporter.plainText(words: words, showAccent: showAccent)

        withAnimation(.snappy(duration: 0.24, extraBounce: 0)) {
            copyFeedbackVisible = true
        }

        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_400_000_000)
            withAnimation(.snappy(duration: 0.24, extraBounce: 0)) {
                copyFeedbackVisible = false
            }
        }
    }
}

private struct PanelContainer<Content: View>: View {
    let isCompact: Bool
    var isDark = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(isDark ? AkumaTheme.darkPanel : AkumaTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(isDark ? AkumaTheme.darkBorder : AkumaTheme.border, lineWidth: 1)
            }
    }

    private var cornerRadius: CGFloat {
        isCompact ? 0 : AkumaTheme.radiusXLarge
    }
}

private struct ResultContentView: View {
    let words: [AccentWord]
    let showAccent: Bool
    let isDarkResult: Bool
    let emptyText: String
    let text: AppText
    var isInteractive = true
    let onUpdateUnit: (Int, Int, String?, AccentKind?) -> Void
    @State private var editTarget: ReadingEditTarget?

    var body: some View {
        ScrollView {
            if words.isEmpty {
                Text(emptyText)
                    .font(.system(size: 24, weight: .regular))
                    .foregroundStyle(AkumaTheme.secondaryText.opacity(0.6))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 40)
                    .padding(.horizontal, AkumaTheme.space5)
            } else {
                FlowLayout(spacing: 0, lineSpacing: 10) {
                    ForEach(Array(words.enumerated()), id: \.offset) { wordIndex, word in
                        AccentWordView(
                            word: word,
                            wordIndex: wordIndex,
                            text: text,
                            showAccent: showAccent,
                            isDarkResult: isDarkResult,
                            isInteractive: isInteractive,
                            onCycleAccent: { unitIndex in
                                let accent = word.units[unitIndex].accent.next
                                onUpdateUnit(wordIndex, unitIndex, nil, accent)
                            },
                            onEditReading: { unitIndex in
                                let unit = word.units[unitIndex]
                                editTarget = ReadingEditTarget(
                                    wordIndex: wordIndex,
                                    unitIndex: unitIndex,
                                    reading: unit.reading,
                                    accent: unit.accent
                                )
                            }
                        )
                    }
                }
                .padding(.top, AkumaTheme.space4)
                .padding(.horizontal, AkumaTheme.space5)
                .padding(.bottom, AkumaTheme.space6)
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
        }
        .scrollIndicators(.hidden)
        .sheet(item: $editTarget) { target in
            ReadingEditorSheet(target: target, text: text) { reading, accent in
                onUpdateUnit(target.wordIndex, target.unitIndex, reading, accent)
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }
}

private struct AccentWordView: View {
    let word: AccentWord
    let wordIndex: Int
    let text: AppText
    let showAccent: Bool
    let isDarkResult: Bool
    let isInteractive: Bool
    let onCycleAccent: (Int) -> Void
    let onEditReading: (Int) -> Void

    var body: some View {
        if word.isLineBreak {
            Color.clear
                .frame(width: 1, height: 60)
        } else {
            VStack(spacing: 2) {
                HStack(spacing: 0) {
                    ForEach(Array(word.units.enumerated()), id: \.offset) { unitIndex, unit in
                        VStack(spacing: 2) {
                            Button {
                                onCycleAccent(unitIndex)
                            } label: {
                                AccentLineView(accent: unit.accent, isVisible: showAccent)
                                    .frame(height: 20)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .disabled(!isInteractive)
                            .accessibilityLabel(textForAccent(unit.accent))
                            .accessibilityHint(text.cycleAccentHint)

                            Button {
                                onEditReading(unitIndex)
                            } label: {
                                Text(unit.reading.isEmpty ? "　" : unit.reading)
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundStyle(readingColor)
                                    .lineLimit(1)
                            }
                            .buttonStyle(.plain)
                            .disabled(!isInteractive)
                            .frame(minHeight: 24)
                            .accessibilityLabel(unit.reading.isEmpty ? text.editReading : unit.reading)
                        }
                        .frame(minWidth: unitWidth(unit))
                    }
                }

                Text(word.surface)
                    .font(.system(size: 24, weight: .regular))
                    .foregroundStyle(baseColor)
                    .lineLimit(1)
            }
            .padding(.horizontal, 1)
            .frame(minWidth: minWidth)
        }
    }

    private var minWidth: CGFloat {
        max(CGFloat(max(word.surface.count, 1)) * 18, word.units.reduce(0) { $0 + unitWidth($1) })
    }

    private func unitWidth(_ unit: AccentUnit) -> CGFloat {
        CGFloat(max(unit.reading.count, 1)) * 18
    }

    private var baseColor: Color {
        isDarkResult ? AkumaTheme.darkText : AkumaTheme.text
    }

    private var readingColor: Color {
        isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
    }

    private func textForAccent(_ accent: AccentKind) -> String {
        switch accent {
        case .none: text.accentNone
        case .flat: text.accentHigh
        case .drop: text.accentDrop
        }
    }
}

private struct ReadingEditTarget: Identifiable {
    let wordIndex: Int
    let unitIndex: Int
    let reading: String
    let accent: AccentKind

    var id: String { "\(wordIndex)-\(unitIndex)" }
}

private struct ReadingEditorSheet: View {
    let target: ReadingEditTarget
    let text: AppText
    let onSave: (String, AccentKind) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isReadingFocused: Bool
    @State private var reading: String
    @State private var accent: AccentKind

    init(target: ReadingEditTarget, text: AppText, onSave: @escaping (String, AccentKind) -> Void) {
        self.target = target
        self.text = text
        self.onSave = onSave
        _reading = State(initialValue: target.reading)
        _accent = State(initialValue: target.accent)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(text.reading) {
                    TextField(text.reading, text: $reading)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isReadingFocused)
                        .submitLabel(.done)
                        .onSubmit(save)

                    if !isReadingValid {
                        Label(text.furiganaInputWarning, systemImage: "exclamationmark.circle")
                            .font(.footnote)
                            .foregroundStyle(AkumaTheme.red)
                    }
                }

                Section(text.accent) {
                    Picker(text.accent, selection: $accent) {
                        Text(text.accentNone).tag(AccentKind.none)
                        Text(text.accentHigh).tag(AccentKind.flat)
                        Text(text.accentDrop).tag(AccentKind.drop)
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle(text.editReading)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(text.cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.done, action: save)
                        .disabled(!isReadingValid)
                }
            }
        }
        .task {
            isReadingFocused = true
        }
    }

    private var normalizedReading: String {
        KanaReading.normalized(reading)
    }

    private var isReadingValid: Bool {
        KanaReading.isValid(normalizedReading)
    }

    private func save() {
        guard isReadingValid else {
            return
        }

        onSave(normalizedReading, accent)
        dismiss()
    }
}

private struct AccentLineView: View {
    let accent: AccentKind
    let isVisible: Bool

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if isVisible && accent != .none {
                Rectangle()
                    .fill(AkumaTheme.red)
                    .frame(height: 2)
                    .frame(maxWidth: .infinity, alignment: .bottom)

                if accent == .drop {
                    Rectangle()
                        .fill(AkumaTheme.red)
                        .frame(width: 2, height: 8)
                        .offset(y: 7)
                }
            }
        }
    }
}

private struct ResultActions: View {
    let words: [AccentWord]
    let paragraph: String
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let text: AppText
    let isCompact: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    @Binding var copyFeedbackVisible: Bool
    let onCopy: () -> Void
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void
    @State private var isRestoreConfirmationVisible = false
    @State private var sharePayload: SharePayload?

    private var exportText: String {
        ResultExporter.plainText(words: words, showAccent: showAccent)
    }

    var body: some View {
        HStack(spacing: isCompact ? 0 : AkumaTheme.space2) {
            Button(action: onCopy) {
                if isCompact {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                } else {
                    Label(text.copyAsText, systemImage: "doc.on.doc")
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.copyAsText)

            Button {
                showAccent.toggle()
            } label: {
                if isCompact {
                    Image(systemName: showAccent ? "waveform.path.ecg" : "waveform.path")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                } else {
                    Label(text.accent, systemImage: showAccent ? "waveform.path.ecg" : "waveform.path")
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult, isActive: showAccent))
            .accessibilityLabel(text.accent)

            Spacer(minLength: AkumaTheme.space2)

            Menu {
                Button(action: onUndo) {
                    Label(text.undo, systemImage: "arrow.uturn.backward")
                }
                .disabled(!canUndo)
                .keyboardShortcut("z", modifiers: .command)

                Button(action: onRedo) {
                    Label(text.redo, systemImage: "arrow.uturn.forward")
                }
                .disabled(!canRedo)
                .keyboardShortcut("z", modifiers: [.command, .shift])

                Divider()

                Button(role: .destructive) {
                    isRestoreConfirmationVisible = true
                } label: {
                    Label(text.restoreAllEdits, systemImage: "arrow.counterclockwise")
                }
                .disabled(!canRestore)
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.restoreAllEdits)

            IconButton(
                title: isDarkResult ? text.lightResult : text.darkResult,
                systemName: isDarkResult ? "sun.max" : "moon",
                style: .plain,
                isDark: isDarkResult
            ) {
                isDarkResult.toggle()
            }

            Menu {
                Button(action: shareText) {
                    Label(text.exportText, systemImage: "doc.text")
                }
                Button(action: shareImage) {
                    Label(text.exportImage, systemImage: "photo")
                }
                Button(action: shareHTML) {
                    Label(text.exportHTML, systemImage: "chevron.left.forwardslash.chevron.right")
                }
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.exportOptions)

            IconButton(
                title: isResultExpanded ? text.collapseResult : text.expandResult,
                systemName: isResultExpanded
                    ? "arrow.down.right.and.arrow.up.left"
                    : "arrow.up.left.and.arrow.down.right",
                style: .plain,
                isDark: isDarkResult
            ) {
                isResultExpanded.toggle()
            }
        }
        .padding(.horizontal, isCompact ? AkumaTheme.space4 : AkumaTheme.space5)
        .padding(.top, AkumaTheme.space4)
        .padding(.bottom, AkumaTheme.space5)
        .confirmationDialog(
            text.restoreAllEditsTitle,
            isPresented: $isRestoreConfirmationVisible,
            titleVisibility: .visible
        ) {
            Button(text.restore, role: .destructive, action: onRestore)
            Button(text.cancel, role: .cancel) {}
        } message: {
            Text(text.restoreAllEditsBody)
        }
        .sheet(item: $sharePayload) { payload in
            ActivityShareSheet(items: payload.items)
                .presentationDetents([.medium, .large])
        }
    }

    private func shareText() {
        sharePayload = SharePayload(items: [exportText])
    }

    @MainActor
    private func shareImage() {
        let content = ExportResultSnapshot(
            words: words,
            showAccent: showAccent,
            isDarkResult: isDarkResult
        )
        .frame(width: 720, alignment: .topLeading)

        let renderer = ImageRenderer(content: content)
        renderer.scale = 2
        if let image = renderer.uiImage {
            sharePayload = SharePayload(items: [image])
        }
    }

    private func shareHTML() {
        let html = ResultExporter.html(words: words, showAccent: showAccent, isDark: isDarkResult)
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("akuma-accented-text-\(UUID().uuidString).html")

        do {
            try html.write(to: url, atomically: true, encoding: .utf8)
            sharePayload = SharePayload(items: [url])
        } catch {
            sharePayload = SharePayload(items: [html])
        }
    }
}

private struct ResultStatusChip: View {
    let text: String
    let isDark: Bool
    let dismissLabel: String
    let onDismiss: (() -> Void)?

    var body: some View {
        HStack(spacing: AkumaTheme.space2) {
            Text(text)
                .font(.system(size: 14, weight: .medium))
                .lineLimit(2)
                .multilineTextAlignment(.center)

            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .frame(width: 28, height: 28)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(dismissLabel)
            }
        }
        .foregroundStyle(isDark ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText)
        .padding(.leading, AkumaTheme.space3)
        .padding(.trailing, onDismiss == nil ? AkumaTheme.space3 : AkumaTheme.space1)
        .frame(minHeight: 36)
        .background(
            RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous)
                .fill(isDark ? AkumaTheme.darkPanel : AkumaTheme.surface)
        )
        .shadow(color: Color.black.opacity(isDark ? 0 : 0.08), radius: 6, y: 2)
    }
}

private struct SharePayload: Identifiable {
    let id = UUID()
    let items: [Any]
}

private struct ActivityShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

private struct ExportResultSnapshot: View {
    let words: [AccentWord]
    let showAccent: Bool
    let isDarkResult: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AkumaTheme.space5) {
            HStack(spacing: AkumaTheme.space2) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 32, height: 32)
                Text("AkuMa")
                    .font(.system(size: 20, weight: .bold))
            }

            FlowLayout(spacing: 0, lineSpacing: AkumaTheme.space4) {
                ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                    ExportAccentWordView(
                        word: word,
                        showAccent: showAccent,
                        isDarkResult: isDarkResult
                    )
                }
            }
        }
        .foregroundStyle(isDarkResult ? AkumaTheme.darkText : AkumaTheme.text)
        .padding(AkumaTheme.space6)
        .background(isDarkResult ? AkumaTheme.darkPanel : AkumaTheme.surface)
    }
}

private struct ExportAccentWordView: View {
    let word: AccentWord
    let showAccent: Bool
    let isDarkResult: Bool

    var body: some View {
        if word.isLineBreak {
            Color.clear.frame(width: 1, height: 64)
        } else {
            VStack(spacing: 2) {
                HStack(spacing: 0) {
                    ForEach(Array(word.units.enumerated()), id: \.offset) { _, unit in
                        VStack(spacing: 2) {
                            AccentLineView(accent: unit.accent, isVisible: showAccent)
                                .frame(height: 16)
                            Text(unit.reading.isEmpty ? "　" : unit.reading)
                                .font(.system(size: 14))
                                .foregroundStyle(
                                    isDarkResult
                                        ? AkumaTheme.darkSecondaryText
                                        : AkumaTheme.secondaryText
                                )
                        }
                        .frame(minWidth: CGFloat(max(unit.reading.count, 1)) * 18)
                    }
                }
                Text(word.surface)
                    .font(.system(size: 24))
                    .foregroundStyle(isDarkResult ? AkumaTheme.darkText : AkumaTheme.text)
            }
            .padding(.horizontal, 1)
        }
    }
}

private struct SkeletonResultView: View {
    let paragraph: String
    let isDarkResult: Bool
    let analyzingText: String
    @State private var revealedCharacterCount = 0

    private var characters: [Character] {
        paragraph.filter { !$0.isWhitespace }.map { $0 }
    }

    var body: some View {
        ScrollView {
            FlowLayout(spacing: AkumaTheme.space2, lineSpacing: AkumaTheme.space4) {
                ForEach(Array(characters.enumerated()), id: \.offset) { index, character in
                    VStack(spacing: AkumaTheme.space2) {
                        Capsule()
                            .fill(AkumaTheme.red.opacity(index < revealedCharacterCount ? 0.24 : 0.08))
                            .frame(width: 20, height: 2)
                        RoundedRectangle(cornerRadius: AkumaTheme.radiusSmall)
                            .fill(shimmerColor.opacity(index < revealedCharacterCount ? 0.5 : 0.24))
                            .frame(width: character.isASCII ? 16 : 24, height: 24)
                    }
                    .transition(.opacity)
                }
            }
            .padding(.top, AkumaTheme.space7)
            .padding(.horizontal, AkumaTheme.space5)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .overlay {
            ProgressView()
                .tint(AkumaTheme.green)
                .accessibilityLabel(analyzingText)
        }
        .task(id: paragraph) {
            revealedCharacterCount = 0
            for index in characters.indices {
                guard !Task.isCancelled else { return }
                try? await Task.sleep(nanoseconds: 22_000_000)
                withAnimation(.easeOut(duration: 0.16)) {
                    revealedCharacterCount = index + 1
                }
            }
        }
    }

    private var shimmerColor: Color {
        isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
    }
}

private struct IconButton: View {
    enum ButtonKind {
        case plain
    }

    let title: String
    let systemName: String
    var style: ButtonKind = .plain
    var isDark = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 18, weight: .semibold))
                .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
        }
        .buttonStyle(PanelButtonStyle(isDark: isDark))
        .accessibilityLabel(title)
    }
}

private struct PanelButtonStyle: ButtonStyle {
    var isDark = false
    var isActive = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foregroundColor)
            .background(background(configuration: configuration))
            .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.snappy(duration: 0.15, extraBounce: 0), value: configuration.isPressed)
    }

    private var foregroundColor: Color {
        if isActive {
            return AkumaTheme.green
        }

        return isDark ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
    }

    private func background(configuration: Configuration) -> Color {
        if isActive {
            return AkumaTheme.greenLight
        }

        if configuration.isPressed {
            return isDark ? AkumaTheme.darkHover : AkumaTheme.surfaceHover
        }

        return Color.clear
    }
}

private struct ExpandedResultView: View {
    @Binding var words: [AccentWord]
    let paragraph: String
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let text: AppText
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let onUpdateUnit: (Int, Int, String?, AccentKind?) -> Void
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var copyFeedbackVisible = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(text.result)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(isDarkResult ? AkumaTheme.darkText : AkumaTheme.text)

                Spacer()

                IconButton(
                    title: text.collapseResult,
                    systemName: "xmark",
                    isDark: isDarkResult
                ) {
                    dismiss()
                }
            }
            .padding(AkumaTheme.space5)

            ResultContentView(
                words: words,
                showAccent: showAccent,
                isDarkResult: isDarkResult,
                emptyText: text.result,
                text: text,
                onUpdateUnit: onUpdateUnit
            )

            if !words.isEmpty {
                ResultActions(
                    words: words,
                    paragraph: paragraph,
                    showAccent: $showAccent,
                    isDarkResult: $isDarkResult,
                    isResultExpanded: $isResultExpanded,
                    text: text,
                    isCompact: false,
                    canRestore: canRestore,
                    canUndo: canUndo,
                    canRedo: canRedo,
                    copyFeedbackVisible: $copyFeedbackVisible,
                    onCopy: copyResult,
                    onUndo: onUndo,
                    onRedo: onRedo,
                    onRestore: onRestore
                )
            }
        }
        .background(isDarkResult ? AkumaTheme.darkPanel : AkumaTheme.surface)
    }

    private func copyResult() {
        UIPasteboard.general.string = ResultExporter.plainText(words: words, showAccent: showAccent)
        copyFeedbackVisible = true
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_400_000_000)
            copyFeedbackVisible = false
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat
    var lineSpacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        measure(in: proposal.width ?? 320, subviews: subviews).size
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let result = measure(in: bounds.width, subviews: subviews)

        for (offset, index) in subviews.indices.enumerated() {
            subviews[index].place(
                at: CGPoint(
                    x: bounds.minX + result.positions[offset].x,
                    y: bounds.minY + result.positions[offset].y
                ),
                proposal: .unspecified
            )
        }
    }

    private func measure(in width: CGFloat, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let availableWidth = max(width, 1)
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineHeight: CGFloat = 0
        var measuredWidth: CGFloat = 0

        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)

            if x > 0, x + size.width > availableWidth {
                measuredWidth = max(measuredWidth, x - spacing)
                x = 0
                y += lineHeight + lineSpacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }

        measuredWidth = max(measuredWidth, x > 0 ? x - spacing : 0)

        return (
            CGSize(width: width, height: y + lineHeight),
            positions
        )
    }
}

private struct AccentUnit: Equatable {
    var reading: String
    var accent: AccentKind
}

private struct AccentWord: Equatable {
    let surface: String
    var units: [AccentUnit]
    var isLineBreak = false

    init(surface: String, units: [AccentUnit], isLineBreak: Bool = false) {
        self.surface = surface
        self.units = units
        self.isLineBreak = isLineBreak
    }

    var reading: String {
        units.map(\.reading).joined()
    }

    var accentIndex: Int {
        if let dropIndex = units.firstIndex(where: { $0.accent == .drop }) {
            return dropIndex + 1
        }

        let highIndices = units.indices.filter { units[$0].accent == .flat }
        return highIndices.count == 1 && highIndices.first == 0 ? 1 : 0
    }
}

private enum AccentKind: Hashable {
    case none
    case flat
    case drop

    init(apiValue: Int) {
        switch apiValue {
        case 1:
            self = .flat
        case 2:
            self = .drop
        default:
            self = .none
        }
    }

    var next: AccentKind {
        switch self {
        case .none: .flat
        case .flat: .drop
        case .drop: .none
        }
    }
}

private enum KanaReading {
    private static let smallKana = Set("ゃゅょァィゥェォャュョヮぁぃぅぇぉ")
    private static let supplementalCharacters = Set("ーゔゞ゛゜・･")

    static func normalized(_ text: String) -> String {
        text
            .precomposedStringWithCanonicalMapping
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func isValid(_ text: String) -> Bool {
        text.isEmpty || text.allSatisfy(isReadingCharacter)
    }

    static func isKanaSurface(_ text: String) -> Bool {
        let normalizedText = text.precomposedStringWithCanonicalMapping
        guard !normalizedText.isEmpty else {
            return false
        }

        let punctuation = CharacterSet(charactersIn: "　、。・「」『』（）《》【】！？：；—…‥〜")
        return normalizedText.allSatisfy { character in
            isReadingCharacter(character)
                || character.unicodeScalars.allSatisfy(punctuation.contains)
        }
    }

    static func syllables(in text: String) -> [String] {
        let characters = Array(normalized(text))
        var result: [String] = []
        var index = 0

        while index < characters.count {
            let character = characters[index]
            if index + 1 < characters.count, smallKana.contains(characters[index + 1]) {
                result.append(String([character, characters[index + 1]]))
                index += 2
            } else {
                result.append(String(character))
                index += 1
            }
        }

        return result
    }

    private static func isReadingCharacter(_ character: Character) -> Bool {
        if supplementalCharacters.contains(character) {
            return true
        }

        return character.unicodeScalars.allSatisfy(isKanaScalar)
    }

    private static func isKanaScalar(_ scalar: Unicode.Scalar) -> Bool {
        switch scalar.value {
        case 0x3041...0x3096, 0x30A1...0x30FA:
            true
        default:
            false
        }
    }
}

private enum ResultExporter {
    static func plainText(words: [AccentWord], showAccent: Bool) -> String {
        words.map { word in
            if word.isLineBreak {
                return "\n"
            }

            let reading = word.reading.trimmingCharacters(in: .whitespacesAndNewlines)
            if !showAccent {
                if !reading.isEmpty, reading != word.surface {
                    return "\(word.surface)（\(reading)）"
                }

                return word.surface
            }

            if !reading.isEmpty, reading != word.surface {
                return "\(word.surface)（\(reading)｜\(word.accentIndex)）"
            }

            return "\(word.surface)（\(word.accentIndex)）"
        }
        .joined()
    }

    static func html(words: [AccentWord], showAccent: Bool, isDark: Bool) -> String {
        let wordMarkup = words.map { word in
            if word.isLineBreak {
                return "<span class=\"line-break\"></span>"
            }

            let readingMarkup = word.units.map { unit in
                let accentClass: String
                switch unit.accent {
                case .none: accentClass = "none"
                case .flat: accentClass = "high"
                case .drop: accentClass = "drop"
                }
                let visibleClass = showAccent ? accentClass : "none"
                return "<span class=\"unit \(visibleClass)\">\(escape(unit.reading))</span>"
            }.joined()

            return "<span class=\"word\"><span class=\"reading\">\(readingMarkup)</span><span class=\"surface\">\(escape(word.surface))</span></span>"
        }.joined()

        let background = isDark ? "#1f2937" : "#ffffff"
        let foreground = isDark ? "#f9fafb" : "#1f2937"
        let secondary = isDark ? "#9ca3af" : "#6b7280"

        return """
        <!doctype html>
        <html lang="ja">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>AkuMa Export</title>
          <style>
            body{margin:0;padding:32px;background:\(background);color:\(foreground);font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}
            .result{display:flex;flex-wrap:wrap;align-items:flex-end;line-height:1.15}
            .word{display:inline-flex;flex-direction:column;align-items:center;margin:0 1px 12px}
            .reading{display:flex;color:\(secondary);font-size:14px;min-height:30px}
            .unit{min-width:18px;text-align:center;padding-top:10px;border-top:2px solid transparent}
            .unit.high{border-top-color:#9e4145}.unit.drop{border-top-color:#9e4145;border-right:2px solid #9e4145}
            .surface{font-size:24px}.line-break{flex-basis:100%;height:1px}
          </style>
        </head>
        <body><main class="result" aria-label="Pitch accent analysis result">\(wordMarkup)</main></body>
        </html>
        """
    }

    private static func escape(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#39;")
    }
}

private enum MarkAccentAPI {
    private static let productionOrigin = "https://akuma.sessatakuma.dev"
    private static let streamPath = "/api/mark-accent/stream"

    static func analyze(
        _ text: String,
        onUpdate: @escaping @MainActor ([AccentWord]) -> Void
    ) async throws -> [AccentWord] {
        let endpoint = try streamEndpoint()
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(origin(for: endpoint), forHTTPHeaderField: "Origin")
        request.httpBody = try JSONEncoder().encode(["text": text])

        let (lines, response) = try await URLSession.shared.bytes(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        var accumulatedWords: [AccentWord] = []
        var lastChunkIndex = -1
        for try await line in lines.lines {
            guard let chunk = try? JSONDecoder().decode(MarkAccentStreamChunk.self, from: Data(line.utf8)),
                  chunk.status == 200 else {
                continue
            }

            if chunk.subchunk == 0 {
                let lineBreaks = lastChunkIndex < 0 ? chunk.chunk : chunk.chunk - lastChunkIndex
                accumulatedWords.append(contentsOf: Self.lineBreakWords(count: lineBreaks))
            }
            lastChunkIndex = chunk.chunk
            accumulatedWords.append(contentsOf: chunk.result.map(Self.mapWord))
            await onUpdate(accumulatedWords)
        }

        guard !accumulatedWords.isEmpty else {
            throw APIError.emptyResult
        }

        return accumulatedWords
    }

    private static func streamEndpoint() throws -> URL {
        let configuredOrigin = ProcessInfo.processInfo.environment["AKUMA_API_ORIGIN"] ?? productionOrigin
        let origin = configuredOrigin.trimmingCharacters(in: .whitespacesAndNewlines).trimmingTrailingSlash()
        guard let url = URL(string: "\(origin)\(streamPath)") else {
            throw APIError.invalidURL
        }

        return url
    }

    private static func origin(for url: URL) -> String {
        var components = URLComponents()
        components.scheme = url.scheme
        components.host = url.host
        components.port = url.port
        return components.string ?? productionOrigin
    }

    private static func mapWord(_ word: MarkAccentResultWord) -> AccentWord {
        let hidesReading = KanaReading.isKanaSurface(word.surface)
        let units = word.accent.map { entry in
            AccentUnit(
                reading: hidesReading || entry.furigana == word.surface ? "" : entry.furigana,
                accent: AccentKind(apiValue: entry.accentMarkingType)
            )
        }

        if !units.isEmpty {
            return AccentWord(surface: word.surface, units: units)
        }

        let reading = word.furigana == word.surface ? "" : word.furigana
        return AccentWord(surface: word.surface, units: [AccentUnit(reading: reading, accent: .none)])
    }

    private static func lineBreakWords(count: Int) -> [AccentWord] {
        guard count > 0 else {
            return []
        }

        return Array(
            repeating: AccentWord(surface: "", units: [], isLineBreak: true),
            count: count
        )
    }

    private enum APIError: Error {
        case invalidResponse
        case invalidURL
        case emptyResult
    }
}

private struct MarkAccentStreamChunk: Decodable {
    let chunk: Int
    let subchunk: Int
    let status: Int
    let result: [MarkAccentResultWord]
}

private struct MarkAccentResultWord: Decodable {
    let surface: String
    let furigana: String
    let accent: [MarkAccentEntry]
}

private struct MarkAccentEntry: Decodable {
    let furigana: String
    let accentMarkingType: Int

    private enum CodingKeys: String, CodingKey {
        case furigana
        case accentMarkingType = "accent_marking_type"
    }
}

private extension String {
    func trimmingTrailingSlash() -> String {
        var value = self
        while value.hasSuffix("/") {
            value.removeLast()
        }
        return value
    }
}

private enum MockAccentAnalyzer {
    static func analyze(_ text: String) -> [AccentWord] {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            return []
        }

        if trimmedText.contains("今日は朝から猫") {
            return [
                word("今日", "きょう", [.flat, .flat]),
                word("は", "は", [.none]),
                word("朝", "あさ", [.flat, .drop]),
                word("から", "から", [.none, .none]),
                word("猫", "ねこ", [.flat, .drop]),
                word("が", "が", [.none]),
                word("ベランダ", "べらんだ", [.flat, .flat, .flat, .flat]),
                word("で", "で", [.none]),
                word("日向", "ひなた", [.flat, .flat, .drop]),
                word("ぼっこ", "ぼっこ", [.flat, .flat, .flat]),
                word("して", "して", [.none, .none]),
                word("いた", "いた", [.flat, .drop]),
                word("ので", "ので", [.none, .none]),
                word("、", "", [.none]),
                word("つい", "つい", [.flat, .flat]),
                word("一緒", "いっしょ", [.flat, .flat, .drop]),
                word("に", "に", [.none]),
                word("ゴロゴロ", "ごろごろ", [.flat, .flat, .flat, .flat]),
                word("して", "して", [.none, .none]),
                word("しまった", "しまった", [.flat, .flat, .flat, .drop]),
                word("。", "", [.none]),
            ]
        }

        return fallbackWords(for: text)
    }

    private static func fallbackWords(for text: String) -> [AccentWord] {
        var result: [AccentWord] = []
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false)

        lines.enumerated().forEach { index, line in
            let lineText = String(line)
            let tokenizer = NLTokenizer(unit: .word)
            tokenizer.string = lineText
            var cursor = lineText.startIndex

            tokenizer.enumerateTokens(in: lineText.startIndex..<lineText.endIndex) { range, _ in
                if cursor < range.lowerBound {
                    appendFallbackSegment(String(lineText[cursor..<range.lowerBound]), to: &result)
                }
                appendFallbackSegment(String(lineText[range]), to: &result)
                cursor = range.upperBound
                return true
            }

            if cursor < lineText.endIndex {
                appendFallbackSegment(String(lineText[cursor...]), to: &result)
            }

            if index < lines.count - 1 {
                result.append(AccentWord(surface: "", units: [], isLineBreak: true))
            }
        }

        return result
    }

    private static func appendFallbackSegment(_ surface: String, to result: inout [AccentWord]) {
        guard !surface.isEmpty else {
            return
        }

        let unitCount = KanaReading.isKanaSurface(surface)
            ? max(KanaReading.syllables(in: surface).count, 1)
            : 1
        result.append(
            AccentWord(
                surface: surface,
                units: Array(
                    repeating: AccentUnit(reading: "", accent: .none),
                    count: unitCount
                )
            )
        )
    }

    private static func word(_ surface: String, _ reading: String, _ accents: [AccentKind]) -> AccentWord {
        let syllables = KanaReading.syllables(in: reading)
        let hidesReading = KanaReading.isKanaSurface(surface)
        let units = accents.enumerated().map { index, accent in
            AccentUnit(
                reading: hidesReading ? "" : (index < syllables.count ? syllables[index] : ""),
                accent: accent
            )
        }
        return AccentWord(surface: surface, units: units)
    }
}
