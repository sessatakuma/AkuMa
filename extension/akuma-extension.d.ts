declare const chrome:
    | {
          action?: {
              onClicked?: {
                  addListener: (callback: (tab: { id?: number }) => void) => void;
              };
          };
          identity?: {
              getRedirectURL: (path?: string) => string;
              launchWebAuthFlow: (
                  options: { interactive: boolean; url: string },
                  callback: (responseUrl?: string) => void,
              ) => void;
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
              insertCSS: (options: {
                  target: { tabId: number };
                  files: string[];
              }) => Promise<unknown>;
          };
          storage?: {
              local?: {
                  get: <T extends Record<string, unknown>>(
                      keys: string[] | Record<string, unknown>,
                  ) => Promise<T>;
                  remove: (keys: string | string[]) => Promise<void>;
                  set: (items: Record<string, unknown>) => Promise<void>;
              };
              onChanged?: {
                  addListener: (
                      callback: (
                          changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
                          areaName: string,
                      ) => void,
                  ) => void;
              };
          };
          tabs?: {
              create: (options: { url: string }) => Promise<unknown>;
              query: (options: { active: boolean; currentWindow: boolean }) => Promise<Array<{ id?: number }>>;
              sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
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
        appUrl?: string;
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

interface AkumaExtensionAccount {
    email: string | null;
    plan: 'free' | 'pro';
    usageCount: number;
    usageLimit: number;
}

interface AkumaExtensionSession {
    access_token: string;
    expires_at?: number;
    refresh_token?: string;
    token_type: string;
    user?: {
        email?: string;
        id?: string;
    };
}

interface AkumaExtensionToken {
    expiresAt: number;
    token: string;
    userId: string;
}
