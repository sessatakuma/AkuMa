import SwiftUI
import UIKit

struct ContentView: View {
    @State private var paragraph = ContentView.initialParagraph()
    @State private var words = MockAccentAnalyzer.analyze(ContentView.initialParagraph())
    @State private var showAccent = true
    @State private var isDarkResult = false
    @State private var isResultExpanded = false
    @State private var lastSampleIndex: Int?

    private let text = AppText.current

    var body: some View {
        GeometryReader { geometry in
            ScrollViewReader { scrollProxy in
                VStack(spacing: 0) {
                    NavigationBar(text: text, isCompact: geometry.size.width <= 768) {
                        withAnimation(.snappy(duration: 0.32, extraBounce: 0)) {
                            scrollProxy.scrollTo(AppAnchor.usageGuide, anchor: .top)
                        }
                    }

                    ScrollView {
                        VStack(spacing: 0) {
                            EditorSection(
                                paragraph: $paragraph,
                                words: words,
                                showAccent: $showAccent,
                                isDarkResult: $isDarkResult,
                                isResultExpanded: $isResultExpanded,
                                text: text,
                                viewportSize: CGSize(
                                    width: geometry.size.width,
                                    height: max(geometry.size.height - AkumaTheme.navHeight, 0)
                                ),
                                onPaste: pasteFromClipboard,
                                onInsertSample: insertSample
                            )
                            .id(AppAnchor.editor)

                            UsageSection(text: text)
                                .id(AppAnchor.usageGuide)

                            SiteFooter(text: text)
                        }
                        .frame(width: geometry.size.width)
                    }
                    .background(AkumaTheme.background)
                    .scrollIndicators(.hidden)
                }
                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .top)
                .background(AkumaTheme.background)
            }
        }
        .sheet(isPresented: $isResultExpanded) {
            ExpandedResultView(
                words: words,
                paragraph: paragraph,
                showAccent: $showAccent,
                isDarkResult: $isDarkResult,
                text: text
            )
        }
        .onChange(of: paragraph) { _, newValue in
            words = MockAccentAnalyzer.analyze(newValue)
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

private enum AppAnchor {
    static let editor = "editor"
    static let usageGuide = "usage-guide"
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
    let usageButton: String
    let inputPlaceholder: String
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
    let usageHeading: String
    let usagePitchIntro: String
    let usagePitchNoneTitle: String
    let usagePitchNoneBody: String
    let usagePitchFlatTitle: String
    let usagePitchFlatBody: String
    let usagePitchFallTitle: String
    let usagePitchFallBody: String
    let usageStepStartTitle: String
    let usageStepStartBody: String
    let usageStepEditTitle: String
    let usageStepEditBody: String
    let usageStepShareTitle: String
    let usageStepShareBody: String
    let footerBody: String
    let email: String

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
        usageButton: "Guide",
        inputPlaceholder: "Enter Japanese text...",
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
        resultHint: "Analysis complete. Tap accent marks to review",
        usageHeading: "Make Japanese pronunciation natural and clear",
        usagePitchIntro: "Beyond naturalness, pitch accent can also affect word meaning. Master the right pitch so the sentence you practice sounds intentional.",
        usagePitchNoneTitle: "Low / follows previous pitch",
        usagePitchNoneBody: "Particles like no, de, and wa follow the previous word instead of carrying their own high mark.",
        usagePitchFlatTitle: "High, no fall",
        usagePitchFlatBody: "The marked span stays high, with no fall inside the word.",
        usagePitchFallTitle: "High, then fall",
        usagePitchFallBody: "Following words or attached particles shift to low pitch.",
        usageStepStartTitle: "Start analysis",
        usageStepStartBody: "Enter words or sentences, paste an article, or insert a random sample to start reading and accent analysis.",
        usageStepEditTitle: "Check readings and accent",
        usageStepEditBody: "Review generated furigana and pitch marks in a layout that matches the web editor rhythm.",
        usageStepShareTitle: "Save in the right format",
        usageStepShareBody: "Copy or share the native result when you want to move it into notes, drafts, or study material.",
        footerBody: "Sessatakuma builds Japanese learning tools and is planning a Japanese speaking practice community.",
        email: "contact@sessatakuma.dev"
    )

    static let ja = AppText(
        brandLabel: "AkuMa",
        usageButton: "使い方",
        inputPlaceholder: "文章を入力...",
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
        resultHint: "分析完了。アクセントを確認できます",
        usageHeading: "日本語の発音を自然に、意味を明確に",
        usagePitchIntro: "自然さだけでなく、アクセントは語の意味にも関わります。正しい音調を身につけて、練習文を意図どおりに響かせます。",
        usagePitchNoneTitle: "低音 / 前の音に続く",
        usagePitchNoneBody: "の・で・は などの助詞は、自分ではなく前の語の高さに続きます。",
        usagePitchFlatTitle: "高いまま下がらない",
        usagePitchFlatBody: "横線の範囲は高いまま続き、語の中では下がりません。",
        usagePitchFallTitle: "高く、あとで下がる",
        usagePitchFallBody: "後ろに続く語や助詞は低くなります。",
        usageStepStartTitle: "解析を始める",
        usageStepStartBody: "単語や文を入力するか、文章を貼り付けるか、ランダムな例文を入れると解析が始まります。",
        usageStepEditTitle: "読みとアクセントを確認",
        usageStepEditBody: "Web 版のリズムに近いレイアウトで、生成されたふりがなとアクセントを確認できます。",
        usageStepShareTitle: "用途に合わせて保存",
        usageStepShareBody: "ネイティブの結果をコピーまたは共有して、メモや下書き、学習素材へ移せます。",
        footerBody: "Sessatakuma は日本語学習ツールを開発しながら、日本語の会話練習コミュニティの立ち上げを計画しています。",
        email: "contact@sessatakuma.dev"
    )

    static let zh = AppText(
        brandLabel: "AkuMa",
        usageButton: "使用說明",
        inputPlaceholder: "輸入日語文字...",
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
        resultHint: "分析完成，可查看音調標記",
        usageHeading: "讓日語發音更自然、意思更清楚",
        usagePitchIntro: "除了自然度，音調更會影響詞彙的含義。掌握正確音調，讓練習句聽起來更有意識。",
        usagePitchNoneTitle: "低音/接續前音",
        usagePitchNoneBody: "像 の、で、は 這類助詞，本身不帶高音標記，會接續前詞音高。",
        usagePitchFlatTitle: "高音不下降",
        usagePitchFlatBody: "水平線範圍維持高音，詞內沒有下降。",
        usagePitchFallTitle: "高音後下降",
        usagePitchFallBody: "後段詞語或接續的助詞會轉為低音。",
        usageStepStartTitle: "開始分析",
        usageStepStartBody: "輸入詞句、貼上文章或插入隨機範文，系統會開始進行讀音與音調分析。",
        usageStepEditTitle: "確認讀音與音調",
        usageStepEditBody: "以接近 Web 版節奏的版面，確認產生的振假名與音調標記。",
        usageStepShareTitle: "依用途儲存",
        usageStepShareBody: "將原生結果複製或分享，方便整理到筆記、草稿或學習素材。",
        footerBody: "Sessatakuma 正在開發日語學習相關工具，也正計劃創立一個日文口說練習社群。",
        email: "contact@sessatakuma.dev"
    )
}

private struct NavigationBar: View {
    let text: AppText
    let isCompact: Bool
    let onGuideTapped: () -> Void

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

            Button(action: onGuideTapped) {
                if isCompact {
                    Image(systemName: "book.pages")
                        .font(.system(size: 20, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                        .foregroundStyle(AkumaTheme.invertedText)
                } else {
                    Label(text.usageButton, systemImage: "book.pages")
                        .font(.system(size: 14, weight: .semibold))
                        .labelStyle(.titleAndIcon)
                        .lineLimit(1)
                        .frame(minHeight: 32)
                        .padding(.horizontal, AkumaTheme.space3)
                        .foregroundStyle(AkumaTheme.invertedText)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(text.usageButton): \(text.usageHeading)")
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
    let words: [AccentWord]
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let text: AppText
    let viewportSize: CGSize
    let onPaste: () -> Void
    let onInsertSample: () -> Void

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
                        words: words,
                        paragraph: paragraph,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        text: text,
                        isCompact: false
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
                        words: words,
                        paragraph: paragraph,
                        showAccent: $showAccent,
                        isDarkResult: $isDarkResult,
                        isResultExpanded: $isResultExpanded,
                        text: text,
                        isCompact: isCompact
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
    let words: [AccentWord]
    let paragraph: String
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    @Binding var isResultExpanded: Bool
    let text: AppText
    let isCompact: Bool
    @State private var copyFeedbackVisible = false

    var body: some View {
        PanelContainer(isCompact: isCompact, isDark: isDarkResult) {
            VStack(spacing: 0) {
                ResultContentView(
                    words: words,
                    showAccent: showAccent,
                    isDarkResult: isDarkResult,
                    emptyText: text.result
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
                        copyFeedbackVisible: $copyFeedbackVisible,
                        onCopy: copyResult
                    )
                }
            }
        }
        .overlay(alignment: .top) {
            if !words.isEmpty {
                ResultStatusChip(text: text.resultHint, isDark: isDarkResult)
                    .padding(.top, AkumaTheme.space3)
                    .opacity(isCompact ? 0 : 1)
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
        UIPasteboard.general.string = words.map(\.surface).joined()

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
                    ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                        AccentWordView(
                            word: word,
                            showAccent: showAccent,
                            isDarkResult: isDarkResult
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
    }
}

private struct AccentWordView: View {
    let word: AccentWord
    let showAccent: Bool
    let isDarkResult: Bool

    var body: some View {
        if word.isLineBreak {
            Color.clear
                .frame(width: 1, height: 60)
        } else {
            VStack(spacing: 2) {
                AccentLineView(accent: word.accent, isVisible: showAccent)
                    .frame(height: 12)

                Text(word.reading)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(readingColor)
                    .lineLimit(1)
                    .opacity(word.reading.isEmpty ? 0 : 1)

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
        CGFloat(max(word.surface.count, word.reading.count, 1)) * 18
    }

    private var baseColor: Color {
        isDarkResult ? AkumaTheme.darkText : AkumaTheme.text
    }

    private var readingColor: Color {
        isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
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
    @Binding var copyFeedbackVisible: Bool
    let onCopy: () -> Void

    private var exportText: String {
        words.map(\.surface).joined()
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

            if !isCompact {
                IconButton(
                    title: text.expandResult,
                    systemName: "arrow.up.left.and.arrow.down.right",
                    style: .plain,
                    isDark: isDarkResult
                ) {
                    isResultExpanded = true
                }
            }
        }
        .padding(.horizontal, AkumaTheme.space5)
        .padding(.top, AkumaTheme.space4)
        .padding(.bottom, AkumaTheme.space5)
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
    let words: [AccentWord]
    let paragraph: String
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    let text: AppText
    @Environment(\.dismiss) private var dismiss

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
                emptyText: text.result
            )
        }
        .background(isDarkResult ? AkumaTheme.darkPanel : AkumaTheme.surface)
    }
}

private struct UsageSection: View {
    let text: AppText

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: AkumaTheme.space6) {
                Text(text.usageHeading)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(AkumaTheme.text)
                    .lineSpacing(2)

                Text(text.usagePitchIntro)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(AkumaTheme.secondaryText)
                    .lineSpacing(8)
            }
            .padding(.vertical, AkumaTheme.space7)

            VStack(spacing: AkumaTheme.space5) {
                PitchStateRow(
                    accent: .none,
                    title: text.usagePitchNoneTitle,
                    description: text.usagePitchNoneBody
                )
                PitchStateRow(
                    accent: .flat,
                    title: text.usagePitchFlatTitle,
                    description: text.usagePitchFlatBody
                )
                PitchStateRow(
                    accent: .drop,
                    title: text.usagePitchFallTitle,
                    description: text.usagePitchFallBody
                )
            }
            .padding(.bottom, AkumaTheme.space7)

            VStack(spacing: 0) {
                UsageGuideRow(
                    systemNames: ["keyboard", "doc.on.clipboard", "dice"],
                    title: text.usageStepStartTitle,
                    description: text.usageStepStartBody
                )
                UsageGuideRow(
                    systemNames: ["textformat", "waveform.path.ecg", "cursorarrow.click"],
                    title: text.usageStepEditTitle,
                    description: text.usageStepEditBody
                )
                UsageGuideRow(
                    systemNames: ["doc.on.doc", "square.and.arrow.up", "note.text"],
                    title: text.usageStepShareTitle,
                    description: text.usageStepShareBody
                )
            }
        }
        .padding(.horizontal, AkumaTheme.space5)
        .frame(maxWidth: AkumaTheme.maxContentWidth)
        .frame(maxWidth: .infinity)
        .background(AkumaTheme.background)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AkumaTheme.border)
                .frame(height: 1)
        }
    }
}

private struct PitchStateRow: View {
    let accent: AccentKind
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .center, spacing: AkumaTheme.space4) {
            ZStack {
                AccentWordView(
                    word: AccentWord(surface: accent == .none ? "は" : "あ", reading: accent == .none ? "は" : "あ", accent: accent),
                    showAccent: true,
                    isDarkResult: false
                )
                .scaleEffect(1.35)
            }
            .frame(width: 64, height: 64)

            VStack(alignment: .leading, spacing: AkumaTheme.space1) {
                Text(title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(AkumaTheme.text)

                Text(description)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(AkumaTheme.secondaryText)
                    .lineSpacing(6)
            }
        }
    }
}

private struct UsageGuideRow: View {
    let systemNames: [String]
    let title: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: AkumaTheme.space4) {
            HStack(spacing: AkumaTheme.space4) {
                ForEach(systemNames, id: \.self) { systemName in
                    Image(systemName: systemName)
                        .font(.system(size: 40, weight: .regular))
                        .foregroundStyle(AkumaTheme.text)
                        .frame(width: 72, height: 72)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(AkumaTheme.space5)
            .background(
                RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous)
                    .fill(AkumaTheme.surface)
            )
            .overlay {
                RoundedRectangle(cornerRadius: AkumaTheme.radiusLarge, style: .continuous)
                    .stroke(AkumaTheme.border, lineWidth: 1)
            }

            VStack(alignment: .leading, spacing: AkumaTheme.space2) {
                Text(title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(AkumaTheme.text)

                Text(description)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(AkumaTheme.secondaryText)
                    .lineSpacing(6)
            }
        }
        .padding(.vertical, AkumaTheme.space6)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AkumaTheme.border)
                .frame(height: 1)
        }
    }
}

private struct SiteFooter: View {
    let text: AppText

    var body: some View {
        VStack(alignment: .leading, spacing: AkumaTheme.space6) {
            HStack(alignment: .top, spacing: AkumaTheme.space7) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 96, height: 96)
                    .accessibilityHidden(true)

                Spacer()

                VStack(alignment: .trailing, spacing: AkumaTheme.space3) {
                    HStack(spacing: AkumaTheme.space1) {
                        FooterIcon(systemName: "camera")
                        FooterIcon(systemName: "at")
                        FooterIcon(systemName: "f.circle")
                        FooterIcon(systemName: "chevron.left.forwardslash.chevron.right")
                    }

                    Text(text.email)
                        .font(.system(size: 16, weight: .regular))
                        .foregroundStyle(AkumaTheme.invertedText)
                }
            }

            Text(text.footerBody)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(AkumaTheme.invertedText.opacity(0.88))
                .lineSpacing(8)

            HStack(alignment: .bottom, spacing: 0) {
                Text("Sessa")
                Text("takuma")
            }
            .font(.system(size: 56, weight: .bold))
            .minimumScaleFactor(0.5)
            .lineLimit(1)
            .foregroundStyle(AkumaTheme.invertedText)
        }
        .padding(.top, AkumaTheme.space7)
        .padding(.horizontal, AkumaTheme.space5)
        .padding(.bottom, AkumaTheme.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AkumaTheme.green)
    }
}

private struct FooterIcon: View {
    let systemName: String

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: 22, weight: .regular))
            .foregroundStyle(AkumaTheme.invertedText)
            .frame(width: 48, height: 48)
            .background(Color.clear)
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

private struct AccentWord: Equatable {
    let surface: String
    let reading: String
    let accent: AccentKind
    var isLineBreak = false
}

private enum AccentKind: Equatable {
    case none
    case flat
    case drop
}

private enum MockAccentAnalyzer {
    static func analyze(_ text: String) -> [AccentWord] {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedText.isEmpty else {
            return []
        }

        if trimmedText.contains("今日は朝から猫") {
            return [
                AccentWord(surface: "今日", reading: "きょう", accent: .flat),
                AccentWord(surface: "は", reading: "は", accent: .none),
                AccentWord(surface: "朝", reading: "あさ", accent: .drop),
                AccentWord(surface: "から", reading: "から", accent: .none),
                AccentWord(surface: "猫", reading: "ねこ", accent: .drop),
                AccentWord(surface: "が", reading: "が", accent: .none),
                AccentWord(surface: "ベランダ", reading: "べらんだ", accent: .flat),
                AccentWord(surface: "で", reading: "で", accent: .none),
                AccentWord(surface: "日向", reading: "ひなた", accent: .drop),
                AccentWord(surface: "ぼっこ", reading: "ぼっこ", accent: .flat),
                AccentWord(surface: "して", reading: "して", accent: .none),
                AccentWord(surface: "いた", reading: "いた", accent: .drop),
                AccentWord(surface: "ので", reading: "ので", accent: .none),
                AccentWord(surface: "、", reading: "", accent: .none),
                AccentWord(surface: "つい", reading: "つい", accent: .flat),
                AccentWord(surface: "一緒", reading: "いっしょ", accent: .drop),
                AccentWord(surface: "に", reading: "に", accent: .none),
                AccentWord(surface: "ゴロゴロ", reading: "ごろごろ", accent: .flat),
                AccentWord(surface: "して", reading: "して", accent: .none),
                AccentWord(surface: "しまった", reading: "しまった", accent: .drop),
                AccentWord(surface: "。", reading: "", accent: .none),
            ]
        }

        return fallbackWords(for: text)
    }

    private static func fallbackWords(for text: String) -> [AccentWord] {
        text.map { character in
            if character == "\n" {
                return AccentWord(surface: "", reading: "", accent: .none, isLineBreak: true)
            }

            if character.isWhitespace {
                return AccentWord(surface: String(character), reading: "", accent: .none)
            }

            let surface = String(character)
            let accent: AccentKind = character.unicodeScalars.first?.value.isMultiple(of: 3) == true ? .drop : .flat
            return AccentWord(surface: surface, reading: surface, accent: accent)
        }
    }
}
