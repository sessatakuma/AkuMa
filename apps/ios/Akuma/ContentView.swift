import Foundation
import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var session = ReadingSession()
    @AppStorage("showsPitchAccent") private var showAccent = true
    @State private var isGuidePresented = false
    @State private var confirmsReplacement = false
    @State private var lastSampleIndex: Int?
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.scenePhase) private var scenePhase

    private let text = AppText.current
    private let guideText = GuideText.current

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                if geometry.size.width >= 1_024 {
                    HStack(spacing: AkumaTheme.space5) {
                        inputPanel(isCompact: false)
                        resultPanel(isCompact: false)
                    }
                    .padding(AkumaTheme.space5)
                    .background(AkumaTheme.background)
                } else {
                    inputPanel(isCompact: true)
                        .navigationDestination(isPresented: Binding(
                            get: { session.showsResult },
                            set: { if !$0 { session.editDraft() } }
                        )) {
                            resultPanel(isCompact: true)
                                .navigationTitle(text.result)
                                .navigationBarTitleDisplayMode(.inline)
                        }
                }
            }
            .navigationTitle("AkuMa")
            .navigationBarTitleDisplayMode(.inline)
        }
        .sheet(isPresented: $isGuidePresented) { GuideView(text: guideText) }
        .confirmationDialog(text.replaceResultTitle, isPresented: $confirmsReplacement, titleVisibility: .visible) {
            Button(text.analyze, role: .destructive) { session.beginAnalysis() }
            Button(text.cancel, role: .cancel) {}
        } message: {
            Text(text.replaceResultBody)
        }
        .onChange(of: session.phase) { oldValue, newValue in
            if oldValue == .loading || oldValue == .streaming {
                if newValue == .idle && session.showsResult {
                    UIAccessibility.post(notification: .announcement, argument: text.analysisComplete)
                } else if newValue == .failed {
                    UIAccessibility.post(notification: .announcement, argument: text.temporaryIssuesTitle)
                }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { session.persist() }
        }
        .task {
            if ProcessInfo.processInfo.arguments.contains("--showcase-data"), session.draft.isEmpty {
                session.draft = Self.sampleParagraphs[0]
                session.beginAnalysis()
            }
        }
    }

    private func inputPanel(isCompact: Bool) -> some View {
        InputPanel(
            paragraph: $session.draft,
            text: text,
            guideLabel: guideText.guide,
            isCompact: isCompact,
            hasSavedResult: session.result != nil,
            matchesSavedResult: session.result?.source == session.draft,
            isBusy: session.isBusy,
            onOpenGuide: { isGuidePresented = true },
            onInsertSample: insertSample,
            onViewResult: session.openSavedResult,
            onAnalyze: {
                if session.needsReplacementConfirmation { confirmsReplacement = true }
                else { session.beginAnalysis() }
            }
        )
    }

    private func resultPanel(isCompact: Bool) -> some View {
        ResultPanel(
            session: session,
            showAccent: $showAccent,
            isDarkResult: colorScheme == .dark,
            text: text,
            guideLabel: guideText.guide,
            isCompact: isCompact,
            onOpenGuide: { isGuidePresented = true }
        )
    }

    private func insertSample() {
        let choices = Self.sampleParagraphs.indices.filter { $0 != lastSampleIndex }
        guard let index = choices.randomElement() else { return }
        lastSampleIndex = index
        session.draft = Self.sampleParagraphs[index]
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
    let result: String
    let resultEmptyHint: String
    let accent: String
    let showAccent: String
    let hideAccent: String
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

    private func localized(_ en: String, _ ja: String, _ zh: String) -> String {
        switch Locale.current.language.languageCode?.identifier {
        case "ja": ja
        case "zh": zh
        default: en
        }
    }

    var tryExample: String { localized("Try an example", "例文を試す", "試用範例") }
    var viewSavedResult: String { localized("View saved result", "保存した結果を見る", "查看已儲存結果") }
    var savedResultHint: String { localized("Saved result · Draft has changes", "保存済みの結果・文章に変更があります", "已儲存結果・文字已有變更") }
    var tapWordHint: String { localized("Tap a word to edit its reading or pitch.", "単語をタップして、ふりがなやアクセントを編集できます。", "點按詞語即可編輯假名或音調。") }
    var pitchPreview: String { localized("Pitch preview", "アクセントのプレビュー", "音調預覽") }
    var tapMoraHint: String { localized("Tap a mora to place the pitch drop.", "拍をタップして、下降位置を選びます。", "點按音拍以選擇下降位置。") }
    var discardChanges: String { localized("Discard changes", "変更を破棄", "捨棄變更") }
    var discardChangesTitle: String { localized("Discard your changes?", "変更を破棄しますか？", "要捨棄變更嗎？") }
    var keepEditing: String { localized("Keep editing", "編集を続ける", "繼續編輯") }
    var replaceResultTitle: String { localized("Replace the corrected result?", "編集した結果を置き換えますか？", "要取代已修正的結果嗎？") }
    var replaceResultBody: String { localized("A successful analysis of this new text will replace your saved result and its corrections.", "新しい文章の解析が完了すると、保存した結果と編集内容が置き換わります。", "新文字分析成功後，將取代已儲存的結果與修正內容。") }
    var analysisComplete: String { localized("Analysis complete", "解析が完了しました", "分析完成") }

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
        result: "Result",
        resultEmptyHint: "Your analyzed reading and pitch accent will appear here.",
        accent: "accent",
        showAccent: "Show pitch accent",
        hideAccent: "Hide pitch accent",
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
        temporaryIssuesTitle: "Analysis unavailable",
        temporaryIssuesBody: "Your text and any saved result are safe. Check your connection and try again.",
        retry: "Try Again",
        continueUsing: "Continue",
        resultOptions: "More result options",
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
        result: "結果",
        resultEmptyHint: "解析したふりがなとアクセントがここに表示されます。",
        accent: "アクセント",
        showAccent: "アクセントを表示",
        hideAccent: "アクセントを非表示",
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
        temporaryIssuesTitle: "解析できませんでした",
        temporaryIssuesBody: "入力した文章と保存済みの結果は保持されています。接続を確認して、もう一度お試しください。",
        retry: "再試行",
        continueUsing: "このまま使う",
        resultOptions: "その他の結果オプション",
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
        result: "結果",
        resultEmptyHint: "分析後的假名與音調會顯示在這裡。",
        accent: "音調",
        showAccent: "顯示音調線",
        hideAccent: "隱藏音調線",
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
        temporaryIssuesTitle: "目前無法分析",
        temporaryIssuesBody: "輸入文字與已儲存的結果都已保留。請檢查連線後再試一次。",
        retry: "再試一次",
        continueUsing: "繼續使用",
        resultOptions: "更多結果選項",
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
        shareBody: "Share the result as an image and readable text through the system share sheet.",
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
        shareBody: "結果は画像と読みやすいテキストとして、iOSの共有シートから共有できます。",
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
        shareBody: "透過 iOS 分享面板，以圖片和易讀文字分享結果。",
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
                    .font(.title2)
            }
            .frame(width: 48)

            VStack(alignment: .leading, spacing: AkumaTheme.space1) {
                Text(title).font(.headline)
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(AkumaTheme.secondaryText)
            }
        }
        .padding(.vertical, AkumaTheme.space1)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct InputPanel: View {
    @Binding var paragraph: String
    let text: AppText
    let guideLabel: String
    let isCompact: Bool
    let hasSavedResult: Bool
    let matchesSavedResult: Bool
    let isBusy: Bool
    let onOpenGuide: () -> Void
    let onInsertSample: () -> Void
    let onViewResult: () -> Void
    let onAnalyze: () -> Void

    var body: some View {
        PanelContainer(isCompact: isCompact) {
            TextEditor(text: $paragraph)
                .font(.title2)
                .foregroundStyle(AkumaTheme.text)
                .lineSpacing(AkumaTheme.space2)
                .scrollContentBackground(.hidden)
                .scrollDismissesKeyboard(.interactively)
                .overlay(alignment: .topLeading) {
                    if paragraph.isEmpty {
                        Text(text.inputPlaceholder)
                            .font(.title2)
                            .foregroundStyle(.secondary)
                            .padding(.top, 8)
                            .padding(.leading, 5)
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
                }
                .padding(.top, AkumaTheme.space4)
                .padding(.horizontal, AkumaTheme.space4)
                .accessibilityLabel(text.inputPlaceholder)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    VStack(spacing: AkumaTheme.space2) {
                        if paragraph.isEmpty {
                            Button(text.tryExample, action: onInsertSample)
                                .font(.body)
                                .frame(minHeight: 44)
                        }
                        if hasSavedResult && !matchesSavedResult {
                            Button(text.viewSavedResult, action: onViewResult)
                                .font(.body)
                                .frame(minHeight: 44)
                        }
                        HStack(spacing: AkumaTheme.space3) {
                            IconButton(title: guideLabel, systemName: "questionmark.circle", action: onOpenGuide)
                            Spacer(minLength: 0)
                            if paragraph.isEmpty {
                                PasteButton(payloadType: String.self) { values in
                                    if let value = values.first { paragraph = value }
                                }
                                .labelStyle(.iconOnly)
                                .frame(minWidth: 44, minHeight: 44)
                            }
                            Button(action: onAnalyze) {
                                Label(matchesSavedResult ? text.viewSavedResult : text.analyze, systemImage: matchesSavedResult ? "doc.text" : "text.magnifyingglass")
                                    .font(.body.weight(.semibold))
                                    .frame(minHeight: 44)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(AkumaTheme.green)
                            .disabled(isBusy || paragraph.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }
                    }
                    .padding(.horizontal, AkumaTheme.space4)
                    .padding(.vertical, AkumaTheme.space2)
                    .background(.bar)
                }
        }
    }
}

private struct ResultPanel: View {
    @ObservedObject var session: ReadingSession
    @Binding var showAccent: Bool
    let isDarkResult: Bool
    let text: AppText
    let guideLabel: String
    let isCompact: Bool
    let onOpenGuide: () -> Void

    private var editAction: (() -> Void)? {
        guard isCompact else { return nil }
        return { session.editDraft() }
    }

    var body: some View {
        PanelContainer(isCompact: isCompact, isDark: isDarkResult) {
            VStack(spacing: 0) {
                if session.phase == .failed {
                    ContentUnavailableView {
                        Label(text.temporaryIssuesTitle, systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(text.temporaryIssuesBody)
                    } actions: {
                        Button(text.retry) { session.beginAnalysis() }
                            .buttonStyle(.borderedProminent)
                        if session.result != nil {
                            Button(text.viewSavedResult) { session.openSavedResult() }
                        }
                        Button(text.editInput) { session.editDraft() }
                    }
                } else if session.phase == .loading {
                    SkeletonResultView(paragraph: session.draft, isDarkResult: isDarkResult, analyzingText: text.analyzing)
                        .accessibilityHidden(true)
                } else {
                    if !session.isBusy, let result = session.result, result.source != session.draft {
                        Label(text.savedResultHint, systemImage: "doc.badge.clock")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                            .padding(.top, AkumaTheme.space2)
                    }
                    ResultContentView(
                        words: session.isBusy ? session.streamedWords : session.result?.words ?? [],
                        showAccent: showAccent,
                        isDarkResult: isDarkResult,
                        emptyText: text.result,
                        text: text,
                        isInteractive: !session.isBusy,
                        onUpdateWord: { index, reading, accent in
                            session.updateWord(index: index, reading: reading, accentPosition: accent)
                        }
                    )
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if session.isBusy {
                    HStack {
                        Text(text.analyzing).font(.subheadline)
                        Spacer()
                        Button(text.cancel) { session.cancelAnalysis() }
                            .frame(minHeight: 44)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, AkumaTheme.space2)
                    .background(.bar)
                } else if session.phase != .failed, let result = session.result {
                    ResultActions(
                        words: result.words,
                        showAccent: $showAccent,
                        isDarkResult: .constant(isDarkResult),
                        text: text,
                        isCompact: isCompact,
                        canRestore: result.hasEdits,
                        canUndo: !result.past.isEmpty,
                        canRedo: !result.future.isEmpty,
                        onUndo: session.undo,
                        onRedo: session.redo,
                        onRestore: session.restore,
                        onEdit: editAction,
                        guideLabel: guideLabel,
                        onOpenGuide: onOpenGuide
                    )
                    .background(.bar)
                }
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
    @AppStorage("didEditWord") private var didEditWord = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

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
                if isInteractive && !didEditWord {
                    Text(text.tapWordHint)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, AkumaTheme.space5)
                        .padding(.top, AkumaTheme.space3)
                }
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
                                didEditWord = true
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
            .presentationDetents(dynamicTypeSize.isAccessibilitySize ? [.large] : [.medium, .large])
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

    var body: some View {
        if word.isLineBreak {
            Color.clear
                .frame(width: 0, height: 60)
                .layoutValue(key: FlowBreakKey.self, value: true)
                .accessibilityHidden(true)
        } else {
            ViewThatFits(in: .horizontal) {
                wordButton.fixedSize()
                ScrollView(.horizontal) { wordButton.fixedSize() }
                    .fixedSize(horizontal: false, vertical: true)
                    .scrollIndicatorsFlash(onAppear: true)
            }
        }
    }

    private var wordButton: some View {
        Button(action: onEdit) {
            mark
                .padding(.vertical, AkumaTheme.space1)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!isInteractive)
        .frame(minHeight: 44)
        .accessibilityElement(children: .ignore)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint(text.editWordHint)
        .accessibilityAction(named: text.changeAccent) { onCycleAccent() }
    }

    private var mark: some View {
        AccentWordMark(word: word, showAccent: showAccent, isDarkResult: isDarkResult, style: .result)
    }

    private var accessibilityLabel: String {
        let reading = word.editableReading.isEmpty ? "" : ", \(word.editableReading)"
        return "\(word.surface)\(reading), \(text.accent): \(text.accentLabel(for: word.accentPosition))"
    }
}

private struct AccentWordMark: View {
    let word: AccentWord
    let showAccent: Bool
    let isDarkResult: Bool
    let style: Style
    @ScaledMetric(relativeTo: .title2) private var resultBaseFontSize: CGFloat = 22
    @ScaledMetric(relativeTo: .caption) private var resultReadingFontSize: CGFloat = 12

    enum Style: Equatable {
        case result
        case export

        var accentLaneHeight: CGFloat {
            switch self {
            case .result: 20
            case .export: 16
            }
        }

        var lineBreakHeight: CGFloat {
            switch self {
            case .result: 60
            case .export: 64
            }
        }
    }

    private var layout: AccentWordAnnotation {
        AccentWordAnnotation(word: word)
    }

    private var baseFontSize: CGFloat { style == .result ? resultBaseFontSize : 24 }
    private var readingFontSize: CGFloat { style == .result ? resultReadingFontSize : 14 }
    private var baseFont: Font { .system(size: baseFontSize) }
    private var readingFont: Font { .system(size: readingFontSize) }

    private func width(of string: String, fontSize: CGFloat) -> CGFloat {
        let value = string.isEmpty ? "　" : string
        return ceil((value as NSString).size(withAttributes: [.font: UIFont.systemFont(ofSize: fontSize)]).width) + 2
    }

    var body: some View {
        if word.isLineBreak {
            Color.clear.frame(width: 0, height: style.lineBreakHeight)
                .layoutValue(key: FlowBreakKey.self, value: true)
        } else {
            VStack(spacing: 2) {
                accentTrack

                HStack(alignment: .bottom, spacing: 0) {
                    ForEach(Array(layout.prefixMoras.enumerated()), id: \.offset) { _, mora in
                        plainMora(mora)
                    }

                    if !layout.annotatedSurface.isEmpty, !layout.annotatedUnits.isEmpty {
                        annotatedMark
                    }

                    ForEach(Array(layout.suffixMoras.enumerated()), id: \.offset) { _, mora in
                        plainMora(mora)
                    }
                }
            }
            .lineLimit(1)
        }
    }

    private var accentTrack: some View {
        HStack(spacing: 0) {
            ForEach(Array(layout.prefixMoras.enumerated()), id: \.offset) { _, mora in
                accentSegment(mora.accent, width: plainMoraWidth(mora))
            }

            ForEach(Array(layout.annotatedUnits.enumerated()), id: \.offset) { index, unit in
                accentSegment(unit.accent, width: annotatedReadingWidths[index])
            }

            ForEach(Array(layout.suffixMoras.enumerated()), id: \.offset) { _, mora in
                accentSegment(mora.accent, width: plainMoraWidth(mora))
            }
        }
        .frame(height: style.accentLaneHeight)
    }

    private var annotatedMark: some View {
        let width = annotationWidth
        let surfaceWidths = distributedWidths(
            weights: layout.annotatedSurface.map { self.width(of: $0, fontSize: baseFontSize) },
            totalWidth: width
        )

        return VStack(spacing: 2) {
            HStack(spacing: 0) {
                ForEach(Array(layout.annotatedUnits.enumerated()), id: \.offset) { index, unit in
                    Text(unit.reading.isEmpty ? "　" : unit.reading)
                        .font(readingFont)
                        .fixedSize()
                        .foregroundStyle(readingColor)
                        .frame(width: annotatedReadingWidths[index])
                }
            }

            HStack(spacing: 0) {
                ForEach(Array(layout.annotatedSurface.enumerated()), id: \.offset) { index, segment in
                    Text(segment)
                        .font(baseFont)
                        .fixedSize()
                        .foregroundStyle(baseColor)
                        .frame(width: surfaceWidths[index])
                }
            }
        }
        .frame(width: width)
    }

    private func plainMora(_ mora: AccentWordAnnotation.Mora) -> some View {
        return VStack(spacing: 2) {
            Text("　")
                .font(readingFont)
                .hidden()

            Text(mora.surface)
                .font(baseFont)
                .foregroundStyle(baseColor)
        }
        .frame(width: plainMoraWidth(mora))
    }

    private func accentSegment(_ accent: AccentKind, width: CGFloat) -> some View {
        AccentLineView(accent: accent, isVisible: showAccent)
            .frame(width: width, height: style.accentLaneHeight)
    }

    private func plainMoraWidth(_ mora: AccentWordAnnotation.Mora) -> CGFloat {
        width(of: mora.surface, fontSize: baseFontSize)
    }

    private var annotatedReadingWidths: [CGFloat] {
        distributedWidths(
            weights: layout.annotatedUnits.map { width(of: $0.reading, fontSize: readingFontSize) },
            totalWidth: annotationWidth
        )
    }

    private var annotationWidth: CGFloat {
        let readingWidth = layout.annotatedUnits.reduce(CGFloat.zero) {
            $0 + width(of: $1.reading, fontSize: readingFontSize)
        }
        let surfaceWidth = layout.annotatedSurface.reduce(CGFloat.zero) {
            $0 + width(of: $1, fontSize: baseFontSize)
        }
        return max(readingWidth, surfaceWidth)
    }

    private func distributedWidths(weights: [CGFloat], totalWidth: CGFloat) -> [CGFloat] {
        let totalWeight = max(weights.reduce(0, +), 1)
        return weights.map { totalWidth * ($0 / totalWeight) }
    }

    private var baseColor: Color {
        isDarkResult ? AkumaTheme.darkText : AkumaTheme.text
    }

    private var readingColor: Color {
        isDarkResult ? AkumaTheme.darkSecondaryText : AkumaTheme.secondaryText
    }
}

private struct AccentWordAnnotation {
    struct Mora {
        let surface: String
        let accent: AccentKind
    }

    let prefixMoras: [Mora]
    let annotatedSurface: [String]
    let annotatedUnits: [AccentUnit]
    let suffixMoras: [Mora]

    init(word: AccentWord) {
        let surfaceSegments = KanaReading.syllables(in: word.surface)

        if KanaReading.isKanaSurface(word.surface), word.reading.isEmpty || word.reading == word.surface {
            prefixMoras = surfaceSegments.enumerated().map { index, segment in
                Mora(
                    surface: segment,
                    accent: word.units.indices.contains(index) ? word.units[index].accent : .none
                )
            }
            annotatedSurface = []
            annotatedUnits = []
            suffixMoras = []
            return
        }

        let readingSegments = word.units.map(\.reading)
        var prefixCount = 0
        while prefixCount < surfaceSegments.count,
              prefixCount < readingSegments.count,
              KanaReading.isKanaSurface(surfaceSegments[prefixCount]),
              surfaceSegments[prefixCount] == readingSegments[prefixCount] {
            prefixCount += 1
        }

        var suffixCount = 0
        while suffixCount < surfaceSegments.count - prefixCount,
              suffixCount < readingSegments.count - prefixCount,
              KanaReading.isKanaSurface(surfaceSegments[surfaceSegments.count - 1 - suffixCount]),
              surfaceSegments[surfaceSegments.count - 1 - suffixCount]
                == readingSegments[readingSegments.count - 1 - suffixCount] {
            suffixCount += 1
        }

        let surfaceEnd = surfaceSegments.count - suffixCount
        let readingEnd = word.units.count - suffixCount
        let middleSurface = Array(surfaceSegments[prefixCount..<surfaceEnd])
        let middleUnits = Array(word.units[prefixCount..<readingEnd])

        guard !middleSurface.isEmpty, !middleUnits.isEmpty else {
            prefixMoras = []
            annotatedSurface = surfaceSegments
            annotatedUnits = word.units
            suffixMoras = []
            return
        }

        prefixMoras = (0..<prefixCount).map { index in
            Mora(surface: surfaceSegments[index], accent: word.units[index].accent)
        }
        annotatedSurface = middleSurface
        annotatedUnits = middleUnits
        suffixMoras = (0..<suffixCount).map { offset in
            let surfaceIndex = surfaceEnd + offset
            let readingIndex = readingEnd + offset
            return Mora(surface: surfaceSegments[surfaceIndex], accent: word.units[readingIndex].accent)
        }
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
    @Environment(\.colorScheme) private var colorScheme
    @State private var reading: String
    @State private var accentPosition: Int
    @State private var confirmsDiscard = false

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
                Section(text.pitchPreview) {
                    ScrollView(.horizontal) {
                        AccentWordMark(word: previewWord, showAccent: true, isDarkResult: colorScheme == .dark, style: .result)
                            .fixedSize()
                            .padding(.vertical, AkumaTheme.space2)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(target.surface), \(normalizedReading), \(text.accentLabel(for: accentPosition))")
                }

                Section(text.reading) {
                    TextField(text.reading, text: $reading)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.done)
                        .onSubmit(save)
                    if !isReadingValid {
                        Label(text.furiganaInputWarning, systemImage: "exclamationmark.circle")
                            .font(.footnote)
                            .foregroundStyle(AkumaTheme.red)
                    }
                }

                Section {
                    if !moras.isEmpty {
                        FlowLayout(spacing: 8, lineSpacing: 8) {
                            ForEach(Array(moras.enumerated()), id: \.offset) { index, mora in
                                Button { accentPosition = index + 1 } label: {
                                    Text(mora)
                                        .font(.title3)
                                        .frame(minWidth: 44, minHeight: 44)
                                }
                                .buttonStyle(.bordered)
                                .tint(accentPosition == index + 1 ? AkumaTheme.red : AkumaTheme.green)
                                .accessibilityLabel("\(mora), \(text.dropAfter(index + 1))")
                                .accessibilityAddTraits(accentPosition == index + 1 ? .isSelected : [])
                            }
                        }
                    }
                    Picker(text.accent, selection: $accentPosition) {
                        Text(text.accentFollowPrevious).tag(-1)
                        Text(text.accentNoDrop).tag(0)
                        ForEach(moras.indices, id: \.self) { index in
                            Text(text.dropAfter(index + 1)).tag(index + 1)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text(text.accent)
                } footer: {
                    Text(text.tapMoraHint)
                }
            }
            .navigationTitle(text.editReading)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(text.cancel) {
                        if hasChanges { confirmsDiscard = true }
                        else { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(text.done, action: save).disabled(!isReadingValid)
                }
            }
            .confirmationDialog(text.discardChangesTitle, isPresented: $confirmsDiscard, titleVisibility: .visible) {
                Button(text.discardChanges, role: .destructive) { dismiss() }
                Button(text.keepEditing, role: .cancel) {}
            }
        }
        .interactiveDismissDisabled(hasChanges)
        .onChange(of: reading) { _, _ in
            accentPosition = min(accentPosition, moras.count)
        }
    }

    private var normalizedReading: String { KanaReading.normalized(reading) }
    private var isReadingValid: Bool { KanaReading.isValid(normalizedReading) }
    private var moras: [String] { KanaReading.syllables(in: normalizedReading) }
    private var hasChanges: Bool { reading != target.reading || accentPosition != target.accentPosition }
    private var previewWord: AccentWord {
        var word = AccentWord(surface: target.surface, units: [])
        word.apply(reading: normalizedReading, accentPosition: accentPosition)
        return word
    }

    private func save() {
        guard isReadingValid else { return }
        onSave(normalizedReading, min(accentPosition, moras.count))
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
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
    }
}

private struct ResultActions: View {
    let words: [AccentWord]
    @Binding var showAccent: Bool
    @Binding var isDarkResult: Bool
    let text: AppText
    let isCompact: Bool
    let canRestore: Bool
    let canUndo: Bool
    let canRedo: Bool
    let onUndo: () -> Void
    let onRedo: () -> Void
    let onRestore: () -> Void
    let onEdit: (() -> Void)?
    let guideLabel: String
    let onOpenGuide: () -> Void
    @State private var isRestoreConfirmationVisible = false
    @State private var sharePayload: SharePayload?

    private var exportText: String {
        ResultExporter.plainText(words: words, showAccent: showAccent)
    }

    var body: some View {
        HStack(spacing: isCompact ? 0 : AkumaTheme.space2) {
            if let onEdit {
                Button(action: onEdit) {
                    Label(text.editInput, systemImage: "pencil")
                        .font(.body)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(minHeight: 44)
                        .padding(.horizontal, AkumaTheme.space2)
                }
                .buttonStyle(.plain)
            }

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
                        .font(.subheadline)
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult, isActive: showAccent))
            .accessibilityLabel(showAccent ? text.hideAccent : text.showAccent)

            Spacer(minLength: AkumaTheme.space2)

            Button(action: shareResult) {
                if isCompact {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                } else {
                    Label(text.share, systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                        .lineLimit(1)
                        .frame(height: AkumaTheme.actionControlSize)
                        .padding(.horizontal, AkumaTheme.space3)
                }
            }
            .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
            .accessibilityLabel(text.share)

            Group {
                Menu {
                    Button(action: onOpenGuide) { Label(guideLabel, systemImage: "questionmark.circle") }
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
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: AkumaTheme.actionControlSize, height: AkumaTheme.actionControlSize)
                }
                .buttonStyle(PanelButtonStyle(isDark: isDarkResult))
                .accessibilityLabel(text.resultOptions)
            }
        }
        .padding(.horizontal, isCompact ? AkumaTheme.space4 : AkumaTheme.space5)
        .padding(.vertical, AkumaTheme.space2)
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

    @MainActor
    private func shareResult() {
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
        } else {
            sharePayload = SharePayload(items: [exportText])
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
                    AccentWordMark(
                        word: word,
                        showAccent: showAccent,
                        isDarkResult: isDarkResult,
                        style: .export
                    )
                }
            }
        }
        .foregroundStyle(isDarkResult ? AkumaTheme.darkText : AkumaTheme.text)
        .padding(AkumaTheme.space6)
        .background(isDarkResult ? AkumaTheme.darkPanel : AkumaTheme.surface)
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var isDark = false
    var isActive = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foregroundColor)
            .background(background(configuration: configuration))
            .clipShape(RoundedRectangle(cornerRadius: AkumaTheme.radiusMedium, style: .continuous))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.96 : 1)
            .animation(reduceMotion ? nil : .snappy(duration: 0.15, extraBounce: 0), value: configuration.isPressed)
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

private struct FlowBreakKey: LayoutValueKey {
    static let defaultValue = false
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
                proposal: ProposedViewSize(width: min(subviews[index].sizeThatFits(.unspecified).width, bounds.width), height: nil)
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
            let idealSize = subviews[index].sizeThatFits(.unspecified)
            if subviews[index][FlowBreakKey.self] {
                positions.append(CGPoint(x: x, y: y))
                measuredWidth = max(measuredWidth, x)
                y += (x > 0 ? lineHeight : idealSize.height) + lineSpacing
                x = 0
                lineHeight = 0
                continue
            }
            let size = subviews[index].sizeThatFits(ProposedViewSize(width: min(idealSize.width, availableWidth), height: nil))

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
