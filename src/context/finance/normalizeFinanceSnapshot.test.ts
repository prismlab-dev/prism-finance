import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEFAULT_BENEFICIARY_ID,
    DEFAULT_WALLET_ID,
    SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID,
    createFinanceSnapshot,
    createLedgerEntriesForPaidTransaction,
    normalizeFinanceSnapshot,
} from "./financeCore";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
});

afterEach(() => {
    vi.useRealTimers();
});

const wallet = { id: "w1", name: "Conta", initialBalance: 100, includeInMainTotals: true, createdAt: "2026-01-01T00:00:00.000Z" };

describe("normalizeFinanceSnapshot — usuário novo", () => {
    it("cria carteira padrão, categorias semente e o beneficiário próprio", () => {
        const { snapshot, changed } = normalizeFinanceSnapshot(null, "user-1", { defaultBeneficiaryName: "Luiza", defaultBeneficiaryAvatarImage: "https://img" });

        expect(changed).toBe(true);
        expect(snapshot.wallets.map((item) => item.id)).toEqual([DEFAULT_WALLET_ID]);
        expect(snapshot.categories.some((item) => item.id === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID)).toBe(true);
        expect(snapshot.categories.every((item) => !item.isSystem)).toBe(true);
        expect(snapshot.beneficiaries).toEqual([
            expect.objectContaining({ id: DEFAULT_BENEFICIARY_ID, userId: "user-1", name: "Luiza", avatarImage: "https://img", isSelfProfile: true, source: "personal" }),
        ]);
    });
});

describe("normalizeFinanceSnapshot — limpeza", () => {
    it("descarta registros sem id e duplicados, mantendo o primeiro", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet, { ...wallet, name: "Duplicada" }, { name: "Sem id" }],
            tags: [{ id: "t1", name: "A", sortOrder: 0, isActive: true }, { id: "t1", name: "B" }],
        });

        expect(snapshot.wallets.map((item) => item.name)).toEqual(["Conta"]);
        expect(snapshot.tags.map((item) => item.name)).toEqual(["A"]);
    });

    it("escolhe o primeiro cartão como favorito quando o salvo não existe", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            creditCards: [
                { id: "c2", createdAt: "2026-02-01T00:00:00.000Z" },
                { id: "c1", createdAt: "2026-01-01T00:00:00.000Z" },
            ],
            favoriteCreditCardId: "removido",
        });

        expect(snapshot.creditCards.map((card) => card.id)).toEqual(["c1", "c2"]);
        expect(snapshot.favoriteCreditCardId).toBe("c1");
    });

    it("desfaz vínculo de grupo com cartão inexistente e tira invoiceId da transação", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactionGroups: [{ id: "g", type: "expense", creditCardId: "sumiu", sourceWalletId: "w1", categoryName: "Lazer" }],
            transactions: [{ id: "t", groupId: "g", amount: 10, invoiceId: "sumiu-2026-06", scheduledDate: "2026-06-01" }],
        });

        expect(snapshot.transactionGroups[0].creditCardId).toBeNull();
        expect(snapshot.transactions[0].invoiceId).toBeNull();
    });

    it("remove vínculos de tag órfãos ou duplicados", () => {
        const { snapshot, changed } = normalizeFinanceSnapshot({
            wallets: [wallet],
            tags: [{ id: "tag", name: "Casa", sortOrder: 0, isActive: true }],
            transactionGroups: [{ id: "g", type: "expense", sourceWalletId: "w1" }],
            transactions: [{ id: "t", groupId: "g", amount: 10 }],
            transactionTags: [
                { transactionId: "t", tagId: "tag" },
                { transactionId: "t", tagId: "tag" },
                { transactionId: "t", tagId: "sumida" },
                { transactionId: "x", tagId: "tag" },
            ],
        });

        expect(changed).toBe(true);
        expect(snapshot.transactionTags).toEqual([{ transactionId: "t", tagId: "tag" }]);
    });

    it("descarta desejos inválidos", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wishItems: [
                { id: "ok", value: 10, categoryId: "c", description: "Fone" },
                { id: "sem-categoria", value: 10, description: "X" },
                { id: "sem-valor", value: 0, categoryId: "c", description: "Y" },
            ],
        });

        expect(snapshot.wishItems.map((item) => item.id)).toEqual(["ok"]);
    });
});

describe("normalizeFinanceSnapshot — vínculos de entidades", () => {
    it("cria categoria e subcategoria a partir dos nomes do grupo, reaproveitando nomes sem acento", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            categories: [{ id: "cat-lazer", name: "Lazer", type: "expense", sortOrder: 0, isActive: true }],
            transactionGroups: [{ id: "g", type: "expense", categoryName: "lazer", subcategoryName: "Cinema", beneficiaryName: "Bia", sourceWalletId: "w1" }],
        });

        const [group] = snapshot.transactionGroups;
        const created = snapshot.categories.find((item) => item.id === group.categoryId);
        expect(created).toMatchObject({ name: "Cinema", parentId: "cat-lazer", type: "expense" });
        expect(group).toMatchObject({ categoryName: "Lazer", subcategoryName: "Cinema" });

        const beneficiary = snapshot.beneficiaries.find((item) => item.id === group.beneficiaryId);
        expect(beneficiary?.name).toBe("Bia");
    });

    it("atualiza nomes desnormalizados do grupo a partir das entidades", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            categories: [{ id: "cat", name: "Moradia", type: "expense", sortOrder: 0, isActive: true }],
            beneficiaries: [{ id: "ana", name: "Ana", sortOrder: 0 }],
            transactionGroups: [{ id: "g", type: "expense", categoryId: "cat", categoryName: "Antigo", beneficiaryId: "ana", beneficiaryName: "Velho", sourceWalletId: "w1" }],
        });

        expect(snapshot.transactionGroups[0]).toMatchObject({ categoryName: "Moradia", subcategoryName: null, beneficiaryName: "Ana" });
    });

    it("beneficiário compartilhado pela família substitui o pessoal com mesmo id", () => {
        const { snapshot } = normalizeFinanceSnapshot(
            { beneficiaries: [{ id: "shared", name: "Pessoal", sortOrder: 0 }] },
            "user-1",
            { sharedBeneficiaries: [{ id: "shared", name: "Mãe", isSelfProfile: false } as never] },
        );

        expect(snapshot.beneficiaries.find((item) => item.id === "shared")).toMatchObject({ name: "Mãe", source: "family_shared", isActive: true });
    });
});

describe("normalizeFinanceSnapshot — ledger", () => {
    const groups = [{ id: "g", type: "income", sourceWalletId: "w1", title: "Salário", createdAt: "2026-01-01T00:00:00.000Z" }];

    it("recria o lançamento ausente de uma transação paga e aplica no saldo", () => {
        const { snapshot, changed } = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactionGroups: groups,
            transactions: [{ id: "t", groupId: "g", amount: 50, status: "paid", paidAt: "2026-01-05T12:00:00.000Z" }],
            ledgerEntries: [],
        });

        expect(changed).toBe(true);
        expect(snapshot.ledgerEntries).toEqual([expect.objectContaining({ id: "le-t", walletId: "w1", amount: 50, balanceAfter: 150 })]);
        expect(snapshot.wallets[0].balance).toBe(150);
    });

    it("remove lançamentos de transação que não está mais paga", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactionGroups: groups,
            transactions: [{ id: "t", groupId: "g", amount: 50, status: "pending" }],
            ledgerEntries: [{ id: "le-t", walletId: "w1", transactionId: "t", amount: 50 }],
        });

        expect(snapshot.ledgerEntries).toEqual([]);
        expect(snapshot.wallets[0].balance).toBe(100);
    });

    it("reaproveita lançamentos corretos e substitui os divergentes", () => {
        const base = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactionGroups: groups,
            transactions: [{ id: "t", groupId: "g", amount: 50, status: "paid", paidAt: "2026-01-05T12:00:00.000Z" }],
        }).snapshot;
        const [expected] = createLedgerEntriesForPaidTransaction(base.transactions[0], base.transactionGroups[0]);

        const reused = normalizeFinanceSnapshot({ ...base, ledgerEntries: [{ ...expected, id: "id-antigo" }] }).snapshot;
        const repaired = normalizeFinanceSnapshot({ ...base, ledgerEntries: [{ ...expected, amount: 999 }] }).snapshot;

        expect(reused.ledgerEntries.map((entry) => entry.id)).toEqual(["id-antigo"]);
        expect(repaired.ledgerEntries.map((entry) => [entry.id, entry.amount])).toEqual([["le-t", 50]]);
    });

    it("mantém lançamentos manuais sem transação", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            ledgerEntries: [{ id: "ajuste", walletId: "w1", amount: -20, createdAt: "2026-01-02T00:00:00.000Z" }],
        });

        expect(snapshot.ledgerEntries.map((entry) => entry.id)).toEqual(["ajuste"]);
        expect(snapshot.wallets[0].balance).toBe(80);
    });
});

describe("normalizeFinanceSnapshot — formato legado", () => {
    it("converte transação antiga com valor sinalizado em grupo + transação + lançamento", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactions: [
                {
                    id: "old",
                    value: -30,
                    type: "spending",
                    inWallet: { id: "w1" },
                    date: "2026-01-10",
                    status: true,
                    description: "Padaria",
                    category: { principal: "Alimentação", sub: "Padaria" },
                    meta: { criado_em: "2026-01-10T10:00:00.000Z", atualizado_em: "2026-01-10T11:00:00.000Z" },
                },
            ],
        });

        const [group] = snapshot.transactionGroups;
        expect(group).toMatchObject({ id: "legacy-group-old", type: "expense", sourceWalletId: "w1", title: "Padaria", categoryName: "Alimentação", subcategoryName: "Padaria" });
        expect(snapshot.transactions[0]).toMatchObject({ id: "old", amount: 30, status: "paid", paidAt: "2026-01-10T11:00:00.000Z" });
        expect(snapshot.ledgerEntries.map((entry) => [entry.walletId, entry.amount])).toEqual([["w1", -30]]);
        expect(snapshot.wallets[0].balance).toBe(70);
    });
});

describe("normalizeFinanceSnapshot — estabilidade", () => {
    it("normalizar de novo um snapshot já normalizado não reporta mudança", () => {
        const first = normalizeFinanceSnapshot({
            wallets: [wallet],
            creditCards: [{ id: "c1", closingDay: 10, dueDay: 17, createdAt: "2026-01-01T00:00:00.000Z" }],
            transactionGroups: [{ id: "g", type: "expense", creditCardId: "c1", categoryName: "Lazer", createdAt: "2026-01-01T00:00:00.000Z" }],
            transactions: [{ id: "t", groupId: "g", amount: 80, scheduledDate: "2026-05-12", createdAt: "2026-01-01T00:00:00.000Z" }],
        }, "user-1").snapshot;

        const second = normalizeFinanceSnapshot(first, "user-1");

        expect(second.changed).toBe(false);
        expect(second.snapshot.creditCardInvoices).toEqual(first.creditCardInvoices);
    });
});

describe("createFinanceSnapshot", () => {
    it("aplica o ledger nas carteiras e calcula o resumo a partir das transações", () => {
        const { snapshot } = normalizeFinanceSnapshot({
            wallets: [wallet],
            transactionGroups: [{ id: "g", type: "income", sourceWalletId: "w1" }],
            transactions: [{ id: "t", groupId: "g", amount: 40, status: "paid", paidAt: "2026-01-05T12:00:00.000Z" }],
        });

        const rebuilt = createFinanceSnapshot(
            snapshot.wallets.map((item) => ({ ...item, balance: 0 })),
            [],
            [],
            null,
            snapshot.transactionGroups,
            snapshot.transactions,
            snapshot.ledgerEntries,
        );

        expect(rebuilt.wallets[0].balance).toBe(140);
        expect(rebuilt).toMatchObject({ receitas: 40, despesas: 0, beneficiaries: [], categories: [] });
    });
});
