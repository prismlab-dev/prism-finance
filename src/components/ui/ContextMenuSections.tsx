import type { LucideIcon } from "lucide-react";

export interface ContextMenuAction {
    id: string;
    label: string;
    tone?: string;
    disabled?: boolean;
}

export interface ContextMenuSectionsProps<A extends ContextMenuAction> {
    /** Grupos de ações; um separador é desenhado entre os grupos. */
    sections: ReadonlyArray<ReadonlyArray<A>>;
    onSelect: (action: A) => void;
    getIcon: (action: A) => LucideIcon;
    /** Classe extra do ícone (ex.: destacar um favorito já ativo). Padrão: cor conforme o `tone`. */
    getIconClassName?: (action: A) => string | undefined;
}

/** Itens de menu de contexto (role="menuitem") agrupados em seções. O contêiner e o posicionamento ficam com quem usa. */
export function ContextMenuSections<A extends ContextMenuAction>({ sections, onSelect, getIcon, getIconClassName }: ContextMenuSectionsProps<A>) {
    return (
        <>
            {sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`}>
                    {sectionIndex > 0 ? <div className="my-1.5 h-px bg-white/[0.08]" aria-hidden="true" /> : null}
                    {section.map((action) => {
                        const Icon = getIcon(action);
                        const danger = action.tone === "danger";

                        return (
                            <button
                                key={action.id}
                                type="button"
                                role="menuitem"
                                disabled={action.disabled}
                                onClick={() => {
                                    if (!action.disabled) {
                                        onSelect(action);
                                    }
                                }}
                                className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                    danger ? "text-red-300 hover:bg-red-500/10 hover:text-red-200" : "text-white/85 hover:bg-white/[0.06] hover:text-white"
                                }`}
                            >
                                <Icon size={16} className={getIconClassName?.(action) ?? (danger ? "text-red-300/90" : "text-white/90")} />
                                <span className="min-w-0 flex-1 truncate">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </>
    );
}
