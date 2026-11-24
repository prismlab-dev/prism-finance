import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

export type IconButtonVariant = "outline" | "ghost" | "bare" | "danger";
export type IconButtonSize = "xs" | "sm" | "md" | "lg";
export type IconButtonShape = "round" | "square";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Obrigatório: botão só com ícone precisa de nome acessível. */
    "aria-label": string;
    /**
     * `outline` = borda sempre visível (fechar modal); `ghost` = borda só no hover (navegação de mês);
     * `bare` = sem borda, só fundo no hover (ações em linha); `danger` = como `bare`, mas vermelho no hover.
     */
    variant?: IconButtonVariant;
    /** `xs` 24px, `sm` 28px, `md` 32px (padrão), `lg` 40px. */
    size?: IconButtonSize;
    /** `round` (padrão) ou `square` (cantos arredondados). */
    shape?: IconButtonShape;
}

const BASE_CLASS =
    "inline-flex shrink-0 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-55";

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
    outline: "border-white/[0.12] bg-white/[0.03] text-white/70 hover:border-white/[0.22] hover:bg-white/[0.06] hover:text-white",
    ghost: "border-transparent text-white/80 hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white",
    bare: "border-transparent text-white/45 hover:bg-white/[0.06] hover:text-white",
    danger: "border-transparent text-white/45 hover:bg-red-500/10 hover:text-red-200",
};

const SIZE_CLASS: Record<IconButtonSize, string> = {
    xs: "h-6 w-6",
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
};

const SHAPE_CLASS: Record<IconButtonShape, string> = {
    round: "rounded-full",
    square: "rounded-lg",
};

/** Botão só com ícone (passe o ícone como `children`). 32px e redondo por padrão. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { variant = "outline", size = "md", shape = "round", type = "button", className = "", ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            className={`${BASE_CLASS} ${SHAPE_CLASS[shape]} ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`.trim()}
            {...props}
        />
    );
});
