import { describe, expect, it } from "vitest";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction, fixtureWallet } from "./financeTestFixtures";
import { buildInvoicePaymentNote, normalizeCreditCardInvoice } from "./financeCore";
import { listCardWalletPayments, permanentlyDeleteCreditCardData, permanentlyDeleteWalletData } from "./permanentDeletion";
import { recalculateGroupTotals } from "./transactionSeries/helpers";
import { requireRecurrenceRule } from "./recurrence/rule";

describe("permanent registry deletion", () => {
    it("keeps installments moved to other accounts and records the ones erased with the card", () => {
        const group = fixtureGroup({ transactionMode: "installment", creditCardId: fixtureCard.id, installmentCount: 3 });
        const charge = fixtureTransaction({ installmentNumber: 1, amount: 34 });
        const byWallet = fixtureTransaction({ id: "by-wallet", routingOverride: true, sourceWalletId: fixtureWallet.id, installmentNumber: 2, amount: 33, status: "paid" });
        const otherCard = { ...fixtureCard, id: "other-card" };
        const byCard = fixtureTransaction({ id: "by-card", creditCardId: otherCard.id, installmentNumber: 3, amount: 33 });
        const snapshot = fixtureSnapshot([group], [charge, byWallet, byCard]);
        snapshot.creditCards.push(otherCard);
        snapshot.transactionTags = [{ transactionId: charge.id, tagId: "tag" }, { transactionId: byCard.id, tagId: "tag" }];
        snapshot.ledgerEntries = [{ id: "ledger", transactionId: byWallet.id, walletId: fixtureWallet.id,
            invoiceId: null, amount: -33, balanceAfter: 967, description: "Test", createdAt: "2026-01-05T12:00:00Z" }];
        const first = permanentlyDeleteCreditCardData({ ...snapshot, creditCardId: fixtureCard.id });
        const [kept] = recalculateGroupTotals(first.transactionGroups, first.transactions);
        expect(first.transactionGroups).toHaveLength(1);
        expect(kept).toMatchObject({ creditCardId: null, installmentCount: 3, totalAmount: 66,
            removedInstallments: [{ number: 1, amount: 34, date: charge.scheduledDate, cardName: fixtureCard.name }] });
        expect(first.transactions.map((row) => [row.id, row.groupId, row.creditCardId, row.installmentNumber])).toEqual([["by-wallet", kept.id, null, 2], ["by-card", kept.id, "other-card", 3]]);
        expect(first.transactionTags).toEqual([{ transactionId: byCard.id, tagId: "tag" }]);
        expect(first.ledgerEntries).toEqual(snapshot.ledgerEntries);

        // Deleting the other card accumulates the record in the same group.
        const second = permanentlyDeleteCreditCardData({ ...snapshot, ...first, creditCardId: otherCard.id });
        expect(second.transactionGroups.map((row) => [row.id, row.removedInstallments?.map((item) => item.number)])).toEqual([[kept.id, [1, 3]]]);
        expect(second.transactions.map((row) => row.id)).toEqual(["by-wallet"]);
    });

    it("keeps wallet payments as ordinary expenses only when asked to", () => {
        const invoice = normalizeCreditCardInvoice({ id: "invoice", creditCardId: fixtureCard.id, cycleKey: "2026-01", totalAmount: 100, paidAmount: 100 }, new Set([fixtureCard.id]));
        const note = buildInvoicePaymentNote({ invoiceId: invoice.id, creditCardId: fixtureCard.id });
        const payment = fixtureTransaction({ id: "payment", groupId: "pay", status: "paid", paymentForInvoiceId: invoice.id, notes: note });
        const settlement = fixtureTransaction({ id: "settlement", groupId: "close", status: "paid", paymentForInvoiceId: invoice.id, notes: note });
        const snapshot = { ...fixtureSnapshot([fixtureGroup({ id: "pay", notes: note }), fixtureGroup({ id: "close", sourceWalletId: null })], [payment, settlement]),
            creditCardInvoices: [invoice], creditCardId: fixtureCard.id };
        expect(listCardWalletPayments(snapshot, fixtureCard.id)).toEqual([{ transaction: payment, walletId: fixtureWallet.id }]);
        expect(permanentlyDeleteCreditCardData(snapshot).transactions).toEqual([]);
        const kept = permanentlyDeleteCreditCardData({ ...snapshot, keepPayments: true });
        expect(kept.transactions).toEqual([{ ...payment, paymentForInvoiceId: null, notes: null }]);
        expect(kept.transactionGroups.find((group) => group.id === "pay")?.notes).toBeNull();
    });

    it("keeps a purchase whose installments were all moved and removes one left entirely on the card", () => {
        const moved = fixtureGroup({ id: "moved", transactionMode: "installment", creditCardId: fixtureCard.id });
        const stays = fixtureGroup({ id: "stays", transactionMode: "installment", creditCardId: fixtureCard.id });
        const result = permanentlyDeleteCreditCardData({ ...fixtureSnapshot([moved, stays], [
            fixtureTransaction({ id: "a", groupId: "moved", routingOverride: true, creditCardId: "other-card", installmentNumber: 1 }),
            fixtureTransaction({ id: "b", groupId: "stays", installmentNumber: 1 }),
        ]), creditCardId: fixtureCard.id });
        expect(result.transactions.map((row) => row.id)).toEqual(["a"]);
        expect(result.transactionGroups.map((row) => [row.creditCardId, row.removedInstallments])).toEqual([["other-card", undefined]]);
    });

    it.each(["sourceWalletId", "destinationWalletId"] as const)("removes a recurring series referring to a wallet only through %s in its rule", (field) => {
        const rule = requireRecurrenceRule({ anchorDate: "2026-01-05", amount: 100, end: { type: "never" }, [field]: "removed" });
        const snapshot = fixtureSnapshot([fixtureGroup({ transactionMode: "recurring", recurrenceRule: rule })], []);
        snapshot.wallets.push({ ...fixtureWallet, id: "removed" });
        const result = permanentlyDeleteWalletData({ ...snapshot, walletId: "removed" });
        expect(result.transactionGroups).toEqual([]);
        expect(result.wallets.map((row) => row.id)).toEqual([fixtureWallet.id]);
    });

    it("keeps card purchases detached from the deleted wallet, removing only occurrences paid by it", () => {
        const group = fixtureGroup({ transactionMode: "installment", creditCardId: fixtureCard.id });
        const charge = fixtureTransaction({ installmentNumber: 1, sourceWalletId: fixtureWallet.id });
        const rerouted = fixtureTransaction({ id: "rerouted", routingOverride: true, creditCardId: null, sourceWalletId: fixtureWallet.id, installmentNumber: 2 });
        const rule = requireRecurrenceRule({ anchorDate: "2026-01-05", amount: 100, end: { type: "never" }, sourceWalletId: fixtureWallet.id, creditCardId: fixtureCard.id });
        const series = fixtureGroup({ id: "series", transactionMode: "recurring", creditCardId: fixtureCard.id, recurrenceRule: rule });
        const result = permanentlyDeleteWalletData({ ...fixtureSnapshot([group, series], [charge, rerouted]), walletId: fixtureWallet.id });
        expect(result.transactions).toEqual([{ ...charge, sourceWalletId: null }]);
        expect(result.transactionGroups.map((row) => [row.id, row.sourceWalletId])).toEqual([[group.id, null], ["series", null]]);
        expect(result.transactionGroups[1].recurrenceRule?.sourceWalletId).toBeNull();
    });

    it("keeps a paid invoice payment without wallet when the paying wallet is deleted", () => {
        const payment = fixtureTransaction({ status: "paid", paymentForInvoiceId: "invoice", sourceWalletId: fixtureWallet.id });
        const result = permanentlyDeleteWalletData({ ...fixtureSnapshot([fixtureGroup()], [payment]), walletId: fixtureWallet.id });
        expect(result.transactions).toEqual([{ ...payment, sourceWalletId: null }]);
        expect(result.transactionGroups[0].sourceWalletId).toBeNull();
    });

    it("removes a recurring series referring to a card only through its rule", () => {
        const rule = requireRecurrenceRule({ anchorDate: "2026-01-05", amount: 100, end: { type: "never" }, creditCardId: fixtureCard.id });
        const snapshot = fixtureSnapshot([fixtureGroup({ transactionMode: "recurring", recurrenceRule: rule })], []);
        expect(permanentlyDeleteCreditCardData({ ...snapshot, creditCardId: fixtureCard.id }).transactionGroups).toEqual([]);
    });
});
