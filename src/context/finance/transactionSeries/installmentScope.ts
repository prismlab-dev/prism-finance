import type { CreditCardInvoice, StoredTransaction, TransactionSeriesScope } from "../domainTypes";

export function isEditableInScope(transaction: StoredTransaction, selected: StoredTransaction, scope: TransactionSeriesScope, invoices: CreditCardInvoice[]): boolean {
    if (scope === "single") return transaction.id === selected.id;
    if (scope === "this_and_next" && (transaction.installmentNumber ?? 1) < (selected.installmentNumber ?? 1)) return false;
    if (transaction.status !== "pending" && transaction.status !== "skipped") return false;
    return !invoices.some((item) => item.id === transaction.invoiceId && item.paidAmount > 0);
}

/** Series edits keep the amount and status of the installments skipped by the user. */
export function isSkippedSibling(transaction: StoredTransaction, selected: StoredTransaction, scope: TransactionSeriesScope): boolean {
    return scope !== "single" && transaction.id !== selected.id && transaction.status === "skipped";
}

/** Series total after saving: the edited amount is per installment, never the whole purchase. */
export function editedInstallmentTotal(transactions: StoredTransaction[], selected: StoredTransaction, scope: TransactionSeriesScope, amount: number, invoices: CreditCardInvoice[]): number {
    const cents = transactions.filter((item) => item.groupId === selected.groupId).reduce((sum, item) => {
        const changed = amount !== selected.amount && isEditableInScope(item, selected, scope, invoices) && !isSkippedSibling(item, selected, scope);
        return sum + Math.round((changed ? amount : item.amount) * 100);
    }, 0);
    return cents / 100;
}
