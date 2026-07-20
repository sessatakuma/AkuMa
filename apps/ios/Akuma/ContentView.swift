import Foundation
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
    @State private var resultStatusOverride: String?
    @State private var analysisTask: Task<Void, Never>?
    @State private var lastSampleIndex: Int?

    private static let analysisDebounceNanoseconds: UInt64 = 800_000_000
    private let text = AppText.current

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                NavigationBar(text: text)

                ScrollView {
                    EditorSection(
                        paragraph: $paragraph,
                        words: $words,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        isAnalyzing: isAnalyzing,
                        canRestore: words != analyzedWords,
                        canUndo: !pastWords.isEmpty,
                        canRedo: !futureWords.isEmpty,
                        statusText: resultStatusOverride,
                        text: text,
                        viewportSize: CGSize(
                            width: geometry.size.width,
                            height: max(geometry.size.height - AkumaTheme.navHeight, 0)
                        ),
                        onAnalyze: analyzeParagraph,
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
        .onChange(of: paragraph) { _, newValue in
            resultStatusOverride = nil
            scheduleAnalysis(for: newValue)
        }
        .onDisappear {
            analysisTask?.cancel()
        }
    }

    private func analyzeParagraph() {
        scheduleAnalysis(for: paragraph, debounceNanoseconds: 0)
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

        isAnalyzing = true
        isStreaming = false
        resultStatusOverride = nil

        do {
            let analyzedWords = try await MarkAccentAPI.analyze(sourceParagraph) { streamedWords in
                guard paragraph == sourceParagraph, !Task.isCancelled else {
                    return
                }

                words = streamedWords
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
            }
        } catch {
            if paragraph == sourceParagraph, !Task.isCancelled {
                words = MockAccentAnalyzer.analyze(sourceParagraph)
                analyzedWords = words
                pastWords = []
                futureWords = []
                resultStatusOverride = text.analysisFailed
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
            updatedWords[wordIndex].units[unitIndex].reading = reading
        }
        if let accent {
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
    static let actionControlSize: CGFloat = 40

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
        restoreAllEdits: "Restore all edits"
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
        restoreAllEdits: "すべての編集を元に戻す"
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
        restoreAllEdits: "還原所有編輯"
    )
}

private struct NavigationBar: View {
    let text: AppText

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

private struct EditorSection: View {
    @Binding var paragraph: String
    @Binding var words: [AccentWord]
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let isAnalyzing: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let statusText: String?
    let text: AppText
    let viewportSize: CGSize
    let onAnalyze: () -> Void
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
                        isAnalyzing: isAnalyzing,
                        onAnalyze: onAnalyze,
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
                        isAnalyzing: isAnalyzing,
                        onAnalyze: onAnalyze,
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
    let isAnalyzing: Bool
    let onAnalyze: () -> Void
    let onPaste: () -> Void
    let onInsertSample: () -> Void

    private var canAnalyze: Bool {
        !paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isAnalyzing
    }

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

                    Button(action: onAnalyze) {
                        if isAnalyzing {
                            ProgressView()
                                .controlSize(.small)
                                .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                        } else if isCompact {
                            Image(systemName: "sparkles")
                                .font(.system(size: 18, weight: .semibold))
                                .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                        } else {
                            Label(text.analyze, systemImage: "sparkles")
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                                .frame(height: AkumaTheme.actionControlSize)
                                .padding(.horizontal, AkumaTheme.space3)
                        }
                    }
                    .buttonStyle(PanelButtonStyle(isActive: canAnalyze))
                    .disabled(!canAnalyze)
                    .opacity(canAnalyze || isAnalyzing ? 1 : 0.5)
                    .accessibilityLabel(isAnalyzing ? text.analyzing : text.analyze)

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

    var body: some View {
        PanelContainer(isCompact: isCompact, isDark: isDarkResult) {
            VStack(spacing: 0) {
                ResultContentView(
                    words: words,
                    showAccent: showAccent,
                    isDarkResult: isDarkResult,
                    emptyText: text.result,
                    text: text,
                    onUpdateUnit: onUpdateUnit
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

                if !words.isEmpty {
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
            if isAnalyzing || !words.isEmpty {
                ResultStatusChip(text: isAnalyzing ? text.analyzing : (statusText ?? text.resultHint), isDark: isDarkResult)
                    .padding(.top, AkumaTheme.space3)
                    .opacity(isCompact ? 0 : 1)
            }
        }
        .overlay {
            if isAnalyzing {
                VStack(spacing: AkumaTheme.space3) {
                    ProgressView()
                        .controlSize(.regular)
                        .tint(AkumaTheme.green)

                    Text(text.analyzing)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText)
                }
                .padding(AkumaTheme.space4)
                .background(
                    RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous)
                        .fill(isDarkResult ? AkumaTheme.darkPanel.opacity(0.92) : AkumaTheme.surface.opacity(0.92))
                )
                .overlay {
                    RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous)
                        .stroke(isDarkResult ? AkumaTheme.darkBorder : AkumaTheme.border, lineWidth: 1)
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
                            showAccent: showAccent,
                            isDarkResult: isDarkResult,
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
    let showAccent: Bool
    let isDarkResult: Bool
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
                            .accessibilityLabel(textForAccent(unit.accent))
                            .accessibilityHint("Tap to change pitch accent")

                            Button {
                                onEditReading(unitIndex)
                            } label: {
                                Text(unit.reading.isEmpty ? "　" : unit.reading)
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundStyle(readingColor)
                                    .lineLimit(1)
                            }
                            .buttonStyle(.plain)
                            .frame(minHeight: 24)
                            .accessibilityLabel(unit.reading.isEmpty ? "Edit reading" : unit.reading)
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
        case .none: "Low pitch"
        case .flat: "High pitch"
        case .drop: "Pitch drop"
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
                    Button(text.done) {
                        onSave(reading, accent)
                        dismiss()
                    }
                }
            }
        }
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

    private var exportText: String {
        ResultExporter.plainText(words: words, showAccent: showAccent)
    }

    var body: some View {
        HStack(spacing: AkumaTheme.space2) {
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

            ShareLink(item: exportText) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 18, weight: .semibold))
                    .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.share)

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
        .padding(.horizontal, AkumaTheme.space5)
        .padding(.top, AkumaTheme.space4)
        .padding(.bottom, AkumaTheme.space5)
        .confirmationDialog(text.restoreAllEdits, isPresented: $isRestoreConfirmationVisible) {
            Button(text.restoreAllEdits, role: .destructive, action: onRestore)
            Button(text.cancel, role: .cancel) {}
        }
    }
}

private struct ResultStatusChip: View {
    let text: String
    let isDark: Bool

    var body: some View {
        Text(text)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(isDark ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText)
            .lineLimit(2)
            .multilineTextAlignment(.center)
            .padding(.horizontal, AkumaTheme.space3)
            .frame(minHeight: 32)
            .background(
                RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous)
                    .fill(isDark ? AkumaTheme.darkPanel : AkumaTheme.surface)
            )
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
        let units = word.accent.map { entry in
            AccentUnit(
                reading: entry.furigana == word.surface ? "" : entry.furigana,
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
        text.map { character in
            if character == "\n" {
                return AccentWord(surface: "", units: [], isLineBreak: true)
            }

            if character.isWhitespace {
                return word(String(character), "", [.none])
            }

            let surface = String(character)
            let accent: AccentKind = character.unicodeScalars.first?.value.isMultiple(of: 3) == true ? .drop : .flat
            return word(surface, surface, [accent])
        }
    }

    private static func word(_ surface: String, _ reading: String, _ accents: [AccentKind]) -> AccentWord {
        let characters = reading.map(String.init)
        let units = accents.enumerated().map { index, accent in
            AccentUnit(reading: index < characters.count ? characters[index] : "", accent: accent)
        }
        return AccentWord(surface: surface, units: units)
    }
}
