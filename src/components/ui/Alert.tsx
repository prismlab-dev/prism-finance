import type { HTMLAttributes } from "react";

export type AlertTone = "error" | "warning" | "success";

export interface AlertProps extends HTMLAttributes<HTMLParagraphElement> {
    /** `error` e `warning` usam `role="alert"`; `success` usa `role="status"`. */
    tone?: AlertTone;
}

const BASE_CLASS = "rounded-xl border px-3 py-2 text-sm";

const TONE_CLASS: Record<AlertTone, string> = {
    error: "border-red-400/25 bg-red-500/10 text-red-100",
    warning: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
};

/** Caixa de mensagem inline (erro de envio, item não encontrado, confirmação). Margens ficam no `className`. */
export function Alert({ tone = "error", className = "", role, ...props }: AlertProps) {
    return <p role={role ?? (tone === "success" ? "status" : "alert")} className={`${BASE_CLASS} ${TONE_CLASS[tone]} ${className}`.trim()} {...props} />;
}
