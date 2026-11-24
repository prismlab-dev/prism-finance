import type { HTMLAttributes } from "react";

export type BadgeTone = "outline" | "soft" | "success" | "custom";
export type BadgeSize = "xs" | "sm";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * `outline` = contorno neutro (contadores, rótulos); `soft` = fundo suave sem borda (Inativo, Não conectado);
     * `success` = verde; `custom` = só forma e tipografia, as cores vêm do `className` (mapas de status).
     */
    tone?: BadgeTone;
    /** `xs` = 10px, `sm` = 11px. */
    size?: BadgeSize;
    /** Caixa alta com espaçamento entre letras (rótulos de status). */
    uppercase?: boolean;
}

const BASE_CLASS = "inline-flex shrink-0 items-center rounded-full px-2 py-0.5";

const TONE_CLASS: Record<BadgeTone, string> = {
    outline: "border border-white/10 bg-white/[0.04] text-white/60",
    soft: "bg-white/[0.06] text-white/50",
    success: "bg-emerald-500/15 text-emerald-200",
    custom: "border",
};

const SIZE_CLASS: Record<BadgeSize, string> = {
    xs: "text-[10px]",
    sm: "text-[11px]",
};

const UPPERCASE_CLASS = "uppercase tracking-[0.08em]";

/** Pílula pequena de texto (status, contador, rótulo). Margens e cores específicas ficam no `className`. */
export function Badge({ tone = "outline", size = "xs", uppercase = false, className = "", ...props }: BadgeProps) {
    return (
        <span
            className={`${BASE_CLASS} ${TONE_CLASS[tone]} ${SIZE_CLASS[size]} ${uppercase ? UPPERCASE_CLASS : ""} ${className}`.replace(/\s+/g, " ").trim()}
            {...props}
        />
    );
}
