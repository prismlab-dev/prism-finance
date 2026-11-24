import { HandCoins, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFinanceSession, useFinanceTransactionGroups, useFinanceTransactions } from "../../../context/FinanceContext";
import { useModal } from "../../../context/ModalContext";
import { buildTeamShareStatus } from "../../../context/team/teamShareStatus";
import type { TeamExpenseEntry, TeamSummary } from "../../../context/teamTypes";
import { removeTeamExpense } from "../../../supabase/team";
import { ConfirmActionModal } from "../../modal/ConfirmActionModal";
import { EditTransaction } from "../../modal/EditTransaction";
import { buildTransactionContextActions, type TransactionContextAction } from "../../transactions/transactionContextActions";
import { useTransactionContextActionHandler } from "../../transactions/useTransactionContextActionHandler";
import { getCurrentMonthKey } from "../transactions/transactionsPageShared";
import { TeamExpenseFormModal } from "./TeamExpenseFormModal";
import { TeamExpensesList } from "./TeamExpensesList";
import { TeamSettlementModal } from "./TeamSettlementModal";
import { TeamSpendingSummary, type TeamTransactionsTab } from "./TeamSpendingSummary";
import { TeamExpensesTableSkeleton } from "./TeamSkeletons";
import { useTeamExpenses } from "./useTeamExpenses";

export function TeamExpensesPage({ team }: { team: TeamSummary }) {
    const { user } = useFinanceSession();
    const transactions = useFinanceTransactions();
    const transactionGroups = useFinanceTransactionGroups();
    const handleTransactionAction = useTransactionContextActionHandler();
    const { openModal } = useModal();
    const { view, loading, error, refresh } = useTeamExpenses(team.id);
    const currentUserId = user?.uid ?? "";
    const canEdit = team.currentUserRole !== "viewer";
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
    const [activeTab, setActiveTab] = useState<TeamTransactionsTab>("spending");
    const isIncome = activeTab === "income";
    // Acertos antigos ficam com as despesas, de onde vieram.
    const monthExpenses = useMemo(
        () => view.expenses.filter((expense) => expense.date.startsWith(selectedMonth) && (expense.kind === "income") === isIncome),
        [isIncome, selectedMonth, view.expenses],
    );
    // Usa todas as despesas: um acerto deste mês pode quitar partes de meses anteriores.
    const shareStatus = useMemo(() => buildTeamShareStatus(view.expenses), [view.expenses]);
    const photoOf = useCallback(
        (memberId: string) => team.members.find((member) => member.uid === memberId)?.photoUrl ?? null,
        [team.members],
    );
    const nameOf = useCallback(
        (memberId: string) => team.members.find((member) => member.uid === memberId)?.displayName ?? "Ex-membro",
        [team.members],
    );
    const onSaved = () => void refresh();

    const openSettlement = (fromMemberId?: string, amount?: number) =>
        openModal(<TeamSettlementModal team={team} currentUserId={currentUserId} initialFromMemberId={fromMemberId} initialAmount={amount} onSaved={onSaved} />);

    const confirmRemove = (expense: TeamExpenseEntry) => openModal(
        <ConfirmActionModal
            title="Tirar da equipe?"
            description={`"${expense.title}" deixa de contar para a equipe. Continua nas finanças de ${nameOf(expense.payerId)}.`}
            confirmLabel="Tirar da equipe"
            onConfirm={async () => {
                await removeTeamExpense(team.id, expense.payerId, expense.groupId);
                await refresh();
            }}
        />,
    );

    // Só quem pagou tem a transação pessoal; os outros membros veem apenas a projeção.
    const personalTransactionOf = (expense: TeamExpenseEntry) =>
        expense.payerId === currentUserId ? transactions.find((item) => item.id === expense.transactionId) : undefined;

    const actionsFor = (expense: TeamExpenseEntry): TransactionContextAction[] => {
        const transaction = personalTransactionOf(expense);
        const removeAction: TransactionContextAction = { id: "remove_from_team", label: "Tirar da equipe" };
        if (!transaction) return canEdit && expense.kind !== "settlement" ? [removeAction] : [];
        const [open, ...rest] = buildTransactionContextActions({ transaction, group: transactionGroups.find((group) => group.id === transaction.groupId) })
            .filter((action) => action.id !== "select" && action.id !== "duplicate" && action.id !== "view_in_team");
        const viewInPersonal: TransactionContextAction = {
            id: "view_in_personal",
            label: transaction.paymentMethod === "credit_card" ? "Ver na minha fatura" : "Ver na minha carteira",
        };
        return [open, viewInPersonal, ...rest.filter((action) => action.tone !== "danger"), ...(expense.kind !== "settlement" ? [removeAction] : []), ...rest.filter((action) => action.tone === "danger")];
    };

    const handleAction = (expense: TeamExpenseEntry, action: TransactionContextAction) => {
        if (action.id === "remove_from_team") return confirmRemove(expense);
        // "Abrir" na equipe abre a despesa da equipe, não o formulário pessoal.
        if (action.id === "open") return handleOpen(expense);
        const transaction = personalTransactionOf(expense);
        if (transaction) handleTransactionAction(transaction, action);
    };

    const handleOpen = (expense: TeamExpenseEntry) => {
        const transaction = personalTransactionOf(expense);
        if (transaction && expense.kind !== "settlement") {
            openModal(
                <TeamExpenseFormModal
                    team={team}
                    onSaved={onSaved}
                    transaction={transaction}
                    teamStatus={expense.status}
                    shareStatus={shareStatus.get(expense.transactionId)}
                />,
            );
        }
        else if (transaction) openModal(<EditTransaction transaction={transaction} />);
    };

    return (
        <div className="finance-page w-full flex pb-4">
            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1 space-y-3">
                    {error ? <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}
                    {loading ? (
                        <TeamExpensesTableSkeleton />
                    ) : (
                        <TeamExpensesList
                            expenses={monthExpenses}
                            isIncome={isIncome}
                            shareStatus={shareStatus}
                            selectedMonth={selectedMonth}
                            nameOf={nameOf}
                            photoOf={photoOf}
                            actionsFor={actionsFor}
                            onAction={handleAction}
                            onOpen={handleOpen}
                        />
                    )}
                </div>
                <div className="flex w-full flex-col gap-2 lg:w-64 lg:shrink-0">
                    <TeamSpendingSummary entries={monthExpenses} activeTab={activeTab} onTabChange={setActiveTab} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} nameOf={nameOf} />
                    {canEdit ? (
                        <>
                            <button
                                type="button"
                                onClick={() => openModal(<TeamExpenseFormModal team={team} onSaved={onSaved} kind={isIncome ? "income" : "expense"} />)}
                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-emerald-100 transition-all hover:border-emerald-300/45 hover:bg-emerald-500/20"
                            >
                                <Plus size={14} /> {isIncome ? "Adicionar receita" : "Adicionar despesa"}
                            </button>
                            {isIncome ? null : (
                                <button
                                    type="button"
                                    onClick={() => openSettlement()}
                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.05em] text-white/70 transition-all hover:border-white/[0.22] hover:text-white"
                                >
                                    <HandCoins size={14} /> Registrar acerto
                                </button>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
