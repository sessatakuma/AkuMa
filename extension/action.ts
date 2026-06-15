(function triggerAkumaExtensionAction() {
    chrome?.runtime?.sendMessage?.({ type: 'akuma:show-page-popover' });
})();
