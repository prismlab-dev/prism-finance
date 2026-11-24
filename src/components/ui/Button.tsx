import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

export type ButtonVariant = "secondary" | "success" | "danger" | "solid" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonShape = "rounded" | "pill";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * `secondary` = contorno neutro (cancelar), `success`/`danger` = ação confirmada, `solid` = CTA branco,
     * `ghost` = sem borda (ação terciária), `link` = texto sublinhado no hover, sem padding.
     */
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** `pill` arredonda por completo (filtros, chips de ação). */
    shape?: ButtonShape;
}

const BASE_CLASS =
    "inline-flex items-center justify-center gap-1.5 border transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    secondary: "border-white/[0.12] bg-white/[0.03] font-medium text-white/70 hover:border-white/[0.2] hover:text-white",
    success: "border-emerald-300/35 bg-emerald-400/[0.14] font-semibold text-emerald-50 hover:border-emerald-300/55 hover:bg-emerald-400/[0.2]",
    danger: "border-red-400/40 bg-red-500/15 font-semibold text-red-100 hover:border-red-400/60 hover:bg-red-500/20",
    solid: "border-transparent bg-white font-semibold text-canvas hover:bg-white/85",
    ghost: "border-transparent bg-transparent font-medium text-white/60 hover:bg-white/[0.06] hover:text-white",
    link: "border-transparent bg-transparent text-sm text-neutral-400 underline-offset-2 hover:text-white hover:underline",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-sm",
};

const SHAPE_CLASS: Record<ButtonShape, string> = {
    rounded: "rounded-xl",
    pill: "rounded-full",
};

/** Botão de texto padrão do app. Largura mínima e margens ficam por conta do `className` de quem usa. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "secondary", size = "md", shape = "rounded", type = "button", className = "", ...props },
    ref,
) {
    const sizeClass = variant === "link" ? "" : SIZE_CLASS[size];
    return (
        <button
            ref={ref}
            type={type}
            className={`${BASE_CLASS} ${SHAPE_CLASS[shape]} ${VARIANT_CLASS[variant]} ${sizeClass} ${className}`.trim()}
            {...props}
        />
    );
});
