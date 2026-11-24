import type { ElementType, HTMLAttributes } from "react";

export type SurfaceVariant = "solid" | "glass";

/** Classes de cada variante; exportadas para quem não renderiza a própria `<div>` (ex.: `AnchoredOverlay`). */
export const SURFACE_CLASS: Record<SurfaceVariant, string> = {
    solid: "rounded-2xl border border-white/[0.09] bg-surface shadow-[0_24px_60px_-32px_rgba(0,0,0,0.9)]",
    glass: "rounded-2xl border border-white/[0.1] bg-canvas/95 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl",
};

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
    /** `solid` = cartões, painéis de modal e listas abertas; `glass` = painel translúcido que flutua sobre a página (seletores, filtros). */
    variant?: SurfaceVariant;
    /** Elemento HTML renderizado (padrão `div`). */
    as?: ElementType;
}

/** Superfície elevada (borda + fundo + sombra). Padding, layout e posicionamento ficam no `className`. */
export function Surface({ variant = "solid", as: Tag = "div", className = "", ...props }: SurfaceProps) {
    return <Tag className={`${SURFACE_CLASS[variant]} ${className}`.trim()} {...props} />;
}
