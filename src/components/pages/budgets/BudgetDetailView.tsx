import { ArrowLeft, Layers, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { type Transaction, useFinanceCreditCardInvoices, useFinanceCreditCards, useFinanceWallets } from "../../../context/FinanceContext";
import { getMonthKeyFromDateValue, parseCreditCardInvoiceId, resolveCreditCardInvoiceCycle } from "../../../context/financeTypes";
import { usePage } from "../../../context/PageContext";
import { getCategoryIconComponent } from "../../../lib/categoryIcons";
import { PlanningReportsPanel } from "../planning/PlanningReportsPanel";
import { BudgetDetailHero } from "./BudgetDetailHero";
import { BudgetEntriesTimeline } from "./BudgetEntriesTimeline";
import { BudgetHistoryChart } from "./BudgetHistoryChart";
import { BudgetsToolbar } from "./BudgetsToolbar";
import type { BudgetProgress } from "./budgetUtils";
import { IconButton } from "../../ui/IconButton";
import { EmptyState } from "../../ui/EmptyState";

interface BudgetDetailViewProps {
    progress: BudgetProgress;
    name: string;
    iconName: string;
    color: string | null;
    monthKey: string;
    onMonthChange: (monthKey: string) => void;
    budgetNameById: Map<string, string>;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

/** Fração do mês corrente já decorrida; só usada quando há `dailyAllowance` (mês corrente). */
function currentMonthPace(): number {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() / daysInMonth;
}

/** Subpágina de um orçamento: faixa do mês, transações por dia e histórico contra o teto. */
export function BudgetDetailView({ progress, name, iconName, color, monthKey, onMonthChange, budgetNameById, onBack, onEdit, onDelete }: BudgetDetailViewProps) {
    const { goToPage } = usePage();
    const wallets = useFinanceWallets();
    const creditCards = useFinanceCreditCards();
    const creditCardInvoices = useFinanceCreditCardInvoices();
    const { budget, history, entries, sharedCount, dailyAllowance } = progress;
    const Icon = getCategoryIconComponent(iconName, "expense");
    const paceRatio = dailyAllowance !== null ? currentMonthPace() : undefined;

    const sourceNameById = useMemo(
        () => new Map<string, string>([...wallets.map((wallet) => [wallet.id, wallet.name] as const), ...creditCards.map((card) => [card.id, card.name] as const)]),
        [creditCards, wallets],
    );
    const resolveSourceLabel = (transaction: Transaction) =>
        sourceNameById.get(transaction.paymentMethod === "credit_card" ? (transaction.creditCardId ?? "") : transaction.inWallet) ?? null;

    const openTransaction = (transaction: Transaction) => {
        // Gasto no cartão não aparece em Transações: ele vive na fatura.
        const card = transaction.paymentMethod === "credit_card" ? creditCards.find((item) => item.id === transaction.creditCardId) : undefined;
        if (card) {
            const dueDate = creditCardInvoices.find((invoice) => invoice.id === transaction.invoiceId)?.dueDate;
            const selectedMonth = dueDate
                ? getMonthKeyFromDateValue(dueDate)
                : (parseCreditCardInvoiceId(transaction.invoiceId ?? "")?.cycleKey ?? resolveCreditCardInvoiceCycle(transaction.date, card.closingDay, card.dueDay).cycleKey);
            goToPage("statement", { page: "statement", selectedCardId: card.id, selectedMonth, highlightTransactionId: transaction.id });
            return;
        }
        goToPage("transactions", {
            page: "transactions",
            tab: "spending",
            selectedMonth: getMonthKeyFromDateValue(transaction.date),
            targetTransactionId: transaction.id,
        });
    };

    return (
        <div className="flex min-h-full flex-col gap-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <IconButton variant="ghost" size="lg" type="button" onClick={onBack} aria-label="Voltar para orçamentos">
                        <ArrowLeft size={18} />
                    </IconButton>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: color ?? "#e5e5e5", backgroundColor: `${color ?? "#ffffff"}1f` }}>
                        <Icon size={17} />
                    </span>
                    <h1 className="min-w-0 truncate pl-1 text-xl font-semibold tracking-tight text-white">{name}</h1>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="min-w-0 flex-1 sm:flex-none">
                        <BudgetsToolbar monthKey={monthKey} onMonthChange={onMonthChange} />
                    </div>
                    <IconButton variant="outline" size="lg" shape="square" type="button" onClick={onEdit} aria-label="Editar orçamento" title="Editar">
                        <Pencil size={15} />
                    </IconButton>
                    <IconButton variant="outline" size="lg" shape="square" className="hover:text-red-300!" onClick={onDelete} aria-label="Excluir orçamento" title="Excluir">
                        <Trash2 size={15} />
                    </IconButton>
                </div>
            </header>

            <BudgetDetailHero progress={progress} color={color} paceRatio={paceRatio} />

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <PlanningReportsPanel
                    title="Transações"
                    aside={
                        sharedCount > 0 ? (
                            <span className="flex items-center gap-1.5 text-xs text-amber-200/75">
                                <Layers size={12} className="shrink-0" />
                                {sharedCount} também em outro orçamento
                            </span>
                        ) : undefined
                    }
                >
                    {entries.length === 0 ? (
                        <EmptyState variant="soft" size="lg">Nenhuma despesa entrou neste orçamento no mês.</EmptyState>
                    ) : (
                        <BudgetEntriesTimeline entries={entries} cap={budget.amount} color={color} resolveSourceLabel={resolveSourceLabel} budgetNameById={budgetNameById} onOpenTransaction={openTransaction} />
                    )}
                </PlanningReportsPanel>

                <div className="lg:sticky lg:top-4">
                    <BudgetHistoryChart history={history} cap={budget.amount} color={color} />
                </div>
            </div>
        </div>
    );
}
