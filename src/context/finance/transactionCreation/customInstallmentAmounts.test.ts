import { describe, expect, it } from "vitest";
import type { TransactionDraft } from "../domainTypes";
import { fixtureCard, fixtureGroup, fixtureSnapshot, fixtureTransaction, fixtureWallet } from "../financeTestFixtures";
import { updateTransactionSeriesSnapshot } from "../transactionSeries/updateTransactionSeriesSnapshot";
import { createTransactionSnapshot } from "./createTransactionSnapshot";

const base = { ...fixtureSnapshot([], []), creditCards: [fixtureCard] };
const draft: TransactionDraft = { type: "spending", value: 300, date: "2026-11-05", paymentMethod: "credit_card", creditCardId: fixtureCard.id, invoiceId: `invoice-${fixtureCard.id}-2026-11`,
    status: "pending", transactionMode: "installment", installmentCount: 3, installmentAmounts: [150, 100.5, 49.5] };
const options = { now: "2026-11-05T12:00:00Z" };

describe("parcelas com valor personalizado", () => {
    it("grava cada valor na própria fatura", () => {
        const result = createTransactionSnapshot(base, draft, options);
        expect(result.transactions.map((row) => row.amount)).toEqual([150, 100.5, 49.5]);
        expect(result.creditCardInvoices.map((invoice) => invoice.totalAmount)).toEqual([150, 100.5, 49.5]);
        expect(result.transactionGroups[0].totalAmount).toBe(300);
    });

    it("usa a soma quando ela difere do total e mantém ignoradas fora da fatura", () => {
        const result = createTransactionSnapshot(base, { ...draft, installmentAmounts: [150, 100, 100], ignoredInstallmentsCount: 1 }, options);
        expect(result.transactionGroups[0].totalAmount).toBe(350);
        expect(result.creditCardInvoices.map((invoice) => invoice.totalAmount)).toEqual([0, 100, 100]);
    });

    it("recusa parcela sem valor e lista incompleta", () => {
        expect(() => createTransactionSnapshot(base, { ...draft, installmentAmounts: [300, 0, 0] }, options)).toThrow("A parcela 2");
        expect(() => createTransactionSnapshot(base, { ...draft, installmentAmounts: [300] }, options)).toThrow("todas as parcelas");
    });

    it("vale também ao transformar uma transação única em parcelada", () => {
        const group = fixtureGroup({ sourceWalletId: fixtureWallet.id });
        const single = fixtureTransaction({ id: "single" });
        const result = updateTransactionSeriesSnapshot({ snapshot: fixtureSnapshot([group], [single]), transactionId: single.id, scope: "single",
            draft: { value: 100, transactionMode: "installment", installmentCount: 2, installmentAmounts: [70, 30] } });
        expect(result.snapshot.transactions.map((row) => row.amount)).toEqual([70, 30]);
    });

    it("preserva os valores ao editar só a descrição de todas", () => {
        const created = createTransactionSnapshot(base, draft, options);
        const result = updateTransactionSeriesSnapshot({ snapshot: created, transactionId: created.transactions[1].id, scope: "all", draft: { description: "Nova" } });
        expect(result.snapshot.transactions.map((row) => row.amount)).toEqual([150, 100.5, 49.5]);
    });
});
