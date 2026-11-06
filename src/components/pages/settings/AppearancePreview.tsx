import { ArrowLeftRight, FileText, Hexagon, Home, PiggyBank, Search, TrendingUp } from "lucide-react";
import type { LayoutId, ThemeId } from "../../../lib/appearance";

// Miniatura do app: monta a tela em 1200×750 com as mesmas classes do header/sidebar reais e reduz com scale.
// O data-theme na raiz faz as variáveis do tema valerem só aqui dentro, então as cores são as do tema de verdade.

const NAV_ITEMS = [
    { label: "Início", icon: Home },
    { label: "Transações", icon: ArrowLeftRight },
    { label: "Faturas", icon: FileText },
    { label: "Planejamento", icon: TrendingUp },
    { label: "Orçamentos", icon: PiggyBank },
];

const METRICS = [
    { label: "Saldo atual", amount: "R$ 4218.90", className: "text-emerald-300" },
    { label: "Receitas do mês", amount: "R$ 6200.00", className: "text-white/85" },
    { label: "Despesas do mês", amount: "R$ 1981.10", className: "text-white/85" },
    { label: "Faturas abertas", amount: "R$ 742.35", className: "text-white/85" },
];

function Brand() {
    return (
        <div className="flex items-center gap-2 font-medium text-white">
            <Hexagon size={25} />
            <span className="text-xl uppercase leading-none">Silus</span>
        </div>
    );
}

function Nav() {
    return (
        <div className="flex flex-col gap-1 p-[3px]">
            {NAV_ITEMS.map(({ label, icon: Icon }, index) => (
                <div
                    key={label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-[7px] text-[12.5px] font-medium tracking-[0.02em] ${index === 0 ? "bg-white/[0.15] text-white" : "text-neutral-600"}`}
                >
                    <Icon size={20} />
                    {label}
                </div>
            ))}
        </div>
    );
}

function Metrics() {
    return (
        <div className="flex items-center gap-0.5">
            {METRICS.map(({ label, amount, className }, index) => (
                <div key={label} className="flex items-center gap-0.5">
                    {index > 0 ? <div className="mx-0.5 h-5 w-px bg-white/[0.06]" /> : null}
                    <div className={`flex flex-col py-1.5 ${index === 0 ? "pl-2 pr-5" : "px-5"}`}>
                        <span className="whitespace-nowrap text-[12px] font-light uppercase tracking-[0.09em] text-white/40">{label}</span>
                        <span className={`whitespace-nowrap text-[15px] ${className}`} style={{ fontFamily: "'Azeret Mono', monospace" }}>
                            {amount}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function HeaderActions() {
    return (
        <div className="ml-auto flex items-center gap-3">
            <div className="flex h-9 w-56 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 text-white/40">
                <Search size={15} />
                <span className="text-[12px]">Buscar</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/[0.12]" />
        </div>
    );
}

function Content() {
    return (
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-surface p-4">
                <p className="text-sm text-white">Balanço mensal</p>
                <div className="mt-4 flex h-56 items-end gap-3">
                    {[46, 70, 58, 88, 64, 96].map((height, index) => (
                        <div key={index} className="flex h-full flex-1 items-end gap-1">
                            <div className="flex-1 rounded-t bg-emerald-400/70" style={{ height: `${height}%` }} />
                            <div className="flex-1 rounded-t bg-rose-400/60" style={{ height: `${height * 0.55}%` }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-surface p-4">
                <p className="text-sm text-white">Próximos</p>
                {["Aluguel", "Internet", "Cartão"].map((label) => (
                    <div key={label} className="mt-3 flex items-center justify-between text-[12px]">
                        <span className="text-neutral-400">{label}</span>
                        <span className="text-white/85">R$ 320.00</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClassicScreen() {
    return (
        <div className="flex h-full bg-canvas">
            <div className="w-[240px] shrink-0 bg-zinc-950/70 p-2">
                <div className="mt-2 px-2.5 pb-3 pt-1.5">
                    <Brand />
                </div>
                <div className="mx-2 mb-2 h-px bg-zinc-500/20" />
                <Nav />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="mx-2 mb-2.5 mt-2.5 flex items-center rounded-[18px] border border-white/[0.08] bg-zinc-950/70 px-3 py-2">
                    <Metrics />
                    <HeaderActions />
                </div>
                <div className="px-3">
                    <Content />
                </div>
            </div>
        </div>
    );
}

function LumenScreen() {
    return (
        <div className="flex h-full flex-col bg-zinc-950">
            <div className="flex items-center py-2 pr-3">
                <div className="pl-[18px] pr-6">
                    <Brand />
                </div>
                <div className="h-5 w-px bg-white/[0.06]" />
                <div className="flex min-w-0 flex-1 items-center pl-5">
                    <Metrics />
                    <HeaderActions />
                </div>
            </div>
            <div className="flex min-h-0 flex-1">
                <div className="w-[240px] shrink-0 p-2">
                    <Nav />
                </div>
                <div className="mb-2 mr-2 flex-1 rounded-xl bg-canvas px-2 pt-2">
                    <Content />
                </div>
            </div>
        </div>
    );
}

export function AppearancePreview({ layout, theme }: { layout: LayoutId; theme: ThemeId }) {
    return (
        <div aria-hidden className="pointer-events-none relative h-[120px] w-[192px] overflow-hidden rounded-lg ring-1 ring-white/[0.08]">
            <div data-theme={theme} className="absolute left-0 top-0 h-[750px] w-[1200px] origin-top-left scale-[0.16] select-none text-white">
                {layout === "classic" ? <ClassicScreen /> : <LumenScreen />}
            </div>
        </div>
    );
}
