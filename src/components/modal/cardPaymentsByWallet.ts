import type { CreditCardInvoice, Wallet } from "../../context/FinanceContext";
import type { listCardWalletPayments } from "../../context/finance/permanentDeletion";
import { roundToCents } from "../../context/finance/helpers";
import { getMonthKeyFromDateValue } from "../../context/financeTypes";
import { resolveTransactionWallet } from "../transactions/transactionView";

export interface WalletCardPayments {
    wallet: Wallet;
    total: number;
    payments: Array<{ id: string; date: string; amount: number; invoiceMonth: string | null }>;
}

/** Carteiras com maior valor primeiro; em cada uma, pagamentos mais recentes primeiro. */
export function groupCardPaymentsByWallet(payments: ReturnType<typeof listCardWalletPayments>, wallets: Wallet[], invoices: CreditCardInvoice[]): WalletCardPayments[] {
    const dueDateByInvoiceId = new Map(invoices.map((invoice) => [invoice.id, invoice.dueDate]));
    const byWallet = new Map<string, WalletCardPayments>();

    payments.forEach(({ transaction, walletId }) => {
        const entry = byWallet.get(walletId) ?? { wallet: resolveTransactionWallet(wallets, walletId), total: 0, payments: [] };
        const dueDate = dueDateByInvoiceId.get(transaction.paymentForInvoiceId ?? "");
        const amount = Math.abs(transaction.amount);
        entry.total = roundToCents(entry.total + amount);
        entry.payments.push({ id: transaction.id, date: transaction.scheduledDate, amount, invoiceMonth: dueDate ? getMonthKeyFromDateValue(dueDate) : null });
        byWallet.set(walletId, entry);
    });

    byWallet.forEach((entry) => entry.payments.sort((a, b) => b.date.localeCompare(a.date)));
    return [...byWallet.values()].sort((a, b) => b.total - a.total);
}
