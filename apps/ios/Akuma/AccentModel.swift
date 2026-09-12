import Foundation

struct AccentUnit: Equatable, Codable {
    var reading: String
    var accent: AccentKind
}

struct AccentWord: Equatable, Codable {
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
        let hidesReading = KanaReading.isKanaSurface(surface) && normalizedReading == surface

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
enum AccentKind: String, Hashable, Codable {
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

enum KanaReading {
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
