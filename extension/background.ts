(function registerAkumaExtensionBackground() {
    chrome?.action?.onClicked?.addListener(tab => {
        if (typeof tab.id !== 'number') {
            return;
        }

        chrome?.scripting?.executeScript({
            target: { tabId: tab.id },
            files: ['action.js'],
        });
    });
})();
