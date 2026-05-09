const EXPORT_PADDING_PX = 32;

type ExportModules = {
    toPng: typeof import('html-to-image').toPng;
};

const preloadExportModules = (() => {
    let cache: Promise<ExportModules> | null = null;
    return () =>
        (cache ??= Promise.all([import('html-to-image')]).then(([htmlToImage]) => ({
            toPng: htmlToImage.toPng,
        })));
})();

export function preloadImageExport(): Promise<ExportModules> {
    return preloadExportModules();
}

export async function exportResultAsImage(
    element: HTMLElement,
    isDarkResult: boolean,
): Promise<void> {
    const backgroundColor = isDarkResult ? '#1F2937' : '#FFFFFF';
    const width = element.offsetWidth + EXPORT_PADDING_PX * 2;
    const height = element.offsetHeight + EXPORT_PADDING_PX * 2;
    const { toPng } = await preloadExportModules();
    const dataUrl = await toPng(element, {
        backgroundColor,
        pixelRatio: 2,
        width,
        height,
        style: {
            boxSizing: 'border-box',
            margin: '0',
            padding: `${EXPORT_PADDING_PX}px`,
        },
    });

    const link = document.createElement('a');
    link.download = 'accented-text.png';
    link.href = dataUrl;
    link.click();
}
