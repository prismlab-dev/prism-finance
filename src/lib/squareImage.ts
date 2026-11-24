const SQUARE_IMAGE_SIZE = 256;

/** Corta a imagem no centro em 1:1 e devolve um JPEG pequeno em data URL. */
export async function cropImageFileToSquare(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
        throw new Error("Escolha um arquivo de imagem (PNG, JPG ou WebP).");
    }

    const bitmap = await createImageBitmap(file).catch(() => {
        throw new Error("Não foi possível ler essa imagem.");
    });
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = SQUARE_IMAGE_SIZE;
    canvas.height = SQUARE_IMAGE_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Falha ao processar a imagem.");
    }

    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SQUARE_IMAGE_SIZE, SQUARE_IMAGE_SIZE);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
}
