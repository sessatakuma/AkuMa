import isKana from '../kana/isKana';
import { splitKanaSyllables } from '../kana/kanaUtils';

import { placeholder } from '../../constant/placeholder';
import { AccentValue, type AccentValueType, type Word } from '../word/accentTypes';

import markdownExportStyles from './markdownExport.css?raw';

function getSurfaceSegments(word: Word): string[] {
    return isKana(word.surface) && Array.isArray(word.accent)
        ? splitKanaSyllables(word.surface)
        : [...word.surface];
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderMarkdownSyllable(text: string, accent: AccentValueType): string {
    const escapedText = escapeHtml(text);
    if (accent === AccentValue.High) return `<i>${escapedText}</i>`;
    if (accent === AccentValue.Drop) return `<b>${escapedText}</b>`;
    return escapedText;
}

export function buildMarkdownExport(words: Word[], showAccent: boolean): string {
    const rubyMarkup = words
        .map(word => {
            const surfaceSegments = getSurfaceSegments(word);
            const kanaAccents = isKana(word.surface) && Array.isArray(word.accent) ? word.accent : null;
            const baseMarkup = escapeHtml(word.surface);

            const readingMarkup = (kanaAccents
                ? surfaceSegments.map((segment, index) =>
                      showAccent
                          ? renderMarkdownSyllable(segment, kanaAccents[index] ?? AccentValue.None)
                          : escapeHtml(segment),
                  )
                : word.furigana.map(item =>
                      showAccent
                          ? renderMarkdownSyllable(
                                item.text === placeholder ? '' : item.text,
                                item.accent,
                            )
                          : escapeHtml(item.text === placeholder ? '' : item.text),
                  )
            ).join('');

            return `<ruby>${baseMarkup}<rt>${readingMarkup}</rt></ruby>`;
        })
        .join('');

    return `<style>${markdownExportStyles.trim()}</style><div class="accent-marker">${rubyMarkup}</div>`;
}
