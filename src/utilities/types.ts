export const AccentValue = {
    None: 0,
    High: 1,
    Drop: 2,
} as const;

export type AccentValueType = (typeof AccentValue)[keyof typeof AccentValue];

export interface FuriganaItem {
    text: string;
    accent: AccentValueType;
}

export interface Word {
    surface: string;
    furigana: FuriganaItem[];
    accent: AccentValueType | AccentValueType[];
}
