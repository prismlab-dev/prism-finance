import { motion } from "framer-motion";
import { formatReportCurrency } from "../planning/planningReportFormatting";
import { BUDGET_STATUS_STYLES } from "./budgetStatusStyles";
import type { BudgetProgress, BudgetsOverview } from "./budgetUtils";

function percentOf(value: number, scale: number): string {
    return `${scale > 0 ? Math.max(0, Math.min(100, (value / scale) * 100)) : 0}%`;
}

interface BudgetsOverviewPanelProps {
    overview: BudgetsOverview;
    nameOf: (budgetId: string) => string;
    colorOf: (progress: BudgetProgress) => string | null;
    onOpen: (budgetId: string) => void;
}

/** Soma dos tetos contra o gasto (pago/lançado) e o previsto (pendente), mais o gasto de cada orçamento. */
export function BudgetsOverviewPanel({ overview, nameOf, colorOf, onOpen }: BudgetsOverviewPanelProps) {
    const { budgeted, spent, projected, income } = overview;
    const unbudgetedIncome = income - budgeted;
    const available = budgeted - projected;
    const isOver = available < 0;
    const scale = Math.max(budgeted, projected);
    const usedPercent = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

    const stats = [
        { label: "Gasto", value: spent, className: "text-white" },
        { label: "Previsto", value: projected - spent, className: "text-white/60" },
        { label: isOver ? "Excedido" : "Livre", value: Math.abs(available), className: isOver ? "text-rose-300" : "text-emerald-300" },
    ];

    return (
        <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-surface p-5 lg:sticky lg:top-4 lg:w-[24%] lg:min-w-72 lg:shrink-0"
        >
            <span aria-hidden className={`pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full blur-3xl ${isOver ? "bg-rose-500/15" : "bg-emerald-400/10"}`} />

            <div className="relative flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-white">{formatReportCurrency(budgeted)}</p>
                    <p className="mt-1 truncate text-xs tabular-nums text-white/45">
                        <span className="font-medium text-white/80">{formatReportCurrency(spent)}</span> gastos
                    </p>
                </div>
                <span className={`text-sm font-medium tabular-nums ${spent > budgeted ? "text-rose-300" : "text-white/55"}`}>{usedPercent}%</span>
            </div>

            <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={budgeted} aria-valuenow={spent} aria-label="Uso total dos orçamentos">
                <div className={`absolute inset-y-0 left-0 rounded-full ${isOver ? "bg-rose-400/30" : "bg-white/20"}`} style={{ width: percentOf(projected, scale) }} />
                <div className={`absolute inset-y-0 left-0 rounded-full ${spent > budgeted ? "bg-rose-400" : "bg-white"}`} style={{ width: percentOf(spent, scale) }} />
                {scale > budgeted ? <span className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: percentOf(budgeted, scale) }} /> : null}
            </div>

            <dl className="relative mt-5 grid grid-cols-3 gap-2">
                {stats.map((stat) => (
                    <div key={stat.label} className="min-w-0 rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <dt className="text-[11px] text-white/40">{stat.label}</dt>
                        <dd className={`mt-0.5 truncate text-sm font-medium tabular-nums ${stat.className}`}>{formatReportCurrency(stat.value)}</dd>
                    </div>
                ))}
            </dl>

            <div className="relative mt-2 flex items-baseline justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                <span className="min-w-0 text-[11px] text-white/40">
                    {unbudgetedIncome >= 0 ? "Receitas fora dos orçamentos" : "Tetos acima das receitas"}
                    <span className="block truncate tabular-nums text-white/30">de {formatReportCurrency(income)} em receitas</span>
                </span>
                <span className={`shrink-0 text-sm font-medium tabular-nums ${unbudgetedIncome >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatReportCurrency(Math.abs(unbudgetedIncome))}</span>
            </div>

            <ul className="relative -mx-2 mt-5 border-t border-white/[0.06] pt-3">
                {overview.progresses.map((progress) => {
                    const { budget, spent, status } = progress;
                    const statusStyle = BUDGET_STATUS_STYLES[status];
                    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

                    return (
                        <li key={budget.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(budget.id)}
                                className="group w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none"
                            >
                                <span className="flex items-baseline justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorOf(progress) ?? "#ffffff66" }} />
                                        <span className="truncate text-[13px] text-white/80 group-hover:text-white">{nameOf(budget.id)}</span>
                                    </span>
                                    <span className={`shrink-0 text-[11px] tabular-nums ${status === "ok" ? "text-white/40" : statusStyle.textClassName}`}>{percent}%</span>
                                </span>
                                <span className="mt-1 flex items-baseline justify-between gap-3 pl-4 text-xs tabular-nums">
                                    <span className="font-medium text-white">{formatReportCurrency(spent)}</span>
                                    <span className="text-white/35">de {formatReportCurrency(budget.amount)}</span>
                                </span>
                                <span className="mt-1.5 ml-4 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                    <span className={`block h-full rounded-full ${statusStyle.barClassName}`} style={{ width: percentOf(spent, budget.amount) }} />
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </motion.aside>
    );
}
