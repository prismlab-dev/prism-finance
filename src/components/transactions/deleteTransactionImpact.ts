import { useFinanceStoredTransactions, useFinanceTransactionGroups, useFinanceWallets, type Transaction, type TransactionGroup, type TransactionSeriesScope, type Wallet } from "../../context/FinanceContext";
import type { StoredTransaction } from "../../context/financeTypes";
import { resolveTransactionCreditCardId, resolveTransactionDestinationWalletId, resolveTransactionSourceWalletId } from "../../context/finance/transactionResolution";
import { roundToCents } from "../../context/finance/helpers";
import { formatCurrencyBRL } from "./transactionView";

interface DeleteTransactionImpactPreview {
    paidTransactionsCount: number;
    balanceDelta: number;
    consequences: string[];
}

function normalizeScope(scope: TransactionSeriesScope | null | undefined): TransactionSeriesScope {
    if (scope === "all" || scope === "this_and_next") {
        return scope;
    }

    return "single";
}

function getInstallmentOrderValue(transaction: Pick<StoredTransaction, "installmentNumber">): number {
    const installmentNumber = transaction.installmentNumber;
    return Number.isInteger(installmentNumber) && Number(installmentNumber) > 0 ? Number(installmentNumber) : Number.MAX_SAFE_INTEGER;
}

function compareTransactionsWithinSeries(a: StoredTransaction, b: StoredTransaction, transactionMode: TransactionGroup["transactionMode"] | null | undefined): number {
    if (transactionMode === "installment") {
        const installmentComparison = getInstallmentOrderValue(a) - getInstallmentOrderValue(b);
        if (installmentComparison !== 0) {
            return installmentComparison;
        }

        if (a.createdAt === b.createdAt) {
            return a.id.localeCompare(b.id);
        }

        return a.createdAt.localeCompare(b.createdAt);
    }

    if (a.scheduledDate === b.scheduledDate) {
        return a.id.localeCompare(b.id);
    }

    return a.scheduledDate.localeCompare(b.scheduledDate);
}

function isTransactionAtOrAfterSeriesAnchor(candidate: StoredTransaction, anchor: StoredTransaction, transactionMode: TransactionGroup["transactionMode"] | null | undefined): boolean {
    if (transactionMode === "installment") {
        return getInstallmentOrderValue(candidate) >= getInstallmentOrderValue(anchor);
    }

    return candidate.scheduledDate.localeCompare(anchor.scheduledDate) >= 0;
}

function resolveWalletImpactDelta(transaction: StoredTransaction, group: TransactionGroup | null, walletsById: Map<string, Wallet>): number {
    if (transaction.status !== "paid" || !group) {
        return 0;
    }

    const amount = roundToCents(Math.abs(transaction.amount));
    const sourceWallet = walletsById.get(resolveTransactionSourceWalletId(transaction, group) ?? "") ?? null;
    const destinationWallet = walletsById.get(resolveTransactionDestinationWalletId(transaction, group) ?? "") ?? null;
    const hasCreditCard = Boolean(resolveTransactionCreditCardId(transaction, group));

    if (group.type === "income") {
        return sourceWallet?.includeInMainTotals ? -amount : 0;
    }

    if (group.type === "expense") {
        if (hasCreditCard) {
            return 0;
        }

        return sourceWallet?.includeInMainTotals ? amount : 0;
    }

    let delta = 0;

    if (sourceWallet?.includeInMainTotals) {
        delta += amount;
    }

    if (destinationWallet?.includeInMainTotals && destinationWallet.id !== sourceWallet?.id) {
        delta -= amount;
    }

    return roundToCents(delta);
}

function buildTargetTransactions(transaction: Transaction, scope: TransactionSeriesScope, storedTransactions: StoredTransaction[], groups: TransactionGroup[]): StoredTransaction[] {
    const transactionToDelete = storedTransactions.find((item) => item.id === transaction.id);
    if (!transactionToDelete) {
        return [];
    }

    const normalizedScope = normalizeScope(scope);
    const group = groups.find((item) => item.id === transactionToDelete.groupId) ?? null;
    const groupTransactions = storedTransactions
        .filter((item) => item.groupId === transactionToDelete.groupId)
        .sort((a, b) => compareTransactionsWithinSeries(a, b, group?.transactionMode));

    if (!group || normalizedScope === "single") {
        return [transactionToDelete];
    }

    if (normalizedScope === "all") {
        return groupTransactions;
    }

    return groupTransactions.filter((item) => isTransactionAtOrAfterSeriesAnchor(item, transactionToDelete, group.transactionMode));
}

export function buildDeleteTransactionImpactPreview(params: {
    transaction: Transaction | null | undefined;
    scope: TransactionSeriesScope | null | undefined;
    storedTransactions: StoredTransaction[];
    transactionGroups: TransactionGroup[];
    wallets: Wallet[];
}): DeleteTransactionImpactPreview {
    const { transaction, scope, storedTransactions, transactionGroups, wallets } = params;

    if (!transaction) {
        return {
            paidTransactionsCount: 0,
            balanceDelta: 0,
            consequences: [],
        };
    }

    const targetTransactions = buildTargetTransactions(transaction, normalizeScope(scope), storedTransactions, transactionGroups);
    const walletsById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const groupsById = new Map(transactionGroups.map((group) => [group.id, group]));
    // Recurring series deletion preserves paid history; an individual deletion or
    // a whole installment purchase reverses settled wallet movements.
    const isInstallment = groupsById.get(transaction.groupId)?.transactionMode === "installment";
    const paidTransactions = normalizeScope(scope) === "single" || isInstallment ? targetTransactions.filter((item) => item.status === "paid") : [];
    const balanceDelta = roundToCents(
        paidTransactions.reduce((sum, item) => sum + resolveWalletImpactDelta(item, groupsById.get(item.groupId) ?? null, walletsById), 0),
    );

    if (paidTransactions.length < 1) {
        return {
            paidTransactionsCount: 0,
            balanceDelta: 0,
            consequences: [],
        };
    }

    const paidTransactionsLabel = paidTransactions.length === 1 ? "transação já paga" : "transações já pagas";
    const balanceLabel =
        balanceDelta > 0
            ? `Seu saldo atual aumentará em R$ ${formatCurrencyBRL(balanceDelta)}.`
            : balanceDelta < 0
              ? `Seu saldo atual diminuirá em R$ ${formatCurrencyBRL(Math.abs(balanceDelta))}.`
              : "Seu saldo atual não será alterado.";

    return {
        paidTransactionsCount: paidTransactions.length,
        balanceDelta,
        consequences: [`Essa ação irá alterar ${paidTransactions.length} ${paidTransactionsLabel}.`, balanceLabel],
    };
}

export function useDeleteTransactionImpactData() {
    const storedTransactions = useFinanceStoredTransactions();
    const transactionGroups = useFinanceTransactionGroups();
    const wallets = useFinanceWallets();

    return {
        storedTransactions,
        transactionGroups,
        wallets,
    };
}
