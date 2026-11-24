import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { TeamExpenseEntry } from "../../../context/teamTypes";
import { MonthPickerControl } from "../../common/MonthPickerControl";
import { formatReportCurrency } from "../planning/planningReportFormatting";
import { formatMonthLabel, shiftMonth } from "../transactions/transactionsPageShared";

export type TeamTransactionsTab = "income" | "spending";

const TYPE_CHIPS = [
    { key: "income" as const, label: "Receitas", icon: ArrowUpRight, active: "border-emerald-300/45 bg-emerald-500/18 text-emerald-100" },
    { key: "spending" as const, label: "Despesas", icon: ArrowDownRight, active: "border-red-300/45 bg-red-500/18 text-red-100" },
];

interface TeamSpendingSummaryProps {
    /** Lançamentos do mês já filtrados pela aba. */
    entries: TeamExpenseEntry[];
    activeTab: TeamTransactionsTab;
    onTabChange: (tab: TeamTransactionsTab) => void;
    selectedMonth: string;
    onMonthChange: (month: string) => void;
    nameOf: (memberId: string) => string;
}

/** Painel lateral no formato do de transações: aba, mês, total e quanto passou por cada membro. */
export function TeamSpendingSummary({ entries, activeTab, onTabChange, selectedMonth, onMonthChange, nameOf }: TeamSpendingSummaryProps) {
    const isIncome = activeTab === "income";
    const counted = entries.filter((entry) => entry.kind !== "settlement");
    const total = counted.reduce((sum, entry) => sum + entry.amount, 0);
    const byMember = [...counted.reduce((acc, entry) => acc.set(entry.payerId, (acc.get(entry.payerId) ?? 0) + entry.amount), new Map<string, number>())]
        .sort((a, b) => b[1] - a[1]);

    return (
        <article className="relative overflow-hidden rounded-2xl finance-surface p-4">
            <div className={`pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full blur-3xl ${isIncome ? "bg-emerald-400/10" : "bg-red-400/10"}`} />

            <div className="relative grid grid-cols-2 gap-1.5">
                {TYPE_CHIPS.map((chip) => {
                    const Icon = chip.icon;
                    const isActive = activeTab === chip.key;
                    return (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => onTabChange(chip.key)}
                            aria-pressed={isActive}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 transition-all ${
                                isActive ? chip.active : "border-white/[0.09] bg-white/[0.02] text-white/60 hover:border-white/[0.2] hover:bg-white/[0.05]"
                            }`}
                        >
                            <Icon size={15} strokeWidth={2.2} />
                            <span className="truncate text-[10px] uppercase tracking-[0.04em]">{chip.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="relative mt-3.5 border-y border-white/[0.06] py-2.5">
                <MonthPickerControl selectedMonth={selectedMonth} onMonthChange={onMonthChange} formatMonthLabel={formatMonthLabel} shiftMonth={shiftMonth} />
            </div>

            <div className="relative mt-3.5">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">{isIncome ? "Quanto recebemos" : "Quanto gastamos"}</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/60">{counted.length}</span>
                </div>
                <p className={`mt-1 text-xl font-semibold tracking-wide ${isIncome ? "text-emerald-200" : "text-red-200"}`}>{formatReportCurrency(total)}</p>
            </div>

            {byMember.length > 0 ? (
                <ul className="relative mt-3.5 flex flex-col gap-2.5">
                    {byMember.map(([memberId, amount]) => (
                        <li key={memberId}>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                                <span className="truncate">{isIncome ? "Recebido por" : "Pago por"} {nameOf(memberId)}</span>
                                <span className="tabular-nums text-white/75">{formatReportCurrency(amount)}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className={`h-full rounded-full ${isIncome ? "bg-emerald-300/60" : "bg-red-300/60"}`} style={{ width: `${total ? (amount / total) * 100 : 0}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </article>
    );
}
