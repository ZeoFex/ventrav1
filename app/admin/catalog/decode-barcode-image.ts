/**
 * Decode a 1D barcode from a still image (file upload, screenshot, photo).
 */
export async function decodeBarcodeFromImageFile(file: File): Promise<string | null> {
    const dataUrl = await readFileAsDataUrl(file);
    const { default: Quagga } = await import("@ericblade/quagga2");

    return new Promise((resolve) => {
        (Quagga as unknown as {
            decodeSingle: (
                config: Record<string, unknown>,
                callback: (result: { codeResult?: { code?: string } }) => void
            ) => void;
        }).decodeSingle(
            {
                src: dataUrl,
                numOfWorkers: 0,
                inputStream: { size: 1600 },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "upc_reader",
                        "upc_e_reader",
                    ],
                },
                locate: true,
            },
            (result) => {
                const code = result?.codeResult?.code?.trim();
                resolve(code && code.length > 0 ? code : null);
            }
        );
    });
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}
