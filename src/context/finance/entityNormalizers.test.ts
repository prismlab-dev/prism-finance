import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEFAULT_EXPENSE_CATEGORY_ID,
    DEFAULT_INCOME_CATEGORY_ID,
    DEFAULT_WALLET_ID,
    SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID,
    buildInvoicePaymentNote,
    findCreditCardInvoiceAssignmentIssues,
    findDefaultCategoryId,
    normalizeCategory,
    normalizeCreditCard,
    normalizeCreditCardInvoice,
    normalizeLedgerEntry,
    normalizeStoredTransaction,
    normalizeTransactionGroup,
    normalizeTransactionStatus,
    normalizeWallet,
    normalizeWalletId,
    normalizeWishItem,
    parseInvoicePaymentNote,
    type Category,
} from "./financeCore";

const NOW = new Date("2026-06-15T12:00:00.000Z");

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

function category(id: string, type: Category["type"]): Category {
    return normalizeCategory({ id, name: id, type, createdAt: "2026-01-01T00:00:00.000Z" });
}

describe("nota de pagamento de fatura", () => {
    it("faz ida e volta entre build e parse", () => {
        const note = buildInvoicePaymentNote({ invoiceId: "card-1-2026-05", creditCardId: "card-1" });

        expect(note).toBe("[prism-invoice-payment]|card-1-2026-05|card-1");
        expect(parseInvoicePaymentNote(note)).toEqual({ invoiceId: "card-1-2026-05", creditCardId: "card-1" });
    });

    it("rejeita notas comuns e notas incompletas", () => {
        expect(parseInvoicePaymentNote(null)).toBeNull();
        expect(parseInvoicePaymentNote("mercado do mês")).toBeNull();
        expect(parseInvoicePaymentNote("[prism-invoice-payment]|invoice-only")).toBeNull();
    });
});

describe("normalizeTransactionStatus", () => {
    it("aceita os status conhecidos e converte booleanos legados", () => {
        expect(normalizeTransactionStatus("skipped")).toBe("skipped");
        expect(normalizeTransactionStatus(true)).toBe("paid");
        expect(normalizeTransactionStatus(false)).toBe("pending");
    });

    it("cai para pending em valores desconhecidos", () => {
        expect(normalizeTransactionStatus("done")).toBe("pending");
        expect(normalizeTransactionStatus(undefined)).toBe("pending");
    });
});

describe("normalizeWallet", () => {
    it("migra o id legado da carteira padrão e usa startBalance como saldo inicial", () => {
        expect(normalizeWalletId("first_wallet")).toBe(DEFAULT_WALLET_ID);

        const wallet = normalizeWallet({ id: "first_wallet", startBalance: "150.555", currency: "usd" });

        expect(wallet).toMatchObject({
            id: DEFAULT_WALLET_ID,
            name: "Carteira Principal",
            initialBalance: 150.56,
            balance: 150.56,
            currency: "USD",
            type: "checking",
            isActive: true,
            includeInMainTotals: true,
            createdAt: NOW.toISOString(),
        });
    });

    it("mantém o saldo explícito separado do saldo inicial", () => {
        const wallet = normalizeWallet({ id: "w1", name: "Poupança", type: "savings", initialBalance: 100, balance: 80, includeInMainTotals: false });

        expect(wallet).toMatchObject({ name: "Poupança", type: "savings", initialBalance: 100, balance: 80, includeInMainTotals: false });
    });
});

describe("normalizeCreditCard", () => {
    it("limita dias ao intervalo do mês, zera limite negativo e troca o ícone de carteira pelo de cartão", () => {
        const card = normalizeCreditCard({ id: "c1", limit: -50, closingDay: 0, dueDay: 45, icon: "/wallet.svg", bankWalletId: "w1" }, new Set(["w1"]));

        expect(card).toMatchObject({ limit: 0, closingDay: 1, dueDay: 31, bankWalletId: "w1", icon: "lucide:credit-card" });
    });

    it("redireciona a conta de débito inexistente para a carteira padrão", () => {
        const card = normalizeCreditCard({ id: "c1", bankWalletId: "removida" }, new Set([DEFAULT_WALLET_ID, "w1"]));

        expect(card.bankWalletId).toBe(DEFAULT_WALLET_ID);
    });
});

describe("normalizeCreditCardInvoice", () => {
    it("limita o valor pago ao total e infere status pago", () => {
        const invoice = normalizeCreditCardInvoice(
            { id: "inv", creditCardId: "c1", cycleKey: "2026-05", totalAmount: 100, paidAmount: 250, updatedAt: "2026-05-20T10:00:00.000Z" },
            new Set(["c1"]),
        );

        expect(invoice).toMatchObject({ totalAmount: 100, paidAmount: 100, status: "paid", paidAt: "2026-05-20T10:00:00.000Z" });
    });

    it("descarta o vínculo com cartão desconhecido e deriva datas padrão do ciclo", () => {
        const invoice = normalizeCreditCardInvoice({ id: "inv", creditCardId: "fantasma", cycleKey: "2026-03" }, new Set(["c1"]));

        expect(invoice).toMatchObject({ creditCardId: "", status: "open", paidAt: null, closingDate: "2026-03-10", dueDate: "2026-03-15" });
    });
});

describe("normalizeWishItem", () => {
    it("usa valor absoluto e preenche descrição vazia", () => {
        const item = normalizeWishItem({ id: "wish", value: -30, description: "   ", categoryId: " cat " });

        expect(item).toMatchObject({ value: 30, description: "Desejo", categoryId: "cat", link: null });
    });
});

describe("normalizeTransactionGroup", () => {
    it("infere o tipo pelo sinal do total e guarda o total em módulo", () => {
        const group = normalizeTransactionGroup({ id: "g", totalAmount: -42.5 }, new Set([DEFAULT_WALLET_ID]));

        expect(group).toMatchObject({ type: "expense", totalAmount: 42.5, transactionMode: "single", installmentCount: null });
    });

    it("trata 'spending' legado como despesa e troca carteira desconhecida pela padrão", () => {
        const group = normalizeTransactionGroup({ id: "g", type: "spending" as never, sourceWalletId: "sumiu", installmentCount: 3 }, new Set([DEFAULT_WALLET_ID]));

        expect(group).toMatchObject({ type: "expense", sourceWalletId: DEFAULT_WALLET_ID, installmentCount: 3 });
    });
});

describe("normalizeStoredTransaction", () => {
    it("transação paga sem paidAt recebe o meio-dia local da data agendada", () => {
        const transaction = normalizeStoredTransaction({ id: "t", groupId: "g", status: "paid", scheduledDate: "2026-02-10", amount: -12.345 });

        expect(transaction.amount).toBe(12.35);
        expect(transaction.paidAt).toBe(new Date(2026, 1, 10, 12).toISOString());
    });

    it("transação não paga nunca mantém paidAt", () => {
        const transaction = normalizeStoredTransaction({ id: "t", groupId: "g", status: "pending", paidAt: "2026-02-10T12:00:00.000Z" });

        expect(transaction.paidAt).toBeNull();
    });

    it("recupera paymentForInvoiceId da nota legada de pagamento de fatura", () => {
        const notes = buildInvoicePaymentNote({ invoiceId: "inv-1", creditCardId: "c1" });
        const transaction = normalizeStoredTransaction({ id: "t", groupId: "g", notes });

        expect(transaction.paymentForInvoiceId).toBe("inv-1");
    });

    it("só marca isProjected quando verdadeiro e usa posted como compromisso padrão", () => {
        const regular = normalizeStoredTransaction({ id: "t", groupId: "g" });
        const projected = normalizeStoredTransaction({ id: "t", groupId: "g", isProjected: true, commitment: "forecast" });

        expect(regular).not.toHaveProperty("isProjected");
        expect(regular.commitment).toBe("posted");
        expect(projected).toMatchObject({ isProjected: true, commitment: "forecast" });
    });
});

describe("normalizeLedgerEntry", () => {
    it("migra a carteira legada e arredonda valores", () => {
        const entry = normalizeLedgerEntry({ id: "le", walletId: "first_wallet", amount: 10.005, balanceAfter: 1.111 });

        expect(entry).toMatchObject({ walletId: DEFAULT_WALLET_ID, amount: 10.01, balanceAfter: 1.11, description: "Lancamento" });
    });
});

describe("findDefaultCategoryId", () => {
    it("prefere as categorias padrão de despesa e receita quando existem", () => {
        const categories = [category("food", "expense"), category(DEFAULT_EXPENSE_CATEGORY_ID, "expense"), category(DEFAULT_INCOME_CATEGORY_ID, "income")];

        expect(findDefaultCategoryId("expense", categories)).toBe(DEFAULT_EXPENSE_CATEGORY_ID);
        expect(findDefaultCategoryId("income", categories)).toBe(DEFAULT_INCOME_CATEGORY_ID);
    });

    it("nunca escolhe a categoria de fatura como padrão de despesa", () => {
        const categories = [category(SYSTEM_EXPENSE_CARD_INVOICE_CATEGORY_ID, "expense"), category("food", "expense")];

        expect(findDefaultCategoryId("expense", categories)).toBe("food");
    });

    it("transferência usa categoria de despesa e lista vazia devolve o id padrão", () => {
        expect(findDefaultCategoryId("transfer", [category("salary", "income"), category("rent", "expense")])).toBe("rent");
        expect(findDefaultCategoryId("income", [])).toBe(DEFAULT_INCOME_CATEGORY_ID);
    });
});

describe("findCreditCardInvoiceAssignmentIssues", () => {
    const card = { id: "c1", closingDay: 10, dueDay: 17 };
    const group = { id: "g", type: "expense" as const, creditCardId: "c1" };

    it("aponta compra de cartão ligada à fatura errada", () => {
        const issues = findCreditCardInvoiceAssignmentIssues({
            transactions: [{ id: "t", groupId: "g", scheduledDate: "2026-05-12", invoiceId: "c1-2026-05", status: "pending", creditCardId: null }],
            transactionGroups: [group],
            creditCards: [card],
        });

        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ transactionId: "t", currentInvoiceId: "c1-2026-05" });
        expect(issues[0].expectedInvoiceId).not.toBe("c1-2026-05");
    });

    it("ignora canceladas, receitas e transações já na fatura esperada", () => {
        const base = { groupId: "g", scheduledDate: "2026-05-12", status: "pending" as const, creditCardId: null };
        const [correct] = findCreditCardInvoiceAssignmentIssues({
            transactions: [{ ...base, id: "probe", invoiceId: null }],
            transactionGroups: [group],
            creditCards: [card],
        });

        const issues = findCreditCardInvoiceAssignmentIssues({
            transactions: [
                { ...base, id: "ok", invoiceId: correct.expectedInvoiceId },
                { ...base, id: "cancelada", invoiceId: null, status: "cancelled" },
                { ...base, id: "receita", groupId: "g-income", invoiceId: null },
            ],
            transactionGroups: [group, { id: "g-income", type: "income", creditCardId: "c1" }],
            creditCards: [card],
        });

        expect(issues).toEqual([]);
    });
});
