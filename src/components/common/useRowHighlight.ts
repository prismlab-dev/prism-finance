import { useEffect } from "react";

/** Rola até a linha marcada com `data-transaction-id` e pisca o fundo; tenta por alguns frames até a lista renderizar. */
export function useRowHighlight(transactionId: string | null, onDone: () => void) {
    useEffect(() => {
        if (!transactionId) {
            return;
        }

        let attempts = 0;
        let frame = 0;
        const tryHighlight = () => {
            const row = document.querySelector<HTMLElement>(`[data-transaction-id="${CSS.escape(transactionId)}"]`);
            if (!row) {
                if (++attempts < 120) {
                    frame = requestAnimationFrame(tryHighlight);
                }
                return;
            }

            onDone();
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            row.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
            row.animate(
                [{ backgroundColor: "transparent" }, { backgroundColor: "rgba(125, 211, 252, 0.16)", offset: 0.3 }, { backgroundColor: "transparent" }],
                { duration: 1400, easing: "ease-out", delay: reduceMotion ? 0 : 300 },
            );
        };
        frame = requestAnimationFrame(tryHighlight);
        return () => cancelAnimationFrame(frame);
        // onDone só limpa o estado do chamador; não deve reiniciar a busca.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transactionId]);
}
