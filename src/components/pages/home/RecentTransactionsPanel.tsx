import { useMemo } from "react";
import { type Transaction, useFinanceTransactionGroups } from "../../../context/FinanceContext";
import { parseAppDate } from "../../../lib/localDate";
import { transactionSettlementDate } from "../../../lib/transactionSettlementDate";
import { type InstallmentSummary, MiniTransactionBlock } from "./SmTransactionBlock";
import { usePage } from "../../../context/PageContext";

interface RecentTransactionsPanelProps {
    transactions: Transaction[];
}

export function dayLabel(date: Date | null) {
    if (!date) return "Sem data";
    const today = new Date();
    const startOf = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }).replace(".", "");
}

export function RecentTransactionsPanel({ transactions }: RecentTransactionsPanelProps) {
    const { goToPage } = usePage();
    const transactionGroups = useFinanceTransactionGroups();
    const installmentGroups = useMemo(
        () => new Map(transactionGroups.filter((group) => group.transactionMode === "installment" && (group.installmentCount ?? 0) >= 2).map((group) => [group.id, group])),
        [transactionGroups],
    );
    const recentPaidTransactions = useMemo(() => {
        const now = Date.now();
        // Wallet: paid movements. Card: purchases already made (not projected/future), whatever the invoice status.
        // Invoice payments only show as the wallet spending; non-cash closes are skipped.
        const movementDate = (transaction: Transaction) =>
            transaction.paymentMethod === "credit_card" ? parseAppDate(transaction.date) : transactionSettlementDate(transaction);
        return transactions
            .filter((transaction) => {
                if (transaction.isNonCashSettlement) return false;
                if (transaction.paymentMethod !== "credit_card") return transaction.status === "paid";
                const date = parseAppDate(transaction.date);
                return !transaction.isProjected && transaction.status !== "cancelled" && transaction.status !== "skipped" && !!date && date.getTime() <= now;
            })
            .sort((a, b) => (movementDate(b)?.getTime() ?? 0) - (movementDate(a)?.getTime() ?? 0))
            // Compra parcelada vira uma linha só, na parcela mais recente (a lista já está ordenada).
            .filter((transaction, index, list) => {
                const group = installmentGroups.get(transaction.groupId);
                return !group || list.findIndex((item) => item.groupId === transaction.groupId) === index;
            })
            .slice(0, 6)
            .map((transaction) => ({ transaction, date: movementDate(transaction) }));
    }, [transactions, installmentGroups]);

    const groups = useMemo(() => {
        const result: { label: string; items: { transaction: Transaction; installment?: InstallmentSummary }[] }[] = [];
        for (const { transaction, date } of recentPaidTransactions) {
            const label = dayLabel(date);
            const group = installmentGroups.get(transaction.groupId);
            const item = {
                transaction,
                installment: group && transaction.installmentNumber ? { number: transaction.installmentNumber, count: group.installmentCount ?? 0, total: group.totalAmount } : undefined,
            };
            const last = result[result.length - 1];
            if (last?.label === label) last.items.push(item);
            else result.push({ label, items: [item] });
        }
        return result;
    }, [recentPaidTransactions, installmentGroups]);

    return (
        <section className="rounded-2xl border border-white/[0.08] bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-lg font-medium text-white">Movimentações recentes</p>
                <button
                    type="button"
                    onClick={() => goToPage("transactions")}
                    className="rounded-full px-2.5 py-1 text-sm text-neutral-400 outline-none transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                    Ver todas
                </button>
            </div>

            {groups.length === 0 ? (
                <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-6 text-center text-sm text-neutral-400">Nenhuma movimentação registrada</p>
            ) : (
                <ol className="relative">
                    {groups.map((group, index) => {
                        const isLast = index === groups.length - 1;
                        return (
                            <li key={group.label} className="relative pl-6">
                                {!isLast && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-white/[0.08]" />}
                                <span
                                    className={`absolute left-0 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-surface ${index === 0 ? "bg-white" : "bg-neutral-600"}`}
                                />
                                <p className={`pl-2 text-sm first-letter:uppercase ${index === 0 ? "font-medium text-white" : "text-neutral-400"}`}>{group.label}</p>
                                <div className={`mt-1 ${isLast ? "" : "pb-4"}`}>
                                    {group.items.map(({ transaction, installment }) => (
                                        <MiniTransactionBlock key={installment ? transaction.groupId : transaction.id} transaction={transaction} installment={installment} />
                                    ))}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
