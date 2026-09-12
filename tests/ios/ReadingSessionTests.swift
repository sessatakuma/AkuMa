import Foundation

private final class MemoryDefaults: UserDefaults {
    private var values: [String: Any] = [:]
    override func data(forKey key: String) -> Data? { values[key] as? Data }
    override func string(forKey key: String) -> String? { values[key] as? String }
    override func set(_ value: Any?, forKey key: String) { values[key] = value }
}

@MainActor
private final class AnalysisRequests {
    struct Request {
        let source: String
        let update: @MainActor ([AccentWord]) -> Void
        let continuation: CheckedContinuation<[AccentWord], Error>
    }
    var requests: [Request] = []

    func analyze(_ source: String, update: @escaping @MainActor ([AccentWord]) -> Void) async throws -> [AccentWord] {
        try await withCheckedThrowingContinuation { continuation in
            requests.append(Request(source: source, update: update, continuation: continuation))
        }
    }
}

@main
struct ReadingSessionTests {
    @MainActor
    static func main() async {
        let defaults = MemoryDefaults()
        defaults.set("古い下書き", forKey: "draftParagraph")
        let requests = AnalysisRequests()
        let session = ReadingSession(defaults: defaults, analyzer: requests.analyze)
        expect(session.draft == "古い下書き", "Existing drafts migrate")
        session.draft = " \n "
        session.beginAnalysis()
        expect(!session.isBusy && !session.showsResult, "Empty drafts cannot start analysis")

        session.draft = "今日\n猫"
        session.beginAnalysis()
        session.beginAnalysis()
        expect(session.phase == .loading && session.showsResult, "Loading is visible before the first response")
        await until { requests.requests.count == 1 }
        let original = [word("今日", "きょう", 1), AccentWord(surface: "", units: [], isLineBreak: true), word("猫", "ねこ", 1)]
        requests.requests[0].update(Array(original.prefix(1)))
        expect(session.phase == .streaming && session.result == nil, "Streaming never commits partial results")
        requests.requests[0].continuation.resume(returning: original)
        await until { session.phase == .idle }
        expect(requests.requests.count == 1 && session.result?.words == original, "Duplicate submissions are ignored")

        session.updateWord(index: 0, reading: "きょう", accentPosition: 0)
        let corrected = session.result!
        session.editDraft()
        session.beginAnalysis()
        expect(session.showsResult && !session.isBusy && session.result == corrected, "Returning to an unchanged draft preserves corrections without analysis")
        expect(requests.requests.count == 1, "Unchanged text does not hit the API")

        let restored = ReadingSession(defaults: defaults, analyzer: requests.analyze)
        expect(restored.draft == session.draft && restored.showsResult && restored.result == corrected, "Draft, result, navigation and history restore together")
        restored.undo()
        expect(restored.result?.words == original, "Restored undo history works")
        restored.redo()
        expect(restored.result?.words == corrected.words, "Restored redo history works")
        restored.restore()
        restored.undo()
        expect(restored.result?.words == corrected.words, "Restore remains undoable")

        session.editDraft()
        session.draft = "新しい文章"
        expect(session.needsReplacementConfirmation, "Replacing corrected work requires explicit intent")
        session.beginAnalysis()
        await until { requests.requests.count == 2 }
        requests.requests[1].update([word("新しい", "あたらしい", 0)])
        let duringStreaming = ReadingSession(defaults: defaults, analyzer: requests.analyze)
        expect(duringStreaming.result == corrected, "A process restart during streaming keeps the last completed result")
        requests.requests[1].continuation.resume(throwing: URLError(.notConnectedToInternet))
        await until { session.phase == .failed }
        expect(session.result == corrected && session.draft == "新しい文章" && session.streamedWords.isEmpty, "Failure preserves complete draft and corrections without fabricated output")
        session.openSavedResult()
        expect(session.phase == .idle && session.result == corrected, "A failed request can return to the saved result")

        session.beginAnalysis()
        await until { requests.requests.count == 3 }
        session.cancelAnalysis()
        expect(!session.isBusy && !session.showsResult && session.result == corrected, "Cancel returns to the draft and preserves work")
        session.draft = "次の文章"
        session.beginAnalysis()
        await until { requests.requests.count == 4 }
        requests.requests[2].update(original)
        requests.requests[2].continuation.resume(returning: original)
        await Task.yield()
        expect(session.phase == .loading && session.streamedWords.isEmpty, "Late callbacks from cancelled requests cannot change the new request")
        let next = [word("次", "つぎ", 0)]
        requests.requests[3].continuation.resume(returning: next)
        await until { session.phase == .idle }
        expect(session.result?.source == "次の文章" && session.result?.words == next, "Only the current response commits")

        session.draft = "空の応答"
        session.beginAnalysis()
        await until { requests.requests.count == 5 }
        requests.requests[4].continuation.resume(returning: [])
        await until { session.phase == .failed }
        expect(session.result?.words == next, "An empty response cannot erase the saved result")

        var kana = word("は", "は", -1)
        kana.apply(reading: "わ", accentPosition: 0)
        expect(kana.editableReading == "わ", "Kana reading corrections are not silently discarded")
        expect(KanaReading.syllables(in: "きょう") == ["きょ", "う"], "Mora selectors keep small kana with the preceding kana")
        print("ReadingSession regression checks passed (draft migration, persistence, history, failure, cancellation, stale responses and kana edits).")
    }

    @MainActor private static func until(_ condition: () -> Bool) async {
        for _ in 0..<10_000 {
            if condition() { return }
            await Task.yield()
        }
        fatalError("Timed out waiting for analysis state")
    }

    private static func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
        if !condition() { fatalError(message) }
    }

    private static func word(_ surface: String, _ reading: String, _ accent: Int) -> AccentWord {
        var word = AccentWord(surface: surface, units: [])
        word.apply(reading: reading, accentPosition: accent)
        return word
    }
}
