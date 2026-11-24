import type { CSSProperties, ReactNode } from "react";

export type SegmentedControlVariant = "field" | "compact" | "pill" | "tabs";

export interface SegmentedOption<T extends string | number> {
    value: T;
    label: ReactNode;
    /** Ícone opcional antes do rótulo. */
    icon?: ReactNode;
    disabled?: boolean;
    title?: string;
    /** Classes da opção selecionada (cor do estado: pago, pendente...). Substitui o padrão da variante. */
    activeClassName?: string;
    /** Estilo inline da opção selecionada (cores dinâmicas vindas de dados). */
    activeStyle?: CSSProperties;
    /** Estilo inline da opção não selecionada. */
    inactiveStyle?: CSSProperties;
}

export interface SegmentedControlProps<T extends string | number> {
    options: ReadonlyArray<SegmentedOption<T>>;
    value: T;
    onChange: (value: T) => void;
    /** Nome acessível do grupo. */
    ariaLabel: string;
    /**
     * `field` = caixa de formulário (modais), `compact` = filtro pequeno de listas, `pill` = alternância mínima em cabeçalhos,
     * `tabs` = abas em grade (mobile).
     */
    variant?: SegmentedControlVariant;
    /** `radio` (padrão, escolha de um valor) ou `tab` (navegação entre painéis). */
    role?: "radio" | "tab";
    disabled?: boolean;
    className?: string;
}

const CONTAINER_CLASS: Record<SegmentedControlVariant, string> = {
    field: "flex gap-1 rounded-xl border border-white/[0.1] bg-black/35 p-1",
    compact: "inline-flex rounded-xl border border-white/[0.08] bg-black/25 p-0.5 text-xs font-medium",
    pill: "flex items-center justify-center gap-1",
    tabs: "grid gap-1 rounded-2xl bg-white/[0.04] p-1",
};

const ITEM_CLASS: Record<SegmentedControlVariant, string> = {
    field: "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium",
    compact: "rounded-lg px-3 py-1.5",
    pill: "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.05em]",
    tabs: "rounded-xl border py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
};

const ACTIVE_CLASS: Record<SegmentedControlVariant, string> = {
    field: "bg-white/10 text-white",
    compact: "bg-white/10 text-white",
    pill: "bg-white/[0.1] text-white",
    tabs: "border-white/20 bg-white/10 text-white",
};

const INACTIVE_CLASS: Record<SegmentedControlVariant, string> = {
    field: "text-white/65 hover:bg-white/[0.06]",
    compact: "text-white/55 hover:text-white",
    pill: "text-white/40 hover:text-white/70",
    tabs: "border-transparent text-neutral-400",
};

/** Seletor segmentado: escolhe um valor entre poucas opções sempre visíveis. */
export function SegmentedControl<T extends string | number>({
    options,
    value,
    onChange,
    ariaLabel,
    variant = "field",
    role = "radio",
    disabled = false,
    className = "",
}: SegmentedControlProps<T>) {
    const isTab = role === "tab";
    const gridStyle: CSSProperties | undefined = variant === "tabs" ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined;

    return (
        <div role={isTab ? "tablist" : "radiogroup"} aria-label={ariaLabel} className={`${CONTAINER_CLASS[variant]} ${className}`.trim()} style={gridStyle}>
            {options.map((option) => {
                const isSelected = option.value === value;
                const stateClass = isSelected ? (option.activeClassName ?? ACTIVE_CLASS[variant]) : INACTIVE_CLASS[variant];

                return (
                    <button
                        key={option.value}
                        type="button"
                        role={role}
                        {...(isTab ? { "aria-selected": isSelected } : { "aria-checked": isSelected })}
                        title={option.title}
                        disabled={disabled || option.disabled}
                        onClick={() => onChange(option.value)}
                        className={`${ITEM_CLASS[variant]} transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${stateClass}`}
                        style={isSelected ? option.activeStyle : option.inactiveStyle}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
