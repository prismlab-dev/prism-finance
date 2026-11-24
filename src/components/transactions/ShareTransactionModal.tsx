import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, LoaderCircle, Share2 } from "lucide-react";
import { useFinanceSession } from "../../context/FinanceContext";
import { useModal } from "../../context/ModalContext";
import { buildTransactionLink } from "../../context/PageContext";
import { resolveUserDisplayName } from "../../lib/userProfile";
import { loadTransactionDetails } from "../../supabase/finance/transactionDetailsService";
import { ModalStructure } from "../modal/ModalStructure";
import { canShareImage, copyImageAndMessage, downloadImage, renderNodeToBlob, renderNodeToImage, shareImage } from "./shareTransactionImage";
import { buildShareMessage } from "./shareTransactionMessage";
import { TransactionShowcase, type TransactionShowcaseProps } from "./TransactionShowcase";

const SECONDARY_BUTTON = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:border-white/[0.2] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-60";

// Testa com um arquivo vazio só para saber se o navegador aceita compartilhar imagens.
const SHARE_SUPPORTED = typeof navigator !== "undefined" && canShareImage(new File([], "teste.png", { type: "image/png" }));

type ShareTransactionModalProps = Omit<TransactionShowcaseProps, "ref">;

export function ShareTransactionModal({ transaction, sourceLabel, note, team, owner }: ShareTransactionModalProps) {
    const { closeModal } = useModal();
    const { user, profile } = useFinanceSession();
    const userId = user?.uid;
    const [annotation, setAnnotation] = useState("");
    // Mesma regra do cabeçalho: o perfil do app vence a foto do login.
    const userOwner = { kind: "user" as const, name: profile?.displayName ?? resolveUserDisplayName(user), image: profile ? profile.photoURL : user?.photoURL?.trim() ? user.photoURL : null };

    // A anotação fica fora do snapshot; sem ela o comprovante sai só com a descrição.
    useEffect(() => {
        if (note !== undefined || !userId || transaction.isProjected) return;
        let cancelled = false;
        loadTransactionDetails(userId, transaction.id)
            .then((details) => !cancelled && setAnnotation(details.annotation))
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [note, transaction.id, transaction.isProjected, userId]);
    const showcaseRef = useRef<HTMLDivElement>(null);
    const [busy, setBusy] = useState<"share" | "download" | "copy" | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState<"all" | "text" | null>(null);

    useEffect(() => {
        if (!copied) return;
        const timeout = window.setTimeout(() => setCopied(null), 2500);
        return () => window.clearTimeout(timeout);
    }, [copied]);

    const handleCopy = async () => {
        const node = showcaseRef.current;
        if (!node || busy) return;
        setBusy("copy");
        setErrorMessage(null);
        const message = buildShareMessage({
            transaction,
            link: buildTransactionLink(transaction, Boolean(team)),
            team,
            teamName: owner?.kind === "team" ? owner.name : undefined,
        });
        // A Promise da imagem vai direto para a área de transferência, ainda dentro do clique.
        const image = renderNodeToBlob(node).then((blob) => blob ?? Promise.reject(new Error("empty image")));
        try {
            setCopied(await copyImageAndMessage(image, message));
        } catch (error) {
            console.error("Failed to copy transaction:", error);
            setErrorMessage("Não foi possível copiar. Use o compartilhar ou baixe a imagem.");
        } finally {
            setBusy(null);
        }
    };

    const run = async (mode: "share" | "download") => {
        if (!showcaseRef.current || busy) return;
        setBusy(mode);
        setErrorMessage(null);
        try {
            const file = await renderNodeToImage(showcaseRef.current, `transacao-${transaction.date}.png`);
            if (!file) throw new Error("empty image");
            if (mode === "share") await shareImage(file, transaction.description || "Transação");
            else downloadImage(file);
        } catch (error) {
            console.error("Failed to share transaction image:", error);
            setErrorMessage(mode === "share" ? "O compartilhamento falhou. Use o copiar ou baixe a imagem." : "Não foi possível gerar a imagem. Tente de novo.");
        } finally {
            setBusy(null);
        }
    };

    const spinner = <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />;

    return (
        <ModalStructure height="auto" width={team ? "480px" : "440px"}>
            <div className="text-white">
                {/* No modal o card aparece solto; a cópia com o quadro fica fora da tela só para gerar a imagem. */}
                <div className="flex justify-center">
                    <TransactionShowcase bare transaction={transaction} sourceLabel={sourceLabel} note={note ?? annotation} team={team} owner={owner ?? userOwner} />
                </div>
                <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0">
                    <TransactionShowcase ref={showcaseRef} transaction={transaction} sourceLabel={sourceLabel} note={note ?? annotation} team={team} owner={owner ?? userOwner} />
                </div>

                {errorMessage ? <p role="alert" className="mt-3 px-1 text-sm text-red-200">{errorMessage}</p> : null}

                {copied ? (
                    <p role="status" className="mt-3 px-1 text-sm text-white/60">
                        {copied === "all" ? "Imagem e mensagem copiadas. É só colar na conversa." : "Este navegador só deixou copiar a mensagem com o link; a imagem ficou de fora."}
                    </p>
                ) : null}

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={closeModal} className={SECONDARY_BUTTON}>
                        Cancelar
                    </button>
                    <div className="ml-auto flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => run("download")}
                            disabled={busy !== null}
                            title="Baixar imagem"
                            aria-label="Baixar imagem"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {busy === "download" ? spinner : <Download size={18} aria-hidden />}
                        </button>
                        <button type="button" onClick={handleCopy} disabled={busy !== null} className={SHARE_SUPPORTED ? SECONDARY_BUTTON : PRIMARY_BUTTON}>
                            {busy === "copy" ? spinner : copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? "Copiado" : "Copiar"}
                        </button>
                        {SHARE_SUPPORTED ? (
                            <button type="button" onClick={() => run("share")} disabled={busy !== null} className={PRIMARY_BUTTON}>
                                {busy === "share" ? spinner : <Share2 size={16} aria-hidden />} Compartilhar
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </ModalStructure>
    );
}
