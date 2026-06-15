declare const chrome:
    | {
          action?: {
              onClicked?: {
                  addListener: (callback: (tab: { id?: number }) => void) => void;
              };
          };
          runtime?: {
              onMessage?: {
                  addListener: (
                      callback: (
                          message: unknown,
                          sender: unknown,
                          sendResponse: (response?: unknown) => void,
                      ) => boolean | void,
                  ) => void;
              };
              sendMessage?: (message: unknown) => void;
          };
          scripting?: {
              executeScript: (options: {
                  target: { tabId: number };
                  files: string[];
              }) => Promise<unknown>;
          };
      }
    | undefined;

interface Window {
    AKUMA_EXTENSION?: AkumaExtensionNamespace;
}

interface AkumaExtensionNamespace {
    annotate?: {
        annotateText: (text: string, options: AkumaAnnotateOptions) => Promise<DocumentFragment>;
    };
    api?: {
        markAccent: (text: string) => Promise<AkumaMarkAccentEntry[]>;
    };
    config?: {
        apiBaseUrl: string;
    };
    mapper?: {
        mapApiResultToWords: (result: AkumaMarkAccentEntry[]) => AkumaWord[];
        mapFallbackTextToWords: (text: string) => AkumaWord[];
    };
}

interface AkumaAnnotateOptions {
    showAccent: boolean;
}

interface AkumaAccentEntry {
    accent_marking_type: number;
    furigana: string;
}

interface AkumaMarkAccentEntry {
    accent: AkumaAccentEntry[];
    furigana: string;
    surface: string;
}

interface AkumaFuriganaItem {
    accent: AkumaAccentValue;
    text: string;
}

interface AkumaWord {
    accent: AkumaAccentValue | AkumaAccentValue[];
    furigana: AkumaFuriganaItem[];
    surface: string;
}

type AkumaAccentValue = 0 | 1 | 2;
