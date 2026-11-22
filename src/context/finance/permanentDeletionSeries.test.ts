import { describe, expect, it } from "vitest";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction, fixtureWallet } from "./financeTestFixtures";
import { permanentlyDeleteCreditCardData, permanentlyDeleteWalletData } from "./permanentDeletion";
import { requireRecurrenceRule } from "./recurrence/rule";

describe("permanent registry deletion", () => {
    it("removes an entire linked purchase including individually rerouted installments and their ledger", () => {
        const group = fixtureGroup({ transactionMode: "installment", creditCardId: fixtureCard.id });
        const override = fixtureTransaction({ routingOverride: true, creditCardId: null, sourceWalletId: fixtureWallet.id, installmentNumber: 2 });
        const unrelatedGroup = fixtureGroup({ id: "unrelated" });
        const unrelated = fixtureTransaction({ id: "unrelated", groupId: unrelatedGroup.id });
        const snapshot = fixtureSnapshot([group, unrelatedGroup], [override, unrelated]);
        snapshot.transactionTags = [{ transactionId: override.id, tagId: "tag" }];
        snapshot.ledgerEntries = [{ id: "ledger", transactionId: override.id, walletId: fixtureWallet.id,
            invoiceId: null, amount: -100, balanceAfter: 900, description: "Test", createdAt: "2026-01-05T12:00:00Z" }];
        const result = permanentlyDeleteCreditCardData({ ...snapshot, creditCardId: fixtureCard.id });
        expect(result.transactionGroups.map((row) => row.id)).toEqual([unrelatedGroup.id]);
        expect(result.transactions.map((row) => row.id)).toEqual([unrelated.id]);
        expect(result.transactionTags).toEqual([]);
        expect(result.ledgerEntries).toEqual([]);
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
