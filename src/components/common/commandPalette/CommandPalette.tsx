import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { normalizeComparisonText } from "../../../context/finance/helpers";
import { usePage } from "../../../context/PageContext";
import { OPEN_COMMAND_PALETTE_EVENT } from "./openCommandPalette";
import { rankCommandItems } from "./rankCommandItems";
import { useCommandItems, type CommandItem } from "./useCommandItems";

const MAX_RESULTS = 40;
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const AMOUNT_TONE = { income: "text-emerald-300", spending: "text-white/80", neutral: "text-white/50" } as const;

// Cada tipo de resultado é uma faixa do espectro: a cor diz o que o item é.
const GROUP_HUE: Record<string, string> = {
    Páginas: "#e4e4e7",
    Transações: "#7dd3fc",
    Faturas: "#a78bfa",
    Cartões: "#e879f9",
    Carteiras: "#6ee7b7",
    Orçamentos: "#fcd34d",
    Projeções: "#67e8f9",
    "Lista de desejos": "#fda4af",
    Categorias: "#bef264",
    Beneficiários: "#fdba74",
    Tags: "#a5b4fc",
};
// Única cor de destaque do modal: marca o trecho que coincide com a busca.
const MATCH_COLOR = "#fcd34d";
const SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";

export function CommandPalette() {
    const { goToPage } = usePage();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const listRef = useRef<HTMLDivElement | null>(null);
    const items = useCommandItems(isOpen);

    useEffect(() => {
        function handleShortcut(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setIsOpen((current) => !current);
                setQuery("");
                setActiveIndex(0);
            }
        }

        function handleOpenRequest() {
            setIsOpen(true);
            setQuery("");
            setActiveIndex(0);
        }

        document.addEventListener("keydown", handleShortcut);
        window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenRequest);
        return () => {
            document.removeEventListener("keydown", handleShortcut);
            window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenRequest);
        };
    }, []);

    // Sem busca: só as páginas. Com busca, grupos aparecem na ordem do seu melhor resultado.
    const results = useMemo(() => {
        if (!query.trim()) {
            return items.filter((item) => item.group === "Páginas");
        }
        const ranked = rankCommandItems(items, query, MAX_RESULTS);
        const groupOrder = [...new Set(ranked.map((item) => item.group))];
        return ranked.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
    }, [items, query]);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    if (!isOpen) {
        return null;
    }

    function open(item: CommandItem | undefined) {
        if (!item) {
            return;
        }
        if (item.target.path) {
            navigate(item.target.path);
        } else {
            goToPage(item.target.page, item.target.intent);
        }
        setIsOpen(false);
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((current) => Math.min(current + 1, results.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
        } else if (event.key === "Enter") {
            open(results[activeIndex]);
        } else if (event.key === "Escape") {
            setIsOpen(false);
        }
    }

    const activeItem = results[activeIndex];

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[9vh] backdrop-blur-[2px]" onMouseDown={() => setIsOpen(false)}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Busca global"
                onMouseDown={(event) => event.stopPropagation()}
                style={{
                    borderColor: "rgba(255,255,255,0.09)",
                    backgroundImage: "radial-gradient(90% 55% at 0% 0%, rgba(255,255,255,0.05), transparent 65%)",
                }}
                className="command-palette-in relative flex max-h-[min(580px,78vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-[18px] border bg-[#161618] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_40px_100px_-30px_rgba(0,0,0,0.95)] transition-[border-color,background-image] duration-300 motion-reduce:transition-none"
            >

                <label className="flex h-16 shrink-0 items-center gap-3 px-5">
                    <Search size={20} className="shrink-0 text-white/60" />
                    <input
                        autoFocus
                        type="search"
                        role="combobox"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Pesquise qualquer coisa"
                        aria-expanded="true"
                        aria-controls="command-palette-results"
                        aria-activedescendant={results[activeIndex] ? `command-${results[activeIndex].id}` : undefined}
                        className="min-w-0 flex-1 bg-transparent text-[17px] font-medium tracking-[-0.01em] text-white outline-none placeholder:text-white/30 [&::-webkit-search-cancel-button]:hidden"
                    />
                </label>

                <div ref={listRef} id="command-palette-results" role="listbox"
                    className="command-palette-scroll mx-2 mb-2 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#111111] p-1.5">
                    {results.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                            <p className="text-sm text-white/70">Nada encontrado para “{query.trim()}”.</p>
                            <p className="mt-1 text-xs text-white/35">Tente o nome de uma carteira, cartão, categoria ou parte da descrição.</p>
                        </div>
                    ) : (
                        results.map((item, index) => {
                            const hue = GROUP_HUE[item.group] ?? GROUP_HUE.Páginas;
                            const isActive = index === activeIndex;
                            return (
                                <button
                                    key={item.id}
                                    id={`command-${item.id}`}
                                    type="button"
                                    role="option"
                                    data-index={index}
                                    aria-selected={isActive}
                                    onMouseMove={() => setActiveIndex(index)}
                                    onClick={() => open(item)}
                                    className={`group/item relative flex w-full items-center gap-3 rounded-[10px] py-1.5 pl-3 pr-3 text-left text-sm transition-colors duration-150 ${
                                        isActive ? "bg-white/[0.06]" : ""
                                    }`}
                                >
                                    <span
                                        aria-hidden
                                        className={`absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-white/70 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {item.media ? (
                                        <span className="flex size-9 shrink-0">{item.media}</span>
                                    ) : (
                                        <span
                                            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 [&_svg]:size-[19px]"
                                            style={{
                                                color: item.color ?? hue,
                                                background: isActive ? `color-mix(in srgb, ${item.color ?? hue} 18%, transparent)` : "transparent",
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                    )}
                                    <span className={`min-w-0 flex-1 truncate font-medium transition-colors ${isActive ? "text-white" : "text-neutral-300"}`}>
                                        <HighlightedLabel label={item.label} query={query} />
                                    </span>
                                    <span className="flex max-w-[45%] shrink-0 flex-col items-end leading-tight">
                                        {item.amount ? (
                                            <span className={`text-sm font-semibold tabular-nums ${AMOUNT_TONE[item.amount.tone]}`}>
                                                {item.amount.tone === "income" ? "+" : item.amount.tone === "spending" ? "−" : ""}
                                                {currencyFormatter.format(item.amount.value)}
                                            </span>
                                        ) : null}
                                        <span className={`max-w-full truncate text-neutral-500 ${item.amount ? "mt-0.5 text-[11px]" : "text-xs"}`}>{item.hint || item.group}</span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="hidden shrink-0 items-center gap-4 px-5 pb-3.5 pt-1.5 text-xs text-neutral-500 sm:flex">
                    {activeItem ? (
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                            <Keycap>Enter</Keycap>
                            <span className="truncate">
                                abre <span className="font-medium ml-1 text-neutral-200">{activeItem.label}</span>
                            </span>
                        </span>
                    ) : (
                        <span className="flex-1">{SHORTCUT_LABEL} abre de qualquer tela</span>
                    )}
                    <span className="flex shrink-0 items-center gap-1.5">
                        <Keycap>↑</Keycap>
                        <Keycap>↓</Keycap>
                        <span className="mr-2">navegar</span>
                        <Keycap>Esc</Keycap>
                        <span>fechar</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

/** Destaca o trecho buscado; sem destaque quando acentos mudam o tamanho do texto normalizado. */
function HighlightedLabel({ label, query }: { label: string; query: string }) {
    const needle = normalizeComparisonText(query.trim());
    const haystack = normalizeComparisonText(label);
    const start = needle ? haystack.indexOf(needle) : -1;
    if (start < 0 || haystack.length !== label.length) {
        return <>{label}</>;
    }
    return (
        <>
            {label.slice(0, start)}
            <span style={{ color: MATCH_COLOR }} className="underline decoration-current/40 underline-offset-[3px]">{label.slice(start, start + needle.length)}</span>
            {label.slice(start + needle.length)}
        </>
    );
}

function Keycap({ children }: { children: string }) {
    return (
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/[0.1] border-b-white/[0.04] bg-[#1d1d20] px-1.5 font-sans text-[11px] font-medium text-neutral-300 shadow-[0_2px_0_#0b0b0c,inset_0_1px_0_rgba(255,255,255,0.06)]">
            {children}
        </kbd>
    );
}
