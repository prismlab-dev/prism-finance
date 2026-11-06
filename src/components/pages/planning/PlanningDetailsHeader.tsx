import { Plus } from "lucide-react";
import type { MonthProjection, PlanningPanel } from "./planningTimelineTypes";
import { formatCurrency } from "./planningTimelineUtils";

interface PlanningDetailsHeaderProps {
    title: string;
    monthLabel: string;
    panel: PlanningPanel;
    month: MonthProjection | null;
    onAddIncome?: () => void;
}

function getSummary(panel: PlanningPanel, month: MonthProjection): { total: number; ratio: number; barClassName: string; trackClassName?: string } {
    if (panel === "income") {
        return { total: month.activeIncome, ratio: month.originalIncome > 0 ? month.activeIncome / month.originalIncome : 0, barClassName: "bg-emerald-300/80" };
    }

    if (panel === "inherited_expenses") {
        return { total: month.activeInheritedExpenses, ratio: month.inheritedExpenses > 0 ? month.activeInheritedExpenses / month.inheritedExpenses : 0, barClassName: "bg-orange-300/80" };
    }

    const volume = month.simulatedIncome + month.simulatedExpenses;
    // Barra dividida: verde = entradas simuladas, laranja (fundo) = saídas simuladas.
    return { total: month.simulatedIncome - month.simulatedExpenses, ratio: volume > 0 ? month.simulatedIncome / volume : 0, barClassName: "bg-emerald-300/80", trackClassName: volume > 0 ? "bg-orange-300/60" : undefined };
}

export function PlanningDetailsHeader({ title, monthLabel, panel, month, onAddIncome }: PlanningDetailsHeaderProps) {
    const summary = month ? getSummary(panel, month) : null;

    return (
        <header className="shrink-0">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-medium text-white">{title}</h2>
                    <p className="text-xs capitalize text-white/45">{monthLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {summary ? <p className="text-lg font-semibold tabular-nums text-white">{formatCurrency(summary.total)}</p> : null}
                    {onAddIncome ? (
                        <button
                            type="button"
                            onClick={onAddIncome}
                            aria-label="Nova receita"
                            title="Nova receita"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-500/10 text-emerald-100 transition-colors hover:bg-emerald-500/16 focus-visible:outline-2 focus-visible:outline-emerald-300/60"
                        >
                            <Plus size={14} />
                        </button>
                    ) : null}
                </div>
            </div>

            {summary ? (
                <div className={`mt-3 h-1 w-full overflow-hidden rounded-full ${summary.trackClassName ?? "bg-white/[0.06]"}`} aria-hidden>
                    <div
                        className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${summary.barClassName}`}
                        style={{ width: `${Math.min(1, Math.max(0, summary.ratio)) * 100}%` }}
                    />
                </div>
            ) : null}
        </header>
    );
}
