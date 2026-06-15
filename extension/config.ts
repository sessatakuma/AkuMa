(function registerAkumaExtensionConfig(globalScope: typeof globalThis) {
    const runtimeScope = globalScope as unknown as Window;
    runtimeScope.AKUMA_EXTENSION ??= {};
    runtimeScope.AKUMA_EXTENSION.config = {
        apiBaseUrl: 'https://akuma.sessatakuma.dev',
    };
})(globalThis);
