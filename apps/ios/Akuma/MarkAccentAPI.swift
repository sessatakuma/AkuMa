import Foundation

enum MarkAccentAPI {
    private static let productionOrigin = "https://akuma.sessatakuma.dev"
    private static let streamPath = "/api/mark-accent/stream"

    static func analyze(
        _ text: String,
        onUpdate: @escaping @MainActor ([AccentWord]) -> Void
    ) async throws -> [AccentWord] {
        let endpoint = try streamEndpoint()
        var request = URLRequest(url: endpoint, timeoutInterval: 30)
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
            try Task.checkCancellation()
            guard !line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { continue }
            let status = try JSONDecoder().decode(StreamStatus.self, from: Data(line.utf8))
            guard status.status == 200 else { throw APIError.invalidResponse }
            let chunk = try JSONDecoder().decode(MarkAccentStreamChunk.self, from: Data(line.utf8))

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

private struct StreamStatus: Decodable { let status: Int }
