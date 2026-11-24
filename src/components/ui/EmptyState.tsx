import type { HTMLAttributes, ReactNode } from "react";

export type EmptyStateVariant = "dashed" | "soft" | "plain";
export type EmptyStateSize = "sm" | "md" | "lg";
export type EmptyStateAlign = "start" | "center";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
    /** `dashed` = caixa tracejada (listas/tabelas vazias); `soft` = caixa de fundo suave (cartões); `plain` = só texto. */
    variant?: EmptyStateVariant;
    /** Espaçamento vertical: `sm` 16px, `md` 24px (padrão), `lg` 40px. */
    size?: EmptyStateSize;
    /** Alinhamento do texto. Padrão: centralizado, exceto em `plain`. */
    align?: EmptyStateAlign;
    /** Ícone opcional exibido acima da mensagem, dentro de um quadrado suave. */
    icon?: ReactNode;
    /** Linha de apoio, em tom mais discreto, abaixo da mensagem. */
    description?: ReactNode;
}

const VARIANT_CLASS: Record<EmptyStateVariant, { box: string; text: string }> = {
    dashed: { box: "rounded-xl border border-dashed border-white/[0.1] px-4", text: "text-white/70" },
    soft: { box: "rounded-xl border border-white/[0.06] bg-white/[0.02] px-3", text: "text-white/45" },
    plain: { box: "", text: "text-white/45" },
};

const SIZE_CLASS: Record<EmptyStateSize, string> = {
    sm: "py-4",
    md: "py-6",
    lg: "py-10",
};

/** Mensagem de lista/painel sem dados. Margens externas ficam no `className`. */
export function EmptyState({ variant = "soft", size = "md", align, icon, description, className = "", children, ...props }: EmptyStateProps) {
    const resolvedAlign = align ?? (variant === "plain" ? "start" : "center");
    const { box, text } = VARIANT_CLASS[variant];
    const layout = icon ? "flex flex-col items-center gap-3" : "";

    return (
        <div className={`${box} ${SIZE_CLASS[size]} ${resolvedAlign === "center" ? "text-center" : ""} ${layout} ${className}`.replace(/\s+/g, " ").trim()} {...props}>
            {icon ? <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-white/70">{icon}</span> : null}
            <p className={`text-sm ${text}`}>{children}</p>
            {description ? <p className="mt-1 text-xs text-white/40">{description}</p> : null}
        </div>
    );
}
