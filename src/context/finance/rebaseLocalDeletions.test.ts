import { describe, expect, it } from "vitest";
import type { SupabaseFinanceData } from "../../supabase/finance";
import { mergeSupabaseFinanceData } from "./financeSyncMerge";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction } from "./financeTestFixtures";
import { permanentlyDeleteCreditCardData } from "./permanentDeletion";
import { syncCreditCardInvoices } from "./syncCreditCardInvoices";
import { deleteTransactionsSnapshot } from "./transactionSeries/deleteTransactions";
import { recalculateGroupTotals } from "./transactionSeries/helpers";

function withInvoices(data: SupabaseFinanceData): SupabaseFinanceData {
    const synced = syncCreditCardInvoices({ ...data, existingInvoices: data.creditCardInvoices });
    return { ...data, transactions: synced.transactions, creditCardInvoices: synced.creditCardInvoices };
}

/** Purchase made on card "a", with each installment on the given card. */
function purchase(cards: string[]): SupabaseFinanceData {
    const group = fixtureGroup({ transactionMode: "installment", creditCardId: "a", installmentCount: cards.length, totalAmount: cards.length * 100 });
    const snapshot = fixtureSnapshot([group], cards.map((creditCardId, index) => fixtureTransaction({
        id: `p${index + 1}`, installmentNumber: index + 1,
        ...(creditCardId === "a" ? {} : { routingOverride: true, creditCardId }),
    })));
    return withInvoices({ ...snapshot, creditCards: ["a", "b", "c"].map((id) => ({ ...fixtureCard, id, name: id })), favoriteWalletId: null });
}

function deleteCard(data: SupabaseFinanceData, creditCardId: string, keepPayments = false): SupabaseFinanceData {
    const deleted = permanentlyDeleteCreditCardData({ ...data, creditCardId, keepPayments });
    return withInvoices({ ...data, ...deleted, transactionGroups: recalculateGroupTotals(deleted.transactionGroups, deleted.transactions) });
}

function payFirstInvoice(data: SupabaseFinanceData, id: string): SupabaseFinanceData {
    const invoice = data.creditCardInvoices.find((item) => item.totalAmount > 0)!;
    return {
        ...data,
        transactionGroups: [...data.transactionGroups, fixtureGroup({ id: `group-${id}`, totalAmount: 100 })],
        transactions: [...data.transactions, fixtureTransaction({ id, groupId: `group-${id}`, status: "paid", paidAt: "2026-01-12T12:00:00Z", paymentForInvoiceId: invoice.id })],
    };
}

function moveTo(data: SupabaseFinanceData, id: string, creditCardId: string): SupabaseFinanceData {
    return withInvoices({ ...data, transactions: data.transactions.map((item) => item.id === id ? { ...item, routingOverride: true, creditCardId, invoiceId: null } : item) });
}

const removedNumbers = (data: SupabaseFinanceData) => data.transactionGroups.flatMap((group) => (group.removedInstallments ?? []).map((item) => item.number)).sort();

describe("exclusões locais sobre dados confirmados por outro aparelho", () => {
    it("mantém a parcela que o outro aparelho moveu antes de este excluir o cartão", () => {
        const baseData = purchase(["a", "a", "a"]);
        const merged = mergeSupabaseFinanceData({ baseData, remoteData: moveTo(baseData, "p2", "b"), targetData: deleteCard(baseData, "a") });
        expect(merged.transactions.map((item) => [item.id, item.creditCardId])).toEqual([["p2", "b"]]);
        expect(merged.transactionGroups).toHaveLength(1);
        expect(merged.transactionGroups[0]).toMatchObject({ id: merged.transactions[0].groupId, creditCardId: "b", installmentCount: 3, totalAmount: 100 });
        expect(removedNumbers(merged)).toEqual([1, 3]);
        expect(merged.creditCards.map((card) => card.id)).toEqual(["b", "c"]);
    });

    it("registra as parcelas apagadas por cartões excluídos em aparelhos diferentes", () => {
        const baseData = purchase(["a", "b", "c"]);
        const merged = mergeSupabaseFinanceData({ baseData, remoteData: deleteCard(baseData, "c"), targetData: deleteCard(baseData, "b") });
        expect(merged.transactions.map((item) => item.id)).toEqual(["p1"]);
        expect(merged.transactionGroups[0]).toMatchObject({ installmentCount: 3, totalAmount: 100 });
        expect(removedNumbers(merged)).toEqual([2, 3]);
    });

    it("chega ao mesmo registro quando um dos cartões é o original da compra", () => {
        const baseData = purchase(["a", "b", "c"]);
        const [a, b] = [deleteCard(baseData, "a"), deleteCard(baseData, "b")];
        for (const [remoteData, targetData] of [[a, b], [b, a]]) {
            const merged = mergeSupabaseFinanceData({ baseData, remoteData, targetData });
            expect(merged.transactions.map((item) => item.id)).toEqual(["p3"]);
            expect(merged.transactionGroups.map((group) => group.id)).toEqual([merged.transactions[0].groupId]);
            expect(removedNumbers(merged)).toEqual([1, 2]);
        }
    });

    it("preserva a parcela movida neste aparelho antes da exclusão, com a edição remota", () => {
        const baseData = purchase(["a", "a", "a"]);
        const remoteData = { ...baseData, transactions: baseData.transactions.map((item) => item.id === "p2" ? { ...item, notes: "remota" } : item) };
        const merged = mergeSupabaseFinanceData({ baseData, remoteData, targetData: deleteCard(moveTo(baseData, "p2", "b"), "a") });
        expect(merged.transactions).toMatchObject([{ id: "p2", creditCardId: "b", notes: "remota" }]);
        expect(merged.transactionGroups.map((group) => group.id)).toEqual([merged.transactions[0].groupId]);
        expect(removedNumbers(merged)).toEqual([1, 3]);
    });

    it.each([["all", ["p1", "p2", "p3", "payment"]], ["single", ["p1", "p2", "p3", "payment"]]] as const)("desfaz a exclusão (%s) quando a fatura foi paga em outro aparelho", (scope, expected) => {
        const baseData = purchase(["a", "a", "a"]);
        const invoice = baseData.creditCardInvoices.find((item) => item.totalAmount > 0)!;
        const remoteData: SupabaseFinanceData = {
            ...baseData,
            transactionGroups: [...baseData.transactionGroups, fixtureGroup({ id: "pay", totalAmount: invoice.totalAmount })],
            transactions: [...baseData.transactions, fixtureTransaction({ id: "payment", groupId: "pay", amount: invoice.totalAmount, status: "paid", paidAt: "2026-01-12T12:00:00Z", paymentForInvoiceId: invoice.id })],
            creditCardInvoices: baseData.creditCardInvoices.map((item) => item.id === invoice.id ? { ...item, paidAmount: item.totalAmount, status: "paid" } : item),
        };
        const targetData = { ...baseData, ...deleteTransactionsSnapshot(baseData, "p1", scope) };
        const merged = mergeSupabaseFinanceData({ baseData, remoteData, targetData });
        expect(merged.transactions.map((item) => item.id).sort()).toEqual([...expected]);
        expect(merged.transactionGroups.map((group) => [group.id, group.totalAmount]).sort()).toEqual([["group-test", 300], ["pay", invoice.totalAmount]]);
        expect(merged.creditCardInvoices.find((item) => item.id === invoice.id)).toMatchObject({ totalAmount: invoice.totalAmount, paidAmount: invoice.totalAmount, status: "paid" });
    });

    it.each([true, false])("respeita a escolha sobre os pagamentos (manter: %s), inclusive nos do outro aparelho", (keepPayments) => {
        const baseData = payFirstInvoice(purchase(["a", "a", "a"]), "seen");
        const remoteData = payFirstInvoice(baseData, "unseen");
        const merged = mergeSupabaseFinanceData({ baseData, remoteData, targetData: deleteCard(baseData, "a", keepPayments) });
        expect(merged.transactions.map((item) => [item.id, item.paymentForInvoiceId])).toEqual(keepPayments ? [["seen", null], ["unseen", null]] : []);
    });

    it("mantém o pagamento que este aparelho não viu ao excluir o cartão", () => {
        const baseData = purchase(["a", "a", "a"]);
        const merged = mergeSupabaseFinanceData({ baseData, remoteData: payFirstInvoice(baseData, "unseen"), targetData: deleteCard(baseData, "a") });
        expect(merged.transactions.map((item) => [item.id, item.paymentForInvoiceId])).toEqual([["unseen", null]]);
    });

    it("não reaproveita o id de um grupo existente", () => {
        const data = purchase(["a", "b", "b"]);
        const taken = fixtureGroup({ id: "group-test-a" });
        const result = permanentlyDeleteCreditCardData({ ...data, transactionGroups: [...data.transactionGroups, taken], creditCardId: "a" });
        expect(new Set(result.transactionGroups.map((group) => group.id)).size).toBe(result.transactionGroups.length);
        expect(result.transactions.every((item) => item.groupId !== taken.id)).toBe(true);
    });
});
