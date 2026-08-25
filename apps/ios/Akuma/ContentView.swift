import Foundation
import NaturalLanguage
import SwiftUI
import UIKit

struct ContentView: View {
    @AppStorage("draftParagraph") private var paragraph = ContentView.initialParagraph()
    @AppStorage("showsPitchAccent") private var showAccent = true
    @State private var words: [AccentWord] = []
    @State private var analyzedWords: [AccentWord] = []
    @State private var pastWords: [[AccentWord]] = []
    @State private var futureWords: [[AccentWord]] = []
    @State private var isDarkResult = false
    @State private var isEditingInput = true
    @State private var isResultExpanded = false
    @State private var isAnalyzing = false
    @State private var isStreaming = false
    @State private var isAnalysisIssuePresented = false
    @State private var isGuidePresented = false
    @State private var isSettingsPresented = false
    @State private var analysisTask: Task<Void, Never>?
    @State private var lastSampleIndex: Int?
    @Environment(\.colorScheme) private var colorScheme

    private let text = AppText.current
    private let guideText = GuideText.current

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                EditorSection(
                    paragraph: $paragraph,
                    words: $words,
                    showAccent: $showAccent,
                    isDarkResult: $isDarkResult,
                    isResultExpanded: $isResultExpanded,
                    isEditingInput: $isEditingInput,
                    isAnalyzing: isAnalyzing,
                    isStreaming: isStreaming,
                    canRestore: words != analyzedWords,
                    canUndo: !pastWords.isEmpty,
                    canRedo: !futureWords.isEmpty,
                    text: text,
                    guideLabel: guideText.guide,
                    viewportSize: geometry.size,
                    onOpenGuide: { isGuidePresented = true },
                    onInsertSample: insertSample,
                    onAnalyze: analyzeParagraph,
                    onOpenSettings: { isSettingsPresented = true },
                    onUpdateWord: updateWord,
                    onUndo: undoResultEdit,
                    onRedo: redoResultEdit,
                    onRestore: restoreResultEdits
                )
                .frame(width: geometry.size.width)
            }
            .background(geometry.size.width <= 768 ? AkumaTheme.surface : AkumaTheme.background)
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
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
                onUpdateWord: updateWord,
                onUndo: undoResultEdit,
                onRedo: redoResultEdit,
                onRestore: restoreResultEdits
            )
        }
        .alert(text.temporaryIssuesTitle, isPresented: $isAnalysisIssuePresented) {
            Button(text.retry) {
                scheduleAnalysis(for: paragraph)
            }
            Button(text.continueUsing, role: .cancel) {}
        } message: {
            Text(text.temporaryIssuesBody)
        }
        .sheet(isPresented: $isGuidePresented) {
            GuideView(text: guideText)
        }
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView(text: guideText)
        }
        .onChange(of: colorScheme) { _, newValue in
            isDarkResult = newValue == .dark
        }
        .onDisappear {
            analysisTask?.cancel()
        }
        .task {
            isDarkResult = colorScheme == .dark
            if ProcessInfo.processInfo.arguments.contains("--showcase-data"), !paragraph.isEmpty {
                scheduleAnalysis(for: paragraph)
                isEditingInput = false
            }
        }
    }

    private func analyzeParagraph() {
        guard !paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        isEditingInput = false
        scheduleAnalysis(for: paragraph)
    }

    private func scheduleAnalysis(for sourceParagraph: String) {
        analysisTask?.cancel()
        isAnalyzing = true
        isStreaming = false

        guard !sourceParagraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            words = []
            return
        }

        analysisTask = Task {
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

        isStreaming = false

        do {
            let analyzedWords = try await MarkAccentAPI.analyze(sourceParagraph) { streamedWords in
                guard paragraph == sourceParagraph, !Task.isCancelled else {
                    return
                }

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
            if paragraph == sourceParagraph {
                isAnalyzing = false
                isStreaming = false
            }
        } catch {
            if paragraph == sourceParagraph, !Task.isCancelled {
                words = MockAccentAnalyzer.analyze(sourceParagraph)
                analyzedWords = words
                pastWords = []
                futureWords = []
                isAnalysisIssuePresented = true
                isAnalyzing = false
                isStreaming = false
            }
        }
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

    private func updateWord(wordIndex: Int, reading: String, accentPosition: Int) {
        guard words.indices.contains(wordIndex) else {
            return
        }

        var updatedWords = words
        updatedWords[wordIndex].apply(reading: reading, accentPosition: accentPosition)
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

    static let background = Color(.secondarySystemBackground)
    static let surface = Color(.systemBackground)
    static let surfaceHover = Color(.secondarySystemBackground)
    static let text = Color.primary
    static let secondaryText = Color.secondary
    static let invertedText = Color(.systemBackground)
    static let green = Color(hex: 0x619E83)
    static let greenHover = Color(hex: 0x4E7E69)
    static let greenLight = Color(hex: 0xEFF7F4)
    static let red = Color(hex: 0x9E4145)
    static let redLight = Color(hex: 0xFCF2F2)
    static let border = Color(.separator)
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
    let inputPlaceholder: String
    let analyzing: String
    let randomSample: String
    let insertSample: String
    let analyze: String
    let editInput: String
    let settings: String
    let result: String
    let resultEmptyHint: String
    let copyAsText: String
    let copied: String
    let accent: String
    let showAccent: String
    let hideAccent: String
    let expandResult: String
    let collapseResult: String
    let share: String
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
    let retry: String
    let continueUsing: String
    let resultOptions: String
    let exportOptions: String
    let exportText: String
    let exportHTML: String
    let editWordHint: String
    let changeAccent: String
    let accentFollowPrevious: String
    let accentNoDrop: String
    let dropAfterFormat: String

    func dropAfter(_ position: Int) -> String {
        String(format: dropAfterFormat, position)
    }

    func accentLabel(for position: Int) -> String {
        if position < 0 {
            return accentFollowPrevious
        }
        if position == 0 {
            return accentNoDrop
        }
        return dropAfter(position)
    }

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
        inputPlaceholder: "Enter Japanese text...",
        analyzing: "Analyzing...",
        randomSample: "Insert random sample",
        insertSample: "Insert sample",
        analyze: "Analyze",
        editInput: "Edit text",
        settings: "Settings",
        result: "Result",
        resultEmptyHint: "Your analyzed reading and pitch accent will appear here.",
        copyAsText: "Copy as text",
        copied: "Copied",
        accent: "accent",
        showAccent: "Show pitch accent",
        hideAccent: "Hide pitch accent",
        expandResult: "Expand result",
        collapseResult: "Collapse result",
        share: "Share",
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
        temporaryIssuesTitle: "Using a local result",
        temporaryIssuesBody: "Online analysis is unavailable. You can keep using this simplified result or try again.",
        retry: "Try Again",
        continueUsing: "Continue",
        resultOptions: "More result options",
        exportOptions: "Share or export",
        exportText: "Share text",
        exportHTML: "Share HTML",
        editWordHint: "Edit this word's reading and pitch accent",
        changeAccent: "Change pitch accent",
        accentFollowPrevious: "Unmarked or follows previous word",
        accentNoDrop: "No drop",
        dropAfterFormat: "Drop after mora %d"
    )

    static let ja = AppText(
        inputPlaceholder: "文章を入力...",
        analyzing: "解析中...",
        randomSample: "ランダム例文を挿入",
        insertSample: "例文を挿入",
        analyze: "解析",
        editInput: "文章を編集",
        settings: "設定",
        result: "結果",
        resultEmptyHint: "解析したふりがなとアクセントがここに表示されます。",
        copyAsText: "テキスト形式でコピー",
        copied: "コピーしました",
        accent: "アクセント",
        showAccent: "アクセントを表示",
        hideAccent: "アクセントを非表示",
        expandResult: "結果を拡大表示",
        collapseResult: "結果の拡大表示を閉じる",
        share: "共有",
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
        temporaryIssuesTitle: "ローカル結果を表示中",
        temporaryIssuesBody: "オンライン解析を利用できません。簡易結果をそのまま使うか、もう一度お試しください。",
        retry: "再試行",
        continueUsing: "このまま使う",
        resultOptions: "その他の結果オプション",
        exportOptions: "共有・書き出し",
        exportText: "テキストを共有",
        exportHTML: "HTMLを共有",
        editWordHint: "この単語のふりがなとアクセントを編集",
        changeAccent: "アクセントを変更",
        accentFollowPrevious: "無印・前の語に従う",
        accentNoDrop: "下降なし",
        dropAfterFormat: "%d拍目の後で下降"
    )

    static let zh = AppText(
        inputPlaceholder: "輸入日語文字...",
        analyzing: "分析中...",
        randomSample: "插入隨機範文",
        insertSample: "插入範文",
        analyze: "分析",
        editInput: "編輯文字",
        settings: "設定",
        result: "結果",
        resultEmptyHint: "分析後的假名與音調會顯示在這裡。",
        copyAsText: "複製為文字",
        copied: "已複製",
        accent: "音調",
        showAccent: "顯示音調線",
        hideAccent: "隱藏音調線",
        expandResult: "展開結果面板",
        collapseResult: "收合結果面板",
        share: "分享",
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
        temporaryIssuesTitle: "正在使用本機結果",
        temporaryIssuesBody: "目前無法使用線上分析。你可以繼續使用簡化結果，或再試一次。",
        retry: "再試一次",
        continueUsing: "繼續使用",
        resultOptions: "更多結果選項",
        exportOptions: "分享或匯出",
        exportText: "分享文字",
        exportHTML: "分享 HTML",
        editWordHint: "編輯這個詞的假名與音調",
        changeAccent: "更改音調",
        accentFollowPrevious: "無標記或承接前詞",
        accentNoDrop: "不下降",
        dropAfterFormat: "第 %d 拍後下降"
    )
}

private struct GuideText {
    let guide: String
    let pitchHeading: String
    let pitchIntro: String
    let pitchNoneTitle: String
    let pitchNoneBody: String
    let pitchHighTitle: String
    let pitchHighBody: String
    let pitchDropTitle: String
    let pitchDropBody: String
    let editBody: String
    let shareBody: String
    let about: String
    let aboutBody: String
    let email: String
    let sourceCode: String
    let close: String

    static var current: GuideText {
        let code = Locale.current.language.languageCode?.identifier.lowercased()
        if code == "zh" { return .zh }
        if code == "ja" { return .ja }
        return .en
    }

    static let en = GuideText(
        guide: "Guide",
        pitchHeading: "Why the accent line matters",
        pitchIntro: "Pitch can affect both naturalness and word meaning. AkuMa marks where the voice stays high and where it falls.",
        pitchNoneTitle: "Low / follows",
        pitchNoneBody: "Particles can follow the previous word instead of carrying their own high mark.",
        pitchHighTitle: "High, no fall",
        pitchHighBody: "The marked span stays high with no fall inside the word.",
        pitchDropTitle: "High, then fall",
        pitchDropBody: "The voice falls after this mora; following particles shift low.",
        editBody: "Tap a word to edit its full reading and pitch pattern. Undo, redo, or restore from the actions menu.",
        shareBody: "Copy text or share an image through the system share sheet. Text and HTML exports are in the actions menu.",
        about: "About Sessatakuma",
        aboutBody: "Japanese reading and pitch-accent analysis.",
        email: "Email us",
        sourceCode: "Source code",
        close: "Close"
    )

    static let ja = GuideText(
        guide: "使い方",
        pitchHeading: "アクセント線の見方",
        pitchIntro: "ピッチアクセントは自然さだけでなく、単語の意味にも影響します。声が高い部分と下がる位置を線で示します。",
        pitchNoneTitle: "低い・前に従う",
        pitchNoneBody: "助詞などは独自の高い印を持たず、前の単語のピッチに従います。",
        pitchHighTitle: "高い・下降なし",
        pitchHighBody: "印のある範囲は高いままで、単語の途中では下がりません。",
        pitchDropTitle: "高い・その後下降",
        pitchDropBody: "この拍の後で声が下がり、後続する助詞も低くなります。",
        editBody: "単語をタップすると、ふりがな全体とアクセントを編集できます。取り消し・やり直し・全復元は操作メニューにあります。",
        shareBody: "テキストをコピーするか、画像をiOSの共有シートで共有できます。テキストとHTMLの書き出しは操作メニューにあります。",
        about: "Sessatakuma について",
        aboutBody: "日本語のふりがなとアクセントを解析します。",
        email: "メール",
        sourceCode: "ソースコード",
        close: "閉じる"
    )

    static let zh = GuideText(
        guide: "指南",
        pitchHeading: "如何閱讀音調線",
        pitchIntro: "音調不只影響自然度，也可能改變詞義。線條會標示高音範圍與下降位置。",
        pitchNoneTitle: "低音／承接前詞",
        pitchNoneBody: "部分助詞沒有自己的高音標記，而是承接前一個詞的音調。",
        pitchHighTitle: "高音、不下降",
        pitchHighBody: "標記範圍維持高音，詞內不會下降。",
        pitchDropTitle: "高音、隨後下降",
        pitchDropBody: "聲音在這一拍之後下降，後接助詞也會轉為低音。",
        editBody: "點按一個詞即可編輯完整假名與音調。復原、重做與全部還原位於操作選單。",
        shareBody: "可複製文字，或透過 iOS 分享面板分享圖片。文字與 HTML 匯出位於操作選單。",
        about: "關於 Sessatakuma",
        aboutBody: "分析日語假名與音調。",
        email: "寄送電子郵件",
        sourceCode: "原始碼",
        close: "關閉"
    )
}

private struct GuideView: View {
    let text: GuideText
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(text.pitchIntro)
                        .foregroundStyle(.secondary)
                }

                Section(text.pitchHeading) {
                    PitchGuideCard(title: text.pitchNoneTitle, detail: text.pitchNoneBody, accent: .none)
                    PitchGuideCard(title: text.pitchHighTitle, detail: text.pitchHighBody, accent: .flat)
                    PitchGuideCard(title: text.pitchDropTitle, detail: text.pitchDropBody, accent: .drop)
                }

                Section {
                    Label(text.editBody, systemImage: "hand.tap")
                    Label(text.shareBody, systemImage: "square.and.arrow.up")
                }
            }
            .navigationTitle(text.guide)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.close) { dismiss() }
                }
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
        .padding(.vertical, AkumaTheme.space1)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct SettingsView: View {
    let text: GuideText
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: AkumaTheme.space3) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 48, height: 48)
                        VStack(alignment: .leading) {
                            Text("AkuMa")
                                .font(.headline)
                            Text(text.aboutBody)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section(text.about) {
                    Link(destination: URL(string: "mailto:contact@sessatakuma.dev")!) {
                        Label(text.email, systemImage: "envelope")
                    }

                    Link(destination: URL(string: "https://github.com/sessatakuma")!) {
                        Label(text.sourceCode, systemImage: "chevron.left.forwardslash.chevron.right")
                    }
                }
            }
            .navigationTitle(text.about)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.close) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}

private struct EditorSection: View {
    @Binding var paragraph: String
    @Binding var words: [AccentWord]
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    @Binding var isEditingInput: Bool
    let isAnalyzing: Bool
    let isStreaming: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let text: AppText
    let guideLabel: String
    let viewportSize: CGSize
    let onOpenGuide: () -> Void
    let onInsertSample: () -> Void
    let onAnalyze: () -> Void
    let onOpenSettings: () -> Void
    let onUpdateWord: (Int, String, Int) -> Void
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
            if isCompact {
                if isEditingInput || words.isEmpty {
                    InputPanel(
                        paragraph: $paragraph,
                        text: text,
                        guideLabel: guideLabel,
                        isCompact: true,
                        onOpenGuide: onOpenGuide,
                        onInsertSample: onInsertSample,
                        onAnalyze: onAnalyze,
                        onOpenSettings: onOpenSettings
                    )
                    .frame(minHeight: viewportSize.height)
                } else {
                    VStack(spacing: 0) {
                        AnalyzedInputBar(
                            paragraph: paragraph,
                            editLabel: text.editInput,
                            guideLabel: guideLabel,
                            settingsLabel: text.settings,
                            onOpenGuide: onOpenGuide,
                            onOpenSettings: onOpenSettings,
                            onEdit: { isEditingInput = true }
                        )

                        Divider()

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
                            text: text,
                            isCompact: true,
                            onUpdateWord: onUpdateWord,
                            onUndo: onUndo,
                            onRedo: onRedo,
                            onRestore: onRestore
                        )
                        .frame(height: max(viewportSize.height - 64, 320))
                    }
                }
            } else if isTwoColumn {
                HStack(alignment: .top, spacing: AkumaTheme.space6) {
                    InputPanel(
                        paragraph: $paragraph,
                        text: text,
                        guideLabel: guideLabel,
                        isCompact: false,
                        onOpenGuide: onOpenGuide,
                        onInsertSample: onInsertSample,
                        onAnalyze: onAnalyze,
                        onOpenSettings: onOpenSettings
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
                        text: text,
                        isCompact: false,
                        onUpdateWord: onUpdateWord,
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
                VStack(spacing: AkumaTheme.space2) {
                    InputPanel(
                        paragraph: $paragraph,
                        text: text,
                        guideLabel: guideLabel,
                        isCompact: false,
                        onOpenGuide: onOpenGuide,
                        onInsertSample: onInsertSample,
                        onAnalyze: onAnalyze,
                        onOpenSettings: onOpenSettings
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
                        text: text,
                        isCompact: false,
                        onUpdateWord: onUpdateWord,
                        onUndo: onUndo,
                        onRedo: onRedo,
                        onRestore: onRestore
                    )
                    .frame(minHeight: compactPanelHeight)
                }
                .padding(AkumaTheme.space5)
                .frame(maxWidth: AkumaTheme.maxContentWidth)
                .frame(maxWidth: .infinity)
            }
        }
        .frame(minHeight: viewportSize.height, alignment: .top)
        .background(isCompact ? Color(.systemBackground) : AkumaTheme.background)
    }

    private var compactPanelHeight: CGFloat {
        return AkumaTheme.editorPanelMinHeight
    }
}

private struct AnalyzedInputBar: View {
    let paragraph: String
    let editLabel: String
    let guideLabel: String
    let settingsLabel: String
    let onOpenGuide: () -> Void
    let onOpenSettings: () -> Void
    let onEdit: () -> Void

    var body: some View {
        HStack(spacing: AkumaTheme.space3) {
            Text(paragraph.replacingOccurrences(of: "\n", with: " "))
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(1)

            Spacer(minLength: 0)

            Menu {
                Button(action: onOpenGuide) {
                    Label(guideLabel, systemImage: "questionmark.circle")
                }
                Button(action: onOpenSettings) {
                    Label(settingsLabel, systemImage: "gearshape")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
            }
            .accessibilityLabel(settingsLabel)

            Button(editLabel, action: onEdit)
                .buttonStyle(.bordered)
        }
        .padding(.horizontal, AkumaTheme.space4)
        .frame(height: 64)
        .background(Color(.systemBackground))
    }
}

private struct InputPanel: View {
    @Binding var paragraph: String
    let text: AppText
    let guideLabel: String
    let isCompact: Bool
    let onOpenGuide: () -> Void
    let onInsertSample: () -> Void
    let onAnalyze: () -> Void
    let onOpenSettings: () -> Void

    var body: some View {
        PanelContainer(isCompact: isCompact) {
            VStack(spacing: 0) {
                ZStack(alignment: .topLeading) {
                    if paragraph.isEmpty {
                        Text(text.inputPlaceholder)
                            .font(.title2)
                            .foregroundStyle(AkumaTheme.secondaryText.opacity(0.6))
                            .padding(.top, 40)
                            .padding(.horizontal, AkumaTheme.space5)
                            .allowsHitTesting(false)
                    }

                    TextEditor(text: $paragraph)
                        .font(.title2)
                        .foregroundStyle(AkumaTheme.text)
                        .lineSpacing(AkumaTheme.space2)
                        .scrollContentBackground(.hidden)
                        .background(Color.clear)
                        .padding(.top, AkumaTheme.space5)
                        .padding(.horizontal, AkumaTheme.space4)
                        .accessibilityLabel(text.inputPlaceholder)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                HStack(spacing: AkumaTheme.space3) {
                    IconButton(
                        title: guideLabel,
                        systemName: "questionmark.circle",
                        style: .plain,
                        action: onOpenGuide
                    )

                    IconButton(
                        title: text.settings,
                        systemName: "gearshape",
                        style: .plain,
                        action: onOpenSettings
                    )

                    Spacer(minLength: 0)

                    if paragraph.isEmpty {
                        PasteButton(payloadType: String.self) { values in
                            if let value = values.first {
                                paragraph = value
                            }
                        }
                        .labelStyle(.iconOnly)
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                    }

                    if paragraph.isEmpty {
                        Menu {
                            Button(action: onInsertSample) {
                                Label(text.insertSample, systemImage: "dice")
                            }
                        } label: {
                            Image(systemName: "plus.circle")
                                .font(.system(size: 18, weight: .semibold))
                                .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                        }
                        .buttonStyle(PanelButtonStyle())
                        .accessibilityLabel(text.randomSample)
                    }

                    Button(action: onAnalyze) {
                        Label(text.analyze, systemImage: "text.magnifyingglass")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(height: AkumaTheme.actionControlSize)
                            .padding(.horizontal, AkumaTheme.space3)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AkumaTheme.green)
                    .disabled(paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(.horizontal, AkumaTheme.space5)
                .padding(.bottom, AkumaTheme.space5)
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button(text.analyze, action: onAnalyze)
                    .disabled(paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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
    let text: AppText
    let isCompact: Bool
    let onUpdateWord: (Int, String, Int) -> Void
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void
    @State private var copyFeedbackVisible = false

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
                            onUpdateWord: onUpdateWord
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
        .sensoryFeedback(.success, trigger: copyFeedbackVisible) { oldValue, newValue in
            !oldValue && newValue
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
                if !isCompact {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(isDark ? AkumaTheme.darkBorder : AkumaTheme.border, lineWidth: 1)
                }
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
    let onUpdateWord: (Int, String, Int) -> Void
    @State private var editTarget: ReadingEditTarget?

    var body: some View {
        ScrollView {
            if words.isEmpty {
                VStack(alignment: .leading, spacing: AkumaTheme.space2) {
                    Text(emptyText)
                        .font(.title2)
                    Text(text.resultEmptyHint)
                        .font(.subheadline)
                }
                .foregroundStyle(
                    isDarkResult
                        ? AkumaTheme.darkSecondaryText
                        : AkumaTheme.secondaryText.opacity(0.72)
                )
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 40)
                    .padding(.horizontal, AkumaTheme.space5)
            } else {
                FlowLayout(spacing: 0, lineSpacing: 10) {
                    ForEach(Array(words.enumerated()), id: \.offset) { wordIndex, word in
                        AccentWordView(
                            word: word,
                            text: text,
                            showAccent: showAccent,
                            isDarkResult: isDarkResult,
                            isInteractive: isInteractive,
                            onCycleAccent: {
                                onUpdateWord(
                                    wordIndex,
                                    word.editableReading,
                                    word.nextAccentPosition
                                )
                            },
                            onEdit: {
                                editTarget = ReadingEditTarget(
                                    wordIndex: wordIndex,
                                    surface: word.surface,
                                    reading: word.editableReading,
                                    accentPosition: word.accentPosition
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
        .sheet(item: $editTarget) { target in
            ReadingEditorSheet(target: target, text: text) { reading, accentPosition in
                onUpdateWord(target.wordIndex, reading, accentPosition)
            }
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
    }
}

private struct AccentWordView: View {
    let word: AccentWord
    let text: AppText
    let showAccent: Bool
    let isDarkResult: Bool
    let isInteractive: Bool
    let onCycleAccent: () -> Void
    let onEdit: () -> Void
    @ScaledMetric(relativeTo: .title2) private var unitBaseWidth: CGFloat = 18

    var body: some View {
        if word.isLineBreak {
            Color.clear
                .frame(width: 1, height: 60)
        } else {
            Button(action: onEdit) {
                VStack(spacing: 2) {
                    HStack(spacing: 0) {
                        ForEach(Array(word.units.enumerated()), id: \.offset) { _, unit in
                            VStack(spacing: 2) {
                                AccentLineView(accent: unit.accent, isVisible: showAccent)
                                    .frame(height: 20)

                                Text(unit.reading.isEmpty ? "　" : unit.reading)
                                    .font(.caption)
                                    .foregroundStyle(readingColor)
                                    .lineLimit(1)
                            }
                            .frame(minWidth: unitWidth(unit))
                        }
                    }

                    Text(word.surface)
                        .font(.title2)
                        .foregroundStyle(baseColor)
                        .lineLimit(1)
                }
                .padding(.vertical, AkumaTheme.space1)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!isInteractive)
            .frame(minWidth: minWidth, minHeight: 44)
            .accessibilityElement(children: .ignore)
            .accessibilityAddTraits(.isButton)
            .accessibilityLabel(accessibilityLabel)
            .accessibilityHint(text.editWordHint)
            .accessibilityAction(named: text.changeAccent) {
                onCycleAccent()
            }
        }
    }

    private var minWidth: CGFloat {
        max(CGFloat(max(word.surface.count, 1)) * unitBaseWidth, word.units.reduce(0) { $0 + unitWidth($1) })
    }

    private func unitWidth(_ unit: AccentUnit) -> CGFloat {
        CGFloat(max(unit.reading.count, 1)) * unitBaseWidth
    }

    private var baseColor: Color {
        isDarkResult ? AkumaTheme.darkText : AkumaTheme.text
    }

    private var readingColor: Color {
        isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
    }

    private var accessibilityLabel: String {
        let reading = word.editableReading.isEmpty ? "" : ", \(word.editableReading)"
        return "\(word.surface)\(reading), \(text.accent): \(text.accentLabel(for: word.accentPosition))"
    }
}

private struct ReadingEditTarget: Identifiable {
    let wordIndex: Int
    let surface: String
    let reading: String
    let accentPosition: Int

    var id: Int { wordIndex }
}

private struct ReadingEditorSheet: View {
    let target: ReadingEditTarget
    let text: AppText
    let onSave: (String, Int) -> Void
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isReadingFocused: Bool
    @State private var reading: String
    @State private var accentPosition: Int

    init(target: ReadingEditTarget, text: AppText, onSave: @escaping (String, Int) -> Void) {
        self.target = target
        self.text = text
        self.onSave = onSave
        _reading = State(initialValue: target.reading)
        _accentPosition = State(initialValue: target.accentPosition)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: AkumaTheme.space1) {
                        Text(target.surface)
                            .font(.title2.weight(.semibold))
                        Text(target.reading)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .accessibilityElement(children: .combine)
                }

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
                    Picker(text.accent, selection: $accentPosition) {
                        Text(text.accentFollowPrevious).tag(-1)
                        Text(text.accentNoDrop).tag(0)
                        ForEach(1...max(syllableCount, 1), id: \.self) { position in
                            Text(text.dropAfter(position)).tag(position)
                        }
                    }
                    .pickerStyle(.menu)
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

    private var syllableCount: Int {
        KanaReading.syllables(in: normalizedReading).count
    }

    private func save() {
        guard isReadingValid else {
            return
        }

        onSave(normalizedReading, min(accentPosition, max(syllableCount, 0)))
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
                    Image(systemName: showAccent ? "eye" : "eye.slash")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                } else {
                    Label(
                        showAccent ? text.hideAccent : text.showAccent,
                        systemImage: showAccent ? "eye" : "eye.slash"
                    )
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult, isActive: showAccent))
            .accessibilityLabel(showAccent ? text.hideAccent : text.showAccent)

            Spacer(minLength: AkumaTheme.space2)

            Button(action: shareImage) {
                if isCompact {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                } else {
                    Label(text.share, systemImage: "square.and.arrow.up")
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.share)

            Menu {
                if canUndo || canRedo || canRestore {
                    Section {
                        if canUndo {
                            Button(action: onUndo) {
                                Label(text.undo, systemImage: "arrow.uturn.backward")
                            }
                            .keyboardShortcut("z", modifiers: .command)
                        }

                        if canRedo {
                            Button(action: onRedo) {
                                Label(text.redo, systemImage: "arrow.uturn.forward")
                            }
                            .keyboardShortcut("z", modifiers: [.command, .shift])
                        }

                        if canRestore {
                            Button(role: .destructive) {
                                isRestoreConfirmationVisible = true
                            } label: {
                                Label(text.restoreAllEdits, systemImage: "arrow.counterclockwise")
                            }
                        }
                    }
                }

                Section(text.exportOptions) {
                    Button(action: shareText) {
                        Label(text.exportText, systemImage: "doc.text")
                    }
                    Button(action: shareHTML) {
                        Label(text.exportHTML, systemImage: "chevron.left.forwardslash.chevron.right")
                    }
                }

                if !isCompact, !isResultExpanded {
                    Button {
                        isResultExpanded = true
                    } label: {
                        Label(text.expandResult, systemImage: "arrow.up.left.and.arrow.down.right")
                    }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.resultOptions)
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
            sharePayload = SharePayload(items: [image, exportText])
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false

    private var groupWidths: [CGFloat] {
        let characterCount = max(paragraph.filter { !$0.isWhitespace }.count, 12)
        let pattern: [Int] = [3, 5, 2, 4, 3, 6, 2]
        var widths: [CGFloat] = []
        var representedCharacters = 0
        var patternIndex = 0

        while representedCharacters < characterCount {
            let groupLength = min(pattern[patternIndex % pattern.count], characterCount - representedCharacters)
            widths.append(CGFloat(groupLength) * 24)
            representedCharacters += groupLength
            patternIndex += 1
        }

        return widths
    }

    var body: some View {
        ScrollView {
            FlowLayout(spacing: AkumaTheme.space3, lineSpacing: AkumaTheme.space5) {
                ForEach(Array(groupWidths.enumerated()), id: \.offset) { index, width in
                    VStack(alignment: .leading, spacing: AkumaTheme.space2) {
                        Capsule()
                            .fill(AkumaTheme.red.opacity(0.18))
                            .frame(width: max(width * 0.64, 28), height: 2)
                        RoundedRectangle(cornerRadius: AkumaTheme.radiusSmall)
                            .fill(shimmerColor.opacity(0.28))
                            .frame(width: width, height: 24)
                    }
                    .opacity(isPulsing && !reduceMotion ? 0.46 : 1)
                    .animation(
                        reduceMotion
                            ? nil
                            : .easeInOut(duration: 0.9)
                                .repeatForever(autoreverses: true)
                                .delay(Double(index) * 0.07),
                        value: isPulsing
                    )
                }
            }
            .padding(.top, AkumaTheme.space7)
            .padding(.horizontal, AkumaTheme.space5)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(analyzingText)
        .onAppear {
            isPulsing = !reduceMotion
        }
        .onChange(of: reduceMotion) { _, newValue in
            isPulsing = !newValue
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
    let onUpdateWord: (Int, String, Int) -> Void
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
                onUpdateWord: onUpdateWord
            )

            if !words.isEmpty {
                ResultActions(
                    words: words,
                    paragraph: paragraph,
                    showAccent: $showAccent,
                    isDarkResult: $isDarkResult,
                    isResultExpanded: $isResultExpanded,
                    text: text,
                    isCompact: true,
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
        .sensoryFeedback(.success, trigger: copyFeedbackVisible) { oldValue, newValue in
            !oldValue && newValue
        }
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

    var editableReading: String {
        if !reading.isEmpty {
            return reading
        }

        return KanaReading.isValid(surface) ? surface : ""
    }

    var accentPosition: Int {
        if let dropIndex = units.firstIndex(where: { $0.accent == .drop }) {
            return dropIndex + 1
        }

        return units.contains(where: { $0.accent == .flat }) ? 0 : -1
    }

    var nextAccentPosition: Int {
        let count = max(units.count, 1)
        if accentPosition < 0 {
            return 0
        }
        if accentPosition < count {
            return accentPosition + 1
        }
        return -1
    }

    mutating func apply(reading: String, accentPosition: Int) {
        let normalizedReading = KanaReading.normalized(reading)
        let syllables = KanaReading.syllables(in: normalizedReading)
        let unitCount = max(syllables.count, 1)
        let hidesReading = KanaReading.isKanaSurface(surface)

        units = (0..<unitCount).map { index in
            let accent: AccentKind
            if accentPosition < 0 {
                accent = .none
            } else if accentPosition == 0 {
                accent = .flat
            } else if index < accentPosition - 1 {
                accent = .flat
            } else if index == accentPosition - 1 {
                accent = .drop
            } else {
                accent = .none
            }

            return AccentUnit(
                reading: hidesReading || syllables.isEmpty ? "" : syllables[index],
                accent: accent
            )
        }
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
