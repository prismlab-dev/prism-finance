import type { FinanceSnapshot } from "../domainTypes";
import { syncCreditCardInvoices } from "../syncCreditCardInvoices";

type InvoiceInputs = Pick<FinanceSnapshot, "creditCards" | "transactionGroups" | "transactions" | "creditCardInvoices">;

/** Reatribui faturas às compras de cartão e recalcula as faturas do snapshot. */
export function withSyncedInvoices<T extends InvoiceInputs>(snapshot: T): T {
    const synced = syncCreditCardInvoices({
        creditCards: snapshot.creditCards,
        transactionGroups: snapshot.transactionGroups,
        transactions: snapshot.transactions,
        existingInvoices: snapshot.creditCardInvoices,
    });
    return { ...snapshot, transactions: synced.transactions, creditCardInvoices: synced.creditCardInvoices };
}
