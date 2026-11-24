import { toBlob } from "html-to-image";

/** Gera um PNG do nó em 3x, para ficar nítido em celular. */
export async function renderNodeToImage(node: HTMLElement, fileName: string): Promise<File | null> {
    // Foto que não carregar (ex.: bloqueio de CORS) sai transparente em vez de derrubar a imagem inteira.
    const blob = await renderNodeToBlob(node);
    return blob ? new File([blob], fileName, { type: "image/png" }) : null;
}

export function renderNodeToBlob(node: HTMLElement): Promise<Blob | null> {
    return toBlob(node, { pixelRatio: 3, cacheBust: true, imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" });
}

function escapeHtml(text: string): string {
    return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

/**
 * Copia imagem e texto juntos: cada app de destino escolhe o formato que aceita
 * (WhatsApp/Slack pegam a imagem, editores de texto pegam o texto com o link).
 * A imagem entra como Promise para o Safari aceitar a escrita depois do clique.
 * Retorna "text" quando o navegador só deixou copiar o texto.
 */
export async function copyImageAndMessage(image: Promise<Blob>, message: string): Promise<"all" | "text"> {
    const text = new Blob([message], { type: "text/plain" });
    try {
        const html = image.then(async (blob) => {
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.readAsDataURL(blob);
            });
            const body = escapeHtml(message).replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>");
            return new Blob([`<img src="${dataUrl}" alt=""><p>${body}</p>`], { type: "text/html" });
        });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": image, "text/plain": text, "text/html": html })]);
        return "all";
    } catch (error) {
        console.warn("Clipboard image write failed, copying text only:", error);
        await navigator.clipboard.writeText(message);
        return "text";
    }
}

export function canShareImage(file: File): boolean {
    return Boolean(navigator.canShare?.({ files: [file] }));
}

export async function shareImage(file: File, title: string): Promise<void> {
    try {
        await navigator.share({ files: [file], title });
    } catch (error) {
        // Fechar o menu de compartilhar sem escolher nada não é erro.
        if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
}

export function downloadImage(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
}
