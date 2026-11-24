import { describe, expect, it } from "vitest";
import {
    DEFAULT_WALLET_ID,
    applyLedgerToWallets,
    buildInvoicePaymentNote,
    calculateFinanceSummary,
    calculateTotalBalance,
    createLedgerEntriesForPaidTransaction,
    normalizeLedgerEntry,
    normalizeStoredTransaction,
    normalizeTransactionGroup,
    normalizeWallet,
    resolveLedgerEntryDateIso,
    type StoredTransaction,
    type TransactionGroup,
} from "./financeCore";

const walletIds = new Set([DEFAULT_WALLET_ID, "w1", "w2", "w-off"]);

function group(patch: Partial<TransactionGroup> & { id?: string } = {}): TransactionGroup {
    return normalizeTransactionGroup({ id: "g", title: "Mercado", type: "expense", sourceWalletId: "w1", createdAt: "2026-01-01T00:00:00.000Z", ...patch }, walletIds);
}

function paid(patch: Partial<StoredTransaction> = {}): StoredTransaction {
    return normalizeStoredTransaction({
        id: "t",
        groupId: "g",
        amount: 100,
        status: "paid",
        scheduledDate: "2026-01-05",
        paidAt: "2026-01-05T15:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        ...patch,
    });
}

describe("resolveLedgerEntryDateIso", () => {
    it("ancora a data no meio-dia local e usa o fallback para data inválida", () => {
        expect(resolveLedgerEntryDateIso("2026-03-01", "fallback")).toBe(new Date(2026, 2, 1, 12).toISOString());
        expect(resolveLedgerEntryDateIso("não é data", "fallback")).toBe("fallback");
    });
});

describe("createLedgerEntriesForPaidTransaction", () => {
    it("não gera lançamento para transação não paga", () => {
        expect(createLedgerEntriesForPaidTransaction(paid({ status: "pending" }), group())).toEqual([]);
    });

    it("receita credita a carteira de origem com id determinístico", () => {
        const [entry, ...rest] = createLedgerEntriesForPaidTransaction(paid(), group({ type: "income", title: "Salário" }));

        expect(rest).toEqual([]);
        expect(entry).toEqual({
            id: "le-t",
            walletId: "w1",
            transactionId: "t",
            invoiceId: null,
            amount: 100,
            balanceAfter: 0,
            description: "Receita: Salário",
            createdAt: "2026-01-05T15:00:00.000Z",
        });
    });

    it("despesa em carteira debita o valor", () => {
        const [entry] = createLedgerEntriesForPaidTransaction(paid({ amount: 40 }), group());

        expect(entry).toMatchObject({ walletId: "w1", amount: -40, description: "Despesa: Mercado" });
    });

    it("compra no cartão não movimenta carteira", () => {
        expect(createLedgerEntriesForPaidTransaction(paid(), group({ creditCardId: "c1" }))).toEqual([]);
    });

    it("fechamento manual de fatura sem carteira não cria lançamento sintético", () => {
        const transaction = paid({ paymentForInvoiceId: "inv-1" });

        expect(createLedgerEntriesForPaidTransaction(transaction, group({ sourceWalletId: null }))).toEqual([]);
    });

    it("pagamento de fatura com carteira debita a carteira", () => {
        const transaction = paid({ notes: buildInvoicePaymentNote({ invoiceId: "inv-1", creditCardId: "c1" }) });

        expect(createLedgerEntriesForPaidTransaction(transaction, group())).toHaveLength(1);
    });

    it("transferência gera saída e entrada", () => {
        const entries = createLedgerEntriesForPaidTransaction(paid({ amount: 25 }), group({ type: "transfer", sourceWalletId: "w1", destinationWalletId: "w2" }));

        expect(entries.map(({ id, walletId, amount }) => ({ id, walletId, amount }))).toEqual([
            { id: "le-t-source", walletId: "w1", amount: -25 },
            { id: "le-t-dest", walletId: "w2", amount: 25 },
        ]);
    });

    it("transferência para a mesma carteira só registra a saída", () => {
        const entries = createLedgerEntriesForPaidTransaction(paid(), group({ type: "transfer", sourceWalletId: "w1", destinationWalletId: "w1" }));

        expect(entries.map((entry) => entry.id)).toEqual(["le-t-source"]);
    });

    it("usa o meio-dia da data agendada quando não há paidAt", () => {
        const transaction: StoredTransaction = { ...paid(), paidAt: null };
        const [entry] = createLedgerEntriesForPaidTransaction(transaction, group());

        expect(entry.createdAt).toBe(new Date(2026, 0, 5, 12).toISOString());
    });

    it("respeita a rota sobrescrita na ocorrência", () => {
        const transaction = paid({ routingOverride: true, sourceWalletId: "w2", creditCardId: null });
        const [entry] = createLedgerEntriesForPaidTransaction(transaction, group({ creditCardId: "c1" }));

        expect(entry.walletId).toBe("w2");
    });
});

describe("applyLedgerToWallets", () => {
    it("acumula saldos em ordem cronológica e preenche balanceAfter", () => {
        const wallets = [normalizeWallet({ id: "w1", initialBalance: 100 }), normalizeWallet({ id: "w2", initialBalance: 5 })];
        const ledger = [
            normalizeLedgerEntry({ id: "b", walletId: "w1", amount: -30, createdAt: "2026-01-02T00:00:00.000Z" }),
            normalizeLedgerEntry({ id: "a", walletId: "w1", amount: 50, createdAt: "2026-01-01T00:00:00.000Z" }),
        ];

        const result = applyLedgerToWallets(wallets, ledger);

        expect(result.ledgerEntries.map((entry) => [entry.id, entry.balanceAfter])).toEqual([["a", 150], ["b", 120]]);
        expect(result.wallets.map((wallet) => [wallet.id, wallet.balance])).toEqual([["w1", 120], ["w2", 5]]);
    });

    it("desempata lançamentos simultâneos pelo id", () => {
        const wallets = [normalizeWallet({ id: "w1", initialBalance: 0 })];
        const createdAt = "2026-01-01T00:00:00.000Z";
        const result = applyLedgerToWallets(wallets, [
            normalizeLedgerEntry({ id: "z", walletId: "w1", amount: 1, createdAt }),
            normalizeLedgerEntry({ id: "m", walletId: "w1", amount: 2, createdAt }),
        ]);

        expect(result.ledgerEntries.map((entry) => entry.id)).toEqual(["m", "z"]);
    });

    it("preserva lançamentos de carteira desconhecida sem alterar saldos", () => {
        const result = applyLedgerToWallets([normalizeWallet({ id: "w1", initialBalance: 10 })], [
            normalizeLedgerEntry({ id: "x", walletId: "fantasma", amount: 99, balanceAfter: 7 }),
        ]);

        expect(result.ledgerEntries[0]).toMatchObject({ walletId: "fantasma", balanceAfter: 7 });
        expect(result.wallets[0].balance).toBe(10);
    });
});

describe("calculateTotalBalance", () => {
    it("soma apenas carteiras incluídas nos totais", () => {
        const wallets = [
            normalizeWallet({ id: "w1", initialBalance: 10.1, balance: 10.1 }),
            normalizeWallet({ id: "w2", initialBalance: 0.2, balance: 0.2 }),
            normalizeWallet({ id: "w-off", balance: 1000, includeInMainTotals: false }),
        ];

        expect(calculateTotalBalance(wallets)).toBe(10.3);
    });
});

describe("calculateFinanceSummary", () => {
    const wallets = [normalizeWallet({ id: "w1" }), normalizeWallet({ id: "w-off", includeInMainTotals: false })];

    it("soma receitas e despesas pagas, ignorando canceladas e puladas", () => {
        const groups = [group({ id: "gi", type: "income" }), group({ id: "ge" })];
        const transactions = [
            paid({ id: "i1", groupId: "gi", amount: 1000 }),
            paid({ id: "e1", groupId: "ge", amount: 200 }),
            paid({ id: "e2", groupId: "ge", amount: 50, status: "pending" }),
            paid({ id: "e3", groupId: "ge", amount: 70, status: "cancelled" }),
            paid({ id: "e4", groupId: "ge", amount: 30, status: "skipped" }),
        ];

        expect(calculateFinanceSummary(wallets, groups, transactions)).toEqual({ receitas: 1000, despesas: 250 });
    });

    it("exclui compras de cartão, carteiras fora dos totais e fechamentos sem carteira", () => {
        const groups = [
            group({ id: "card", creditCardId: "c1" }),
            group({ id: "off", sourceWalletId: "w-off" }),
            group({ id: "settle", sourceWalletId: null }),
        ];
        const transactions = [
            paid({ id: "c", groupId: "card" }),
            paid({ id: "o", groupId: "off" }),
            paid({ id: "s", groupId: "settle", paymentForInvoiceId: "inv-1" }),
        ];

        expect(calculateFinanceSummary(wallets, groups, transactions)).toEqual({ receitas: 0, despesas: 0 });
    });

    it("conta como despesa a transação órfã que não está em fatura", () => {
        const transactions = [paid({ id: "orfa", groupId: "sem-grupo", amount: 12 }), paid({ id: "orfa-fatura", groupId: "sem-grupo", invoiceId: "inv" })];

        expect(calculateFinanceSummary(wallets, [], transactions)).toEqual({ receitas: 0, despesas: 12 });
    });
});
