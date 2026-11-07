import { useState } from "react";
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
    const scale = Math.max(budgeted, projected, income);
    const budgetedShare = income > 0 ? Math.round((budgeted / income) * 100) : null;

    const isShort = unbudgetedIncome < 0;
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const rows = [
        { key: "spent", label: "Gasto", value: spent, valueClassName: "text-white", bar: spent, barClassName: spent > budgeted ? "bg-rose-400" : "bg-white" },
        { key: "forecast", label: "Previsto", value: projected - spent, valueClassName: "text-white/70", bar: projected - spent, barClassName: isOver ? "bg-rose-400/40" : "bg-white/30" },
        { key: "unused", label: isOver ? "Excedido" : "Não usado", value: Math.abs(available), valueClassName: isOver ? "text-rose-300" : "text-white/85", bar: Math.max(0, available), barClassName: "bg-white/[0.12]" },
        { key: "free", label: isShort ? "Tetos acima da receita" : "Livre", value: Math.abs(unbudgetedIncome), valueClassName: isShort ? "text-rose-300" : "text-emerald-300", bar: Math.max(0, income - Math.max(budgeted, projected)), barClassName: "bg-emerald-400/70" },
    ];
    const dimClass = (key: string) => (activeKey && activeKey !== key ? "opacity-30" : "opacity-100");

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
                    <p className="text-[11px] text-white/45">Receitas do mês</p>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight text-white">{formatReportCurrency(income)}</p>
                </div>
                <p className="shrink-0 pb-1 text-right text-xs tabular-nums text-white/45">
                    <span className="font-medium text-white/80">{formatReportCurrency(budgeted)}</span> em tetos
                    <span className={`block ${isShort ? "text-rose-300" : ""}`}>{budgetedShare === null ? "sem receitas" : `${budgetedShare}% da receita`}</span>
                </p>
            </div>

            <div className="relative mt-4" onMouseLeave={() => setActiveKey(null)}>
                <div className="flex h-2 gap-px overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={budgeted} aria-valuenow={spent} aria-label="Uso total dos orçamentos">
                    {rows.map((row) =>
                        row.bar > 0 ? (
                            <span
                                key={row.key}
                                onMouseEnter={() => setActiveKey(row.key)}
                                className={`h-full shrink-0 transition-opacity duration-150 ${row.barClassName} ${dimClass(row.key)}`}
                                style={{ width: percentOf(row.bar, scale) }}
                            />
                        ) : null,
                    )}
                </div>
                {scale > budgeted ? <span aria-hidden className="pointer-events-none absolute -inset-y-0.5 w-0.5 rounded-full bg-white/80" style={{ left: percentOf(budgeted, scale) }} title="Soma dos tetos" /> : null}
            </div>

            <dl className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5" onMouseLeave={() => setActiveKey(null)}>
                {rows.map((row) => (
                    <div
                        key={row.key}
                        tabIndex={0}
                        onMouseEnter={() => setActiveKey(row.key)}
                        onFocus={() => setActiveKey(row.key)}
                        onBlur={() => setActiveKey(null)}
                        className={`-mx-1.5 min-w-0 rounded-lg px-1.5 py-0.5 outline-none transition-opacity duration-150 focus-visible:ring-1 focus-visible:ring-white/30 ${dimClass(row.key)}`}
                    >
                        <dt className="flex items-center gap-1.5 truncate text-[11px] text-white/45">
                            <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.barClassName}`} />
                            {row.label}
                        </dt>
                        <dd className={`truncate text-sm font-medium tabular-nums ${row.valueClassName}`}>{formatReportCurrency(row.value)}</dd>
                    </div>
                ))}
            </dl>

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
