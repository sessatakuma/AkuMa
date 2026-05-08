// utilities/kanaUtils.ts
export function splitKanaSyllables(kana: string): string[] {
    const smallKana = 'ゃゅょァィゥェォャュョヮぁぃぅぇぉ';
    const result: string[] = [];

    for (let i = 0; i < kana.length; i++) {
        const char = kana[i];
        const next = kana[i + 1];

        if (next && smallKana.includes(next)) {
            result.push(char + next); // 合併音節
            i++; // skip next
        } else {
            result.push(char);
        }
    }

    return result;
}

export function isKanaReading(text: string): boolean {
    return /^[ぁ-んァ-ンーゔゞ゛゜・･ー]+$/.test(text);
}
