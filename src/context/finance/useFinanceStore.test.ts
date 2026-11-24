// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../../auth/appUser";
import type { SupabaseFinanceData } from "../../supabase/finance";
import { normalizeFinanceSnapshot } from "./financeCore";
import { SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID } from "./domainConstants";
import type { FinanceSnapshot } from "./domainTypes";

const mocks = vi.hoisted(() => ({
    auth: { user: null as AppUser | null },
    remote: { data: null as SupabaseFinanceData | null, revision: 3 },
    enqueueSync: vi.fn(),
    retrySync: vi.fn(),
    queue: null as unknown,
}));

vi.mock("../../hooks/useAuthListener", () => ({
    useAuthListener: () => ({ user: mocks.auth.user, loading: false, profileVersion: 0 }),
}));

vi.mock("../../supabase/finance", async () => {
    const { createFinanceSnapshot, DEFAULT_PLANNING_STATE } = await import("./financeCore");
    return {
        createEmptySupabaseFinanceData: () => ({ ...createFinanceSnapshot([], [], [], null, [], [], [], [], [], [], [], [], DEFAULT_PLANNING_STATE), favoriteWalletId: null }),
        loadSupabaseFinanceData: vi.fn(async () => ({ data: mocks.remote.data, revision: mocks.remote.revision, tombstones: [] })),
        loadSupabaseFinanceIncrementally: vi.fn(),
        saveSupabaseFinanceData: vi.fn(),
        subscribeToFinanceRevisionChanges: () => () => undefined,
        buildFinanceChangesPayload: vi.fn(),
    };
});

vi.mock("../../supabase/family", () => ({
    acceptSupabaseFamilyInvite: vi.fn(),
    createSupabaseFamily: vi.fn(),
    createSupabaseFamilyInvite: vi.fn(),
    loadCurrentFamilyContext: vi.fn(async () => ({ family: null, sharedWishlists: [] })),
    removeSupabaseFamilyMember: vi.fn(),
    subscribeToFamilyShareRevisionChanges: () => () => undefined,
}));

vi.mock("../../lib/financeBackup", () => ({
    buildFinanceBackupFile: vi.fn(),
    downloadFinanceBackupFile: vi.fn(),
    saveLocalFinanceBackup: vi.fn(async () => undefined),
}));

vi.mock("./crossTabSync", () => ({
    getFinanceClientId: () => "client-test",
    publishFinanceRevisionToTabs: vi.fn(),
    subscribeToFinanceRevisionMessages: () => () => undefined,
}));

vi.mock("./useFinanceSyncQueue", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./useFinanceSyncQueue")>()),
    useFinanceSyncQueue: () => mocks.queue,
}));

const { useFinanceStore } = await import("./useFinanceStore");

const USER: AppUser = { uid: "user-1", email: "eu@example.com", displayName: "Eu Mesmo", photoURL: null, providerData: [], metadata: {} };

function buildRemoteData(): SupabaseFinanceData {
    const { snapshot } = normalizeFinanceSnapshot(
        {
            wallets: [
                { id: "w1", name: "Conta", initialBalance: 1000, includeInMainTotals: true, createdAt: "2026-01-01T00:00:00.000Z" },
                { id: "w2", name: "Reserva", initialBalance: 0, includeInMainTotals: true, createdAt: "2026-01-02T00:00:00.000Z" },
            ],
            creditCards: [{ id: "c1", name: "Roxinho", closingDay: 10, dueDay: 17, createdAt: "2026-01-01T00:00:00.000Z" }],
            transactionGroups: [{ id: "g-card", type: "expense", creditCardId: "c1", title: "Tênis", categoryName: "Lazer", createdAt: "2026-01-01T00:00:00.000Z" }],
            transactions: [{ id: "t-card", groupId: "g-card", amount: 300, scheduledDate: "2026-05-12", createdAt: "2026-01-01T00:00:00.000Z" }],
            categories: [
                { id: "food", name: "Alimentação", type: "expense", sortOrder: 0, isActive: true },
                { id: "food-market", name: "Mercado", type: "expense", parentId: "food", sortOrder: 0, isActive: true },
                { id: "food-delivery", name: "Delivery", type: "expense", parentId: "food", sortOrder: 1, isActive: true },
                { id: SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, name: "Fatura do Cartão", type: "expense", sortOrder: 2, isActive: true },
            ],
            tags: [
                { id: "tag-a", name: "A", sortOrder: 0, isActive: true },
                { id: "tag-b", name: "B", sortOrder: 1, isActive: true },
                { id: "tag-c", name: "C", sortOrder: 2, isActive: true },
            ],
        },
        USER.uid,
        { defaultBeneficiaryName: "Eu Mesmo" },
    );
    return { ...snapshot, favoriteWalletId: "w1" };
}

function lastSyncedData(): SupabaseFinanceData {
    const call = mocks.enqueueSync.mock.lastCall;
    if (!call) throw new Error("Nenhuma sincronização enfileirada");
    return call[0] as SupabaseFinanceData;
}

async function renderLoadedStore() {
    const view = renderHook(() => useFinanceStore());
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    return view;
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    window.localStorage?.clear();
    mocks.auth.user = USER;
    mocks.remote.data = buildRemoteData();
    mocks.remote.revision = 3;
    mocks.enqueueSync.mockReset();
    mocks.retrySync.mockReset();
    mocks.queue = {
        hydratedUserId: USER.uid,
        status: "synced",
        pendingCount: 0,
        lastSyncedAt: null,
        lastError: null,
        hasPendingSync: false,
        retrySync: mocks.retrySync,
        restoreConfirmedData: vi.fn(),
        copySyncDiagnostic: vi.fn(),
        enqueueSync: mocks.enqueueSync,
        getPendingSyncData: () => null,
        getPendingSyncBaseRevision: () => null,
    };
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useFinanceStore — carregamento", () => {
    it("sem usuário expõe um snapshot vazio normalizado e não sincroniza", async () => {
        mocks.auth.user = null;
        const { result } = await renderLoadedStore();

        expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(["default"]);
        expect(result.current.favoriteWalletId).toBe("default");
        expect(mocks.enqueueSync).not.toHaveBeenCalled();
    });

    it("hidrata o estado com os dados remotos sem reenviar o que não mudou", async () => {
        const { result } = await renderLoadedStore();

        expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(["w1", "w2"]);
        expect(result.current.favoriteWalletId).toBe("w1");
        expect(result.current.favoriteCreditCardId).toBe("c1");
        expect(result.current.balance).toBe(1000);
        expect(result.current.transactions.map((transaction) => transaction.id)).toEqual(["t-card"]);
        expect(mocks.enqueueSync).not.toHaveBeenCalled();
    });

    it("usuário sem dados remotos recebe o snapshot inicial enfileirado sobre a revisão atual", async () => {
        mocks.remote.data = null;
        const { result } = await renderLoadedStore();

        expect(result.current.beneficiaries.map((beneficiary) => beneficiary.name)).toEqual(["Eu Mesmo"]);
        expect(mocks.enqueueSync).toHaveBeenCalledTimes(1);
        expect(mocks.enqueueSync.mock.calls[0][1]).toMatchObject({ baseRevision: 3 });
    });
});

describe("useFinanceStore — carteiras", () => {
    it("adiciona carteira e enfileira o snapshot com base na revisão confirmada", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.addWallet({ ...result.current.wallets[1], id: "w3", name: "Viagem", initialBalance: 50, balance: 50 }));

        expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(["w1", "w2", "w3"]);
        expect(result.current.balance).toBe(1050);
        expect(lastSyncedData().wallets.map((wallet) => wallet.id)).toContain("w3");
        expect(mocks.enqueueSync.mock.lastCall?.[1]).toMatchObject({ baseRevision: 3 });
    });

    it("alterar o saldo inicial recalcula o saldo atual", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.setStartBalance("w2", 200.555));

        expect(result.current.wallets.find((wallet) => wallet.id === "w2")).toMatchObject({ initialBalance: 200.56, balance: 200.56 });
    });

    it("não desativa a carteira favorita, mas desativa as demais", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.setWalletActive("w1", false));
        expect(result.current.wallets.find((wallet) => wallet.id === "w1")?.isActive).toBe(true);
        expect(mocks.enqueueSync).not.toHaveBeenCalled();

        await act(() => result.current.setWalletActive("w2", false));
        expect(result.current.wallets.find((wallet) => wallet.id === "w2")?.isActive).toBe(false);
    });

    it("só apaga definitivamente uma carteira já desativada", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.permanentlyDeleteWallet("w2"));
        expect(result.current.wallets.map((wallet) => wallet.id)).toContain("w2");

        await act(() => result.current.setWalletActive("w2", false));
        await act(() => result.current.permanentlyDeleteWallet("w2"));
        expect(result.current.wallets.map((wallet) => wallet.id)).toEqual(["w1"]);
    });

    it("trocar a carteira favorita persiste só quando muda", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.setFavoriteWallet("w1"));
        expect(mocks.enqueueSync).not.toHaveBeenCalled();

        await act(() => result.current.setFavoriteWallet("w2"));
        expect(result.current.favoriteWalletId).toBe("w2");
        expect(lastSyncedData().favoriteWalletId).toBe("w2");
    });
});

describe("useFinanceStore — faturas", () => {
    function openInvoice(snapshot: Pick<FinanceSnapshot, "creditCardInvoices">) {
        const invoice = snapshot.creditCardInvoices.find((item) => item.totalAmount > 0);
        if (!invoice) throw new Error("fatura com saldo não encontrada");
        return invoice;
    }

    it("recusa pagamento acima do valor em aberto", async () => {
        const { result } = await renderLoadedStore();
        const invoice = openInvoice(result.current);

        await act(() => result.current.payCreditCardInvoice({ invoiceId: invoice.id, walletId: "w1", amount: invoice.totalAmount + 1, paymentDate: "2026-06-10" }));

        expect(result.current.transactions).toHaveLength(1);
        expect(mocks.enqueueSync).not.toHaveBeenCalled();
    });

    it("pagamento parcial cria a transação de pagamento, abate da fatura e debita a carteira", async () => {
        const { result } = await renderLoadedStore();
        const invoice = openInvoice(result.current);

        await act(() => result.current.payCreditCardInvoice({ invoiceId: invoice.id, walletId: "w1", amount: 100, paymentDate: "2026-06-10" }));

        const payment = result.current.transactions.find((transaction) => transaction.paymentForInvoiceId === invoice.id);
        expect(payment).toMatchObject({ systemKind: "invoice_payment", value: 100, inWallet: "w1", status: "paid", description: "Fatura do Roxinho" });
        expect(result.current.creditCardInvoices.find((item) => item.id === invoice.id)?.paidAmount).toBe(100);
        expect(result.current.wallets.find((wallet) => wallet.id === "w1")?.balance).toBe(900);
        expect(lastSyncedData().transactions.some((transaction) => transaction.paymentForInvoiceId === invoice.id)).toBe(true);
    });

    it("liquidação sem carteira não movimenta saldo", async () => {
        const { result } = await renderLoadedStore();
        const invoice = openInvoice(result.current);

        await act(() => result.current.payCreditCardInvoice({ invoiceId: invoice.id, walletId: null, amount: invoice.totalAmount, paymentDate: "2026-06-10", settleWithoutWallet: true }));

        const payment = result.current.transactions.find((transaction) => transaction.paymentForInvoiceId === invoice.id);
        expect(payment?.isNonCashSettlement).toBe(true);
        expect(result.current.balance).toBe(1000);
    });
});

describe("useFinanceStore — cadastros", () => {
    it("reordena tags colocando as indicadas primeiro e renumerando sortOrder", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.reorderTags(["tag-c", "inexistente", "tag-c"]));

        expect(result.current.tags.map((tag) => [tag.id, tag.sortOrder])).toEqual([["tag-c", 0], ["tag-a", 1], ["tag-b", 2]]);
    });

    it("reordena só as categorias irmãs da primeira indicada", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.reorderCategories(["food-delivery", "food"]));

        const sortOrder = (id: string) => result.current.categories.find((category) => category.id === id)?.sortOrder;
        expect([sortOrder("food-delivery"), sortOrder("food-market")]).toEqual([0, 1]);
        expect(sortOrder("food")).toBe(0);
    });

    it("desativar uma categoria desativa as filhas, mas a categoria de fatura nunca é desativada", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.setCategoryActive(SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, false));
        expect(result.current.categories.find((category) => category.id === SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID)?.isActive).toBe(true);

        await act(() => result.current.setCategoryActive("food", false));
        const inactive = result.current.categories.filter((category) => !category.isActive).map((category) => category.id).sort();
        expect(inactive).toEqual(["food", "food-delivery", "food-market"]);
    });

    it("subcategoria herda o tipo da categoria pai", async () => {
        const { result } = await renderLoadedStore();
        const template = result.current.categories[0];

        await act(() => result.current.addCategory({ ...template, id: "food-bakery", name: "Padaria", parentId: "food", type: "income" }));

        expect(result.current.categories.find((category) => category.id === "food-bakery")).toMatchObject({ parentId: "food", type: "expense", sortOrder: 2 });
    });

    it("ignora desejo inválido e adiciona o válido", async () => {
        const { result } = await renderLoadedStore();
        const base = { id: "wish", userId: null, value: 0, categoryId: "food", priority: 2 as const, description: "Fone", link: null, imageUrl: null, isActive: true, createdAt: "2026-06-01T00:00:00.000Z" };

        await act(() => result.current.addWishItem(base));
        expect(result.current.wishItems).toEqual([]);

        await act(() => result.current.addWishItem({ ...base, value: 250 }));
        expect(result.current.wishItems.map((item) => item.id)).toEqual(["wish"]);
    });

    it("não desativa o beneficiário do próprio usuário", async () => {
        const { result } = await renderLoadedStore();
        const self = result.current.beneficiaries.find((beneficiary) => beneficiary.isSelfProfile);
        if (!self) throw new Error("beneficiário próprio ausente");

        await act(() => result.current.setBeneficiaryActive(self.id, false));

        expect(result.current.beneficiaries.find((beneficiary) => beneficiary.id === self.id)?.isActive).toBe(true);
        expect(mocks.enqueueSync).not.toHaveBeenCalled();
    });
});

describe("useFinanceStore — planejamento", () => {
    it("preferência local muda o estado sem sincronizar com o servidor", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.updatePlanningState({ ...result.current.planning, timelineMonthCount: 3 }));

        expect(result.current.planning.timelineMonthCount).toBe(3);
        expect(mocks.enqueueSync).not.toHaveBeenCalled();
    });

    it("simulação de gasto é sincronizada", async () => {
        const { result } = await renderLoadedStore();
        const expense = { id: "sim", monthKey: "2026-07", description: "Viagem", amount: 800, createdAt: "2026-06-01T00:00:00.000Z" };

        await act(() => result.current.updatePlanningState({ ...result.current.planning, simulatedExpenses: [expense] }));

        expect(lastSyncedData().planning.simulatedExpenses.map((item) => item.id)).toEqual(["sim"]);
    });
});

describe("useFinanceStore — transações", () => {
    it("cria, paga e apaga uma despesa em carteira refletindo no saldo", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.addTransaction({ id: "t-new", groupId: "g-new", type: "spending", amount: 40, scheduledDate: "2026-06-10", walletId: "w1", status: "pending", description: "Padaria" }));
        const created = result.current.transactions.find((transaction) => transaction.id === "t-new");
        if (!created) throw new Error("transação não criada");
        expect(result.current.balance).toBe(1000);

        await act(() => result.current.markTransactionAsPaid(created));
        expect(result.current.transactions.find((transaction) => transaction.id === "t-new")?.status).toBe("paid");
        expect(result.current.balance).toBe(960);
        expect(result.current.despesas).toBe(40);

        await act(() => result.current.deleteTransaction(created));
        expect(result.current.transactions.some((transaction) => transaction.id === "t-new")).toBe(false);
        expect(result.current.balance).toBe(1000);
        expect(lastSyncedData().transactions.some((transaction) => transaction.id === "t-new")).toBe(false);
    });

    it("limpar transações zera grupos, lançamentos e faturas", async () => {
        const { result } = await renderLoadedStore();

        await act(() => result.current.clearTransactions());

        expect(result.current.transactions).toEqual([]);
        expect(result.current.creditCardInvoices).toEqual([]);
        expect(lastSyncedData().transactionGroups).toEqual([]);
    });
});
