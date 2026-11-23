import { describe, expect, it } from "vitest";
import { createLedgerEntriesForPaidTransaction, normalizeCreditCardInvoice } from "../financeCore";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction, fixtureWallet } from "../financeTestFixtures";
import { deleteTransactionsSnapshot } from "./deleteTransactions";

describe("installment deletion", () => {
    it("removes the whole wallet purchase, paid installments and their ledger included", () => {
        const group = fixtureGroup({ transactionMode: "installment", installmentCount: 3, totalAmount: 300 });
        const paid = fixtureTransaction({ id: "installment-1", installmentNumber: 1, status: "paid", paidAt: "2026-01-05T12:00:00Z" });
        const pending = [2, 3].map((number) => fixtureTransaction({ id: `installment-${number}`, installmentNumber: number,
            scheduledDate: `2026-0${number}-05` }));
        const snapshot = fixtureSnapshot([group], [paid, ...pending]);
        snapshot.ledgerEntries = createLedgerEntriesForPaidTransaction(paid, group);

        const result = deleteTransactionsSnapshot(snapshot, paid.id, "all", "2026-01-10");

        expect(result.transactions).toEqual([]);
        expect(snapshot.ledgerEntries).not.toEqual([]);
        expect(result.ledgerEntries).toEqual([]);
        expect(result.transactionGroups).toEqual([]);
        expect(result.wallets[0]).toEqual(fixtureWallet);
    });

    it("deletes every posted card installment, skipped ones included, or none when an invoice has payments", () => {
        const group = fixtureGroup({ transactionMode: "installment", installmentCount: 3, totalAmount: 300,
            sourceWalletId: null, creditCardId: fixtureCard.id });
        const transactions = [1, 2, 3].map((number) => fixtureTransaction({ id: `installment-${number}`, installmentNumber: number,
            scheduledDate: "2026-01-05", status: number === 2 ? "skipped" : "pending", invoiceId: `invoice-${fixtureCard.id}-2026-0${number + 1}`, commitment: "posted" }));
        const snapshot = fixtureSnapshot([group], transactions);
        snapshot.creditCardInvoices = transactions.map((transaction, index) => normalizeCreditCardInvoice({ id: transaction.invoiceId!,
            creditCardId: fixtureCard.id, cycleKey: `2026-0${index + 2}`, totalAmount: 100 }, new Set([fixtureCard.id])));

        const result = deleteTransactionsSnapshot(snapshot, transactions[0].id, "all", "2026-01-10");

        expect(result.transactions).toEqual([]);
        expect(result.transactionGroups).toEqual([]);
        expect(result.creditCardInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)).toBe(0);

        const paymentGroup = fixtureGroup({ id: "payment-group" });
        const payment = fixtureTransaction({ id: "payment", groupId: paymentGroup.id, status: "paid", paidAt: "2026-02-17T12:00:00Z", paymentForInvoiceId: transactions[0].invoiceId });
        const withPayment = { ...snapshot, transactionGroups: [group, paymentGroup], transactions: [...transactions, payment],
            creditCardInvoices: snapshot.creditCardInvoices.map((invoice, index) => index === 0 ? { ...invoice, paidAmount: 100 } : invoice) };
        expect(() => deleteTransactionsSnapshot(withPayment, transactions[1].id, "all", "2026-01-10")).toThrow("Reverta o pagamento");
    });
});
