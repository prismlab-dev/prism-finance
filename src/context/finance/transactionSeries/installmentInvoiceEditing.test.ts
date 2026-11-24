import { describe, expect, it } from "vitest";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction, fixtureWallet } from "../financeTestFixtures";
import { normalizeCreditCardInvoice, normalizeFinanceSnapshot, resolveTransactionCreditCardId } from "../financeCore";
import { toTransactionRow, fromTransactionRow } from "../../../supabase/finance/financeRowMappers";
import { editedInstallmentTotal } from "./installmentScope";
import { updateTransactionSeriesSnapshot } from "./updateTransactionSeriesSnapshot";

const secondCard = { ...fixtureCard, id: "second-card", closingDay: 20 };
const group = fixtureGroup({ transactionMode: "installment", installmentCount: 3, totalAmount: 300, creditCardId: fixtureCard.id, sourceWalletId: null });
const transactions = [1, 2, 3].map((number) => fixtureTransaction({ id: `parcel-${number}`, installmentNumber: number,
    scheduledDate: "2026-01-15", invoiceId: `invoice-${fixtureCard.id}-2026-0${number + 1}`, commitment: "posted" }));
const invoices = [1, 2, 3, 4].map((month) => normalizeCreditCardInvoice({ id: `custom-${month}`, creditCardId: secondCard.id,
    cycleKey: `2026-0${month}`, totalAmount: 0 }, new Set([secondCard.id])));
const snapshot = { ...fixtureSnapshot([group], transactions), creditCards: [fixtureCard, secondCard], creditCardInvoices: invoices };

describe("installment invoice editing", () => {
    it("clears inherited card routing for one installment through mapper and reload", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "single",
            draft: { paymentMethod: "wallet", walletId: fixtureWallet.id } });
        const converted = result.snapshot.transactions[1];
        expect(converted).toMatchObject({ routingOverride: true, creditCardId: null, invoiceId: null, sourceWalletId: fixtureWallet.id });
        const mapped = fromTransactionRow(toTransactionRow("owner", converted));
        expect(resolveTransactionCreditCardId(mapped, group)).toBeNull();
        const reloaded = normalizeFinanceSnapshot({ ...result.snapshot, transactions: result.snapshot.transactions.map((row) => row.id === converted.id ? mapped : row) }).snapshot;
        expect(resolveTransactionCreditCardId(reloaded.transactions.find((row) => row.id === converted.id)!, group)).toBeNull();
        expect(result.snapshot.transactions[0]).toEqual(transactions[0]);
        expect(result.snapshot.transactions[2]).toEqual(transactions[2]);
    });
    it("converts the purchase to monthly wallet installments without losing installment identity", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "all",
            draft: { paymentMethod: "wallet", walletId: fixtureWallet.id } });
        expect(result.snapshot.transactions.map((row) => [row.installmentNumber, row.scheduledDate, resolveTransactionCreditCardId(row, group)])).toEqual([
            [1, "2026-01-15", null], [2, "2026-02-15", null], [3, "2026-03-15", null],
        ]);
    });
    it("preserves sibling routing overrides when changing only the description of all installments", () => {
        const converted = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "single",
            draft: { paymentMethod: "wallet", walletId: fixtureWallet.id } }).snapshot;
        const updated = updateTransactionSeriesSnapshot({ snapshot: converted, transactionId: transactions[1].id, scope: "all",
            draft: { description: "Updated purchase" } }).snapshot;
        expect(updated.transactions.map((row) => resolveTransactionCreditCardId(row, group))).toEqual([fixtureCard.id, null, fixtureCard.id]);
        expect(updated.transactions.map((row) => row.title)).toEqual(Array(3).fill("Updated purchase"));
    });
    it("reassigns every installment on a card change without a date change", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[0].id, scope: "all",
            draft: { paymentMethod: "credit_card", creditCardId: secondCard.id } });
        expect(result.snapshot.transactions.map((row) => row.invoiceId)).toEqual(["custom-2", "custom-3", "custom-4"]);
        expect(result.snapshot.transactions.map((row) => row.scheduledDate)).toEqual(Array(3).fill("2026-01-15"));
    });

    it("uses an explicitly selected cycle as the anchor for subsequent installments", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "this_and_next",
            draft: { paymentMethod: "credit_card", creditCardId: secondCard.id, invoiceId: "custom-3" } });
        expect(result.snapshot.transactions.map((row) => row.invoiceId)).toEqual([transactions[0].invoiceId, "custom-3", "custom-4"]);
        expect(result.snapshot.transactions[0]).toEqual(transactions[0]);
    });
    it("routes to a selected invoice that is not stored yet", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "single",
            draft: { invoiceId: `invoice-${fixtureCard.id}-2026-09` } });
        expect(result.snapshot.transactions[1].invoiceId).toBe(`invoice-${fixtureCard.id}-2026-09`);
    });
    it("moves skipped installments along with the series without changing their status or amount", () => {
        const withSkipped = { ...snapshot, transactions: transactions.map((row, index) => index === 0 ? { ...row, status: "skipped" as const } : row) };
        const result = updateTransactionSeriesSnapshot({ snapshot: withSkipped, transactionId: transactions[1].id, scope: "all",
            draft: { invoiceId: transactions[0].invoiceId, amount: 80 } });
        expect(result.snapshot.transactions.map((row) => [row.invoiceId, row.status, row.amount])).toEqual([
            [`invoice-${fixtureCard.id}-2026-01`, "skipped", 100],
            [`invoice-${fixtureCard.id}-2026-02`, "pending", 80],
            [`invoice-${fixtureCard.id}-2026-03`, "pending", 80],
        ]);
    });
    it("leaves a skipped installment in place when its target invoice has payments", () => {
        const paid = normalizeCreditCardInvoice({ id: `invoice-${fixtureCard.id}-2026-01`, creditCardId: fixtureCard.id, cycleKey: "2026-01", totalAmount: 50, paidAmount: 50 }, new Set([fixtureCard.id]));
        const withSkipped = { ...snapshot, creditCardInvoices: [...invoices, paid], transactions: transactions.map((row, index) => index === 0 ? { ...row, status: "skipped" as const } : row) };
        const result = updateTransactionSeriesSnapshot({ snapshot: withSkipped, transactionId: transactions[1].id, scope: "all", draft: { invoiceId: transactions[0].invoiceId } });
        expect(result.snapshot.transactions[0]).toEqual(withSkipped.transactions[0]);
        expect(result.affectedTransactionIds).toEqual(new Set([transactions[1].id, transactions[2].id]));
    });
    it("previews the same series total that saving a per-installment amount produces", () => {
        const withSkipped = { ...snapshot, transactions: transactions.map((row, index) => index === 0 ? { ...row, status: "skipped" as const } : row) };
        for (const [scope, total] of [["single", 500], ["this_and_next", 700], ["all", 700]] as const) {
            const result = updateTransactionSeriesSnapshot({ snapshot: withSkipped, transactionId: transactions[1].id, scope, draft: { amount: 300 } });
            expect(result.snapshot.transactionGroups[0].totalAmount).toBe(total);
            expect(editedInstallmentTotal(withSkipped.transactions, withSkipped.transactions[1], scope, 300, withSkipped.creditCardInvoices)).toBe(total);
        }
    });
    it("anchors automatic cycles to the purchase even when editing from the second installment", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "all",
            draft: { paymentMethod: "credit_card", creditCardId: secondCard.id } });
        expect(result.snapshot.transactions.map((row) => row.invoiceId)).toEqual(["custom-2", "custom-3", "custom-4"]);
    });
    it("renames the purchase when the description of the whole series changes", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "all", draft: { description: "Notebook" } });
        expect(result.snapshot.transactionGroups[0].title).toBe("Notebook");
        const recategorized = updateTransactionSeriesSnapshot({ snapshot: { ...snapshot, categories: [{ id: "cat-new", name: "Eletrônicos", type: "expense", parentId: null, isActive: true } as never] },
            transactionId: transactions[1].id, scope: "all", draft: { categoryId: "cat-new" } });
        expect(recategorized.snapshot.transactionGroups[0].categoryId).toBe("cat-new");
        expect(updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "single", draft: { description: "Notebook" } })
            .snapshot.transactionGroups[0].title).toBe(group.title);
    });
    it("applies the amount of each installment from the series form", () => {
        const result = updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "all", draft: { value: 150, installmentAmounts: [100, 150, 50] } });
        expect(result.snapshot.transactions.map((row) => row.amount)).toEqual([100, 150, 50]);
        expect(() => updateTransactionSeriesSnapshot({ snapshot, transactionId: transactions[1].id, scope: "all", draft: { installmentAmounts: [100, 0, 200] } })).toThrow();
    });
});
