(function registerAkumaExtensionAccentTypes(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    runtimeScope.AKUMA_EXTENSION.config ??= {
        apiBaseUrl: 'https://akuma.sessatakuma.dev',
        appUrl: 'https://akuma.sessatakuma.dev',
        supabasePublishableKey: '',
        supabaseUrl: '',
    };
})(globalThis);
